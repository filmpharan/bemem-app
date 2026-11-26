import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { amountInput, type HistoryRecord, type Receipt } from '../../lib/card-history';
import { receiptUri } from '../../lib/card-history-native';
import { ciButtons, ciColors, ciTypography, fontForUiText } from '../../constants/ci-theme';
import { AddCardIcon } from './AddCardIcon';
import { CardArtworkImage } from './CardArtworkImage';

export type KeepDetailScreenProps = {
  record: HistoryRecord; cardName: string; notificationLabel: string; canMutate: boolean; busy: boolean;
  notice: string; recovery: ReactNode; onBack: () => void; onClose: () => void;
  onPhoto: (receipt: Receipt) => void; onComplete: () => void; onDelete: () => void;
};

/** Renders verified saved content and emits intents; persistence and recovery stay with the controller. */
export function KeepDetailScreen({ record, cardName, notificationLabel, canMutate, busy, notice, recovery, onBack, onClose, onPhoto, onComplete, onDelete }: KeepDetailScreenProps) {
  const reminder = record.keep?.reminder, legacy = record.entryKind === undefined;
  return <View style={styles.screen}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to My Keeps" onPress={onBack} style={styles.hit}><View style={styles.backIcon}><AddCardIcon name="chevron" /></View></Pressable>
      <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>Keep</Text><Text numberOfLines={1} style={[styles.secondary, { fontFamily: fontForUiText(cardName) }]}>{cardName}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Close Keeps" onPress={onClose} style={styles.hit}><AddCardIcon name="close" /></Pressable>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      {!!notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}{recovery}
      {!!reminder && <View style={styles.reminder}>
        <View style={styles.labelRow}><AddCardIcon name="bell" color={ciColors.action.primary} /><Text accessibilityRole="header" style={styles.section}>Reminder</Text></View>
        <Text style={styles.due}>{new Date(reminder.at).toLocaleString([], { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
        <Text style={styles.body}>{reminder.state === 'completed' ? 'Completed' : Date.parse(reminder.at) <= Date.now() ? 'Overdue · Not completed' : 'Upcoming'}</Text>
        {!!notificationLabel && <Text accessibilityLiveRegion="polite" style={styles.secondary}>{notificationLabel}</Text>}
        {reminder.title !== 'You have a reminder.' && <Text style={[styles.body, { fontFamily: fontForUiText(reminder.title) }]}>{reminder.title}</Text>}
        {reminder.state === 'pending' && <Pressable accessibilityRole="button" accessibilityLabel="Mark reminder complete" accessibilityState={{ disabled: busy || !canMutate }} disabled={busy || !canMutate} onPress={onComplete} style={[styles.complete, (busy || !canMutate) && styles.disabled]}><AddCardIcon name="check" color={ciColors.text.onAction} size={20} /><Text style={styles.completeText}>Mark Complete</Text></Pressable>}
      </View>}
      {!!record.description.trim() && <View style={styles.block}><Text accessibilityRole="header" style={styles.section}>Description</Text><Text selectable style={[styles.body, { fontFamily: fontForUiText(record.description) }]}>{record.description}</Text></View>}
      {!!record.notes.trim() && <View style={styles.block}><Text accessibilityRole="header" style={styles.section}>Note</Text><Text selectable style={[styles.body, { fontFamily: fontForUiText(record.notes) }]}>{record.notes}</Text></View>}
      {!!record.receipts.length && <View style={styles.block}>
        <Text accessibilityRole="header" style={styles.section}>Photos · {record.receipts.length}</Text>
        <Text style={styles.secondary}>Tap a photo to view or share it.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.photos}>
          {record.receipts.map((image, index) => <Pressable key={image.id} accessibilityRole="button" accessibilityLabel={`Open photo ${index + 1} of ${record.receipts.length}`} onPress={() => onPhoto(image)} style={styles.photo}>
            <View style={styles.photoImage}><CardArtworkImage image={image} sourceUri={receiptUri(image.assetId)} thumbnail displayPreview="detail" cornerRadius={12} /></View><Text style={styles.secondary}>Photo {index + 1}</Text>
          </Pressable>)}
        </ScrollView>
      </View>}
      <View style={styles.metadata}>
        <Text accessibilityRole="header" style={styles.section}>Saved details</Text>
        <Text selectable style={styles.secondary}>Saved {new Date(record.createdAt).toLocaleString()}</Text>
        {legacy && <><Text style={styles.secondary}>{record.type === 'purchase' ? 'Purchase' : record.type === 'visit' ? 'Visit' : 'Note'} · {record.date}{record.time ? ` · ${record.time}` : ''}</Text>{!!record.money && <Text selectable style={styles.body}>{amountInput(record.money)} {record.money.currency}</Text>}</>}
      </View>
      <View style={styles.deleteRegion}><Pressable accessibilityRole="button" accessibilityLabel="Delete Keep" accessibilityState={{ disabled: busy || !canMutate }} disabled={busy || !canMutate} onPress={onDelete} style={[styles.delete, (busy || !canMutate) && styles.disabled]}><AddCardIcon name="delete" size={20} color={ciColors.action.destructive} /><Text style={styles.deleteText}>Delete Keep</Text></Pressable></View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' }, header: { minHeight: 76, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4 },
  hit: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, backIcon: { transform: [{ rotate: '90deg' }] }, heading: { flex: 1, minWidth: 0 },
  title: { ...ciTypography.title, color: ciColors.text.primary }, section: { ...ciTypography.section, color: ciColors.text.primary }, secondary: { ...ciTypography.supporting, color: ciColors.text.secondary },
  body: { ...ciTypography.body, color: ciColors.text.primary }, content: { padding: 20, paddingBottom: 40, gap: 24 }, notice: { ...ciTypography.body, color: ciColors.text.secondary },
  block: { gap: 10 }, reminder: { padding: 18, gap: 12, borderRadius: 22, backgroundColor: ciButtons.secondary }, labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  due: { ...ciTypography.title, color: ciColors.action.primary }, complete: { minHeight: 48, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: ciButtons.primary },
  completeText: { ...ciTypography.button, color: ciColors.text.onAction }, disabled: { opacity: 0.45 }, photos: { gap: 12 }, photo: { minWidth: 112, minHeight: 156, gap: 8 }, photoImage: { width: 112, height: 128, borderRadius: 12, overflow: 'hidden', backgroundColor: ciButtons.neutral },
  metadata: { gap: 8, paddingTop: 8 }, deleteRegion: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#DFECE7' }, delete: { minHeight: 48, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: ciButtons.neutral }, deleteText: { ...ciTypography.button, color: ciColors.action.destructive },
});
