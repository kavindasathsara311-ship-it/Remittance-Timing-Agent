import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import StatusBadge from './ui/StatusBadge';
import { LoadingBlock, ErrorBlock, EmptyBlock } from './ui/StateBlocks';
import { formatRate } from '../utils/format';
import { t } from '../i18n/strings';
import { getChannelComparisonInsight } from '../services/aiCoach';

/* =============================================================================
 * ChannelComparisonTable — channels sorted best-first by effective rate.
 *   • effective rate (big) shown against mid-market rate so the gap is obvious
 *   • predatory channels get a red "High fees" tag with the fee %
 *   • the top fair channel gets a calm green "Best value" tag
 * Works as a card on the dashboard (limit + "view all") and full on Channels.
 * ===========================================================================*/
export default function ChannelComparisonTable({
  channels,
  loading = false,
  error = null,
  onRetry,
  limit,
  title = t.dashboard.compareChannels,
  hint = t.dashboard.compareChannelsHint,
  viewAllTo,
  className = '',
  sendAmount = 500, // Passed down from parent based on history
}) {
  const rows = Array.isArray(channels) ? channels : [];
  const shown = limit ? rows.slice(0, limit) : rows;

  const [aiInsight, setAiInsight] = useState(null);
  const [isInsightLoading, setIsInsightLoading] = useState(false);

  useEffect(() => {
    if (channels && channels.length > 0) {
      setIsInsightLoading(true);
      let isCancelled = false;
      getChannelComparisonInsight(sendAmount, channels).then(insight => {
        if (!isCancelled) {
          setAiInsight(insight);
          setIsInsightLoading(false);
        }
      });
      return () => { isCancelled = true; };
    }
  }, [channels, sendAmount]);

  return (
    <section className={`card card-pad ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
          {hint && (
            <p className="mt-0.5 font-label-md text-label-md font-normal text-on-surface-variant">
              {hint}
            </p>
          )}
        </div>
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-1 font-label-sm text-label-sm text-on-surface-variant sm:inline-flex">
          <Icon name="swap_vert" className="text-[14px]" />
          {t.channels.sortHint}
        </span>
      </div>

      {(isInsightLoading || aiInsight) && (
        <div className="mb-4 rounded-lg bg-surface-variant p-4 text-on-surface-variant font-body-md">
          {isInsightLoading ? "Comparing channel fees and margins..." : aiInsight}
        </div>
      )}

      {loading && <LoadingBlock />}
      {!loading && error && <ErrorBlock onRetry={onRetry} />}
      {!loading && !error && shown.length === 0 && (
        <EmptyBlock icon="currency_exchange" message={t.channels.empty} />
      )}

      {!loading && !error && shown.length > 0 && (
        <>
          {/* Column labels (desktop) */}
          <div className="mb-1 hidden items-center justify-between px-4 font-label-sm text-label-sm text-on-surface-variant md:flex">
            <span>{t.channels.channel || 'Channel'}</span>
            <span className="text-right">{t.channels.effectiveRate}</span>
          </div>

          <ul className="flex flex-col gap-2.5">
            {shown.map((ch, i) => (
              <ChannelRow key={ch.channel} channel={ch} rank={i} />
            ))}
          </ul>

          {viewAllTo && (
            <Link
              to={viewAllTo}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-secondary py-3.5 font-label-md text-on-secondary transition-opacity hover:opacity-90 active:scale-[0.99]"
            >
              {t.dashboard.viewAllChannels}
              <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          )}
        </>
      )}
    </section>
  );
}

function ChannelRow({ channel, rank }) {
  const {
    channel: name,
    icon = 'payments',
    effectiveRate,
    midMarketRate,
    feePercent,
    flagged,
    gapFromMid,
  } = channel;

  const isBest = rank === 0 && !flagged;

  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors ${
        flagged
          ? 'border-warn/30 bg-warn-container/25'
          : 'border-outline-variant/40 hover:bg-surface-variant/40'
      }`}
    >
      {/* Left: identity + mid-market + fee */}
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            flagged
              ? 'bg-warn-container text-on-warn-container'
              : 'bg-surface-variant text-secondary'
          }`}
        >
          <Icon name={icon} className="text-[22px]" />
        </span>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate font-label-md text-[15px] text-on-surface">{name}</span>
            {isBest && (
              <StatusBadge status="good" icon="workspace_premium" size="sm">
                {t.channels.best}
              </StatusBadge>
            )}
            {flagged && (
              <StatusBadge status="warn" icon="warning" size="sm">
                {`${t.channels.highFees} · ${formatRate(feePercent, 1)}%`}
              </StatusBadge>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2 font-label-sm text-label-sm font-normal text-on-surface-variant">
            <span>
              {t.channels.midMarket}: {formatRate(midMarketRate)}
            </span>
            <span aria-hidden="true">·</span>
            <span className={flagged ? 'text-warn' : ''}>
              {t.channels.fee}: {formatRate(feePercent, 1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Right: effective rate + gap */}
      <div className="shrink-0 text-right">
        <div className="font-headline-md text-[20px] font-semibold text-on-surface">
          {formatRate(effectiveRate)}
          <span className="ml-1 font-label-sm text-label-sm font-normal text-on-surface-variant">
            LKR
          </span>
        </div>
        <div className="mt-0.5 font-label-sm text-label-sm font-normal text-on-surface-variant">
          {gapFromMid != null && gapFromMid > 0
            ? `−${formatRate(gapFromMid)} ${t.channels.gap.toLowerCase()}`
            : t.channels.effectiveRate}
        </div>
      </div>
    </li>
  );
}
