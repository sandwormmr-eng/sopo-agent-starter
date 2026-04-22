/**
 * Thin HTTP client for the SOPO agent API. Only covers the endpoints
 * the starter kit needs. Full surface in https://sopolabs.ai/skill.md.
 */
import type { MatchSummary, StrategyDoc } from './types.js';

export interface ApiConfig {
  /** SOPO origin. Defaults to https://sopolabs.ai. Point at staging for dry runs. */
  origin: string;
  /** Agent-A bearer token. Mint at https://sopolabs.ai/profile/agent-tokens.
   *  Token must carry the scopes you intend to use: read:digest,
   *  read:inbox, write:strategy (for uploadStrategy), write:register
   *  (for registerForNightly). */
  token: string;
}

async function call<T>(cfg: ApiConfig, method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const res = await fetch(cfg.origin + path, {
    method,
    headers: {
      'Authorization': 'Bearer ' + cfg.token,
      'Accept': 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`${method} ${path} failed: ${res.status} ${txt.slice(0, 200)}`);
  }
  return await res.json() as T;
}

/** Pull the latest digest — includes recent matches, derived stats, and
 *  the current agentConfig snapshot. */
export async function getDigest(cfg: ApiConfig): Promise<{
  recentMatches?: MatchSummary[];
  agentConfig?: { sliders?: Record<string, number>; strategyDoc?: StrategyDoc };
  [k: string]: unknown;
}> {
  const res = await call<{ success: boolean; digest: unknown }>(cfg, 'GET', '/api/agent/digest');
  // Digest envelope varies by server version; return the inner payload
  // if present, else the top-level object.
  return (res.digest || res) as any;
}

/** Drain events from the inbox starting at `cursor`. Subscribe to specific
 *  event kinds you care about — see skill.md for the full list. */
export async function drainInbox(
  cfg: ApiConfig,
  cursor: string | null,
): Promise<{ events: Array<{ kind: string; seq: number; at: string; payload: unknown }>; nextCursor: string | null }> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return await call(cfg, 'GET', `/api/agent/inbox${qs}`);
}

/** Overwrite the user's strategy. Returns the new agentConfig version. */
export async function uploadStrategy(
  cfg: ApiConfig,
  doc: StrategyDoc,
  rationale?: string,
): Promise<{ success: boolean; afterVersion: number; appliedToCurrentTournament?: boolean }> {
  return await call(cfg, 'POST', '/api/agent/strategy/set', {
    strategyDoc: doc,
    // Also pass sliders inline so the server's validator is happy even
    // if they choose to copy the knobs into the top-level agentConfig.
    sliders: doc.sliders,
    rationale: rationale || undefined,
  });
}

/** RSVP your human for an upcoming Nightly. Idempotent. */
export async function registerForNightly(
  cfg: ApiConfig,
  tournamentId?: string,
): Promise<{ success: boolean; alreadyRegistered: boolean; tournament: { id: string; status: string; scheduledFor: string } }> {
  return await call(cfg, 'POST', '/api/agent/nightly/register', tournamentId ? { tournamentId } : {});
}
