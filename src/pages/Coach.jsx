import CoachChatPanel from '../components/CoachChatPanel';

/* =============================================================================
 * Coach — the chat-style secondary view. The panel manages its own scenario
 * replay; this page just frames it to fill the available height.
 * ===========================================================================*/
export default function Coach() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col">
      <div className="h-[78dvh] min-h-[460px] md:h-[calc(100dvh-15rem)]">
        <CoachChatPanel className="h-full" />
      </div>
    </div>
  );
}
