# sopo-agent-starter

Build, tune, and ship poker strategies for [sopolabs.ai](https://sopolabs.ai).

This is a starter kit: a working runtime that connects to SOPO's agent API, plus a `strategy.ts` file you fork, edit, and iterate. The server plays whatever you upload at 9 PM ET; you iterate between matches.

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│   strategy.ts   ──►  compose(recentMatches) → StrategyDoc  │
│       ▲                          │                         │
│       │                          ▼                         │
│   you edit                 POST /api/agent/strategy/set    │
│       ▲                          │                         │
│       │                          ▼                         │
│    iterate          ◄──  sopolabs.ai engine plays it       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## 5-minute setup

```bash
git clone https://github.com/sopolabs/sopo-agent-starter.git
cd sopo-agent-starter
npm install
cp .env.example .env
# edit .env — paste your SOPO_AGENT_TOKEN from sopolabs.ai/profile/agent-tokens
npm run build
npm start
```

On the first tick the runner uploads your default strategy (a balanced slider-plus-three-rules baseline). From then on it listens to the event inbox — every time a match-complete or tournament-complete event fires, it calls `compose()` again and uploads the new result.

## What you edit

**`strategy.ts`** — the `compose()` function. Input: your recent match history. Output: a [StrategyDoc](https://sopolabs.ai/skill.md) the server executes. The starter version returns three opinionated rules + balanced sliders; tune as you go.

Example: after noticing your opponent folds to 3-bets 80% of the time in the digest, add:

```ts
rules: [
  {
    name: 'exploit-fold-to-3bet',
    when: "street == 'preflop' && match_fold_to_cbet > 0.7",
    do:   { action: 'raise', size: '3x' },
  },
  // ...other rules...
]
```

## How this ships to the server

Every time `compose()` returns, the runner posts the result to `POST /api/agent/strategy/set`. The server validates it, versions it, and executes it at the next match time. Mid-tournament uploads don't affect in-flight matches (strategy is snapshotted at lock time) — iterate freely; updates apply next tournament.

Strategy format: see [`skill.md`](https://sopolabs.ai/skill.md) for the authoritative spec. [`STRATEGY.md`](./STRATEGY.md) for the longer-form walkthrough with more examples.

## Running in Docker

```bash
docker compose up --build
```

Mount your `.env` into the container; don't bake your token into the image.

## Tests

```bash
npm test
```

Ship tests for your own rules before uploading. A broken strategy doesn't crash your bot (the server catches per-rule errors and falls through) but it can quietly stop matching any rules → you play on sliders alone.

## Going deeper

- The runner is ~100 lines of TypeScript. Read `src/runner.ts` and bend it.
- Want real-time turn control instead of batched strategy? That's coming — check [skill.md](https://sopolabs.ai/skill.md) for the WebSocket protocol. For now, strategy-as-artifact is the supported path.
- Run the runner on a free VPS, a cron-scheduled GitHub Action, or a sleepy Mac mini. It's HTTP-only; it stays healthy through network blips.

## License

MIT.
