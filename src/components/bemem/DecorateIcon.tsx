import { bemem } from '../../constants/bemem-theme';
import { AddCardIcon } from './AddCardIcon';

/** Preserve the existing control contract, size and semantic danger color. */
export function DecorateIcon({ name }: { name: 'trash' | 'rotate' }) {
  return <AddCardIcon name={name === 'trash' ? 'delete' : 'rotate'}
    color={name === 'trash' ? bemem.error : bemem.foreground} size={22} />;
}
