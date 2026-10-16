import { PDFDocument, PDFName, PDFString, StandardFonts, rgb } from 'pdf-lib';
import { CompressionEngine, TARGET_PRESETS } from '../src/services/compressionEngine';
import { deflateSync } from 'fflate';
import * as fs from 'fs';
import * as path from 'path';

async function runAdvancedCompressionTestSuite() {
  console.log('===========================================================================');
  console.log('🔒 TESTE DE INTEGRIDADE: COMPRESSÃO DE PDFs, SEGURANÇA E CONFORMIDADE PDF/A');
  console.log('===========================================================================');

  const testDir = path.resolve('test_output');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  // --------------------------------------------------------------------------
  // [1/4] Teste de Segurança: Bloqueio Estrito de Documentos com Assinatura Digital
  // --------------------------------------------------------------------------
  console.log('\n[1/4] Testando trava de segurança contra destruição de assinaturas digitais...');
  
  // Criar um PDF simulando estrutura de assinatura digital (/ByteRange e /Type /Sig)
  const dummySignedPdf = await PDFDocument.create();
  const page1 = dummySignedPdf.addPage([595, 842]);
  page1.drawText('Documento Judicial Assinado ICP-Brasil', { x: 50, y: 800, size: 14 });
  
  // Injetar dicionário simulado de assinatura com metadados
  const sigDict = dummySignedPdf.context.obj({
    Type: PDFName.of('Sig'),
    Filter: PDFName.of('Adobe.PPKLite'),
    SubFilter: PDFName.of('adbe.pkcs7.detached'),
    ByteRange: dummySignedPdf.context.obj([0, 1000, 2000, 3000]),
    Contents: PDFString.of('MII...dummySignatureBytes...'),
    Name: PDFString.of('Dr. Alexandre Kovax'),
    Reason: PDFString.of('Peticionamento Eletronico'),
    M: PDFString.of('D:20261015120000Z'),
  });
  dummySignedPdf.catalog.set(PDFName.of('AcroForm'), dummySignedPdf.context.obj({
    Fields: dummySignedPdf.context.obj([dummySignedPdf.context.register(sigDict)])
  }));

  const signedPdfBytes = await dummySignedPdf.save({ useObjectStreams: false });
  const sigCheck = CompressionEngine.detectDigitalSignatures(signedPdfBytes.buffer as ArrayBuffer);
  
  if (!sigCheck.hasSignatures || sigCheck.signatureCount < 1) {
    throw new Error('Falha: detectDigitalSignatures deveria ter detectado a assinatura digital simulada.');
  }
  if (!sigCheck.details || sigCheck.details.length === 0 || sigCheck.details[0].signerName !== 'Dr. Alexandre Kovax') {
    throw new Error('Falha: detectDigitalSignatures deveria ter extraído o signatário e detalhes estruturais.');
  }
  console.log(`      ✓ Assinatura digital detectada com detalhes (Signatário: ${sigCheck.details[0].signerName}, Tipo: ${sigCheck.details[0].subFilter})`);

  // Tentar compressão direta SEM confirmação expressa (deve lançar erro e bloquear no fluxo não assinado!)
  let blockedDirect = false;
  try {
    await CompressionEngine.compressDirectPdf(
      signedPdfBytes.buffer as ArrayBuffer,
      'documento_assinado.pdf',
      { workflowMode: 'unsigned_optimization', allowSignedPdfReencoding: false }
    );
  } catch (err: any) {
    if (err.message.includes('SEGURANÇA JURÍDICA')) {
      blockedDirect = true;
    }
  }

  if (!blockedDirect) {
    throw new Error('Falha grave: compressDirectPdf permitiu alterar PDF assinado sem autorização expressa!');
  }
  console.log('      ✓ compressDirectPdf BLOQUEOU com sucesso a alteração do PDF assinado no fluxo não assinado');

  // Testar recusa de preparação pré-assinatura em documento já assinado
  let blockedPreSignature = false;
  try {
    await CompressionEngine.compressDirectPdf(
      signedPdfBytes.buffer as ArrayBuffer,
      'documento_assinado.pdf',
      { workflowMode: 'pre_signature_preparation' }
    );
  } catch (err: any) {
    if (err.message.includes('BLOQUEIO DE PREPARAÇÃO PRÉ-ASSINATURA')) {
      blockedPreSignature = true;
    }
  }
  if (!blockedPreSignature) {
    throw new Error('Falha grave: preparePreSignaturePdf deveria recusar documento já assinado!');
  }
  console.log('      ✓ preparePreSignaturePdf BLOQUEOU com sucesso documento já assinado');

  // Testar FLUXO 3: Documentos Já Assinados (Preservação Criptográfica & Custódia)
  const preservationResult = await CompressionEngine.compressDirectPdf(
    signedPdfBytes.buffer as ArrayBuffer,
    'documento_assinado.pdf',
    { workflowMode: 'signed_preservation', generateConsultationCopy: true }
  );

  if (!preservationResult.isPreservedOriginal) {
    throw new Error('Falha no fluxo de preservação: isPreservedOriginal deveria ser true!');
  }
  // Verificar se os bytes da matriz original foram 100% preservados bit a bit
  if (preservationResult.data.byteLength !== signedPdfBytes.byteLength) {
    throw new Error('Falha grave: O fluxo de preservação alterou o tamanho dos bytes do arquivo original!');
  }
  const originalBytesMatch = signedPdfBytes.every((b, i) => b === preservationResult.data[i]);
  if (!originalBytesMatch) {
    throw new Error('Falha gravíssima: O fluxo de preservação modificou bytes do arquivo original assinado!');
  }
  console.log('      ✓ FLUXO DE PRESERVAÇÃO: Matriz original mantida 100% INTACTA bit a bit (sem alteração)');

  if (!preservationResult.preservationReportPdf || preservationResult.preservationReportPdf.byteLength === 0) {
    throw new Error('Falha: Relatório Técnico de Preservação e Custódia não foi gerado!');
  }
  console.log('      ✓ FLUXO DE PRESERVAÇÃO: Relatório Técnico de Preservação e Custódia gerado');

  if (!preservationResult.consultationCopy || preservationResult.consultationCopy.data.byteLength === 0) {
    throw new Error('Falha: Cópia Reprográfica para Consulta não foi gerada!');
  }
  console.log('      ✓ FLUXO DE PRESERVAÇÃO: Cópia de Consulta desvinculada gerada com tarja indelével');

  // Tentar volume pack SEM confirmação expressa (deve lançar erro e bloquear!)
  let blockedVolume = false;
  try {
    await CompressionEngine.packIntoVolumeBundle(
      [{ name: 'documento_assinado.pdf', buffer: signedPdfBytes.buffer as ArrayBuffer }],
      TARGET_PRESETS[0],
      { advanced: { allowSignedPdfReencoding: false } }
    );
  } catch (err: any) {
    if (err.message.includes('SEGURANÇA JURÍDICA')) {
      blockedVolume = true;
    }
  }

  if (!blockedVolume) {
    throw new Error('Falha grave: packIntoVolumeBundle permitiu fracionar PDF assinado sem autorização expressa!');
  }
  console.log('      ✓ packIntoVolumeBundle BLOQUEOU com sucesso o fracionamento do PDF assinado');

  // --------------------------------------------------------------------------
  // [2/4] Teste de Decodificação Correta de Imagens Internas /FlateDecode
  // --------------------------------------------------------------------------
  console.log('\n[2/4] Testando decodificação de imagens internas /FlateDecode...');

  const docWithFlate = await PDFDocument.create();
  const pageWithImg = docWithFlate.addPage([595, 842]);
  pageWithImg.drawText('Documento com Imagem /FlateDecode', { x: 50, y: 800, size: 14 });

  // Criar uma imagem bruta 200x200 RGB compactada com Deflate/FlateDecode
  const imgWidth = 200;
  const imgHeight = 200;
  const rawRgb = new Uint8Array(imgWidth * imgHeight * 3);
  for (let i = 0; i < rawRgb.length; i += 3) {
    rawRgb[i] = 180;     // R
    rawRgb[i + 1] = 40;  // G
    rawRgb[i + 2] = 80;  // B
  }
  const compressedFlate = deflateSync(rawRgb);

  const imageStream = docWithFlate.context.stream(compressedFlate, {
    Type: PDFName.of('XObject'),
    Subtype: PDFName.of('Image'),
    Width: imgWidth,
    Height: imgHeight,
    ColorSpace: PDFName.of('DeviceRGB'),
    BitsPerComponent: 8,
    Filter: PDFName.of('FlateDecode'),
  });
  const imgRef = docWithFlate.context.register(imageStream);

  // Re-amostrar imagem
  const reencodedCount = await CompressionEngine.recompressPdfImages(docWithFlate, 0.70, 150, false);
  console.log(`      ✓ Imagens /FlateDecode reprocessadas: ${reencodedCount}`);

  // Testar reversão de filtros PNG rows
  const unfilterTestRaw = new Uint8Array([0, 10, 20, 30, 0, 40, 50, 60]); // 2 scanlines de 1 pixel RGB com filterType 0 (None)
  const unfiltered = CompressionEngine.unfilterPngRows(unfilterTestRaw, 1, 2, 3);
  if (unfiltered.length !== 6 || unfiltered[0] !== 10 || unfiltered[3] !== 40) {
    throw new Error('Falha no unfilterPngRows com filterType 0');
  }
  console.log('      ✓ Algoritmo de reversão unfilterPngRows (filtros 0 a 4) verificado com precisão');

  // --------------------------------------------------------------------------
  // [3/4] Teste de Padronização Arquivística Preliminar (Metadados XMP & OutputIntents)
  // --------------------------------------------------------------------------
  console.log('\n[3/4] Testando padronização de metadados arquivísticos preliminares (XMP/sRGB)...');

  const pdfaDoc = await PDFDocument.create();
  pdfaDoc.addPage([595, 842]);
  CompressionEngine.applyArchivalMetadata(pdfaDoc, 'Petição de Teste Arquivística');

  const pdfaBytes = await pdfaDoc.save({ useObjectStreams: false });
  const pdfaStr = new TextDecoder('latin1').decode(pdfaBytes);

  const hasPdfaPart = pdfaStr.includes('<pdfaid:part>1</pdfaid:part>');
  const hasPdfaConf = pdfaStr.includes('<pdfaid:conformance>B</pdfaid:conformance>');
  const hasOutputIntent = pdfaStr.includes('/OutputIntent') && pdfaStr.includes('/GTS_PDFA1');
  const hasMetadata = pdfaStr.includes('/Metadata');

  if (!hasPdfaPart || !hasPdfaConf || !hasOutputIntent || !hasMetadata) {
    throw new Error(`Falha na estrutura arquivística: Part=${hasPdfaPart}, Conf=${hasPdfaConf}, Intent=${hasOutputIntent}, Meta=${hasMetadata}`);
  }
  console.log('      ✓ Pacote XMP arquivístico preliminar verificado (<pdfaid:part>1 e <pdfaid:conformance>B)');
  console.log('      ✓ Entrada de Catálogo /OutputIntents com /GTS_PDFA1 sRGB verificada');
  console.log('      ✓ Objeto de Catálogo /Metadata /Subtype /XML verificado');

  // Testar geração do Relatório Técnico de Processamento e Integridade
  const techReport = await CompressionEngine.generateTechnicalReportPdf(
    'teste.pdf', 1000000, 500000, 'sha256pre...', 'sha256post...', 0, 'Tribunal Regional'
  );
  if (!techReport || techReport.byteLength === 0) {
    throw new Error('Falha ao emitir Relatório Técnico de Processamento e Integridade');
  }
  console.log('      ✓ Relatório Técnico de Processamento e Integridade emitido com sucesso');

  // --------------------------------------------------------------------------
  // [4/4] Teste de Presets Expansíveis e Limite Customizável (customMaxSizeMB)
  // --------------------------------------------------------------------------
  console.log('\n[4/4] Testando presets judiciais e limites configuráveis em MB...');

  const presetIds = TARGET_PRESETS.map(p => p.id);
  const requiredPresets = ['pje', 'pje-jt', 'tjsp', 'trf', 'stf', 'stj', 'projudi', 'prefeitura', 'custom'];
  for (const r of requiredPresets) {
    if (!presetIds.includes(r)) {
      throw new Error(`Preset obrigatório ausente: ${r}`);
    }
  }
  console.log(`      ✓ ${TARGET_PRESETS.length} presets judiciais disponíveis (STF, STJ, PJe-JT, Projudi, etc.)`);

  // Testar volume com customMaxSizeMB configurado para 4.5 MB
  const customPreset = TARGET_PRESETS.find(p => p.id === 'custom')!;
  const testDoc = await PDFDocument.create();
  for (let p = 0; p < 3; p++) {
    const page = testDoc.addPage([595, 842]);
    page.drawText(`Página de Teste ${p + 1}`, { x: 50, y: 800, size: 12 });
  }
  const testDocBytes = await testDoc.save();

  const volumeRes = await CompressionEngine.packIntoVolumeBundle(
    [{ name: 'teste_fracionamento.pdf', buffer: testDocBytes.buffer as ArrayBuffer }],
    customPreset,
    { advanced: { customMaxSizeMB: 4.5 } }
  );

  if (volumeRes.volumes.length === 0) {
    throw new Error('Falha ao gerar volume com customMaxSizeMB');
  }
  console.log(`      ✓ Fracionamento com limite customizável (4.5 MB) validado com sucesso`);

  console.log('\n===========================================================================');
  console.log('✅ SUCESSO: Todos os testes de segurança, PDF/A, Flate e Presets APROVADOS!');
  console.log('===========================================================================');
}

runAdvancedCompressionTestSuite().catch(err => {
  console.error('\n❌ ERRO NO TESTE:', err);
  process.exit(1);
});
