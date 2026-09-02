import { useState } from 'react';
import VerdictCard from '../components/VerdictCard';
import CurrencyTabs from '../components/CurrencyTabs';
import FxTrendChart from '../components/FxTrendChart';
import ChannelComparisonTable from '../components/ChannelComparisonTable';
import { useAsync } from '../hooks/useAsync';
import {
  getRecommendation,
  getFxHistory,
  getChannels,
  getCoachMessage,
  CURRENCY_PAIRS,
  DEFAULT_PAIR,
} from '../services/api';
import { getVerdictMeta } from '../utils/verdict';

/* =============================================================================
 * Dashboard — the default landing screen.
 * Order mirrors the design: verdict → currency selector → 30-day trend →
 * a compact channel comparison that links through to the full Channels page.
 * All data flows through src/services/api.js (mock or live, transparently).
 * ===========================================================================*/
export default function Dashboard() {
  const [pair, setPair] = useState(DEFAULT_PAIR);
  const PREVIEW_AMOUNT = 500;

  const rec = useAsync(() => getRecommendation(pair), [pair]);
  const fx = useAsync(() => getFxHistory(pair, 30), [pair]);
  const channels = useAsync(() => getChannels(PREVIEW_AMOUNT, pair), [pair]);

  // The coaching one-liner depends on the verdict, so derive the scenario first.
  const scenario = rec.data ? getVerdictMeta(rec.data.verdict).scenario : 'good_time';
  const coach = useAsync(() => getCoachMessage(scenario), [scenario]);

  return (
    <div className="flex flex-col gap-stack-lg">
      <VerdictCard
        recommendation={rec.data}
        message={coach.data?.message}
        pair={pair}
        loading={rec.loading}
      />

      <CurrencyTabs value={pair} onChange={setPair} pairs={CURRENCY_PAIRS} />

      <FxTrendChart
        data={fx.data}
        pair={pair}
        loading={fx.loading}
        error={fx.error}
        onRetry={fx.reload}
      />

      <ChannelComparisonTable
        channels={channels.data}
        loading={channels.loading}
        error={channels.error}
        onRetry={channels.reload}
        limit={3}
        viewAllTo="/channels"
      />
    </div>
  );
}
