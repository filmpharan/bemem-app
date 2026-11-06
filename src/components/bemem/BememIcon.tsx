import { StyleSheet, View } from 'react-native';
import { bemem } from '../../constants/bemem-theme';

export function BememIcon({ name, color = bemem.muted }: { name: 'search' | 'plus' | 'close' | 'chevron-left'; color?: string }) {
  return <View accessible={false} style={styles.box}>
    {name === 'search' ? <>
      <View style={[styles.circle, { borderColor: color }]} />
      <View style={[styles.handle, { backgroundColor: color }]} />
    </> : name === 'chevron-left' ? <View style={[styles.chevron, { borderColor: color }]} /> : <>
      <View style={[styles.line, { backgroundColor: color, transform: [{ rotate: name === 'close' ? '45deg' : '0deg' }] }]} />
      <View style={[styles.line, { backgroundColor: color, transform: [{ rotate: name === 'close' ? '-45deg' : '90deg' }] }]} />
    </>}
  </View>;
}
const styles = StyleSheet.create({
  box: { width: 20, height: 20 },
  chevron: { width: 10, height: 10, borderLeftWidth: 2, borderBottomWidth: 2, left: 7, top: 5, transform: [{ rotate: '45deg' }] },
  circle: { position: 'absolute', width: 13, height: 13, borderWidth: 1.8, borderRadius: 8, left: 1, top: 1 },
  handle: { position: 'absolute', width: 8, height: 1.8, left: 11, top: 14, transform: [{ rotate: '45deg' }], borderRadius: 1 },
  line: { position: 'absolute', width: 18, height: 2, left: 1, top: 9, borderRadius: 1 },
});
