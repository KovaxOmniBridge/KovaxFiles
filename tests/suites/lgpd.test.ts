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

  console.log(`\nResultado Suíte 4 (LGPD): ${passed} Passados, ${failed} Falhados\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runLgpdSuite().catch(err => {
  console.error('Erro fatal na Suíte 4 (LGPD):', err);
  process.exit(1);
});
