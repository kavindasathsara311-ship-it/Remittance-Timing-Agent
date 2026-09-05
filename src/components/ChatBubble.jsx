import Icon from './Icon';
import { toneToStatus } from '../utils/verdict';

/* =============================================================================
 * ChatBubble — a single message bubble. Supports proactive agent messages 
 * (left-aligned) and user messages (right-aligned).
 * ===========================================================================*/

const BUBBLE = {
  good: 'bg-surface-container-lowest border-outline-variant/40',
  neutral: 'bg-surface-container-lowest border-outline-variant/40',
  wait: 'bg-wait-container/50 border-wait/25',
  warn: 'bg-warn-container/40 border-warn/25',
  user: 'bg-secondary border-secondary text-on-secondary',
};
const ACCENT = {
  good: 'bg-good',
  neutral: 'bg-neutral',
  wait: 'bg-wait',
  warn: 'bg-warn',
};

export default function ChatBubble({ message, tone = 'info', showAvatar = true, time, isUser = false }) {
  const status = isUser ? 'user' : toneToStatus(tone);

  if (isUser) {
    return (
      <div className="flex max-w-[88%] items-end gap-3 self-end md:max-w-2xl">
        <div className="relative overflow-hidden rounded-2xl rounded-tr-sm border p-4 shadow-soft bg-primary border-primary text-on-primary">
          <p className="font-body-md text-on-primary">{message}</p>
          {time && (
            <span className="mt-2 block font-label-sm text-label-sm font-normal text-on-primary/80">
              {time}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-[88%] items-start gap-3 self-start md:max-w-2xl">
      {/* Avatar (or spacer to keep alignment for grouped bubbles) */}
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
          showAvatar ? 'bg-secondary-container shadow-soft' : 'opacity-0'
        }`}
      >
        {showAvatar && <Icon name="smart_toy" className="text-[20px] text-on-secondary-container" />}
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl rounded-tl-sm border p-4 shadow-soft ${
          BUBBLE[status] || BUBBLE.neutral
        }`}
      >
        <span
          className={`absolute left-0 top-0 h-full w-1 opacity-60 ${ACCENT[status] || ACCENT.neutral}`}
          aria-hidden="true"
        />
        <div className="flex items-start gap-2 pl-1.5">
          {status === 'warn' && (
            <Icon name="warning" className="mt-0.5 text-[20px] text-warn" />
          )}
          <p className="font-body-md text-on-surface">{message}</p>
        </div>
        {time && (
          <span className="mt-2 block pl-1.5 font-label-sm text-label-sm font-normal text-on-surface-variant">
            {time}
          </span>
        )}
      </div>
    </div>
  );
}

