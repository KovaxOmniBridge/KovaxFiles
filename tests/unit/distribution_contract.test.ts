import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  resolvePackagedExecutable,
  requireSmokeEvidence,
  distributionChannel,
  verifyOfficialSignature,
  nativeSignatureEnvironment,
  validateDistributionProof,
  validateInstallersProof,
  type DistributionProof,
  type InstallersProof
} from '../../scripts/distribution_contract.ts';
import { generateReleaseManifest } from '../../scripts/generate_release_manifest.ts';
import { assertRendererReady, assertOcrAssets, assertPdfExport } from '../../electron/main/packagedSmokeChecks.ts';
import { PDFDocument } from 'pdf-lib';
import type { BuildIdentity, ArtifactRecord } from '../../scripts/distribution_artifacts.ts';
const valid = { mounted: true, interactive: true, preload: true, isolated: true };
for (const key of Object.keys(valid)) assert.throws(() => assertRendererReady({ ...valid, [key]: false }));
for (const missing of ['por.traineddata', 'worker.min.js', 'tesseract-core-lstm.wasm', 'tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm', 'tesseract-core-simd-lstm.wasm.js']) {
  assert.throws(() => assertOcrAssets(file => file === missing ? 0 : 3_000_000), /Asset OCR/);
}
assert.throws(() => assertPdfExport(1), /PDF/);
await assert.rejects(() => PDFDocument.load(Buffer.from('invalid PDF')));

// Testes do contrato de commit obrigatório em provas de execução e de instaladores usando validadores reais
const identityFixture: BuildIdentity = {
  runId: 'contract-run-123',
  commit: 'expected-commit-hash-abc',
  sourceDigest: 'digest-canon-789',
  product: 'KovaxFiles Desktop',
  version: '9.8.7',
  platform: 'win',
  architecture: 'x64',
  channel: 'internal'
};

const artifactFixture: ArtifactRecord[] = [{
  ...identityFixture,
  target: 'nsis',
  file: 'KovaxFiles Desktop-9.8.7-win-x64-setup.exe',
  size: 2_000_000,
  sha256: 'f'.repeat(64)
}];

// Prova de execução válida (smoke)
const validSmokeProof: DistributionProof = {
  mode: 'smoke',
  status: 'passed',
  runId: identityFixture.runId,
  commit: identityFixture.commit,
  sourceDigest: identityFixture.sourceDigest,
  platform: identityFixture.platform,
  architecture: identityFixture.architecture,
  artifacts: artifactFixture
};

// 1. Prova de execução: validada com sucesso
assert.equal(validateDistributionProof(validSmokeProof, 'smoke', identityFixture, artifactFixture).commit, identityFixture.commit);

// 2. Prova de execução: commit ausente (undefined ou chave removida)
assert.throws(() => validateDistributionProof({ ...validSmokeProof, commit: undefined as any }, 'smoke', identityFixture), /Commit ausente/);
const smokeWithoutCommit = { ...validSmokeProof };
delete (smokeWithoutCommit as any).commit;
assert.throws(() => validateDistributionProof(smokeWithoutCommit, 'smoke', identityFixture), /Commit ausente/);

// 3. Prova de execução: commit vazio ou preenchido com espaços
assert.throws(() => validateDistributionProof({ ...validSmokeProof, commit: '' }, 'smoke', identityFixture), /Commit vazio/);
assert.throws(() => validateDistributionProof({ ...validSmokeProof, commit: '   ' }, 'smoke', identityFixture), /Commit vazio/);

// 4. Prova de execução: commit divergente
assert.throws(() => validateDistributionProof({ ...validSmokeProof, commit: 'divergent-commit-xyz' }, 'smoke', identityFixture), /Commit divergente/);

// Prova de instaladores válida
const validInstallersProof: InstallersProof = {
  runId: identityFixture.runId,
  commit: identityFixture.commit,
  sourceDigest: identityFixture.sourceDigest,
  platform: identityFixture.platform,
  architecture: identityFixture.architecture,
  records: artifactFixture
};

// 5. Prova de instaladores: validada com sucesso
assert.equal(validateInstallersProof(validInstallersProof, identityFixture, artifactFixture).commit, identityFixture.commit);

// 6. Prova de instaladores: commit ausente (undefined ou chave removida)
assert.throws(() => validateInstallersProof({ ...validInstallersProof, commit: undefined as any }, identityFixture, artifactFixture), /Commit ausente/);
const installersWithoutCommit = { ...validInstallersProof };
delete (installersWithoutCommit as any).commit;
assert.throws(() => validateInstallersProof(installersWithoutCommit, identityFixture, artifactFixture), /Commit ausente/);

// 7. Prova de instaladores: commit vazio ou preenchido com espaços
assert.throws(() => validateInstallersProof({ ...validInstallersProof, commit: '' }, identityFixture, artifactFixture), /Commit vazio/);
assert.throws(() => validateInstallersProof({ ...validInstallersProof, commit: '   ' }, identityFixture, artifactFixture), /Commit vazio/);

// 8. Prova de instaladores: commit divergente
assert.throws(() => validateInstallersProof({ ...validInstallersProof, commit: 'divergent-commit-xyz' }, identityFixture, artifactFixture), /Commit divergente/);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kovax-contract-'));
for (const inherited of ['', 'invalid-module-path']) {
  const nativeEnv = nativeSignatureEnvironment({ PSModulePath: inherited, PSMODULEPATH: inherited });
  assert.ok(!Object.keys(nativeEnv).some(key => key.toLowerCase() === 'psmodulepath'));
}
try {
  const pkg = { name: 'kovax-files-desktop', version: '9.8.7', build: { productName: 'KovaxFiles Desktop' } };
  assert.throws(() => resolvePackagedExecutable(dir, pkg, 'win32', 'x64'), /obrigatório ausente/);
  fs.mkdirSync(path.join(dir, 'win-unpacked'));
  const exe = path.join(dir, 'win-unpacked', 'KovaxFiles Desktop.exe');
  fs.writeFileSync(exe, 'fixture');
  assert.equal(resolvePackagedExecutable(dir, pkg, 'win32', 'x64'), exe);
  const stages = ['Interface', 'Preload', 'IPC', 'OCR', 'PDF-IO', 'Complete'];
  for (const missing of stages) assert.throws(() => requireSmokeEvidence(stages.filter(s => s !== missing).map(s => `[PackagedSmoke:${s}]`).join('\n')), /ausente/);
  assert.throws(() => distributionChannel({}), /explícitos/);
  assert.equal(distributionChannel({ DISTRIBUTION_CHANNEL: 'official', ALLOW_UNSIGNED_INTERNAL: 'true' }), 'official');
  if (process.platform === 'win32') assert.throws(() => verifyOfficialSignature(exe));
  assert.throws(() => generateReleaseManifest({ dir, requiredPlatforms: ['win'] }), /Nenhum artefato/);
  fs.writeFileSync(path.join(dir, 'fixture-9.8.7.exe'), 'abc');
  const manifest = generateReleaseManifest({ dir, requiredPlatforms: ['win'] });
  assert.equal(manifest.entries[0].sha256, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  console.log('Distribution contracts passed');
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
