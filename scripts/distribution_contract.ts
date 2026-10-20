import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export function resolvePackagedExecutable(root: string, pkg: { name: string; build: { productName: string } }, platform = process.platform, arch = process.arch): string {
  const name = pkg.build.productName;
  const suffix = arch === 'x64' ? '' : `-${arch}`;
  const relative = platform === 'win32' ? `win${suffix}-unpacked/${name}.exe`
    : platform === 'darwin' ? `mac${suffix}/${name}.app/Contents/MacOS/${name}` : `linux${suffix}-unpacked/${pkg.name}`;
  const executable = path.resolve(root, relative);
  if (!fs.existsSync(executable)) throw new Error(`Executável obrigatório ausente: ${executable}`);
  return executable;
}
export function requireSmokeEvidence(output: string): void {
  for (const stage of ['Interface', 'Preload', 'IPC', 'OCR', 'PDF-IO', 'Complete']) {
    if (!output.includes(`[PackagedSmoke:${stage}]`)) throw new Error(`Evidência obrigatória ausente: ${stage}`);
  }
}
export function nativeSignatureEnvironment(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const nativeEnv: NodeJS.ProcessEnv = { ...process.env, ...overrides };
  // An empty/inherited module path can hide Windows PowerShell's security cmdlet.
  delete nativeEnv.PSModulePath;
  for (const key of Object.keys(nativeEnv)) if (key.toLowerCase() === 'psmodulepath') delete nativeEnv[key];
  return nativeEnv;
}
export function verifyOfficialSignature(file: string, platform = process.platform): void {
  if (platform === 'win32') {
    const nativeEnv = nativeSignatureEnvironment({ KOVAX_SIGNATURE_FILE: path.resolve(file) });
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "$ErrorActionPreference = 'Stop'; $s = Get-AuthenticodeSignature -LiteralPath $env:KOVAX_SIGNATURE_FILE; if ($s.Status -ne 'Valid') { throw ('Authenticode inválido: ' + $s.Status) }"], { env: nativeEnv, stdio: 'pipe' });
  } else if (platform === 'darwin') {
    const target = file.includes('.app/') ? file.slice(0, file.indexOf('.app/') + 4) : file;
    execFileSync('codesign', ['--verify', '--deep', '--strict', target], { stdio: 'pipe' });
    execFileSync('spctl', ['--assess', '--type', file.endsWith('.dmg') ? 'open' : 'execute', target], { stdio: 'pipe' });
  }
}
export function distributionChannel(env: NodeJS.ProcessEnv = process.env): 'official' | 'internal' {
  if (env.DISTRIBUTION_CHANNEL === 'official') return 'official';
  if (env.DISTRIBUTION_CHANNEL !== 'internal' || env.ALLOW_UNSIGNED_INTERNAL !== 'true') throw new Error('Canal interno exige DISTRIBUTION_CHANNEL=internal e ALLOW_UNSIGNED_INTERNAL=true explícitos');
  return 'internal';
}
