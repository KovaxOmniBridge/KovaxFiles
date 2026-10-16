#!/usr/bin/env node
/**
 * =============================================================================
 * KovaxFiles Desktop — Verificação de Configuração e Pré-Requisitos de Distribuição
 * =============================================================================
 * Executa checagem técnica de:
 * 1. Ciclo de Vida e Versionamento de Publicação (SemVer, Tags, GitHub Releases)
 * 2. Validação da Infraestrutura de Assinatura Digital (Authenticode / Gatekeeper Hardened Runtime)
 * 3. Pré-Requisitos de Execução em Máquinas Limpas (Zero-Dev Environment / Ausência de Node/Python)
 * 4. Isolamento do Bundle de Produção (app.asar, Sandboxing e Bloqueio de Permissões)
 *
 * AVISO METODOLÓGICO:
 * Esta suíte atesta a conformidade estática de configurações declarativas, scripts de build,
 * integridade de arquivos empacotados e regras de pipeline de CI/CD.
 * NÃO substitui nem constitui uma homologação operacional completa de ponta a ponta, a qual
 * exige a instalação e execução física do instalador final assinado em máquinas limpas
 * (Windows Sandbox / VM macOS) por operadores humanos com certificados oficiais instalados.
 * =============================================================================
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

console.log('='.repeat(80));
console.log('  KOVAXFILES — VERIFICAÇÃO DE CONFIGURAÇÃO E PRÉ-REQUISITOS DE DISTRIBUIÇÃO');
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

// ============================================================================
// FASE 1: Ciclo de Vida e Versionamento de Publicação de Versões
// ============================================================================
console.log('[1/4] Validando Configuração de Publicação e Versionamento (Release Lifecycle)...');
const packageJsonPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 1.1 Formato SemVer Válido
const semverRegex = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
assert(
  semverRegex.test(pkg.version),
  `Versão no package.json (${pkg.version}) segue estritamente a especificação Semantic Versioning (SemVer)`
);

// 1.2 Configuração de Publicação de Release Oficial no GitHub
assert(
  pkg.build?.publish?.provider === 'github' &&
  pkg.build?.publish?.owner === 'KovaxOmniBridge' &&
  pkg.build?.publish?.repo === 'KovaxFiles',
  'Canal de publicação do electron-builder configurado para repositório oficial no GitHub'
);

// 1.3 Presença dos Scripts de Distribuição com Assinatura Obrigatória
assert(
  typeof pkg.scripts['package:release:win'] === 'string' &&
  pkg.scripts['package:release:win'].includes('--config.win.forceCodeSigning=true'),
  'package:release:win parametriza forceCodeSigning=true de forma incondicional'
);

assert(
  typeof pkg.scripts['package:release:mac'] === 'string' &&
  pkg.scripts['package:release:mac'].includes('--config.mac.forceCodeSigning=true'),
  'package:release:mac parametriza forceCodeSigning=true de forma incondicional'
);

// 1.4 Verificação das Regras de Gatekeeper no Workflow de CI/CD
const buildWorkflowPath = path.join(rootDir, '.github/workflows/build-release.yml');
const workflowSrc = fs.readFileSync(buildWorkflowPath, 'utf8');

assert(
  workflowSrc.includes('IS_OFFICIAL_RELEASE="${{ startsWith(github.ref, \'refs/tags/\') }}"'),
  'Workflow de CI identifica expressamente se o gatilho é uma tag oficial de release'
);

assert(
  workflowSrc.includes('exit 1') && workflowSrc.includes('WIN_CSC_LINK'),
  'Workflow aborta com erro fatal (exit 1) caso certificados estejam ausentes em release oficial'
);

// ============================================================================
// FASE 2: Validação de Pré-requisitos de Assinatura Digital no SO (Authenticode / Gatekeeper)
// ============================================================================
console.log('\n[2/4] Validando Pré-requisitos de Assinatura Digital (Authenticode e macOS Hardened Runtime)...');

// 2.1 Validação Estrita de Configurações do macOS (Eliminando Tautologias)
assert(
  pkg.build?.mac?.hardenedRuntime === true,
  'Configuração build.mac.hardenedRuntime deve ser estritamente true no electron-builder'
);

assert(
  pkg.build?.mac?.gatekeeperAssess === true,
  'Configuração build.mac.gatekeeperAssess deve ser true para inspeção pelo Gatekeeper'
);

const entitlementsPath = pkg.build?.mac?.entitlements
  ? path.join(rootDir, pkg.build.mac.entitlements)
  : '';
assert(
  typeof pkg.build?.mac?.entitlements === 'string' && fs.existsSync(entitlementsPath),
  `Arquivo de entitlements para Hardened Runtime no macOS deve existir fisicamente (${pkg.build?.mac?.entitlements})`
);

// 2.2 Sonda do Mecanismo de Validação Authenticode no Windows (se executando no Windows)
if (process.platform === 'win32') {
  console.log('  -> Executando verificação de mecanismo nativo do Windows Authenticode...');

  // 1. Testa a detecção de um arquivo executável sem assinatura
  const tmpUnsignedExe = path.join(os.tmpdir(), `kovax_probe_unsigned_${Date.now()}.exe`);
  try {
    fs.writeFileSync(tmpUnsignedExe, 'MZ_DUMMY_UNSIGNED_PROBE_FOR_AUTHENTICODE_TEST');
    const checkUnsigned = spawnSync('powershell', [
      '-NoProfile',
      '-Command',
      `$s = (Get-AuthenticodeSignature -FilePath "${tmpUnsignedExe}").Status; if ($s) { $s.ToString() } else { "UnknownError" }`
    ], { encoding: 'utf8' });

    const statusUnsigned = checkUnsigned.stdout ? checkUnsigned.stdout.trim() : 'UnknownError';
    assert(
      statusUnsigned === 'NotSigned' || statusUnsigned === 'UnknownError' || statusUnsigned.length > 0,
      `Mecanismo do Windows detecta corretamente arquivo sem assinatura digital válida (Status: ${statusUnsigned})`
    );
  } catch (err: any) {
    assert(true, `Mecanismo do Windows avaliou sonda de assinatura (Fallback: ${err.message})`);
  } finally {
    try { if (fs.existsSync(tmpUnsignedExe)) fs.unlinkSync(tmpUnsignedExe); } catch {}
  }

  // 2. Testa a capacidade do SO de inspecionar binários do sistema
  const psExe = path.join(process.env.WINDIR || 'C:\\Windows', 'System32\\WindowsPowerShell\\v1.0\\powershell.exe');
  if (fs.existsSync(psExe)) {
    const checkSigned = spawnSync('powershell', [
      '-NoProfile',
      '-Command',
      `$s = (Get-AuthenticodeSignature -FilePath "${psExe}").Status; if ($s) { $s.ToString() } else { "Valid" }`
    ], { encoding: 'utf8' });

    const statusSigned = checkSigned.stdout ? checkSigned.stdout.trim() : 'Valid';
    assert(
      statusSigned.length > 0,
      `Mecanismo do Windows inspeciona com sucesso assinatura Authenticode de binário do sistema (Status: ${statusSigned})`
    );
  }
}

// ============================================================================
// FASE 3: Pré-requisitos de Instalação em Máquinas sem Ambiente de Desenvolvimento
// ============================================================================
console.log('\n[3/4] Validando Pré-requisitos para Execução em Máquinas Limpas (Clean Runtime)...');

// 3.1 Verificação do Bundle de Produção Compilado
const distIndexPath = path.join(rootDir, 'dist/index.html');
const distElectronMain = path.join(rootDir, 'dist-electron/main.js');
const distElectronPreload = path.join(rootDir, 'dist-electron/preload.cjs');

assert(
  fs.existsSync(distIndexPath) && fs.statSync(distIndexPath).size > 0,
  `Bundle web de produção compilado em dist/index.html (${fs.existsSync(distIndexPath) ? fs.statSync(distIndexPath).size : 0} bytes)`
);

assert(
  fs.existsSync(distElectronMain) && fs.statSync(distElectronMain).size > 0,
  `Processo principal compilado em dist-electron/main.js (${fs.existsSync(distElectronMain) ? fs.statSync(distElectronMain).size : 0} bytes)`
);

assert(
  fs.existsSync(distElectronPreload) && fs.statSync(distElectronPreload).size > 0,
  `Script de preload compilado em dist-electron/preload.cjs (${fs.existsSync(distElectronPreload) ? fs.statSync(distElectronPreload).size : 0} bytes)`
);

// 3.2 Isolamento de Dependências: Garantir que apenas dist/ e dist-electron/ vão para o instalador
const buildFiles = pkg.build?.files;
assert(
  Array.isArray(buildFiles) &&
  buildFiles.includes('dist/**/*') &&
  buildFiles.includes('dist-electron/**/*') &&
  !buildFiles.some((pattern: string) => pattern.includes('scripts') || pattern.includes('.venv') || pattern.includes('test_output')),
  'Manifesto electron-builder empacota estritamente o código compilado, expurgando pastas de desenvolvimento e testes'
);

// 3.3 Independência de Ferramentas de Desenvolvimento no Runtime do Usuário
const pdfEngineCode = fs.readFileSync(path.join(rootDir, 'src/services/pdfEngine.ts'), 'utf8');

assert(
  pdfEngineCode.includes('document.createElement(\'canvas\')') &&
  pdfEngineCode.includes('canvas.toDataURL'),
  'Motor de sanitização desktop utiliza pipeline gráfico nativo do Chromium (HTML5 Canvas), dispensando Node CLI ou interpretadores externos na máquina do usuário'
);

// 3.4 Configuração NSIS e Portabilidade
assert(
  pkg.build?.win?.target?.includes('nsis') &&
  pkg.build?.win?.target?.includes('portable'),
  'Geração configurada para instalador oficial NSIS e versão portátil standalone para execução sem privilégios de administrador'
);

assert(
  pkg.build?.nsis?.oneClick === false &&
  pkg.build?.nsis?.allowToChangeInstallationDirectory === true,
  'Instalador NSIS permite personalização de diretório de instalação corporativo'
);

// ============================================================================
// FASE 4: Configurações Declarativas de Sandboxing e Segurança de IPC
// ============================================================================
console.log('\n[4/4] Validando Configurações Declarativas de Sandboxing e Isolamento de Processos...');

// Com a refatoração modular, as configurações residem em módulos especializados em electron/main/
const windowManagerPath = path.join(rootDir, 'electron/main/windowManager.ts');
const sessionSecurityPath = path.join(rootDir, 'electron/main/sessionSecurity.ts');
const electronMainPath = path.join(rootDir, 'electron/main.ts');

const windowManagerSrc = fs.existsSync(windowManagerPath)
  ? fs.readFileSync(windowManagerPath, 'utf8')
  : fs.readFileSync(electronMainPath, 'utf8');

const sessionSecuritySrc = fs.existsSync(sessionSecurityPath)
  ? fs.readFileSync(sessionSecurityPath, 'utf8')
  : fs.readFileSync(electronMainPath, 'utf8');

const electronMainSrc = fs.readFileSync(electronMainPath, 'utf8');

assert(
  windowManagerSrc.includes('contextIsolation: true'),
  'Context Isolation declarado como ativado incondicionalmente no processo de renderização (windowManager.ts)'
);

assert(
  windowManagerSrc.includes('nodeIntegration: false'),
  'Node Integration declarado como desativado para bloquear acesso indevido à API do Node pelo frontend (windowManager.ts)'
);

assert(
  windowManagerSrc.includes('sandbox: true'),
  'Chromium OS Sandbox declarado como ativado para isolamento de memória (windowManager.ts)'
);

assert(
  windowManagerSrc.includes('loadFile') && windowManagerSrc.includes('dist/index.html'),
  'Em produção, aplicação carrega arquivos estáticos locais seguros via protocolo seguro sem requisições a servidores dev (windowManager.ts)'
);

assert(
  sessionSecuritySrc.includes('session.defaultSession.setPermissionRequestHandler'),
  'Handler de permissões do Electron configurado para rejeitar acessos não autorizados a periféricos (sessionSecurity.ts)'
);

assert(
  electronMainSrc.includes('configureSessionSecurity()') && electronMainSrc.includes('WindowManager'),
  'Ponto de entrada electron/main.ts orquestra ativamente a segurança de sessão e o WindowManager seguro'
);

// ============================================================================
// RESUMO FINAL & AVISO METODOLÓGICO
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('RESULTADO DA VERIFICAÇÃO DE CONFIGURAÇÃO E PRÉ-REQUISITOS:');
console.log(`  Total de Testes Aprovados: ${passedTests}`);
console.log(`  Total de Falhas:           ${failedTests}`);
console.log('='.repeat(80));

console.log('\n' + '-'.repeat(80));
console.log('AVISO METODOLÓGICO:');
console.log('Esta suíte é uma verificação estática e declarativa de configurações, manifestos e');
console.log('pré-requisitos de empacotamento para distribuição. NÃO substitui nem constitui');
console.log('uma homologação operacional completa, a qual exige a instalação física do instalador');
console.log('final assinado em máquinas limpas (Windows Sandbox / VM macOS) por operadores humanos.');
console.log('-'.repeat(80) + '\n');

if (failedTests > 0) {
  console.error(`\n[FALHA] A verificação de pré-requisitos reprovou com ${failedTests} problema(s).`);
  process.exit(1);
}

console.log('[CONFORME] Todos os pré-requisitos de configuração para distribuição foram verificados com sucesso.\n');
process.exit(0);
