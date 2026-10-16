import forge from 'node-forge';
import { PDFDocument } from 'pdf-lib';

// Test generating a self-signed keypair and certificate for tests
console.log('Testing node-forge availability...');
const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

const attrs = [{
  name: 'commonName',
  value: 'DR. ADVOGADO DE TESTE - OAB/SP 123456'
}, {
  name: 'organizationName',
  value: 'Kovax Advocacia'
}];
cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.sign(keys.privateKey, forge.md.sha256.create());

console.log('Certificate created successfully:', cert.subject.getField('CN')?.value);

// Create p12 archive
const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], 'Senha123', {
  generateLocalKeyId: true,
  friendlyName: 'Certificado Teste PAdES'
});
const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
console.log('PKCS#12 generated successfully, bytes:', p12Der.length);

// Now test parsing p12 back
const p12ParsedAsn1 = forge.asn1.fromDer(p12Der);
const p12 = forge.pkcs12.pkcs12FromAsn1(p12ParsedAsn1, 'Senha123');
console.log('PKCS#12 parsed back successfully!');
const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
const certBag = bags[forge.pki.oids.certBag]?.[0];
console.log('Extracted cert CN:', certBag?.cert?.subject?.getField('CN')?.value);
