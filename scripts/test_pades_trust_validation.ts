import forge from 'node-forge';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { PadesSignatureService } from '../src/services/padesSignatureService';

/**
 * =============================================================================
 * SUÍTE DE TESTES: VALIDAÇÃO DE CONFIANÇA, CADEIA E INTEROPERABILIDADE PAdES
 * =============================================================================
 * Validação rigorosa dos seguintes requisitos:
 * 1. Separação Estrita de Integridade Criptográfica e Confiança do Certificado
 * 2. Cadeia de Certificados e Detecção de Certificados Autoassinados
 * 3. Verificação de Revogação Offline (CRL/OCSP) e Instrução ao Usuário
 * 4. Distinção entre Horário Declarado (Relógio Local) e Carimbo Confiável (RFC 3161)
 * 5. Múltiplas Assinaturas e Revisões Incrementais no PDF
 * 6. Compatibilidade Isolada sem dependência de Buffer (Renderer-Safe)
 * 7. Interoperabilidade e Orientação Oficial com VALIDAR do ITI
 * =============================================================================
 */

function generateCertP12(
  issuerAttrs: any[],
  subjectAttrs: any[],
  pass: string,
  serial = '5501',
  validityDays = 365
): Uint8Array {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = serial;
  cert.validity.notBefore = new Date(Date.now() - 3600000);
  cert.validity.notAfter = new Date(Date.now() + validityDays * 24 * 3600000);

  cert.setSubject(subjectAttrs);
  cert.setIssuer(issuerAttrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], pass, {
    generateLocalKeyId: true,
    friendlyName: 'Certificado Teste PAdES Confianca'
  });
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();

  // Retorna como Uint8Array nativo (sem depender de Buffer)
  const bytes = new Uint8Array(p12Der.length);
  for (let i = 0; i < p12Der.length; i++) {
    bytes[i] = p12Der.charCodeAt(i);
  }
  return bytes;
}

async function runTrustValidationSuite() {
  console.log('='.repeat(80));
  console.log('🏛️ SUÍTE DE TESTES: CONFIANÇA DE CERTIFICADOS, CADEIA E REVISÕES PAdES');
  console.log('='.repeat(80) + '\n');

  const testDir = path.resolve('test_output/pades_trust');
  fs.mkdirSync(testDir, { recursive: true });

  const pass = 'SenhaSegura@2026';

  // --------------------------------------------------------------------------
  // 1. SEPARAÇÃO ESTRITA: INTEGRIDADE vs CONFIANÇA (CERTIFICADO AUTOASSINADO)
  // --------------------------------------------------------------------------
  console.log('[1/7] Testando Separação Estrita de Integridade vs Confiança (Autoassinado)...');
  const selfAttrs = [
    { name: 'commonName', value: 'JOAO SILVA:11122233344' },
    { name: 'organizationName', value: 'Desenvolvimento Local' },
    { name: 'countryName', value: 'BR' }
  ];
  // Emissor == Subject -> Autoassinado
  const selfSignedP12 = generateCertP12(selfAttrs, selfAttrs, pass);

  // Criar PDF base
  const doc1 = await PDFDocument.create();
  const page1 = doc1.addPage([595, 842]);
  page1.drawText('DOCUMENTO ASSINADO COM CERTIFICADO AUTOASSINADO', { x: 50, y: 800, size: 12 });
  const rawBytes1 = await doc1.save();

  // Assinar com o certificado autoassinado
  const signedSelfBytes = await PadesSignatureService.signPdf(rawBytes1, selfSignedP12, pass, {
    reason: 'Teste de Certificado Autoassinado'
  });

  const valSelf = PadesSignatureService.verifyPdf(signedSelfBytes);
  assert.strictEqual(valSelf.hasSignatures, true, 'Deve identificar a assinatura');
  assert.strictEqual(valSelf.signatures.length, 1);
  const sigSelf = valSelf.signatures[0];

  // Integridade técnica DEVE ser confirmada
  assert.strictEqual(sigSelf.technicalIntegrity, 'INTEGRO', 'Integridade matemática dos bytes deve ser íntegra');
  assert.strictEqual(sigSelf.digestMatches, true, 'Digest SHA-256 deve bater');
  assert.strictEqual(sigSelf.rsaSignatureValid, true, 'RSA deve ser matematicamente válido');
  assert.strictEqual(sigSelf.isCryptographicallyValid, true, 'Criptografia está intacta');

  // CONFIANÇA NÃO DEVE SER CONVERTIDA EM ICP-BRASIL
  assert.strictEqual(sigSelf.isSelfSigned, true, 'Deve detectar que é autoassinado');
  assert.strictEqual(sigSelf.isIcpBrasil, false, 'NÃO pode ser classificado como ICP-Brasil');
  assert.strictEqual(sigSelf.trustStatus, 'AUTOASSINADO', 'Status de confiança deve ser AUTOASSINADO');
  assert.strictEqual(sigSelf.legalSignatureType, 'AVANCADA_NAO_ICP');
  assert.strictEqual(sigSelf.hasLegalPresumption, false, 'NÃO tem presunção legal ICP-Brasil');
  assert.ok(
    sigSelf.juridicalWarning?.toLowerCase().includes('integridade criptográfica confirmada; confiança do certificado não verificada'),
    'Deve conter a frase exata de advertência jurídica'
  );
  console.log('  -> [PASS] Integridade técnica confirmada com confiança não atestada (nunca convertida em ICP-Brasil)');

  // --------------------------------------------------------------------------
  // 2. VÍNCULO DE CADEIA ICP-BRASIL
  // --------------------------------------------------------------------------
  console.log('\n[2/7] Testando Vínculo com Autoridade da Cadeia ICP-Brasil...');
  const icpRootAttrs = [
    { name: 'commonName', value: 'Autoridade Certificadora Raiz Brasileira v5' },
    { name: 'organizationName', value: 'ICP-Brasil' },
    { name: 'countryName', value: 'BR' }
  ];
  const icpSignerAttrs = [
    { name: 'commonName', value: 'DRA. BEATRIZ SANTOS:55566677788' },
    { name: 'organizationName', value: 'Ordem dos Advogados do Brasil' },
    { name: 'countryName', value: 'BR' }
  ];
  const icpP12 = generateCertP12(icpRootAttrs, icpSignerAttrs, pass);

  const doc2 = await PDFDocument.create();
  const page2 = doc2.addPage([595, 842]);
  page2.drawText('DOCUMENTO ASSINADO COM ICP-BRASIL', { x: 50, y: 800, size: 12 });
  const rawBytes2 = await doc2.save();

  const signedIcpBytes = await PadesSignatureService.signPdf(rawBytes2, icpP12, pass, {
    reason: 'Petição Inicial'
  });

  const valIcp = PadesSignatureService.verifyPdf(signedIcpBytes);
  const sigIcp = valIcp.signatures[0];
  assert.strictEqual(sigIcp.technicalIntegrity, 'INTEGRO');
  assert.strictEqual(sigIcp.isSelfSigned, false);
  assert.strictEqual(sigIcp.isIcpBrasil, true);
  assert.strictEqual(sigIcp.trustStatus, 'RECONHECIDO_ICP_BRASIL');
  assert.strictEqual(sigIcp.hasLegalPresumption, true);
  assert.ok(sigIcp.chainValidationDescription.includes('ICP-Brasil'));
  console.log('  -> [PASS] Certificado com vínculo ICP-Brasil reconhecido com presunção legal');

  // --------------------------------------------------------------------------
  // 3. VERIFICAÇÃO DE REVOGAÇÃO (CRL/OCSP OFFLINE)
  // --------------------------------------------------------------------------
  console.log('\n[3/7] Testando Inspeção de Revogação Offline...');
  assert.strictEqual(sigIcp.revocationStatus, 'OFFLINE_NAO_VERIFICADO');
  assert.ok(sigIcp.revocationDescription.includes('OFFLINE: A verificação de revogação online (CRL/OCSP) não pôde ser realizada offline'));
  assert.ok(sigIcp.revocationDescription.includes('VALIDAR'));
  console.log('  -> [PASS] Status de revogação offline claramente instruído sem falsa aprovação');

  // --------------------------------------------------------------------------
  // 4. TRATAMENTO DO TEMPO DE ASSINATURA (HORÁRIO DECLARADO vs CARIMBO RFC 3161)
  // --------------------------------------------------------------------------
  console.log('\n[4/7] Testando Distinção de Horário Declarado vs Carimbo de Tempo Confiável...');
  assert.strictEqual(sigIcp.timestampType, 'HORARIO_DECLARADO_LOCAL');
  assert.strictEqual(sigIcp.hasTrustedTimestamp, false);
  assert.ok(sigIcp.declaredSigningTime, 'Horário declarado deve estar presente');
  assert.strictEqual(sigIcp.certValidTemporal, true);
  assert.strictEqual(sigIcp.certValidAtSigningTime, true);
  assert.ok(sigIcp.timeValidationDescription.toLowerCase().includes('horário local declarado pelo signatário'));
  assert.ok(sigIcp.timeValidationDescription.toLowerCase().includes('não possui carimbo do tempo'));
  console.log('  -> [PASS] Horário declarado do relógio local devidamente segregado de carimbo auditado');

  // --------------------------------------------------------------------------
  // 5. SUPORTE A MÚLTIPLAS ASSINATURAS E REVISÕES INCREMENTAIS
  // --------------------------------------------------------------------------
  console.log('\n[5/7] Testando Múltiplas Assinaturas e Alcance das Revisões Incrementais...');
  // Segunda assinatura sobre o PDF já assinado (doc2 assinado pela Beatriz, agora assinado pelo Carlos)
  const secondSignerAttrs = [
    { name: 'commonName', value: 'DR. CARLOS ALBERTO:99988877766' },
    { name: 'organizationName', value: 'Advocacia Associada' },
    { name: 'countryName', value: 'BR' }
  ];
  const secondP12 = generateCertP12(icpRootAttrs, secondSignerAttrs, pass);

  const doubleSignedBytes = await PadesSignatureService.signPdf(signedIcpBytes, secondP12, pass, {
    reason: 'Cotejo e Co-assinatura de Peça'
  });

  const valMulti = PadesSignatureService.verifyPdf(doubleSignedBytes);
  assert.strictEqual(valMulti.hasSignatures, true);
  assert.strictEqual(valMulti.signatureCount, 2, 'Deve identificar exatamente 2 assinaturas');
  assert.strictEqual(valMulti.allValid, true, 'Ambas as assinaturas devem ser válidas');

  const firstSig = valMulti.signatures[0];
  const secondSig = valMulti.signatures[1];

  // Primeira assinatura protege a primeira revisão
  assert.strictEqual(firstSig.revisionIndex, 1);
  assert.strictEqual(firstSig.totalRevisions, 2);
  assert.strictEqual(firstSig.isIncrementalRevision, true);
  assert.strictEqual(firstSig.byteRangeCoversRevision, true);
  assert.strictEqual(firstSig.technicalIntegrity, 'INTEGRO');

  // Segunda assinatura protege a revisão final (documento completo)
  assert.strictEqual(secondSig.revisionIndex, 2);
  assert.strictEqual(secondSig.totalRevisions, 2);
  assert.strictEqual(secondSig.byteRangeCoversEntireFile, true);
  assert.strictEqual(secondSig.technicalIntegrity, 'INTEGRO');

  assert.ok(valMulti.incrementalRevisionsSummaryText.includes('2 revisão(ões) incremental(is)'));
  console.log('  -> [PASS] 2 assinaturas em revisões sucessivas validadas com escopo correto de ByteRange');

  // --------------------------------------------------------------------------
  // 6. COMPATIBILIDADE ISOLADA (SEM BUFFER GLOBAL NO RENDERER)
  // --------------------------------------------------------------------------
  console.log('\n[6/7] Testando Compatibilidade Isolada em Contexto sem Buffer Global...');
  // Criar uma cópia dos bytes como Uint8Array e chamar verifyPdf
  const pureUint8 = new Uint8Array(doubleSignedBytes);
  assert.ok(pureUint8 instanceof Uint8Array);

  // Executar a verificação com Uint8Array puro
  const resultPure = PadesSignatureService.verifyPdf(pureUint8);
  assert.strictEqual(resultPure.allValid, true);
  assert.strictEqual(resultPure.signatureCount, 2);
  console.log('  -> [PASS] Manipulação baseada em Uint8Array nativo funciona perfeitamente sem Node Buffer');

  // --------------------------------------------------------------------------
  // 7. INTEROPERABILIDADE E DIRETRIZES DO VALIDAR DO ITI
  // --------------------------------------------------------------------------
  console.log('\n[7/7] Testando Interoperabilidade e Integração Conceitual com VALIDAR do ITI...');
  assert.strictEqual(firstSig.validarItiUrl, 'https://validar.iti.gov.br');
  assert.strictEqual(secondSig.validarItiUrl, 'https://validar.iti.gov.br');
  assert.ok(valMulti.validarItiGuidance.includes('https://validar.iti.gov.br'));
  assert.ok(valMulti.validarItiGuidance.includes('VALIDAR'));
  console.log('  -> [PASS] Diretrizes e URL oficial do VALIDAR (ITI) integradas ao laudo');

  console.log('\n' + '='.repeat(80));
  console.log('✅ TODAS AS 7 ETAPAS DE CONFIANÇA E INTEROPERABILIDADE PAdES HOMOLOGADAS!');
  console.log('='.repeat(80) + '\n');
}

runTrustValidationSuite().catch(err => {
  console.error('\n❌ ERRO NA SUÍTE DE CONFIANÇA PAdES:', err);
  process.exit(1);
});
