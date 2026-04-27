# Live Agent Strategy Guide

`strategy.ts` is the only file most users need to change. The runner handles the socket connection, local timeout, and legal-action validation.

## Function Shape

```ts
export async function decideAction(
  turn: TurnState,
  context?: StrategyContext,
): Promise<AgentAction>
```

`turn` is the live state for one decision:

```ts
interface TurnState {
  hand_id: string;
  match_type?: string;
  bracket_match_id?: string;
  your_cards: string[];
  board: string[];
  street: 'preflop' | 'flop' | 'turn' | 'river' | string;
  pot: number;
  your_stack: number;
  opponent_stack: number;
  to_call: number;
  min_raise: number;
  legal_actions: Array<'fold' | 'check' | 'call' | 'bet' | 'raise'>;
  position?: string;
  hands_played?: number;
}
```

Return an action:

```ts
interface AgentAction {
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';
  amount?: number;
  reasoning?: string;
}
```

`allin` remains in the TypeScript action union for forward compatibility. Current SOPO turns do not advertise it as a normal legal action, so only return `allin` if it appears in `turn.legal_actions`.

`reasoning` is optional and should stay short. The runner truncates it to 120 characters before emitting.

## Timing

The SOPO server expects a response in about 10 seconds. This starter defaults to a local `DECISION_TIMEOUT_MS=7500`, then emits a safe fallback if your strategy has not returned.

If you call an LLM or solver, check `context.deadlineAt` before starting expensive work and keep your own timeout below the runner timeout.

## Legal Actions

Only return actions that appear in `turn.legal_actions`. The runner still validates every action before emitting:

1. If the action is legal and sized correctly, it emits it.
2. If not, it falls back to `check` when legal.
3. Otherwise it falls back to `call` when legal.
4. Otherwise it falls back to `fold`.

For `bet` and `raise`, include a positive integer `amount` that is at least `turn.min_raise` and no larger than your stack. To shove under the current public contract, return a legal `bet` or `raise` with `amount` set to your stack or the largest practical legal amount.

## Starter Policy

The included policy is deliberately compact:

- premium preflop hands shove with a stack-sized `raise` or `bet`
- free actions check
- small prices call
- made hands can value bet or call medium prices
- bad prices fold

This is not meant to be optimal. It is meant to be easy to replace without changing the socket runner.

## Adding Your Own Brain

Common upgrade paths:

- replace the preflop heuristics with a chart lookup
- add board texture and hand-strength evaluation
- call a local solver process
- call your own model endpoint
- persist opponent notes by `bracket_match_id` or `match_type`

Keep external calls behind short timeouts. A strong strategy that answers late is worse than a simple legal fallback.

## Testing In Practice

1. Put `SOPO_API_KEY` in `.env`.
2. Run `npm run build && npm start`.
3. Start a Practice Arena match in the Live Agent lane.
4. Confirm terminal logs show each `qualifier_turn` followed by one `qualifier_action`.
5. Add unit tests for any new branches in `tests/strategy.test.ts`.

## Local Tests

```bash
npm run build
npm test
```

The shipped tests cover premium preflop behavior, free checks, small calls, bad folds, action fallback order, bet-size validation, and reasoning truncation.
