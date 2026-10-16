/**
 * =============================================================================
 * KOVAXFILES DESKTOP — TESTE E2E DE JANELA, PRELOAD E IPC REAL DO ELECTRON
 * =============================================================================
 * Valida a execução completa de ponta a ponta na janela real do Chromium:
 * 1. Ciclo de vida da BrowserWindow e carregamento do DOM.
 * 2. Preload Script, isolamento via ContextBridge e ausência de vazamento de Node/process.
 * 3. Comunicação IPC bidirecional com o processo principal (getAppVersion, saveExportedFile).
 * 4. Fluxo criptográfico completo PAdES (assinatura, validação, laudo forense e integridade).
 * 5. Isolamento de chaves privadas no IPC e rejeição de assinaturas adulteradas.
 * =============================================================================
 */

import { spawnSync } from 'child_process';
import assert from 'assert';

async function runElectronWindowIpcE2e() {
  console.log('='.repeat(80));
  console.log('  [E2E: ELECTRON WINDOW, PRELOAD & IPC] HOMOLOGAÇÃO DE EXECUÇÃO REAL');
  console.log('='.repeat(80) + '\n');

  // ETAPA 1: Execução do Smoke Test de Ambiente Limpo (Janela, DOM, Preload, IPC Básico)
  console.log('[1/2] Executando verificação de Janela, Preload e IPC no runtime Electron...');
  const smokeProc = spawnSync('npx', ['electron', '.', '--smoke-test'], {
    shell: true,
    encoding: 'utf-8',
    timeout: 45000,
    env: { ...process.env, FORCE_COLOR: '0' }
  });

  const smokeOutput = (smokeProc.stdout || '') + (smokeProc.stderr || '');

  assert.strictEqual(
    smokeProc.status,
    0,
    `Smoke test do Electron falhou com código ${smokeProc.status}.\nOutput:\n${smokeOutput}`
  );

  assert.ok(
    smokeOutput.includes('[CleanRuntime:Interface] Janela principal e DOM carregados com sucesso'),
    'BrowserWindow deve inicializar e renderizar o DOM com elemento root'
  );

  assert.ok(
    smokeOutput.includes('[CleanRuntime:Preload] ContextBridge e API segura expostos no renderer'),
    'Preload script deve expor window.electronAPI sem vazar require ou process'
  );

  assert.ok(
    smokeOutput.includes('[CleanRuntime:IPC] Comunicação IPC bidirecional validada'),
    'Comunicação IPC com o processo principal deve responder adequadamente'
  );

  assert.ok(
    smokeOutput.includes('HOMOLOGAÇÃO DE DISTRIBUIÇÃO EM AMBIENTE LIMPO: 100% SUCESSO'),
    'Atestação de 100% de sucesso no runtime limpo'
  );
  console.log('  ✅ Janela BrowserWindow, Preload e IPC validados com sucesso.');

  // ETAPA 2: Execução do Teste Criptográfico PAdES no Runtime Real (IPC Criptográfico e Chaves)
  console.log('\n[2/2] Executando validação criptográfica PAdES e isolamento de chaves via IPC...');
  const padesProc = spawnSync('npx', ['electron', '.', '--test-pades-e2e'], {
    shell: true,
    encoding: 'utf-8',
    timeout: 45000,
    env: { ...process.env, FORCE_COLOR: '0' }
  });

  const padesOutput = (padesProc.stdout || '') + (padesProc.stderr || '');

  assert.strictEqual(
    padesProc.status,
    0,
    `Teste criptográfico PAdES no Electron falhou com código ${padesProc.status}.\nOutput:\n${padesOutput}`
  );

  assert.ok(
    padesOutput.includes('Chave privada (privateKey) NÃO vaza na raiz do retorno IPC'),
    'IPC não pode expor chave privada na raiz do payload retornado'
  );

  assert.ok(
    padesOutput.includes('Chave privada NÃO existe dentro de certInfo'),
    'certInfo devolvido à janela renderizadora deve ser estritamente sanitizado'
  );

  assert.ok(
    padesOutput.includes('Documento adulterado é REJEITADO (allValid === false)'),
    'Adulteração pós-assinatura deve ser categoricamente rejeitada pelo IPC de validação'
  );

  assert.ok(
    padesOutput.includes('HOMOLOGAÇÃO PAdES REAL ELECTRON: 31 PASSADOS, 0 FALHADOS'),
    'Todas as 31 asserções criptográficas e de segurança do Electron devem passar'
  );
  console.log('  ✅ Fluxo criptográfico PAdES e isolamento de chaves via IPC homologados com sucesso.');

  console.log('\n' + '='.repeat(80));
  console.log('  🎉 TODOS OS FLUXOS COMPLETOS DE JANELA, PRELOAD E IPC APROVADOS!');
  console.log('='.repeat(80) + '\n');
}

runElectronWindowIpcE2e().catch(err => {
  console.error('\n❌ Falha fatal no teste de Janela, Preload e IPC do Electron:', err);
  process.exit(1);
});
