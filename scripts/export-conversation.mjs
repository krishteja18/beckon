// Export the current Claude Code conversation to a markdown file.
// Usage: node scripts/export-conversation.mjs
//
// Reads the conversation JSONL from your .claude dir and writes
// `conversation.md` next to it (and copies to the project root).

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

const projectsDir = join(homedir(), '.claude', 'projects');
const targetProject = 'c--Users-KrishnaDachepalli-showup';
const dir = join(projectsDir, targetProject);

const files = readdirSync(dir)
  .filter(f => f.endsWith('.jsonl'))
  .map(f => ({ name: f, path: join(dir, f), mtime: statSync(join(dir, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);

if (files.length === 0) {
  console.error('No conversation files found.');
  process.exit(1);
}

const latest = files[0];
console.log('Reading:', latest.path);

const raw = readFileSync(latest.path, 'utf8');
const lines = raw.split('\n').filter(Boolean);

const md = [];
md.push(`# Showup — Build Session Conversation\n`);
md.push(`Exported: ${new Date().toISOString()}\n`);
md.push(`Source: \`${latest.name}\`\n\n---\n`);

for (const line of lines) {
  let msg;
  try { msg = JSON.parse(line); } catch { continue; }

  // Skip system / meta entries
  const type = msg.type;
  if (type !== 'user' && type !== 'assistant') continue;

  const role = type === 'user' ? '## 🧑 User' : '## 🤖 Claude';
  let content = '';

  // Content can be string OR array of blocks
  if (typeof msg.message?.content === 'string') {
    content = msg.message.content;
  } else if (Array.isArray(msg.message?.content)) {
    for (const block of msg.message.content) {
      if (block.type === 'text') {
        content += block.text + '\n\n';
      } else if (block.type === 'tool_use') {
        const summary = block.name === 'Bash'      ? `\`${(block.input?.command ?? '').slice(0, 80)}\``
                      : block.name === 'Edit'      ? `Edit \`${block.input?.file_path ?? ''}\``
                      : block.name === 'Write'     ? `Write \`${block.input?.file_path ?? ''}\``
                      : block.name === 'Read'      ? `Read \`${block.input?.file_path ?? ''}\``
                      : block.name === 'Glob'      ? `Glob \`${block.input?.pattern ?? ''}\``
                      : block.name === 'Grep'      ? `Grep \`${block.input?.pattern ?? ''}\``
                      : block.name;
        content += `> **🔧 ${block.name}:** ${summary}\n\n`;
      } else if (block.type === 'tool_result') {
        const text = typeof block.content === 'string'
          ? block.content
          : Array.isArray(block.content)
            ? block.content.map(c => c.text ?? '').join('\n')
            : '';
        const trimmed = text.length > 600 ? text.slice(0, 600) + '\n... [truncated]' : text;
        content += `> _tool result:_\n> \`\`\`\n> ${trimmed.replace(/\n/g, '\n> ')}\n> \`\`\`\n\n`;
      }
    }
  }

  if (!content.trim()) continue;

  md.push(`${role}\n\n${content.trim()}\n\n---\n\n`);
}

const out = resolve('conversation.md');
writeFileSync(out, md.join(''));
console.log(`Wrote: ${out}`);
console.log(`Size: ${(md.join('').length / 1024).toFixed(0)} KB`);
