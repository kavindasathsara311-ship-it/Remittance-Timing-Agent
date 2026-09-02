import { t } from '../i18n/strings';
import { parsePair } from '../utils/format';

/* =============================================================================
 * CurrencyTabs — horizontally scrollable pill selector for the currency pair
 * (USD / SAR / AED / GBP vs LKR). Accessible as a tablist.
 * ===========================================================================*/
export default function CurrencyTabs({ value, onChange, pairs = [], className = '' }) {
  return (
    <div
      role="tablist"
      aria-label="Currency pair"
      className={`flex gap-2 overflow-x-auto scrollbar-hide pb-1 ${className}`}
    >
      {pairs.map((pair) => {
        const { base } = parsePair(pair);
        const active = pair === value;
        const meta = t.currency[base] || { label: base };
        return (
          <button
            key={pair}
            type="button"
            role="tab"
            aria-selected={active}
            title={`${meta.label} → LKR`}
            onClick={() => onChange(pair)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2 font-label-md transition-all active:scale-95 ${
              active
                ? 'bg-secondary text-on-secondary shadow-soft'
                : 'border border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            <span>{base}</span>
            <span className={`text-label-sm ${active ? 'text-on-secondary/70' : 'text-outline'}`}>
              → LKR
            </span>
          </button>
        );
      })}
    </div>
  );
}
