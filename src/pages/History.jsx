import HistoryTable from '../components/HistoryTable';
import PatternInsightCard from '../components/PatternInsightCard';
import { useAsync } from '../hooks/useAsync';
import { getHistory, getRecommendation, DEFAULT_PAIR } from '../services/api';
import { computeRemittancePatterns } from '../utils/patternRecognition';

/* =============================================================================
 * History — read-only view of past remittance events and AI pattern analysis.
 * ===========================================================================*/
export default function History() {
  const { data: history, loading, error, reload } = useAsync(() => getHistory(), []);
  const { data: recommendation } = useAsync(() => getRecommendation(DEFAULT_PAIR), []);

  const patterns = history ? computeRemittancePatterns(history) : null;

  return (
    <div className="flex flex-col gap-stack-lg">
      <PatternInsightCard patterns={patterns} recommendation={recommendation} history={history} loading={loading} error={error} onRetry={reload} />
      <HistoryTable history={history} loading={loading} error={error} onRetry={reload} />
    </div>
  );
}
