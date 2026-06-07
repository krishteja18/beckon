// Side-effecting import: loads Supabase admin credentials from a gitignored
// env file so the db:* scripts work without exporting shell variables.
// First file found (repo root) wins: .env.supabase → .env.local → .env
// All of these are gitignored. Shell-provided vars are NOT overwritten.
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const before = { ref: process.env.SUPABASE_PROJECT_REF, token: process.env.SUPABASE_ACCESS_TOKEN };

for (const name of ['.env.supabase', '.env.local', '.env']) {
  const p = resolve(root, name);
  if (existsSync(p)) {
    try { process.loadEnvFile(p); } catch { /* malformed file — ignore */ }
    break;
  }
}

// Let an explicit shell value win over the file (handy for one-off overrides).
if (before.ref) process.env.SUPABASE_PROJECT_REF = before.ref;
if (before.token) process.env.SUPABASE_ACCESS_TOKEN = before.token;
