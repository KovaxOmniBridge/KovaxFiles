import { PDFDocument, PDFName, PDFDict, PDFArray, PDFHexString, PDFString, PDFNumber } from 'pdf-lib';
import forge from 'node-forge';
import fs from 'fs';
import { spawnSync } from 'child_process';

async function testCleanByteRange() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 400]);
  page.drawText('Documento limpo de teste', { x: 50, y: 350 });

  const SIGNATURE_LENGTH = 8192;
  const hexPlaceholder = '0'.repeat(SIGNATURE_LENGTH * 2);

  // Criamos o array com PDFNumber com 10 dígitos (1000000000)
  const byteRangeArray = doc.context.obj([
    1000000000,
    1000000000,
    1000000000,
    1000000000
  ]);

  const sigDict = doc.context.obj({
    Type: 'Sig',
    Filter: 'Adobe.PPKLite',
    SubFilter: 'adbe.pkcs7.detached',
    ByteRange: byteRangeArray,
    Contents: PDFHexString.of(hexPlaceholder),
    Reason: PDFString.of('Assinatura Digital Qualificada PAdES-BES'),
    M: PDFString.of('D:20261016000000Z'),
    Name: PDFString.of('DR. MARCOS ADVOGADO')
  });
  const sigDictRef = doc.context.register(sigDict);

  const widgetDict = doc.context.obj({
    Type: 'Annot',
    Subtype: 'Widget',
    FT: 'Sig',
    Rect: [50, 50, 400, 100],
    V: sigDictRef,
    T: PDFString.of('SignatureField1'),
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

  const savedBytes = Buffer.from(await doc.save({ useObjectStreams: false }));
  const pdfString = savedBytes.toString('latin1');

  // Localizar ByteRange exatamente:
  const byteRangeRegex = /\/ByteRange\s*\[\s*1000000000\s+1000000000\s+1000000000\s+1000000000\s*\]/;
  const match = pdfString.match(byteRangeRegex);
  if (!match) throw new Error('Match fail');

  const contentsPos = pdfString.indexOf('/Contents <');
  if (contentsPos === -1) throw new Error('Contents < not found');
  const hexStart = pdfString.indexOf('<', contentsPos);
  const hexEnd = pdfString.indexOf('>', hexStart);

  const o1 = 0;
  const l1 = hexStart;
  const o2 = hexEnd + 1;
  const l2 = savedBytes.length - o2;

  // Formatamos exatamente com 10 caracteres cada número
  const s0 = String(o1).padStart(10, '0');
  const s1 = String(l1).padStart(10, '0');
  const s2 = String(o2).padStart(10, '0');
  const s3 = String(l2).padStart(10, '0');

  // Note que o original era: "[ 1000000000 1000000000 1000000000 1000000000 ]"
  // Vamos ver o tamanho exato de match[0]:
  console.log('Original ByteRange match:', JSON.stringify(match[0]), 'Length:', match[0].length);

  // Substituir preservando exatamente a mesma quantidade de caracteres
  // "/ByteRange [ 1000000000 1000000000 1000000000 1000000000 ]"
  const newStr = match[0].replace(
    /1000000000\s+1000000000\s+1000000000\s+1000000000/,
    `${s0} ${s1} ${s2} ${s3}`
  );
  console.log('New ByteRange str:', JSON.stringify(newStr), 'Length:', newStr.length);

  savedBytes.write(newStr, match.index, 'latin1');

  // Gerar assinatura forge
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  cert.setSubject([{ name: 'commonName', value: 'Advogado Teste' }]);
  cert.setIssuer([{ name: 'commonName', value: 'Advogado Teste' }]);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const chunk1 = savedBytes.subarray(o1, o1 + l1);
  const chunk2 = savedBytes.subarray(o2, o2 + l2);
  const md = forge.md.sha256.create();
  md.update(chunk1.toString('binary'));
  md.update(chunk2.toString('binary'));
  const digestBytes = md.digest().getBytes();

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer();
  p7.addCertificate(cert);
  p7.addSigner({
    key: keys.privateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest, value: digestBytes },
      { type: forge.pki.oids.signingTime, value: new Date() }
    ]
  });
  p7.sign({ detached: true });
  const p7Der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  const hexSig = Buffer.from(p7Der, 'binary').toString('hex').padEnd(SIGNATURE_LENGTH * 2, '0');

  savedBytes.write(hexSig, hexStart + 1, 'latin1');

  fs.writeFileSync('test_output/clean_pades.pdf', savedBytes);

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
        "name": widget.field_name
      })
print(json.dumps(result))
`;
  const pyRes = spawnSync(venvPython, ['-c', pyVerifyScript, 'test_output/clean_pades.pdf'], { encoding: 'utf8' });
  console.log('Resultado PyMuPDF limpo:', pyRes.stdout.trim());
  if (pyRes.stderr) console.error('Stderr:', pyRes.stderr);
}

testCleanByteRange().catch(console.error);
