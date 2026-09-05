import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_PAIR, getChannels, getHistory, getRecommendation } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { analyseFamilyPattern } from './familyPattern';
import { composeNudge, decideNudge } from './nudgeEngine';

/* =============================================================================
 * useProactiveNudge — the data + memory layer under the nudge engine.
 *
 * It answers three questions the engine can't answer on its own:
 *   1. WHAT do we know?   fetch history -> pattern -> that corridor's rate &
 *                         channel quotes. Note the pair comes from the FAMILY'S
 *                         dominant corridor, not whatever tab the dashboard
 *                         happens to be showing: the nudge is about their money.
 *   2. Have we said it?   `delivered` (id + timestamp) drives the anti-nag
 *                         cooldown and stops the card flickering away mid-view.
 *   3. Did they wave it off? `dismissed` (id) mutes THIS nudge only, so the
 *                         agent can still speak up about something different.
 *
 * The engine stays pure; all of the side effects live here.
 * ===========================================================================*/

const DELIVERED_KEY = 'rc-nudge-delivered';
const DISMISSED_KEY = 'rc-nudge-dismissed';

/** Amount used to price the channels when the pattern gives us no typical one. */
export const FALLBACK_AMOUNT = 500;

/* ------------------------------------------------------------------------- */
/* Persistence — mirrors ThemeContext: every access wrapped, never throws.     */
/* ------------------------------------------------------------------------- */

function readDelivered() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DELIVERED_KEY) || 'null');
    return parsed && typeof parsed.id === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function writeDelivered(record) {
  try {
    localStorage.setItem(DELIVERED_KEY, JSON.stringify(record));
  } catch {
    /* private mode / quota — the nudge still works for this session */
  }
}

function readDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) || null;
  } catch {
    return null;
  }
}

function writeDismissed(id) {
  try {
    if (id) localStorage.setItem(DISMISSED_KEY, id);
    else localStorage.removeItem(DISMISSED_KEY);
  } catch {
    /* ignore */
  }
}

function clearDelivered() {
  try {
    localStorage.removeItem(DELIVERED_KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------------- */
/* Hook                                                                       */
/* ------------------------------------------------------------------------- */

export function useProactiveNudge() {
  const [delivered, setDelivered] = useState(readDelivered);
  const [dismissed, setDismissed] = useState(readDismissed);

  /* One chain: history -> pattern -> (recommendation + channels) for the pair
   * the pattern pointed at. Sequential on purpose — we can't price the right
   * corridor until we know which corridor this family actually uses. */
  const { data, loading, error, reload } = useAsync(async () => {
    const history = await getHistory();
    const pattern = analyseFamilyPattern(history);

    const pair = pattern.hasPattern && pattern.pair ? pattern.pair : DEFAULT_PAIR;
    const amount =
      pattern.hasPattern && pattern.typicalAmount > 0 ? pattern.typicalAmount : FALLBACK_AMOUNT;

    const [recommendation, channels] = await Promise.all([
      getRecommendation(pair),
      getChannels(amount, pair),
    ]);

    return { pattern, pair, amount, recommendation, channels };
  }, []);

  /* Decide + compose on every relevant change. While the data is still in
   * flight we return `null` rather than a "silent" verdict — loading is not the
   * same as having nothing to say, and the card shows a skeleton instead. */
  const nudge = useMemo(() => {
    if (!data) return null;

    const input = {
      pattern: data.pattern,
      recommendation: data.recommendation,
      channels: data.channels,
      dismissedId: dismissed,
      deliveredId: delivered?.id,
      lastNudgeAt: delivered?.at,
    };

    return composeNudge(decideNudge(input), input);
  }, [data, dismissed, delivered]);

  /* Stamp the delivery the first time a nudge actually reaches the screen.
   * Idempotent: once `delivered.id` matches, the effect does nothing, so the
   * recompute it triggers can't loop. */
  useEffect(() => {
    if (!nudge || nudge.decision !== 'speak') return;
    if (delivered?.id === nudge.id) return;

    const record = { id: nudge.id, at: new Date().toISOString() };
    setDelivered(record);
    writeDelivered(record);
  }, [nudge, delivered]);

  /** Wave this nudge away. Mutes THIS one; a different nudge can still come. */
  const dismiss = useCallback(() => {
    if (!nudge) return;
    setDismissed(nudge.id);
    writeDismissed(nudge.id);
  }, [nudge]);

  /**
   * Undo the dismissal AND the cooldown stamp, so the nudge comes straight
   * back. Primarily a demo/review aid — it lets you show the agent speaking up
   * again without clearing browser storage by hand.
   */
  const restore = useCallback(() => {
    setDismissed(null);
    writeDismissed(null);
    setDelivered(null);
    clearDelivered();
  }, []);

  /* Memoised so context consumers only re-render when something they can see
   * actually changed. Everything but nudge/loading/error derives from `data`. */
  return useMemo(
    () => ({
      nudge,
      speaking: nudge?.decision === 'speak',
      pattern: data?.pattern ?? null,
      recommendation: data?.recommendation ?? null,
      channels: data?.channels ?? null,
      pair: data?.pair ?? DEFAULT_PAIR,
      amount: data?.amount ?? FALLBACK_AMOUNT,
      loading,
      error,
      dismiss,
      restore,
      reload,
    }),
    [nudge, data, loading, error, dismiss, restore, reload]
  );
}

export default useProactiveNudge;
