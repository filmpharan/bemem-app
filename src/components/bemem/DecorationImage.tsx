import { memo } from 'react';
import { Image } from 'expo-image';
import { View } from 'react-native';
import type { Decoration } from '../../types/decoration';
import { decorationImages } from '../../constants/decoration-images';
import { decorationPaint } from '../../constants/decoration-paint';
/** Full-tile paint, no card inset/crop. Noninteractive on Home. */
export const DecorationImage = memo(function DecorationImage({ assetId, rotation = 0 }: Pick<Decoration,'assetId'> & { rotation?: Decoration['rotation'] }) {
  return <View pointerEvents="none" accessible={false} style={{width:'100%',height:'100%',overflow:'hidden'}}>
    <Image pointerEvents="none" accessible={false} source={decorationImages[assetId]} contentFit="contain" transition={0}
      style={{ width: '100%', height: '100%', transform: [{ rotate: `${rotation}deg` }, { scale: decorationPaint[assetId] ?? 1 }] }} />
  </View>;
});
