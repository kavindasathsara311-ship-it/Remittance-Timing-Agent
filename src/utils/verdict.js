/* Maps API verdicts to visual semantics + coach scenarios. */

export const VERDICT_MAP = {
  CONVERT_NOW: { status: 'good', scenario: 'good_time', icon: 'trending_up' },
  WAIT: { status: 'wait', scenario: 'bad_time', icon: 'schedule' },
  NEUTRAL: { status: 'neutral', scenario: 'neutral', icon: 'trending_flat' },
};

/** Safe lookup that always returns a valid meta object. */
export function getVerdictMeta(verdict) {
  return VERDICT_MAP[verdict] || VERDICT_MAP.NEUTRAL;
}

/** Chat bubble tone -> semantic status key (drives colour only, never copy). */
export const TONE_TO_STATUS = {
  reassuring: 'good',
  calm: 'wait',
  info: 'neutral',
  warning: 'warn',
};

export function toneToStatus(tone) {
  return TONE_TO_STATUS[tone] || 'neutral';
}
