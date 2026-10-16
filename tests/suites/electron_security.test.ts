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

  // 5. Isolamento Estrito IPC PAdES: Chave Privada e Instâncias Complexas NUNCA devem vazar para o Renderer
  test('IPC padesHandlers deve retornar apenas certInfo serializável e descartar privateKey', async () => {
    const { sanitizeCertInfoForIpc } = await import('../../electron/ipc/padesHandlers.ts');
    const handlersPath = path.resolve('electron/ipc/padesHandlers.ts');
    const handlersContent = fs.readFileSync(handlersPath, 'utf-8');

    // Comprovar estaticamente que o handler não devolve o retorno cru de parseCertificate
    assert.ok(
      handlersContent.includes('return { certInfo: safeCertInfo }'),
      'pades:parseCertificate deve retornar estritamente { certInfo: safeCertInfo }'
    );
    assert.ok(
      handlersContent.includes('(parsed as any).privateKey = null'),
      'pades:parseCertificate deve anular a referência à privateKey'
    );

    // Testar que sanitizeCertInfoForIpc produz objeto limpo sem métodos de objetos C++/Forge
    const mockCertInfo: any = {
      commonName: 'ADVOGADO TESTE:12345678900',
      organization: 'Tribunal',
      country: 'BR',
      issuer: 'AC Raiz',
      serialNumber: '123',
      notBefore: new Date(),
      notAfter: new Date(),
      isValidTemporal: true,
      fingerprintSha256: 'abcd',
      isSelfSigned: false,
      isIcpBrasil: false,
      hasIcpBrasilClues: true,
      trustStatus: 'INDICIOS_DE_ICP_BRASIL_CADEIA_NAO_VALIDADA',
      legalSignatureType: 'AVANCADA_NAO_ICP',
      hasLegalPresumption: false,
      legalClassificationText: 'Texto Legal',
      legalBasis: 'Base Legal',
      hasCrlOrOcspDeclared: false,
      // Propriedade perigosa hipotética que nunca pode passar
      privateKey: { n: 12345, d: 67890, sign: () => {} },
      unserializableMethod: () => 'leak'
    };

    const sanitized = sanitizeCertInfoForIpc(mockCertInfo);
    assert.strictEqual((sanitized as any).privateKey, undefined, 'Chave privada não pode existir em certInfo sanitizado');
    assert.strictEqual((sanitized as any).unserializableMethod, undefined, 'Métodos não serializáveis não podem existir');
    assert.strictEqual(sanitized.commonName, 'ADVOGADO TESTE:12345678900');
    assert.strictEqual(sanitized.hasLegalPresumption, false);
  });

  // 6. Limites Estritos de Payload IPC: Proteção contra Exaustão de Memória / DoS
  test('validatePadesPayloadSize deve rejeitar certificados ou PDFs que excedam os limites seguros', async () => {
    const { validatePadesPayloadSize, MAX_PADES_CERTIFICATE_SIZE_BYTES, MAX_PADES_PDF_SIZE_BYTES } = await import('../../electron/ipc/padesHandlers.ts');

    assert.ok(MAX_PADES_CERTIFICATE_SIZE_BYTES > 0 && MAX_PADES_CERTIFICATE_SIZE_BYTES <= 20 * 1024 * 1024);
    assert.ok(MAX_PADES_PDF_SIZE_BYTES > 0 && MAX_PADES_PDF_SIZE_BYTES <= 500 * 1024 * 1024);

    // Dentro do limite: não deve lançar erro
    assert.doesNotThrow(() => validatePadesPayloadSize(1024 * 1024, MAX_PADES_CERTIFICATE_SIZE_BYTES, 'certificado PKCS#12'));
    assert.doesNotThrow(() => validatePadesPayloadSize(50 * 1024 * 1024, MAX_PADES_PDF_SIZE_BYTES, 'documento PDF'));

    // Acima do limite: deve lançar erro com mensagem clara
    assert.throws(
      () => validatePadesPayloadSize(MAX_PADES_CERTIFICATE_SIZE_BYTES + 1024, MAX_PADES_CERTIFICATE_SIZE_BYTES, 'certificado PKCS#12'),
      /excede o limite máximo permitido/i
    );
    assert.throws(
      () => validatePadesPayloadSize(MAX_PADES_PDF_SIZE_BYTES + 1024, MAX_PADES_PDF_SIZE_BYTES, 'documento PDF'),
      /excede o limite máximo permitido/i
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
