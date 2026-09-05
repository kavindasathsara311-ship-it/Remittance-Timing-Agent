import CoachChatPanel from '../components/CoachChatPanel';
import { useNudge } from '../agent/NudgeProvider';

/* =============================================================================
 * Coach — the chat-style secondary view.
 *
 * This is where the agent's proactive opening lands: if it decided to speak up,
 * the conversation starts with ITS message (derived from this family's pattern +
 * today's rate) before any scripted scenario plays. If it decided to stay quiet,
 * the panel behaves exactly as it always did.
 * ===========================================================================*/
export default function Coach() {
  const { nudge, loading } = useNudge();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col">
      <div className="h-[78dvh] min-h-[460px] md:h-[calc(100dvh-15rem)]">
        <CoachChatPanel className="h-full" proactiveNudge={nudge} nudgeLoading={loading} />
      </div>
    </div>
  );
}
