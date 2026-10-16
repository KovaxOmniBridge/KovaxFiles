/**
 * =============================================================================
 * SUÍTE 1: BUILD & INTEGRIDADE DE ATIVOS
 * =============================================================================
 * Comprova: Tipagem, imports, dependências e integridade de assets offline.
 * Execução: Todo commit e Pull Request.
 * =============================================================================
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { spawnSync } from 'child_process';

async function runBuildSuite() {
  console.log('='.repeat(80));
  console.log('  [SUÍTE 1: BUILD] TIPAGEM, IMPORTS, DEPENDÊNCIAS E ASSETS OFFLINE');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name} -> ${err.message}`);
      failed++;
    }
  }

  // 1. Validar integridade do package.json e dependências declaradas
  test('package.json deve possuir scripts e dependências estruturadas', () => {
    const pkgPath = path.resolve('package.json');
    assert.ok(fs.existsSync(pkgPath), 'package.json deve existir');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    assert.strictEqual(pkg.name, 'kovax-files-desktop');
    assert.ok(pkg.dependencies['pdf-lib'], 'pdf-lib deve estar listado em dependencies');
    assert.ok(pkg.dependencies['tesseract.js'], 'tesseract.js deve estar listado em dependencies');
    assert.ok(pkg.dependencies['node-forge'], 'node-forge deve estar listado em dependencies');
  });

  // 2. Validar assets de OCR offline (Fail-Safe Mandatório)
  test('Assets obrigatórios de OCR offline devem estar íntegros em public/tessdata', () => {
    const tessDir = path.resolve('public/tessdata');
    assert.ok(fs.existsSync(tessDir), 'Diretório public/tessdata deve existir');

    const requiredAssets = [
      { name: 'por.traineddata', minSize: 2_000_000 },
      { name: 'worker.min.js', minSize: 50_000 },
      { name: 'tesseract-core-lstm.wasm.js', minSize: 1_000_000 },
      { name: 'tesseract-core-lstm.wasm', minSize: 1_000_000 },
      { name: 'tesseract-core-simd-lstm.wasm.js', minSize: 1_000_000 },
      { name: 'tesseract-core-simd-lstm.wasm', minSize: 1_000_000 }
    ];

    for (const asset of requiredAssets) {
      const filePath = path.join(tessDir, asset.name);
      assert.ok(fs.existsSync(filePath), `Ativo ${asset.name} deve existir`);
      const stat = fs.statSync(filePath);
      assert.ok(stat.size >= asset.minSize, `Ativo ${asset.name} deve ter tamanho >= ${asset.minSize} bytes (atual: ${stat.size})`);
    }
  });

  // 3. Validar empacotamento local de fontes (Offline Font Compliance)
  test('Fontes locais Inter e Outfit devem estar empacotadas em public/fonts', () => {
    const fontsDir = path.resolve('public/fonts');
    const cssPath = path.join(fontsDir, 'fonts.css');
    assert.ok(fs.existsSync(fontsDir), 'Diretório public/fonts deve existir');
    assert.ok(fs.existsSync(cssPath), 'Folha de estilos fonts.css deve existir');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    assert.ok(cssContent.includes('@font-face'), 'fonts.css deve conter declarações @font-face locais');
    assert.ok(!cssContent.includes('fonts.googleapis.com'), 'fonts.css NÃO pode referenciar Google Fonts');
  });

  // 4. Validar compilação TypeScript (Type Checking Estrito)
  test('Verificação estrita de tipagem TypeScript (tsc --noEmit)', () => {
    const tscResult = spawnSync('npx', ['tsc', '--noEmit'], {
      shell: true,
      encoding: 'utf-8',
      timeout: 60000
    });
    if (tscResult.status !== 0) {
      throw new Error(`Erros de compilação TypeScript detectados:\n${tscResult.stdout || tscResult.stderr}`);
    }
    assert.strictEqual(tscResult.status, 0, 'TypeScript deve compilar sem nenhum erro');
  });

  console.log(`\nResultado Suíte 1 (Build): ${passed} Passados, ${failed} Falhados\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runBuildSuite().catch(err => {
  console.error('Erro fatal na Suíte 1 (Build):', err);
  process.exit(1);
});
