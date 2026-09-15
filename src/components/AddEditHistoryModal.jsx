import { useState, useEffect } from 'react';
import Icon from './Icon';
import { formatMoney, formatRate } from '../utils/format';
import { t } from '../i18n/strings';

const CURRENCY_COUNTRY_MAP = {
  USD: 'United States',
  SAR: 'Saudi Arabia',
  AED: 'United Arab Emirates',
  GBP: 'United Kingdom',
};

const CHANNELS_LIST = [
  'Wise',
  'Instarem',
  'Remitly',
  'WorldRemit',
  'Bank of Ceylon',
  "People's Bank",
  'Sampath Bank',
  'HNB',
  'Western Union',
  'Commercial Bank',
  'Other',
];

export default function AddEditHistoryModal({ isOpen, onClose, onSave, recordToEdit = null }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState('USD');
  const [senderCountry, setSenderCountry] = useState('United States');
  const [channel, setChannel] = useState('Wise');
  const [amount, setAmount] = useState('500');
  const [rate, setRate] = useState('302.50');
  const [status, setStatus] = useState('Completed');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (recordToEdit) {
      setDate(recordToEdit.date || new Date().toISOString().slice(0, 10));
      setCurrency(recordToEdit.currency || 'USD');
      setSenderCountry(recordToEdit.senderCountry || CURRENCY_COUNTRY_MAP[recordToEdit.currency] || 'United States');
      setChannel(recordToEdit.channel || 'Wise');
      setAmount(String(recordToEdit.amount || 500));
      setRate(String(recordToEdit.rate || 300));
      setStatus(recordToEdit.status || 'Completed');
      setErrorMsg('');
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setCurrency('USD');
      setSenderCountry('United States');
      setChannel('Wise');
      setAmount('500');
      setRate('302.50');
      setStatus('Completed');
      setErrorMsg('');
    }
  }, [recordToEdit, isOpen]);

  if (!isOpen) return null;

  const handleCurrencyChange = (newCurr) => {
    setCurrency(newCurr);
    if (CURRENCY_COUNTRY_MAP[newCurr]) {
      setSenderCountry(CURRENCY_COUNTRY_MAP[newCurr]);
    }
  };

  const numAmount = Number(amount) || 0;
  const numRate = Number(rate) || 0;
  const calculatedReceived = Math.round(numAmount * numRate * 100) / 100;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date || numAmount <= 0 || numRate <= 0 || !senderCountry || !channel) {
      setErrorMsg(t.history.form.validationError);
      return;
    }
    setErrorMsg('');
    onSave({
      id: recordToEdit?.id,
      date,
      currency,
      senderCountry,
      channel,
      amount: numAmount,
      rate: numRate,
      received: calculatedReceived,
      status,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/40 p-4 backdrop-blur-sm animate-fade-in">
      <div
        className="card card-pad max-w-lg w-full max-h-[90vh] overflow-y-auto border border-outline-variant shadow-elevated"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/40 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
              <Icon name={recordToEdit ? 'edit' : 'add_circle'} className="text-[20px]" />
            </span>
            <h2 id="modal-title" className="font-headline-md text-headline-md text-on-surface">
              {recordToEdit ? t.history.form.editTitle : t.history.form.addTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors"
            aria-label={t.common.close}
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-lg bg-error-container p-3 text-on-error-container font-label-md text-label-md flex items-center gap-2">
            <Icon name="error" className="text-[18px]" />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {/* Date & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                {t.history.form.dateLabel}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-2 font-body-md text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                {t.history.form.statusLabel}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-2 font-body-md text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Currency & Sender Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                {t.history.form.currencyLabel}
              </label>
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-2 font-body-md text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="USD">USD ($)</option>
                <option value="SAR">SAR (ر.س)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                {t.history.form.countryLabel}
              </label>
              <input
                type="text"
                required
                value={senderCountry}
                onChange={(e) => setSenderCountry(e.target.value)}
                className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-2 font-body-md text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Amount & Channel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                {t.history.form.amountLabel} ({currency})
              </label>
              <input
                type="number"
                step="any"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
                className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-2 font-body-md text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                {t.history.form.channelLabel}
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-2 font-body-md text-on-surface focus:border-primary focus:outline-none"
              >
                {CHANNELS_LIST.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rate & Live Calculated Received Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                {t.history.form.rateLabel}
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="302.50"
                className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-2 font-body-md text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">
                {t.history.form.receivedLabel}
              </label>
              <div className="rounded-lg bg-good-container/40 p-2.5 border border-good-container font-label-lg text-good font-semibold">
                {formatMoney(calculatedReceived)} LKR
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/40">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2 font-label-md text-label-md text-on-surface-variant hover:bg-surface-variant transition-colors"
            >
              {t.history.form.cancel}
            </button>
            <button
              type="submit"
              className="rounded-full bg-primary px-6 py-2 font-label-md text-label-md font-medium text-on-primary hover:bg-primary/90 transition-colors shadow-soft"
            >
              {t.history.form.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
