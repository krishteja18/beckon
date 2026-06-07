// Regenerate src/services/database.types.ts from the live Supabase project.
// Run after applying a migration so the typed client stays in sync.
//
// Usage: node scripts/generate-types.mjs
// Requires SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN env vars.
//
// Uses curl under the hood for the same corp-TLS reasons as apply-migration.mjs.

import './_loadEnv.mjs';
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) {
  console.error('SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN must be set');
  process.exit(2);
}

const result = spawnSync(
  'curl',
  [
    '-sS',
    `https://api.supabase.com/v1/projects/${ref}/types/typescript`,
    '-H', `Authorization: Bearer ${token}`,
  ],
  { encoding: 'utf8' },
);

if (result.status !== 0) {
  console.error('curl failed');
  console.error(result.stderr);
  process.exit(1);
}

const parsed = JSON.parse(result.stdout);
if (!parsed.types) {
  console.error('Unexpected response shape:');
  console.error(result.stdout);
  process.exit(1);
}

const outPath = resolve('src/services/database.types.ts');
writeFileSync(outPath, parsed.types);
console.log(`wrote ${outPath} (${parsed.types.length} chars)`);
