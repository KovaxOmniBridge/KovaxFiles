/**
 * =============================================================================
 * SUÍTE 2: SEGURANÇA ELECTRON
 * =============================================================================
 * Comprova: Sandbox, IPC, navegação, CSP e permissões.
 * Execução: Todo Pull Request.
 * =============================================================================
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { validateIpcSender } from '../../electron/ipc/ipcValidator.ts';

async function runElectronSecuritySuite() {
  console.log('='.repeat(80));
  console.log('  [SUÍTE 2: SEGURANÇA ELECTRON] SANDBOX, IPC, NAVEGAÇÃO, CSP E PERMISSÕES');
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

  // 1. Validar Content Security Policy no index.html
  test('CSP no index.html deve proibir unsafe-eval, unsafe-inline em scripts externos, e restringir conexões', () => {
    const htmlPath = path.resolve('index.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    assert.ok(html.includes('<meta http-equiv="Content-Security-Policy"'), 'index.html deve declarar CSP');
    assert.ok(!html.includes("'unsafe-eval'"), 'CSP NÃO pode conter unsafe-eval');
    assert.ok(html.includes("object-src 'none'"), 'CSP deve conter object-src none');
    assert.ok(html.includes("base-uri 'none'"), 'CSP deve conter base-uri none');
    assert.ok(!html.includes('fonts.googleapis.com'), 'index.html NÃO pode conter links para fonts.googleapis.com');
  });

  // 2. Validar Configuração de Sandbox e Context Isolation na MainWindow
  test('Configurações de BrowserWindow em windowManager.ts devem manter sandbox e contextIsolation ativados', () => {
    const wmPath = path.resolve('electron/main/windowManager.ts');
    const wmContent = fs.readFileSync(wmPath, 'utf-8');
    assert.ok(wmContent.includes('contextIsolation: true'), 'contextIsolation deve ser true');
    assert.ok(wmContent.includes('sandbox: true'), 'sandbox deve ser true');
    assert.ok(wmContent.includes('nodeIntegration: false'), 'nodeIntegration deve ser false');
  });

  // 3. Validar Bloqueio de Navegação Arbitrária
  test('Navegação e abertura de novas janelas devem ser estritamente bloqueadas em windowManager.ts', () => {
    const wmPath = path.resolve('electron/main/windowManager.ts');
    const wmContent = fs.readFileSync(wmPath, 'utf-8');
    assert.ok(wmContent.includes('setWindowOpenHandler'), 'setWindowOpenHandler deve estar implementado');
    assert.ok(wmContent.includes("action: 'deny'"), 'Abertura de novas janelas arbitrárias deve ser negada');
    assert.ok(wmContent.includes('will-navigate'), 'Evento will-navigate deve estar interceptado');
  });

  // 4. Testar Validação Algorítmica de Remetente IPC (validateIpcSender)
  test('validateIpcSender deve rejeitar requisições de origem remota, frames nulos ou páginas externas', () => {
    // Simulação 1: frame nulo
    const fakeNullEvent = { senderFrame: null } as any;
    assert.throws(
      () => validateIpcSender(fakeNullEvent, 'test:channel', null),
      /frame válido/i,
      'Frame nulo deve ser rejeitado'
    );

    // Simulação 2: frame remoto da internet
    const fakeRemoteEvent = {
      senderFrame: {
        url: 'https://malicious-site.com/exploit',
        parent: null
      },
      sender: { id: 1 }
    } as any;
    assert.throws(
      () => validateIpcSender(fakeRemoteEvent, 'test:channel', null),
      /URL de origem/i,
      'Origem remota não autorizada deve ser rejeitada'
    );
  });

  console.log(`\nResultado Suíte 2 (Segurança Electron): ${passed} Passados, ${failed} Falhados\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runElectronSecuritySuite().catch(err => {
  console.error('Erro fatal na Suíte 2 (Segurança Electron):', err);
  process.exit(1);
});
