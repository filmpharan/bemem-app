import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { bemem } from '../../constants/bemem-theme';
import { lagoonFonts } from '../../constants/lagoon-theme';
import type { PreviewCard } from '../../types/wallet-ui';
import { MembershipCard } from './MembershipCard';

export function CardPreview({ card, fromCreate, onClose }: {
  card: PreviewCard | null; fromCreate: boolean; onClose: () => void;
}) {
  return <Modal transparent animationType="slide" visible={card !== null} onRequestClose={onClose}>
    <View style={styles.backdrop}>
      {/* Sibling hit targets: touches inside the sheet cannot bubble to the backdrop. */}
      <Pressable accessibilityRole="button" accessibilityLabel="Close card preview"
        onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={styles.sheet}>
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
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
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
