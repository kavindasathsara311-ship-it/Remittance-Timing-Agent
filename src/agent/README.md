# `src/agent/` — proactive, personalised nudging

This folder is the part of the product that makes it an **agent** rather than a
dashboard. Everything else in the app answers a question the family asked. The
code here decides **whether to interrupt them at all**, and if so, **when**.

It combines the two things the brief calls for:

| Input | Source | Gives the agent |
| --- | --- | --- |
| **#1 current rate context** | `getRecommendation()` / `getChannels()` | verdict, % vs 7-day average, real fee quotes |
| **#3 this family's pattern** | `getHistory()` → `analyseFamilyPattern()` | cadence, next expected transfer, corridor, usual amount, usual channel |

…and turns them into one timely, personal recommendation.

---

## Files

| File | Role |
| --- | --- |
| `familyPattern.js` | **Feature #3.** Pure, deterministic analysis of the remittance history. No React, no fetching, no copy. |
| `nudgeEngine.js` | **Feature #4.** The judgement. `decideNudge()` is pure policy; `composeNudge()` turns a decision into words. |
| `useProactiveNudge.js` | Data chain + memory. Fetches, then persists *delivered* / *dismissed* state in `localStorage`. |
| `NudgeProvider.jsx` | One agent decision for the whole app, shared via context so surfaces can't fight over the cooldown. |
| `ProactiveNudgeCard.jsx` | The dashboard surface. Also renders the **quiet** state. |
| `familyPattern.test.js`, `nudgeEngine.test.js` | Vitest specs for the maths and the judgement. |

Copy lives in `src/i18n/strings.js` under `t.nudge` — nothing in this folder
hardcodes user-facing text.

---

## The decision

`decideNudge()` returns one of three decisions plus a **reason**. The reason
matters as much as the decision: it makes silence auditable instead of looking
like a bug.

```
decision  reason                       when
────────  ───────────────────────────  ─────────────────────────────────────────
silent    insufficient_history         fewer than 3 usable past transfers
hold      no_clear_signal              rate context missing, or nothing worth saying
hold      too_early                    next transfer is further out than the lead window
hold      dismissed                    the family waved this exact nudge away
hold      cooldown                     a different nudge was delivered < 20h ago
speak     usual_channel_overcharging   their usual channel is flagged AND not the best
speak     good_rate_before_transfer    CONVERT_NOW with non-low confidence, inside the window
speak     low_rate_before_transfer     WAIT with non-low confidence, inside the window
speak     transfer_due                 due today/overdue, even if the rate is unremarkable
```

The rules run in that order, so priority is explicit.

### Why the ordering is what it is

1. **No pattern → `silent`, not a guess.** Without a readable cadence there is
   nothing personal to say, and a generic "rates are up!" blast is precisely what
   a family learns to ignore. This is a hard gate, not a soft one.
2. **A concrete loss beats an abstract rate move.** "Western Union is taking
   ~Rs 4,700 more than it should, on the amount you usually send" is actionable
   today; "the rate is 1.6% up" is not. So the fee check runs first.
3. **…but only when switching would actually help.** If their usual channel is
   already the best quote, `usual_channel_overcharging` must *not* fire. Inventing
   a problem is worse than staying quiet.
4. **Low-confidence rate moves never interrupt.** `confidence === 'low'` means the
   move is under the 0.8% threshold — noise, not a signal.
5. **Due/overdue speaks even on a flat rate.** Timing advice is useless once the
   money has to move anyway; at that point the useful thing is "compare fees".

### Tuning

All thresholds live in one object at the top of `nudgeEngine.js`. Change behaviour
there — never inside the rules.

```js
export const NUDGE_POLICY = {
  LEAD_WINDOW_DAYS: 10, // how far ahead of the expected transfer it may speak
  COOLDOWN_HOURS: 20,   // anti-nag
  URGENT_BY_DAYS: 2,    // inside this, urgency becomes 'now'
};
```

---

## Nudge identity, dismissal and the anti-nag cooldown

```js
nudgeId(reason, pattern) === `nudge-${reason}-${pattern.nextExpectedDate}`
```

Same reason + same expected-transfer date = the same nudge. That single idea is
what stops the two classic failure modes:

- **Flicker.** A naive cooldown keyed on "we nudged recently" would suppress the
  nudge on the very next render after delivering it, so the card would vanish
  mid-read. `decideNudge()` therefore exempts the nudge that is *already on
  screen* (`deliveredId === id`).
- **Permanent muting.** Dismissing one nudge stores its **id**, not a global
  "don't talk to me" flag. A genuinely different nudge — a fee problem appearing
  after they dismissed a rate tip — still gets through.

Persistence (`useProactiveNudge.js`, keys `rc-nudge-delivered` and
`rc-nudge-dismissed`) follows the same convention as `ThemeContext`: every
`localStorage` access is wrapped, so private mode or a full quota degrades to
"session-only memory" rather than crashing.

`restore()` clears both records. It exists for demos and review — the quiet-state
line offers it only when the silence was the agent's *choice* (`dismissed`,
`cooldown`), never when it's a fact about the data.

---

## How it reaches the screen

```
App.jsx
└── NudgeProvider                      ← decides once, app-wide
    └── Dashboard
        └── ProactiveNudgeCard         ← speaks, or explains why it's quiet
    └── Coach
        └── CoachChatPanel             ← agent's bubbles play FIRST, once per id
```

`ProactiveNudgeCard` renders two very different things on purpose:

- **`speak`** — a card: urgency badge, headline, the personalised evidence as
  chips (*"Next transfer expected in about 6 days"*, *"Usually 600 USD from the
  United States"*, *"Usually sent via Wise"*, *"About every 12 days"*), the
  opening line, and a way into the conversation.
- **anything else** — one thin grey line saying why it stayed quiet.

That second state is the point of the feature. A dashboard always has something to
show; an agent has to earn the interruption, and rendering the silence is how you
can see it exercising judgement.

`CoachChatPanel` takes two **optional** props (`proactiveNudge`, `nudgeLoading`),
so it still works standalone. Its playback effect keys on a stable
`openingKey` (`'pending' | nudge.id | 'quiet'`) rather than the nudge object, and
records spoken ids in a ref — so a provider recompute or a scenario change can
never replay the agent's opening.

Colour always comes from the semantic status key (`good` / `wait` / `neutral` /
`warn`) via `toneToStatus()`. `warn` is reserved for a genuine fee warning.

### Two copy rules worth knowing before you edit `t.nudge`

- **`context.channel` is the *best* channel; `context.usualChannel` is the one
  they actually use.** A fee warning must name `usualChannel`. Using `channel`
  there tells the family their cheapest provider is ripping them off.
- **Percentages are quoted to one decimal place** (`1.6%`), not the dashboard's
  zero (`2%`), because the agent puts the number next to a rupee figure the
  family can check: 1.6% of the 7-day average on 600 USD *is* Rs 3,060, whereas
  2% would imply ~Rs 3,800. `context.diffLabel` deliberately stays at the
  dashboard's rounding, since it quotes that line verbatim.

Country articles (`"the United States"`) come from `t.nudge.country()`, because
which names take an article is a property of the language — the Sinhala and Tamil
translations will not share the list.

---

## Testing

```bash
npm test          # vitest run — 48 tests in this folder
```

`familyPattern.test.js` covers cadence maths (median, not mean — one odd gap must
not move it), the next-expected date, overdue handling, unordered input, corridor
and channel tie-breaks, confidence downgrades, and garbage input.

`nudgeEngine.test.js` is the spec for the judgement. Most of it asserts cases
where the agent says **nothing**, plus dismissal/cooldown identity behaviour and
that composed copy contains the real personalised values rather than placeholders.

Both suites are pure Node — no DOM, no jsdom, no network. "Today" is injectable
(`analyseFamilyPattern(history, todayIso)` and `decideNudge({ ..., now })`), so
nothing depends on when the suite runs.

---

## Pointing it at the real backend

Nothing in this folder talks to data directly; it all goes through
`src/services/api.js`. Flip `USE_MOCK_DATA` to `false` there and the agent uses
the live endpoints with no changes here.

Two contract notes for whoever wires that up:

1. `getHistory()` must return `date` as `"YYYY-MM-DD"`. Rows with an unparseable
   date are dropped, and fewer than 3 surviving rows means the agent stays
   silent — which is correct, not broken.
2. `getChannels(amount, pair)` must come back **best-first** (`channels[0]` is
   treated as the best available quote) with `flagged` and `feePercent` set. The
   fee rule depends on both.

The pair the agent prices is the **family's dominant corridor**, not whichever
currency tab the dashboard happens to be showing. That is deliberate: the nudge is
about their money, not the page they're on.
