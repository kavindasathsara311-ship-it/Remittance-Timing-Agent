/* =============================================================================
 * strings.js — SINGLE SOURCE OF TRUTH for all user-facing copy.
 *
 * Nothing in the app should hardcode visible text inline; import `t` from here.
 * The object is organised by screen/feature. Sinhala (`si`) and Tamil (`ta`)
 * are stubbed with the exact same shape so a translator can drop in real copy
 * later without touching a single component.
 *
 * Dynamic copy is exposed as functions (e.g. `t.dashboard.rateLine(...)`) so
 * numbers/labels stay localisable too.
 * ===========================================================================*/

export const LOCALES = {
  en: 'English',
  si: 'සිංහල',
  ta: 'தமிழ்',
};

export const DEFAULT_LOCALE = 'en';

/* ------------------------------------------------------------------ English */
const en = {
  meta: {
    locale: 'en',
    direction: 'ltr',
  },

  app: {
    name: 'Remittance Coach',
    tagline: 'Know when to convert, not just how much',
  },

  nav: {
    home: 'Home',
    coach: 'Coach',
    channels: 'Channels',
    history: 'History',
    openMenu: 'Menu',
    skipToContent: 'Skip to content',
  },

  theme: {
    toggle: 'Toggle colour theme',
    toDark: 'Switch to dark mode',
    toLight: 'Switch to light mode',
    light: 'Light',
    dark: 'Dark',
  },

  common: {
    loading: 'Loading…',
    retry: 'Try again',
    somethingWrong: 'Something went wrong while loading this.',
    lkr: 'LKR',
    justNow: 'Just now',
    viewAll: 'View all',
    optional: 'optional',
    dataSource: 'Sample data',
    liveData: 'Live data',
    close: 'Close',
  },

  currency: {
    USD: { code: 'USD', label: 'US Dollar', country: 'United States' },
    SAR: { code: 'SAR', label: 'Saudi Riyal', country: 'Saudi Arabia' },
    AED: { code: 'AED', label: 'UAE Dirham', country: 'United Arab Emirates' },
    GBP: { code: 'GBP', label: 'British Pound', country: 'United Kingdom' },
  },

  dashboard: {
    greeting: 'Today’s verdict',
    verdictCardLabel: 'Today’s Verdict',
    trendTitle: '30-day trend',
    trendSubtitle: 'How the rate has moved against the LKR',
    lastUpdated: 'Last updated: today',
    compareChannels: 'Compare channels',
    compareChannelsHint: 'Sorted by the rate your family actually receives.',
    viewAllChannels: 'View all channels',
    rateLine: (base, rate) => `1 ${base} = ${rate} LKR`,
    detailLine: ({ current, avg7d, diffLabel }) =>
      `Current: ${current} LKR · 7-day avg: ${avg7d} · ${diffLabel}`,
    belowAverage: (pct) => `${pct} below average`,
    aboveAverage: (pct) => `${pct} above average`,
    onAverage: 'about average',
    chartAria: (base) => `Line chart of ${base} to LKR exchange rate over the last 30 days`,
    confidence: (level) => `${level} confidence`,
  },

  verdict: {
    good: 'Good time to convert',
    wait: 'Wait if you can',
    neutral: 'Rate is neutral',
    goodShort: 'Good time',
    waitShort: 'Wait',
    neutralShort: 'Neutral',
  },

  channels: {
    title: 'Money transfer channels',
    subtitle:
      'Compare live rates and fees to find the most cost-effective way to send money home today.',
    amountLabel: 'Amount to convert',
    amountHelp: 'We use this to estimate what your family receives.',
    channel: 'Channel',
    effectiveRate: 'Effective rate',
    midMarket: 'Mid-market',
    fee: 'Fee',
    youReceive: 'Family receives',
    gap: 'Gap',
    fairChoice: 'Fair choice',
    highFees: 'High fees',
    best: 'Best value',
    rank: (n) => `#${n}`,
    perUnit: (base) => `LKR per ${base}`,
    estimateLine: (amount, base, received) =>
      `Send ${amount} ${base} → about ${received} LKR`,
    gapNote: (gap) => `${gap} below mid-market`,
    empty: 'No channels available right now.',
    sortHint: 'Best effective rate first.',
  },

  coach: {
    title: 'Your coach',
    subtitle: 'Proactive, plain-English guidance — no jargon, no pressure.',
    panelHeading: 'Coach',
    introBubble: 'Hi! I’m your Remittance Coach. Pick a situation below and I’ll walk you through it.',
    placeholder: 'Ask your coach anything…',
    send: 'Send',
    scenarioPrompt: 'Try a scenario',
    replay: 'Replay',
    typing: 'Coach is typing…',
    inputDisabledHint: 'This is a preview — the coach messages you proactively.',
  },

  scenarios: {
    good_time: {
      button: 'Good time',
      title: 'It looks like a good time',
      hint: 'Rates are high — converting now gets more LKR.',
      icon: 'trending_up',
    },
    bad_time: {
      button: 'Wait a few days',
      title: 'Rates dipped',
      hint: 'A calm suggestion to wait if the money isn’t urgent.',
      icon: 'schedule',
    },
    urgent: {
      button: 'I need it now',
      title: 'Urgent transfer',
      hint: 'Sending today even though the rate is below average.',
      icon: 'bolt',
    },
    predatory_channel: {
      button: 'Fee warning',
      title: 'A channel is overcharging',
      hint: 'Spotting high hidden fees and suggesting a fairer option.',
      icon: 'warning',
    },
  },

  history: {
    title: 'Your remittance history',
    subtitle: 'A simple record of past transfers to show how your money travelled.',
    date: 'Date',
    amount: 'Amount',
    from: 'From',
    channel: 'Channel',
    rate: 'Rate received',
    received: 'Family got',
    status: 'Status',
    empty: 'No past transfers yet.',
    note: 'Sample records for demonstration.',
  },

  pattern: {
    title: 'Family Remittance Pattern',
    subtitle: 'AI-analyzed insights based on your family’s transfer timing and history',
    avgInterval: 'Average transfer gap',
    avgIntervalUnit: 'days between transfers',
    conversionTime: 'Conversion timing',
    conversionTimeUnit: 'days to convert/spend',
    nextExpected: 'Likely next transfer',
    topChannelLabel: 'Preferred channel',
    insufficientData: 'Not enough past transfer history to detect a pattern yet. Add more transfers to unlock behavior insights!',
    aiInsightTitle: 'Coach Insight',
  },

  footer: {
    disclaimer:
      'Remittance Coach is an educational tool. Rates and fees are estimates — always confirm with your provider before sending.',
    builtWith: 'Built for Sri Lankan families receiving money from abroad.',
  },
};

/* ------------------------------------------------------------------ Sinhala */
/* TODO(translation): mirror the exact shape of `en`. Left as a safe fallback
 * that renders English so the app never shows blank text before translation. */
const si = {
  meta: { locale: 'si', direction: 'ltr' },
  ...en,
};

/* -------------------------------------------------------------------- Tamil */
/* TODO(translation): mirror the exact shape of `en`. */
const ta = {
  meta: { locale: 'ta', direction: 'ltr' },
  ...en,
};

export const strings = { en, si, ta };

/**
 * Returns the string bundle for a locale, falling back to English for any
 * missing locale so the UI never breaks.
 */
export function getStrings(locale = DEFAULT_LOCALE) {
  return strings[locale] || en;
}

/** The active bundle. Swap DEFAULT_LOCALE (or wire this to a locale context)
 *  to change language app-wide. */
export const t = getStrings(DEFAULT_LOCALE);

export default t;
