import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import StatusBadge from '../components/ui/StatusBadge';
import { useNudge } from './NudgeProvider';
import { t } from '../i18n/strings';

/* =============================================================================
 * ProactiveNudgeCard — the surface where the agent speaks FIRST.
 *
 * Two very different renderings on purpose:
 *
 *   decision === 'speak'  a proper card: what the agent noticed, the personalised
 *                         context behind it, and a way into the conversation.
 *   anything else         one quiet, grey line explaining WHY it stayed silent.
 *
 * That second state is the point of the feature. A dashboard always has something
 * to show; an agent has to earn the interruption. Rendering the silence makes the
 * decision visible (and demonstrable) instead of looking like nothing happened.
 *
 * Colour follows the same semantic status keys as VerdictCard — red/warn is only
 * ever used for a genuine fee warning, never for decoration.
 * ===========================================================================*/

/* Literal class strings only, so Tailwind can see them at build time. */
const ACCENT_BAR = {
  good: 'bg-good',
  wait: 'bg-wait',
  neutral: 'bg-neutral',
  warn: 'bg-warn',
};

const SOFT_GLOW = {
  good: 'bg-good-container',
  wait: 'bg-wait-container',
  neutral: 'bg-surface-container-high',
  warn: 'bg-warn-container',
};

const URGENCY_CHIP = {
  now: 'bg-warn-container text-on-warn-container',
  soon: 'bg-secondary-container text-on-secondary-container',
  watch: 'bg-surface-container-high text-on-surface-variant',
};

/* One icon per reason so the card reads at a glance, before any text. */
const REASON_ICON = {
  good_rate_before_transfer: 'trending_up',
  low_rate_before_transfer: 'schedule',
  usual_channel_overcharging: 'warning',
  transfer_due: 'notifications_active',
};

export default function ProactiveNudgeCard({ className = '' }) {
  const { nudge, loading, error, dismiss, restore } = useNudge();

  if (loading) return <NudgeSkeleton className={className} />;
  /* A failed agent must never break the dashboard — it simply says nothing. */
  if (error || !nudge) return null;
  if (nudge.decision !== 'speak') {
    return <QuietState nudge={nudge} onRestore={restore} className={className} />;
  }

  const status = nudge.status || 'neutral';
  const icon = REASON_ICON[nudge.reason] || 'notifications';

  return (
    <section
      className={`card card-pad relative overflow-hidden ${className}`}
      aria-label={t.nudge.cardAria}
    >
      <span
        className={`absolute left-0 top-0 h-full w-1.5 ${ACCENT_BAR[status] || ACCENT_BAR.neutral}`}
        aria-hidden="true"
      />
      <span
        className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-2xl ${
          SOFT_GLOW[status] || SOFT_GLOW.neutral
        }`}
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-4 pl-2">
        {/* Who is talking, and how urgent it is */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-2.5 py-1 font-label-sm text-label-sm text-on-secondary-container">
            <Icon name="smart_toy" className="text-[14px]" />
            {t.nudge.cardLabel}
          </span>
          <StatusBadge status={status} icon={icon} size="sm">
            {t.nudge.urgency[nudge.urgency] || t.nudge.urgency.watch}
          </StatusBadge>

          <button
            type="button"
            onClick={dismiss}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            aria-label={t.nudge.dismiss}
          >
            <Icon name="close" className="text-[14px]" />
            {t.nudge.dismiss}
          </button>
        </div>

        {/* The one thing the agent wants them to know */}
        <p className="max-w-2xl font-body-lg text-body-lg text-on-surface" aria-live="polite">
          {nudge.headline}
        </p>

        {/* Why it thinks so — the personalised evidence, as quiet chips */}
        {nudge.meta.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {nudge.meta.map((chip) => (
              <li
                key={chip}
                className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-1 font-label-sm text-label-sm font-normal text-on-surface-variant"
              >
                <Icon name="schedule" className="text-[14px]" />
                {chip}
              </li>
            ))}
          </ul>
        )}

        {/* First line of what it will say, then the way in */}
        {nudge.messages[0] && (
          <p className="max-w-2xl border-l-2 border-outline-variant/60 pl-3 font-body-md text-on-surface-variant">
            {nudge.messages[0].message}
          </p>
        )}

        <div>
          <Link
            to="/coach"
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 font-label-md text-label-md text-on-secondary transition-opacity hover:opacity-90"
          >
            {t.nudge.openCoach}
            <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------- */
/* The quiet state — silence, explained                                       */
/* ------------------------------------------------------------------------- */

function QuietState({ nudge, onRestore, className = '' }) {
  /* Only offer the undo when the silence is the agent's choice, not a fact
   * about their data (no amount of clicking creates a pattern that isn't there). */
  const canRestore = nudge.reason === 'dismissed' || nudge.reason === 'cooldown';

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-outline-variant/40 bg-surface-container-lowest/60 px-4 py-3 ${className}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
        <Icon name="visibility" className="text-[18px]" />
      </span>

      <p className="min-w-0 flex-1 font-label-md text-label-md font-normal text-on-surface-variant">
        <span className="font-semibold text-on-surface">{t.nudge.watchingLabel}.</span>{' '}
        {nudge.quietMessage}
      </p>

      {canRestore && (
        <button
          type="button"
          onClick={onRestore}
          className="shrink-0 rounded-full px-2.5 py-1 font-label-sm text-label-sm text-secondary underline-offset-2 transition-colors hover:bg-surface-container-high hover:underline"
        >
          {t.nudge.showAgain}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function NudgeSkeleton({ className = '' }) {
  return (
    <section
      className={`card card-pad relative overflow-hidden ${className}`}
      aria-busy="true"
      aria-label={t.nudge.cardAria}
    >
      <span className="absolute left-0 top-0 h-full w-1.5 animate-pulse bg-surface-container-high" />
      <div className="flex flex-col gap-4 pl-2">
        <div className="h-6 w-52 animate-pulse rounded-full bg-surface-container-high" />
        <div className="h-6 w-full max-w-xl animate-pulse rounded bg-surface-container-high" />
        <div className="flex gap-2">
          <div className="h-6 w-40 animate-pulse rounded-full bg-surface-container-high" />
          <div className="h-6 w-32 animate-pulse rounded-full bg-surface-container-high" />
        </div>
        <div className="h-9 w-40 animate-pulse rounded-full bg-surface-container-high" />
      </div>
    </section>
  );
}
