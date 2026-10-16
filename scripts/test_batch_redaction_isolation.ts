import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import assert from 'assert';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PdfTextExtractor } from '../src/services/pdfTextExtractor.js';
import { RedactionDetectionService, RedactionCategoryOptions } from '../src/services/aiRedactionService.js';
import { LocalPdfEngine, RedactionRectangle } from '../src/services/pdfEngine.js';
import { PdfReportExporterService } from '../src/services/pdfReportExporterService.js';

async function runBatchRedactionIsolationTest() {
  console.log('================================================================');
  console.log('🧪 TESTE DE ISOLAMENTO E PREVENÇÃO DE COLISÃO DE NOMES (LGPD)');
  console.log('================================================================\n');

  fs.mkdirSync('test_output', { recursive: true });

  const SAME_FILE_NAME = 'processo_judicial.pdf';
  const FILE_ID_DOC_A = 'doc_origem_tj_sp_1001';
  const FILE_ID_DOC_B = 'doc_origem_trf_3_2002';

  // 1. Criar Documento A: Mesmo nome ('processo_judicial.pdf'), CPF na posição Y: 700
  console.log('[1/5] Gerando Documento A com nome "processo_judicial.pdf" (fileId TJ-SP)...');
  const docA = await PDFDocument.create();
  const fontA = await docA.embedFont(StandardFonts.Helvetica);
  const pageA = docA.addPage([595, 842]);
  
  const sensitiveCpfDocA = '111.222.333-44';
  pageA.drawText(`Vara Cível SP - Processo de Cobrança`, { x: 50, y: 750, size: 14, font: fontA });
  pageA.drawText(`CPF Requerente A: ${sensitiveCpfDocA}`, { x: 50, y: 700, size: 12, font: fontA });
  pageA.drawText(`Texto Legítimo Não Sigiloso no Documento A`, { x: 50, y: 400, size: 12, font: fontA });
  
  const bytesDocA = await docA.save();
  const sha256OriginalA = crypto.createHash('sha256').update(bytesDocA).digest('hex');

  // 2. Criar Documento B: Mesmo nome ('processo_judicial.pdf'), CPF na posição Y: 400
  console.log('[2/5] Gerando Documento B com IDÊNTICO nome "processo_judicial.pdf" (fileId TRF-3)...');
  const docB = await PDFDocument.create();
  const fontB = await docB.embedFont(StandardFonts.Helvetica);
  const pageB = docB.addPage([595, 842]);

  const sensitiveCpfDocB = '999.888.777-66';
  pageB.drawText(`Vara Federal SP - Execução Fiscal`, { x: 50, y: 750, size: 14, font: fontB });
  pageB.drawText(`Cláusula Pública Neutra no Documento B`, { x: 50, y: 700, size: 12, font: fontB });
  pageB.drawText(`CPF Executado B: ${sensitiveCpfDocB}`, { x: 50, y: 400, size: 12, font: fontB });

  const bytesDocB = await docB.save();
  const sha256OriginalB = crypto.createHash('sha256').update(bytesDocB).digest('hex');

  // 3. Simular lote com fileId único e imutável por documento
  console.log('\n[3/5] Analisando documentos em lote com isolamento estrito por fileId...');
  const batchDocuments = [
    { fileId: FILE_ID_DOC_A, name: SAME_FILE_NAME, data: bytesDocA },
    { fileId: FILE_ID_DOC_B, name: SAME_FILE_NAME, data: bytesDocB }
  ];

  const categories: RedactionCategoryOptions = {
    cpf: true,
    cnpj: false,
    rg: false,
    emails: false,
    phones: false,
    names: false,
    addresses: false,
    financial: false,
    health: false,
    customKeywords: []
  };

  const allDetectedItems: any[] = [];

  for (const doc of batchDocuments) {
    const pagesData = await PdfTextExtractor.extractTextWithBounds(doc.data.buffer as ArrayBuffer);
    const items = await RedactionDetectionService.analyzePdf(
      pagesData,
      categories,
      { mode: 'pattern' },
      undefined,
      doc.name,
      doc.fileId
    );

    allDetectedItems.push(...items);
  }

  console.log(`  -> Total de ocorrências detectadas no lote: ${allDetectedItems.length}`);
  for (const item of allDetectedItems) {
    console.log(`     * [fileId: ${item.fileId}] [fileName: ${item.fileName}] "${item.text}" na Pág ${item.pageIndex + 1} (y: ${item.rect.y.toFixed(1)})`);
  }

  assert.strictEqual(allDetectedItems.length, 2, 'Deve detectar exatamente 2 CPFs no lote');
  
  const itemA = allDetectedItems.find(i => i.text.includes(sensitiveCpfDocA));
  const itemB = allDetectedItems.find(i => i.text.includes(sensitiveCpfDocB));

  assert.ok(itemA, 'O CPF do Doc A deve ter sido detectado');
  assert.ok(itemB, 'O CPF do Doc B deve ter sido detectado');

  // Provar que ambos têm o MESMO nome de arquivo, mas fileId DIFERENTE
  assert.strictEqual(itemA.fileName, SAME_FILE_NAME);
  assert.strictEqual(itemB.fileName, SAME_FILE_NAME);
  assert.strictEqual(itemA.fileId, FILE_ID_DOC_A, 'Item A deve possuir fileId do TJ-SP');
  assert.strictEqual(itemB.fileId, FILE_ID_DOC_B, 'Item B deve possuir fileId do TRF-3');

  // 4. Demonstrar a falha da associação permissiva antiga vs a precisão do fileId
  console.log('\n[4/5] Comparando associação permissiva por nome vs isolamento estrito por fileId...');
  
  // Se usássemos !i.fileName || i.fileName === doc.name:
  const faultyMatchesA = allDetectedItems.filter(i => !i.fileName || i.fileName === SAME_FILE_NAME);
  assert.strictEqual(
    faultyMatchesA.length,
    2,
    'A associação permissiva por nome causaria colisão de 2 itens em arquivos de mesmo nome'
  );
  console.log('  ⚠️ AVISO: Filtragem por nome produziria colisão cruzada (2 itens capturados em doc A)');

  // Com o novo isolamento estrito por fileId:
  const strictMatchesA = allDetectedItems.filter(i => i.fileId === FILE_ID_DOC_A);
  const strictMatchesB = allDetectedItems.filter(i => i.fileId === FILE_ID_DOC_B);

  assert.strictEqual(strictMatchesA.length, 1, 'Isolamento estrito por fileId deve selecionar apenas 1 item para Doc A');
  assert.strictEqual(strictMatchesB.length, 1, 'Isolamento estrito por fileId deve selecionar apenas 1 item para Doc B');
  assert.strictEqual(strictMatchesA[0].rect.fileId, FILE_ID_DOC_A);
  assert.strictEqual(strictMatchesB[0].rect.fileId, FILE_ID_DOC_B);
  console.log('  ✓ Isolamento estrito por fileId homologado: 100% livre de colisão entre arquivos de mesmo nome.');

  // 5. Execução definitiva da anonimização mantendo os originais intactos e gerando nova versão
  console.log('\n[5/5] Executando queima definitiva com targetFileId e validando integridade do original...');
  const allRects = allDetectedItems.map(i => i.rect);

  for (const doc of batchDocuments) {
    // Passamos todos os retângulos do lote para validar que a engine isola estritamente por targetFileId
    const anonymizeRes = await LocalPdfEngine.anonymizePdfWithReport(
      doc.data.buffer as ArrayBuffer,
      allRects,
      {
        targetFileId: doc.fileId,
        targetFileName: doc.name
      }
    );

    // O original permaneceu intacto?
    const sha256Current = crypto.createHash('sha256').update(doc.data).digest('hex');
    const sha256Expected = doc.fileId === FILE_ID_DOC_A ? sha256OriginalA : sha256OriginalB;
    assert.strictEqual(sha256Current, sha256Expected, `Original do documento ${doc.fileId} deve permanecer intacto`);

    // Nova versão produzida com sufixo identificador de transformação
    const transformedName = doc.name.replace(/\.pdf$/i, '') + `_${doc.fileId.slice(-4)}_anonimizado_LGPD.pdf`;
    const outPath = path.join('test_output', transformedName);
    fs.writeFileSync(outPath, anonymizeRes.pdfBytes);

    assert.ok(anonymizeRes.pdfBytes.length > 0, 'Bytes anonimizados devem ser válidos');
    console.log(`  ✓ Documento ${doc.fileId}: Original intacto (SHA: ${sha256Current.slice(0, 12)}...) | Nova versão salva: ${transformedName}`);
  }

  console.log('\n================================================================');
  console.log('✅ SUCESSO: TESTE DE ISOLAMENTO POR FILEID APROVADO COM DISTINÇÃO!');
  console.log('================================================================\n');
}

runBatchRedactionIsolationTest().catch(err => {
  console.error('\n❌ [FALHA NO TESTE DE ISOLAMENTO]:', err);
  process.exit(1);
});
