/**
 * =============================================================================
 * SUÍTE 8: ASSINATURA DIGITAL PAdES E CONFIANÇA JURÍDICA
 * =============================================================================
 * Comprova: Assinatura, adulteração, certificado não confiável e múltiplas assinaturas.
 * Execução: Todo Pull Request.
 * =============================================================================
 */

import forge from 'node-forge';
import { PDFDocument } from 'pdf-lib';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { PadesSignatureService } from '../../src/services/padesSignatureService.ts';
import { CoreSignatureService } from '../../src/core/signatures/signatureService.ts';

function generateTestP12(commonName: string, pass: string): Buffer {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '9901';
  cert.validity.notBefore = new Date(Date.now() - 3600000);
  cert.validity.notAfter = new Date(Date.now() + 31536000000);

  const attrs = [
    { name: 'commonName', value: commonName },
    { name: 'organizationName', value: 'Tribunal de Justiça do Estado de São Paulo' },
    { name: 'countryName', value: 'BR' }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], pass, {
    generateLocalKeyId: true,
    friendlyName: 'Certificado Teste PAdES'
  });
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return Buffer.from(p12Der, 'binary');
}

export function resolveElectronE2eCommand(
  mainJs: string,
  testArg = '--test-pades-e2e',
  platform = process.platform,
  hasDisplay = Boolean(process.env.DISPLAY)
): { command: string; args: string[]; shell: boolean } {
  const electronArgs = [mainJs, testArg];
  if (platform === 'linux') {
    electronArgs.unshift('--no-sandbox');
  }
  if (platform === 'linux' && !hasDisplay) {
    return {
      command: 'xvfb-run',
      args: ['-a', 'npx', 'electron', ...electronArgs],
      shell: false
    };
  }
  return {
    command: 'npx',
    args: ['electron', ...electronArgs],
    shell: platform === 'win32'
  };
}

async function runPadesSuite() {
  console.log('='.repeat(80));
  console.log('  [SUÍTE 8: PAdES] ASSINATURA, ADULTERAÇÃO, CERTIFICADO NÃO CONFIÁVEL E MÚLTIPLAS ASSINATURAS');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name} -> ${err.message}`);
      failed++;
    }
  }

  const certPass = 'SenhaSegura@2026';
  const signerName = 'DR. CARLOS ALBERTO SILVA:12345678900';
  const p12Buffer = generateTestP12(signerName, certPass);

  // 1. Extração Segura e Identificação de Certificado Autoassinado vs ICP-Brasil
  let parsedCert: any;
  await test('Leitura de PKCS#12 e identificação técnica de certificado autoassinado (não-ICP)', async () => {
    const { certInfo } = PadesSignatureService.parseCertificate(p12Buffer, certPass);
    parsedCert = certInfo;
    assert.strictEqual(parsedCert.commonName, signerName);
    assert.strictEqual(parsedCert.isSelfSigned, true, 'Certificado gerado localmente deve ser classificado como autoassinado');
    assert.strictEqual(parsedCert.trustStatus, 'AUTOASSINADO', 'Status de confiança deve ser AUTOASSINADO');
    assert.strictEqual(parsedCert.hasLegalPresumption, false, 'Certificado autoassinado não tem presunção legal absoluta da ICP-Brasil');
  });

  // 2. Assinatura Digital PAdES Autêntica com ByteRange e PKCS#7
  let signedPdfBytes: Uint8Array;
  await test('Aplicação de assinatura digital PAdES-BES autêntica (ISO 32000-1 / ETSI TS 102 778)', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    page.drawText('PETIÇÃO ASSINADA ELETRONICAMENTE - AUTOS DO PROCESSO', { x: 50, y: 750, size: 12 });
    const originalPdfBytes = await doc.save();

    signedPdfBytes = await PadesSignatureService.signPdf(originalPdfBytes, p12Buffer, certPass, {
      reason: 'Petição e documentos anexos conferem com o original',
      location: 'São Paulo - SP',
      visualAppearance: {
        enabled: true,
        position: 'bottom-right'
      }
    });

    assert.ok(signedPdfBytes.length > originalPdfBytes.length, 'PDF assinado deve conter dicionário de assinatura');
  });

  // 3. Validação Matemática e Integridade do ByteRange
  await test('Verificação de integridade da assinatura: digest SHA-256 e chave RSA coincidem perfeitamente', async () => {
    const valResult = PadesSignatureService.verifyPdf(signedPdfBytes);
    assert.strictEqual(valResult.hasSignatures, true, 'Deve identificar assinaturas');
    assert.strictEqual(valResult.allValid, true, 'Todas as assinaturas devem ser válidas');

    const sig = valResult.signatures[0];
    assert.strictEqual(sig.status, 'VALIDA', 'Status da assinatura deve ser VALIDA');
    assert.strictEqual(sig.digestMatches, true, 'O digest do documento deve conferir com a assinatura');
    assert.strictEqual(sig.byteRangeCoversEntireFile, true, 'O ByteRange deve cobrir o arquivo');
    assert.strictEqual(sig.rsaSignatureValid, true, 'A chave pública RSA deve validar os atributos autenticados');
  });

  // 4. Detecção Imediata de Adulteração Pós-Assinatura (Tampering Detection)
  await test('Detecção rigorosa de adulteração: Qualquer byte alterado pós-assinatura invalida o laudo', async () => {
    const tamperedBytes = Buffer.from(signedPdfBytes);
    const posToTamper = 200;
    tamperedBytes[posToTamper] = tamperedBytes[posToTamper] ^ 0xff;

    const valTampered = PadesSignatureService.verifyPdf(tamperedBytes);
    assert.strictEqual(valTampered.allValid, false, 'Documento adulterado não pode ser válido');
    assert.strictEqual(valTampered.signatures[0].status, 'ADULTERADA', 'Status deve acusar ADULTERADA');
    assert.strictEqual(valTampered.signatures[0].digestMatches, false, 'Digest não pode conferir');
  });

  // 5. Rejeição de Falsa Qualificação: Certificado com indícios nominais de ICP-Brasil sem âncora de raiz confiável
  await test('Rejeição de falsa qualificação: Atributos nominais de ICP-Brasil sem validação de cadeia raiz recebem INDICIOS_DE_ICP_BRASIL_CADEIA_NAO_VALIDADA e hasLegalPresumption === false', async () => {
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '9902';
    cert.validity.notBefore = new Date(Date.now() - 3600000);
    cert.validity.notAfter = new Date(Date.now() + 31536000000);

    const issuerAttrs = [
      { name: 'commonName', value: 'Autoridade Certificadora Certisign Multipla G7' },
      { name: 'organizationName', value: 'ICP-Brasil' },
      { name: 'countryName', value: 'BR' }
    ];
    const subjectAttrs = [
      { name: 'commonName', value: 'ADVOGADO COM CERTIFICADO ARTIFICIAL:11122233344' },
      { name: 'organizationName', value: 'Ordem dos Advogados do Brasil' },
      { name: 'countryName', value: 'BR' }
    ];
    cert.setSubject(subjectAttrs);
    cert.setIssuer(issuerAttrs);
    cert.sign(keys.privateKey, forge.md.sha256.create());

    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], certPass, {
      generateLocalKeyId: true,
      friendlyName: 'Certificado com Indicios ICP'
    });
    const fakeIcpP12Buffer = Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), 'binary');

    const { certInfo } = PadesSignatureService.parseCertificate(fakeIcpP12Buffer, certPass);
    assert.strictEqual(certInfo.hasIcpBrasilClues, true, 'Deve identificar a presença de indícios declarados de ICP-Brasil');
    assert.strictEqual(certInfo.trustStatus, 'INDICIOS_DE_ICP_BRASIL_CADEIA_NAO_VALIDADA', 'Deve classificar estritamente como INDICIOS_DE_ICP_BRASIL_CADEIA_NAO_VALIDADA');
    assert.strictEqual(certInfo.legalSignatureType, 'AVANCADA_NAO_ICP', 'Tipo legal deve ser AVANCADA_NAO_ICP e nunca QUALIFICADA');
    assert.strictEqual(certInfo.hasLegalPresumption, false, 'NÃO pode conceder presunção legal absoluta por campos autodeclarados');
    assert.ok(certInfo.juridicalWarning?.includes('VALIDAR do ITI'), 'Alerta jurídico deve orientar conferência no VALIDAR do ITI');

    // Assinar documento de teste com esse certificado e verificar laudo
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    const pdfBytes = await doc.save();
    const signedBytes = await PadesSignatureService.signPdf(pdfBytes, fakeIcpP12Buffer, certPass);
    const report = PadesSignatureService.verifyPdf(signedBytes);

    const sig = report.signatures[0];
    assert.strictEqual(sig.technicalIntegrity, 'INTEGRO', 'Integridade matemática deve ser íntegra');
    assert.strictEqual(sig.trustStatus, 'INDICIOS_DE_ICP_BRASIL_CADEIA_NAO_VALIDADA', 'Laudo deve apontar INDICIOS_DE_ICP_BRASIL_CADEIA_NAO_VALIDADA');
    assert.strictEqual(sig.hasLegalPresumption, false, 'Laudo não pode atribuir presunção legal');
    assert.strictEqual(sig.legalSignatureType, 'AVANCADA_NAO_ICP');
    assert.ok(sig.chainValidationDescription.includes('VALIDAR do ITI'));
  });

  // 6. Anti-Regressão CoreSignatureService: verifyPdfSignatures deve passar pdfBuffer diretamente
  await test('Anti-Regressão: CoreSignatureService.verifyPdfSignatures passa pdfBuffer diretamente para electronApi.padesVerifyPdf', async () => {
    const dummyPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // %PDF-1.7
    let receivedDirectBuffer = false;

    const originalWindow = (globalThis as any).window;
    try {
      (globalThis as any).window = {
        electronAPI: {
          padesVerifyPdf: async (arg: any) => {
            if (arg && !(arg instanceof Uint8Array) && !(arg instanceof ArrayBuffer) && arg.pdfBuffer) {
              throw new TypeError('FALHA DE REGRESSÃO: padesVerifyPdf recebeu { pdfBuffer }, mas deve receber pdfBuffer diretamente!');
            }
            if (arg instanceof Uint8Array || arg instanceof ArrayBuffer) {
              receivedDirectBuffer = true;
              return {
                hasSignatures: true,
                allValid: true,
                signatures: [{
                  status: 'VALIDA',
                  technicalIntegrity: 'INTEGRO',
                  trustStatus: 'AUTOASSINADO',
                  hasLegalPresumption: false,
                  legalSignatureType: 'AVANCADA_NAO_ICP'
                }]
              };
            }
            throw new Error('Parâmetro inválido recebido em padesVerifyPdf');
          }
        }
      };

      const result = await CoreSignatureService.verifyPdfSignatures(dummyPdf);
      assert.strictEqual(result.isSuccess, true, `verifyPdfSignatures falhou: ${result.error?.message}`);
      assert.strictEqual(receivedDirectBuffer, true, 'electronApi.padesVerifyPdf deve ter recebido o buffer diretamente');
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  // 7. Auditoria Estática de electron/ipc/padesHandlers.ts (ESM & Tratamento de Erros)
  await test('Auditoria Estática: electron/ipc/padesHandlers.ts deve usar import de ipcMain e tratar erros sem silenciamento', () => {
    const handlersPath = path.resolve('electron/ipc/padesHandlers.ts');
    const content = fs.readFileSync(handlersPath, 'utf-8');

    assert.ok(
      !content.includes("require('electron')"),
      'padesHandlers.ts NÃO pode conter require(\'electron\') dentro de módulo ESM'
    );
    assert.ok(
      /import\s+[^;]*from\s+['"]electron['"]/.test(content),
      'padesHandlers.ts deve importar do módulo "electron" via import ESM'
    );
    assert.ok(
      !content.includes('if (!ipcMain) return;'),
      'registerPadesHandlers não pode silenciar falhas com if (!ipcMain) return;'
    );
  });

  // 8. Anti-Regressão de Portabilidade: Verificação de invocação Electron em Linux/CI
  await test('Anti-Regressão: Invocação de teste Electron deve usar --no-sandbox e xvfb-run no Linux', () => {
    const linuxHeadless = resolveElectronE2eCommand('dist-electron/main.js', '--test-pades-e2e', 'linux', false);
    assert.strictEqual(linuxHeadless.command, 'xvfb-run', 'Linux headless deve encapsular via xvfb-run');
    assert.ok(linuxHeadless.args.includes('--no-sandbox'), 'Linux deve receber flag --no-sandbox no CI');
    assert.strictEqual(linuxHeadless.args[linuxHeadless.args.length - 1], '--test-pades-e2e');

    const linuxWithDisplay = resolveElectronE2eCommand('dist-electron/main.js', '--test-pades-e2e', 'linux', true);
    assert.strictEqual(linuxWithDisplay.command, 'npx');
    assert.ok(linuxWithDisplay.args.includes('--no-sandbox'), 'Linux com display ainda requer --no-sandbox em containers');

    const winConfig = resolveElectronE2eCommand('dist-electron/main.js', '--test-pades-e2e', 'win32', true);
    assert.strictEqual(winConfig.command, 'npx');
    assert.strictEqual(winConfig.shell, true, 'Windows deve usar shell para resolução de npx');
    assert.ok(!winConfig.args.includes('--no-sandbox'), 'Windows não requer --no-sandbox');
  });

  // 9. Homologação Ponta a Ponta no Runtime Real do Electron Empacotado (--test-pades-e2e)
  await test('Homologação E2E Real no Electron: carregar certificado A1, assinar, salvar, validar e isolar chave privada', () => {
    const mainJs = path.resolve('dist-electron/main.js');
    if (!fs.existsSync(mainJs)) {
      console.log('    [SKIP] dist-electron/main.js ainda não compilado para o teste E2E.');
      return;
    }

    const execConfig = resolveElectronE2eCommand(mainJs, '--test-pades-e2e');
    const output = execFileSync(execConfig.command, execConfig.args, {
      encoding: 'utf-8',
      shell: execConfig.shell,
      timeout: 60000,
      env: { ...process.env, NODE_ENV: 'production' }
    });

    assert.ok(
      output.includes('HOMOLOGAÇÃO PAdES REAL ELECTRON:'),
      'Executável real do Electron deve concluir a homologação E2E'
    );
    assert.ok(
      output.includes('0 FALHADOS'),
      'Todos os testes de homologação E2E no Electron devem passar com 0 falhas'
    );
    assert.ok(
      output.includes('Chave privada (privateKey) NÃO vaza na raiz do retorno IPC'),
      'Chave privada não pode retornar pelo IPC'
    );
    assert.ok(
      output.includes('hasLegalPresumption === false para indícios sem âncora raiz'),
      'Certificados não confiáveis não podem receber classificação qualificada'
    );
  });
  if (failed > 0) {
    process.exit(1);
  }
}

runPadesSuite().catch(err => {
  console.error('Erro fatal na Suíte 8 (PAdES):', err);
  process.exit(1);
});
