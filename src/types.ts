// Types mirroring the server's strategy-rules schema. Keep this file
// in sync with https://sopolabs.ai/skill.md. Server validates + rejects
// malformed docs; we duplicate types here so the user gets IDE autocomplete.

export type ActionKind = 'fold' | 'check' | 'call' | 'raise' | 'bet' | 'allin';

export interface StrategyAction {
  action: ActionKind;
  /** Size hint — "33%pot" | "2.5x" | "11bb" | "min" | "pot" | a bare chip number. */
  size?: string;
  /** Optional preflop range hint (PokerStove syntax). */
  range?: string;
}

export interface StrategyRule {
  name?: string;
  /** CEL expression over the turn state. True => fire this rule's action. */
  when: string;
  do: StrategyAction;
}

export interface StrategyDoc {
  version?: 1;
  sliders?: Record<string, number>;
  rules?: StrategyRule[];
  notes?: string;
}

/** One hand from the digest's recent-matches array. */
export interface MatchSummary {
  matchId: string;
  tournamentId: string;
  opponentName: string;
  didWin: boolean;
  totalHands: number;
  totalPot: number;
  startedAt: string;   // ISO
  completedAt?: string;
  eloBefore: number;
  eloAfter: number;
}
