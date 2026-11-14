import { createWalletCoordinator, WalletCoordinatorFailure, type RuntimeWalletSession } from './wallet-coordinator';
import type { createWalletStorageAdapters } from './wallet-storage-adapters';
import { validateWalletDocument } from './wallet-validation';
import { canvasAccess,itemCanvasPage,pageMutationAllowed,type CanvasPage,type MembershipAccess } from './canvas-pages';

type Immutable<T> = T extends (...args: never[]) => unknown ? T
  : { readonly [K in keyof T]: T[K] extends object ? Immutable<T[K]> : T[K] };
function freeze<T>(value: T): Immutable<T> {
  if (value && typeof value === 'object') { Object.values(value).forEach(child => freeze(child)); Object.freeze(value); }
  return value as Immutable<T>;
}
/** Validates everything before a single synchronous pointer assignment. No React/Storage import. */
export function createRuntimeBundleStore() {
  let current: Immutable<RuntimeWalletSession> | null = null;
  return {
    getSnapshot: () => current,
    install(session: RuntimeWalletSession) {
      if ((session.source !== 'v1' && session.source !== 'v2') || session.repository.source !== session.source
        || !Number.isSafeInteger(session.generation) || session.generation < 0) throw new Error('mixed_runtime_bundle');
      const saved = validateWalletDocument(session.saved), draft = validateWalletDocument(session.draft);
      if (saved.revision !== session.revision || draft.revision !== session.revision) throw new Error('mixed_runtime_revision');
      const prepared = freeze({ source: session.source, generation: session.generation, revision: session.revision,
        saved, draft, repository: { source: session.source, save: session.repository.save } });
      current = prepared;
    },
  };
}

/** One explicit application-owned scope; future Provider passes its owner, hooks never construct it. */
export function createWalletOwnerScope(makeAdapters: () => ReturnType<typeof createWalletStorageAdapters>, preparation?: {
  /** Explicit composition-root capability. Absent in every existing production/DEV caller. */
  importV1: (document: RuntimeWalletSession['saved']) => Promise<RuntimeWalletSession['saved']>;
  beforeInstall?: (session: RuntimeWalletSession) => Promise<void>;
}, entitlement:()=>MembershipAccess=()=> 'free') {
  let owner: ReturnType<typeof buildOwner> | null = null;
  function buildOwner() {
    const adapters = makeAdapters(), store = createRuntimeBundleStore();
    let page:CanvasPage=1,pageGeneration=0;
    const status=():MembershipAccess=>{try{const value=entitlement();return ['free','active','expired'].includes(value)?value:'free';}catch{return 'free';}};
    const mayWrite=(doc:RuntimeWalletSession['draft'])=>{const saved=store.getSnapshot()?.saved;
      return !!saved&&canvasAccess(saved,status())[page-1].editable&&pageMutationAllowed(validateWalletDocument(saved),doc,status(),page);};
    const writers=Object.fromEntries((['v1','v2'] as const).map(source=>[source,{save:(doc:RuntimeWalletSession['draft'],expected:number)=>{
      if(!mayWrite(doc))throw new WalletCoordinatorFailure('blocked','canvas_access_denied');
      return adapters.coordinatorWriters[source].save(doc,expected,()=>mayWrite(doc));
    }}])) as typeof adapters.coordinatorWriters;
    const listeners = new Set<() => void>();
    let listenerFailures = 0;
    const locked = { importV1: async () => { throw new WalletCoordinatorFailure('precommit_failure'); } }; // Default import remains locked.
    const coordinator = createWalletCoordinator({ inspect: adapters.inspect, writers,
      importV1: preparation?.importV1 ?? locked.importV1,
      activate: async session => {
        if (preparation?.beforeInstall) await preparation.beforeInstall(session);
        store.install({ ...session, repository: { source: session.source, save: () => track(() => session.repository.save()) } });
        publish();
      } });
    let snapshot = freeze({ state: coordinator.getState(), session: store.getSnapshot() });
    function publish() {
      if(!canvasAccess(store.getSnapshot()?.saved,status())[page-1].visible&&!coordinator.getState().dirty&&!coordinator.getState().saving){page=1;pageGeneration++;}
      snapshot = freeze({ state: coordinator.getState(), session: store.getSnapshot() });
      for (const listener of [...listeners]) { try { listener(); } catch { listenerFailures++; } }
    }
    function track<T>(operation: () => Promise<T>): Promise<T> {
      const promise = operation(); publish(); // observes the synchronous admission closure
      return promise.finally(publish);
    }
    function selectPage(next:CanvasPage,editor=false){
      const access=canvasAccess(store.getSnapshot()?.saved,status()).find(p=>p.page===next);
      if(!access?.visible||editor&&!access.editable)return {ok:false as const,code:editor?'page_not_editable':'page_hidden'};
      if(coordinator.getState().saving||coordinator.getState().dirty)return {ok:false as const,code:'page_draft_unresolved'};
      page=next;pageGeneration++;publish();return {ok:true as const};
    }
    return {
      getSnapshot: () => snapshot,
      subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
      getListenerFailureCount: () => listenerFailures,
      pages:{
        current:()=>page,generation:()=>pageGeneration,status,
        access:()=>canvasAccess(store.getSnapshot()?.saved,status()),
        canEditCard(id:string){const doc=store.getSnapshot()?.saved;return !!doc&&itemCanvasPage(doc,id)===page&&canvasAccess(doc,status())[page-1].editable;},
        refresh(){publish();},
        select:(next:CanvasPage)=>selectPage(next),
        selectEditor:(next:CanvasPage)=>selectPage(next,true),
        async setCount(count:2|3|4|5){const current=store.getSnapshot(),state=coordinator.getState();
          if(status()!=='active'||![2,3,4,5].includes(count)||!current||state.dirty||state.saving||state.source!=='v2')return {ok:false as const,code:'page_count_locked'};
          const doc=validateWalletDocument(current.saved);doc.canvas.pages={version:1,assignments:doc.canvas.pages?.assignments??{},selectedCount:count};
          const result=coordinator.updateDraft(state.generation,doc);publish();if(!result.ok)return result;
          return track(()=>coordinator.save(state.generation));},
      },
      commands: {
        initialize: () => track(() => coordinator.initialize()),
        save: (generation: number) => track(() => coordinator.save(generation)),
        cutover: (generation: number, doc: RuntimeWalletSession['draft']) => track(() => coordinator.cutover(generation, doc)),
        reconcile: () => track(() => coordinator.reconcile()),
        retryActivation: () => track(() => coordinator.retryActivation()),
        cancelCutover() { const result = coordinator.cancelCutover(); publish(); return result; },
        updateDraft(generation: number, doc: RuntimeWalletSession['draft']) {
          try{doc=validateWalletDocument(doc);}catch{return {ok:false as const,code:'invalid_draft',kind:'blocked' as const};}
          const saved=store.getSnapshot()?.saved;
          // Explicit discard is memory-only and remains possible after expiry. Saves still fail closed.
          if(saved&&JSON.stringify(saved)!==JSON.stringify(doc)&&!mayWrite(doc))return {ok:false as const,code:'canvas_access_denied',kind:'blocked' as const};
          const result = coordinator.updateDraft(generation, doc);
          if (result.ok) {
            const current = store.getSnapshot(), memory = coordinator.getSession();
            if (current && memory) store.install({ source: current.source, generation: current.generation, revision: current.revision,
              saved: memory.saved, draft: memory.draft, repository: current.repository });
          }
          publish(); return result;
        },
      },
    };
  }
  return { getOwner() { owner ??= buildOwner(); return owner; } };
}
