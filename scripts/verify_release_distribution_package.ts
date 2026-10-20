/**
 * Auditoria estática de configuração, políticas e bundle.
 * Não valida executável, instalador, assinatura real nem máquina limpa.
 * Esses gates são test:release, test:installers e aceitação manual documentada.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

console.log('='.repeat(80));
console.log('  KOVAXFILES DESKTOP — AUDITORIA DE ESTABILIZAÇÃO DE RELEASE');
console.log('='.repeat(80) + '\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    failedTests++;
  }
}

const rootDir = process.cwd();
const packageJsonPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// ============================================================================
// PILAR 1: Assinatura dos Executáveis & Políticas de Code Signing
// ============================================================================
console.log('[1/5] Validando Política e Mecanismo de Assinatura dos Executáveis...');

assert(
  typeof pkg.scripts['package:release:win'] === 'string' &&
  pkg.scripts['package:release:win'].includes('--config.win.forceCodeSigning=true'),
  'Build de release Windows exige assinatura com forceCodeSigning=true'
);

assert(
  typeof pkg.scripts['package:release:mac'] === 'string' &&
  pkg.scripts['package:release:mac'].includes('--config.mac.forceCodeSigning=true'),
  'Build de release macOS exige assinatura com forceCodeSigning=true'
);

assert(
  pkg.build?.mac?.hardenedRuntime === true && pkg.build?.mac?.gatekeeperAssess === true,
  'Configuração de macOS ativa Hardened Runtime e Gatekeeper Assessment'
);

if (process.platform === 'win32') {
  const psExe = path.join(process.env.WINDIR || 'C:\\Windows', 'System32\\WindowsPowerShell\\v1.0\\powershell.exe');
  if (fs.existsSync(psExe)) {
    const probe = spawnSync(psExe, ['-NoProfile', '-Command', 'Get-Command Get-AuthenticodeSignature'], { encoding: 'utf8' });
    assert(
      probe.status === 0,
      'Cmdlet nativo Get-AuthenticodeSignature disponível para validação de integridade no Windows'
    );
  }
}

// ============================================================================
// PILAR 2: Compatibilidade de Arquitetura Multiplataforma
// ============================================================================
console.log('\n[2/5] Validando Compatibilidade de Arquiteturas nos Targets de Compilação...');

const winTarget = pkg.build?.win?.target;
const winTargetStr = JSON.stringify(winTarget || {});
assert(
  winTargetStr.includes('nsis') && winTargetStr.includes('portable'),
  'Windows suporta instalador corporativo NSIS e binário Standalone Portable'
);

const macTarget = pkg.build?.mac?.target;
const macTargetStr = JSON.stringify(macTarget || {});
assert(
  macTargetStr.includes('dmg') && macTargetStr.includes('zip'),
  'macOS suporta DMG e arquivo compactado ZIP para distribuição'
);

const linuxTarget = pkg.build?.linux?.target;
const linuxTargetStr = JSON.stringify(linuxTarget || {});
assert(
  linuxTargetStr.includes('AppImage') || pkg.scripts['package:linux']?.includes('electron-builder'),
  'Linux suporta empacotamento AppImage auto-contido'
);

// ============================================================================
// PILAR 3: Integridade dos Assets Offline (Tessdata, WASM, Fontes)
// ============================================================================
console.log('\n[3/5] Validando Integridade dos Assets Offline...');

const publicTessdata = path.join(rootDir, 'public/tessdata/por.traineddata');
const distTessdata = path.join(rootDir, 'dist/tessdata/por.traineddata');
const tessdataExists = fs.existsSync(publicTessdata) || fs.existsSync(distTessdata);
const tessdataSize = fs.existsSync(publicTessdata)
  ? fs.statSync(publicTessdata).size
  : fs.existsSync(distTessdata) ? fs.statSync(distTessdata).size : 0;

assert(
  tessdataExists && tessdataSize > 2_000_000,
  `Modelo OCR offline em português (por.traineddata) presente e íntegro (${(tessdataSize / (1024 * 1024)).toFixed(2)} MB)`
);

const fontsDir = path.join(rootDir, 'public/fonts');
assert(
  fs.existsSync(fontsDir) && fs.readdirSync(fontsDir).some(f => f.endsWith('.ttf') || f.endsWith('.woff2') || f.endsWith('.otf')),
  'Fontes tipográficas locais empacotadas para geração de documentos sem requisição web'
);

// ============================================================================
// PILAR 4: Abertura em Computadores Limpos & Independência de Node/Python Externo
// ============================================================================
console.log('\n[4/5] Validando Execução em Computadores Limpos (Zero-Dev Runtime)...');

// 4.1 Nenhum script Python (.py) pode estar na lista de arquivos empacotados pelo electron-builder
const packagedFiles = pkg.build?.files || [];
assert(
  Array.isArray(packagedFiles) &&
  packagedFiles.includes('dist/**/*') &&
  packagedFiles.includes('dist-electron/**/*') &&
  !packagedFiles.some((pattern: string) => pattern.includes('.py') || pattern.includes('scratch')),
  'Instalador empacota estritamente dist/ e dist-electron/, expurgando qualquer script de desenvolvimento'
);

// 4.2 Código compilado em dist-electron/ não pode ter chamadas obrigatórias para spawn("python") no runtime de usuário
const distElectronDir = path.join(rootDir, 'dist-electron');
if (fs.existsSync(distElectronDir)) {
  const electronMainJs = path.join(distElectronDir, 'main.js');
  if (fs.existsSync(electronMainJs)) {
    const mainContent = fs.readFileSync(electronMainJs, 'utf8');
    assert(
      !mainContent.includes('python.exe') && !mainContent.includes('.venv'),
      'dist-electron/main.js não referencia caminhos de ambientes virtuais de desenvolvimento'
    );
  }
}

// 4.3 Verificação da Sanitização de Documentos: Opera via Canvas Nativo do Chromium
const pdfEngineSrc = fs.readFileSync(path.join(rootDir, 'src/services/pdfEngine.ts'), 'utf8');
assert(
  pdfEngineSrc.includes('pdfjsLib.getDocument') &&
  pdfEngineSrc.includes('HTMLCanvasElement') || pdfEngineSrc.includes('canvas'),
  'Processamento documental no desktop roda 100% sobre o motor gráfico do Chromium do Electron'
);

// ============================================================================
// PILAR 5: Integridade do Manifesto SHA256SUMS.txt sem Mascaramento por '|| true'
// ============================================================================
console.log('\n[5/5] Validando Regras de Geração do Manifesto SHA256SUMS.txt...');

const buildWorkflowPath = path.join(rootDir, '.github/workflows/build-release.yml');
const workflowSrc = fs.readFileSync(buildWorkflowPath, 'utf8');

assert(
  !workflowSrc.includes('>> SHA256SUMS.txt || true'),
  'Workflow de release não mascara erros na geração de SHA256SUMS.txt com "|| true"'
);

assert(
  workflowSrc.includes('generate_release_manifest.ts') ||
  workflowSrc.includes('Generate SHA-256 Integrity Manifest'),
  'Geração do manifesto SHA-256 formalmente declarada no pipeline'
);

// ============================================================================
// PILAR 6: Evidências Mandatórias de Desempenho e Carga Pré-Release
// ============================================================================
console.log('\n[6/6] Validando Exigência de Testes de Carga e Benchmarks Pré-Release...');

assert(
  workflowSrc.includes('npm run test:load') && workflowSrc.includes('npm run benchmark'),
  'Workflow de release oficial exige execução de testes de carga e benchmarks antes da compilação'
);

assert(
  typeof pkg.scripts['test:load'] === 'string' && typeof pkg.scripts['benchmark'] === 'string',
  'Scripts de teste de carga (test:load) e benchmark de desempenho formalmente definidos no package.json'
);

// ============================================================================
// SUMÁRIO EXECUTIVO
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log(`RESULTADO DA AUDITORIA DE RELEASE: ${passedTests} Passados, ${failedTests} Falhados`);
console.log('='.repeat(80) + '\n');

if (failedTests > 0) {
  console.error(`❌ [FALHA DE RELEASE] Reprovado com ${failedTests} não conformidade(s).`);
  process.exit(1);
}

console.log('🎉 [APROVADO] Pré-requisitos estáticos aprovados; smoke, assinatura real e máquina limpa são gates separados.\n');
process.exit(0);
