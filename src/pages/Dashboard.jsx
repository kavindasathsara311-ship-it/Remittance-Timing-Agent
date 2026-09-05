import { useState, useEffect } from 'react';
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
  getHistory,
  CURRENCY_PAIRS,
  DEFAULT_PAIR,
} from '../services/api';
import { getDynamicTrendInterpretation } from '../services/aiCoach';
import { getVerdictMeta } from '../utils/verdict';
import { computeRemittancePatterns } from '../utils/patternRecognition';

/* =============================================================================
 * Dashboard — the default landing screen.
 * Order mirrors the design: verdict → currency selector → 30-day trend →
 * a compact channel comparison that links through to the full Channels page.
 * All data flows through src/services/api.js (mock or live, transparently).
 * ===========================================================================*/
export default function Dashboard() {
  const [pair, setPair] = useState(DEFAULT_PAIR);
  const [aiTrendText, setAiTrendText] = useState("Analyzing trend...");
  
  // Fetch history to get the user's personal avgAmount for comparisons
  const { data: historyData } = useAsync(() => getHistory(), []);
  const patterns = historyData ? computeRemittancePatterns(historyData) : null;
  const avgAmount = patterns?.avgAmount || 500;

  const rec = useAsync(() => getRecommendation(pair), [pair]);
  const fx = useAsync(() => getFxHistory(pair, 30), [pair]);
  // Re-fetch channels if pair or user's avgAmount changes
  const channels = useAsync(() => getChannels(avgAmount, pair), [avgAmount, pair]);

  // The coaching one-liner depends on the verdict, so derive the scenario first.
  const scenario = rec.data ? getVerdictMeta(rec.data.verdict).scenario : 'good_time';
  const coach = useAsync(() => getCoachMessage(scenario), [scenario]);

  useEffect(() => {
    if (fx.data && rec.data) {
      setAiTrendText("Analyzing trend...");
      let isCancelled = false;
      
      getDynamicTrendInterpretation(fx.data, rec.data.currentRate).then(result => {
        if (!isCancelled) {
          setAiTrendText(result); // If API fails, it returns null, causing fallback to static
        }
      });
      
      return () => {
        isCancelled = true;
      };
    }
  }, [fx.data, rec.data, pair]);

  return (
    <div className="flex flex-col gap-stack-lg">
      <VerdictCard
        recommendation={rec.data}
        message={aiTrendText || coach.data?.message}
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
        sendAmount={avgAmount}
      />
    </div>
  );
}
