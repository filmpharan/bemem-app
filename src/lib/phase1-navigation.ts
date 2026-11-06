type Mode = 'home' | 'create';

export function primaryHeaderAction(mode: Mode) {
  return mode === 'create' ? 'open-pro' : 'enter-create';
}

// Overlay dismissal never enters/leaves the Canvas session or writes its layout.
export function backAction({ mode, proOpen, searchOpen, blocked }: {
  mode: Mode; proOpen: boolean; searchOpen: boolean; blocked: boolean;
}) {
  if (blocked) return 'blocked';
  if (proOpen) return 'close-pro';
  if (searchOpen) return 'close-search';
  return mode === 'create' ? 'leave-create' : 'system-back';
}
