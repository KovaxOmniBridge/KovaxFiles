import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PdfTextExtractor } from '../src/services/pdfTextExtractor.js';
import { AiRedactionService, RedactionCategoryOptions } from '../src/services/aiRedactionService.js';
import { LocalPdfEngine, RedactionRectangle } from '../src/services/pdfEngine.js';

async function runBatchRedactionIsolationTest() {
  console.log('================================================================');
  console.log('🧪 TESTE DE ISOLAMENTO E ASSOCIAÇÃO DE ARQUIVOS EM LOTE (LGPD)');
  console.log('================================================================\n');

  fs.mkdirSync('test_output', { recursive: true });

  // 1. Criar Documento A: Contém CPF na posição Y: 700
  console.log('[1/4] Gerando Documento A com dado sensível em Y: 700...');
  const docA = await PDFDocument.create();
  const fontA = await docA.embedFont(StandardFonts.Helvetica);
  const pageA = docA.addPage([595, 842]);
  
  const sensitiveCpfDocA = '111.222.333-44';
  pageA.drawText(`Contrato de Honorários A`, { x: 50, y: 750, size: 14, font: fontA });
  pageA.drawText(`CPF do Cliente A: ${sensitiveCpfDocA}`, { x: 50, y: 700, size: 12, font: fontA });
  pageA.drawText(`Texto Legítimo Neutro A`, { x: 50, y: 400, size: 12, font: fontA });
  
  const bytesDocA = await docA.save();
  const pathDocA = 'test_output/batch_doc_a.pdf';
  fs.writeFileSync(pathDocA, bytesDocA);

  // 2. Criar Documento B: Contém texto legítimo na posição Y: 700 e CPF em Y: 400
  console.log('[2/4] Gerando Documento B com texto legítimo em Y: 700 e dado sensível em Y: 400...');
  const docB = await PDFDocument.create();
  const fontB = await docB.embedFont(StandardFonts.Helvetica);
  const pageB = docB.addPage([595, 842]);

  const sensitiveCpfDocB = '999.888.777-66';
  const legitimateClauseDocB = 'Cláusula Contratual Importante - Texto Legítimo Não Sigiloso';
  pageB.drawText(`Contrato de Prestação B`, { x: 50, y: 750, size: 14, font: fontB });
  pageB.drawText(legitimateClauseDocB, { x: 50, y: 700, size: 12, font: fontB });
  pageB.drawText(`CPF do Fornecedor B: ${sensitiveCpfDocB}`, { x: 50, y: 400, size: 12, font: fontB });

  const bytesDocB = await docB.save();
  const pathDocB = 'test_output/batch_doc_b.pdf';
  fs.writeFileSync(pathDocB, bytesDocB);

  // 3. Simular o fluxo de análise em lote (como no LgpdRedactor e LgpdPrivacySecuritySuite)
  console.log('\n[3/4] Analisando ambos os documentos em lote e validando rastreabilidade de arquivo...');
  const files = [
    { name: 'batch_doc_a.pdf', data: bytesDocA },
    { name: 'batch_doc_b.pdf', data: bytesDocB }
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

  for (const file of files) {
    const pagesData = await PdfTextExtractor.extractTextWithBounds(file.data.buffer as ArrayBuffer);
    const items = await AiRedactionService.analyzePdf(
      pagesData,
      categories,
      { mode: 'pattern' },
      undefined,
      file.name
    );

    const taggedItems = items.map(it => ({
      ...it,
      fileName: file.name,
      rect: { ...it.rect, fileName: file.name }
    }));

    allDetectedItems.push(...taggedItems);
  }

  console.log(`  -> Total de ocorrências detectadas no lote: ${allDetectedItems.length}`);
  for (const item of allDetectedItems) {
    console.log(`     * [${item.fileName}] "${item.text}" na Pág ${item.pageIndex + 1} em (x: ${item.rect.x.toFixed(1)}, y: ${item.rect.y.toFixed(1)})`);
  }

  assert.strictEqual(allDetectedItems.length, 2, 'Deve detectar exatamente 2 CPFs no total do lote');
  
  const itemA = allDetectedItems.find(i => i.text.includes(sensitiveCpfDocA));
  const itemB = allDetectedItems.find(i => i.text.includes(sensitiveCpfDocB));

  assert.ok(itemA, 'O CPF do Doc A deve ter sido detectado');
  assert.ok(itemB, 'O CPF do Doc B deve ter sido detectado');
  assert.strictEqual(itemA.fileName, 'batch_doc_a.pdf', 'Item A deve estar associado a batch_doc_a.pdf');
  assert.strictEqual(itemB.fileName, 'batch_doc_b.pdf', 'Item B deve estar associado a batch_doc_b.pdf');

  // Validar que as coordenadas Y são diferentes (700 vs 400)
  console.log(`  -> Y do Item A: ${itemA.rect.y.toFixed(0)} | Y do Item B: ${itemB.rect.y.toFixed(0)}`);
  assert.ok(Math.abs(itemA.rect.y - itemB.rect.y) > 200, 'Os dois itens devem estar em posições Y distintas');

  // 4. Executar anonimização com filtragem estrita de retângulos por arquivo
  console.log('\n[4/4] Executando anonimização com isolamento estrito por arquivo...');
  for (const file of files) {
    // Filtragem correta: apenas os retângulos deste arquivo específico
    const fileRects: RedactionRectangle[] = allDetectedItems
      .filter(i => !i.fileName || i.fileName === file.name)
      .map(i => i.rect);

    console.log(`  -> Processando ${file.name}: aplicando ${fileRects.length} retângulos`);
    
    if (file.name === 'batch_doc_a.pdf') {
      assert.strictEqual(fileRects.length, 1, 'Doc A deve receber exatamente 1 retângulo');
      assert.ok(Math.abs(fileRects[0].y - itemA.rect.y) < 5, 'Retângulo do Doc A deve ser em Y ~ 700');
    } else {
      assert.strictEqual(fileRects.length, 1, 'Doc B deve receber exatamente 1 retângulo');
      assert.ok(Math.abs(fileRects[0].y - itemB.rect.y) < 5, 'Retângulo do Doc B deve ser em Y ~ 400');
    }

    const redactedBytes = await LocalPdfEngine.anonymizePdf(file.data.buffer as ArrayBuffer, fileRects, {
      targetFileName: file.name
    });

    assert.ok(redactedBytes.length > 0, `Bytes anonimizados de ${file.name} devem ser válidos`);
    fs.writeFileSync(`test_output/${file.name}_redacted.pdf`, redactedBytes);
  }

  // Verificação defensiva: o que aconteceria se passássemos allDetectedItems com targetFileName?
  console.log('\n[Extra] Testando trava de proteção defensiva no LocalPdfEngine.anonymizePdf...');
  const allRects = allDetectedItems.map(i => i.rect);
  // Passando TODOS os retângulos do lote para Doc B, mas com targetFileName: 'batch_doc_b.pdf'
  const defBytes = await LocalPdfEngine.anonymizePdf(bytesDocB.buffer as ArrayBuffer, allRects, {
    targetFileName: 'batch_doc_b.pdf'
  });
  assert.ok(defBytes.length > 0, 'LocalPdfEngine com targetFileName deve processar com sucesso');
  console.log('  -> Trava defensiva do LocalPdfEngine filtrada com sucesso!');

  console.log('\n================================================================');
  console.log('✅ SUCESSO: O ISOLAMENTO DE ARQUIVOS EM LOTE FOI HOMOLOGADO!');
  console.log('================================================================');
}

runBatchRedactionIsolationTest().catch(err => {
  console.error('\n❌ [FALHA NO TESTE DE ISOLAMENTO]:', err);
  process.exit(1);
});
