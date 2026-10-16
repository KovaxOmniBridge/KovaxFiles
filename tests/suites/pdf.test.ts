/**
 * =============================================================================
 * SUÍTE 3: MANIPULAÇÃO E INTEGRIDADE DE PDF
 * =============================================================================
 * Comprova: Abrir, manipular, salvar, reabrir e verificar conteúdo.
 * Execução: Todo Pull Request.
 * =============================================================================
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

async function runPdfSuite() {
  console.log('='.repeat(80));
  console.log('  [SUÍTE 3: PDF] ABRIR, MANIPULAR, SALVAR, REABRIR E VERIFICAR CONTEÚDO');
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

  // 1. Criar e Salvar PDF com Múltiplas Páginas e Metadados
  let originalPdfBytes: Uint8Array;
  await test('Criar documento PDF de 3 páginas com texto, metadados e desenho vetorial', async () => {
    const doc = await PDFDocument.create();
    doc.setTitle('Petição Inicial de Teste');
    doc.setAuthor('Kovax Files Desktop');
    const font = await doc.embedFont(StandardFonts.HelveticaBold);

    // Página 1
    const p1 = doc.addPage([595, 842]);
    p1.drawText('FOLHA 1: EXCELENTÍSSIMO SENHOR JUIZ', { x: 50, y: 800, size: 14, font, color: rgb(0, 0, 0) });

    // Página 2
    const p2 = doc.addPage([595, 842]);
    p2.drawText('FOLHA 2: DOS FATOS E FUNDAMENTOS JURÍDICOS', { x: 50, y: 800, size: 14, font, color: rgb(0, 0, 0) });

    // Página 3
    const p3 = doc.addPage([595, 842]);
    p3.drawText('FOLHA 3: DOS PEDIDOS E REQUERIMENTOS FINAIS', { x: 50, y: 800, size: 14, font, color: rgb(0, 0, 0) });

    originalPdfBytes = await doc.save();
    assert.ok(originalPdfBytes.length > 500, 'Tamanho do PDF deve ser > 500 bytes');
  });

  // 2. Manipulação Estrutural: Rotação, Exclusão de Página e Inserção de Nova Página
  let manipulatedBytes: Uint8Array;
  await test('Manipular PDF: Rotacionar página 1 em 90°, remover página 2 e anexar nova página', async () => {
    const doc = await PDFDocument.load(originalPdfBytes);
    assert.strictEqual(doc.getPageCount(), 3, 'Documento original deve ter 3 páginas');

    // Rotacionar página 1
    const pages = doc.getPages();
    pages[0].setRotation(degrees(90));

    // Remover página 2 (índice 1)
    doc.removePage(1);
    assert.strictEqual(doc.getPageCount(), 2, 'Após remoção, documento deve ter 2 páginas');

    // Inserir nova página no final
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const newPage = doc.addPage([595, 842]);
    newPage.drawText('FOLHA ADICIONADA: COMPROVANTE DE CUSTAS RECOLHIDAS', { x: 50, y: 800, size: 12, font });

    assert.strictEqual(doc.getPageCount(), 3, 'Após inserção, documento deve ter 3 páginas');
    manipulatedBytes = await doc.save();
  });

  // 3. Reabrir e Verificar com pdf-lib
  await test('Reabrir PDF manipulado com pdf-lib e validar integridade estrutural e metadados', async () => {
    const reloaded = await PDFDocument.load(manipulatedBytes);
    assert.strictEqual(reloaded.getPageCount(), 3, 'Deve conter exatamente 3 páginas');
    assert.strictEqual(reloaded.getTitle(), 'Petição Inicial de Teste', 'Metadado de título deve ser preservado');

    const pages = reloaded.getPages();
    assert.strictEqual(pages[0].getRotation().angle, 90, 'Página 1 deve manter a rotação de 90°');
    assert.strictEqual(pages[1].getRotation().angle, 0, 'Página 2 original deve ter 0° de rotação');
  });

  // 4. Reabrir e Validar Conteúdo com pdfjs-dist
  await test('Reabrir PDF com pdfjs-dist e verificar extração de texto em cada página', async () => {
    const pdfjs = (pdfjsLib as any).getDocument ? pdfjsLib : ((pdfjsLib as any).default || pdfjsLib);
    const loadingTask = pdfjs.getDocument({ data: manipulatedBytes, useSystemFonts: true });
    const loadedDoc = await loadingTask.promise;

    assert.strictEqual(loadedDoc.numPages, 3, 'pdfjs-dist deve identificar 3 páginas');

    // Extrair texto da página 1
    const p1 = await loadedDoc.getPage(1);
    const text1 = await p1.getTextContent();
    const str1 = text1.items.map((it: any) => it.str).join(' ');
    assert.ok(str1.includes('FOLHA 1') || str1.includes('EXCELENTÍSSIMO') || str1.includes('JUIZ'), 'Texto da folha 1 deve ser legível');

    // Extrair texto da página 3 (adicionada)
    const p3 = await loadedDoc.getPage(3);
    const text3 = await p3.getTextContent();
    const str3 = text3.items.map((it: any) => it.str).join(' ');
    assert.ok(str3.includes('CUSTAS') || str3.includes('COMPROVANTE'), 'Texto da folha adicionada deve ser legível');
  });

  console.log(`\nResultado Suíte 3 (PDF): ${passed} Passados, ${failed} Falhados\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runPdfSuite().catch(err => {
  console.error('Erro fatal na Suíte 3 (PDF):', err);
  process.exit(1);
});
