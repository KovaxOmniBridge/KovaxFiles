import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const RELEVANT_SOURCE_REGEX = /^(src\/|electron\/|scripts\/|\.github\/workflows\/|public\/|index\.html$|package(?:-lock)?\.json$|vite\.config|tsconfig|tailwind\.config|postcss\.config|\.gitattributes$|por\.traineddata$)/;

export const KNOWN_BINARY_EXTENSIONS = new Set([
  '.traineddata',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.wasm',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.icns',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.bin'
]);

export function isBinaryFile(filePath: string, buffer: Buffer): boolean {
  const ext = path.extname(filePath).toLowerCase();
  if (KNOWN_BINARY_EXTENSIONS.has(ext)) return true;
  const len = Math.min(buffer.length, 8192);
  for (let i = 0; i < len; i++) {
    if (buffer[i] === 0x00) return true;
  }
  return false;
}

export function canonicalContentBuffer(filePath: string, buffer: Buffer): Buffer {
  if (isBinaryFile(filePath, buffer)) {
    return buffer;
  }
  const normalized = buffer.toString('utf8').replace(/\r\n/g, '\n');
  return Buffer.from(normalized, 'utf8');
}

export function computeCanonicalSourceDigest(fileEntries?: { file: string; content: Buffer }[]): string {
  const hash = crypto.createHash('sha256');
  hash.update('kovax-canonical-source-v2\0');

  if (fileEntries) {
    const sorted = [...fileEntries].sort((a, b) => a.file.localeCompare(b.file));
    for (const entry of sorted) {
      const normalizedPath = entry.file.replace(/\\/g, '/');
      const canonicalBuffer = canonicalContentBuffer(normalizedPath, entry.content);
      hash.update(normalizedPath);
      hash.update('\0');
      hash.update(canonicalBuffer);
      hash.update('\0');
    }
    return hash.digest('hex');
  }

  const rawFileList = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
    .trim()
    .split(/\r?\n/)
    .filter(f => f.length > 0 && RELEVANT_SOURCE_REGEX.test(f) && fs.existsSync(f))
    .sort();

  for (const file of rawFileList) {
    const normalizedPath = file.replace(/\\/g, '/');
    const rawBuffer = fs.readFileSync(file);
    const canonicalBuffer = canonicalContentBuffer(normalizedPath, rawBuffer);
    hash.update(normalizedPath);
    hash.update('\0');
    hash.update(canonicalBuffer);
    hash.update('\0');
  }
  return hash.digest('hex');
}

export function sourceDigest(): string {
  return computeCanonicalSourceDigest();
}

export function distributionRoot(): string {
  if (process.env.RELEASE_DIR) return path.resolve(process.env.RELEASE_DIR);
  const pointer = JSON.parse(fs.readFileSync('release/last-run.json', 'utf8'));
  return path.resolve(pointer.directory);
}
