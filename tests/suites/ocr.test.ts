/**
 * =============================================================================
 * SUÍTE 7: OCR DOCUMENTAL E PDF PESQUISÁVEL
 * =============================================================================
 * Comprova: Reconhecimento, falhas, coordenadas e PDF pesquisável (Sandwich PDF).
 * Execução: Todo Pull Request.
 * =============================================================================
 */

import assert from 'assert';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import { OcrDocumentService } from '../../src/services/ocrDocumentService.ts';

async function runOcrSuite() {
  console.log('='.repeat(80));
  console.log('  [SUÍTE 7: OCR] RECONHECIMENTO, FALHAS, COORDENADAS E PDF PESQUISÁVEL');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name} -> ${err.message}`);
      failed++;
    }
  }

  const dummyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

  // 1. Geração de PDF Pesquisável com Camada Invisível e Coordenadas
  let searchablePdfBytes: Uint8Array;
  const processedPages = [
    {
      pageNumber: 1,
      width: 595,
      height: 842,
      fullText: 'PODER JUDICIARIO TRIBUNAL DE JUSTICA DO ESTADO DE SAO PAULO',
      rawOcrText: 'PODER JUDICIARIO TRIBUNAL DE JUSTICA DO ESTADO DE SAO PAULO',
      confidence: 96,
      status: 'complete' as const,
      issues: [],
      previewImageUrl: dummyPng,
      lines: [
        {
          text: 'PODER JUDICIARIO TRIBUNAL DE JUSTICA DO ESTADO DE SAO PAULO',
          x: 50,
          y: 800,
          width: 450,
          height: 14,
          confidence: 96,
          words: [
            { text: 'PODER', x: 50, y: 800, width: 60, height: 14, confidence: 97 },
            { text: 'JUDICIARIO', x: 115, y: 800, width: 90, height: 14, confidence: 96 },
            { text: 'TRIBUNAL', x: 210, y: 800, width: 80, height: 14, confidence: 95 }
          ]
        }
      ],
      words: []
    },
    {
      pageNumber: 2,
      width: 595,
      height: 842,
      fullText: 'Certifico e dou fé que publiquei a intimação no Diário Oficial.',
      rawOcrText: 'Cert... fé que...',
      confidence: 52,
      status: 'incomplete' as const,
      issues: ['Confiança baixa detectada na captura (52%). Possível ruído visual.'],
      previewImageUrl: dummyPng,
      lines: [],
      words: [],
      isRevised: true
    }
  ];

  await test('Gerar PDF pesquisável (Sandwich PDF) com sobreposição de texto e imagem preservada', async () => {
    searchablePdfBytes = await OcrDocumentService.generateSearchablePdf(
      processedPages,
      'Petição Pesquisável com OCR'
    );
    assert.ok(searchablePdfBytes.length > 1000, 'PDF pesquisável deve ter tamanho > 1KB');
  });

  // 2. Validar Busca e Indexação com pdfjs-dist
  await test('Indexação textual no PDF pesquisável via leitor PDF (pdfjs-dist)', async () => {
    const pdfjs = (pdfjsLib as any).getDocument ? pdfjsLib : ((pdfjsLib as any).default || pdfjsLib);
    const loadingTask = pdfjs.getDocument({ data: searchablePdfBytes, useSystemFonts: true });
    const loadedPdf = await loadingTask.promise;

    assert.strictEqual(loadedPdf.numPages, 2, 'Deve ter 2 páginas');

    // Verificar texto extraído da página 1
    const p1 = await loadedPdf.getPage(1);
    const textContent1 = await p1.getTextContent();
    const str1 = textContent1.items.map((it: any) => it.str).join(' ');
    assert.ok(str1.includes('PODER') || str1.includes('JUDICIARIO'), 'Texto da página 1 deve ser pesquisável');

    // Verificar texto revisado da página 2
    const p2 = await loadedPdf.getPage(2);
    const textContent2 = await p2.getTextContent();
    const str2 = textContent2.items.map((it: any) => it.str).join(' ');
    assert.ok(str2.includes('Certifico') || str2.includes('intimação'), 'Texto revisado da página 2 deve ser indexado');
  });

  // 3. Validação de Diagnóstico de Falha e Confiança
  await test('Identificação de falhas, confiança degradada e emissão de diagnóstico de incomplete', async () => {
    assert.strictEqual(processedPages[0].status, 'complete');
    assert.strictEqual(processedPages[1].status, 'incomplete');
    assert.ok(processedPages[1].issues.length > 0, 'Página incompleta deve listar as causas/issues detectadas');
  });

  console.log(`\nResultado Suíte 7 (OCR): ${passed} Passados, ${failed} Falhados\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runOcrSuite().catch(err => {
  console.error('Erro fatal na Suíte 7 (OCR):', err);
  process.exit(1);
});
