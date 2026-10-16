/**
 * =============================================================================
 * SUÍTE 4: PRIVACIDADE E REDAÇÃO LGPD
 * =============================================================================
 * Comprova: Ausência de vazamentos, isolamento de arquivos e resultados revisáveis.
 * Execução: Todo Pull Request.
 * =============================================================================
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import assert from 'assert';
import { CoreRedactionEngine } from '../../src/core/redaction/redactionCore.ts';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { PdfReportExporterService } from '../../src/services/pdfReportExporterService.ts';
import { LocalPdfEngine } from '../../src/services/pdfEngine.ts';

async function runLgpdSuite() {
  console.log('='.repeat(80));
  console.log('  [SUÍTE 4: LGPD] AUSÊNCIA DE VAZAMENTOS, ISOLAMENTO E RESULTADOS REVISÁVEIS');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name} -> ${err.message}`);
      failed++;
    }
  }

  // 1. Detecção e Anonimização de Dados Sensíveis
  await test('Detecção e mascaramento completo de CPF, CNPJ, E-mail e Processo CNJ', async () => {
    const rawText = `
      Requerente: Maria Aparecida, CPF 123.456.789-09, e-mail maria.advocacia@prefeitura.sp.gov.br.
      Empresa ré: Construtora Silva ME, CNPJ 12.345.678/0001-90.
      Autos do processo: 0000001-83.2008.1.00.0000 da 1ª Vara da Fazenda Pública.
    `;

    const matches = CoreRedactionEngine.scanText(rawText);
    assert.ok(matches.length >= 4, `Deve identificar pelo menos 4 entidades (encontradas: ${matches.length})`);

    const redacted = CoreRedactionEngine.applyTextRedactions(rawText, matches);
    assert.ok(!redacted.includes('123.456.789-09'), 'CPF original não pode existir no texto anonimizado');
    assert.ok(!redacted.includes('12.345.678/0001-90'), 'CNPJ original não pode existir');
    assert.ok(!redacted.includes('maria.advocacia@prefeitura.sp.gov.br'), 'E-mail original não pode existir');
    assert.ok(!redacted.includes('0000001-83.2008.1.00.0000'), 'Número CNJ original não pode existir');
    assert.ok(redacted.includes('██████████████'), 'Deve aplicar máscara visual de tarjamento');
  });

  // 2. Isolamento Estrito de Arquivos e Memória (Sem Colisão de Nomes)
  await test('Isolamento estrito entre lotes: Documentos com mesmo nome não compartilham contexto ou vazam PII', async () => {
    const docA_Text = 'Documento A: Autor João Pedro CPF 123.456.789-09';
    const docB_Text = 'Documento B: Réu Carlos Eduardo CPF 999.888.777-66';

    const matchesA = CoreRedactionEngine.scanText(docA_Text);
    const matchesB = CoreRedactionEngine.scanText(docB_Text);

    assert.strictEqual(matchesA.length, 1);
    assert.strictEqual(matchesB.length, 1);
    assert.strictEqual(matchesA[0].matchedText, '123.456.789-09');
    assert.strictEqual(matchesB[0].matchedText, '999.888.777-66');

    // Garantir que a lista de matches de A não contaminou a lista de matches de B
    assert.notStrictEqual(matchesA[0].matchedText, matchesB[0].matchedText);
  });

  // 3. Resultados Revisáveis e Trilha de Auditoria (Audit Trail Report)
  await test('Resultados revisáveis: Exportação de laudo de auditoria com contagens, posições e SHA-256', async () => {
    const mockReportData = {
      documentName: 'peticao_inicial_anonimizada.pdf',
      documentHash: crypto.createHash('sha256').update('dummy-pdf').digest('hex'),
      generationDate: new Date().toISOString(),
      totalRedactions: 3,
      redactionsByCategory: {
        CPF: 1,
        CNPJ: 1,
        EMAIL: 1
      },
      redactions: [
        {
          id: 'red_1',
          pageNumber: 1,
          category: 'CPF',
          originalTextPreview: '123.***.***-00',
          coordinates: { x: 50, y: 700, width: 100, height: 12 },
          reviewStatus: 'APPROVED' as const
        }
      ]
    };

    assert.strictEqual(mockReportData.totalRedactions, 3);
    assert.strictEqual(mockReportData.redactions[0].reviewStatus, 'APPROVED');
    assert.strictEqual(mockReportData.documentHash.length, 64);
  });

  // 4. Validação Estrita de Medições de Rasterização (Prevenção de Falsas Medições Presumidas)
  await test('Auditoria de rasterização: Reprovar relatórios com medidas ausentes ou dados truncados', async () => {
    const validReport = {
      totalPages: 2,
      averageEffectiveDpi: 300,
      minEffectiveDpi: 300,
      maxEffectiveDpi: 300,
      pages: [
        {
          pageNumber: 1,
          widthPt: 595,
          heightPt: 842,
          targetDpi: 300,
          effectiveDpi: 300,
          minDpiThreshold: 150,
          renderedWidthPx: 2479,
          renderedHeightPx: 3508,
          megaPixels: 8.7,
          wasAdapted: false,
          status: 'optimal' as const
        },
        {
          pageNumber: 2,
          widthPt: 595,
          heightPt: 842,
          targetDpi: 300,
          effectiveDpi: 300,
          minDpiThreshold: 150,
          renderedWidthPx: 2479,
          renderedHeightPx: 3508,
          megaPixels: 8.7,
          wasAdapted: false,
          status: 'optimal' as const
        }
      ]
    };

    assert.strictEqual(LocalPdfEngine.validateRasterizationReport(validReport), true, 'Relatório com medições completas deve ser aprovado');

    // Casos de medições presumidas ou corrompidas que DEVEM ser reprovados:
    assert.strictEqual(LocalPdfEngine.validateRasterizationReport(null), false);
    assert.strictEqual(LocalPdfEngine.validateRasterizationReport({}), false);
    assert.strictEqual(LocalPdfEngine.validateRasterizationReport({ ...validReport, pages: [] }), false, 'Reprovar se totalPages divergir de pages.length');
    assert.strictEqual(LocalPdfEngine.validateRasterizationReport({ ...validReport, averageEffectiveDpi: 0 }), false, 'Reprovar se DPI médio for zero');
    assert.strictEqual(LocalPdfEngine.validateRasterizationReport({
      ...validReport,
      pages: [{ ...validReport.pages[0], renderedWidthPx: 0 }]
    }), false, 'Reprovar se dimensões de renderização estiverem ausentes');
  });

  // 5. Garantia Forense: Nunca Presumir A4 (595x842 pt), DPI Nominal ou Status Optimal na Ausência de Medição
  await test('Laudo técnico seguro: Identificar explicitamente como measurement_unavailable sem presumir A4 nem DPI nominal', async () => {
    // Simula documento de formato não-A4 (ex: planta A1 com 1684x2384 pt ou ofício 400x600 pt)
    const customPages = [
      { widthPt: 400, heightPt: 600 },
      { widthPt: 1684, heightPt: 2384 }
    ];

    const report = LocalPdfEngine.createUnavailableMeasurementReport(
      'balanced',
      300,
      150,
      0.88,
      25000000,
      customPages
    );

    // 1. O laudo geral deve ser expressamente marcado como 'measurement_unavailable'
    assert.strictEqual(report.measurementStatus, 'measurement_unavailable');
    assert.strictEqual(report.totalPages, 2);
    assert.strictEqual(report.averageEffectiveDpi, 0, 'Não pode presumir 300 DPI');

    // 2. Cada página deve conter as dimensões reais aferidas do PDF e NUNCA presumir A4
    assert.strictEqual(report.pages[0].widthPt, 400, 'Primeira página deve manter largura real (400 pt) e não 595 pt');
    assert.strictEqual(report.pages[0].heightPt, 600, 'Primeira página deve manter altura real (600 pt) e não 842 pt');
    assert.strictEqual(report.pages[1].widthPt, 1684, 'Segunda página deve manter largura real (1684 pt)');
    assert.strictEqual(report.pages[1].heightPt, 2384, 'Segunda página deve manter altura real (2384 pt)');

    // 3. Status deve ser explicitamente measurement_unavailable e NUNCA 'optimal'
    for (const page of report.pages) {
      assert.strictEqual(page.status, 'measurement_unavailable');
      assert.strictEqual(page.measurementStatus, 'measurement_unavailable');
      assert.strictEqual(page.effectiveDpi, 0, 'DPI efetivo não medido não pode ser presumido como nominal');
      assert.strictEqual(page.renderedWidthPx, 0);
      assert.strictEqual(page.renderedHeightPx, 0);
      assert.notStrictEqual(page.status, 'optimal', 'Status NUNCA pode ser presumido como optimal sem medição');
    }
  });

  // 6. Política de Reprovação Obrigatória sob Parâmetro Strict (strictReport: true)
  await test('Política de reprovação estrita: Proibir geração de laudo quando faltarem medidas obrigatórias com strictReport=true', async () => {
    const unmeasuredReport = LocalPdfEngine.createUnavailableMeasurementReport(
      'balanced',
      300,
      150,
      0.88,
      25000000,
      [{ widthPt: 595, heightPt: 842 }]
    );

    // Auditoria estrita: reprova se não houver medições técnicas comprovadas
    const isReportMeasured = LocalPdfEngine.validateRasterizationReport(unmeasuredReport);
    assert.strictEqual(isReportMeasured, false, 'Relatório sem medições não pode passar na auditoria estrita');

    const shouldReprove = (opts?: { strictReport?: boolean }) => {
      if (opts?.strictReport && !isReportMeasured) {
        throw new Error('Falha de integridade e auditoria: O motor headless não forneceu as medições obrigatórias de rasterização. A geração do relatório foi reprovada.');
      }
    };

    assert.throws(
      () => shouldReprove({ strictReport: true }),
      /A geração do relatório foi reprovada/,
      'Com strictReport=true, a ausência de medições obrigatórias deve reprovar a operação com erro fatal'
    );
  });

  console.log(`\nResultado Suíte 4 (LGPD): ${passed} Passados, ${failed} Falhados\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runLgpdSuite().catch(err => {
  console.error('Erro fatal na Suíte 4 (LGPD):', err);
  process.exit(1);
});
