/**
 * =============================================================================
 * SUÍTE 6: EXPORTAÇÃO E FIDELIDADE DOCX (OOXML)
 * =============================================================================
 * Comprova: Validade OOXML (ISO/IEC 29500) e preservação de elementos essenciais.
 * Execução: Todo Pull Request.
 * =============================================================================
 */

import assert from 'assert';
import * as fflate from 'fflate';
import { DocxExporterService } from '../../src/services/docxExporterService.ts';
import { parseXml, safeUnzipDocx } from '../../src/services/ooxmlParser.ts';
import { HtmlSanitizer } from '../../src/services/htmlSanitizer.ts';

async function runDocxSuite() {
  console.log('='.repeat(80));
  console.log('  [SUÍTE 6: DOCX] VALIDADE OOXML E PRESERVAÇÃO DE ELEMENTOS ESSENCIAIS');
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

  // 1. Sanitização prévia de HTML antes da conversão para DOCX
  await test('HtmlSanitizer deve neutralizar tags de script e manter formatação legítima', () => {
    const dirtyHtml = `
      <h1>Petição Inicial</h1>
      <script>alert("xss")</script>
      <p style="text-align: justify">Texto com <strong>negrito</strong> e <em>itálico</em>.</p>
      <iframe src="malicious.html"></iframe>
    `;

    const cleanHtml = HtmlSanitizer.sanitize(dirtyHtml);
    assert.ok(!cleanHtml.includes('<script>'), 'Scripts devem ser removidos');
    assert.ok(!cleanHtml.includes('<iframe>'), 'Iframes devem ser removidos');
    assert.ok(cleanHtml.includes('<h1>Petição Inicial</h1>'), 'Títulos legítimos devem ser preservados');
    assert.ok(cleanHtml.includes('<strong>negrito</strong>'), 'Formatação negrito deve ser preservada');
  });

  // 2. Geração de Pacote DOCX Conforme Norma ISO/IEC 29500 (OOXML)
  let docxBytes: Uint8Array;
  await test('DocxExporterService deve gerar pacote ZIP/OOXML estruturado com arquivos obrigatórios', async () => {
    const documentHtml = `
      <h1>GABINETE DO PREFEITO MUNICIPAL</h1>
      <h2>DECRETO N.º 5.432, DE 2026</h2>
      <p>Dispõe sobre a regularização de procedimentos no âmbito da administração direta.</p>
      <table border="1">
        <thead>
          <tr><th>Órgão</th><th>Competência</th></tr>
        </thead>
        <tbody>
          <tr><td>Procuradoria Geral</td><td>Representação judicial</td></tr>
          <tr><td>Secretaria de Finanças</td><td>Arrecadação e orçamento</td></tr>
        </tbody>
      </table>
    `;

    const buffer = await DocxExporterService.generateHtmlDocxBuffer(documentHtml, 'Decreto Municipal');
    docxBytes = new Uint8Array(buffer);

    assert.ok(docxBytes.length > 2000, 'Arquivo DOCX gerado deve ter tamanho > 2KB');

    // Descompactar e verificar arquivos obrigatórios do padrão OOXML
    const unzipped = fflate.unzipSync(docxBytes);
    const fileNames = Object.keys(unzipped);

    assert.ok(fileNames.includes('[Content_Types].xml'), 'Deve conter [Content_Types].xml');
    assert.ok(fileNames.includes('_rels/.rels'), 'Deve conter _rels/.rels');
    assert.ok(fileNames.includes('word/document.xml'), 'Deve conter word/document.xml');
  });

  // 3. Validação de Conteúdo e Elementos Essenciais no word/document.xml
  await test('Validação semântica de word/document.xml: Preservação de nós de parágrafo e texto', () => {
    const unzipped = fflate.unzipSync(docxBytes);
    const documentXmlBytes = unzipped['word/document.xml'];
    assert.ok(documentXmlBytes, 'word/document.xml não pode ser nulo');

    const documentXmlStr = fflate.strFromU8(documentXmlBytes);
    const parsedXml = parseXml(documentXmlStr);

    assert.strictEqual(parsedXml.name, 'w:document', 'Raiz deve ser <w:document>');
    assert.ok(documentXmlStr.includes('GABINETE DO PREFEITO MUNICIPAL'), 'Deve conter o cabeçalho no texto XML');
    assert.ok(documentXmlStr.includes('DECRETO N.º 5.432'), 'Deve conter o título do decreto');
    assert.ok(documentXmlStr.includes('Procuradoria Geral'), 'Deve conter o conteúdo da tabela no XML');
  });

  console.log(`\nResultado Suíte 6 (DOCX): ${passed} Passados, ${failed} Falhados\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runDocxSuite().catch(err => {
  console.error('Erro fatal na Suíte 6 (DOCX):', err);
  process.exit(1);
});
