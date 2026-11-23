import { useEffect, useMemo, useRef, useState } from 'react';
import { useWalletRuntime } from '../components/bemem/WalletRuntimeProvider';
import { canPlace } from '../lib/canvas-layout';
import { walletCanvasPresentation } from '../lib/wallet-preparation';
import { validateWalletDocument } from '../lib/wallet-validation';
import type { Position } from '../types/wallet-ui';
import { Alert } from 'react-native';
import { canvasAccess,itemCanvasPage,type CanvasPage } from '../lib/canvas-pages';
import type { ConfirmationRequest } from '../components/bemem/ConfirmationDialog';
import { addFolderMember,createGroupFolder,folderDropTarget,renameGroupFolder,ungroupFolder } from '../lib/group-folder';
import type { Orientation } from '../types/wallet-ui';

/** Navigation state only. Saved/Draft, revision, source and writer belong to App Root. */
export function useWalletCanvas(searchActive=false) {
  const { runtime, snapshot } = useWalletRuntime();
  const { state, session } = snapshot;
  const [mode, setMode] = useState<'home' | 'create'>('home');
  const liveMode=useRef(mode);liveMode.current=mode;
  const ownerPage=runtime.pages?.current()??1;
  const [homePage,setHomePage]=useState<CanvasPage>(ownerPage);
  // Home tracks presentation; exiting an editor adopts the owner's current page.
  const pageAccess=runtime.pages?.access()??canvasAccess(session?.saved);
  const editorEligible=pageAccess[ownerPage-1].editable;
  const page=mode==='home'?(pageAccess[homePage-1].visible?homePage:1):editorEligible?ownerPage:1;
  const pageEditable=mode==='create'?editorEligible:pageAccess[page-1].editable,pageReadable=pageAccess[page-1].readable;
  const [exitPrompt, setExitPrompt] = useState(false);
  const [error, setError] = useState('');
  const [folderProposal,setFolderProposal]=useState<{cardId:string;targetId:string;ticket:string}|null>(null);
  const folderSequence=useRef(0);
  const [pageConfirmation,setPageConfirmation]=useState<ConfirmationRequest|null>(null),[pageConfirmationBusy,setPageConfirmationBusy]=useState(false);
  const pageRequest=useRef<ConfirmationRequest|null>(null),pageWork=useRef(false),pageSequence=useRef(0);
  // One pending Create exit owns its continuation until explicit Save/Discard/Stay.
  const exitIntent=useRef<{after?:()=>void;generation:number;revision:number;pageEpoch:number;draft:string}|null>(null);
  const exitWork=useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const savedView = useMemo(() => session&&pageReadable ? walletCanvasPresentation(session.saved,page) : { cards: [], layout: {} }, [session?.saved,page,pageReadable]);
  const draftView = useMemo(() => mode==='create'&&session&&pageReadable ? walletCanvasPresentation(session.draft,page) : savedView, [mode,session?.draft,page,pageReadable,savedView]);
  const searchView=useMemo(()=>{
    if(!searchActive||!session)return {cards:[],layout:{}};
    const searchable=pageAccess.filter(p=>p.readable).map(p=>walletCanvasPresentation(session.saved,p.page,true));
    return {cards:searchable.flatMap(v=>v.cards),layout:Object.assign({},...searchable.map(v=>v.layout))};
  },[searchActive,session?.saved,pageAccess.map(p=>p.readable).join('-')]);
  const allowed = () => runtime.getSnapshot().state.editsAllowed&&(runtime.pages?.access()[runtime.pages.current()-1].editable??true);
  const writeDraft = (document: unknown) => runtime.commands.updateDraft(state.generation, validateWalletDocument(document));
  function folderTicket(){const s=runtime.getSnapshot();return JSON.stringify([s.state.generation,s.session?.revision,runtime.pages?.current(),runtime.pages?.generation(),s.session?.draft]);}
  function folderEdit(ticket:string,change:(doc:ReturnType<typeof validateWalletDocument>)=>ReturnType<typeof validateWalletDocument>){
    const latest=runtime.getSnapshot();
    if(liveMode.current!=='create'||!allowed()||latest.state.source!=='v2'||latest.state.saving||!latest.session||ticket!==folderTicket()){
      setError('The canvas changed or is read-only. Close and review the folder again.');return false;
    }
    try{const next=change(validateWalletDocument(latest.session.draft));const result=runtime.commands.updateDraft(latest.state.generation,next);
      if(!result.ok)throw Error('The wallet is locked. Your saved wallet is unchanged.');setError('');return true;
    }catch(e){setError(e instanceof Error?e.message:'The folder change was not accepted.');return false;}
  }
  function groupDrop(id:string,position:Position){
    const latest=runtime.getSnapshot();if(liveMode.current!=='create'||!allowed()||latest.state.source!=='v2'||latest.state.saving||!latest.session||folderProposal)return false;
    const view=walletCanvasPresentation(latest.session.draft,page),card=view.cards.find(c=>c.id===id);if(!card)return false;
    const target=folderDropTarget(card,position,view.cards,view.layout);if(!target)return false;
    const ticket=folderTicket();
    if(target.kind==='folder')folderEdit(ticket,doc=>addFolderMember(doc,target.id,id,page));
    else {setError('');setFolderProposal({cardId:id,targetId:target.id,ticket});}return true;
  }
  function returnHome(){
    const target=runtime.pages?.current()??page;
    const visible=runtime.pages?.access()[target-1].visible??true;
    if(!runtime.getSnapshot().state.dirty)runtime.pages?.select(visible?target:1);
    setHomePage(visible?target:1);liveMode.current='home';setMode('home');
  }
  useEffect(()=>{
    if(mode!=='create'||pageEditable||state.saving)return;
    if(state.dirty){
      // Keep the forbidden page's draft in the owner, with no persistence.
      returnHome();setExitPrompt(false);
      setError('Editing access changed. Your unsaved draft is retained. Discard it explicitly before editing another canvas.');
    }else runtime.pages?.selectEditor(1);
  },[mode,pageEditable,state.dirty,state.saving]);
  function enter() {
    const current=runtime.getSnapshot();
    if (!current.session||current.state.saving||!current.state.editsAllowed) return false;
    const target=pageAccess[page-1].editable?page:1;
    if(runtime.pages&&(!runtime.pages.access()[runtime.pages.current()-1].editable||runtime.pages.current()!==target)){
      if(current.state.dirty){
        Alert.alert('Unsaved changes',allowed()
          ? 'Save or discard the retained canvas draft before editing another canvas.'
          : 'This canvas can no longer be edited. Keep your draft, or discard it to edit Canvas 1.',[
          {text:'Stay',style:'cancel'},
          {text:'Discard',style:'destructive',onPress:()=>{
            const latest=runtime.getSnapshot();
            if(latest.session&&!latest.state.saving&&runtime.commands.updateDraft(latest.state.generation,validateWalletDocument(latest.session.saved)).ok)enter();
          }},
          ...(allowed()?[{text:'Save',onPress:()=>{void runtime.commands.save(current.state.generation).then(result=>{
            if(result.ok)enter();else setError('Saving was not confirmed. Your draft is retained.');
          });}}]:[]),
        ]);return false;
      }
      if(!runtime.pages.selectEditor(target).ok)return false;
    }
    if(!allowed())return false;
    if (runtime.getSnapshot().state.dirty) { setMode('create'); setExitPrompt(false); setError(''); return true; }
    if (writeDraft(current.session.saved).ok) { setMode('create'); setExitPrompt(false); setError('');return true; }
    return false;
  }
  function validExit(intent:NonNullable<typeof exitIntent.current>,afterSave=false){
    const latest=runtime.getSnapshot();return mounted.current&&liveMode.current==='create'&&exitIntent.current===intent
      &&latest.state.generation===intent.generation&&(runtime.pages?.generation()??0)===intent.pageEpoch
      &&latest.session?.revision===intent.revision+(afterSave?1:0)
      &&(afterSave||JSON.stringify(latest.session?.draft)===intent.draft);
  }
  function completeExit(intent:NonNullable<typeof exitIntent.current>){
    exitIntent.current=null;setExitPrompt(false);setError('');
    if(intent.after)intent.after();else returnHome();
  }
  function leave(after?:()=>void) {
    const latest=runtime.getSnapshot();if(latest.state.saving||pageRequest.current||exitIntent.current||exitWork.current||!latest.session)return;
    const intent={after,generation:latest.state.generation,revision:latest.session.revision,pageEpoch:runtime.pages?.generation()??0,draft:JSON.stringify(latest.session.draft)};
    exitIntent.current=intent;
    if(latest.state.dirty)setExitPrompt(true);else completeExit(intent);
  }
  function discard(expected=exitIntent.current) {
    if(exitWork.current||runtime.getSnapshot().state.saving||expected!==exitIntent.current)return;
    if(expected&&!validExit(expected)){exitIntent.current=null;setExitPrompt(false);setError('The editing session changed. Review it before navigating.');return;}
    const latest=runtime.getSnapshot();if(!latest.session)return;
    if(runtime.commands.updateDraft(latest.state.generation,validateWalletDocument(latest.session.saved)).ok){
      if(expected)completeExit(expected);else{ returnHome();setExitPrompt(false);setError(''); }
    }
  }
  function move(id: string, position: Position) {
    if (mode !== 'create' || !allowed() || !session) return;
    const card = draftView.cards.find(item => item.id === id);
    if (!card || !canPlace(card, position, draftView.cards, draftView.layout)) return;
    if (card.kind === 'decoration') return;
    const result = writeDraft(card.kind==='folder'?{...session.draft,canvas:{...session.draft.canvas,folders:{version:1,items:session.draft.canvas.folders!.items.map(f=>f.id===id?{...f,position}:f)}}}
      :{ ...session.draft, canvas: { ...session.draft.canvas, layout: { ...session.draft.canvas.layout, [id]: position } } });
    if (!result.ok) setError('Unable to move this card. Your saved layout is unchanged.');
  }
  async function save({exitAfterSave=false}:{exitAfterSave?:boolean}={},expected=exitIntent.current) {
    if(liveMode.current!=='create'||!allowed()||exitWork.current||expected!==exitIntent.current)return false;
    const intent=exitIntent.current;
    if(intent&&!validExit(intent)){exitIntent.current=null;setExitPrompt(false);setError('The editing session changed. Review it before navigating.');return false;}
    const generation=runtime.getSnapshot().state.generation;exitWork.current=true;setError('');
    try{
      const result=await runtime.commands.save(generation);
      if(!mounted.current)return false;
      if(result.ok&&generation===runtime.getSnapshot().state.generation){
        if(intent){if(validExit(intent,true))completeExit(intent);else{exitIntent.current=null;setExitPrompt(false);setError('The editing session changed. Review it before navigating.');return false;}}
        else {if(exitAfterSave)returnHome();setExitPrompt(false);}
        return true;
      }
      exitIntent.current=null;setExitPrompt(false);setError('Saving was not confirmed. Your draft is retained. Reinspect the wallet before continuing; no automatic retry was made.');return false;
    }catch{if(mounted.current){exitIntent.current=null;setExitPrompt(false);setError('Saving was not confirmed. Your draft is retained. No automatic retry was made.');}return false;}
    finally{exitWork.current=false;}
  }
  const locked = state.phase === 'blocked' || state.phase === 'error' || state.phase === 'activation_incomplete';
  function selectPage(next:CanvasPage){
    if(!runtime.pages||runtime.getSnapshot().state.saving||pageRequest.current||mode==='home'&&liveMode.current==='create')return;
    const destination=runtime.pages.access()[next-1];
    if(liveMode.current==='create'&&!destination?.editable)return;
    const navigate=()=>{const result=liveMode.current==='create'?runtime.pages.selectEditor(next):runtime.pages.select(next);if(!result.ok)setError('Resolve the current draft before changing canvas.');else if(liveMode.current==='home')setHomePage(next);};
    const latest=runtime.getSnapshot();
    if(!latest.state.dirty){navigate();return;}
    if(liveMode.current==='create'){
      const initialPage=runtime.pages.current(),epoch=runtime.pages.generation(),generation=latest.state.generation,revision=latest.session?.revision;
      const valid=(checkRevision=true)=>mounted.current&&liveMode.current==='create'&&runtime.pages.current()===initialPage&&runtime.pages.generation()===epoch
        &&runtime.getSnapshot().state.generation===generation&&(!checkRevision||runtime.getSnapshot().session?.revision===revision)&&runtime.pages.access()[next-1]?.visible&&runtime.pages.access()[next-1]?.editable===destination.editable;
      const dismiss=()=>{if(pageWork.current||pageRequest.current!==request)return;pageRequest.current=null;setPageConfirmation(null);};
      const changed=()=>{dismiss();setError('The canvas destination changed. Review the current canvas before switching.');};
      const request:ConfirmationRequest={id:`create-page-${++pageSequence.current}`,title:'Unsaved changes',description:'Save or discard this canvas draft before switching.',onDismiss:dismiss,
        actions:[
          ...(allowed()?[{label:'Save',role:'primary' as const,onPress:async()=>{
            if(pageRequest.current!==request||pageWork.current)return;
            if(!valid()){changed();return;}pageWork.current=true;setPageConfirmationBusy(true);
            try{const result=await runtime.commands.save(generation);
              if(!mounted.current)return;
              if(result.ok){if(valid(false))navigate();else setError('The canvas destination changed. Review the current canvas before switching.');}
              else setError('Saving was not confirmed. Your draft is retained.');
            }catch{if(mounted.current)setError('Saving was not confirmed. Your draft is retained.');}
            finally{pageWork.current=false;if(mounted.current){setPageConfirmationBusy(false);dismiss();}}
          }}]:[]),
          {label:'Discard',role:'destructive',onPress:()=>{
            if(pageRequest.current!==request||pageWork.current)return;if(!valid()){changed();return;}
            const current=runtime.getSnapshot();
            if(current.session&&!current.state.saving&&runtime.commands.updateDraft(current.state.generation,validateWalletDocument(current.session.saved)).ok)navigate();
            dismiss();
          }},
          {label:'Stay',role:'neutral',onPress:dismiss},
        ]};
      pageRequest.current=request;setPageConfirmation(request);return;
    }
    Alert.alert('Unsaved changes','Save or discard this canvas draft before switching.',[
      {text:'Stay',style:'cancel'},
      {text:'Discard',style:'destructive',onPress:()=>{const current=runtime.getSnapshot();if(current.session&&!current.state.saving&&runtime.commands.updateDraft(current.state.generation,validateWalletDocument(current.session.saved)).ok)navigate();}},
      ...(allowed()?[{text:'Save',onPress:()=>{void runtime.commands.save(latest.state.generation).then(result=>{if(result.ok)navigate();else setError('Saving was not confirmed. Your draft is retained.');});}}]:[]),
    ]);
  }
  const exitAtRender=exitIntent.current;
  return { mode, saved: savedView.layout, draft: draftView.layout, savedCards: savedView.cards,
    page,pageAccess,pageEditable,pageReadable,selectPage,
    searchCards:searchView.cards,searchLayout:searchView.layout,
    focusCard(id:string){const doc=runtime.getSnapshot().session?.saved;if(!doc)return;const target=itemCanvasPage(doc,id);if(mode==='home'&&pageAccess[target-1].readable&&runtime.pages?.select(target).ok)setHomePage(target);},
    cards: mode === 'create' ? draftView.cards : savedView.cards,
    ready: state.phase !== 'loading', blocked: locked, saving: state.saving || state.phase === 'switching',
    dirty: state.dirty, revision: state.revision ?? 0, source: state.source, exitPrompt,
    error: error || (locked ? (!runtime.cutoverApproved && state.phase === 'activation_incomplete'
      ? 'Wallet v2 activation is waiting for release approval. Your files are unchanged.'
      : `Wallet locked (${state.reason ?? state.phase}). No data was replaced. Use Reinspect to check its status.`) : ''),
    runtime, snapshot, enter, leave, discard:()=>discard(exitAtRender), move, save:(options?:{exitAfterSave?:boolean})=>save(options,exitAtRender),pageConfirmation,pageConfirmationBusy,
    navigationPending:()=>!!exitIntent.current||exitWork.current||!!pageRequest.current,
    folderProposal,folderTicket,groupDrop,
    cancelFolderProposal:()=>setFolderProposal(null),
    confirmFolder(name:string,orientation:Orientation){if(!folderProposal)return false;
      const id=`folder-${Date.now().toString(36)}-${++folderSequence.current}-${Math.random().toString(36).slice(2,8)}`;
      const ok=folderEdit(folderProposal.ticket,doc=>createGroupFolder(doc,id,name,orientation,[folderProposal.cardId,folderProposal.targetId],page));
      if(ok)setFolderProposal(null);return ok;},
    renameFolder:(id:string,name:string,ticket:string)=>folderEdit(ticket,doc=>renameGroupFolder(doc,id,name,page)),
    ungroupFolder:(id:string,ticket:string)=>folderEdit(ticket,doc=>ungroupFolder(doc,id,page)),
    finishDecorate: (destination:'home'|'create'='home') => { if(destination==='home')returnHome();else{liveMode.current='create';setMode('create');} setExitPrompt(false); if(!runtime.getSnapshot().state.dirty)setError(''); },
    async reinspect() {
      const result = await (state.phase === 'activation_incomplete' ? runtime.commands.retryActivation() : runtime.commands.reconcile());
      if (result.ok && mounted.current) setError('');
    },
    cancel: () => { if (!runtime.getSnapshot().state.saving&&!exitWork.current&&exitIntent.current===exitAtRender){exitIntent.current=null;setExitPrompt(false);} },
    getCard: (id: string) => {const doc=mode==='create'?session?.draft:session?.saved;
      return doc&&(mode==='home'?pageAccess[itemCanvasPage(doc,id)-1].readable:itemCanvasPage(doc,id)===page&&pageReadable)?doc.cards.find(card=>card.id===id)??null:null;},
  };
}
