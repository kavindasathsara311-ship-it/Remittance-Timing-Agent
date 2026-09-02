import { useState } from 'react';
import CurrencyTabs from '../components/CurrencyTabs';
import ChannelCard from '../components/ChannelCard';
import Icon from '../components/Icon';
import { ErrorBlock, EmptyBlock } from '../components/ui/StateBlocks';
import { useAsync } from '../hooks/useAsync';
import {
  getChannels,
  getRecommendation,
  CURRENCY_PAIRS,
  DEFAULT_PAIR,
} from '../services/api';
import { formatRate, parsePair } from '../utils/format';
import { t } from '../i18n/strings';

/* =============================================================================
 * Channels — full comparison. Pick a currency + amount, then see every channel
 * best-first as rich cards (effective vs mid-market, fee, and what the family
 * actually receives). Predatory channels are flagged in calm-but-clear red.
 * ===========================================================================*/

const PRESETS = [100, 500, 1000];

export default function Channels() {
  const [pair, setPair] = useState(DEFAULT_PAIR);
  const [amount, setAmount] = useState(500);

  const channels = useAsync(() => getChannels(amount, pair), [amount, pair]);
  const rec = useAsync(() => getRecommendation(pair), [pair]);
  const { base } = parsePair(pair);
  const rows = channels.data || [];

  return (
    <div className="flex flex-col gap-stack-lg">
      {/* Page header */}
      <header className="flex flex-col gap-2">
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface md:font-headline-lg md:text-headline-lg">
          {t.channels.title}
        </h2>
        <p className="max-w-2xl font-body-md text-on-surface-variant">{t.channels.subtitle}</p>
      </header>

      {/* Controls */}
      <section className="card card-pad flex flex-col gap-5">
        <CurrencyTabs value={pair} onChange={setPair} pairs={CURRENCY_PAIRS} />

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="amount"
              className="font-label-md text-label-md text-on-surface-variant"
            >
              {t.channels.amountLabel}
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-3 py-2 focus-within:border-secondary/60">
              <span className="font-label-md text-label-md text-on-surface-variant">{base}</span>
              <input
                id="amount"
                type="number"
                min="1"
                step="50"
                value={amount}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setAmount(Number.isFinite(v) && v > 0 ? v : 0);
                }}
                className="w-32 bg-transparent font-headline-md text-[20px] text-on-surface outline-none"
              />
            </div>
            <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">
              {t.channels.amountHelp}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(p)}
                className={`rounded-full px-4 py-2 font-label-md transition-colors active:scale-95 ${
                  amount === p
                    ? 'bg-secondary text-on-secondary'
                    : 'border border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Mid-market reference */}
        {rec.data && (
          <div className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2.5">
            <Icon name="currency_exchange" className="text-[20px] text-secondary" />
            <span className="font-label-md text-label-md text-on-surface-variant">
              {t.channels.midMarket} ({base}→LKR):
            </span>
            <span className="font-label-md text-label-md font-semibold text-on-surface">
              {formatRate(rec.data.currentRate)}
            </span>
          </div>
        )}
      </section>

      {/* Grid */}
      {channels.loading && <CardGridSkeleton />}
      {!channels.loading && channels.error && (
        <div className="card">
          <ErrorBlock onRetry={channels.reload} />
        </div>
      )}
      {!channels.loading && !channels.error && rows.length === 0 && (
        <div className="card">
          <EmptyBlock icon="currency_exchange" message={t.channels.empty} />
        </div>
      )}
      {!channels.loading && !channels.error && rows.length > 0 && (
        <div className="grid grid-cols-1 gap-gutter-grid md:grid-cols-2 lg:grid-cols-3">
          {rows.map((ch, i) => (
            <ChannelCard key={ch.channel} channel={ch} amount={amount} best={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-gutter-grid md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card card-pad flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse rounded-full bg-surface-container-high" />
            <div className="h-5 w-32 animate-pulse rounded bg-surface-container-high" />
          </div>
          <div className="h-8 w-full animate-pulse rounded bg-surface-container-high" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-surface-container-high" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-surface-container-high" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-surface-container-high" />
        </div>
      ))}
    </div>
  );
}
