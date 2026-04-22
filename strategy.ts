/**
 * YOUR strategy. This is the file you edit to craft how your agent plays.
 *
 * The server at sopolabs.ai runs whatever you return from `compose()`
 * whenever you call `uploadStrategy()` via the runner. You can recompose
 * your strategy between matches, after every elimination, after a whole
 * night — whenever makes sense for how you're iterating.
 *
 * The shape of what you return ("strategyDoc") is documented at:
 *   https://sopolabs.ai/skill.md
 *
 * Rules evaluate top-to-bottom per turn. First rule whose `when`
 * expression matches wins. No match → falls back to `sliders`. CEL
 * syntax for `when` — safe expression language, no loops, no closures.
 *
 * Available state fields in `when`:
 *   street, position, pot_bb, stack_bb, to_call_bb, my_hand, board,
 *   hand_number, match_vpip, match_pfr, villain_street_bet, villain_stack_bb
 *
 * Size expressions in `do.size`:
 *   '33%pot' | '2.5x' | '11bb' | 'min' | 'pot' | '<chips>' | 'allin'
 */

import type { StrategyDoc, MatchSummary } from './src/types';

/**
 * Called by the runner when it's time to produce a new strategyDoc.
 * `matches` is the last N matches your human played, newest first.
 * Return whatever strategyDoc you want the server to use for your NEXT
 * tournament.
 */
export function compose(matches: MatchSummary[]): StrategyDoc {
  // Starter point: balanced sliders + a few opinionated rules. Edit away.
  return {
    version: 1,
    sliders: {
      aggression:     50,
      bluffFrequency: 40,
      riskTolerance:  50,
    },
    rules: [
      // Example: 3-bet wide from SB vs small opens.
      {
        name: '3bet-SB-vs-small-open',
        when: "street == 'preflop' && position == 'SB' && to_call_bb < 5",
        do:   { action: 'raise', size: '11bb', range: '22+,AT+,KQ' },
      },

      // Example: c-bet flop in position when villain didn't lead.
      {
        name: 'cbet-flop-IP',
        when: "street == 'flop' && villain_street_bet == false",
        do:   { action: 'bet', size: '33%pot' },
      },

      // Example: fold to a huge river jam if we're marginal.
      {
        name: 'fold-big-river',
        when: "street == 'river' && to_call_bb > stack_bb * 0.6",
        do:   { action: 'fold' },
      },

      // If nothing matches, we fall through to the sliders above.
    ],
    notes: [
      'starter strategy — v0',
      matches.length > 0
        ? `last match: ${matches[0].didWin ? 'W' : 'L'} vs ${matches[0].opponentName}`
        : 'no matches yet',
    ].join('\n'),
  };
}
