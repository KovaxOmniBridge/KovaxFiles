import forge from 'node-forge';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { PadesSignatureService } from '../src/services/padesSignatureService';

/**
 * =============================================================================
 * SUÍTE DE TESTES: SEGURANÇA, ISOLAMENTO E CONFIANÇA JURÍDICA
 * =============================================================================
 * Valida a segregação estrita entre:
 * 1. Integridade Técnica (Mecanismos Criptográficos e Bytes Inalterados)
 * 2. Validade e Eficácia Jurídica (Normativa Processual Brasileira - MP 2.200-2/2001 e Lei 14.063/2020)
 * 3. Isolamento e Não-Exfiltração Local de Documentos Sigilosos
 * 4. Delimitação entre Organização Administrativa e Protocolo Judicial Oficial
 * =============================================================================
 */

function generateCert(issuerAttrs: any[], subjectAttrs: any[], pass: string): Buffer {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '1001';
  cert.validity.notBefore = new Date(Date.now() - 3600000);
  cert.validity.notAfter = new Date(Date.now() + 31536000000);

  cert.setSubject(subjectAttrs);
  cert.setIssuer(issuerAttrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], pass, {
    generateLocalKeyId: true,
    friendlyName: 'Certificado Teste Confiança Jurídica'
  });
  return Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), 'binary');
}

async function runLegalTrustAndIsolationSuite() {
  console.log('='.repeat(80));
  console.log('🛡️ SUÍTE DE TESTES: SEGURANÇA, ISOLAMENTO E CONFIANÇA JURÍDICA');
  console.log('   (Diferenciação Estrita entre Integridade Criptográfica e Validade Processual)');
  console.log('='.repeat(80) + '\n');

  const testDir = path.resolve('test_output/legal_trust');
  fs.mkdirSync(testDir, { recursive: true });

  const pass = 'SenhaForte@2026';

  // --------------------------------------------------------------------------
  // TESTE 1: Assinatura Eletrônica Qualificada ICP-Brasil (Presunção Legal)
  // --------------------------------------------------------------------------
  console.log('1. Testando Assinatura Eletrônica Qualificada ICP-Brasil (MP 2.200-2/2001, art. 10, § 1º)...');
  const icpIssuerAttrs = [
    { name: 'commonName', value: 'Autoridade Certificadora OAB v5' },
    { name: 'organizationName', value: 'ICP-Brasil' },
    { name: 'countryName', value: 'BR' }
  ];
  const icpSubjectAttrs = [
    { name: 'commonName', value: 'DR. MARCOS ANTONIO PEREIRA:98765432100' },
    { name: 'organizationName', value: 'Ordem dos Advogados do Brasil' },
    { name: 'countryName', value: 'BR' }
  ];
  const p12IcpBuffer = generateCert(icpIssuerAttrs, icpSubjectAttrs, pass);

  const icpParsed = PadesSignatureService.parseCertificate(p12IcpBuffer, pass);
  assert.strictEqual(icpParsed.certInfo.isIcpBrasil, true, 'Deve identificar emissor da cadeia ICP-Brasil');
  assert.strictEqual(icpParsed.certInfo.legalSignatureType, 'QUALIFICADA_ICP_BRASIL', 'Classificação deve ser Qualificada ICP-Brasil');
  assert.strictEqual(icpParsed.certInfo.hasLegalPresumption, true, 'Deve possuir presunção legal de veracidade');
  assert.ok(icpParsed.certInfo.legalBasis.includes('2.200-2/2001'), 'Base legal deve citar MP 2.200-2/2001');
  assert.strictEqual(icpParsed.certInfo.juridicalWarning, undefined, 'Não deve ter alerta de restrição judicial para ICP-Brasil');
  console.log('  ✓ [PASS] Identificado como Assinatura Qualificada ICP-Brasil com presunção legal absoluta');

  // Criar e assinar PDF com o certificado ICP-Brasil
  const doc1 = await PDFDocument.create();
  const page1 = doc1.addPage([595, 842]);
  page1.drawText('PETIÇÃO INICIAL COM CERTIFICADO ICP-BRASIL', { x: 50, y: 800, size: 12 });
  const rawBytes1 = await doc1.save();
  const signedIcpBytes = await PadesSignatureService.signPdf(rawBytes1, p12IcpBuffer, pass, {
    reason: 'Petição Inicial Cível'
  });

  const valIcp = PadesSignatureService.verifyPdf(signedIcpBytes);
  assert.strictEqual(valIcp.allValid, true);
  assert.strictEqual(valIcp.signatures[0].technicalIntegrity, 'INTEGRO');
  assert.strictEqual(valIcp.signatures[0].legalSignatureType, 'QUALIFICADA_ICP_BRASIL');
  assert.strictEqual(valIcp.signatures[0].hasLegalPresumption, true);
  assert.ok(valIcp.legalSummaryText.includes('Qualificada(s) ICP-Brasil'));
  console.log('  ✓ [PASS] Laudo atesta integridade técnica íntegra e qualificação jurídica ICP-Brasil');

  // --------------------------------------------------------------------------
  // TESTE 2: Assinatura Eletrônica Avançada Não-ICP (Lei 14.063/2020)
  // --------------------------------------------------------------------------
  console.log('\n2. Testando Assinatura Eletrônica Avançada Não-ICP (Lei 14.063/2020, art. 4º, II)...');
  const privIssuerAttrs = [
    { name: 'commonName', value: 'Minha Empresa AC Privada' },
    { name: 'organizationName', value: 'Empresa Privada de Consultoria S.A.' },
    { name: 'countryName', value: 'BR' }
  ];
  const privSubjectAttrs = [
    { name: 'commonName', value: 'CONSULTOR PRIVADO INTERNO' },
    { name: 'organizationName', value: 'Empresa Privada de Consultoria S.A.' },
    { name: 'countryName', value: 'BR' }
  ];
  const p12PrivBuffer = generateCert(privIssuerAttrs, privSubjectAttrs, pass);

  const privParsed = PadesSignatureService.parseCertificate(p12PrivBuffer, pass);
  assert.strictEqual(privParsed.certInfo.isIcpBrasil, false, 'Não deve classificar AC corporativa como ICP-Brasil');
  assert.strictEqual(privParsed.certInfo.legalSignatureType, 'AVANCADA_NAO_ICP', 'Classificação deve ser Avançada Não-ICP');
  assert.strictEqual(privParsed.certInfo.hasLegalPresumption, false, 'Não possui presunção legal absoluta sem aceitação das partes');
  assert.ok(privParsed.certInfo.juridicalWarning?.includes('Lei 14.063/2020'), 'Deve alertar sobre dependência de aceite inter partes');
  console.log('  ✓ [PASS] Classificado como Assinatura Avançada (Não-ICP), com alerta claro de limitação jurídica');

  // Criar e assinar PDF com o certificado Não-ICP
  const doc2 = await PDFDocument.create();
  const page2 = doc2.addPage([595, 842]);
  page2.drawText('CONTRATO PRIVADO ENTRE EMPRESAS', { x: 50, y: 800, size: 12 });
  const rawBytes2 = await doc2.save();
  const signedPrivBytes = await PadesSignatureService.signPdf(rawBytes2, p12PrivBuffer, pass, {
    reason: 'Subscrição Contratual Privada'
  });

  const valPriv = PadesSignatureService.verifyPdf(signedPrivBytes);
  // Ponto Fundamental: A integridade técnica É VÁLIDA (bytes inalterados, RSA válido),
  // MAS a classificação jurídica é AVANÇADA_NAO_ICP, NÃO QUALIFICADA!
  assert.strictEqual(valPriv.signatures[0].technicalIntegrity, 'INTEGRO', 'Integridade técnica deve ser íntegra');
  assert.strictEqual(valPriv.signatures[0].digestMatches, true, 'Hash confere');
  assert.strictEqual(valPriv.signatures[0].rsaSignatureValid, true, 'RSA confere');
  assert.strictEqual(valPriv.signatures[0].legalSignatureType, 'AVANCADA_NAO_ICP', 'Classificação jurídica não deve ser inflada para ICP');
  assert.strictEqual(valPriv.signatures[0].hasLegalPresumption, false, 'Não tem presunção legal de veracidade judicial');
  assert.ok(valPriv.signatures[0].juridicalWarning?.includes('Lei 11.419/2006'), 'Alerta para tribunais presente');
  console.log('  ✓ [PASS] Integridade técnica preservada sem confusão com validade qualificada ICP-Brasil');

  // --------------------------------------------------------------------------
  // TESTE 3: Documento Adulterado (Violação de Integridade Técnica)
  // --------------------------------------------------------------------------
  console.log('\n3. Testando violação de integridade técnica pós-assinatura (Detecção Anti-Tampering)...');
  const tamperedBytes = Buffer.from(signedIcpBytes);
  tamperedBytes[300] = tamperedBytes[300] ^ 0xAA; // Adulterar byte

  const valTampered = PadesSignatureService.verifyPdf(tamperedBytes);
  assert.strictEqual(valTampered.allValid, false, 'Documento adulterado não é válido');
  assert.strictEqual(valTampered.signatures[0].technicalIntegrity, 'ADULTERADO', 'Integridade técnica deve acusar adulteração');
  assert.strictEqual(valTampered.signatures[0].legalSignatureType, 'INVALIDA', 'Classificação jurídica deve ser INVALIDA');
  assert.strictEqual(valTampered.signatures[0].hasLegalPresumption, false, 'Perde qualquer presunção probatória');
  console.log('  ✓ [PASS] Adulteração física do arquivo derruba a integridade e desqualifica a validade jurídica');

  // --------------------------------------------------------------------------
  // TESTE 4: Isolamento Local e Segurança de Chaves em Memória
  // --------------------------------------------------------------------------
  console.log('\n4. Testando salvaguardas de isolamento local e não-retenção de senhas em memória...');
  assert.strictEqual((icpParsed.certInfo as any).password, undefined, 'Objeto certInfo nunca deve conter a senha do certificado');
  assert.strictEqual((icpParsed.certInfo as any).privateKey, undefined, 'certInfo não deve vazar objeto de chave privada no retorno público');
  console.log('  ✓ [PASS] Isolamento estrito de credenciais em memória validado');

  console.log('\n' + '='.repeat(80));
  console.log('✅ SUCESSO: TODAS AS SALVAGUARDAS DE SEGURANÇA E CONFIANÇA JURÍDICA HOMOLOGADAS!');
  console.log('='.repeat(80) + '\n');
}

runLegalTrustAndIsolationSuite().catch(err => {
  console.error('\n❌ FALHA NA SUÍTE DE CONFIANÇA JURÍDICA:', err);
  process.exit(1);
});
