import assert from 'node:assert/strict';
import fs from 'node:fs';

for (const file of ['.github/workflows/build-release.yml', '.github/workflows/ci.yml']) {
  const workflow = fs.readFileSync(file, 'utf8');
  const jobs = workflow.split(/^  [\w-]+:\s*$/m).slice(1);
  for (const job of jobs.filter(j => j.includes('npm run test:release'))) {
    assert.ok(job.indexOf('npm run package:') >= 0 && job.indexOf('npm run package:') < job.indexOf('npm run test:release'), `${file}: pacote deve preceder smoke`);
  }
}
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const command of Object.values(pkg.scripts).filter((s): s is string => typeof s === 'string' && s.includes('electron-builder'))) {
  assert.ok(command.includes('--publish never'), 'empacotamento deve impedir publicação implícita');
}
const release = fs.readFileSync('.github/workflows/build-release.yml', 'utf8');
assert.ok(release.includes('permissions:\n  contents: read'), 'Jobs internos não devem receber permissão global de publicação');
assert.ok(release.includes("if: startsWith(github.ref, 'refs/tags/') && (inputs.allow_unsigned_dev != true)"), 'Publicação restrita a tags oficiais, sem opção unsigned');
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
