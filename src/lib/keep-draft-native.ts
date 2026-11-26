import * as ImagePicker from 'expo-image-picker';
import { uuid } from 'expo';
import { keepMediaFiles } from './card-history-native';
import { selectKeepReceipt } from './receipt-picker';
import { admitKeepPicker } from '../components/bemem/keeps-lifecycle';
import { createKeepDraftSession, type KeepDraftAccess, type KeepSaveOutcome } from './keep-draft-session';
import type { KeepForm } from './keeps';

export function createNativeKeepDraft(options: {
  cardId: string; access: KeepDraftAccess;
  save: (form: KeepForm, onHistoryConfirmed: () => void) => Promise<KeepSaveOutcome>;
}) {
  return createKeepDraftSession({ ...options, now: () => new Date(), nextId: () => uuid.v4(), media: keepMediaFiles,
    acquirePicker: admitKeepPicker,
    select: (camera, active) => selectKeepReceipt(camera, { active,
      cameraPermission: async () => (await ImagePicker.requestCameraPermissionsAsync()).granted,
      pick: useCamera => {
        const config: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 1,
          base64: false, exif: false, preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible };
        return useCamera ? ImagePicker.launchCameraAsync(config) : ImagePicker.launchImageLibraryAsync(config);
      },
    }),
  });
}
