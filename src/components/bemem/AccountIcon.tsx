import { View } from 'react-native';
import { lagoon } from '../../constants/lagoon-theme';

/** Original Account geometry, shared with Login; no icon-font dependency. */
export function AccountIcon({ size = 24 }: { size?: number }) {
  const height = size * 26 / 24;
  return <View accessible={false} pointerEvents="none" style={{ width: size, height }}>
    <View style={{ position: 'absolute', width: 24, height: 26,
      left: (size - 24) / 2, top: (height - 26) / 2, transform: [{ scale: size / 24 }] }}>
      <View style={{ position: 'absolute', width: 10, height: 10, borderWidth: 1.8,
        borderColor: lagoon.text.primary, borderRadius: 5, left: 7, top: 2 }} />
      <View style={{ position: 'absolute', width: 22, height: 11, borderWidth: 1.8,
        borderColor: lagoon.text.primary, borderTopLeftRadius: 12, borderTopRightRadius: 12,
        borderBottomLeftRadius: 4, borderBottomRightRadius: 4, left: 1, top: 15 }} />
    </View>
  </View>;
}
