import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uuid } from 'expo';
import type { Receipt } from '../../lib/card-history';
import { cloneHistory } from '../../lib/card-history';
import { pickReceipt, pickReceipts, ReceiptSelectionError } from '../../lib/receipt-picker';
import { deviceReceiptStore, receiptUri } from '../../lib/card-history-native';
import { lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { GlassButton } from './GlassButton';
import { CardArtworkImage } from './CardArtworkImage';
import { ArtworkCrop } from './CardArtworkControls';
import { ReceiptViewer } from './ReceiptViewer';

export function ReceiptAttachments({ receipts, onChange, onBusy, disabled = false, singleImage = false, journal = false, onSelectionError, horizontalPhotos = false }: {
  receipts: Receipt[]; onChange?: (images: Receipt[]) => void; onBusy?: (active: boolean) => void; disabled?: boolean; singleImage?: boolean;
  journal?: boolean; onSelectionError?: (failed: boolean) => void;
  horizontalPhotos?: boolean;
}) {
  const mounted = useRef(true), active = useRef(false);
  const [busy, setBusy] = useState(false), [viewer, setViewer] = useState<Receipt | null>(null);
  const [crop, setCrop] = useState<{ image: Receipt; ratio: number } | null>(null);
  const [notice, setNotice] = useState('');
  const [regionWidth, setRegionWidth] = useState(280);
  const current = useRef(receipts); current.current = receipts;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  function activity(value: boolean) { active.current = value; setBusy(value); onBusy?.(value); }
  async function appendPhotos(camera: boolean) {
    if (!mounted.current || !onChange || disabled || active.current || current.current.length >= 4) return;
    activity(true); setNotice(''); Keyboard.dismiss();
    try {
      const images = await pickReceipts(camera, 4 - current.current.length, {
        active: () => mounted.current,
        cameraPermission: async () => (await ImagePicker.requestCameraPermissionsAsync()).granted,
        pick(useCamera, limit) {
          const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 1,
            preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
            ...(!useCamera && { allowsMultipleSelection: true, selectionLimit: limit, orderedSelection: true }) };
          return useCamera ? ImagePicker.launchCameraAsync(options) : ImagePicker.launchImageLibraryAsync(options);
        },
        retain: input => deviceReceiptStore.retain(input), nextId: () => uuid.v4(),
      });
      if (images && mounted.current) {
        if (current.current.length + images.length > 4) throw new ReceiptSelectionError('Maximum of 4 photos reached. No photos were added.');
        onChange([...current.current, ...images]); onSelectionError?.(false);
      }
    } catch (error) {
      if (mounted.current) {
        onSelectionError?.(true);
        setNotice(error instanceof ReceiptSelectionError || error instanceof Error && error.message.startsWith('Camera access') ? error.message
          : 'The selected photos could not all be copied. No photos from this selection were added. Your existing photos and note are unchanged. Try selecting again, or cancel the entry. Use JPEG, PNG or WebP up to 10 MB / 24 megapixels each.');
      }
    } finally { if (mounted.current) activity(false); }
  }
  async function choose(camera: boolean, replacement?: string) {
    if (!onChange || disabled || active.current || !replacement && current.current.length >= (singleImage ? 1 : 20)) return;
    activity(true); setNotice(''); Keyboard.dismiss();
    try {
      const image = await pickReceipt(camera, {
        active: () => mounted.current,
        cameraPermission: async () => (await ImagePicker.requestCameraPermissionsAsync()).granted,
        async pick(useCamera) {
          const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 1,
            preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible };
          return useCamera ? ImagePicker.launchCameraAsync(options) : ImagePicker.launchImageLibraryAsync(options);
        },
        retain: input => deviceReceiptStore.retain(input), nextId: () => uuid.v4(),
      });
      if (image && mounted.current) {
        if (replacement) onChange(current.current.map(item => item.id === replacement ? { ...image, id: replacement } : item));
        else onChange([...current.current, image]);
      }
    } catch (error) {
      if (mounted.current) setNotice(error instanceof Error && error.message.startsWith('Camera access') ? error.message
        : 'Receipt could not be opened or copied. The previous attachments and form are unchanged. Use JPEG, PNG or WebP up to 10 MB / 24 megapixels.');
    } finally { if (mounted.current) activity(false); }
  }
  function editCrop(image: Receipt) {
    if (disabled || active.current) return;
    const start = (ratio: number) => { activity(true); setCrop({ image: cloneHistory(image), ratio }); };
    Alert.alert('Crop receipt', 'The original ratio is preserved until you explicitly choose and apply a crop.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Original ratio', onPress: () => start(image.width / image.height) },
      { text: 'Square crop', onPress: () => start(1) },
    ]);
  }
  if (horizontalPhotos && !onChange) return <View style={styles.group} testID="history-photo-region">
    <Text style={styles.title}>Photos</Text>
    <Text style={styles.text}>{receipts.length}{journal ? '/4 photos' : receipts.length === 1 ? ' photo' : ' photos'}</Text>
    <View style={styles.photoRegion} onLayout={event => setRegionWidth(event.nativeEvent.layout.width)}>
      <ScrollView horizontal nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator={receipts.length > 4 || regionWidth < 216}
        contentContainerStyle={styles.photoStrip} testID="history-photo-strip">
        {receipts.map((image, index) => {
          const slot = Math.max(48, Math.min(84, (regionWidth - 24) / 4)), ratio = image.cropRatio ?? image.width / image.height;
          return <Pressable key={image.id} accessibilityRole="button" accessibilityLabel={`Open photo ${index + 1}`} disabled={disabled}
            style={{ width: slot, minWidth: 48, minHeight: 100, alignItems: 'center', paddingTop: 2 }} onPress={() => setViewer(image)}>
            <View style={{ width: Math.min(slot, 96 * ratio), height: Math.min(96, slot / ratio) }}>
              <CardArtworkImage image={image} sourceUri={receiptUri(image.assetId)} cornerRadius={0} thumbnail />
            </View>
          </Pressable>;
        })}
      </ScrollView>
    </View>
    {receipts.length > 4 && <Text style={styles.text}>Swipe to see all {receipts.length} photos.</Text>}
    {viewer && <ReceiptViewer receipt={viewer} onClose={() => setViewer(null)} />}
  </View>;
  if (journal) return <View style={styles.group}>
    <Text style={styles.title}>Photos</Text>
    <Text accessibilityLiveRegion="polite" style={styles.text}>{receipts.length}/4 photos</Text>
    <View style={styles.row}>
      {receipts.map((image, index) => {
        const ratio = image.cropRatio ?? image.width / image.height;
        return <GlassButton key={image.id} accessibilityLabel={`Open photo ${index + 1}`} disabled={busy || disabled}
          style={styles.photoTile} onPress={() => setViewer(image)}>
          <View style={{ width: Math.min(112, 112 * ratio), height: Math.min(112, 112 / ratio) }}>
            <CardArtworkImage image={image} sourceUri={receiptUri(image.assetId)} cornerRadius={0} thumbnail />
          </View>
        </GlassButton>;
      })}
    </View>
    {!!onChange && (receipts.length < 4 ? <View style={styles.row}>
      <GlassButton accessibilityLabel="Take photo" disabled={busy || disabled} style={[styles.button, styles.journalButton]} onPress={() => { void appendPhotos(true); }}><Text style={[styles.text, styles.photoLabel]}>Take Photo</Text></GlassButton>
      <GlassButton accessibilityLabel="Choose photos from Gallery" disabled={busy || disabled} style={[styles.button, styles.journalButton]} onPress={() => { void appendPhotos(false); }}><Text style={[styles.text, styles.photoLabel]}>Choose from Gallery</Text></GlassButton>
    </View> : <Text accessibilityLiveRegion="polite" style={styles.text}>Maximum of 4 photos reached.</Text>)}
    {busy && <Text accessibilityLiveRegion="polite" style={styles.text}>Preparing photos…</Text>}
    {!!notice && <Text accessibilityRole="alert" style={styles.text}>{notice}</Text>}
    {viewer && <ReceiptViewer receipt={viewer} onClose={() => setViewer(null)} />}
  </View>;
  return <View style={styles.group}>
    <Text style={styles.title}>{singleImage ? 'Photo' : 'Receipts'}</Text>
    {!receipts.length && <Text style={styles.text}>{singleImage ? 'Take a photo or choose an image.' : 'No receipts attached.'}</Text>}
    {receipts.map((image, index) => <View key={`${image.id}-${image.assetId}`} style={singleImage ? styles.group : styles.attachment}>
      <GlassButton accessibilityLabel={singleImage ? 'Open photo' : `Open receipt ${index + 1}`} disabled={busy || disabled} onPress={() => setViewer(image)} style={[styles.thumbnail, singleImage && { alignSelf: 'center' }]}>
        <View style={{ width: Math.min(singleImage ? 220 : 80, (singleImage ? 220 : 150) * (image.cropRatio ?? image.width / image.height)),
          height: Math.min(singleImage ? 220 : 150, (singleImage ? 220 : 80) / (image.cropRatio ?? image.width / image.height)) }}><CardArtworkImage image={image} sourceUri={receiptUri(image.assetId)} cornerRadius={singleImage ? 0 : undefined} /></View>
      </GlassButton>
      <View style={singleImage ? styles.row : styles.tools}>
        {!singleImage && <Text style={styles.text}>Receipt {index + 1}</Text>}
        {onChange && <>
          <GlassButton accessibilityLabel={singleImage ? 'Replace photo' : `Replace receipt ${index + 1}`} disabled={busy || disabled} style={styles.button}
            onPress={() => Alert.alert('Replace receipt', 'Choose a new image. The current receipt stays until selection succeeds.', [
              { text: 'Cancel', style: 'cancel' }, { text: 'Gallery', onPress: () => { void choose(false, image.id); } },
              { text: 'Camera', onPress: () => { void choose(true, image.id); } },
            ])}><Text style={styles.text}>Replace</Text></GlassButton>
          <GlassButton accessibilityLabel={singleImage ? 'Crop photo' : `Crop receipt ${index + 1}`} disabled={busy || disabled} style={styles.button} onPress={() => editCrop(image)}><Text style={styles.text}>Crop</Text></GlassButton>
          <GlassButton accessibilityLabel={singleImage ? 'Remove photo' : `Remove receipt ${index + 1}`} disabled={busy || disabled} style={styles.button}
            onPress={() => onChange(receipts.filter(item => item.id !== image.id))}><Text style={styles.text}>Remove</Text></GlassButton>
        </>}
      </View>
    </View>)}
    {onChange && (!singleImage || !receipts.length) && <View style={styles.row}>
      <GlassButton accessibilityLabel="Take receipt photo" disabled={busy || disabled || receipts.length >= (singleImage ? 1 : 20)} style={styles.button} onPress={() => { void choose(true); }}><Text style={styles.text}>Take Photo</Text></GlassButton>
      <GlassButton accessibilityLabel="Choose receipt from Gallery" disabled={busy || disabled || receipts.length >= (singleImage ? 1 : 20)} style={styles.button} onPress={() => { void choose(false); }}><Text style={styles.text}>Choose from Gallery</Text></GlassButton>
    </View>}
    {busy && <Text accessibilityLiveRegion="polite" style={styles.text}>Preparing receipt…</Text>}
    {!!notice && <Text accessibilityRole="alert" style={styles.text}>{notice}</Text>}
    {viewer && <ReceiptViewer receipt={viewer} onClose={() => setViewer(null)} />}
    {crop && <ArtworkCrop image={crop.image} ratio={crop.ratio} sourceUri={receiptUri(crop.image.assetId)}
      onCancel={() => { setCrop(null); activity(false); }} onConfirm={image => {
        onChange?.(current.current.map(item => item.id === crop.image.id ? { ...image, id: item.id, cropRatio: crop.ratio } : item));
        setCrop(null); activity(false);
      }} />}
  </View>;
}
const styles = StyleSheet.create({
  group: { gap: 10 }, title: { fontFamily: lagoonFonts.latin, fontSize: 16, fontWeight: '700', color: lagoon.text.primary },
  text: { fontFamily: lagoonFonts.latin, fontSize: 14, lineHeight: 22, color: lagoon.text.primary },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, button: { minHeight: 48, minWidth: 48, padding: 10 },
  attachment: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
  thumbnail: { minWidth: 48, minHeight: 48, padding: 0 }, tools: { flex: 1, minWidth: 130, gap: 8 },
  photoTile: { minWidth: 48, minHeight: 124, flexBasis: '47%', flexGrow: 1, maxWidth: '50%', padding: 0 },
  journalButton: { maxWidth: '100%', flexShrink: 1 }, photoLabel: { flexShrink: 1, textAlign: 'center' },
  photoRegion: { minHeight: 220 }, photoStrip: { gap: 8, alignItems: 'flex-start' },
});
