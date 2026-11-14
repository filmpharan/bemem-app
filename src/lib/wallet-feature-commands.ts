import type { createPreparedWalletRuntime } from './wallet-cutover-runtime';
import type { CardFormValues } from './card-form';
import { withoutObsoleteBrands, withoutObsoleteCardBrand, type CardPresentationDraft } from './card-presentation';
import { adaptCardForm } from './card-form-adapter';
import { prepareProductionCardDraft } from './wallet-production-policy';
import { WalletCoordinatorFailure } from './wallet-coordinator';
import { membershipEditValues, prepareMembershipEdit, type MembershipEditValues } from './membership-card-edit';
import type { MembershipCard } from '../types/membership-card';
import { membershipResizePlan, prepareFullMembershipEdit, type CardEditorState } from './card-editor-state';
import type { Position } from '../types/wallet-ui';
import { WalletValidationError } from './wallet-validation';
import type { CardHistoryDeletePolicy, DeleteHistoryReview } from './card-history-deletion';
import { forgetCanvasItem } from './canvas-pages';
import { prepareFolderAwareCardDeletion } from './group-folder';

export type MembershipEditSession = { token: string; values: MembershipEditValues };

/** Form command capabilities only. All wallet state remains in the supplied owner. */
export function createWalletFeatureCommands(owner: ReturnType<typeof createPreparedWalletRuntime>, historyPolicy?: CardHistoryDeletePolicy) {
  let sequence = 0;
  const prefix = `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const pending = new Map<string, {generation:number;pageEpoch:number}>();
  const edits = new Map<string, { generation: number; revision: number; card: MembershipCard; attempted: boolean;pageEpoch:number }>();
  const deletions = new Map<string, { generation: number; revision: number; card: MembershipCard; attempted: boolean; review?: DeleteHistoryReview;pageEpoch:number }>();
  const epoch=()=>owner.pages?.generation()??0;
  const editable=(id?:string)=>id?(owner.pages?.canEditCard(id)??true):(owner.pages?.access().find(p=>p.page===owner.pages.current())?.editable??true);
  const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  return {
    deleteReviewRequired: !!historyPolicy,
    async reviewDelete(token: string) {
      const deletion = deletions.get(token);
      if (!deletion || deletion.attempted) throw Error('This deletion session has ended.');
      if (!historyPolicy) return { token, records: 0, receipts: 0 };
      const review = await historyPolicy.review(deletion.card);
      if (deletions.get(token) !== deletion || deletion.attempted) { historyPolicy.cancel(review); throw Error('Deletion review was cancelled.'); }
      deletion.review = review; return review;
    },
    begin() {
      const state = owner.getSnapshot(), existing = state.session?.draft.cards ?? [];
      let id: string;
      do { id = `${prefix}-${++sequence}`; } while (existing.some(card => card.id === id));
      pending.set(id, {generation:state.state.generation,pageEpoch:epoch()}); return id;
    },
    cancel(id: string) { pending.delete(id); },
    cancelEdit(token: string) { edits.delete(token); },
    cancelDelete(token: string) {
      const deletion = deletions.get(token);
      if (deletion?.review) historyPolicy?.cancel(deletion.review);
      deletions.delete(token);
    },
    openDelete(cardId: string) {
      if(!editable(cardId))return {ok:false as const,message:'This canvas is read-only.'};
      const current = owner.getSnapshot(), card = current.session?.saved.cards.find(item => item.id === cardId);
      if (current.state.source !== 'v2' || !current.state.editsAllowed || !current.session) return { ok: false as const, message: 'Deleting requires an active, unlocked Wallet v2.' };
      if (current.state.dirty) return { ok: false as const, message: 'Save or discard your canvas changes before deleting a saved card. Cancel to keep your draft.' };
      if (!card || card.kind !== 'membership') return { ok: false as const, message: 'Only saved membership cards can be deleted. Demo cards cannot be deleted.' };
      const token = `delete-${prefix}-${++sequence}`;
      deletions.set(token, { generation: current.state.generation, revision: current.session.revision,
        card: JSON.parse(JSON.stringify(card)) as MembershipCard, attempted: false,pageEpoch:epoch() });
      return { ok: true as const, session: { token, name: card.name } };
    },
    async confirmDelete(token: string) {
      const deletion = deletions.get(token), current = owner.getSnapshot();
      const fail = (message: string, requiresReinspection = false) => ({ ok: false as const, message, requiresReinspection });
      if (!deletion || deletion.attempted||deletion.pageEpoch!==epoch()||!editable(deletion.card.id)) return fail('This deletion session has ended. Check wallet status before trying again.');
      if (historyPolicy && !deletion.review) return fail('Review current history and receipts before confirming deletion.');
      if (current.state.source !== 'v2' || !current.state.editsAllowed || !current.session || current.state.dirty
        || current.state.generation !== deletion.generation || current.session.revision !== deletion.revision
        || !equal(current.session.saved.cards.find(card => card.id === deletion.card.id), deletion.card)) {
        deletions.delete(token);
        return fail('The wallet changed or has unsaved changes. Close this detail, check the wallet, then review deletion again.');
      }
      let deletionDraft;
      try{deletionDraft=prepareFolderAwareCardDeletion(current.session.saved as Parameters<typeof prepareFolderAwareCardDeletion>[0],deletion.card.id);}
      catch{return fail('More canvas space is required to return the remaining card. Ungroup first. Nothing was deleted.');}
      deletion.attempted = true; // Close double-submit admission before any await or draft change.
      const writeCard = async () => {
      const observed = owner.getSnapshot();
      if (observed.state.generation !== deletion.generation || observed.session?.revision !== deletion.revision
        || !observed.state.editsAllowed || observed.state.dirty || observed.state.saving) return fail('Wallet changed during deletion preparation. Reinspect before continuing.', true);
      const draft = deletionDraft;
      // Clone assignment metadata before removing the selected ID; unrelated pages stay untouched.
      if(draft.canvas.pages)draft.canvas.pages={...draft.canvas.pages,assignments:{...draft.canvas.pages.assignments}};
      forgetCanvasItem(draft,deletion.card.id);
      const admitted = owner.commands.updateDraft(deletion.generation, draft);
      if (!admitted.ok) return fail('Deletion was not admitted. Close and check wallet status.', true);
      try {
        const result = await owner.commands.save(deletion.generation), latest = owner.getSnapshot();
        if (!result.ok || latest.state.source !== 'v2' || latest.state.phase !== 'ready_v2'
          || latest.session?.revision !== deletion.revision + 1
          || !equal(latest.session.saved.cards, draft.cards) || !equal(latest.session.saved.canvas, draft.canvas)) {
          return fail('Deletion was not confirmed. Close and use Reinspect wallet before continuing. No automatic retry was made.', true);
        }
        deletions.delete(token); return { ok: true as const };
      } catch { return fail('Deletion was not confirmed. Close and use Reinspect wallet before continuing. No automatic retry was made.', true); }
      };
      return historyPolicy ? historyPolicy.execute(deletion.review!, deletion.card, writeCard) : writeCard();
    },
    openEdit(cardId: string) {
      if(!editable(cardId))return {ok:false as const,message:'This canvas is read-only.'};
      const current = owner.getSnapshot(), card = current.session?.saved.cards.find(item => item.id === cardId);
      if (current.state.source !== 'v2' || !current.state.editsAllowed || !current.session) return { ok: false as const, message: 'Editing requires an active, unlocked Wallet v2.' };
      if (current.state.dirty) return { ok: false as const, message: 'Save or discard your canvas changes before editing a saved card.' };
      if (!card || card.kind !== 'membership') return { ok: false as const, message: 'Only saved membership cards can be edited. Demo cards are unchanged.' };
      const token = `edit-${prefix}-${++sequence}`;
      edits.set(token, { generation: current.state.generation, revision: current.session.revision,
        card: JSON.parse(JSON.stringify(card)) as MembershipCard, attempted: false,pageEpoch:epoch() });
      return { ok: true as const, session: { token, values: membershipEditValues(card) } satisfies MembershipEditSession };
    },
    reviewEdit(token: string, form: CardEditorState) {
      const edit = edits.get(token), current = owner.getSnapshot();
      if (!edit || edit.pageEpoch!==epoch()||!editable(edit.card.id)||edit.attempted || current.state.source !== 'v2' || !current.state.editsAllowed || current.state.dirty || !current.session
        || current.state.generation !== edit.generation || current.session.revision !== edit.revision) return { ok: false as const, message: 'The wallet changed. Close and reopen Edit Card.' };
      try {
        const prepared = prepareFullMembershipEdit(edit.card, form, new Date().toISOString());
        return { ok: true as const, ...membershipResizePlan(current.session.saved as Parameters<typeof membershipResizePlan>[0], prepared.card) };
      } catch (error) { return { ok: false as const, message: error instanceof WalletValidationError && error.code === 'unsupported_code128_payload'
        ? 'Code 128 supports printable ASCII only. Choose QR Code or change the code value. Nothing was saved.'
        : 'Check card fields and code compatibility. The selected size must fit in the canvas.' }; }
    },
    async saveEdit(token: string, values: MembershipEditValues, full?: CardEditorState & { acceptedPosition?: Position }) {
      const edit = edits.get(token), current = owner.getSnapshot();
      const fail = (message: string, requiresReinspection = false) => ({ ok: false as const, errors: {}, message, requiresReinspection });
      if (!edit || edit.pageEpoch!==epoch()||!editable(edit.card.id)||edit.attempted) return fail('This edit session has ended. Reopen the card after checking wallet status.');
      let prepared: ReturnType<typeof prepareMembershipEdit>;
      try { prepared = full ? prepareFullMembershipEdit(edit.card, full, new Date().toISOString()) : prepareMembershipEdit(edit.card, values, new Date().toISOString()); }
      catch { return fail('Check card fields, code compatibility and appearance. Nothing was saved.'); }
      if (!prepared.ok) return { ...prepared, message: 'Check the highlighted fields.', requiresReinspection: false };
      const cleaned = withoutObsoleteCardBrand(prepared.card);
      prepared = { ...prepared, card: cleaned, changed: prepared.changed || !equal(cleaned, edit.card) };
      if (current.state.source !== 'v2' || !current.state.editsAllowed || !current.session || current.state.dirty
        || current.state.generation !== edit.generation || current.session.revision !== edit.revision
        || !equal(current.session.saved.cards.find(card => card.id === edit.card.id), edit.card)) {
        return fail('The wallet changed or has unsaved changes. Close this form, check the wallet, then reopen Edit Card.');
      }
      if (!prepared.changed) { edits.delete(token); return { ok: true as const, card: edit.card }; }
      let position = current.session.saved.canvas.layout[edit.card.id];
      if (full) {
        try {
          const plan = membershipResizePlan(current.session.saved as Parameters<typeof membershipResizePlan>[0], prepared.card);
          if (plan.moved && !equal(plan.position, full.acceptedPosition)) return fail('This size needs a new position. Review and accept the suggested position before saving.');
          position = plan.position;
        } catch { return fail('There is no space for this size. No cards were moved.'); }
      }
      edit.attempted = true; // Synchronous double-submit barrier before any update or await.
      const draft = withoutObsoleteBrands({ ...current.session.saved, cards: current.session.saved.cards.map(card => card.id === edit.card.id ? prepared.card : card),
        canvas: { ...current.session.saved.canvas, layout: { ...current.session.saved.canvas.layout, [edit.card.id]: position } } },owner.pages?.current()??1);
      const admitted = owner.commands.updateDraft(edit.generation, draft);
      if (!admitted.ok) return fail('Editing was not admitted. No save was started. Close and check wallet status.', true);
      try {
        const result = await owner.commands.save(edit.generation), latest = owner.getSnapshot();
        const written = latest.session?.saved.cards.find(card => card.id === edit.card.id);
        if (!result.ok || latest.state.source !== 'v2' || latest.state.phase !== 'ready_v2'
          || latest.session?.revision !== edit.revision + 1 || !equal(written, prepared.card)
          || !equal(latest.session.saved.canvas, draft.canvas)
          || !equal(latest.session.saved.cards.filter(card => card.id !== edit.card.id), withoutObsoleteBrands(current.session.saved as Parameters<typeof withoutObsoleteBrands>[0],owner.pages?.current()??1).cards.filter(card => card.id !== edit.card.id))) {
          return fail('Save was not confirmed. Your input is retained. Close and use Reinspect wallet before editing again. No automatic retry was made.', true);
        }
        edits.delete(token); return { ok: true as const, card: prepared.card };
      } catch { return fail('Save was not confirmed. Your input is retained. Close and check wallet status before editing again.', true); }
    },
    add(id: string, values: CardFormValues, presentation: CardPresentationDraft) {
      const current = owner.getSnapshot(), time = new Date().toISOString();
      const adapted = adaptCardForm(values, presentation, { id, createdAt: time, updatedAt: time });
      if (!adapted.ok) return adapted;
      if (pending.get(id)?.generation !== current.state.generation||pending.get(id)?.pageEpoch!==epoch()||!editable() || !current.state.editsAllowed || !current.session) {
        return { ok: false as const, errors: {}, message: 'This form session is no longer active. Close and reopen Add Card.' };
      }
      if (current.state.source !== 'v2') return { ok: false as const, errors: {}, message: 'Adding membership cards is waiting for Wallet v2 activation. Nothing has been saved.' };
      try {
        const draft = withoutObsoleteBrands(prepareProductionCardDraft(current.session.draft, adapted.card,owner.pages?.current()??1),owner.pages?.current()??1);
        const result = owner.commands.updateDraft(current.state.generation, draft);
        if (!result.ok) return { ok: false as const, errors: {}, message: 'The wallet is locked. Your card has not been added.' };
        pending.delete(id); return { ok: true as const, card: adapted.card };
      } catch (error) {
        return { ok: false as const, errors: {}, message: error instanceof WalletCoordinatorFailure && error.reason === 'canvas_capacity_reached'
          ? 'Your canvas is full. No cards were moved or removed.' : 'Unable to add this card. Check the fields and try again.' };
      }
    },
  };
}
