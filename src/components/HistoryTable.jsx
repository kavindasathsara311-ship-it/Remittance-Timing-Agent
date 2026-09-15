import { useState, useMemo } from 'react';
import Icon from './Icon';
import { LoadingBlock, ErrorBlock, EmptyBlock } from './ui/StateBlocks';
import { formatDateFull, formatMoney, formatRate } from '../utils/format';
import { t } from '../i18n/strings';

export default function HistoryTable({
  history,
  loading = false,
  error = null,
  onRetry,
  onEditRecord,
  onDeleteRecord,
  onAddRecord,
  onResetData,
  onOpenGuide,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('dateDesc');

  const rawRows = Array.isArray(history) ? history : [];

  // Extract unique channels for filter dropdown
  const uniqueChannels = useMemo(() => {
    const set = new Set();
    rawRows.forEach((r) => {
      if (r.channel) set.add(r.channel);
    });
    return Array.from(set).sort();
  }, [rawRows]);

  // Filter & sort rows
  const filteredRows = useMemo(() => {
    return rawRows
      .filter((r) => {
        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCountry = r.senderCountry?.toLowerCase().includes(q);
          const matchChannel = r.channel?.toLowerCase().includes(q);
          const matchStatus = r.status?.toLowerCase().includes(q);
          const matchCurrency = r.currency?.toLowerCase().includes(q);
          if (!matchCountry && !matchChannel && !matchStatus && !matchCurrency) {
            return false;
          }
        }
        // Currency filter
        if (currencyFilter !== 'ALL' && r.currency !== currencyFilter) {
          return false;
        }
        // Channel filter
        if (channelFilter !== 'ALL' && r.channel !== channelFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'dateDesc') {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        if (sortBy === 'dateAsc') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (sortBy === 'amountDesc') {
          return (Number(b.amount) || 0) - (Number(a.amount) || 0);
        }
        if (sortBy === 'receivedDesc') {
          return (Number(b.received) || 0) - (Number(a.received) || 0);
        }
        if (sortBy === 'rateDesc') {
          return (Number(b.rate) || 0) - (Number(a.rate) || 0);
        }
        return 0;
      });
  }, [rawRows, searchQuery, currencyFilter, channelFilter, sortBy]);

  // Export to CSV helper
  const handleExportCSV = () => {
    if (filteredRows.length === 0) return;
    const headers = ['ID', 'Date', 'Sender Country', 'Amount', 'Currency', 'Channel', 'Exchange Rate (LKR)', 'Family Received (LKR)', 'Status'];
    const csvLines = [headers.join(',')];

    filteredRows.forEach((r) => {
      const line = [
        `"${r.id}"`,
        `"${r.date}"`,
        `"${r.senderCountry || ''}"`,
        r.amount,
        `"${r.currency || 'USD'}"`,
        `"${r.channel || ''}"`,
        r.rate,
        r.received,
        `"${r.status || 'Completed'}"`,
      ].join(',');
      csvLines.push(line);
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `remittance_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setCurrencyFilter('ALL');
    setChannelFilter('ALL');
    setSortBy('dateDesc');
  };

  const hasActiveFilters = searchQuery !== '' || currencyFilter !== 'ALL' || channelFilter !== 'ALL';

  return (
    <section className="card card-pad">
      {/* Header & Main Actions */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">{t.history.title}</h2>
          <p className="mt-0.5 font-label-md text-label-md font-normal text-on-surface-variant">
            {t.history.subtitle}
          </p>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface px-3 py-1.5 font-label-md text-label-md text-on-surface hover:bg-surface-variant transition-colors"
              title={t.history.howItWorks}
            >
              <Icon name="help" className="text-[18px] text-primary" />
              <span>{t.history.howItWorks}</span>
            </button>
          )}

          {onAddRecord && (
            <button
              onClick={onAddRecord}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 font-label-md text-label-md font-medium text-on-primary hover:bg-primary/90 transition-colors shadow-soft"
            >
              <Icon name="add" className="text-[18px]" />
              <span>{t.history.logTransfer}</span>
            </button>
          )}

          {rawRows.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface px-3 py-1.5 font-label-md text-label-md text-on-surface hover:bg-surface-variant transition-colors"
              title={t.history.exportCsv}
            >
              <Icon name="download" className="text-[18px] text-secondary" />
              <span className="hidden md:inline">{t.history.exportCsv}</span>
            </button>
          )}

          {onResetData && (
            <button
              onClick={onResetData}
              className="inline-flex items-center gap-1 rounded-full border border-outline-variant/40 bg-surface px-2.5 py-1.5 font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-variant transition-colors"
              title={t.history.resetData}
            >
              <Icon name="refresh" className="text-[16px]" />
              <span className="hidden lg:inline">{t.history.resetData}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      {rawRows.length > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search Box */}
          <div className="relative">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.history.searchPlaceholder}
              className="w-full rounded-lg border border-outline-variant/50 bg-surface pl-9 pr-8 py-1.5 font-body-sm text-body-sm text-on-surface focus:border-primary focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <Icon name="close" className="text-[16px]" />
              </button>
            )}
          </div>

          {/* Currency Filter */}
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="rounded-lg border border-outline-variant/50 bg-surface px-3 py-1.5 font-body-sm text-body-sm text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="ALL">{t.history.allCurrencies}</option>
            <option value="USD">USD ($)</option>
            <option value="SAR">SAR (ر.س)</option>
            <option value="AED">AED (د.إ)</option>
            <option value="GBP">GBP (£)</option>
          </select>

          {/* Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="rounded-lg border border-outline-variant/50 bg-surface px-3 py-1.5 font-body-sm text-body-sm text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="ALL">{t.history.allChannels}</option>
            {uniqueChannels.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-outline-variant/50 bg-surface px-3 py-1.5 font-body-sm text-body-sm text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="dateDesc">{t.history.sortOptions.dateDesc}</option>
            <option value="dateAsc">{t.history.sortOptions.dateAsc}</option>
            <option value="amountDesc">{t.history.sortOptions.amountDesc}</option>
            <option value="receivedDesc">{t.history.sortOptions.receivedDesc}</option>
            <option value="rateDesc">{t.history.sortOptions.rateDesc}</option>
          </select>
        </div>
      )}

      {loading && <LoadingBlock />}
      {!loading && error && <ErrorBlock onRetry={onRetry} />}

      {/* Empty State */}
      {!loading && !error && rawRows.length === 0 && (
        <div className="py-8 text-center flex flex-col items-center">
          <EmptyBlock icon="history" message="No remittance records logged yet." />
          {onAddRecord && (
            <button
              onClick={onAddRecord}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 font-label-md text-label-md text-on-primary hover:bg-primary/90 transition-colors shadow-soft"
            >
              <Icon name="add" className="text-[18px]" />
              <span>Log Your First Remittance</span>
            </button>
          )}
        </div>
      )}

      {/* No Filter Results State */}
      {!loading && !error && rawRows.length > 0 && filteredRows.length === 0 && (
        <div className="py-8 text-center flex flex-col items-center">
          <Icon name="search_off" className="text-[36px] text-on-surface-variant mb-2" />
          <p className="font-body-md text-on-surface-variant">{t.history.empty}</p>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="mt-3 rounded-full border border-outline-variant/60 px-4 py-1.5 font-label-md text-label-md text-primary hover:bg-surface-variant transition-colors"
            >
              Clear Search & Filters
            </button>
          )}
        </div>
      )}

      {/* Content Table / Card List */}
      {!loading && !error && filteredRows.length > 0 && (
        <>
          {/* Desktop Table View */}
          <div className="hidden overflow-hidden rounded-lg border border-outline-variant/40 md:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-surface-container-high/60">
                <tr className="font-label-sm text-label-sm text-on-surface-variant">
                  <Th>{t.history.date}</Th>
                  <Th>{t.history.from}</Th>
                  <Th>{t.history.amount}</Th>
                  <Th>{t.history.channel}</Th>
                  <Th align="right">{t.history.rate}</Th>
                  <Th align="right">{t.history.received}</Th>
                  <Th align="right">{t.history.status}</Th>
                  <Th align="right">{t.history.actions}</Th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`border-t border-outline-variant/30 font-body-md text-on-surface transition-colors hover:bg-surface-container-low/60 ${
                      i % 2 ? 'bg-surface-container-low/40' : ''
                    }`}
                  >
                    <Td className="whitespace-nowrap text-on-surface-variant">
                      {formatDateFull(r.date)}
                    </Td>
                    <Td>
                      <span className="flex items-center gap-2">
                        <Icon name="public" className="text-[18px] text-secondary" />
                        {r.senderCountry}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap font-medium">
                      {formatMoney(r.amount)} {r.currency || 'USD'}
                    </Td>
                    <Td>{r.channel}</Td>
                    <Td align="right" className="whitespace-nowrap">
                      {formatRate(r.rate)}
                    </Td>
                    <Td align="right" className="whitespace-nowrap font-medium text-secondary">
                      {formatMoney(r.received)} LKR
                    </Td>
                    <Td align="right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-label-sm text-label-sm ${
                          r.status === 'Pending'
                            ? 'bg-warning-container text-on-warning-container'
                            : 'bg-good-container text-on-good-container'
                        }`}
                      >
                        <Icon
                          name={r.status === 'Pending' ? 'schedule' : 'check_circle'}
                          filled={r.status !== 'Pending'}
                          className="text-[14px]"
                        />
                        {r.status || 'Completed'}
                      </span>
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-1">
                        {onEditRecord && (
                          <button
                            onClick={() => onEditRecord(r)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant hover:text-primary transition-colors"
                            title={t.history.edit}
                          >
                            <Icon name="edit" className="text-[16px]" />
                          </button>
                        )}
                        {onDeleteRecord && (
                          <button
                            onClick={() => {
                              if (window.confirm(t.history.confirmDelete)) {
                                onDeleteRecord(r.id);
                              }
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors"
                            title={t.history.delete}
                          >
                            <Icon name="delete" className="text-[16px]" />
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <ul className="flex flex-col gap-3 md:hidden">
            {filteredRows.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-outline-variant/40 p-4 shadow-soft bg-surface"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-variant text-secondary">
                      <Icon name="public" className="text-[18px]" />
                    </span>
                    <div>
                      <div className="font-label-md text-[15px] text-on-surface font-semibold">
                        {r.senderCountry}
                      </div>
                      <div className="font-label-sm text-label-sm font-normal text-on-surface-variant">
                        {formatDateFull(r.date)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-label-sm text-label-sm ${
                        r.status === 'Pending'
                          ? 'bg-warning-container text-on-warning-container'
                          : 'bg-good-container text-on-good-container'
                      }`}
                    >
                      <Icon
                        name={r.status === 'Pending' ? 'schedule' : 'check_circle'}
                        filled={r.status !== 'Pending'}
                        className="text-[14px]"
                      />
                      {r.status || 'Completed'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 font-label-md text-label-md">
                  <Cell label={t.history.amount} value={`${formatMoney(r.amount)} ${r.currency || 'USD'}`} />
                  <Cell label={t.history.channel} value={r.channel} />
                  <Cell label={t.history.rate} value={`${formatRate(r.rate)} LKR`} />
                  <Cell
                    label={t.history.received}
                    value={`${formatMoney(r.received)} LKR`}
                    valueClass="text-secondary font-semibold"
                  />
                </div>

                {/* Mobile Row Actions */}
                <div className="mt-3 pt-2.5 border-t border-outline-variant/30 flex items-center justify-end gap-2">
                  {onEditRecord && (
                    <button
                      onClick={() => onEditRecord(r)}
                      className="inline-flex items-center gap-1 rounded-full border border-outline-variant/40 px-3 py-1 font-label-sm text-label-sm text-on-surface hover:bg-surface-variant transition-colors"
                    >
                      <Icon name="edit" className="text-[14px]" />
                      <span>{t.history.edit}</span>
                    </button>
                  )}
                  {onDeleteRecord && (
                    <button
                      onClick={() => {
                        if (window.confirm(t.history.confirmDelete)) {
                          onDeleteRecord(r.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-error/40 px-3 py-1 font-label-sm text-label-sm text-error hover:bg-error-container transition-colors"
                    >
                      <Icon name="delete" className="text-[14px]" />
                      <span>{t.history.delete}</span>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-label-sm text-label-sm font-normal text-on-surface-variant">
            <p>{t.history.note}</p>
            <p>Showing {filteredRows.length} of {rawRows.length} transfers</p>
          </div>
        </>
      )}
    </section>
  );
}

function Th({ children, align = 'left' }) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 font-semibold ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = '', align = 'left' }) {
  return (
    <td className={`px-4 py-3 ${align === 'right' ? 'text-right' : ''} ${className}`}>
      {children}
    </td>
  );
}

function Cell({ label, value, valueClass = 'text-on-surface' }) {
  return (
    <div className="flex flex-col">
      <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">
        {label}
      </span>
      <span className={`font-label-md ${valueClass}`}>{value}</span>
    </div>
  );
}
