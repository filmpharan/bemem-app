import { ciColors,ciTypography } from '../../constants/ci-theme';
import { sheetVisual } from '../../constants/sheet-visual';
import { useRef, useState, type ComponentRef } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bemem } from '../../constants/bemem-theme';
import { AddCardSheet } from './AddCardSheet';
import { GlassButton } from './GlassButton';
import { AddCardIcon } from './AddCardIcon';
import { AccountIcon } from './AccountIcon';
import { compactHeaderStyles } from './EightSlotHeader';

type Overlay = 'closed' | 'menu' | 'policy' | 'login';
const entries = ['Add Card', 'Decorate', 'Policy', 'Login'] as const;
const sections = [
  ['Local Device Storage', 'Your cards and decorations are currently stored on this device. Automatic cloud backup is not available. Uninstalling the app or changing devices may result in data loss.'],
  ['Decorate — One-Time Purchase', 'Decorate is currently available for testing. A one-time purchase to unlock Decorate is planned for a future release.'],
  ['Cloud Backup — Monthly Subscription', 'Cloud backup and sync are planned as a monthly subscription service. Login and cloud storage are not yet available.'],
] as const;

/** Local overlay state: opening an account notice does not rerender Home's canvas. */
export function HomeAccountMenu({ disabled, onAddCard, onDecorate,compact=false }: {
  disabled: boolean; onAddCard: () => void; onDecorate: () => void;compact?:boolean;
}) {
  const [overlay, setOverlay] = useState<Overlay>('closed');
  const current = useRef<Overlay>('closed');
  const button = useRef<ComponentRef<typeof View>>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [anchor, setAnchor] = useState({ x: width - 68, y: insets.top + 14, width: 48, height: 48 });
  function show(next: Overlay) { current.current = next; setOverlay(next); }
  function close() { show('closed'); }
  function open() {
    if (disabled || current.current !== 'closed') return;
    Keyboard.dismiss();
    show('menu');
    button.current?.measureInWindow((x, y, w, h) => {
      if (current.current === 'menu' && w > 0 && h > 0) setAnchor({ x, y, width: w, height: h });
    });
  }
  function choose(entry: typeof entries[number]) {
    if (current.current !== 'menu') return;
    close();
    if (entry === 'Policy') show('policy');
    else if (entry === 'Login') show('login');
    else if (!disabled) { if (entry === 'Add Card') onAddCard(); else onDecorate(); }
  }
  const leftInset = Math.max(12, insets.left + 8), rightInset = Math.max(12, insets.right + 8);
  const popupWidth = Math.min(224, Math.max(1, width - leftInset - rightInset));
  const left = Math.max(leftInset, Math.min(width - popupWidth - rightInset, anchor.x + anchor.width - popupWidth));
  const top = Math.max(insets.top + 8, Math.min(anchor.y + anchor.height + 8, height - insets.bottom - 224));
  const notice = overlay === 'policy' || overlay === 'login';
  return <View style={[styles.control,compact&&{width:'100%',maxWidth:48,marginLeft:0}]}>
    <View ref={button} collapsable={false}>
      <Pressable accessibilityRole="button" accessibilityLabel="Account" accessibilityState={{ expanded: overlay !== 'closed', disabled }}
        disabled={disabled} onPress={open} style={({ pressed }) => [compact?compactHeaderStyles.target:styles.account, { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }]}>
        {compact?<View pointerEvents="none" style={compactHeaderStyles.circle}><AccountIcon/></View>:<AccountIcon />}
      </Pressable>
    </View>
    {overlay === 'menu' && <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close account menu" onPress={close} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={[styles.popup, { left, top, width: popupWidth, maxHeight: Math.max(48, height - top - insets.bottom - 12) }]}>
          <ScrollView bounces={false} contentContainerStyle={styles.menuContent}>
            {entries.map(entry => <Pressable key={entry} accessibilityRole="button" accessibilityLabel={entry}
              onPress={() => choose(entry)} style={({ pressed }) => [styles.entry, pressed && styles.pressed]}>
              {entry === 'Login' ? <AccountIcon size={20} /> :
                <AddCardIcon name={entry === 'Add Card' ? 'add-card' : entry === 'Decorate' ? 'decorate' : 'policy'} size={20} />}
              <Text style={styles.menuText}>{entry}</Text>
            </Pressable>)}
          </ScrollView>
        </View>
      </View>
    </Modal>}
    {notice && <AddCardSheet modalOnly background={null} title={overlay === 'policy' ? 'Policy' : 'Coming Soon'} onClose={close}
      footer={<GlassButton accessibilityLabel={overlay === 'policy' ? 'Close Policy' : 'Back to Home'} onPress={close} style={styles.close}>
        <Text style={styles.closeText}>{overlay === 'policy' ? 'Close' : 'Back to Home'}</Text>
      </GlassButton>}>
      {overlay === 'policy' ? sections.map(([title, body]) => <View key={title} style={styles.section}>
        <Text accessibilityRole="header" style={styles.heading}>{title}</Text><Text style={styles.body}>{body}</Text>
      </View>) : <Text style={styles.body}>Login and cloud backup are not available yet.</Text>}
    </AddCardSheet>}
  </View>;
}
const styles = StyleSheet.create({
  control: { flexShrink: 0, marginLeft: 'auto' },
  account: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: bemem.border, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(24,36,44,0.12)' },
  popup: { position: 'absolute', borderRadius: 20, borderWidth: 1, borderColor: bemem.border, backgroundColor: bemem.background, overflow: 'hidden', boxShadow: '0 8px 24px rgba(35,48,60,0.16)' },
  menuContent: { paddingVertical: 6 },
  entry: { minHeight: 48, paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { opacity: 0.65 },
  menuText: { ...ciTypography.section, fontWeight:'400', flexShrink:1, color:ciColors.text.primary },
  section: { gap: 8, paddingBottom: 18, marginBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: sheetVisual.border },
  heading: { ...ciTypography.section, color:ciColors.text.primary },
  body: { ...ciTypography.body, fontSize:15, lineHeight:24, color:ciColors.text.primary },
  close: { minHeight: 48 },
  closeText: { ...ciTypography.button, fontSize:15, lineHeight:24, fontWeight:'700', color:ciColors.action.neutral },
});
