import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolvePackagedExecutable, requireSmokeEvidence, distributionChannel } from '../../scripts/distribution_contract';

const evidenceDir = path.resolve(process.env.RELEASE_DIR || 'release', 'evidence');
fs.mkdirSync(evidenceDir, { recursive: true });
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'kovax-package-'));
fs.writeFileSync(path.join(evidenceDir, 'result.json'), JSON.stringify({ automatedPackagedSmoke: 'running', cleanMachineAcceptance: 'pending' }));
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const executable = resolvePackagedExecutable(process.env.RELEASE_DIR || pkg.build.directories.output, pkg);
  const channel = distributionChannel();
  console.log(`Canal ${channel}: ${channel === 'internal' ? 'NÃO HOMOLOGADO' : 'assinatura obrigatória'}`);
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'production', TEMP: temp, TMP: temp, TMPDIR: temp,
    PATH: (process.env.PATH || '').split(path.delimiter).filter(p => !/node|python|npm|\.venv/i.test(p)).join(path.delimiter) };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  delete env.VITE_DEV_SERVER_URL;
  const run = spawnSync(executable, ['--smoke-test', `--user-data-dir=${path.join(temp, 'profile')}`], { cwd: temp, env, encoding: 'utf8', timeout: 180_000, maxBuffer: 16 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  fs.writeFileSync(path.join(evidenceDir, 'packaged-smoke.log'), output);
  if (run.error || run.status !== 0) throw new Error(`Smoke falhou: ${run.error?.message || run.status}\n${output}`);
  requireSmokeEvidence(output);
  fs.writeFileSync(path.join(evidenceDir, 'result.json'), JSON.stringify({ channel, executable,
    executableSha256: crypto.createHash('sha256').update(fs.readFileSync(executable)).digest('hex'),
    version: pkg.version, architecture: process.arch,
    automatedPackagedSmoke: 'passed', cleanMachineAcceptance: 'pending' }, null, 2));
  console.log(output);
} catch (error) {
  fs.writeFileSync(path.join(evidenceDir, 'failure.txt'), String(error));
  fs.writeFileSync(path.join(evidenceDir, 'result.json'), JSON.stringify({ automatedPackagedSmoke: 'failed', error: String(error), cleanMachineAcceptance: 'pending' }, null, 2));
  console.error(error);
  process.exitCode = 1;
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
