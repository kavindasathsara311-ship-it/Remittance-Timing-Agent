import { useState, useEffect } from 'react';
import Icon from './Icon';
import { LoadingBlock, ErrorBlock } from './ui/StateBlocks';
import { computeRemittancePatterns } from '../utils/patternRecognition';
import { getPatternInsight } from '../services/aiCoach';
import { formatDateFull } from '../utils/format';
import { t } from '../i18n/strings';

/**
 * PatternInsightCard — displays behavioral analysis of past family remittance history:
 *  1. Warm AI-generated insight (or graceful fallback string).
 *  2. Pure-math computed metrics: average transfer gap, conversion timing, expected next transfer date.
 */
export default function PatternInsightCard({ history, loading = false, error = null, onRetry }) {
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);

  const patternData = computeRemittancePatterns(history);

  useEffect(() => {
    let isMounted = true;
    if (patternData.hasEnoughData) {
      setInsightLoading(true);
      getPatternInsight(patternData)
        .then((res) => {
          if (isMounted) setInsight(res);
        })
        .catch((err) => {
          console.error('Error fetching pattern insight:', err);
          if (isMounted) setInsight(t.pattern.insufficientData);
        })
        .finally(() => {
          if (isMounted) setInsightLoading(false);
        });
    } else {
      setInsight(t.pattern.insufficientData);
    }

    return () => {
      isMounted = false;
    };
  }, [history]);

  if (loading) {
    return (
      <section className="card card-pad">
        <LoadingBlock />
      </section>
    );
  }

  if (error) {
    return (
      <section className="card card-pad">
        <ErrorBlock onRetry={onRetry} />
      </section>
    );
  }

  return (
    <section className="card card-pad relative overflow-hidden border border-outline-variant/40 shadow-soft">
      {/* Visual Accent Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
              <Icon name="auto_awesome" className="text-[18px]" />
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface">
              {t.pattern?.title || 'Family Remittance Pattern'}
            </h2>
          </div>
          <p className="mt-1 font-label-md text-label-md font-normal text-on-surface-variant">
            {t.pattern?.subtitle || 'AI-analyzed insights based on your family’s transfer timing and history'}
          </p>
        </div>
      </div>

      {/* AI Coach Insight Banner */}
      <div className="mb-6 rounded-xl bg-surface-variant/60 p-4 border border-outline-variant/30">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
            <Icon name="psychology" className="text-[18px]" />
          </span>
          <div className="flex-1">
            <div className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-secondary">
              {t.pattern?.aiInsightTitle || 'Coach Insight'}
            </div>
            {insightLoading ? (
              <p className="mt-1 font-body-md text-on-surface-variant animate-pulse">
                Analyzing transfer patterns…
              </p>
            ) : (
              <p className="mt-1 font-body-md leading-relaxed text-on-surface">
                {insight}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      {patternData.hasEnoughData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Metric 1: Avg Gap */}
          <div className="rounded-lg bg-surface-container-low p-3.5 border border-outline-variant/30 flex flex-col">
            <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">
              {t.pattern?.avgInterval || 'Average transfer gap'}
            </span>
            <span className="mt-1 font-headline-md text-[22px] font-bold text-on-surface">
              {patternData.avgDaysBetweenTransfers} <span className="text-body-md font-normal text-on-surface-variant">days</span>
            </span>
            <span className="mt-1 font-label-sm text-[12px] text-on-surface-variant/80">
              Between transfers
            </span>
          </div>

          {/* Metric 2: Conversion Timing */}
          <div className="rounded-lg bg-surface-container-low p-3.5 border border-outline-variant/30 flex flex-col">
            <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">
              {t.pattern?.conversionTime || 'Conversion timing'}
            </span>
            <span className="mt-1 font-headline-md text-[22px] font-bold text-on-surface">
              ~{patternData.avgDaysToConvert} <span className="text-body-md font-normal text-on-surface-variant">days</span>
            </span>
            <span className="mt-1 font-label-sm text-[12px] text-on-surface-variant/80">
              From arrival to spend
            </span>
          </div>

          {/* Metric 3: Likely Next Transfer */}
          <div className="rounded-lg bg-surface-container-low p-3.5 border border-outline-variant/30 flex flex-col">
            <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">
              {t.pattern?.nextExpected || 'Likely next transfer'}
            </span>
            <span className="mt-1 font-headline-md text-[18px] font-bold text-secondary">
              {patternData.expectedNextDate ? formatDateFull(patternData.expectedNextDate) : 'N/A'}
            </span>
            <span className="mt-1 font-label-sm text-[12px] text-on-surface-variant/80">
              Based on historical frequency
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
