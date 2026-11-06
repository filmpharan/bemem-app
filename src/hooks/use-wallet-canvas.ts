import { useEffect, useReducer, useRef, useState } from 'react';

import { INITIAL_LAYOUT, PREVIEW_CARDS } from '../data/wallet-preview';
import { cloneLayout, sameLayout } from '../lib/canvas-layout';
import { canvasSession, initialSession } from '../lib/canvas-session';
import { canvasStorage } from '../lib/canvas-storage';
import type { Position } from '../types/wallet-ui';

export function useWalletCanvas() {
  const [session, dispatch] = useReducer(canvasSession, INITIAL_LAYOUT, initialSession);
  const { mode, saved, draft, revision, exitPrompt } = session;
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const dirty = !sameLayout(saved, draft);

  useEffect(() => {
    let active = true;
    canvasStorage.load().then(doc => {
      if (!active) return;
      if (doc) {
        dispatch({ type: 'load', document: doc });
      }
      setReady(true);
    }).catch(() => {
      if (!active) return;
      setBlocked(true); setReady(true);
      setError('อ่านผังที่บันทึกไว้ไม่ได้ แสดงบัตรตัวอย่างเท่านั้น และปิดการบันทึกเพื่อรักษาไฟล์เดิม กรุณาปิดแล้วเปิดแอปใหม่เพื่อลองอีกครั้ง');
    });
    return () => { active = false; };
  }, []);

  function enter() {
    if (!ready || blocked || savingRef.current) return;
    dispatch({ type: 'enter' }); setError('');
  }
  function leave() {
    if (savingRef.current) return;
    dispatch({ type: 'leave' });
  }
  function discard() {
    if (savingRef.current) return;
    dispatch({ type: 'discard' }); setError('');
  }
  function move(id: string, position: Position) {
    if (blocked || savingRef.current) return;
    dispatch({ type: 'move', id, position, cards: PREVIEW_CARDS });
  }
  async function save() {
    if (!ready || mode !== 'create' || blocked || savingRef.current) return;
    savingRef.current = true; setSaving(true); setError('');
    try {
      const snapshot = cloneLayout(draft);
      const doc = await canvasStorage.save(snapshot, revision);
      dispatch({ type: 'saved', document: doc });
    } catch {
      setError('บันทึกไม่สำเร็จ ผังร่างยังอยู่ และยังไม่ยืนยันเป็นผังที่บันทึกแล้ว กรุณาลองอีกครั้งหรือเลือก Discard');
      dispatch({ type: 'saveFailed' });
    } finally {
      savingRef.current = false; setSaving(false);
    }
  }
  return {
    mode, saved, draft, ready, blocked, error, saving, dirty, exitPrompt, revision,
    enter, leave, discard, move, save,
    cancel: () => { if (!savingRef.current) dispatch({ type: 'cancel' }); },
  };
}
