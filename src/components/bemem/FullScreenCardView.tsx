import { useEffect, useRef, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import type { MembershipCard } from '../../types/membership-card';
import { fullCardFit } from '../../lib/full-card-view';
import { fullViewOrientation } from '../../lib/full-view-orientation';
import { emptyCardForm } from '../../lib/card-form';
import { emptyCardPresentation } from '../../lib/card-presentation';
import { lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { AddCardIcon } from './AddCardIcon';
import { CardAppearancePreview } from './CardAppearancePreview';

/** Read-only artwork presentation; owns only a temporary orientation lease. */
export function FullScreenCardView({ card, side, onSide, onBack, onHome, displayPreview=false }: {
  card: Readonly<MembershipCard>; side: 'front' | 'back'; onSide: (side: 'front' | 'back') => void;
  onBack: () => void; onHome: () => void; displayPreview?:boolean;
}) {
  const portrait = fullCardFit(card, 1, 1).portrait;
  const lease = useRef<ReturnType<typeof fullViewOrientation> | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [notice, setNotice] = useState(''), [closing, setClosing] = useState(false);
  const mounted = useRef(true), exiting = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const session = fullViewOrientation(ScreenOrientation, portrait); lease.current = session;
    const request = () => { void session.resume().then(() => {
      if (mounted.current && lease.current === session && !exiting.current) setNotice('');
    }).catch(() => { if (mounted.current && lease.current === session) setNotice('Automatic rotation is unavailable. The complete card still fits the available screen.'); }); };
    if (AppState.currentState === 'active') request();
    const subscription = AppState.addEventListener('change', state => {
      if (exiting.current) return;
      if (state === 'active') request();
      else void session.pause().catch(() => { if (mounted.current && lease.current === session) setNotice('Orientation restoration needs attention. Use Back or Home to retry.'); });
    });
    return () => { mounted.current = false; subscription.remove(); if (lease.current === session) lease.current = null; void session.release().catch(() => {}); };
  }, [portrait]);
  async function exit(home: boolean) {
    if (exiting.current) return; exiting.current = true; setClosing(true);
    try { await lease.current?.release(); if (mounted.current) { if (home) onHome(); else onBack(); } }
    catch { if (mounted.current) { exiting.current = false; setClosing(false); setNotice('Orientation could not be restored. Use Back or Home to try again.'); } }
  }
  const fit = fullCardFit(card, area.width, area.height);
  const values = { ...emptyCardForm(), name: card.name, memberNumber: card.memberNumber ?? '', orientation: card.orientation };
  const presentation = { ...emptyCardPresentation(), side, sizePresetId: card.sizePresetId ?? (card.orientation === 'portrait' ? 'card-portrait' as const : 'card-landscape' as const) };
  return <Modal visible animationType="none" presentationStyle="fullScreen" supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
    statusBarTranslucent navigationBarTranslucent onRequestClose={() => { void exit(false); }}>
    <SafeAreaView style={styles.safe}>
      {!!notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
      <View style={[styles.body, { flexDirection: portrait ? 'column' : 'row' }]}>
        <View testID="full-card-stage" style={styles.stage} onLayout={event => {
          const { width, height } = event.nativeEvent.layout; setArea(previous => previous.width === width && previous.height === height ? previous : { width, height });
        }}>
          {fit.width > 0 && fit.height > 0 && <CardAppearancePreview key={card.id + side} values={values} presentation={presentation}
            displayPreview={displayPreview} appearance={card.appearance} width={fit.width} height={fit.height} />}
        </View>
        <View testID="full-card-controls" style={[styles.controls, { flexDirection: portrait ? 'row' : 'column' }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Switch card front and back" accessibilityState={{ selected: side === 'back', disabled: closing }}
            disabled={closing} onPress={() => onSide(side === 'front' ? 'back' : 'front')} style={styles.hit}><AddCardIcon name="flip" size={22} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Return to Home" accessibilityState={{ disabled: closing }} disabled={closing}
            onPress={() => { void exit(true); }} style={styles.hit}><AddCardIcon name="home" size={22} /></Pressable>
        </View>
      </View>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: lagoon.canvas.base, padding: 4 }, body: { flex: 1 },
  stage: { flex: 1, minWidth: 0, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
  controls: { flexShrink: 0, gap: 8, padding: 4, justifyContent: 'center', alignItems: 'center' },
  hit: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  notice: { fontFamily: lagoonFonts.latin, fontSize: 12, lineHeight: 18, color: lagoon.text.primary, padding: 8 },
});
