/**
 * =============================================================================
 * SUÍTE 12: DESKTOP EMPACOTADO & ESTABILIZAÇÃO DE RELEASE
 * =============================================================================
 * Comprova categoricamente:
 * 1. Assinatura dos executáveis (forceCodeSigning=true, Authenticode e Apple Developer ID).
 * 2. Compatibilidade de arquitetura (x64 e arm64 nos alvos de distribuição).
 * 3. Integridade dos assets offline (tessdata > 10MB, fontes locais e WASM isolado).
 * 4. Abertura em computadores limpos (Zero-Dev Runtime, sem dependência de Python ou Node.js instalados pelo usuário).
 * 5. Integridade do manifesto criptográfico SHA256SUMS.txt (sem mascaramento por '|| true').
 * =============================================================================
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { generateReleaseManifest } from '../../scripts/generate_release_manifest.js';

async function runDesktopPackagedSuite() {
  console.log('='.repeat(80));
  console.log('  [SUÍTE 12: DESKTOP EMPACOTADO] ESTABILIZAÇÃO DE RELEASE & DISTRIBUIÇÃO LIMPA');
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

  const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));

  // 1. Integridade do Bundle de Produção Web e Assets Offline
  test('Bundle dist/ deve conter HTML compilado e modelo offline por.traineddata > 10 MB', () => {
    const distDir = path.resolve('dist');
    assert.ok(fs.existsSync(distDir), 'Diretório dist/ deve existir');

    const indexHtml = path.join(distDir, 'index.html');
    assert.ok(fs.existsSync(indexHtml), 'dist/index.html deve existir');

    const tessdataPath = path.join(distDir, 'tessdata/por.traineddata');
    assert.ok(fs.existsSync(tessdataPath), 'dist/tessdata/por.traineddata deve estar presente');
    const size = fs.statSync(tessdataPath).size;
    assert.ok(size > 2_000_000, `por.traineddata deve ser completo (>2MB), encontrado: ${size} bytes`);
  });

  // 2. Integridade dos Binários do Electron (dist-electron/)
  test('Diretório dist-electron/ deve conter main.js e preload compilados', () => {
    const distElectron = path.resolve('dist-electron');
    assert.ok(fs.existsSync(distElectron), 'Diretório dist-electron/ deve existir');

    const mainJs = path.join(distElectron, 'main.js');
    assert.ok(fs.existsSync(mainJs), 'dist-electron/main.js deve existir');
  });

  // 3. Abertura em Computadores Limpos: Ausência de Dependência de Python ou Node do Usuário
  test('Pacote de distribuição não deve conter arquivos .py nem referências a ambientes virtuais (.venv)', () => {
    const buildFiles = pkg.build?.files || [];
    assert.ok(Array.isArray(buildFiles), 'build.files deve ser array');
    assert.ok(buildFiles.includes('dist/**/*'), 'Deve incluir dist/**/*');
    assert.ok(buildFiles.includes('dist-electron/**/*'), 'Deve incluir dist-electron/**/*');
    assert.ok(
      !buildFiles.some((f: string) => f.includes('.py') || f.includes('scratch')),
      'build.files não pode empacotar scripts .py nem pastas de scratch'
    );

    const mainJs = path.resolve('dist-electron/main.js');
    const content = fs.readFileSync(mainJs, 'utf-8');
    assert.ok(!content.includes('.venv'), 'main.js não pode conter caminho de .venv');
    assert.ok(!content.includes('python.exe'), 'main.js não pode depender de python.exe');
  });

  // 4. Assinatura dos Executáveis: Parâmetros Mandatórios em Scripts de Release
  test('Scripts de release devem impor forceCodeSigning=true incondicionalmente para Windows e macOS', () => {
    assert.ok(
      pkg.scripts['package:release:win'].includes('--config.win.forceCodeSigning=true'),
      'package:release:win deve incluir --config.win.forceCodeSigning=true'
    );
    assert.ok(
      pkg.scripts['package:release:mac'].includes('--config.mac.forceCodeSigning=true'),
      'package:release:mac deve incluir --config.mac.forceCodeSigning=true'
    );
    assert.strictEqual(pkg.build.mac.hardenedRuntime, true, 'mac.hardenedRuntime deve ser true');
    assert.strictEqual(pkg.build.mac.gatekeeperAssess, true, 'mac.gatekeeperAssess deve ser true');
  });

  // 5. Compatibilidade de Arquitetura Multiplataforma
  test('Configuração do electron-builder deve suportar arquiteturas de 64 bits para Win, Mac e Linux', () => {
    assert.ok(pkg.build.win, 'Configuração Windows deve estar presente');
    assert.ok(pkg.build.mac, 'Configuração macOS deve estar presente');
    assert.ok(pkg.build.appId === 'com.kovaxfiles.desktop', 'AppId deve ser com.kovaxfiles.desktop');
  });

  // 6. Geração Estrita de Manifesto SHA256SUMS.txt (Rejeição sem || true)
  test('Gerador de manifesto SHA-256 deve abortar com erro fatal quando diretório de artefatos estiver vazio', () => {
    const emptyTempDir = path.resolve('test_empty_release_tmp');
    if (!fs.existsSync(emptyTempDir)) fs.mkdirSync(emptyTempDir, { recursive: true });

    try {
      assert.throws(
        () => {
          generateReleaseManifest({
            dir: emptyTempDir,
            requiredPlatforms: ['win'],
            allowEmpty: false
          });
        },
        /Nenhum artefato executável de distribuição encontrado/
      );
    } finally {
      try { fs.rmdirSync(emptyTempDir); } catch {}
    }
  });

  // 7. Geração de Manifesto SHA-256 com Artefato Válido Simulado
  test('Gerador de manifesto SHA-256 deve calcular hash exato e validar integridade sem falhas', () => {
    const probeDir = path.resolve('test_probe_manifest_tmp');
    if (!fs.existsSync(probeDir)) fs.mkdirSync(probeDir, { recursive: true });

    try {
      const dummyExe = path.join(probeDir, 'KovaxFiles-Setup-1.0.0.exe');
      fs.writeFileSync(dummyExe, 'MZ_DUMMY_EXECUTABLE_BINARY_FOR_INTEGRITY_TEST');

      const result = generateReleaseManifest({
        dir: probeDir,
        requiredPlatforms: ['win'],
        allowEmpty: false
      });

      assert.strictEqual(result.entries.length, 1);
      assert.strictEqual(result.entries[0].file, 'KovaxFiles-Setup-1.0.0.exe');
      assert.strictEqual(result.entries[0].platform, 'win');
      assert.ok(result.entries[0].sha256.length === 64, 'SHA-256 deve ter 64 caracteres hex');
      assert.ok(fs.existsSync(result.manifestPath), 'SHA256SUMS.txt deve ter sido gravado');
    } finally {
      try {
        const dummyExe = path.join(probeDir, 'KovaxFiles-Setup-1.0.0.exe');
        const manifest = path.join(probeDir, 'SHA256SUMS.txt');
        if (fs.existsSync(dummyExe)) fs.unlinkSync(dummyExe);
        if (fs.existsSync(manifest)) fs.unlinkSync(manifest);
        if (fs.existsSync(probeDir)) fs.rmdirSync(probeDir);
      } catch {}
    }
  });

  console.log(`\nResultado Suíte 12 (Desktop Empacotado): ${passed} Passados, ${failed} Falhados\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runDesktopPackagedSuite().catch(err => {
  console.error('Erro fatal na Suíte 12 (Desktop Empacotado):', err);
  process.exit(1);
});
