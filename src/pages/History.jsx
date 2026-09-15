import { useState, useEffect } from 'react';
import HistoryTable from '../components/HistoryTable';
import PatternInsightCard from '../components/PatternInsightCard';
import HistoryGuideModal from '../components/HistoryGuideModal';
import AddEditHistoryModal from '../components/AddEditHistoryModal';
import { useAsync } from '../hooks/useAsync';
import {
  getHistory,
  getRecommendation,
  addHistoryRecord,
  updateHistoryRecord,
  deleteHistoryRecord,
  resetHistoryData,
  DEFAULT_PAIR,
} from '../services/api';
import { computeRemittancePatterns } from '../utils/patternRecognition';

/* =============================================================================
 * History — interactive record of past remittance events, AI pattern analysis,
 * and timing optimization. Supports logging transfers, full search/filter/sort,
 * summary metrics, and educational guidance.
 * ===========================================================================*/
export default function History() {
  const { data: history, loading, error, reload } = useAsync(() => getHistory(), []);
  const { data: recommendation } = useAsync(() => getRecommendation(DEFAULT_PAIR), []);

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Listen for custom window event in case history is modified in another view
  useEffect(() => {
    const handleUpdate = () => reload();
    window.addEventListener('remittance-history-updated', handleUpdate);
    return () => window.removeEventListener('remittance-history-updated', handleUpdate);
  }, [reload]);

  const patterns = history ? computeRemittancePatterns(history) : null;

  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEditModal = (record) => {
    setEditingRecord(record);
    setIsAddEditOpen(true);
  };

  const handleSaveRecord = async (recordData) => {
    if (recordData.id) {
      await updateHistoryRecord(recordData.id, recordData);
    } else {
      await addHistoryRecord(recordData);
    }
    reload();
  };

  const handleDeleteRecord = async (id) => {
    await deleteHistoryRecord(id);
    reload();
  };

  const handleResetData = async () => {
    await resetHistoryData();
    reload();
  };

  return (
    <div className="flex flex-col gap-stack-lg">
      {/* AI Pattern Recognition Card */}
      <PatternInsightCard
        patterns={patterns}
        recommendation={recommendation}
        history={history}
        loading={loading}
        error={error}
        onRetry={reload}
      />

      {/* Interactive History Table with Filters, Search, CSV Export & Actions */}
      <HistoryTable
        history={history}
        loading={loading}
        error={error}
        onRetry={reload}
        onEditRecord={handleOpenEditModal}
        onDeleteRecord={handleDeleteRecord}
        onAddRecord={handleOpenAddModal}
        onResetData={handleResetData}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Educational Guide Modal */}
      <HistoryGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Add / Edit Remittance Modal */}
      <AddEditHistoryModal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        onSave={handleSaveRecord}
        recordToEdit={editingRecord}
      />
    </div>
  );
}
