import forge from 'node-forge';
import fs from 'fs';

function verifyPadesPdf(pdfBuffer: Buffer) {
  const pdfString = pdfBuffer.toString('latin1');
  const byteRangeRegex = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/;
  const match = pdfString.match(byteRangeRegex);
  if (!match) {
    return { valid: false, reason: 'Nenhum ByteRange de assinatura encontrado.' };
  }

  const o1 = parseInt(match[1], 10);
  const l1 = parseInt(match[2], 10);
  const o2 = parseInt(match[3], 10);
  const l2 = parseInt(match[4], 10);

  // 1. Integridade de cobertura do ByteRange
  const coversEntireFile = (o2 + l2) === pdfBuffer.length;
  if (!coversEntireFile) {
    return {
      valid: false,
      reason: `ByteRange corrompido: fim do range (${o2 + l2}) diverge do tamanho total do arquivo (${pdfBuffer.length}). Possível adulteração pós-assinatura.`
    };
  }

  // 2. Extrair o conteúdo assinado
  const chunk1 = pdfBuffer.subarray(o1, o1 + l1);
  const chunk2 = pdfBuffer.subarray(o2, o2 + l2);

  const md = forge.md.sha256.create();
  md.update(chunk1.toString('binary'));
  md.update(chunk2.toString('binary'));
  const calculatedDigest = md.digest().toHex();

  // 3. Extrair os bytes hexadecimais de /Contents <hex>
  const contentsPos = pdfString.indexOf('/Contents <', o1);
  if (contentsPos === -1) {
    return { valid: false, reason: 'Dicionário /Contents não localizado.' };
  }
  const hexStart = pdfString.indexOf('<', contentsPos);
  const hexEnd = pdfString.indexOf('>', hexStart);
  let hexContent = pdfString.substring(hexStart + 1, hexEnd).trim();

  // Remover zeros de padding à direita do DER
  // No DER de PKCS#7, a sequência começa com 30 82 ...
  // Podemos decodificar até o final da estrutura ASN.1
  const rawBytes = Buffer.from(hexContent, 'hex');

  const asn1 = forge.asn1.fromDer(rawBytes.toString('binary'), { parseAllBytes: false });
  const msg = forge.pkcs7.messageFromAsn1(asn1);

  const signers = (msg as any).signers;
  const certs = (msg as any).certificates;

  if (!signers || signers.length === 0) {
    return { valid: false, reason: 'Nenhum signatário localizado no contêiner PKCS#7.' };
  }

  const signer = signers[0];
  const cert = certs && certs.length > 0 ? certs[0] : null;

  // Extrair messageDigest dos atributos autenticados
  let signedDigestHex = '';
  if (signer.authenticatedAttributes) {
    for (const attr of signer.authenticatedAttributes) {
      if (attr.type === forge.pki.oids.messageDigest) {
        signedDigestHex = forge.util.bytesToHex(attr.value);
        break;
      }
    }
  }

  const digestMatches = (calculatedDigest.toLowerCase() === signedDigestHex.toLowerCase());

  // Verificar validade temporal do certificado
  const now = new Date();
  const certValid = cert ? (now >= cert.validity.notBefore && now <= cert.validity.notAfter) : false;

  return {
    valid: digestMatches && coversEntireFile,
    digestMatches,
    coversEntireFile,
    calculatedDigest,
    signedDigest: signedDigestHex,
    signerName: cert ? cert.subject.getField('CN')?.value : 'Desconhecido',
    issuer: cert ? cert.issuer.getField('CN')?.value : 'Desconhecido',
    serialNumber: cert ? cert.serialNumber : 'Desconhecido',
    notBefore: cert ? cert.validity.notBefore.toISOString() : null,
    notAfter: cert ? cert.validity.notAfter.toISOString() : null,
    certValidTemporal: certValid
  };
}

const fileBuf = fs.readFileSync('test_output/clean_pades.pdf');
const res = verifyPadesPdf(fileBuf);
console.log('Resultado da Validação Criptográfica PAdES:', JSON.stringify(res, null, 2));
