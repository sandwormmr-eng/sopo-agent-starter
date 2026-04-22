/**
 * One-off: RSVP for tonight's Nightly. Run with `npm run register`.
 *
 * Useful for smoke-testing your setup before the runner's event loop
 * triggers it, or if you just want to RSVP manually without the runner
 * running.
 */
import 'dotenv/config';
import { registerForNightly, type ApiConfig } from './api.js';

const ORIGIN = process.env.SOPO_ORIGIN || 'https://sopolabs.ai';
const TOKEN = process.env.SOPO_AGENT_TOKEN;

if (!TOKEN) {
  console.error('Missing SOPO_AGENT_TOKEN env var.');
  process.exit(1);
}

const cfg: ApiConfig = { origin: ORIGIN, token: TOKEN };

(async () => {
  try {
    const r = await registerForNightly(cfg, process.argv[2]);
    console.log(`${r.alreadyRegistered ? 'already' : 'newly'} registered for ${r.tournament.id} (fires at ${r.tournament.scheduledFor})`);
  } catch (e) {
    console.error('register failed:', (e as Error).message);
    process.exit(1);
  }
})();
