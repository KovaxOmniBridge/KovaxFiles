import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

export function sourceDigest(): string {
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(f => /^(src\/|electron\/|scripts\/|\.github\/workflows\/|package(?:-lock)?\.json$|vite\.config|tsconfig)/.test(f)).sort();
  const hash = crypto.createHash('sha256');
  for (const file of files) { hash.update(file); hash.update(fs.readFileSync(file)); }
  return hash.digest('hex');
}
export function distributionRoot(): string {
  if (process.env.RELEASE_DIR) return path.resolve(process.env.RELEASE_DIR);
  const pointer = JSON.parse(fs.readFileSync('release/last-run.json', 'utf8'));
  return path.resolve(pointer.directory);
}
