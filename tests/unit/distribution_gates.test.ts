import assert from 'node:assert/strict';
import fs from 'node:fs';

import { validateWorkflow } from '../../scripts/workflow_policy.ts';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const file of ['.github/workflows/build-release.yml', '.github/workflows/ci.yml']) validateWorkflow(fs.readFileSync(file,'utf8'), pkg.scripts);
for (const platform of ['win', 'mac']) {
  assert.ok(pkg.scripts[`package:release:${platform}`].includes(`--config.${platform}.forceCodeSigning=true`));
}
const smoke = fs.readFileSync('electron/main/cleanEnvironmentRunner.ts', 'utf8');
assert.ok(smoke.includes('assertRendererReady(snapshot)'));
assert.ok(smoke.includes('assertOcrAssets('));
assert.ok(smoke.includes('PDFDocument.load(fs.readFileSync(exported))'));
assert.ok(!smoke.includes("path.resolve('dist/tessdata')"), 'Smoke não pode buscar assets no checkout');
const session = fs.readFileSync('electron/main/sessionSecurity.ts', 'utf8');
const productionCsp = session.split(': "default-src')[1];
assert.ok(productionCsp.includes("'wasm-unsafe-eval'"), 'OCR real exige permissão específica de WebAssembly na CSP de produção');
assert.ok(!productionCsp.includes("'unsafe-eval'"), 'CSP não pode permitir eval JavaScript');
const signature = fs.readFileSync('scripts/distribution_contract.ts', 'utf8');
assert.ok(signature.includes('delete nativeEnv.PSModulePath'), 'PowerShell nativo deve isolar módulos herdados de outros hosts');
assert.ok(signature.includes("$ErrorActionPreference = 'Stop'"), 'Falha da ferramenta de assinatura deve abortar');

console.log('Distribution workflow gates passed');
