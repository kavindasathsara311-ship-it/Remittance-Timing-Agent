import Icon from './Icon';
import { formatMoney, formatRate } from '../utils/format';
import { t } from '../i18n/strings';

export default function HistorySummaryStats({ history }) {
  const rows = Array.isArray(history) ? history : [];
  if (rows.length === 0) return null;

  const totalTransfers = rows.length;

  // Sum LKR received
  const totalLkrReceived = rows.reduce((sum, r) => sum + (Number(r.received) || 0), 0);

  // Group amounts by currency
  const currencyTotals = rows.reduce((acc, r) => {
    const curr = r.currency || 'USD';
    acc[curr] = (acc[curr] || 0) + (Number(r.amount) || 0);
    return acc;
  }, {});

  // Primary currency string representation (e.g. "USD 2,000 + SAR 2,700")
  const primarySentFormatted = Object.entries(currencyTotals)
    .map(([curr, amt]) => `${formatMoney(amt)} ${curr}`)
    .join(' · ');

  // Calculate average exchange rate
  const avgRate = rows.reduce((sum, r) => sum + (Number(r.rate) || 0), 0) / rows.length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {/* Stat 1: Total Transfers */}
      <div className="card p-4 border border-outline-variant/30 flex flex-col justify-between">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span className="font-label-sm text-label-sm font-normal">{t.history.stats.totalTransfers}</span>
          <Icon name="swap_horiz" className="text-[18px] text-secondary" />
        </div>
        <div className="mt-2 font-headline-md text-[22px] font-bold text-on-surface">
          {totalTransfers}
        </div>
      </div>

      {/* Stat 2: Total Sent */}
      <div className="card p-4 border border-outline-variant/30 flex flex-col justify-between">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span className="font-label-sm text-label-sm font-normal">{t.history.stats.totalSent}</span>
          <Icon name="payments" className="text-[18px] text-primary" />
        </div>
        <div className="mt-2 font-label-lg text-[15px] font-bold text-on-surface truncate" title={primarySentFormatted}>
          {primarySentFormatted}
        </div>
      </div>

      {/* Stat 3: Total LKR Received */}
      <div className="card p-4 border border-outline-variant/30 flex flex-col justify-between">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span className="font-label-sm text-label-sm font-normal">{t.history.stats.totalReceived}</span>
          <Icon name="account_balance_wallet" className="text-[18px] text-good" />
        </div>
        <div className="mt-2 font-headline-md text-[22px] font-bold text-good">
          {formatMoney(totalLkrReceived)} <span className="text-body-sm font-normal text-on-surface-variant">LKR</span>
        </div>
      </div>

      {/* Stat 4: Average Rate */}
      <div className="card p-4 border border-outline-variant/30 flex flex-col justify-between">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span className="font-label-sm text-label-sm font-normal">{t.history.stats.avgRate}</span>
          <Icon name="trending_up" className="text-[18px] text-secondary" />
        </div>
        <div className="mt-2 font-headline-md text-[22px] font-bold text-on-surface">
          {formatRate(avgRate)} <span className="text-body-sm font-normal text-on-surface-variant">LKR</span>
        </div>
      </div>
    </div>
  );
}
