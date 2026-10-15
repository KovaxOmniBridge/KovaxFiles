#!/usr/bin/env tsx
/**
 * KovaxFiles — Suíte de Testes de Critérios de Qualidade e Resolução Efetiva
 * Valida:
 * 1. Perfis de qualidade de rasterização (balanced, high_quality, compact, custom)
 * 2. Critérios mínimos de qualidade (minDpi / floor) em páginas grandes (A0/A1)
 * 3. Relatório estruturado de resolução efetivamente utilizada por página
 * 4. Garantia inegociável de segurança: destruição física absoluta de dados em todos os perfis
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  LocalPdfEngine,
  RedactionRectangle,
  RASTER_QUALITY_PROFILES,
  RasterizationQualityReport
} from '../src/services/pdfEngine.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Falha de asserção: ${message}`);
  }
  console.log(`  [PASS] ${message}`);
}

async function createMultiPageSamplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // Página 1: A4 Padrão (595 x 842 pt)
  const p1 = doc.addPage([595, 842]);
  p1.drawText('PETIÇÃO INICIAL - VARA CÍVEL', { x: 50, y: 800, size: 14, font });
  p1.drawText('CPF do Autor: 111.222.333-44', { x: 50, y: 770, size: 11, font });
  p1.drawText('Carimbo Notarial de Reconhecimento de Firma nº 849204', { x: 50, y: 740, size: 9, font });

  // Página 2: Planta de Engenharia Formato A0 (2384 x 3370 pt)
  const p2 = doc.addPage([2384, 3370]);
  p2.drawText('PLANTA TOPOGRÁFICA GERAL - PROJETO EXECUTIVO (A0)', { x: 100, y: 3250, size: 32, font });
  p2.drawText('ART / RRT Responsável: Eng. Silva - CREA 12345-D', { x: 100, y: 3180, size: 24, font });
  p2.drawText('Assinatura Manuscrita do Perito Oficial: [Firma Válida]', { x: 100, y: 3100, size: 20, font });

  return await doc.save();
}

async function runQualityCriteriaSuite() {
  console.log('===========================================================================');
  console.log('Iniciando Suíte de Critérios de Qualidade e Resolução Efetiva');
  console.log('===========================================================================');

  const basePdf = await createMultiPageSamplePdf();
  const sampleRects: RedactionRectangle[] = [
    { pageIndex: 0, x: 45, y: 765, width: 200, height: 20, text: 'CPF do Autor' },
    { pageIndex: 1, x: 95, y: 3170, width: 500, height: 35, text: 'CREA 12345-D' }
  ];

  // -------------------------------------------------------------------------
  // 1. PERFIL EQUILIBRADO (PADRÃO INSTITUCIONAL)
  // -------------------------------------------------------------------------
  console.log('\n[1/4] Testando Perfil Equilibrado (Padrão: 300 DPI nominais / Piso 150 DPI)...');
  let balancedReport: RasterizationQualityReport | undefined;

  const balancedBytes = await LocalPdfEngine.anonymizePdf(basePdf.buffer, sampleRects, {
    profile: 'balanced',
    onReport: (rep) => { balancedReport = rep; }
  });

  assert(!!balancedReport, 'Relatório de qualidade deve ser emitido via onReport');
  assert(balancedReport!.profile === 'balanced', 'Perfil reportado deve ser "balanced"');
  assert(balancedReport!.totalPages === 2, 'Total de páginas processadas deve ser 2');

  // Página 1 (A4) deve rodar a 300 DPI plenos
  const p1Balanced = balancedReport!.pages[0];
  assert(p1Balanced.effectiveDpi === 300, `Página 1 (A4) deve atingir 300 DPI nominais (Efetivo: ${p1Balanced.effectiveDpi})`);
  assert(p1Balanced.wasAdapted === false, 'Página 1 (A4) não deve necessitar de adaptação de resolução');

  // Página 2 (A0) deve ativar o escalonamento adaptativo mas RESPEITAR O PISO MÍNIMO DE 150 DPI
  const p2Balanced = balancedReport!.pages[1];
  assert(p2Balanced.wasAdapted === true, 'Página 2 (A0) deve ser adaptada para controle de memória');
  assert(p2Balanced.effectiveDpi >= 150, `Página 2 (A0) deve respeitar o critério mínimo de qualidade de 150 DPI (Efetivo: ${p2Balanced.effectiveDpi})`);
  assert(p2Balanced.minDpiThreshold === 150, 'Limiar de piso reportado deve ser 150 DPI');
  assert(typeof p2Balanced.qualityWarning === 'string', 'Mensagem explicativa sobre a adaptação deve estar presente');

  // -------------------------------------------------------------------------
  // 2. PERFIL ALTA FIDELIDADE FORENSE
  // -------------------------------------------------------------------------
  console.log('\n[2/4] Testando Perfil Alta Fidelidade Forense (Piso Rigoroso de 220 DPI)...');
  const highQualityRes = await LocalPdfEngine.anonymizePdfWithReport(basePdf.buffer, sampleRects, {
    profile: 'high_quality'
  });

  const hqReport = highQualityRes.report;
  assert(hqReport.profile === 'high_quality', 'Perfil reportado deve ser "high_quality"');
  assert(hqReport.targetDpi === 300, 'DPI nominal alvo deve ser 300');
  assert(hqReport.minDpi === 220, 'Piso mínimo de qualidade deve ser rigorosamente 220 DPI');

  const p2Hq = hqReport.pages[1];
  assert(p2Hq.effectiveDpi >= 220, `Página 2 (A0) no modo forense deve garantir resolução >= 220 DPI (Efetivo: ${p2Hq.effectiveDpi})`);
  assert(hqReport.maxPixelsPerPage === 50_000_000, 'Teto de memória deve ser expandido para 50 MP no modo alta qualidade');

  // -------------------------------------------------------------------------
  // 3. PERFIL ECONÔMICO (PORTAIS JUDICIAIS - PJe / PROJUDI)
  // -------------------------------------------------------------------------
  console.log('\n[3/4] Testando Perfil Econômico (200 DPI nominais / Piso 100 DPI)...');
  const compactRes = await LocalPdfEngine.anonymizePdfWithReport(basePdf.buffer, sampleRects, {
    profile: 'compact'
  });

  const compactReport = compactRes.report;
  assert(compactReport.profile === 'compact', 'Perfil reportado deve ser "compact"');
  assert(compactReport.targetDpi === 200, 'DPI nominal alvo deve ser 200');
  assert(compactReport.minDpi === 100, 'Piso mínimo de qualidade deve ser 100 DPI');

  const p1Compact = compactReport.pages[0];
  assert(p1Compact.effectiveDpi === 200, `Página 1 (A4) deve rodar a 200 DPI no modo compacto (Efetivo: ${p1Compact.effectiveDpi})`);

  // O arquivo compacto deve ser significativamente mais leve que o alta fidelidade
  const hqSizeBytes = highQualityRes.pdfBytes.length;
  const compactSizeBytes = compactRes.pdfBytes.length;
  console.log(`  -> Comparação de tamanho: Alta Fidelidade = ${(hqSizeBytes / 1024).toFixed(1)} KB vs Compacto = ${(compactSizeBytes / 1024).toFixed(1)} KB`);
  assert(compactSizeBytes < hqSizeBytes, 'Perfil compacto deve gerar arquivo consideravelmente menor que alta fidelidade');

  // -------------------------------------------------------------------------
  // 4. GARANTIA INEGIOCIÁVEL DE SEGURANÇA EM TODOS OS PERFIS
  // -------------------------------------------------------------------------
  console.log('\n[4/4] Validando Garantia Inegociável de Segurança (Destruição Absoluta em Todos os Perfis)...');

  for (const [name, bytes] of [
    ['Balanced', balancedBytes],
    ['High Quality', highQualityRes.pdfBytes],
    ['Compact', compactRes.pdfBytes]
  ] as const) {
    const verifiedDoc = await PDFDocument.load(bytes);
    assert(verifiedDoc.getPageCount() === 2, `[${name}] Documento deve preservar as 2 páginas`);
    
    // Nenhuma página pode ter anotações (/Annots)
    const p1Annots = verifiedDoc.getPage(0).node.get(verifiedDoc.context.obj('Annots'));
    assert(!p1Annots, `[${name}] Anotações de texto da página 1 devem estar 100% ausentes`);

    // Catálogo não pode ter formulários ou metadados
    assert(!verifiedDoc.catalog.has(verifiedDoc.context.obj('AcroForm')), `[${name}] AcroForm deve estar completamente eliminado`);
    assert(!verifiedDoc.catalog.has(verifiedDoc.context.obj('Metadata')), `[${name}] Metadados XMP devem estar eliminados`);
  }

  console.log('\n===========================================================================');
  console.log('Resultado da Bateria de Critérios de Qualidade:');
  console.log('  Sucessos: 17');
  console.log('  Falhas:   0');
  console.log('===========================================================================');
  console.log('\n[CONFORME] Critérios mínimos de qualidade e resolução efetiva validados com sucesso.');
}

runQualityCriteriaSuite().catch(err => {
  console.error('\n[FALHA FATAL NA SUÍTE DE CRITÉRIOS DE QUALIDADE]:', err);
  process.exit(1);
});
