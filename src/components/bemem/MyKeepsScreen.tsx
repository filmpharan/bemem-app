import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { HistoryDocument, HistoryRecord } from '../../lib/card-history';
import { keepListNotification, keepListSummary, nextKeepDeadline, projectKeepList, type KeepGroup } from '../../lib/keep-list-projection';
import { ciButtons, ciColors, ciTypography, fontForUiText } from '../../constants/ci-theme';
import { AddCardIcon } from './AddCardIcon';
import { KeepThumbnail } from './KeepThumbnail';

export type MyKeepsScreenProps = {
  cardId: string; cardName: string; document: HistoryDocument | null; loadState: 'loading' | 'loaded' | 'failed';
  reviewIds: readonly string[]; notice: string; recovery: ReactNode; canAdd: boolean;
  onAdd: () => void; onBack: () => void; onOpen: (id: string) => void; revealId?: string | null;
  scrollOffset: number; onScrollOffset: (offset: number) => void; onRevealConsumed?: (id: string) => void;
};
type ListItem = { key: string; group: KeepGroup; record?: HistoryRecord; count?: number };

export function MyKeepsScreen(props: MyKeepsScreenProps) {
  const { cardId, cardName, document, loadState, reviewIds, notice, recovery, canAdd, onAdd, onBack, onOpen, revealId, onRevealConsumed } = props;
  const [now, setNow] = useState(Date.now), [foreground, setForeground] = useState(AppState.currentState !== 'background');
  const [highlight, setHighlight] = useState<string | null>(null);
  const list = useRef<FlatList<ListItem>>(null), visibleId = useRef<string | null>(null);
  const revealSeen = useRef<string | null>(null), pendingIndex = useRef<number | null>(null);
  const sections = useMemo(() => projectKeepList(document, cardId, reviewIds, now), [document, cardId, reviewIds, now]);
  const data = useMemo<ListItem[]>(() => sections.flatMap(section => section.data.length ? [
    { key: `group:${section.title}`, group: section.title, count: section.data.length },
    ...section.data.map(record => ({ key: `record:${record.id}`, group: section.title, record })),
  ] : []), [sections]);
  const order = data.map(item => item.key).join('|'), previousOrder = useRef(order);
  const dataRef = useRef(data); dataRef.current = data;
  const viewability = useRef(({ viewableItems }: { viewableItems: { isViewable: boolean; item: ListItem }[] }) => {
    visibleId.current = viewableItems.find(item => item.isViewable && item.item.record)?.item.record?.id ?? null;
  }).current;
  const initialOffset = useRef(Math.max(0, props.scrollOffset));
  const restorePending = useRef(initialOffset.current > 0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setForeground(state === 'active');
      if (state === 'active') setNow(Date.now());
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!foreground) return;
    const deadline = nextKeepDeadline(document, cardId, now);
    if (deadline === null) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(2147483647, Math.max(1, deadline - Date.now() + 1)));
    return () => clearTimeout(timer);
  }, [document, cardId, now, foreground]);
  useEffect(() => {
    if (!highlight) return;
    const timer = setTimeout(() => setHighlight(null), 1800);
    return () => clearTimeout(timer);
  }, [highlight]);
  function scrollTo(index: number) {
    pendingIndex.current = index;
    list.current?.scrollToIndex({ index, animated: false, viewPosition: 0 });
  }
  useEffect(() => {
    const id = revealId;
    if (id && revealSeen.current !== id) {
      const index = data.findIndex(item => item.record?.id === id);
      if (index >= 0) {
        restorePending.current = false;
        revealSeen.current = id;
        setHighlight(id);
        scrollTo(index);
        onRevealConsumed?.(id);
        previousOrder.current = order;
        return;
      }
    }
    if (previousOrder.current !== order && visibleId.current) {
      const index = data.findIndex(item => item.record?.id === visibleId.current);
      const previousIndex = previousOrder.current.split('|').indexOf(`record:${visibleId.current}`);
      if (index >= 0 && index !== previousIndex) scrollTo(index);
    }
    previousOrder.current = order;
  }, [order, revealId, data, onRevealConsumed]);

  const total = sections.reduce((sum, section) => sum + section.data.length, 0);
  return <View style={styles.screen}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to card" onPress={onBack} style={styles.hit}><View style={styles.backIcon}><AddCardIcon name="chevron" /></View></Pressable>
      <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>My Keeps</Text><Text numberOfLines={1} style={[styles.secondary, { fontFamily: fontForUiText(cardName) }]}>{cardName || 'Recovery'}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Add Keep" accessibilityState={{ disabled: !canAdd }} disabled={!canAdd} onPress={onAdd} style={[styles.add, !canAdd && styles.disabled]}><AddCardIcon name="plus" size={20} /><Text style={styles.button}>Add Keep</Text></Pressable>
    </View>
    <FlatList ref={list} data={loadState === 'loaded' ? data : []} keyExtractor={item => item.key}
      initialNumToRender={10} maxToRenderPerBatch={8} windowSize={7} contentOffset={{ x: 0, y: initialOffset.current }}
      onViewableItemsChanged={viewability} viewabilityConfig={{ itemVisiblePercentThreshold: 10 }}
      onScroll={event => props.onScrollOffset(Math.max(0, event.nativeEvent.contentOffset.y))} scrollEventThrottle={100}
      onScrollToIndexFailed={info => { pendingIndex.current = info.index; list.current?.scrollToOffset({ offset: Math.max(0, info.averageItemLength * info.index), animated: false }); }}
      onContentSizeChange={() => {
        const index = pendingIndex.current; pendingIndex.current = null;
        if (index !== null && index < dataRef.current.length) list.current?.scrollToIndex({ index, animated: false, viewPosition: 0 });
        else if (restorePending.current && loadState === 'loaded' && dataRef.current.length) {
          restorePending.current = false;
          list.current?.scrollToOffset({ offset: initialOffset.current, animated: false });
        }
      }}
      contentContainerStyle={styles.content} ListHeaderComponent={<View style={styles.intro}>
        {!!notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}{recovery}
        {loadState === 'loading' && <Text accessibilityLiveRegion="polite" style={styles.secondary}>Loading Keeps…</Text>}
        {loadState === 'failed' && <Text accessibilityRole="alert" style={styles.notice}>Keeps could not be loaded. Existing records have not been changed. Reopen My Keeps to check again.</Text>}
        {loadState === 'loaded' && <Text style={styles.secondary}>{total} {total === 1 ? 'Keep' : 'Keeps'} · Only for this card</Text>}
      </View>}
      ListEmptyComponent={loadState === 'loaded' ? <View style={styles.empty}><AddCardIcon name="keep" size={36} color={ciColors.action.primary} /><Text style={styles.section}>A little space for what matters</Text><Text style={styles.secondary}>Save a note, photos or a reminder for this card.</Text></View> : undefined}
      renderItem={({ item }) => !item.record ? <View style={styles.group}><Text accessibilityRole="header" style={styles.section}>{item.group}</Text><Text style={styles.secondary}>{item.count}</Text></View> : <KeepRow record={item.record} group={item.group} highlighted={highlight === item.record.id} onOpen={onOpen} />} />
  </View>;
}

function KeepRow({ record, group, highlighted, onOpen }: { record: HistoryRecord; group: KeepGroup; highlighted: boolean; onOpen: (id: string) => void }) {
  const summary = keepListSummary(record), reminder = record.keep?.reminder, status = keepListNotification(record);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open Keep: ${summary}`} onPress={() => onOpen(record.id)} style={[styles.row, highlighted && styles.highlight]}>
    <KeepThumbnail image={record.receipts[0]} reminder={!!reminder} />
    <View style={styles.rowContent}>
      <Text numberOfLines={2} style={[styles.button, { fontFamily: fontForUiText(summary) }]}>{summary}</Text>
      {!!record.receipts.length && !!(record.notes.trim() || record.description.trim()) && <Text style={styles.secondary}>{record.receipts.length} {record.receipts.length === 1 ? 'photo' : 'photos'}</Text>}
      {!!reminder && <Text style={[styles.secondary, group === 'Overdue' && styles.error]}>{reminder.state === 'completed' ? 'Completed reminder' : 'Due'} · {new Date(reminder.at).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</Text>}
      {group === 'Needs review' ? <Text style={styles.error}>Needs review · Open for recovery details</Text> : !!status && <Text style={styles.secondary}>{status}</Text>}
    </View><View style={styles.forwardIcon}><AddCardIcon name="chevron" size={18} /></View>
  </Pressable>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' }, header: { minHeight: 76, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4 },
  hit: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, backIcon: { transform: [{ rotate: '90deg' }] }, forwardIcon: { transform: [{ rotate: '-90deg' }] },
  heading: { flex: 1, minWidth: 0 }, title: { ...ciTypography.title, color: ciColors.text.primary }, section: { ...ciTypography.section, color: ciColors.text.primary },
  secondary: { ...ciTypography.supporting, color: ciColors.text.secondary }, button: { ...ciTypography.button, color: ciColors.text.primary },
  add: { minHeight: 48, minWidth: 48, paddingHorizontal: 12, gap: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: ciButtons.secondary, borderRadius: 16 }, disabled: { opacity: 0.45 },
  content: { paddingHorizontal: 16, paddingBottom: 32 }, intro: { gap: 12, paddingVertical: 12 }, notice: { ...ciTypography.body, color: ciColors.text.secondary },
  group: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52, paddingHorizontal: 4, marginTop: 8 },
  row: { minHeight: 96, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, marginBottom: 10, borderRadius: 20, backgroundColor: ciButtons.neutral, borderWidth: 1, borderColor: '#DFECE7' },
  rowContent: { flex: 1, minWidth: 0, gap: 3 }, highlight: { borderColor: ciColors.action.primary, backgroundColor: ciButtons.secondary }, error: { ...ciTypography.supporting, color: ciColors.status.error },
  empty: { paddingVertical: 48, paddingHorizontal: 12, alignItems: 'center', gap: 14 },
});
