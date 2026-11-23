import { View } from 'react-native';
import { ciColors } from '../../constants/ci-theme';

export type FooterIconName = 'decorate' | 'create' | 'home' | 'canvas' | 'add';
type Point = readonly [number, number];
/** Native vector primitives on a 24-unit grid; no bitmap, font glyph or decoder. */
export function FooterIcon({ name, color, filled = false }: { name: FooterIconName; color: string; filled?: boolean }) {
  const stroke = 1.9;
  function line(a: Point, b: Point, key: string) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return <View key={key} style={{ position: 'absolute', left: (a[0] + b[0] - length) / 2, top: (a[1] + b[1] - stroke) / 2,
      width: length, height: stroke, borderRadius: stroke / 2, backgroundColor: color,
      transform: [{ rotate: `${Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI}deg` }] }} />;
  }
  function path(points: readonly Point[], key: string, close = false) {
    return points.slice(1).map((point, index) => line(points[index], point, `${key}-${index}`))
      .concat(close ? [line(points[points.length - 1], points[0], `${key}-close`)] : []);
  }
  function sparkle(x: number, y: number, radius: number, key: string) {
    const inner = radius * .28;
    return path([[x, y - radius], [x + inner, y - inner], [x + radius, y], [x + inner, y + inner],
      [x, y + radius], [x - inner, y + inner], [x - radius, y], [x - inner, y - inner]], key, true);
  }
  return <View testID={`footer-icon-${name}`} accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ width: 24, height: 24 }}>
    {name === 'decorate' && <>{sparkle(8, 11, 5.5, 'large')}{sparkle(18, 5, 3, 'top')}{sparkle(18, 19, 3.5, 'bottom')}</>}
    {name === 'create' && <>{path([[2, 9], [12, 2], [22, 9], [12, 16]], 'upper', true)}{path([[4, 14], [12, 20], [20, 14]], 'lower')}</>}
    {name === 'canvas' && <><View style={{ position: 'absolute', left: 7, top: 3, width: 15, height: 16, borderWidth: stroke, borderColor: color, borderRadius: 3 }} />
      <View style={{ position: 'absolute', left: 3, top: 7, width: 15, height: 15, backgroundColor: ciColors.surface.canvas, borderWidth: stroke, borderColor: color, borderRadius: 3 }} /></>}
    {name === 'add' && <><View style={{ position: 'absolute', left: 2, top: 2, width: 20, height: 20, borderWidth: stroke, borderColor: color, borderRadius: 10 }} />
      {line([7, 12], [17, 12], 'horizontal')}{line([12, 7], [12, 17], 'vertical')}</>}
    {name === 'home' && (filled ? <>
      <View style={{ position: 'absolute', left: 2, top: 2, width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 9,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color }} />
      <View style={{ position: 'absolute', left: 4, top: 10, width: 16, height: 5, backgroundColor: color, borderRadius: 1.5 }} />
      <View style={{ position: 'absolute', left: 4, top: 12, width: 5.5, height: 10, backgroundColor: color, borderRadius: 1.5 }} />
      <View style={{ position: 'absolute', left: 14.5, top: 12, width: 5.5, height: 10, backgroundColor: color, borderRadius: 1.5 }} />
    </> : path([[3, 11], [12, 3], [21, 11], [20, 11], [20, 21], [15, 21], [15, 15], [9, 15], [9, 21], [4, 21], [4, 11]], 'home'))}
  </View>;
}
