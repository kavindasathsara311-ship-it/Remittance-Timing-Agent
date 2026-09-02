import HistoryTable from '../components/HistoryTable';
import { useAsync } from '../hooks/useAsync';
import { getHistory } from '../services/api';

/* =============================================================================
 * History — optional, read-only view of simulated past remittance events.
 * HistoryTable renders its own heading, so this page is intentionally thin.
 * ===========================================================================*/
export default function History() {
  const { data, loading, error, reload } = useAsync(() => getHistory(), []);

  return (
    <div className="flex flex-col gap-stack-lg">
      <HistoryTable history={data} loading={loading} error={error} onRetry={reload} />
    </div>
  );
}
