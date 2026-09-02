import Icon from './Icon';
import StatusBadge from './ui/StatusBadge';
import { formatRate, formatMoney } from '../utils/format';
import { t } from '../i18n/strings';

/* =============================================================================
 * ChannelCard — the richer card used on the Channels grid (mirrors the Stitch
 * "Money Transfer Channels" design). Shows effective vs mid-market, the fee,
 * an estimate of what the family receives, and a calm Fair / red High-fees tag.
 * ===========================================================================*/
export default function ChannelCard({ channel, amount = 500, best = false }) {
  const {
    channel: name,
    icon = 'payments',
    effectiveRate,
    midMarketRate,
    feePercent,
    flagged,
    receive,
    gapFromMid,
  } = channel;

  return (
    <article
      className={`card card-pad flex flex-col gap-4 border transition-transform duration-200 hover:-translate-y-1 ${
        flagged ? 'border-warn/40' : 'border-transparent hover:border-outline-variant/40'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              flagged ? 'bg-warn-container text-on-warn-container' : 'bg-secondary-container text-on-secondary-container'
            }`}
          >
            <Icon name={icon} filled className="text-[24px]" />
          </span>
          <div>
            <h3 className="font-headline-md text-[20px] text-on-surface">{name}</h3>
            {best && !flagged && (
              <span className="font-label-sm text-label-sm text-good">{t.channels.best}</span>
            )}
          </div>
        </div>

        {flagged ? (
          <StatusBadge status="warn" icon="warning" size="sm">
            {t.channels.highFees}
          </StatusBadge>
        ) : (
          <StatusBadge status="good" icon="check_circle" size="sm">
            {t.channels.fairChoice}
          </StatusBadge>
        )}
      </div>

      {/* Numbers */}
      <div className="flex flex-col gap-1">
        <div className="flex items-end justify-between border-b border-outline-variant/40 pb-2">
          <span className="font-body-md text-on-surface-variant">{t.channels.effectiveRate}</span>
          <span className="font-headline-md text-[22px] font-semibold text-on-surface">
            {formatRate(effectiveRate)}
            <span className="ml-1 font-label-md text-label-md font-normal text-on-surface-variant">
              LKR
            </span>
          </span>
        </div>

        <Row label={t.channels.midMarket} value={`${formatRate(midMarketRate)} LKR`} />
        <Row
          label={t.channels.fee}
          value={`${formatRate(feePercent, 1)}%`}
          valueClass={flagged ? 'text-warn font-semibold' : 'text-on-surface'}
        />
        <Row
          label={t.channels.gap}
          value={gapFromMid != null ? `−${formatRate(gapFromMid)} LKR` : '—'}
          valueClass={flagged ? 'text-warn' : 'text-on-surface-variant'}
        />
      </div>

      {/* Estimate */}
      {receive != null && (
        <div className="mt-auto flex items-center justify-between rounded-lg bg-surface-container-low px-3 py-2.5">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {t.channels.youReceive}
          </span>
          <span className="font-headline-md text-[18px] font-semibold text-secondary">
            {formatMoney(receive)} <span className="font-label-sm text-label-sm">LKR</span>
          </span>
        </div>
      )}
    </article>
  );
}

function Row({ label, value, valueClass = 'text-on-surface' }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="font-body-md text-on-surface-variant">{label}</span>
      <span className={`font-body-md ${valueClass}`}>{value}</span>
    </div>
  );
}
