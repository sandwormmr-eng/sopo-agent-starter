/**
 * Tests for YOUR strategy.ts. Run with `npm test`.
 *
 * Writing tests is how the serious SOPO grinders avoid shipping broken
 * rule sets. Before you upload a new strategy, make sure it at least
 * produces a well-formed StrategyDoc across the inputs you care about.
 *
 * This file ships with a few baseline tests. Add your own.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { compose } from '../strategy.js';
import type { MatchSummary } from '../src/types.js';

test('compose returns a valid StrategyDoc with no match history', () => {
  const doc = compose([]);
  assert.equal(doc.version, 1);
  assert.ok(doc.sliders, 'sliders should be present');
  assert.ok(Array.isArray(doc.rules), 'rules should be an array');
});

test('every slider value is in [0, 100]', () => {
  const doc = compose([]);
  for (const [name, v] of Object.entries(doc.sliders || {})) {
    assert.ok(typeof v === 'number' && v >= 0 && v <= 100,
      `slider ${name}=${v} out of range`);
  }
});

test('every rule has when + do.action', () => {
  const doc = compose([]);
  for (const rule of doc.rules || []) {
    assert.equal(typeof rule.when, 'string', `rule.when not a string: ${JSON.stringify(rule)}`);
    assert.ok(rule.when.length > 0, 'rule.when is empty');
    assert.ok(rule.do && typeof rule.do.action === 'string', 'rule.do.action missing');
    assert.ok(['fold','check','call','raise','bet','allin'].includes(rule.do.action),
      `unknown action: ${rule.do.action}`);
  }
});

test('compose handles a losing-streak history without crashing', () => {
  const matches: MatchSummary[] = Array.from({ length: 5 }, (_, i) => ({
    matchId: `m${i}`,
    tournamentId: 't',
    opponentName: `bot${i}`,
    didWin: false,
    totalHands: 40,
    totalPot: 200,
    startedAt: '2026-04-22T01:00:00Z',
    eloBefore: 1200,
    eloAfter: 1180 - i * 10,
  }));
  const doc = compose(matches);
  assert.ok(doc, 'compose should return a doc even after losses');
});
