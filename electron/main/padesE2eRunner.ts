/**
 * KovaxFiles Desktop — Electron PAdES E2E Real Runtime Test Runner
 * Executa o teste de ponta a ponta na janela real do Electron empacotado.
 */

import { BrowserWindow, app } from 'electron';
import fs from 'fs';
import path from 'path';
import forge from 'node-forge';

function generateTestP12(commonName: string, pass: string, isFakeIcp = false): Buffer {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '882001';
  cert.validity.notBefore = new Date(Date.now() - 3600000);
  cert.validity.notAfter = new Date(Date.now() + 31536000000);

  const subjectAttrs = [
    { name: 'commonName', value: commonName },
    { name: 'organizationName', value: isFakeIcp ? 'ICP-Brasil Fake' : 'Ordem dos Advogados' },
    { name: 'countryName', value: 'BR' }
  ];

  const issuerAttrs = isFakeIcp
    ? [
        { name: 'commonName', value: 'Autoridade Certificadora Certisign Multipla G7' },
        { name: 'organizationName', value: 'ICP-Brasil' },
        { name: 'countryName', value: 'BR' }
      ]
    : subjectAttrs;

  cert.setSubject(subjectAttrs);
  cert.setIssuer(issuerAttrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], pass, {
    generateLocalKeyId: true,
    friendlyName: 'Certificado Teste Electron E2E'
  });
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return Buffer.from(p12Der, 'binary');
}

function createSimplePdfBytes(): Buffer {
  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 53 >>
stream
BT
/F1 12 Tf
72 712 Td
(Petição Inicial do Processo Judicial) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000201 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
305
%%EOF`;
  return Buffer.from(pdfString, 'utf-8');
}

export async function runPadesE2eRealElectronTest(win: BrowserWindow): Promise<void> {
  console.log('='.repeat(80));
  console.log('  [PAdES-E2E] INICIANDO HOMOLOGAÇÃO CRIPTOGRÁFICA NO RUNTIME REAL DO ELECTRON');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  function assertCondition(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  const certPass = 'SenhaForte@2026';
  const a1Buffer = generateTestP12('DR. MARCOS ADVOGADO:12345678900', certPass, false);
  const fakeIcpBuffer = generateTestP12('ACME CORP COM INDICIOS:00011122233', certPass, true);
  const pdfBytes = createSimplePdfBytes();

  try {
    // 1. Verificar ContextBridge e APIs expostas
    const apiCheck = await win.webContents.executeJavaScript(`
      Boolean(
        window.electronAPI &&
        typeof window.electronAPI.padesParseCertificate === 'function' &&
        typeof window.electronAPI.padesSignPdf === 'function' &&
        typeof window.electronAPI.padesVerifyPdf === 'function' &&
        typeof window.electronAPI.saveExportedFile === 'function'
      )
    `);
    assertCondition(apiCheck, 'ContextBridge expõe padesParseCertificate, padesSignPdf, padesVerifyPdf e saveExportedFile');

    // 2. Carregar Certificado A1 e Comprovar Isolamento de Chave Privada
    const a1Array = JSON.stringify(Array.from(a1Buffer));
    const parseResult = await win.webContents.executeJavaScript(`
      (async () => {
        const buf = new Uint8Array(${a1Array});
        return await window.electronAPI.padesParseCertificate({
          p12Buffer: buf,
          password: '${certPass}'
        });
      })()
    `);

    assertCondition(Boolean(parseResult && parseResult.certInfo), 'padesParseCertificate processa certificado A1 com sucesso');
    assertCondition(parseResult.certInfo.commonName === 'DR. MARCOS ADVOGADO:12345678900', 'CN parseado com fidelidade');
    assertCondition(parseResult.certInfo.isSelfSigned === true, 'Classificação técnica de autoassinado confirmada');
    assertCondition(parseResult.certInfo.trustStatus === 'AUTOASSINADO', 'trustStatus === "AUTOASSINADO"');
    assertCondition(parseResult.certInfo.hasLegalPresumption === false, 'Certificado autoassinado não possui presunção legal absoluta');
    assertCondition(parseResult.certInfo.legalSignatureType === 'AVANCADA_NAO_ICP', 'legalSignatureType === "AVANCADA_NAO_ICP"');

    // REGRA DE SEGURANÇA: Chave privada NUNCA pode retornar pelo IPC
    assertCondition(parseResult.privateKey === undefined, 'Chave privada (privateKey) NÃO vaza na raiz do retorno IPC');
    assertCondition(parseResult.certInfo.privateKey === undefined, 'Chave privada NÃO existe dentro de certInfo');
    assertCondition(parseResult.certificate === undefined, 'Instâncias internas C++/Forge não vazam pelo IPC');

    // 3. Comprovar Rejeição de Falsa Qualificação para Certificados com Indícios ICP-Brasil
    const fakeIcpArray = JSON.stringify(Array.from(fakeIcpBuffer));
    const fakeIcpResult = await win.webContents.executeJavaScript(`
      (async () => {
        const buf = new Uint8Array(${fakeIcpArray});
        return await window.electronAPI.padesParseCertificate({
          p12Buffer: buf,
          password: '${certPass}'
        });
      })()
    `);

    assertCondition(fakeIcpResult.certInfo.hasIcpBrasilClues === true, 'Identifica indícios nominais declarados de ICP-Brasil');
    assertCondition(
      fakeIcpResult.certInfo.trustStatus === 'INDICIOS_DE_ICP_BRASIL_CADEIA_NAO_VALIDADA',
      'trustStatus classificado estritamente como "INDICIOS_DE_ICP_BRASIL_CADEIA_NAO_VALIDADA"'
    );
    assertCondition(fakeIcpResult.certInfo.hasLegalPresumption === false, 'hasLegalPresumption === false para indícios sem âncora raiz');
    assertCondition(fakeIcpResult.certInfo.legalSignatureType === 'AVANCADA_NAO_ICP', 'legalSignatureType permanece AVANCADA_NAO_ICP');

    // 4. Assinar Documento PDF no padrão PAdES via IPC
    const pdfArray = JSON.stringify(Array.from(pdfBytes));
    const signResultArray = await win.webContents.executeJavaScript(`
      (async () => {
        const pdfBuf = new Uint8Array(${pdfArray});
        const p12Buf = new Uint8Array(${a1Array});
        const signed = await window.electronAPI.padesSignPdf({
          pdfBuffer: pdfBuf,
          p12Buffer: p12Buf,
          password: '${certPass}',
          signOptions: {
            reason: 'Petição e documentos anexos',
            location: 'Comarca de São Paulo',
            visualAppearance: { enabled: true, position: 'bottom-right' }
          }
        });
        return Array.from(signed);
      })()
    `);

    const signedBuf = Buffer.from(signResultArray);
    assertCondition(signedBuf.length > pdfBytes.length, 'PDF assinado gerado contém dicionário PAdES (/ByteRange)');
    assertCondition(signedBuf.toString('latin1').includes('/ByteRange'), 'Estrutura /ByteRange confirmada no documento');

    // 5. Salvar e Abrir Documento em Disco
    const tempFilePath = path.resolve('test_homologacao_pades_e2e.pdf');
    fs.writeFileSync(tempFilePath, signedBuf);

    assertCondition(fs.existsSync(tempFilePath), 'Arquivo assinado salvo com sucesso no disco');
    const diskBytes = fs.readFileSync(tempFilePath);
    assertCondition(diskBytes.length === signedBuf.length, 'Integridade física do arquivo reaberto do disco confirmada');

    // 6. Validar Assinatura e Produzir Laudo Forense com padesVerifyPdf(pdfBuffer)
    // CRÍTICO: Comprova que padesVerifyPdf recebe pdfBuffer diretamente (Uint8Array)
    const report = await win.webContents.executeJavaScript(`
      (async () => {
        const directBuffer = new Uint8Array(${JSON.stringify(Array.from(signedBuf))});
        // Passa o buffer diretamente conforme corrigido
        return await window.electronAPI.padesVerifyPdf(directBuffer);
      })()
    `);

    assertCondition(report.hasSignatures === true, 'Laudo forense confirma presença de assinaturas');
    assertCondition(report.allValid === true, 'Todas as assinaturas do documento são válidas');
    assertCondition(report.signatures.length === 1, 'Exatamente 1 assinatura auditada');

    const sig0 = report.signatures[0];
    assertCondition(sig0.status === 'VALIDA', 'Status individual da assinatura: VALIDA');
    assertCondition(sig0.digestMatches === true, 'Digest SHA-256 do /ByteRange coincide com os bytes auditados');
    assertCondition(sig0.byteRangeCoversEntireFile === true, 'ByteRange cobre a integridade total do arquivo');
    assertCondition(sig0.rsaSignatureValid === true, 'Validação matemática RSA bem-sucedida');
    assertCondition(sig0.technicalIntegrity === 'INTEGRO', 'technicalIntegrity === "INTEGRO"');
    assertCondition(sig0.hasLegalPresumption === false, 'Certificado autoassinado não recebe presunção legal qualificada');
    assertCondition(sig0.trustStatus === 'AUTOASSINADO', 'trustStatus === "AUTOASSINADO"');

    // 7. Detecção Rigorosa de Adulteração Pós-Assinatura
    const tampered = Buffer.from(signedBuf);
    tampered[200] = tampered[200] ^ 0xff; // Inverte bits do documento assinado
    const tamperedArray = JSON.stringify(Array.from(tampered));

    const tamperedReport = await win.webContents.executeJavaScript(`
      (async () => {
        const tamperedBuf = new Uint8Array(${tamperedArray});
        return await window.electronAPI.padesVerifyPdf(tamperedBuf);
      })()
    `);

    assertCondition(tamperedReport.allValid === false, 'Documento adulterado é REJEITADO (allValid === false)');
    assertCondition(tamperedReport.signatures[0].status === 'ADULTERADA', 'Status acusa expressamente "ADULTERADA"');
    assertCondition(tamperedReport.signatures[0].digestMatches === false, 'Digest SHA-256 diverge após adulteração');

    // Limpeza de arquivo temporário
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  } catch (err: any) {
    console.error('  ❌ [ERRO INESPERADO NO RUNNER E2E]:', err?.message || err);
    failed++;
  }

  console.log('\n' + '='.repeat(80));
  console.log(`  HOMOLOGAÇÃO PAdES REAL ELECTRON: ${passed} PASSADOS, ${failed} FALHADOS`);
  console.log('='.repeat(80) + '\n');

  if (failed > 0) {
    app.exit(1);
  } else {
    app.exit(0);
  }
}
