/**
 * Teste Automatizado de Segurança de Distribuição Institucional e Assinatura Digital
 * Verifica:
 * 1. Existência e parametrização estrita de forceCodeSigning no package.json
 * 2. Habilitação incondicional de verifyUpdateCodeSignature no electron-builder
 * 3. Proibição de fallbacks desprotegidos no workflow de CI/CD (GitHub Actions)
 * 4. Presença e acurácia da documentação criptográfica de distinção entre SHA-256 e Assinatura Digital
 */

import fs from 'fs';
import { validateWorkflow } from './workflow_policy';
import path from 'path';

async function main() {
  console.log('='.repeat(70));
  console.log('Iniciando Verificação de Segurança de Distribuição e Assinatura Digital');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
      failed++;
    }
  }

  const rootDir = process.cwd();

  // 1. Verificar package.json
  console.log('\n[1/4] Verificando configurações do package.json...');
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  assert(
    !!packageJson.scripts['package:release:win']?.includes('forceCodeSigning=true'),
    'Script package:release:win deve exigir --config.win.forceCodeSigning=true'
  );

  assert(
    !!packageJson.scripts['package:release']?.includes('forceCodeSigning=true'),
    'Script package:release deve exigir forceCodeSigning=true'
  );

  assert(
    packageJson.build?.win?.verifyUpdateCodeSignature === true,
    'Configuração win.verifyUpdateCodeSignature deve ser true no electron-builder'
  );

  assert(
    packageJson.build?.win?.signAndEditExecutable === true,
    'Configuração win.signAndEditExecutable deve ser true no electron-builder'
  );

  // 2. Verificar workflow do GitHub Actions
  console.log('\n[2/4] Verificando integridade do workflow .github/workflows/build-release.yml...');
  const workflowPath = path.join(rootDir, '.github/workflows/build-release.yml');
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');

  try { validateWorkflow(workflowContent, packageJson.scripts); assert(true, 'Política estrutural: permissões, canais assinados e todos os gates de distribuição'); }
  catch (error) { assert(false, 'Política estrutural do workflow', String(error)); }

  // 3. Verificar manifesto SHA-256 no workflow e no gerador de release
  console.log('\n[3/4] Verificando cabeçalho de esclarecimento de segurança do SHA256SUMS...');
  const manifestGenPath = path.join(rootDir, 'scripts/generate_release_manifest.ts');
  const manifestGenContent = fs.existsSync(manifestGenPath) ? fs.readFileSync(manifestGenPath, 'utf8') : '';
  const hasSecurityClarification =
    (manifestGenContent.includes('NÃO SUBSTITUEM ASSINATURA DIGITAL') && manifestGenContent.includes('Get-AuthenticodeSignature'));

  assert(
    hasSecurityClarification,
    'Manifesto SHA-256 gerado no pipeline/script de release deve esclarecer que hashes não substituem assinatura digital'
  );

  // 4. Verificar documentação técnica de segurança
  console.log('\n[4/4] Verificando documentação em docs/SECURITY_DISTRIBUTION.md e README.md...');
  const docsPath = path.join(rootDir, 'docs/SECURITY_DISTRIBUTION.md');
  const docsContent = fs.readFileSync(docsPath, 'utf8');

  assert(
    docsContent.includes('Distinção Criptográfica Fundamental: SHA-256 vs. Assinatura Digital') &&
    docsContent.includes('Authenticode') &&
    /não substitui a assinatura digital/i.test(docsContent),
    'docs/SECURITY_DISTRIBUTION.md deve detalhar a distinção técnica entre SHA-256 e Assinatura Digital'
  );

  const readmePath = path.join(rootDir, 'README.md');
  const readmeContent = fs.readFileSync(readmePath, 'utf8');

  assert(
    readmeContent.includes('Distinção entre Integridade (SHA-256) e Autoria (Assinatura Digital)') &&
    readmeContent.includes('forceCodeSigning=true'),
    'README.md deve destacar a obrigatoriedade de assinatura digital em release e a distinção do SHA-256'
  );

  console.log('\n' + '='.repeat(70));
  console.log(`Resultado da Verificação de Segurança de Distribuição:`);
  console.log(`  Sucessos: ${passed}`);
  console.log(`  Falhas:   ${failed}`);
  console.log('='.repeat(70));

  if (failed > 0) {
    throw new Error(`A verificação de segurança de distribuição falhou com ${failed} erro(s).`);
  }
}

main().catch((err) => {
  console.error('\n[FATAL] Erro na verificação:', err);
  process.exitCode = 1;
});
