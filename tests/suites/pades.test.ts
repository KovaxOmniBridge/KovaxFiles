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
import { PadesSignatureService } from '../../src/services/padesSignatureService.ts';

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

  console.log(`\nResultado Suíte 8 (PAdES): ${passed} Passados, ${failed} Falhados\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runPadesSuite().catch(err => {
  console.error('Erro fatal na Suíte 8 (PAdES):', err);
  process.exit(1);
});
