import { StyleSheet, View } from 'react-native';
import { core, lagoon } from '../../constants/lagoon-theme';
import { GlassButton } from './GlassButton';
import { BememIcon } from './BememIcon';

export function CanvasActions({ editing, empty, disabled, onAdd }: {
  editing: boolean; empty: boolean; disabled: boolean; onAdd: () => void;
}) {
  if(editing||!empty)return null;
  return <View pointerEvents="box-none" style={styles.actions}>
    <GlassButton kind="action" accessibilityLabel="Add Card"
      disabled={disabled} onPress={onAdd}
      style={[styles.fab, styles.right]}>
      <BememIcon name="plus" color={lagoon.text.onAction} />
    </GlassButton>
  </View>;
}
const styles = StyleSheet.create({
  actions: { position: 'absolute', left: core.geometry.actionRail.horizontalInset, right: core.geometry.actionRail.horizontalInset, bottom: 24, height: 56 },
  fab: { position: 'absolute', ...core.geometry.fab },
  right: { right: 0 },
});
