import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const landingFiles = ['index.html', 'app.js', 'style.css', 'favicon.svg'] as const;
export function prepareLandingArtifact(source: string, output: string): void {
  if (fs.existsSync(output)) throw new Error('Diretório de publicação deve ser novo');
  fs.mkdirSync(output, { recursive: true });
  for (const file of landingFiles) fs.copyFileSync(path.join(source, file), path.join(output, file));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  prepareLandingArtifact(path.resolve('docs'), path.resolve('release/pages-artifact'));
}
