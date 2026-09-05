import HistoryTable from '../components/HistoryTable';
import PatternInsightCard from '../components/PatternInsightCard';
import { useAsync } from '../hooks/useAsync';
import { getHistory, getRecommendation, DEFAULT_PAIR } from '../services/api';
import { computeRemittancePatterns } from '../utils/patternRecognition';

/* =============================================================================
 * History — optional, read-only view of simulated past remittance events.
 * HistoryTable renders its own heading, so this page is intentionally thin.
 * ===========================================================================*/
export default function History() {
  const { data: history, loading, error, reload } = useAsync(() => getHistory(), []);
  const { data: recommendation } = useAsync(() => getRecommendation(DEFAULT_PAIR), []);

  const patterns = history ? computeRemittancePatterns(history) : null;

  return (
    <div className="flex flex-col gap-stack-lg">
      <PatternInsightCard patterns={patterns} recommendation={recommendation} />
      <HistoryTable history={history} loading={loading} error={error} onRetry={reload} />
    </div>
  );
}
