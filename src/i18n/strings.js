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

/* Country names that read as "the X" in English. Kept next to the copy rather
 * than in the agent, because which names take an article is a property of the
 * language — Sinhala and Tamil will not share this list. */
const COUNTRIES_WITH_ARTICLE = new Set([
  'United States',
  'United Kingdom',
  'United Arab Emirates',
  'Philippines',
  'Netherlands',
]);

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

  /* ------------------------------------------------------- Proactive agent
   * Feature #4: the agent decides WHEN to speak up. All copy for the nudge
   * card, the agent-initiated chat bubbles, and the "staying quiet" states
   * lives here so it stays translatable. Templates receive values that the
   * nudge engine has ALREADY formatted (see src/agent/nudgeEngine.js), so no
   * number logic lives in this file. */
  nudge: {
    cardLabel: 'Your coach spoke up',
    chatDivider: 'Your coach spoke up',
    openCoach: 'Open the coach',
    dismiss: 'Dismiss',
    watchingLabel: 'Your coach is watching',
    showAgain: 'Let me see it again',
    cardAria: 'Proactive recommendation from your remittance coach',

    /* Urgency chips — how close the predicted transfer is */
    urgency: {
      now: 'Due now',
      soon: 'Coming up soon',
      watch: 'Watching quietly',
    },

    /* Some country names take an article in English ("the United States").
     * Articles belong to the language, so they live here — the engine only ever
     * passes a bare country name. */
    country: (name) =>
      COUNTRIES_WITH_ARTICLE.has(name) ? `the ${name}` : name,

    /* Personalised context chips */
    nextExpected: (when) => `Next transfer expected ${when}`,
    usualCorridor: ({ amount, currency, country }) =>
      `Usually ${amount} ${currency} from ${country}`,
    usualChannel: (channel) => `Usually sent via ${channel}`,
    cadenceEvery: (days) => `About every ${days} days`,

    /* Relative timing phrasing. Every value here has to read correctly after
     * "is due …", so the overdue case says "any time now" and then explains —
     * "is due about 2 days late" would be nonsense. */
    daysWord: (n) => (n === 1 ? '1 day' : `${n} days`),
    inDays: (n) => (n === 1 ? 'in about 1 day' : `in about ${n} days`),
    aroundToday: 'around today',
    overdue: (n) =>
      n === 1
        ? 'any time now — it is about 1 day late'
        : `any time now — it is about ${n} days late`,

    /* Headline shown on the dashboard card, per decision reason */
    headline: {
      good_rate_before_transfer: ({ country, when }) =>
        `A good moment to convert — your next transfer from ${country} is due ${when}.`,
      low_rate_before_transfer: ({ country, when }) =>
        `Your next transfer from ${country} is due ${when} — the rate is a little low today.`,
      usual_channel_overcharging: ({ usualChannel, fee }) =>
        `Before your next transfer: ${usualChannel} is charging about ${fee} in fees today.`,
      transfer_due: ({ country }) => `Your transfer from ${country} is due around now.`,
    },

    /* The agent-initiated chat bubbles, per decision reason. Order matters:
     * pattern first, then the rate/fee fact, then a low-pressure suggestion. */
    bubbles: {
      good_rate_before_transfer: [
        ({ country, cadenceDays, when }) =>
          `I’ve been keeping an eye on things for you. Money from ${country} usually reaches your family about every ${cadenceDays} days — and the next one is due ${when}.`,
        ({ percent, amount, currency, gain }) =>
          `Today the rate is ${percent} above your weekly average. On the ${amount} ${currency} you usually receive, that works out to roughly ${gain} more for your family.`,
        ({ channel }) =>
          `If you do convert, ${channel} gives your family the most rupees today. No pressure at all — the timing is yours to choose.`,
      ],
      low_rate_before_transfer: [
        ({ country, cadenceDays, when }) =>
          `Money from ${country} usually reaches your family about every ${cadenceDays} days, so the next one is due ${when} — you still have a little time.`,
        ({ percent }) => `Right now the rate is about ${percent} below your weekly average.`,
        ({ daysLeft }) =>
          `If it isn’t urgent, waiting a few days may get a better rate — you have about ${daysLeft} before the next transfer is due. If you do need to convert, that’s completely fine too; just pick the lowest-fee channel.`,
      ],
      usual_channel_overcharging: [
        ({ usualChannel, fee }) =>
          `Quick heads-up before your next transfer: ${usualChannel} — the one you usually use — is charging about ${fee} in fees today.`,
        ({ loss, amount, currency, bestChannel }) =>
          `On the ${amount} ${currency} you usually receive, that’s roughly ${loss} less reaching your family than ${bestChannel}, which sits much closer to the real rate.`,
        ({ when }) =>
          `Worth a look before the money moves — your next transfer is due ${when}.`,
      ],
      transfer_due: [
        ({ country, when }) => `Your transfers from ${country} are due ${when}.`,
        ({ rateLine, diffLabel }) => `Today ${rateLine}, which is ${diffLabel}.`,
        () =>
          `Nothing urgent here. When you’re ready, compare the channels and choose the one with the lowest fee.`,
      ],
    },

    /* Why the agent is staying quiet. Surfaced discreetly so the decision is
     * visible during a demo instead of looking like nothing happened. */
    quiet: {
      insufficient_history:
        'Not enough transfer history yet to predict your next one. I’ll start nudging once I can see a pattern.',
      too_early: ({ when }) =>
        `Nothing to act on yet — your next transfer is due ${when}. I’ll speak up as it gets closer.`,
      no_clear_signal: ({ when }) =>
        `The rate is fairly average and your next transfer is due ${when}. I’ll speak up when there’s something worth saying.`,
      cooldown: 'I nudged you recently and nothing has changed enough to bother you again.',
      dismissed: 'You dismissed this nudge — I’ll stay quiet for now.',
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
