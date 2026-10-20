import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolvePackagedExecutable, requireSmokeEvidence, distributionChannel, verifyOfficialSignature } from '../../scripts/distribution_contract.ts';
import { generateReleaseManifest } from '../../scripts/generate_release_manifest.ts';
import { assertRendererReady, assertOcrAssets, assertPdfExport } from '../../electron/main/packagedSmokeChecks.ts';
import { PDFDocument } from 'pdf-lib';
const valid = { mounted: true, interactive: true, preload: true, isolated: true };
for (const key of Object.keys(valid)) assert.throws(() => assertRendererReady({ ...valid, [key]: false }));
for (const missing of ['por.traineddata', 'worker.min.js', 'tesseract-core-lstm.wasm', 'tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm', 'tesseract-core-simd-lstm.wasm.js']) {
  assert.throws(() => assertOcrAssets(file => file === missing ? 0 : 3_000_000), /Asset OCR/);
}
assert.throws(() => assertPdfExport(1), /PDF/);
await assert.rejects(() => PDFDocument.load(Buffer.from('invalid PDF')));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kovax-contract-'));
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
