import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { verifyArtifactDirectory, hashFile } from '../../scripts/distribution_artifacts';
import { distributionRoot, sourceDigest } from '../../scripts/distribution_provenance';
import { resolvePackagedExecutable, requireSmokeEvidence, distributionChannel } from '../../scripts/distribution_contract';

const root = distributionRoot();
const mode = process.argv.includes('--journey') ? 'journey' : 'smoke';
const fault = process.argv.find(a => a.startsWith('--fault='))?.split('=')[1];
const evidenceDir = path.join(root, 'evidence', fault ? mode + '-negative-' + fault : mode);
fs.mkdirSync(evidenceDir, { recursive: true });
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'kovax-package-'));
fs.writeFileSync(path.join(evidenceDir, 'result.json'), JSON.stringify({ status: 'running', mode, automatedPackagedSmoke: 'running', cleanMachineAcceptance: 'pending' }));
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const executable = resolvePackagedExecutable(root, pkg);
  const channel = distributionChannel();
  const platform = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux';
  const { identity, records } = verifyArtifactDirectory(root, pkg, { platform, architecture: process.arch, channel, sourceDigest: sourceDigest() });
  const payloadPath = process.platform === 'darwin' ? path.resolve(path.dirname(executable), '../Resources/app.asar') : path.join(path.dirname(executable), 'resources/app.asar');
  console.log(`Canal ${channel}: ${channel === 'internal' ? 'NÃO HOMOLOGADO' : 'assinatura obrigatória'}`);
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'production', TEMP: temp, TMP: temp, TMPDIR: temp,
    PATH: (process.env.PATH || '').split(path.delimiter).filter(p => !/node|python|npm|\.venv/i.test(p)).join(path.delimiter) };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  delete env.VITE_DEV_SERVER_URL;
  const run = spawnSync(executable, [mode === 'journey' ? '--document-journey' : '--smoke-test', ...(fault ? ['--journey-fault=' + fault] : []), `--user-data-dir=${path.join(temp, 'profile')}`], { cwd: temp, env, encoding: 'utf8', timeout: 180_000, maxBuffer: 16 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  fs.writeFileSync(path.join(evidenceDir, mode + '.log'), output);
  if (run.error || run.status !== 0) throw new Error(`Smoke falhou: ${run.error?.message || run.status}\n${output}`);
  if (mode === 'smoke') requireSmokeEvidence(output);
  else for (const stage of ['Import', 'Process', 'SaveIPC', 'Reopen', 'Complete']) {
    if (!output.includes('[DocumentJourney:' + stage + ']')) throw new Error('Evidência de jornada ausente: ' + stage);
  }
  fs.writeFileSync(path.join(evidenceDir, 'result.json'), JSON.stringify({ ...identity, status: 'passed', mode, artifacts: records, channel, executable,
    executableSha256: crypto.createHash('sha256').update(fs.readFileSync(executable)).digest('hex'),
    payloadPath, payloadSha256: hashFile(payloadPath),
    version: pkg.version, architecture: process.arch,
    automatedPackagedSmoke: mode, cleanMachineAcceptance: 'pending' }, null, 2));
  console.log(output);
} catch (error) {
  fs.writeFileSync(path.join(evidenceDir, 'failure.txt'), String(error));
  fs.writeFileSync(path.join(evidenceDir, 'result.json'), JSON.stringify({ status: 'failed', mode, automatedPackagedSmoke: 'failed', error: String(error), cleanMachineAcceptance: 'pending' }, null, 2));
  console.error(error);
  process.exitCode = 1;
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
