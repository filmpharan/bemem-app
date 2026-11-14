import { useEffect,useState,useSyncExternalStore } from 'react';
import { Redirect } from 'expo-router';
import { Alert,ScrollView,Text,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMultiCanvasFixture } from '../lib/dev-multicanvas';
import { walletCanvasPresentation } from '../lib/wallet-preparation';
import { validateWalletDocument } from '../lib/wallet-validation';
import { CanvasPageSelector } from '../components/bemem/CanvasPageSelector';
import { CanvasPageCountSetting } from '../components/bemem/CanvasPageCountSetting';
import { LockedCanvas } from '../components/bemem/LockedCanvas';
import { WalletCanvas } from '../components/bemem/WalletCanvas';
import { GlassButton } from '../components/bemem/GlassButton';
import { lagoon } from '../constants/lagoon-theme';
import { CanvasPagePopoverHost } from '../components/bemem/CanvasPagePopoverHost';
export default function MultiCanvasDevelopment(){if(!__DEV__)return <Redirect href="/"/>;return <FixtureScreen/>;}
function FixtureScreen(){const [fixture]=useState(createMultiCanvasFixture),owner=fixture.owner,snapshot=useSyncExternalStore(owner.subscribe,owner.getSnapshot,owner.getSnapshot);
 const [editing,setEditing]=useState(false),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{void owner.commands.initialize();},[owner]);
 const page=owner.pages.current(),access=owner.pages.access(),doc=snapshot.session&&(editing?snapshot.session.draft:snapshot.session.saved),view=doc&&access[page-1].readable?walletCanvasPresentation(validateWalletDocument(doc),page):{cards:[],layout:{}};
 useEffect(()=>{if(editing&&!access[page-1].editable&&!snapshot.state.saving){
  if(snapshot.state.dirty){setEditing(false);setNotice('Editing access changed. Memory-only draft retained; discard explicitly before editing another canvas.');}
  else owner.pages.selectEditor(1);
 }},[editing,page,access[page-1].editable,snapshot.state.dirty,snapshot.state.saving,owner]);
 function select(next:Parameters<typeof owner.pages.select>[0]){const r=editing?owner.pages.selectEditor(next):owner.pages.select(next);if(!r.ok)setNotice('Save or discard the memory-only draft first.');}
 function toggleEditor(){if(!editing&&!access[page-1].editable&&!owner.pages.selectEditor(1).ok){setNotice('Discard the retained memory-only draft before editing Canvas 1.');return;}setEditing(!editing);}
 async function save(){setBusy(true);try{const r=await owner.commands.save(snapshot.state.generation);setNotice(r.ok?'Memory snapshot verified.':'Save blocked or failed. Draft retained.');}finally{setBusy(false);}}
 return <SafeAreaView style={{flex:1,backgroundColor:lagoon.canvas.base}}><CanvasPagePopoverHost>
  <ScrollView style={{maxHeight:290}} contentContainerStyle={{padding:16,gap:12}}><Text style={{fontWeight:'800',color:lagoon.text.primary}}>Development simulation · memory only</Text>
   <View style={{flexDirection:'row',alignItems:'center',gap:12}}><Text style={{fontSize:24,fontWeight:'800'}}>bemem.</Text><CanvasPageSelector context={editing?'editor':'home'} page={page} destinations={access} onSelect={select} disabled={busy}/></View>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{(['free','active','expired'] as const).map(s=><GlassButton key={s} style={{padding:8}} onPress={()=>fixture.status(s)}><Text>{s}</Text></GlassButton>)}
    <GlassButton style={{padding:8}} onPress={toggleEditor}><Text>{editing?'Create':'Home'} simulation</Text></GlassButton>
   </View>
   <CanvasPageCountSetting status={owner.pages.status()} count={owner.pages.status()==='free'?1:doc?.canvas.pages?.selectedCount??2} busy={busy||snapshot.state.dirty}
     onChange={n=>{setBusy(true);void owner.pages.setCount(n).then(r=>setNotice(r.ok?'Preference saved in memory.':'Preference blocked.')).finally(()=>setBusy(false));}}/>
  </ScrollView>
  <View style={{flex:1}}>
   {editing&&!access[page-1].editable?<View/>:!access[page-1].readable?<LockedCanvas/>:<WalletCanvas key={page} {...view} allCards={view.cards} editing={editing} disabled={busy}
    onDragging={()=>{}} onOpen={card=>Alert.alert(card.name,'Synthetic fixture only. No device Wallet or Photo Journal is accessed.')}
    onMove={(id,position)=>{if(doc)owner.commands.updateDraft(snapshot.state.generation,{...validateWalletDocument(doc),canvas:{...validateWalletDocument(doc).canvas,layout:{...doc.canvas.layout,[id]:position}}});}}/>}
  </View>
  <Text accessibilityRole="alert" style={{padding:12}}>{notice}</Text>
  <View style={{flexDirection:'row',padding:12,gap:8}}><GlassButton style={{flex:1}} disabled={busy} onPress={()=>{void save();}}><Text>Save</Text></GlassButton>
   <GlassButton style={{flex:1}} disabled={busy} onPress={()=>{if(snapshot.session)owner.commands.updateDraft(snapshot.state.generation,validateWalletDocument(snapshot.session.saved));}}><Text>Discard</Text></GlassButton>
   <GlassButton style={{flex:1}} disabled={busy||!access[page-1].editable} onPress={()=>{try{const s=fixture.decorate();const r=s.apply({type:'add',assetId:'pet-paw',position:{col:8,row:0}});setNotice(r.ok?'Memory decoration draft added.':r.message);}catch{setNotice('Editing locked.');}}}><Text>Add tile</Text></GlassButton>
  </View>
 </CanvasPagePopoverHost></SafeAreaView>;
}
