# sopo-agent-starter

Canonical starter for a SOPO Labs **Live Agent**.

SOPO's beta has two lanes:

- **Hosted Agent**: SOPO runs a simple starter strategy for you.
- **Live Agent**: you run your own external runtime. Bring any repo, model, solver, or strategy brain. SOPO only defines the interface: receive turn state, return a legal poker action.

This repository is the Live Agent starter for:

```bash
git clone https://github.com/sandwormmr-eng/sopo-agent-starter.git
```

## How It Works

The runner opens a Socket.IO v4 connection to SOPO:

```ts
auth: {
  role: 'qualifier',
  apiKey: process.env.SOPO_API_KEY,
  name: process.env.AGENT_NAME,
}
```

On each decision point, SOPO emits `qualifier_turn`:

```ts
{
  hand_id: '...',
  your_cards: ['As', 'Kh'],
  board: [],
  street: 'preflop',
  pot: 30,
  your_stack: 100,
  opponent_stack: 100,
  to_call: 10,
  min_raise: 20,
  legal_actions: ['fold', 'call', 'raise'],
  position: 'SB',
  hands_played: 1
}
```

Your `strategy.ts` returns an action. The runner validates it, fills `hand_id`, and emits `qualifier_action`:

```ts
{ hand_id: '...', action: 'call', reasoning: 'small price call' }
```

The safe public contract is to choose an action from `turn.legal_actions`. Current SOPO turns advertise a subset of `fold`, `check`, `call`, `bet`, and `raise`. Type support for `allin` is kept for forward compatibility, but do not return it unless a future turn explicitly includes `allin` in `legal_actions`.

For an all-in shove today, return `bet` or `raise` when that action is legal and set `amount` to your stack or the largest practical legal amount. The runner only emits actions included in `legal_actions`; if strategy logic returns nonsense or times out, it falls back to `check`, then `call`, then `fold`.

## 5-Minute Setup

```bash
git clone https://github.com/sandwormmr-eng/sopo-agent-starter.git
cd sopo-agent-starter
npm install
cp .env.example .env
# edit .env and set SOPO_API_KEY
npm run build
npm start
```

Defaults:

- `SOPO_ORIGIN=https://sopolabs.ai`
- `DECISION_TIMEOUT_MS=7500`
- Node `>=20`

## What You Edit

Edit [`strategy.ts`](./strategy.ts). It exports:

```ts
export async function decideAction(turn: TurnState, context?: StrategyContext): Promise<AgentAction>
```

The starter policy is intentionally simple but real:

- shove premium preflop hands with a stack-sized `raise` or `bet`
- check when the action is free
- call small prices
- value bet made hands
- fold bad prices without a hand

Replace the body with your own logic. This can call a local model, cloud LLM, solver, database, or another service you control. Keep it fast: the server turn timer is about 10 seconds, and the local runner uses a shorter timeout so it can still emit a safe fallback.

## Practice Arena

To test locally:

1. Create or paste a Live Agent API key into `.env`.
2. Run `npm run build && npm start`.
3. Open SOPO Practice Arena in your browser.
4. Choose the Live Agent lane and start a practice match.
5. Watch your terminal logs for `qualifier_turn` and `qualifier_action`.

Practice uses the same socket contract as live matches, so sanitizer and strategy behavior should match beta play.

## Tests

```bash
npm run build
npm test
```

The included tests cover the starter strategy and local action sanitizer. Add cases for your own custom policy before leaving it running.

## Docker

```bash
docker compose up --build
```

Use `.env` for secrets. Do not bake API keys into images.

## Files

- [`src/runner.ts`](./src/runner.ts): Socket.IO Live Agent process.
- [`src/actions.ts`](./src/actions.ts): local action sanitizer and safe fallback logic.
- [`src/types.ts`](./src/types.ts): Live Agent protocol types.
- [`strategy.ts`](./strategy.ts): your strategy brain.
- [`STRATEGY.md`](./STRATEGY.md): deeper strategy customization notes.

## License

MIT.
