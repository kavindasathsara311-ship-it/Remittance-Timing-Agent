import Icon from './Icon';
import { LoadingBlock, ErrorBlock, EmptyBlock } from './ui/StateBlocks';
import { formatDateFull, formatMoney, formatRate } from '../utils/format';
import { t } from '../i18n/strings';

/* =============================================================================
 * HistoryTable — read-only record of past remittance events (amount, sender
 * country, channel, date). Adds data richness; no interactivity needed.
 * Renders a real <table> on desktop and stacked cards on mobile.
 * ===========================================================================*/
export default function HistoryTable({ history, loading = false, error = null, onRetry }) {
  const rows = Array.isArray(history) ? history : [];

  return (
    <section className="card card-pad">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">{t.history.title}</h2>
          <p className="mt-0.5 font-label-md text-label-md font-normal text-on-surface-variant">
            {t.history.subtitle}
          </p>
        </div>
      </div>

      {loading && <LoadingBlock />}
      {!loading && error && <ErrorBlock onRetry={onRetry} />}
      {!loading && !error && rows.length === 0 && (
        <EmptyBlock icon="history" message={t.history.empty} />
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          {/* Desktop */}
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
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`border-t border-outline-variant/30 font-body-md text-on-surface ${
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
                      {formatMoney(r.amount)} {r.currency}
                    </Td>
                    <Td>{r.channel}</Td>
                    <Td align="right" className="whitespace-nowrap">
                      {formatRate(r.rate)}
                    </Td>
                    <Td align="right" className="whitespace-nowrap font-medium text-secondary">
                      {formatMoney(r.received)} LKR
                    </Td>
                    <Td align="right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-good-container px-2.5 py-1 font-label-sm text-label-sm text-on-good-container">
                        <Icon name="check_circle" filled className="text-[14px]" />
                        {r.status}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <ul className="flex flex-col gap-3 md:hidden">
            {rows.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-outline-variant/40 p-4 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-variant text-secondary">
                      <Icon name="public" className="text-[18px]" />
                    </span>
                    <div>
                      <div className="font-label-md text-[15px] text-on-surface">
                        {r.senderCountry}
                      </div>
                      <div className="font-label-sm text-label-sm font-normal text-on-surface-variant">
                        {formatDateFull(r.date)}
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-good-container px-2 py-0.5 font-label-sm text-label-sm text-on-good-container">
                    <Icon name="check_circle" filled className="text-[14px]" />
                    {r.status}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 font-label-md text-label-md">
                  <Cell label={t.history.amount} value={`${formatMoney(r.amount)} ${r.currency}`} />
                  <Cell label={t.history.channel} value={r.channel} />
                  <Cell label={t.history.rate} value={`${formatRate(r.rate)} LKR`} />
                  <Cell
                    label={t.history.received}
                    value={`${formatMoney(r.received)} LKR`}
                    valueClass="text-secondary font-semibold"
                  />
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-4 font-label-sm text-label-sm font-normal text-on-surface-variant">
            {t.history.note}
          </p>
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
