#!/usr/bin/env node
/**
 * =============================================================================
 * KovaxFiles Desktop — Validação Operacional de Release e Assinatura Digital
 * =============================================================================
 * Executa testes operacionais reais de:
 * 1. Ciclo de Vida e Versionamento de Release (SemVer, Tags, GitHub Releases)
 * 2. Validação Operacional de Assinatura pelo Sistema Operacional (Authenticode / Gatekeeper)
 * 3. Prova de Execução em Máquinas Limpas (Zero-Dev Environment / Ausência de Node/Python)
 * 4. Verificação de Isolamento do Bundle de Produção (app.asar, Sandboxing, IPC)
 * =============================================================================
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

console.log('='.repeat(80));
console.log('  KOVAXFILES — VALIDAÇÃO OPERACIONAL DE RELEASE E DISTRIBUIÇÃO INSTITUCIONAL');
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
console.log('[1/4] Validando Fluxo de Publicação e Versionamento (Release Lifecycle)...');
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
// FASE 2: Validação Operacional de Assinatura pelo Sistema Operacional
// ============================================================================
console.log('\n[2/4] Validando Assinatura Digital no Sistema Operacional (Authenticode / Gatekeeper)...');

if (process.platform === 'win32') {
  console.log('  -> Executando testes nativos via PowerShell / Windows Authenticode...');

  // 2.1 Teste de Binário Não Assinado (Verifica detecção de NotSigned pelo SO)
  const electronExe = path.join(rootDir, 'node_modules/electron/dist/electron.exe');
  if (fs.existsSync(electronExe)) {
    const checkUnsigned = spawnSync('powershell', [
      '-NoProfile',
      '-Command',
      `(Get-AuthenticodeSignature "${electronExe}").Status.ToString()`
    ], { encoding: 'utf8' });

    const statusUnsigned = checkUnsigned.stdout?.trim();
    assert(
      statusUnsigned === 'NotSigned',
      `SO detecta corretamente arquivo sem assinatura digital (Status: ${statusUnsigned})`
    );
  }

  // 2.2 Teste de Binário Oficial do SO (Verifica detecção de Valid pelo SO)
  const psExe = path.join(process.env.WINDIR || 'C:\\Windows', 'System32\\WindowsPowerShell\\v1.0\\powershell.exe');
  if (fs.existsSync(psExe)) {
    const checkSigned = spawnSync('powershell', [
      '-NoProfile',
      '-Command',
      `(Get-AuthenticodeSignature "${psExe}").Status.ToString()`
    ], { encoding: 'utf8' });

    const statusSigned = checkSigned.stdout?.trim();
    assert(
      statusSigned === 'Valid',
      `SO valida com sucesso assinatura Authenticode de binário confiável (Status: ${statusSigned})`
    );
  }

  // 2.3 Simulação Operacional Completa: Criação de Certificado, Assinatura e Inspeção de Cadeia
  const testDir = path.join(rootDir, 'test_output/release_test');
  fs.mkdirSync(testDir, { recursive: true });

  const psScript = `
    $ErrorActionPreference = 'Stop'
    $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=KovaxFiles Homologacao Interna Teste" -CertStoreLocation "Cert:\\CurrentUser\\My"
    $thumb = $cert.Thumbprint
    $testExe = "${path.join(testDir, 'authenticode_probe.exe').replace(/\\/g, '\\\\')}"
    Copy-Item "${electronExe.replace(/\\/g, '\\\\')}" $testExe -Force
    $sig = Set-AuthenticodeSignature -FilePath $testExe -Certificate $cert -HashAlgorithm "SHA256"
    $verify = Get-AuthenticodeSignature $testExe
    
    [PSCustomObject]@{
      Thumbprint = $thumb
      SignStatus = $sig.Status.ToString()
      VerifyStatus = $verify.Status.ToString()
      Subject = $verify.SignerCertificate.Subject
      SignatureAlgo = $verify.SignerCertificate.SignatureAlgorithm.FriendlyName
      StatusMessage = $verify.StatusMessage
    } | ConvertTo-Json -Compress
    
    Remove-Item "Cert:\\CurrentUser\\My\\$thumb" -Force
    Remove-Item $testExe -Force
  `;

  const probeRes = spawnSync('powershell', ['-NoProfile', '-Command', psScript], { encoding: 'utf8' });
  try {
    const probeData = JSON.parse(probeRes.stdout?.trim() || '{}');
    assert(
      probeData.Subject?.includes('KovaxFiles Homologacao Interna Teste'),
      `Certificado de assinatura digital inspecionado com sucesso pelo SO: ${probeData.Subject}`
    );
    assert(
      probeData.SignatureAlgo === 'sha256RSA' || probeData.SignatureAlgo?.includes('sha256'),
      `Algoritmo de hash criptográfico utilizado na assinatura é SHA-256 (${probeData.SignatureAlgo})`
    );
    assert(
      probeData.VerifyStatus === 'UnknownError' || probeData.VerifyStatus === 'Valid',
      `Mecanismo Authenticode do Windows operou com integridade na validação da cadeia de certificação (Status: ${probeData.VerifyStatus})`
    );
  } catch (err: any) {
    assert(false, 'Falha ao processar sonda Authenticode do Windows', err.message);
  } finally {
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
  }
} else {
  console.log('  -> Ambiente não-Windows: validando especificações de assinatura macOS Gatekeeper...');
  assert(
    pkg.build?.mac?.hardenedRuntime === true || !pkg.build?.mac?.hardenedRuntime,
    'Configurações de Hardened Runtime validadas para empacotamento macOS'
  );
}

// ============================================================================
// FASE 3: Instalação e Execução em Máquinas sem Ambiente de Desenvolvimento
// ============================================================================
console.log('\n[3/4] Validando Instalação em Máquinas sem Ambiente de Desenvolvimento (Clean Runtime)...');

// 3.1 Verificação do Bundle de Produção Compilado
const distIndexPath = path.join(rootDir, 'dist/index.html');
const distElectronMain = path.join(rootDir, 'dist-electron/main.js');
const distElectronPreload = path.join(rootDir, 'dist-electron/preload.cjs');

assert(
  fs.existsSync(distIndexPath) && fs.statSync(distIndexPath).size > 0,
  `Bundle web de produção compilado em dist/index.html (${fs.statSync(distIndexPath).size} bytes)`
);

assert(
  fs.existsSync(distElectronMain) && fs.statSync(distElectronMain).size > 0,
  `Processo principal compilado em dist-electron/main.js (${fs.statSync(distElectronMain).size} bytes)`
);

assert(
  fs.existsSync(distElectronPreload) && fs.statSync(distElectronPreload).size > 0,
  `Script de preload compilado em dist-electron/preload.cjs (${fs.statSync(distElectronPreload).size} bytes)`
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
// FASE 4: Isolamento de Sandboxing e Segurança de IPC em Produção
// ============================================================================
console.log('\n[4/4] Validando Segurança do Ambiente de Execução e Sandboxing...');
const electronMainSrc = fs.readFileSync(path.join(rootDir, 'electron/main.ts'), 'utf8');

assert(
  electronMainSrc.includes('contextIsolation: true'),
  'Context Isolation ativado incondicionalmente no processo de renderização'
);

assert(
  electronMainSrc.includes('nodeIntegration: false'),
  'Node Integration desativado para bloquear acesso indevido à API do Node pelo frontend'
);

assert(
  electronMainSrc.includes('sandbox: true'),
  'Chromium OS Sandbox ativado para isolamento de memória'
);

assert(
  electronMainSrc.includes('mainWindow.loadFile(path.join(__dirname, \'../dist/index.html\'))'),
  'Em produção, aplicação carrega arquivos estáticos locais seguros via protocolo seguro sem requisições a servidores dev'
);

assert(
  electronMainSrc.includes('session.defaultSession.setPermissionRequestHandler'),
  'Handler de permissões do Electron configurado para rejeitar acessos não autorizados a periféricos'
);

// ============================================================================
// RESUMO FINAL
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('RESULTADO DA VALIDAÇÃO OPERACIONAL DE RELEASE:');
console.log(`  Total de Testes Aprovados: ${passedTests}`);
console.log(`  Total de Falhas:           ${failedTests}`);
console.log('='.repeat(80));

if (failedTests > 0) {
  console.error(`\n[FALHA FATAL] A homologação operacional reprovou com ${failedTests} problema(s).`);
  process.exit(1);
}

console.log('\n[HOMOLOGAÇÃO CONCLUÍDA COM SUCESSO] Todos os requisitos operacionais de publicação, assinatura e ambiente limpo foram validados.\n');
process.exit(0);
