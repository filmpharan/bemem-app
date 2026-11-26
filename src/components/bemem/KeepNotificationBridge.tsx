import {useEffect,useRef} from 'react';
import {useWalletRuntime} from './WalletRuntimeProvider';
import {deviceHistoryRepository} from '../../lib/card-history-native';
import {createKeepNotificationTargetResolver} from '../../lib/keep-notification-target';
import {createKeepNotificationNavigation} from '../../lib/keep-notification-navigation';
import {subscribeKeepNotificationResponses,getLastKeepNotificationResponse,clearLastKeepNotificationResponse,subscribeKeepNotificationReceived} from '../../lib/keep-notifications-native';

/** Subscription lifetime is independent of UI blocking; pending intent belongs to the coordinator. */
export function KeepNotificationBridge({blocked,onOpen,onUnavailable}:{blocked:boolean;onOpen:(target:{cardId:string;keepId:string})=>void;onUnavailable:()=>void}){
 const {runtime,snapshot}=useWalletRuntime();
 const latest=useRef({blocked,onOpen,onUnavailable});latest.current={blocked,onOpen,onUnavailable};
 const navigation=useRef<ReturnType<typeof createKeepNotificationNavigation>|null>(null);
 useEffect(()=>{
  const owner=()=>{const s=runtime.getSnapshot();return s.state.source==='v2'&&s.session&&!s.state.saving?JSON.stringify([s.state.source,s.state.generation,s.session.revision]):null;};
  const resolver=createKeepNotificationTargetResolver({owner,readHistory:()=>deviceHistoryRepository.load(),
   cardExists:id=>!!runtime.getSnapshot().session?.saved.cards.some(c=>c.kind==='membership'&&c.id===id)});
  const coordinator=createKeepNotificationNavigation({owner,
   available(){const s=runtime.getSnapshot();return !latest.current.blocked&&s.state.source==='v2'&&!!s.session&&!s.state.saving&&!s.state.dirty;},
   resolve:tap=>resolver.resolve(tap,{consume:false}),
   open:target=>latest.current.onOpen(target),unavailable:()=>latest.current.onUnavailable(),
   consumed(tap){const last=getLastKeepNotificationResponse();if(last?.identifier===tap.identifier&&last.at===tap.at&&last.cardId===tap.cardId&&last.keepId===tap.keepId)clearLastKeepNotificationResponse();},
  });
  navigation.current=coordinator;
  const unsubscribe=subscribeKeepNotificationResponses(tap=>coordinator.enqueue(tap));
  const received=subscribeKeepNotificationReceived(()=>{/* Actual callback observed; no delivery inference. */});
  const last=getLastKeepNotificationResponse();if(last)coordinator.enqueue(last);
  return()=>{coordinator.close();if(navigation.current===coordinator)navigation.current=null;unsubscribe();received();};
 },[runtime]);
 useEffect(()=>{navigation.current?.refresh();},[blocked,snapshot,runtime]);
 return null;
}
