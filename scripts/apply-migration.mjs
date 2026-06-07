// Apply a Supabase migration via the Management API.
// Usage: node scripts/apply-migration.mjs supabase/migrations/0001_schema.sql
// Requires SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN env vars.
//
// Uses curl under the hood (not node:fetch) because corp TLS proxies often
// break Node's default cert store. Curl uses the OS cert store and just works.

import './_loadEnv.mjs';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const [, , file] = process.argv;
if (!file) {
  console.error('usage: apply-migration.mjs <path-to-sql-file>');
  process.exit(2);
}

const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) {
  console.error('SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN must be set');
  process.exit(2);
}

const sql = readFileSync(resolve(file), 'utf8');
const payloadPath = `${tmpdir()}/supabase-${randomUUID()}.json`;
writeFileSync(payloadPath, JSON.stringify({ query: sql }));

const result = spawnSync(
  'curl',
  [
    '-sS',
    '-w', '\n__HTTP_STATUS__:%{http_code}\n',
    '-X', 'POST',
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    '-H', `Authorization: Bearer ${token}`,
    '-H', 'Content-Type: application/json',
    '--data-binary', `@${payloadPath}`,
  ],
  { encoding: 'utf8' },
);

try { unlinkSync(payloadPath); } catch {}

const out = (result.stdout || '') + (result.stderr || '');
const m = out.match(/__HTTP_STATUS__:(\d+)/);
const status = m ? Number(m[1]) : 0;
const body = m ? out.slice(0, m.index).trim() : out;

if (status >= 200 && status < 300) {
  console.log(`OK ${status}`);
  console.log(body.length > 800 ? body.slice(0, 800) + '…' : body);
  process.exit(0);
} else {
  console.error(`HTTP ${status || 'unknown'}`);
  console.error(body);
  process.exit(1);
}
