import { StyleSheet, View } from 'react-native';
import type { Receipt } from '../../lib/card-history';
import { receiptUri } from '../../lib/card-history-native';
import { ciColors } from '../../constants/ci-theme';
import { AddCardIcon } from './AddCardIcon';
import { CardArtworkImage } from './CardArtworkImage';

export function KeepThumbnail({ image, reminder = false }: { image?: Receipt; reminder?: boolean }) {
  return <View style={styles.frame}>{image
    ? <CardArtworkImage image={image} sourceUri={receiptUri(image.assetId)} thumbnail displayPreview="detail" cornerRadius={12} />
    : <AddCardIcon name={reminder ? 'bell' : 'note'} size={26} color={ciColors.action.primary} />}</View>;
}
const styles = StyleSheet.create({ frame: { width: 56, height: 56, borderRadius: 12, overflow: 'hidden', backgroundColor: '#D9F4EC', alignItems: 'center', justifyContent: 'center' } });
