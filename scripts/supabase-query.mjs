// Run an ad-hoc SELECT against the Supabase Management API.
// Usage: node scripts/supabase-query.mjs "select count(*) from frameworks"
// Requires SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN env vars.

import './_loadEnv.mjs';
import { writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const sql = process.argv.slice(2).join(' ');
if (!sql) {
  console.error('usage: supabase-query.mjs "<sql>"');
  process.exit(2);
}

const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) {
  console.error('SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN must be set');
  process.exit(2);
}

const payloadPath = `${tmpdir()}/supabase-${randomUUID()}.json`;
writeFileSync(payloadPath, JSON.stringify({ query: sql }));

const result = spawnSync(
  'curl',
  [
    '-sS',
    '-X', 'POST',
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    '-H', `Authorization: Bearer ${token}`,
    '-H', 'Content-Type: application/json',
    '--data-binary', `@${payloadPath}`,
  ],
  { encoding: 'utf8' },
);

try { unlinkSync(payloadPath); } catch {}

console.log(result.stdout || result.stderr);
