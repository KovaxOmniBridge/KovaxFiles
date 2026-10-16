import forge from 'node-forge';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import { spawnSync } from 'child_process';

async function testSignPdf() {
  console.log('--- TESTANDO ASSINATURA PAdES REAL ---');

  // 1. Gerar Chave e Certificado X.509
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2);

  const attrs = [
    { name: 'commonName', value: 'DR. MARCOS ADVOGADO:12345678900' },
    { name: 'organizationName', value: 'Kovax OminiBridge' },
    { name: 'countryName', value: 'BR' }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  // 2. Criar PDF inicial com pdf-lib
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 400]);
  page.drawText('PETICAO INICIAL COM ASSINATURA DIGITAL PAdES', { x: 50, y: 350, size: 14 });
  page.drawText('Este documento sera assinado digitalmente com certificado X.509 / PKCS#7', { x: 50, y: 320, size: 11 });
  const initialPdfBytes = await pdfDoc.save();

  console.log('PDF inicial criado:', initialPdfBytes.length, 'bytes');

  // 3. Montar estrutura de assinatura PAdES
  // Tamanho reservado para o PKCS#7 em hex (8192 bytes = 16384 caracteres hex)
  const SIGNATURE_LENGTH = 8192;
  const hexPlaceholder = '0'.repeat(SIGNATURE_LENGTH * 2);
  const byteRangePlaceholder = '**********'; // 10 chars per number

  // Criar buffer do PDF com objeto /Sig e /ByteRange
  // Adicionar campo de assinatura ao PDF
  const sigDict = `
300 0 obj
<<
  /Type /Sig
  /Filter /Adobe.PPKLite
  /SubFilter /adbe.pkcs7.detached
  /ByteRange [0 /ByteRangeVal1 /ByteRangeVal2 /ByteRangeVal3]
  /Contents <${hexPlaceholder}>
  /Reason (Assinatura Digital Qualificada PAdES)
  /M (D:${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}+00'00')
  /Name (DR. MARCOS ADVOGADO)
>>
endobj
`;

  // Vamos testar se conseguimos montar um assinador PAdES completo e testar com PyMuPDF
  console.log('Placeholder de assinatura pronto.');
}

testSignPdf().catch(console.error);
