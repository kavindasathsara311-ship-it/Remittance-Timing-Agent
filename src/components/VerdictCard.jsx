import StatusBadge from './ui/StatusBadge';
import Icon from './Icon';
import { getVerdictMeta } from '../utils/verdict';
import { formatRate, formatSignedPercent, formatPercent, parsePair } from '../utils/format';
import { t } from '../i18n/strings';

/* =============================================================================
 * VerdictCard — the big "Today's Verdict" card.
 *   • coloured badge (good / wait / neutral)
 *   • one-line plain-English coaching message (from the coach-message API)
 *   • the current rate + a signed % chip
 *   • a small detail line for people who want the numbers
 * Colour semantics come from the status key; red is never used here.
 * ===========================================================================*/

const VERDICT_LABEL = {
  good: t.verdict.good,
  wait: t.verdict.wait,
  neutral: t.verdict.neutral,
};

/* Literal class strings (never built dynamically) so Tailwind can see them. */
const ACCENT_BAR = {
  good: 'bg-good',
  wait: 'bg-wait',
  neutral: 'bg-neutral',
  warn: 'bg-warn',
};
const CHIP = {
  good: 'text-good bg-good/10',
  wait: 'text-wait bg-wait/10',
  neutral: 'text-on-surface-variant bg-surface-variant',
};
const SOFT_GLOW = {
  good: 'bg-good-container',
  wait: 'bg-wait-container',
  neutral: 'bg-surface-container-high',
};

export default function VerdictCard({ recommendation, message, pair, loading = false }) {
  const { base } = parsePair(pair);

  if (loading || !recommendation) {
    return <VerdictSkeleton />;
  }

  const meta = getVerdictMeta(recommendation.verdict);
  const status = meta.status;
  const diff = recommendation.percentDiff ?? 0;

  const diffLabel =
    diff >= 0.5
      ? t.dashboard.aboveAverage(formatPercent(diff))
      : diff <= -0.5
      ? t.dashboard.belowAverage(formatPercent(diff))
      : t.dashboard.onAverage;

  // Chip colour matches the verdict badge (good/wait/neutral), not just the sign,
  // so a near-flat rate never flashes a misleading green/amber.
  const chipTone = status;

  return (
    <section className="card card-pad relative overflow-hidden">
      {/* left accent + soft corner glow keyed to the verdict */}
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

      <div className="relative flex flex-col gap-5 pl-2">
        {/* Badge row */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} icon={meta.icon} size="md">
            {VERDICT_LABEL[status] || VERDICT_LABEL.neutral}
          </StatusBadge>
          {recommendation.confidence && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-1 font-label-sm text-label-sm text-on-surface-variant">
              <Icon name="verified" className="text-[14px]" />
              {t.dashboard.confidence(recommendation.confidence)}
            </span>
          )}
        </div>

        {/* Coaching message */}
        {message && (
          <p className="max-w-2xl font-body-lg text-body-lg text-on-surface">{message}</p>
        )}

        {/* Rate + % chip */}
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-headline-lg-mobile text-headline-lg-mobile text-on-background md:font-headline-lg md:text-headline-lg">
            {t.dashboard.rateLine(base, formatRate(recommendation.currentRate))}
          </span>
          <span
            className={`rounded-lg px-2 py-0.5 font-label-md text-label-md ${CHIP[chipTone]}`}
          >
            {formatSignedPercent(diff)}
          </span>
        </div>

        {/* Detail line for the numbers-minded */}
        <p className="font-label-md text-label-md font-normal text-on-surface-variant">
          {t.dashboard.detailLine({
            current: formatRate(recommendation.currentRate),
            avg7d: formatRate(recommendation.avgRate7d),
            diffLabel,
          })}
        </p>
      </div>
    </section>
  );
}

function VerdictSkeleton() {
  return (
    <section className="card card-pad relative overflow-hidden" aria-busy="true">
      <span className="absolute left-0 top-0 h-full w-1.5 animate-pulse bg-surface-container-high" />
      <div className="flex flex-col gap-5 pl-2">
        <div className="h-7 w-48 animate-pulse rounded-full bg-surface-container-high" />
        <div className="h-6 w-full max-w-xl animate-pulse rounded bg-surface-container-high" />
        <div className="h-9 w-64 animate-pulse rounded bg-surface-container-high" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-surface-container-high" />
      </div>
    </section>
  );
}
