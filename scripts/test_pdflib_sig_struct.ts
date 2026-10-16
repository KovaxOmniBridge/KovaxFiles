import { PDFDocument, PDFName, PDFDict, PDFArray, PDFHexString, PDFString, PDFNumber } from 'pdf-lib';
import forge from 'node-forge';

async function testPdfLibSigDict() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 400]);

  const SIGNATURE_LENGTH = 8192;
  const hexPlaceholder = '0'.repeat(SIGNATURE_LENGTH * 2);

  // Criar dicionário de assinatura /Sig
  const sigDict = doc.context.obj({
    Type: 'Sig',
    Filter: 'Adobe.PPKLite',
    SubFilter: 'adbe.pkcs7.detached',
    ByteRange: [0, 1000000000, 1000000000, 1000000000],
    Contents: PDFHexString.of(hexPlaceholder),
    Reason: PDFString.of('Assinatura Digital Qualificada PAdES'),
    M: PDFString.of('D:20261016000000Z'),
    Name: PDFString.of('DR. MARCOS ADVOGADO')
  });

  const sigDictRef = doc.context.register(sigDict);

  // Criar widget annotation de assinatura
  const widgetDict = doc.context.obj({
    Type: 'Annot',
    Subtype: 'Widget',
    FT: 'Sig',
    Rect: [50, 50, 300, 100],
    V: sigDictRef,
    T: PDFString.of('Signature1'),
    F: 4,
    P: page.ref
  });
  const widgetDictRef = doc.context.register(widgetDict);

  // Adicionar widget nas annotations da página
  page.node.set(PDFName.of('Annots'), doc.context.obj([widgetDictRef]));

  // Adicionar AcroForm ao catálogo
  const acroForm = doc.context.obj({
    Fields: [widgetDictRef],
    SigFlags: 3
  });
  doc.catalog.set(PDFName.of('AcroForm'), doc.context.register(acroForm));

  const savedBytes = await doc.save({ useObjectStreams: false });
  console.log('PDF gerado com signature dict e AcroForm, tamanho:', savedBytes.length);

  // Agora verificar a localização do /ByteRange e /Contents
  const pdfString = Buffer.from(savedBytes).toString('latin1');
  const byteRangePos = pdfString.indexOf('/ByteRange');
  const contentsPos = pdfString.indexOf('/Contents');
  console.log('Posição do ByteRange:', byteRangePos, 'Posição do Contents:', contentsPos);

  const contentsHexStart = pdfString.indexOf('<', contentsPos);
  const contentsHexEnd = pdfString.indexOf('>', contentsHexStart);
  console.log('HexStart:', contentsHexStart, 'HexEnd:', contentsHexEnd, 'Diff:', contentsHexEnd - contentsHexStart - 1);
}

testPdfLibSigDict().catch(console.error);
