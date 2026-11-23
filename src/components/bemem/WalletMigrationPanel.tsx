import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useWalletRuntime } from './WalletRuntimeProvider';
import { WalletCoordinatorFailure } from '../../lib/wallet-coordinator';
import { lagoon, lagoonFonts } from '../../constants/lagoon-theme';
import { PRODUCTION_WALLET_V2_APPROVED } from '../../constants/wallet-release';

export function WalletMigrationPanel({ onClose }: { onClose: () => void }) {
  const { runtime, snapshot } = useWalletRuntime();
  const [review, setReview] = useState<Awaited<ReturnType<typeof runtime.reviewMigration>> | null>(null);
  const [consent, setConsent] = useState(false), [notice, setNotice] = useState('');
  const [working, setWorking] = useState(false);
  const operating = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const state = snapshot.state;
  const gateMatchesBundle = runtime.cutoverApproved === PRODUCTION_WALLET_V2_APPROVED;
  const busy = working || state.saving || state.phase === 'switching';
  function matches(candidate = review) {
    const latest = runtime.getSnapshot();
    return !!candidate && latest.state.phase === 'ready_v1' && latest.state.editsAllowed && !latest.state.dirty
      && candidate.generation === latest.state.generation && candidate.document.revision === latest.state.revision
      && JSON.stringify(candidate.document) === JSON.stringify(latest.session?.saved);
  }
  const reviewCurrent = matches();
  const canReview = state.phase === 'ready_v1' && state.editsAllowed && !state.dirty && !!state.revision && !busy;
  const canExecute = gateMatchesBundle && runtime.cutoverApproved && reviewCurrent && consent && !busy;
  const recovery = ['blocked', 'error', 'activation_incomplete'].includes(state.phase);
  const activated = () => {
    const latest = runtime.getSnapshot();
    return latest.state.phase === 'ready_v2' && latest.state.source === 'v2'
      && latest.state.editsAllowed && latest.session?.source === 'v2';
  };
  function close() {
    const latest = runtime.getSnapshot().state;
    if (!operating.current && !latest.saving && latest.phase !== 'switching') onClose();
  }
  function errorNotice(error: unknown) {
    if (error instanceof WalletCoordinatorFailure) {
      if (error.kind === 'pending') return 'A pending transaction needs review. No import was started. Do not delete or promote pending files.';
      if (error.kind === 'commit_uncertain') return 'The previous write outcome needs reinspection. No import was started.';
      if (error.kind === 'revision_conflict') return 'The source changed. Review again before confirming. No files were written by this review.';
    }
    return 'Review is blocked. Resolve unsaved changes or reinspect your wallet. No files were written by this review.';
  }
  async function readReview() {
    if (operating.current) return;
    setConsent(false); setReview(null);
    const latest = runtime.getSnapshot().state;
    if (!latest.editsAllowed || latest.dirty || latest.source !== 'v1' || !latest.revision) {
      setNotice('Resolve unsaved changes or wait for the current save before reviewing. No files were written.'); return;
    }
    operating.current = true; setWorking(true);
    try {
      const next = await runtime.reviewMigration();
      if (!matches(next)) throw new WalletCoordinatorFailure('revision_conflict', 'review_changed');
      if (mounted.current) { setReview(next); setNotice('Review ready. No files were written.'); }
    } catch (error) { if (mounted.current) setNotice(errorNotice(error)); }
    finally { operating.current = false; if (mounted.current) setWorking(false); }
  }
  async function execute() {
    if (operating.current) return;
    if (!gateMatchesBundle) { setNotice('The runtime release gate differs from this bundle. Cancel and fully reload Expo Go before reviewing again. No backup or import was started.'); return; }
    if (!runtime.cutoverApproved) { setNotice('Release approval is required. No backup or import was started.'); return; }
    if (!review || !consent || !matches()) {
      setReview(null); setConsent(false); setNotice('The review is no longer current. Review again before confirming.'); return;
    }
    operating.current = true; setWorking(true);
    let complete = false;
    try {
      const result = await runtime.requestCutover(review.generation, review.document);
      complete = result.ok && activated();
      if (mounted.current) setNotice(complete ? 'Backup integrity passed. Import readback passed. Wallet v2 is active. Your original Wallet v1 and backup are retained.'
        : 'Activation was not confirmed. Your files are retained. Reinspect before continuing; no automatic retry.');
    } catch { if (mounted.current) setNotice('Activation could not be confirmed. Reinspect before continuing; do not import again.'); }
    finally {
      operating.current = false;
      if (mounted.current) { setWorking(false); setConsent(false); setReview(null); }
    }
    // Keep the verified result visible until the user closes this review.
  }
  async function recover() {
    if (operating.current) return;
    const phase = runtime.getSnapshot().state.phase;
    if (!['blocked', 'error', 'activation_incomplete'].includes(phase)
      || !gateMatchesBundle || phase === 'activation_incomplete' && !runtime.cutoverApproved) return;
    operating.current = true; setWorking(true);
    let complete = false;
    try {
      const result = await (phase === 'activation_incomplete' ? runtime.commands.retryActivation() : runtime.commands.reconcile());
      complete = result.ok && activated();
      if (mounted.current) setNotice(result.ok ? complete ? 'Wallet v2 verified and activated without another import.'
        : 'Wallet v1 rechecked. Review again before importing.' : 'Wallet remains locked. Keep existing files. No automatic retry was made.');
    } catch { if (mounted.current) setNotice('Verification failed. Wallet remains protected; no import was retried.'); }
    finally {
      operating.current = false;
      if (mounted.current) { setWorking(false); setReview(null); setConsent(false); }
    }
    // Recovery verifies activation, without repeating backup or import.
  }
  const status = state.phase === 'activation_incomplete'
    ? 'Runtime activation is incomplete. Saving is locked. Verify the committed snapshot before retrying activation; do not import again.'
    : state.phase === 'switching' ? 'Switching wallet. Both writer admission and editing are locked until verification completes.'
      : state.failure?.kind === 'commit_uncertain' ? 'Commit outcome is uncertain. Reinspect before any further action; do not retry import.'
        : state.failure?.kind === 'pending' ? 'A pending transaction needs review. Writing is locked; pending files are retained.'
          : state.failure?.code === 'backup_not_verified' ? 'Backup integrity failed or could not be verified. Import was not started. Wallet v1 is unchanged; keep all files and reinspect before continuing.'
          : recovery ? 'Wallet is locked. Reinspect the saved data before continuing.'
            : state.saving ? 'A save is in progress. Wait before reviewing.'
              : state.dirty ? 'Unsaved draft. Return to Arrange and choose Save, Discard or Cancel before reviewing.'
                : state.source === 'v2' ? 'Wallet v2 is active. No further v1 import is available.'
                  : 'Wallet v1 is active. Reviewing alone does not write files.';
  return <Modal transparent animationType="slide" onRequestClose={close}>
    <View style={styles.backdrop}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close Wallet migration review" onPress={close} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={styles.sheet}><ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>Wallet v2</Text>
        <Text style={styles.text}>Your original Wallet v1 will be kept. Moving to Wallet v2 requires a verified local source copy and your explicit confirmation.</Text>
        <Text style={styles.text}>Current wallet: {state.source ?? 'Not verified'} · Revision {state.revision ?? 'Not verified'} · Saved cards {snapshot.session?.saved.cards.length ?? 'Not verified'}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.text}>{status}</Text>
        <Text accessibilityLabel="Wallet release gate status" accessibilityLiveRegion="polite" style={styles.text}>Release check: Step 8.1 · Bundle gate: {PRODUCTION_WALLET_V2_APPROVED ? 'Approved' : 'Locked'} · Runtime gate: {runtime.cutoverApproved ? 'Approved' : 'Locked'} · Consent: {consent && reviewCurrent ? 'Confirmed' : 'Required'} · Import action: {canExecute ? 'Ready' : 'Not ready'}</Text>
        <Pressable disabled={!canReview} accessibilityRole="button" accessibilityLabel="Review migration read only" style={styles.button} onPress={readReview}>
          <Text style={styles.text}>Review migration · Read only</Text></Pressable>
        {reviewCurrent && review && <>
          <Text style={styles.text}>Source: Wallet v1 · Revision {review.document.revision} · Cards {review.document.cards.length} · Pending 0 · Canvas compatible</Text>
          <Pressable disabled={busy} accessibilityRole="checkbox" accessibilityLabel="Confirm migration consent" accessibilityState={{ checked: consent }} style={styles.button}
            onPress={() => { if (!operating.current && matches()) setConsent(!consent); }}>
            <Text style={styles.text}>{consent ? '✓ ' : ''}I understand: create a verified source copy, import once, then activate Wallet v2.</Text>
          </Pressable>
        </>}
        {!!review && !reviewCurrent && <Text style={styles.text}>The wallet changed after review. Review again before confirming.</Text>}
        {!gateMatchesBundle ? <Text style={styles.text}>The runtime release gate differs from this bundle. Cancel and fully reload Expo Go before reviewing again. No backup or import was started.</Text>
          : !runtime.cutoverApproved && <Text style={styles.text}>Backup, import and activation are locked pending release approval. Reviewing this screen does not migrate data.</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel="Back up import and activate Wallet v2" accessibilityState={{ disabled: !canExecute }}
          disabled={!canExecute} style={[styles.button, !canExecute && styles.disabledButton]} onPress={execute}>
          <Text style={styles.text}>{busy ? 'Working...' : 'Back up, import and activate'}</Text></Pressable>
        {recovery && <Pressable accessibilityRole="button" accessibilityLabel={state.phase === 'activation_incomplete' ? 'Retry verified activation' : 'Reinspect wallet read only'}
          disabled={busy || !gateMatchesBundle || state.phase === 'activation_incomplete' && !runtime.cutoverApproved} style={styles.button} onPress={recover}>
          <Text style={styles.text}>{state.phase === 'activation_incomplete' ? 'Retry verified activation' : 'Reinspect wallet · No import retry'}</Text>
        </Pressable>}
        <Text accessibilityLiveRegion="polite" style={styles.text}>{notice}</Text>
        <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel="Cancel migration review" onPress={close} style={styles.button}><Text style={styles.text}>{activated() ? 'Back to Arrange' : 'Cancel'}</Text></Pressable>
      </ScrollView></View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0f172a66' },
  sheet: { backgroundColor: lagoon.canvas.base, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  content: { padding: 20, gap: 14, paddingBottom: 36 },
  title: { fontSize: 20, lineHeight: 28, fontFamily: lagoonFonts.latin, color: lagoon.text.primary, fontWeight: '800' },
  text: { fontSize: 14, lineHeight: 22, fontFamily: lagoonFonts.latin, color: lagoon.text.primary },
  button: { minHeight: 48, padding: 12, borderRadius: 12, backgroundColor: lagoon.surface.base, justifyContent: 'center' },
  disabledButton: { opacity: 0.5 },
});
