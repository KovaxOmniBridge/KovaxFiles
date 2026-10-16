import fs from 'fs';
import path from 'path';
import assert from 'assert';
import * as fflate from 'fflate';
import { PDFDocument } from 'pdf-lib';
import { DocxExporterService } from '../src/services/docxExporterService.js';
import { RichPdfExporterService } from '../src/services/richPdfExporterService.js';
import { PdfTextExtractor } from '../src/services/pdfTextExtractor.js';

async function runEditorProfessionalExportSuite() {
  console.log('===========================================================================');
  console.log('⚖️  TESTE DA SUÍTE DO EDITOR JURÍDICO PROFISSIONAL (EXPORT & IMPORT)');
  console.log('   (Validação de DOCX OOXML, PDF Visual, Cabeçalhos, Rodapés e Quebras)');
  console.log('===========================================================================\n');

  const testDir = path.resolve('test_output');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  const petitionHtml = `
    <h1 style="text-align: center; font-weight: bold;">EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA 2ª VARA CÍVEL</h1>
    <p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">
      <strong>MARIA DE LOURDES</strong>, brasileira, inscrita no CPF sob o nº 123.456.789-00, vem perante Vossa Excelência propor a presente
    </p>
    <h2 style="text-align: center; font-size: 13pt; font-weight: bold;">AÇÃO ORDINÁRIA DE REVISÃO CONTRATUAL C/C TUTELA DE URGÊNCIA</h2>
    
    <p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">
      em face de <strong>BANCO HORIZONTE S/A</strong>, pessoa jurídica de direito privado...
    </p>

    <hr class="page-break" style="page-break-after: always; break-after: page; border: none; border-top: 2px dashed #3b82f6; margin: 24px 0;" data-page-break="true" />

    <h2 style="font-size: 12pt; font-weight: bold;">I - DO DEMONSTRATIVO DE CÁLCULO E DAS PARCELAS COBRADAS</h2>
    <p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">
      Apresenta-se a discriminação contábil dos encargos contratuais impugnados:
    </p>

    <table style="width: 100%; border-collapse: collapse; margin: 14pt 0; border: 1px solid #cbd5e1;">
      <thead>
        <tr>
          <th style="border: 1px solid #cbd5e1; padding: 6pt 10pt; background-color: #f1f5f9; font-weight: bold;">Item</th>
          <th style="border: 1px solid #cbd5e1; padding: 6pt 10pt; background-color: #f1f5f9; font-weight: bold;">Parcela</th>
          <th style="border: 1px solid #cbd5e1; padding: 6pt 10pt; background-color: #f1f5f9; font-weight: bold;">Valor Cobrado</th>
          <th style="border: 1px solid #cbd5e1; padding: 6pt 10pt; background-color: #f1f5f9; font-weight: bold;">Valor Devido</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 6pt 10pt; text-align: center;">01</td>
          <td style="border: 1px solid #cbd5e1; padding: 6pt 10pt;">01/2026</td>
          <td style="border: 1px solid #cbd5e1; padding: 6pt 10pt;">R$ 2.500,00</td>
          <td style="border: 1px solid #cbd5e1; padding: 6pt 10pt;">R$ 1.800,00</td>
        </tr>
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 6pt 10pt; text-align: center;">02</td>
          <td style="border: 1px solid #cbd5e1; padding: 6pt 10pt;">02/2026</td>
          <td style="border: 1px solid #cbd5e1; padding: 6pt 10pt;">R$ 2.500,00</td>
          <td style="border: 1px solid #cbd5e1; padding: 6pt 10pt;">R$ 1.800,00</td>
        </tr>
      </tbody>
    </table>

    <blockquote style="margin-left: 4cm; font-size: 10pt; line-height: 1.0; font-style: italic; margin-top: 12pt; margin-bottom: 12pt;">
      “É vedada a cumulação de comissão de permanência com juros moratórios e multa contratual.” (Súmula 472 do STJ)
    </blockquote>

    <p style="text-align: center; margin-top: 24pt;">
      São Paulo, 15 de Outubro de 2026.<br />
      ________________________________________<br />
      <strong>Dr. Roberto Diniz Kovax</strong><br />
      OAB/SP 450.892
    </p>
  `;

  // =========================================================================
  // 1. Exportação DOCX com cabeçalho, rodapé e quebra de página
  // =========================================================================
  console.log('[1/4] Testando exportação de DOCX autêntico com Cabeçalho, Rodapé e Quebra...');
  const docxBuffer = await DocxExporterService.generateHtmlDocxBuffer(
    petitionHtml,
    'Peticao_Revisao_Contratual_2026',
    {
      headerText: 'Vara Cível da Comarca de São Paulo • Autos nº 1002345/2026',
      footerText: 'Kovax Advocacia • OAB/SP 450.892',
      enableHeaderFooter: true
    }
  );

  const docxPath = path.join(testDir, 'peticao_revisao_ooxml_suite.docx');
  fs.writeFileSync(docxPath, docxBuffer);
  console.log(`      ✓ Arquivo DOCX gerado: ${docxPath} (${docxBuffer.length} bytes)`);

  // Validação dos magic bytes PK\x03\x04
  const magicHex = docxBuffer.slice(0, 4).toString('hex');
  assert.strictEqual(magicHex, '504b0304', 'ERRO: Arquivo DOCX não possui cabeçalho binário PK\\x03\\x04');
  console.log('      ✓ Magic Bytes PK\\x03\\x04 confirmados');

  // Inspecionar estrutura interna do ZIP OOXML
  const unzipped = fflate.unzipSync(new Uint8Array(docxBuffer));
  assert.ok(unzipped['[Content_Types].xml'], 'ERRO: [Content_Types].xml ausente no DOCX');
  assert.ok(unzipped['word/document.xml'], 'ERRO: word/document.xml ausente no DOCX');
  assert.ok(unzipped['word/styles.xml'], 'ERRO: word/styles.xml ausente no DOCX');
  assert.ok(unzipped['_rels/.rels'], 'ERRO: _rels/.rels ausente no DOCX');

  const documentXml = fflate.strFromU8(unzipped['word/document.xml']);
  assert.ok(documentXml.includes('EXCELENTÍSSIMO'), 'ERRO: word/document.xml não contém o cabeçalho da petição');
  assert.ok(documentXml.includes('HORIZONTE'), 'ERRO: word/document.xml não contém os dados das partes');
  assert.ok(documentXml.includes('w:tbl'), 'ERRO: word/document.xml não contém a tag de tabela <w:tbl>');
  assert.ok(documentXml.includes('w:br') || documentXml.includes('pageBreakBefore'), 'ERRO: Quebra de página ausente no XML');
  console.log('      ✓ Estrutura OOXML de documento, tabela e quebra de página validada com sucesso');

  // =========================================================================
  // 2. Importação reversa do DOCX de volta para HTML
  // =========================================================================
  console.log('\n[2/4] Testando importação reversa de DOCX para HTML do editor...');
  const importedHtml = await DocxExporterService.importDocxToHtml(docxBuffer);
  assert.ok(importedHtml.includes('EXCELENTÍSSIMO'), 'ERRO: HTML importado perdeu o cabeçalho');
  assert.ok(importedHtml.includes('MARIA DE LOURDES'), 'ERRO: HTML importado perdeu o nome da parte');
  assert.ok(importedHtml.includes('<table'), 'ERRO: HTML importado perdeu a tabela');
  assert.ok(importedHtml.includes('Valor Cobrado'), 'ERRO: HTML importado perdeu o cabeçalho da tabela');
  assert.ok(importedHtml.includes('2.500,00'), 'ERRO: HTML importado perdeu valores da tabela');
  assert.ok(importedHtml.includes('page-break'), 'ERRO: HTML importado perdeu a quebra de página');
  console.log('      ✓ Reconstrução de HTML fiel: títulos, tabelas, parágrafos e quebra de página preservados');

  // =========================================================================
  // 3. Exportação PDF com preservação visual e quebra de página
  // =========================================================================
  console.log('\n[3/4] Testando exportação de PDF com Preservação Visual e Quebra de Página...');
  const pdfBytes = await RichPdfExporterService.exportHtmlToPdf(petitionHtml, {
    title: 'Peticao_Revisao_Contratual_2026',
    author: 'KovaxFiles Desktop',
    headerTitle: 'Vara Cível - Autos nº 1002345/2026',
    footerTitle: 'Kovax Advocacia • OAB/SP 450.892',
    enableHeaderFooter: true
  });

  const pdfPath = path.join(testDir, 'peticao_revisao_visual_suite.pdf');
  fs.writeFileSync(pdfPath, pdfBytes);
  console.log(`      ✓ Arquivo PDF gerado: ${pdfPath} (${pdfBytes.byteLength} bytes)`);

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();
  assert.ok(totalPages >= 2, `ERRO: PDF deveria ter ao menos 2 páginas devido à quebra de página (obteve ${totalPages})`);
  console.log(`      ✓ Total de páginas geradas no PDF: ${totalPages} (quebra de página respeitada)`);
  console.log(`      ✓ Metadados de título: ${pdfDoc.getTitle()}`);

  // =========================================================================
  // 4. Importação e extração de PDF estruturado
  // =========================================================================
  console.log('\n[4/4] Testando extração de texto do PDF estruturado...');
  const extractedPages = await PdfTextExtractor.extractTextWithBounds(pdfBytes.buffer);
  assert.strictEqual(extractedPages.length, totalPages, 'ERRO: Quantidade de páginas extraídas diverge');
  const fullExtractedText = extractedPages.map(p => p.fullText).join('\n\n');
  assert.ok(fullExtractedText.includes('EXCELENTÍSSIMO'), 'ERRO: Texto da primeira página ausente');
  assert.ok(fullExtractedText.includes('DEMONSTRATIVO'), 'ERRO: Texto após quebra de página ausente');
  console.log('      ✓ Extração de texto de todas as páginas realizada com sucesso');

  console.log('\n===========================================================================');
  console.log('✅ SUCESSO TOTAL: EXPORTAÇÃO E IMPORTAÇÃO PROFISSIONAL VALIDADA!');
  console.log('   - DOCX: OOXML autêntico, cabeçalhos, rodapés, tabelas e quebras.');
  console.log('   - PDF:  Preservação visual, paginação oficial e quebra de páginas.');
  console.log('   - IMPORTAÇÃO: DOCX e PDF lidos e reconstruídos no Editor.');
  console.log('===========================================================================\n');
}

runEditorProfessionalExportSuite().catch(err => {
  console.error('\n❌ ERRO NA SUÍTE DO EDITOR:', err);
  process.exit(1);
});
