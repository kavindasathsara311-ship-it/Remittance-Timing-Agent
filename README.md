# Remittance Coach

> **Know when to convert, not just how much.**

A calm, family-friendly web app that helps Sri Lankan families who receive
remittances decide **WHEN** to convert foreign currency to LKR and **WHICH**
channel to use — based on FX trend data and honest fee comparisons.

This is a **financial-literacy tool for everyday families, not a trading
terminal**: plain-English coaching, soft rounded cards, generous whitespace, and
a warm palette. Red is reserved only for genuine "high fee" warnings.

---

## Features

- **Today's Verdict** — a single, colour-coded answer (*Good time to convert* /
  *Wait if you can* / *Rate is neutral*) with a one-line coaching message and the
  supporting numbers for anyone who wants the detail.
- **30-day FX trend chart** (Recharts) with the current rate highlighted.
- **Currency pair selector** — USD, SAR, AED, GBP vs LKR.
- **Channel comparison** — sorted best-first, effective rate vs mid-market shown
  side by side, and predatory channels flagged with a red **"⚠ High fees"** tag.
- **Coach / Chat view** — the agent proactively messages the family. Four demo
  scenarios (good time, bad time, urgent override, predatory channel) replay as
  chat bubbles; tone always matches the message (reassuring green, calm amber,
  clear-but-not-scary warning).
- **History** — a table of past remittance events (amount, sender country,
  channel, date).
- **Dark & light mode** — a full Material 3 colour system for both themes, with
  the choice persisted to `localStorage` and no flash-of-wrong-theme on load.
- **Mobile-responsive** — bottom navigation on phones, top bar on wider screens.
- **i18n-ready** — every user-facing string lives in one file, structured so
  Sinhala/Tamil can be dropped in later.

---

## Tech stack

| Concern      | Choice                                        |
| ------------ | --------------------------------------------- |
| Framework    | React 18 + Vite 5                             |
| Styling      | TailwindCSS 3 (Material 3 design tokens)      |
| Charts       | Recharts 2                                    |
| Routing      | react-router-dom 6 (`HashRouter`)             |
| Data         | Plain `fetch()` with a built-in **mock mode** |

---

## How to run

Requires **Node 18+** (built and tested on Node 24).

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (runs with mock data out of the box)
npm run dev
```

Then open the printed URL — usually **http://localhost:5173/**.

Other scripts:

```bash
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npm run lint      # eslint over src/
```

> The app ships with `USE_MOCK_DATA = true`, so it runs fully standalone —
> **no backend required** — the moment you start it.

---

## How to point this at the real backend

All data access is isolated in **one file**: [`src/services/api.js`](src/services/api.js).
Swapping from mock data to the live REST API is a **one-line change** (plus the
URL).

**1. Turn mock mode off** — near the top of `src/services/api.js`:

```js
// BEFORE
export const USE_MOCK_DATA = true;

// AFTER
export const USE_MOCK_DATA = false;
```

**2. Tell the app where the API lives** — create a `.env` file in the project
root (it is git-ignored):

```env
VITE_API_BASE_URL=http://localhost:3001
```

That's it. No component, page, or hook needs to change: every function in
`api.js` returns the exact same shape whether the data is mocked or live, so the
UI never knows the difference.

> If `VITE_API_BASE_URL` is not set, the app falls back to
> `http://localhost:3001`. Remember to **restart `npm run dev`** after editing
> `.env` so Vite picks up the new value.

### Backend contract

The UI is built against these endpoints (see the prompt for the canonical spec):

| Endpoint | Returns |
| --- | --- |
| `GET /api/fx-history?pair=USD_LKR&days=30` | `[{ date, rate }, ...]` |
| `GET /api/recommendation?pair=USD_LKR` | `{ verdict, currentRate, avgRate7d, percentDiff, confidence }` |
| `GET /api/channels?amount=500&pair=USD_LKR` | `[{ channel, effectiveRate, midMarketRate, feePercent, flagged }, ...]` |
| `GET /api/coach-message?scenario=good_time\|bad_time\|urgent\|predatory_channel` | `{ message, tone }` |

Two helpers in `api.js` are **mock-only** and degrade gracefully in live mode:

- `getConversation(scenario)` — the multi-turn Coach chat. In live mode it falls
  back to a single `coach-message` bubble.
- `getHistory()` — the History table. Wire it to a real `GET /api/history` when
  the backend provides one.

If your teammate's endpoints differ (names, casing, extra fields), the only file
you need to touch is `src/services/api.js`.

---

## Project structure

```
src/
├── services/
│   ├── api.js          # ← the ONLY data file. USE_MOCK_DATA switch lives here.
│   └── mockData.js     # deterministic mock data matching the contract
├── i18n/
│   └── strings.js      # ← ALL user-facing copy (en populated, si/ta stubbed)
├── context/
│   └── ThemeContext.jsx# dark/light provider + useTheme()
├── theme/
│   └── chartTheme.js   # concrete chart colours per theme (Recharts can't read CSS vars)
├── hooks/
│   └── useAsync.js     # loading / error / data plumbing
├── utils/
│   ├── format.js       # rate, money, percent, date formatters
│   └── verdict.js      # verdict → status/scenario/icon mapping
├── components/
│   ├── VerdictCard.jsx
│   ├── FxTrendChart.jsx
│   ├── ChannelComparisonTable.jsx
│   ├── ChannelCard.jsx
│   ├── CoachChatPanel.jsx
│   ├── ScenarioPicker.jsx
│   ├── ChatBubble.jsx
│   ├── HistoryTable.jsx
│   ├── CurrencyTabs.jsx
│   ├── Icon.jsx
│   ├── ScrollToTop.jsx
│   ├── layout/         # AppShell, TopAppBar, BottomNavBar, ThemeToggle, navItems
│   └── ui/             # StatusBadge, StateBlocks (loading/empty/error)
├── pages/
│   ├── Dashboard.jsx   # default landing screen
│   ├── Channels.jsx    # full channel comparison grid
│   ├── Coach.jsx       # chat view
│   └── History.jsx     # past events table
├── index.css           # Material 3 design tokens (light + dark)
├── App.jsx             # providers + routes
└── main.jsx            # React entry
```

The five "hero" components named in the brief — **VerdictCard, FxTrendChart,
ChannelComparisonTable, CoachChatPanel, ScenarioPicker** — are all present and
kept small so the three collaborators can find things fast.

---

## Design & theming notes

- **Colour tokens** are defined once in [`src/index.css`](src/index.css) as CSS
  custom properties (RGB triplets) under `:root` (light) and `.dark` (dark), then
  mapped into Tailwind in [`tailwind.config.js`](tailwind.config.js). This lets a
  single `.dark` class on `<html>` re-theme the whole app while keeping opacity
  utilities like `bg-secondary/10` working.
- **Semantic status colours** (`good`, `wait`, `neutral`, `warn`) are kept
  separate from the raw palette so their *meaning* survives the theme swap — and
  so "wait" stays a calm amber rather than an alarming red.
- **No flash of wrong theme**: an inline script in [`index.html`](index.html)
  applies the stored/OS theme before first paint.
- **Accessibility**: reduced-motion support, visible focus rings, and ARIA
  labels on the chart.

---

## Translating later (Sinhala / Tamil)

All copy is centralised in [`src/i18n/strings.js`](src/i18n/strings.js). `si` and
`ta` are already stubbed (they currently spread `...en` as a safe fallback). To
translate, fill in those objects and switch the active locale via `t` /
`getStrings(locale)` — no component edits needed.

---

## Disclaimer

Remittance Coach is an educational demo. Rates, channels, and coaching messages
shown are **sample data** unless connected to a live backend, and are not
financial advice.
