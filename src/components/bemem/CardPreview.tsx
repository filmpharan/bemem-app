import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { sheetVisual } from '../../constants/sheet-visual';
import { bemem } from '../../constants/bemem-theme';
import { lagoonFonts } from '../../constants/lagoon-theme';
import type { PreviewCard } from '../../types/wallet-ui';
import { MembershipCard } from './MembershipCard';
import { MembershipCardDetail, type CardDetailMotionPresentation } from './MembershipCardDetail';
import type { MembershipCard as MembershipData } from '../../types/membership-card';
import type { createWalletFeatureCommands } from '../../lib/wallet-feature-commands';

/** A UI-only session. Native stop readback preserves the current position on reversal. */
export function createCardDetailMotion(reducedAtEntry:boolean,onClosed:()=>void,onClosing:(value:boolean)=>void){
  const identity={},progress=new Animated.Value(reducedAtEntry?1:0);
  let alive=true,started=false,reduced=reducedAtEntry,epoch=0,phase:'opening'|'open'|'closing'|'closed'=reducedAtEntry?'open':'opening';
  function complete(){if(!alive||phase!=='closing')return;phase='closed';onClosed();}
  function run(to:number,duration:number,easing:(value:number)=>number){
    const ticket=++epoch;
    progress.stopAnimation(value=>{
      if(!alive||ticket!==epoch)return;
      progress.setValue(value);
      Animated.timing(progress,{toValue:to,duration,easing,useNativeDriver:true,isInteraction:false}).start(({finished})=>{
        if(!alive||ticket!==epoch)return;
        if(!finished){phase='open';progress.setValue(1);onClosing(false);return;}
        if(to===0)complete();else phase='open';
      });
    });
  }
  return {identity,progress,isClosing:()=>phase==='closing'||phase==='closed',
    start(){alive=true;if(phase==='closing'||phase==='closed')return;if(started){phase='open';progress.setValue(1);return;}started=true;if(!reducedAtEntry)run(1,220,Easing.out(Easing.cubic));},
    close(){if(!alive||phase==='closing'||phase==='closed')return;phase='closing';onClosing(true);
      if(reduced){++epoch;progress.stopAnimation();progress.setValue(0);complete();}else run(0,180,Easing.inOut(Easing.cubic));
    },
    preference(value:boolean){reduced=value;if(!value||!alive||phase==='closed')return;++epoch;progress.stopAnimation();progress.setValue(phase==='closing'?0:1);if(phase==='closing')complete();else phase='open';},
    dispose(){alive=false;++epoch;progress.stopAnimation();},
  };
}

export function CardPreview({ card, fromCreate, onClose, membership, editCommands, onHome, presentation = 'modal', onNavigationBlockedChange, onBackHandler, sessionKey, onDismissCancelled }: {
  card: PreviewCard | null; sessionKey?:object; onDismissCancelled?:()=>void; fromCreate: boolean; onClose: () => void;
  membership?: Readonly<MembershipData> | { readonly kind: 'demo' } | null;
  editCommands?: ReturnType<typeof createWalletFeatureCommands>; onHome?: () => void;
  presentation?:'modal'|'inline';onNavigationBlockedChange?:(blocked:boolean)=>void;onBackHandler?:(handler:(()=>void)|null)=>void;
}) {
  // CardPreview remains mounted with card=null, so preference is normally known before a tap.
  const [reduced,setReduced]=useState<boolean|null>(null),[closingSession,setClosingSession]=useState<object|null>(null);
  useEffect(()=>{let active=true,eventSeen=false;
    const listener=AccessibilityInfo.addEventListener('reduceMotionChanged',value=>{eventSeen=true;if(active)setReduced(value);});
    void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(active&&!eventSeen)setReduced(value);},()=>{});
    return()=>{active=false;listener.remove();};
  },[]);
  const sessionNumber=useRef(0);
  const eligible=presentation==='inline'&&!!card&&membership?.kind==='membership';
  const motion=useMemo(()=>{if(!eligible)return null;++sessionNumber.current;return createCardDetailMotion(reduced!==false,onClose,value=>{setClosingSession(value?token:null);if(!value)onDismissCancelled?.();});},[eligible,sessionKey??card?.id,card?.id]);
  const token=motion?.identity??null;
  useEffect(()=>{if(!motion)return;motion.start();return()=>motion.dispose();},[motion]);
  useEffect(()=>{if(motion&&reduced!==null)motion.preference(reduced);},[motion,reduced]);
  const visual:CardDetailMotionPresentation|undefined=motion?{
    closing:closingSession===motion.identity,isClosing:motion.isClosing,close:motion.close,
    renderSheet:element=><Animated.View {...element.props} pointerEvents={closingSession===motion.identity?'none':element.props.pointerEvents}
      style={[element.props.style,{transform:[{translateY:motion.progress.interpolate({inputRange:[0,1],outputRange:[16,0]})}]}]}/>,
    backdrop:<Animated.View pointerEvents="none" accessible={false} testID="card-detail-motion-backdrop" style={[StyleSheet.absoluteFill,{backgroundColor:sheetVisual.scrim,opacity:motion.progress}]}/>,
  }:undefined;
  if (card && membership?.kind === 'membership') return <MembershipCardDetail motion={visual} onBackHandler={onBackHandler} presentation={presentation} onNavigationBlockedChange={onNavigationBlockedChange} key={motion?`${membership.id}:${sessionNumber.current}`:membership.id} card={membership} fromCreate={fromCreate} onClose={onClose} onHome={onHome} editCommands={editCommands} />;
  if(!card&&presentation==='inline')return null;
  const surface=<View style={presentation==='inline'?[styles.backdrop,styles.inline]:styles.backdrop}>
      {/* Sibling hit targets: touches inside the sheet cannot bubble to the backdrop. */}
      <Pressable accessibilityRole="button" accessibilityLabel="Close card preview"
        onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal={presentation!=='inline'} style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.content}>
          {card && <>
            <Text accessibilityRole="header" style={styles.title}>{card.name}</Text>
            <View style={{ width: '100%', aspectRatio: card.orientation === 'portrait' ? 2 / 3 : 1.5, maxHeight: 320 }}>
              <MembershipCard card={card} />
            </View>
            <Text style={styles.description}>Demo card for visual testing only. QR Code and Code 128 are not available and cannot be scanned in Phase 1.</Text>
            {fromCreate && <Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} disabled
              accessibilityLabel="Edit Card. Coming soon." style={styles.edit}>
              <Text style={styles.editText}>Edit Card · Coming soon</Text>
            </Pressable>}
          </>}
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>;
  return presentation==='inline'?surface:<Modal transparent animationType="slide" visible={card !== null} onRequestClose={onClose}>{surface}</Modal>;
}

const styles = StyleSheet.create({
  inline:{...StyleSheet.absoluteFill,zIndex:5},
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: { backgroundColor: bemem.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', maxHeight: '92%', width: '100%', maxWidth: 600, alignSelf: 'center' },
  content: { padding: 24, paddingBottom: 40, gap: 16 },
  title: { fontSize: 20, fontWeight: '800', color: bemem.foreground, fontFamily: lagoonFonts.latin },
  description: { fontSize: 14, lineHeight: 22, color: bemem.muted, fontFamily: lagoonFonts.latin },
  edit: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: bemem.border, justifyContent: 'center', alignItems: 'center', padding: 12 },
  editText: { color: bemem.muted, fontSize: 14, fontFamily: lagoonFonts.latin },
  close: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: bemem.primary },
  closeText: { color: bemem.white, fontSize: 14, fontWeight: '600' },
});
