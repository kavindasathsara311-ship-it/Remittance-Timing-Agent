/* Formatting helpers — pure, locale-agnostic, no user-facing copy lives here. */

/** Splits "USD_LKR" into { base: "USD", quote: "LKR" }. */
export function parsePair(pair = 'USD_LKR') {
  const [base, quote] = String(pair).split('_');
  return { base: base || 'USD', quote: quote || 'LKR' };
}

/** Fixed-decimal number without thousands separators (rates: 325.40). */
export function formatRate(value, dp = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(dp);
}

/** Number with thousands separators (money: 162,700). */
export function formatMoney(value, dp = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

/** Signed percentage string: +1.2% / -1.99%. */
export function formatSignedPercent(value, dp = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(dp)}%`;
}

/** Absolute percentage (for "2% below average"). */
export function formatPercent(value, dp = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${Math.abs(Number(value)).toFixed(dp)}%`;
}

const DATE_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const DATE_FMT_FULL = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** "2026-08-01" -> "1 Aug". */
export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return DATE_FMT.format(d);
}

/** "2026-08-01" -> "1 Aug 2026". */
export function formatDateFull(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return DATE_FMT_FULL.format(d);
}
