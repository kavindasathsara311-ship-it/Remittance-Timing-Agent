import HistoryTable from '../components/HistoryTable';
import PatternInsightCard from '../components/PatternInsightCard';
import { useAsync } from '../hooks/useAsync';
import { getHistory } from '../services/api';

/* =============================================================================
 * History — read-only view of past remittance events and AI pattern analysis.
 * ===========================================================================*/
export default function History() {
  const { data, loading, error, reload } = useAsync(() => getHistory(), []);

  return (
    <div className="flex flex-col gap-stack-lg">
      <PatternInsightCard history={data} loading={loading} error={error} onRetry={reload} />
      <HistoryTable history={data} loading={loading} error={error} onRetry={reload} />
    </div>
  );
}

