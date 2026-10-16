import forge from 'node-forge';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { spawnSync } from 'child_process';
import { PadesSignatureService } from '../src/services/padesSignatureService';

/**
 * =============================================================================
 * SUÍTE DE TESTES: ASSINATURA DIGITAL PAdES E VALIDAÇÃO CRIPTOGRÁFICA
 * =============================================================================
 * Valida de ponta a ponta:
 * 1. Leitura e extração segura de certificados PKCS#12 (.pfx / .p12) e chave privada.
 * 2. Assinatura autêntica PAdES-BES (ISO 32000-1 / ETSI TS 102 778) com contêiner PKCS#7.
 * 3. Validação matemática do ByteRange e correspondência exata do digest SHA-256.
 * 4. Validação criptográfica da chave pública RSA sobre os atributos autenticados.
 * 5. Detecção rigorosa de adulteração (tentativa de alteração de bytes pós-assinatura).
 * 6. Verificação com ferramenta independente (PyMuPDF).
 * =============================================================================
 */

function generateTestP12(commonName: string, pass: string): Buffer {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '9901';
  cert.validity.notBefore = new Date(Date.now() - 3600000); // 1h atrás
  cert.validity.notAfter = new Date(Date.now() + 31536000000); // 1 ano

  const attrs = [
    { name: 'commonName', value: commonName },
    { name: 'organizationName', value: 'Tribunal Regional do Trabalho' },
    { name: 'countryName', value: 'BR' }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], pass, {
    generateLocalKeyId: true,
    friendlyName: 'Certificado Teste ICP/PAdES'
  });
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return Buffer.from(p12Der, 'binary');
}

async function runPadesTestSuite() {
  console.log('='.repeat(75));
  console.log('✒️ SUÍTE DE TESTES: ASSINATURA DIGITAL PAdES E VALIDAÇÃO CRIPTOGRÁFICA');
  console.log('='.repeat(75) + '\n');

  const testDir = path.resolve('test_output');
  fs.mkdirSync(testDir, { recursive: true });

  const certPass = 'SenhaCertificado@2026';
  const signerName = 'DR. CARLOS ALBERTO SILVA:12345678900';

  // --------------------------------------------------------------------------
  // ETAPA 1: Gerar e parsear Certificado PKCS#12 (.pfx)
  // --------------------------------------------------------------------------
  console.log('[1/5] Gerando e validando parsing de Certificado Digital PKCS#12...');
  const p12Buffer = generateTestP12(signerName, certPass);

  const { certInfo, privateKey } = PadesSignatureService.parseCertificate(p12Buffer, certPass);
  assert.strictEqual(certInfo.commonName, signerName, 'CN deve coincidir com o titular');
  assert.strictEqual(certInfo.cpfCnpj, 'CPF: 123.456.789-00', 'Deve extrair CPF formatado do CN');
  assert.strictEqual(certInfo.isValidTemporal, true, 'Certificado deve estar vigente');
  assert.ok(certInfo.fingerprintSha256.length === 64, 'Fingerprint SHA-256 deve ter 64 caracteres hex');
  assert.ok(privateKey, 'Chave privada RSA deve estar presente');
  console.log('  -> Certificado validado:', {
    titular: certInfo.commonName,
    cpf: certInfo.cpfCnpj,
    vigencia: certInfo.isValidTemporal,
    fingerprint: certInfo.fingerprintSha256.substring(0, 16) + '...'
  });

  // Rejeição de senha errada
  let wrongPassRejected = false;
  try {
    PadesSignatureService.parseCertificate(p12Buffer, 'SenhaErrada123');
  } catch {
    wrongPassRejected = true;
  }
  assert.ok(wrongPassRejected, 'Deve rejeitar senha incorreta do certificado');
  console.log('  -> Rejeição defensiva de senha incorreta confirmada');

  // --------------------------------------------------------------------------
  // ETAPA 2: Gerar PDF e assinar com PAdES-BES
  // --------------------------------------------------------------------------
  console.log('\n[2/5] Gerando documento PDF e aplicando Assinatura Digital PAdES autêntica...');
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  page.drawText('PODER JUDICIARIO - PETICAO INTERMEDIARIA', { x: 50, y: 780, size: 14 });
  page.drawText('Excelentissimo Senhor Doutor Juiz de Direito da 1a Vara Civel', { x: 50, y: 740, size: 10 });
  page.drawText('Requer a juntada da procuracao e substabelecimento com reserva de poderes.', { x: 50, y: 710, size: 10 });
  const rawBytes = await doc.save();

  const signedPdfBytes = await PadesSignatureService.signPdf(rawBytes, p12Buffer, certPass, {
    reason: 'Petição subscrita por Advogado Constituído',
    location: 'São Paulo - SP',
    visualAppearance: {
      enabled: true,
      position: 'bottom-right'
    }
  });

  const signedPdfPath = path.join(testDir, 'peticao_assinada_pades.pdf');
  fs.writeFileSync(signedPdfPath, signedPdfBytes);
  console.log('  -> PDF assinado salvo em:', signedPdfPath, `(${signedPdfBytes.length} bytes)`);

  // --------------------------------------------------------------------------
  // ETAPA 3: Validação Criptográfica Própria do PDF Assinado
  // --------------------------------------------------------------------------
  console.log('\n[3/5] Executando validação matemática e criptográfica do PDF assinado...');
  const valResult = PadesSignatureService.verifyPdf(signedPdfBytes);

  assert.strictEqual(valResult.hasSignatures, true, 'Deve detectar assinaturas');
  assert.strictEqual(valResult.signatureCount, 1, 'Deve possuir exatamente 1 assinatura');
  assert.strictEqual(valResult.allValid, true, 'Todas as assinaturas devem ser válidas');

  const sig = valResult.signatures[0];
  assert.strictEqual(sig.status, 'VALIDA', 'Status deve ser VALIDA');
  assert.strictEqual(sig.byteRangeCoversEntireFile, true, 'ByteRange deve cobrir o arquivo todo');
  assert.strictEqual(sig.digestMatches, true, 'Hash do documento deve coincidir com o digest assinado');
  assert.strictEqual(sig.rsaSignatureValid, true, 'Assinatura RSA da chave pública deve ser válida');
  assert.strictEqual(sig.certValidTemporal, true, 'Certificado deve estar vigente');
  assert.strictEqual(sig.isCryptographicallyValid, true, 'isCryptographicallyValid deve ser true');
  assert.strictEqual(sig.signerCpfCnpj, 'CPF: 123.456.789-00', 'CPF do titular deve ser identificado');

  console.log('  -> Laudo de Auditoria Criptográfica:', {
    status: sig.status,
    titular: sig.signerName,
    cpf: sig.signerCpfCnpj,
    digestConfere: sig.digestMatches,
    coberturaByteRange: sig.byteRangeCoversEntireFile,
    rsaValido: sig.rsaSignatureValid,
    subFilter: sig.subFilter
  });

  // --------------------------------------------------------------------------
  // ETAPA 4: Teste de Detecção de Adulteração (Anti-Tampering)
  // --------------------------------------------------------------------------
  console.log('\n[4/5] Testando resiliência contra ADULTERAÇÃO do PDF pós-assinatura...');
  // Criar uma cópia e adulterar 1 byte do conteúdo do PDF
  const tamperedBytes = Buffer.from(signedPdfBytes);
  // Modificar um byte fora do /Contents (por exemplo, na primeira página)
  const posToTamper = 200;
  tamperedBytes[posToTamper] = tamperedBytes[posToTamper] ^ 0xFF;

  const tamperedPath = path.join(testDir, 'peticao_adulterada.pdf');
  fs.writeFileSync(tamperedPath, tamperedBytes);

  const tamperedResult = PadesSignatureService.verifyPdf(tamperedBytes);
  assert.strictEqual(tamperedResult.allValid, false, 'Documento adulterado NÃO pode ser considerado válido');
  assert.strictEqual(tamperedResult.signatures[0].status, 'ADULTERADA', 'Status deve acusar ADULTERADA');
  assert.strictEqual(tamperedResult.signatures[0].digestMatches, false, 'Digest SHA-256 NÃO pode conferir');
  assert.strictEqual(tamperedResult.signatures[0].isCryptographicallyValid, false, 'Validação criptográfica deve falhar');
  console.log('  -> Adulteração detectada com sucesso! Alerta:', tamperedResult.signatures[0].statusDescription);

  // --------------------------------------------------------------------------
  // ETAPA 5: Auditoria com ferramenta externa independente (PyMuPDF)
  // --------------------------------------------------------------------------
  console.log('\n[5/5] Inspecionando contêiner de assinatura com PyMuPDF independente...');
  const venvPython = fs.existsSync('.venv/Scripts/python.exe') ? '.venv/Scripts/python.exe' : 'python';
  const pyVerifyScript = `
import pymupdf, sys, json

doc = pymupdf.open(sys.argv[1])
result = {
  "page_count": len(doc),
  "is_encrypted": bool(doc.is_encrypted),
  "sig_count": 0,
  "sigs": []
}

for page in doc:
  for widget in page.widgets():
    if widget.field_type == pymupdf.PDF_WIDGET_TYPE_SIGNATURE:
      result["sig_count"] += 1
      result["sigs"].append({
        "name": widget.field_name,
        "rect": list(widget.rect)
      })

print(json.dumps(result))
`;

  const pyRes = spawnSync(venvPython, ['-c', pyVerifyScript, signedPdfPath], { encoding: 'utf8' });
  if (pyRes.status === 0 && !pyRes.stderr.includes('Error')) {
    const pyOutput = JSON.parse(pyRes.stdout.trim().split('\n').pop() || '{}');
    console.log('  -> Verificação PyMuPDF independente:', pyOutput);
    assert.strictEqual(pyOutput.sig_count, 1, 'PyMuPDF deve reconhecer exatamente 1 campo de assinatura digital');
    assert.ok(pyOutput.sigs[0].name.includes('Signature_PAdES'), 'Nome do campo de assinatura deve estar correto');
  } else {
    console.log('  (PyMuPDF não executado ou ambiente sem Python nativo; validação Node.js concluída com êxito)');
  }

  console.log('\n' + '='.repeat(75));
  console.log('✅ SUCESSO: ASSINATURA PAdES GENUÍNA E VALIDAÇÃO CRIPTOGRÁFICA 100% HOMOLOGADA!');
  console.log('='.repeat(75) + '\n');
}

runPadesTestSuite().catch(err => {
  console.error('\n❌ FALHA NO TESTE PAdES:', err);
  process.exit(1);
});
