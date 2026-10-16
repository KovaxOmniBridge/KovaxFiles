import { PDFDocument, PDFName, PDFDict, PDFArray, PDFHexString, PDFString } from 'pdf-lib';
import forge from 'node-forge';
import fs from 'fs';
import { spawnSync } from 'child_process';

async function testFullPadesSigning() {
  console.log('--- TESTE COMPLETO DE ASSINATURA PAdES REAL COM X.509 PKCS#7 ---');

  // 1. Gerar Chave e Certificado X.509 ICP/PAdES compatível
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '1001';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2);

  const attrs = [
    { name: 'commonName', value: 'DR. MARCOS ADVOGADO:12345678900' },
    { name: 'organizationName', value: 'Kovax Files Desktop OminiBridge' },
    { name: 'countryName', value: 'BR' }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  // 2. Criar PDF inicial com pdf-lib
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 400]);
  page.drawText('PETICAO DE HOMOLOGACAO DE ACORDO TRABALHISTA', { x: 50, y: 350, size: 14 });
  page.drawText('Documento assinado digitalmente nos termos da MP 2.200-2/2001 e ISO 32000 PAdES.', { x: 50, y: 310, size: 10 });
  page.drawText('Certificado: DR. MARCOS ADVOGADO (123.456.789-00)', { x: 50, y: 280, size: 10 });

  const SIGNATURE_LENGTH = 8192;
  const hexPlaceholder = '0'.repeat(SIGNATURE_LENGTH * 2);

  // Reservamos espaço fixo de 10 dígitos para cada número do ByteRange:
  // [0000000000 0000000000 0000000000 0000000000]
  // para podermos substituir in-place sem alterar o tamanho do arquivo!
  const byteRangePlaceholder = '/ByteRange [ 0000000000 0000000000 0000000000 0000000000 ]';

  const sigDict = doc.context.obj({
    Type: 'Sig',
    Filter: 'Adobe.PPKLite',
    SubFilter: 'adbe.pkcs7.detached',
    ByteRange: doc.context.obj([0, 1000000000, 1000000000, 1000000000]),
    Contents: PDFHexString.of(hexPlaceholder),
    Reason: PDFString.of('Assinatura Digital Qualificada PAdES-BES'),
    M: PDFString.of('D:' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) + "Z"),
    Name: PDFString.of('DR. MARCOS ADVOGADO:12345678900')
  });

  const sigDictRef = doc.context.register(sigDict);

  // Widget visual de assinatura na página
  const widgetDict = doc.context.obj({
    Type: 'Annot',
    Subtype: 'Widget',
    FT: 'Sig',
    Rect: [50, 50, 450, 120],
    V: sigDictRef,
    T: PDFString.of('AssinaturaDigitalPAdES1'),
    F: 4,
    P: page.ref
  });
  const widgetDictRef = doc.context.register(widgetDict);
  page.node.set(PDFName.of('Annots'), doc.context.obj([widgetDictRef]));

  const acroForm = doc.context.obj({
    Fields: [widgetDictRef],
    SigFlags: 3
  });
  doc.catalog.set(PDFName.of('AcroForm'), doc.context.register(acroForm));

  let savedBytes = Buffer.from(await doc.save({ useObjectStreams: false }));

  // 3. Localizar e ajustar ByteRange e Contents
  let pdfString = savedBytes.toString('latin1');
  const byteRangeMatch = pdfString.match(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/);
  if (!byteRangeMatch) {
    throw new Error('ByteRange nao encontrado');
  }

  const contentsPos = pdfString.indexOf('/Contents');
  const hexStart = pdfString.indexOf('<', contentsPos);
  const hexEnd = pdfString.indexOf('>', hexStart);

  const o1 = 0;
  const l1 = hexStart;
  const o2 = hexEnd + 1;
  const l2 = savedBytes.length - o2;

  // Formatar novo ByteRange com padding exato para substituir sem mudar offsets
  const newByteRangeStr = `/ByteRange [ ${o1} ${l1} ${o2} ${l2} ]`;
  const originalByteRangeStr = byteRangeMatch[0];

  // Se o tamanho original for diferente do novo, podemos preencher com espacos
  let replacementByteRange = newByteRangeStr;
  if (replacementByteRange.length < originalByteRangeStr.length) {
    replacementByteRange = `/ByteRange [ ${o1} ${l1} ${o2} ${l2}` + ' '.repeat(originalByteRangeStr.length - newByteRangeStr.length) + ' ]';
  } else if (replacementByteRange.length > originalByteRangeStr.length) {
    // Para evitar descasamento, vamos regenerar ou ajustar
    console.log('Padding adjustment needed');
  }

  // Substituir ByteRange nos bytes
  const byteRangeBuffer = Buffer.from(replacementByteRange, 'latin1');
  const matchIndex = byteRangeMatch.index!;
  byteRangeBuffer.copy(savedBytes, matchIndex);

  // 4. Calcular Hash SHA-256 sobre os intervalos do ByteRange
  const chunk1 = savedBytes.subarray(o1, o1 + l1);
  const chunk2 = savedBytes.subarray(o2, o2 + l2);

  const md = forge.md.sha256.create();
  md.update(chunk1.toString('binary'));
  md.update(chunk2.toString('binary'));
  const digestBytes = md.digest().getBytes();

  console.log('Digest SHA-256 do documento (bytes assinados):', Buffer.from(digestBytes, 'binary').toString('hex'));

  // 5. Criar PKCS#7 SignedData destacado (adbe.pkcs7.detached)
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(); // detached
  p7.addCertificate(cert);
  p7.addSigner({
    key: keys.privateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data
      },
      {
        type: forge.pki.oids.messageDigest,
        value: digestBytes
      },
      {
        type: forge.pki.oids.signingTime,
        value: new Date()
      }
    ]
  });

  p7.sign({ detached: true });
  const p7Asn1 = p7.toAsn1();
  const p7Der = forge.asn1.toDer(p7Asn1).getBytes();

  console.log('Tamanho da assinatura PKCS#7 DER:', p7Der.length, 'bytes');
  if (p7Der.length > SIGNATURE_LENGTH) {
    throw new Error('Assinatura PKCS#7 excede o tamanho reservado');
  }

  // Preencher com zeros à direita até o tamanho SIGNATURE_LENGTH
  const hexSignature = Buffer.from(p7Der, 'binary').toString('hex').padEnd(SIGNATURE_LENGTH * 2, '0');

  // Gravar hexSignature em savedBytes entre hexStart + 1 e hexEnd
  const hexBuffer = Buffer.from(hexSignature, 'latin1');
  hexBuffer.copy(savedBytes, hexStart + 1);

  // Salvar PDF assinado
  const signedPdfPath = 'test_output/pades_signed_test.pdf';
  fs.writeFileSync(signedPdfPath, savedBytes);
  console.log('PDF assinado com sucesso e salvo em:', signedPdfPath);

  // 6. Validar com PyMuPDF
  const venvPython = fs.existsSync('.venv/Scripts/python.exe') ? '.venv/Scripts/python.exe' : 'python';
  const pyVerifyScript = `
import pymupdf, sys, json

doc = pymupdf.open(sys.argv[1])
result = {
  "page_count": len(doc),
  "is_encrypted": bool(doc.is_encrypted),
  "has_signatures": False,
  "sigs": []
}

for page in doc:
  for widget in page.widgets():
    if widget.field_type == pymupdf.PDF_WIDGET_TYPE_SIGNATURE:
      result["has_signatures"] = True
      result["sigs"].append({
        "name": widget.field_name,
        "value": widget.field_value[:50] if widget.field_value else None
      })

print(json.dumps(result))
`;

  const pyRes = spawnSync(venvPython, ['-c', pyVerifyScript, signedPdfPath], { encoding: 'utf8' });
  console.log('Resultado PyMuPDF:', pyRes.stdout.trim());
}

testFullPadesSigning().catch(console.error);
