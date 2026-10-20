import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { hashFile, type ArtifactRecord, type BuildIdentity, type DistributionPlatform } from './distribution_artifacts';

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

export type ProofMode = 'smoke' | 'journey' | 'journey-negative';

export interface DistributionProof {
  mode: ProofMode;
  status: 'passed' | 'failed' | 'running';
  runId: string;
  sourceDigest: string;
  platform: DistributionPlatform;
  architecture: string;
  artifacts?: ArtifactRecord[];
  commit: string;
  executable?: string;
  executableSha256?: string;
  payloadPath?: string;
  payloadSha256?: string;
  [key: string]: unknown;
}

export interface ProofVerificationOptions {
  checkExecutableAndPayload?: boolean;
}

export function validateDistributionProof(
  proof: unknown,
  expectedMode: ProofMode,
  identity: BuildIdentity,
  expectedRecords?: ArtifactRecord[],
  options?: ProofVerificationOptions
): DistributionProof {
  if (!proof || typeof proof !== 'object') {
    throw new Error(`[CONTRATO DE PROVA] Evidência ausente ou inválida para modo ${expectedMode}`);
  }
  const p = proof as DistributionProof;
  const modeLabel = expectedMode === 'journey-negative' ? 'jornada negativa' : expectedMode === 'journey' ? 'jornada' : 'smoke';
  const capLabel = expectedMode === 'journey-negative' ? 'Jornada negativa' : expectedMode === 'journey' ? 'Jornada' : 'Smoke';

  assert.equal(p.mode, expectedMode, `Tipo de prova incorreto para ${expectedMode}: esperado ${expectedMode}, obtido ${p.mode}`);
  assert.equal(p.status, 'passed', `Evidência de ${modeLabel} reprovada para ${identity.platform}: status "${p.status}"`);
  assert.equal(p.runId, identity.runId, `${capLabel} pertence a outra execução para ${identity.platform}: ${p.runId} vs ${identity.runId}`);
  if (p.commit === undefined || p.commit === null) {
    throw new Error(`Commit ausente em ${modeLabel} para ${identity.platform}`);
  }
  if (typeof p.commit !== 'string' || p.commit.trim().length === 0) {
    throw new Error(`Commit vazio em ${modeLabel} para ${identity.platform}`);
  }
  assert.equal(p.commit, identity.commit, `Commit divergente em ${modeLabel} para ${identity.platform}: ${p.commit} vs ${identity.commit}`);
  assert.equal(p.sourceDigest, identity.sourceDigest, `Digest de fontes divergente em ${modeLabel} para ${identity.platform}: ${p.sourceDigest} vs ${identity.sourceDigest}`);
  assert.equal(p.platform, identity.platform, `Plataforma divergente em ${modeLabel} para ${identity.platform}`);
  assert.equal(p.architecture, identity.architecture, `Arquitetura divergente em ${modeLabel} para ${identity.platform}`);

  if (expectedRecords) {
    assert.deepEqual(p.artifacts, expectedRecords, `Artefatos de ${modeLabel} divergem dos declarados para ${identity.platform}`);
  }

  if (options?.checkExecutableAndPayload) {
    if (!p.executable || typeof p.executable !== 'string') {
      throw new Error(`Caminho do executável ausente na prova ${expectedMode}`);
    }
    if (!p.payloadPath || typeof p.payloadPath !== 'string') {
      throw new Error(`Caminho do payload ausente na prova ${expectedMode}`);
    }
    assert.equal(p.executableSha256, hashFile(p.executable), `Executável mudou após a validação de ${expectedMode}`);
    assert.equal(p.payloadSha256, hashFile(p.payloadPath), `Payload mudou após a validação de ${expectedMode}`);
  }

  return p;
}

export function readAndValidateDistributionProof(
  resultPath: string,
  expectedMode: ProofMode,
  identity: BuildIdentity,
  expectedRecords?: ArtifactRecord[],
  options?: ProofVerificationOptions
): DistributionProof {
  const modeLabel = expectedMode === 'journey-negative' ? 'jornada negativa' : expectedMode === 'journey' ? 'jornada positiva' : 'smoke';
  if (!fs.existsSync(resultPath)) {
    throw new Error(`[ERRO DE DISTRIBUIÇÃO] Evidência de ${modeLabel} ausente para ${identity.platform}: ${resultPath}`);
  }
  const proof = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  return validateDistributionProof(proof, expectedMode, identity, expectedRecords, options);
}

export interface InstallersProof {
  runId: string;
  sourceDigest: string;
  platform: DistributionPlatform;
  architecture: string;
  records: ArtifactRecord[];
  commit: string;
  classification?: string;
  [key: string]: unknown;
}

export function validateInstallersProof(
  installers: unknown,
  identity: BuildIdentity,
  expectedRecords: ArtifactRecord[]
): InstallersProof {
  if (!installers || typeof installers !== 'object') {
    throw new Error('[CONTRATO DE PROVA] Evidência de instaladores ausente ou inválida');
  }
  const inst = installers as InstallersProof;
  assert.equal(inst.runId, identity.runId, `Instaladores pertencem a outra execução para ${identity.platform}`);
  if (inst.commit === undefined || inst.commit === null) {
    throw new Error(`Commit ausente em instaladores para ${identity.platform}`);
  }
  if (typeof inst.commit !== 'string' || inst.commit.trim().length === 0) {
    throw new Error(`Commit vazio em instaladores para ${identity.platform}`);
  }
  assert.equal(inst.commit, identity.commit, `Commit divergente em instaladores para ${identity.platform}: ${inst.commit} vs ${identity.commit}`);
  assert.equal(inst.sourceDigest, identity.sourceDigest, `Digest de fontes divergente em instaladores para ${identity.platform}`);
  assert.equal(inst.platform, identity.platform, `Plataforma divergente em instaladores para ${identity.platform}`);
  assert.equal(inst.architecture, identity.architecture, `Arquitetura divergente em instaladores para ${identity.platform}`);
  assert.deepEqual(inst.records, expectedRecords, `Registros de instaladores divergem para ${identity.platform}`);
  return inst;
}

export function readAndValidateInstallersProof(
  installersPath: string,
  identity: BuildIdentity,
  expectedRecords: ArtifactRecord[]
): InstallersProof {
  if (!fs.existsSync(installersPath)) {
    throw new Error(`[ERRO DE DISTRIBUIÇÃO] Evidência de instaladores ausente para ${identity.platform}: ${installersPath}`);
  }
  const installers = JSON.parse(fs.readFileSync(installersPath, 'utf8'));
  return validateInstallersProof(installers, identity, expectedRecords);
}
