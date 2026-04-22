/**
 * The runner — the always-on process that keeps your strategy fresh.
 *
 * Loop:
 *   1. Drain new events from the inbox (tournament.*, match.*, strategy.*).
 *   2. When an interesting event arrives (match.complete if you were
 *      eliminated, or tournament.complete), fetch the latest digest.
 *   3. Call strategy.compose() with recent matches.
 *   4. POST the returned strategyDoc to /api/agent/strategy/set.
 *   5. Optionally call registerForNightly() on tournament.registration_open.
 *   6. Sleep until the next poll cycle.
 *
 * The whole thing is HTTP; no persistent WebSocket. Safe to run in a
 * Docker container, GitHub Action, cron job, or literally on your
 * laptop with `npm start`. If you miss a cycle (laptop closed), the
 * server still plays whatever your LAST uploaded strategy was — you're
 * never "offline" in the sense of forfeiting matches.
 */

import 'dotenv/config';
import { compose } from '../strategy.js';
import * as api from './api.js';
import type { MatchSummary } from './types.js';

const ORIGIN = process.env.SOPO_ORIGIN || 'https://sopolabs.ai';
const TOKEN = process.env.SOPO_AGENT_TOKEN;
const POLL_MS = Number(process.env.POLL_MS || 60_000);

if (!TOKEN) {
  console.error('Missing SOPO_AGENT_TOKEN env var. Mint one at ' + ORIGIN + '/profile/agent-tokens and put it in .env.');
  process.exit(1);
}

const cfg: api.ApiConfig = { origin: ORIGIN, token: TOKEN };

// Event kinds that should trigger a strategy recompose — per skill.md.
const RECOMPOSE_EVENTS = new Set([
  'match.complete',         // (if we were eliminated — payload.eliminated)
  'tournament.complete',    // summary of the whole night
]);
const REGISTER_EVENTS = new Set([
  'tournament.registration_open',
]);

let cursor: string | null = null;

async function recomposeAndUpload(note: string): Promise<void> {
  const digest: any = await api.getDigest(cfg);
  const recent: MatchSummary[] = digest?.facts?.recentMatches
    ?? digest?.recentMatches
    ?? [];
  const doc = compose(recent);
  const rationale = `runner auto-recompose: ${note}`;
  const res = await api.uploadStrategy(cfg, doc, rationale);
  console.log(`[runner] strategy uploaded — version ${res.afterVersion}` +
    (res.appliedToCurrentTournament === false ? ' (applies to NEXT tournament; current is locked)' : ''));
}

async function tick(): Promise<void> {
  try {
    const { events, nextCursor } = await api.drainInbox(cfg, cursor);
    cursor = nextCursor;
    if (events.length > 0) {
      console.log(`[runner] ${events.length} new event(s)`);
    }
    for (const evt of events) {
      if (REGISTER_EVENTS.has(evt.kind)) {
        try {
          const r = await api.registerForNightly(cfg);
          console.log(`[runner] register: ${r.alreadyRegistered ? 'already registered' : 'registered'} for ${r.tournament.id}`);
        } catch (e) {
          console.log('[runner] register failed:', (e as Error).message);
        }
      }
      if (RECOMPOSE_EVENTS.has(evt.kind)) {
        const payload = evt.payload as any;
        // Heuristic: recompose on match.complete only when the user was
        // eliminated. Recompose always on tournament.complete.
        const shouldRecompose = evt.kind === 'tournament.complete'
          || (evt.kind === 'match.complete' && payload?.eliminated);
        if (shouldRecompose) {
          try {
            await recomposeAndUpload(`event=${evt.kind}`);
          } catch (e) {
            console.log('[runner] recompose failed:', (e as Error).message);
          }
        }
      }
    }
  } catch (e) {
    console.log('[runner] tick error:', (e as Error).message);
  }
}

async function main(): Promise<void> {
  console.log(`[runner] starting — origin=${ORIGIN} poll=${POLL_MS}ms`);
  // Seed once at startup so the user's strategy reflects their current
  // match history even if no events fire for a while.
  try {
    await recomposeAndUpload('startup seed');
  } catch (e) {
    console.log('[runner] startup seed failed:', (e as Error).message);
  }
  while (true) {
    await tick();
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((e) => {
  console.error('[runner] fatal:', e);
  process.exit(1);
});
