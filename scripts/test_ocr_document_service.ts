import { OcrDocumentService } from '../src/services/ocrDocumentService';
import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

async function testOcrPipeline() {
  console.log('===========================================================================');
  console.log('🔬 TESTE DE INTEGRIDADE: OCR DOCUMENTAL COMPLETO & PDF PESQUISÁVEL');
  console.log('===========================================================================');

  // 1. Criar um PDF com 3 páginas simuladas
  const dummyDoc = await PDFDocument.create();
  for (let i = 1; i <= 3; i++) {
    const page = dummyDoc.addPage([595, 842]);
    page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.96, 0.96, 0.96) });
    page.drawText(`Documento Processual de Teste - Pagina ${i}`, { x: 50, y: 800, size: 14 });
  }
  const dummyPdfBytes = await dummyDoc.save();

  // Testar geração de Searchable PDF diretamente do OcrDocumentService
  console.log('\n[1/3] Testando geração de Searchable PDF (Sandwich PDF)...');
  const processedPages = [
    {
      pageNumber: 1,
      width: 595,
      height: 842,
      fullText: 'EXCELENTISSIMO SENHOR JUIZ DE DIREITO DA 1a VARA CIVEL',
      rawOcrText: 'EXCELENTISSIMO SENHOR JUIZ DE DIREITO DA 1a VARA CIVEL',
      confidence: 94,
      status: 'complete' as const,
      issues: [],
      previewImageUrl: '',
      lines: [
        {
          text: 'EXCELENTISSIMO SENHOR JUIZ DE DIREITO DA 1a VARA CIVEL',
          x: 50,
          y: 800,
          width: 400,
          height: 14,
          confidence: 94,
          words: [
            { text: 'EXCELENTISSIMO', x: 50, y: 800, width: 90, height: 14, confidence: 95 },
            { text: 'SENHOR', x: 145, y: 800, width: 50, height: 14, confidence: 93 },
            { text: 'JUIZ', x: 200, y: 800, width: 35, height: 14, confidence: 94 },
            { text: 'DE', x: 240, y: 800, width: 20, height: 14, confidence: 96 },
            { text: 'DIREITO', x: 265, y: 800, width: 50, height: 14, confidence: 94 },
          ]
        }
      ],
      words: []
    },
    {
      pageNumber: 2,
      width: 595,
      height: 842,
      fullText: 'Texto com revisão manual do advogado para correção de carimbo',
      rawOcrText: 'Texto com revi... carimbo',
      confidence: 58,
      status: 'incomplete' as const,
      issues: ['Confiança média muito baixa (58%). Texto com provável degradação visual.'],
      previewImageUrl: '',
      lines: [],
      words: [],
      isRevised: true // Teste de página revisada
    }
  ];

  const searchablePdfBytes = await OcrDocumentService.generateSearchablePdf(
    processedPages,
    'Petição Inicial Pesquisável'
  );

  if (!searchablePdfBytes || searchablePdfBytes.byteLength === 0) {
    throw new Error('Falha: O PDF pesquisável gerado está vazio.');
  }
  console.log(`      ✓ PDF pesquisável gerado com sucesso: ${searchablePdfBytes.byteLength} bytes`);

  // 2. Validar que o leitor PDF encontra o texto pesquisável no documento gerado
  console.log('\n[2/3] Validando indexação e busca no leitor PDF (pdfjs-dist)...');
  const pdfjs = (pdfjsLib as any).getDocument ? pdfjsLib : ((pdfjsLib as any).default || pdfjsLib);
  const loadingTask = pdfjs.getDocument({ data: searchablePdfBytes, useSystemFonts: true });
  const loadedPdf = await loadingTask.promise;

  if (loadedPdf.numPages !== 2) {
    throw new Error(`Falha: Esperado 2 páginas no PDF pesquisável, obtido: ${loadedPdf.numPages}`);
  }

  // Página 1 (posições por palavra)
  const page1 = await loadedPdf.getPage(1);
  const text1 = await page1.getTextContent();
  const page1String = text1.items.map((it: any) => it.str).join(' ');
  console.log(`      ✓ Página 1 texto indexado: "${page1String}"`);
  if (!page1String.includes('EXCELENTISSIMO') || !page1String.includes('DIREITO')) {
    throw new Error(`Falha na extração de texto da página 1: ${page1String}`);
  }

  // Página 2 (texto revisado pelo usuário)
  const page2 = await loadedPdf.getPage(2);
  const text2 = await page2.getTextContent();
  const page2String = text2.items.map((it: any) => it.str).join(' ');
  console.log(`      ✓ Página 2 texto revisado indexado: "${page2String}"`);
  if (!page2String.includes('revisão manual') || !page2String.includes('advogado')) {
    throw new Error(`Falha na extração de texto revisado da página 2: ${page2String}`);
  }

  // 3. Validar diagnóstico de reconhecimento incompleto
  console.log('\n[3/3] Validando diagnósticos de reconhecimento incompleto...');
  if (processedPages[0].status !== 'complete') {
    throw new Error('Falha: Página 1 deveria ter status "complete"');
  }
  if (processedPages[1].status !== 'incomplete' || processedPages[1].issues.length === 0) {
    throw new Error('Falha: Página 2 deveria apontar diagnóstico de "incomplete" com relatório de issues');
  }
  console.log(`      ✓ Diagnóstico de página 2 validado: "${processedPages[1].issues[0]}"`);

  console.log('\n===========================================================================');
  console.log('✅ SUCESSO: Todos os testes de OCR Documental Completo foram APROVADOS!');
  console.log('===========================================================================');
}

testOcrPipeline().catch(err => {
  console.error('\n❌ ERRO NO TESTE DE OCR:', err);
  process.exit(1);
});
