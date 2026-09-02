import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { getChartTheme } from '../theme/chartTheme';
import { formatDate, formatDateFull, formatRate, parsePair } from '../utils/format';
import { LoadingBlock, ErrorBlock } from './ui/StateBlocks';
import { t } from '../i18n/strings';

/* =============================================================================
 * FxTrendChart — Recharts area chart of the last N days for the selected pair,
 * with the current (latest) rate highlighted. Colours resolve from the active
 * theme so light/dark both look intentional. Renders its own card + header.
 * ===========================================================================*/
export default function FxTrendChart({ data, pair, loading = false, error = null, onRetry }) {
  const { theme } = useTheme();
  const c = getChartTheme(theme);
  const { base } = parsePair(pair);

  const hasData = Array.isArray(data) && data.length > 0;
  const dp = hasData && Math.max(...data.map((d) => d.rate)) > 200 ? 2 : 1;
  const last = hasData ? data[data.length - 1] : null;

  let yDomain = ['auto', 'auto'];
  if (hasData) {
    const rates = data.map((d) => d.rate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const pad = Math.max((max - min) * 0.25, min * 0.002, 0.02);
    yDomain = [min - pad, max + pad];
  }

  return (
    <section className="card card-pad">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">
            {t.dashboard.trendTitle}
          </h2>
          <p className="mt-0.5 font-label-md text-label-md font-normal text-on-surface-variant">
            {t.dashboard.trendSubtitle} · {base}/LKR
          </p>
        </div>
        <span className="shrink-0 font-label-sm text-label-sm text-on-surface-variant">
          {t.dashboard.lastUpdated}
        </span>
      </div>

      <div className="h-56 w-full md:h-72">
        {loading && <LoadingBlock />}
        {!loading && error && <ErrorBlock onRetry={onRetry} />}
        {!loading && !error && hasData && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
              role="img"
              aria-label={t.dashboard.chartAria(base)}
            >
              <defs>
                <linearGradient id="fxFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c.gradientTop} />
                  <stop offset="100%" stopColor={c.gradientBottom} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke={c.grid} vertical={false} />

              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: c.axis, fontSize: 12 }}
                axisLine={{ stroke: c.grid }}
                tickLine={false}
                minTickGap={28}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={yDomain}
                tickFormatter={(v) => formatRate(v, dp)}
                tick={{ fill: c.axis, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={54}
              />

              <Tooltip
                content={<ChartTooltip dp={dp} colors={c} />}
                cursor={{ stroke: c.line, strokeWidth: 1, strokeDasharray: '4 4' }}
              />

              <Area
                type="monotone"
                dataKey="rate"
                stroke={c.line}
                strokeWidth={2.5}
                fill="url(#fxFill)"
                dot={false}
                activeDot={{ r: 4, fill: c.dot, stroke: c.dotStroke, strokeWidth: 2 }}
                animationDuration={650}
              />

              {last && (
                <ReferenceDot
                  x={last.date}
                  y={last.rate}
                  r={5}
                  fill={c.dot}
                  stroke={c.dotStroke}
                  strokeWidth={2.5}
                  isFront
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

/* Custom tooltip styled to match the card system + theme. */
function ChartTooltip({ active, payload, label, dp, colors }) {
  if (!active || !payload || !payload.length) return null;
  const value = payload[0].value;
  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-card"
      style={{
        background: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        color: colors.tooltipText,
      }}
    >
      <div className="font-label-sm text-label-sm opacity-70">{formatDateFull(label)}</div>
      <div className="font-headline-md text-[18px] font-semibold">
        {formatRate(value, dp)} <span className="text-label-md font-normal opacity-70">LKR</span>
      </div>
    </div>
  );
}
