import { createContext, useContext } from 'react';
import { useProactiveNudge } from './useProactiveNudge';

/* =============================================================================
 * NudgeProvider — one agent decision for the whole app.
 *
 * The dashboard card and the Coach chat both need the SAME nudge, decided once.
 * Without a shared provider each surface would fetch the history separately and
 * stamp its own delivery record, so the anti-nag cooldown would fight itself
 * (the Coach would think it had "just spoken" because the dashboard did).
 *
 * Mounted in App.jsx above <AppShell>, so every route can consume it.
 * ===========================================================================*/

const NudgeContext = createContext(null);

export function NudgeProvider({ children }) {
  const value = useProactiveNudge();
  return <NudgeContext.Provider value={value}>{children}</NudgeContext.Provider>;
}

/**
 * Consume the shared agent decision.
 * @returns {ReturnType<typeof useProactiveNudge>}
 */
export function useNudge() {
  const ctx = useContext(NudgeContext);
  if (!ctx) {
    throw new Error('useNudge() must be used inside <NudgeProvider>');
  }
  return ctx;
}

export default NudgeProvider;
