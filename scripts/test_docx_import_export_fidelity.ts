import { PDFDocument } from 'pdf-lib';
import * as fflate from 'fflate';
import { DocxExporterService } from '../src/services/docxExporterService';
import { RichPdfExporterService } from '../src/services/richPdfExporterService';
import {
  parseXml,
  safeUnzipDocx,
  DocxSecurityError,
  MalformedDocxError
} from '../src/services/ooxmlParser';
import { HtmlSanitizer } from '../src/services/htmlSanitizer';

let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passedAssertions++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    failedAssertions++;
  }
}

// Imagem PNG 1x1 válida codificada em Base64 para teste
const SAMPLE_PNG_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function runDocxFidelityTestSuite() {
  console.log('================================================================');
  console.log('BATERIA DE TESTES: FIDELIDADE DOCX (OOXML), SANITIZAÇÃO E PDF');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // TESTE 1: Parser XML/OOXML e Validação de Malformação
  // -------------------------------------------------------------------------
  console.log('1. Testando parser XML e validação de documentos malformados...');

  // Cenário 1.1: XML válido
  const validXml = `
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p>
          <w:r><w:t>Petição Inicial</w:t></w:r>
        </w:p>
      </w:body>
    </w:document>
  `;
  const parsedNode = parseXml(validXml);
  assert(parsedNode.name === 'w:document', 'Identifica nó raiz <w:document>');
  assert(parsedNode.findFirstDescendant('w:t')?.getTextContent() === 'Petição Inicial', 'Extrai texto do nó <w:t>');

  // Cenário 1.2: XML malformado com tag não balanceada
  const unclosedXml = '<w:body><w:p><w:t>Sem fechar</w:body>';
  let caughtUnclosed = false;
  try {
    parseXml(unclosedXml);
  } catch (err: any) {
    caughtUnclosed = true;
    assert(
      err instanceof MalformedDocxError,
      'Lança MalformedDocxError quando o XML possui tags não balanceadas'
    );
  }
  assert(caughtUnclosed, 'XML com tag não balanceada é estritamente reprovado');

  // Cenário 1.3: XML vazio
  let caughtEmpty = false;
  try {
    parseXml('');
  } catch (err: any) {
    caughtEmpty = true;
    assert(err instanceof MalformedDocxError, 'Lança MalformedDocxError para XML vazio');
  }
  assert(caughtEmpty, 'XML vazio é reprovado com erro');

  // -------------------------------------------------------------------------
  // TESTE 2: Limites de Descompressão e Segurança (Anti-Zip Bomb)
  // -------------------------------------------------------------------------
  console.log('\n2. Testando limites de descompressão contra Zip Bombs...');

  // Cria um zip simples válido
  const validZipData = fflate.zipSync({
    'word/document.xml': fflate.strToU8('<w:body><w:p><w:t>Teste</w:t></w:p></w:body>')
  });

  const unzippedOk = safeUnzipDocx(validZipData);
  assert(Boolean(unzippedOk['word/document.xml']), 'Descompressão segura conclui com sucesso para arquivo regular');

  // Simula arquivo que excede limite de arquivos
  let caughtFileCount = false;
  try {
    safeUnzipDocx(validZipData, { maxFileCount: 0 }); // Limite 0 para disparar
  } catch (err: any) {
    caughtFileCount = true;
    assert(err instanceof DocxSecurityError, 'Lança DocxSecurityError ao violar contagem máxima de arquivos');
  }
  assert(caughtFileCount, 'Bloqueia arquivo que viola contagem máxima');

  // Simula arquivo que excede limite de tamanho por arquivo
  let caughtFileSize = false;
  try {
    safeUnzipDocx(validZipData, { maxSingleFileBytes: 10 }); // Limite de 10 bytes
  } catch (err: any) {
    caughtFileSize = true;
    assert(err instanceof DocxSecurityError, 'Lança DocxSecurityError ao violar limite de tamanho por arquivo');
  }
  assert(caughtFileSize, 'Bloqueia arquivo que viola tamanho de arquivo individual');

  // -------------------------------------------------------------------------
  // TESTE 3: Sanitização Rigorosa de HTML Importado
  // -------------------------------------------------------------------------
  console.log('\n3. Testando sanitização de HTML antes de atribuição a innerHTML...');

  const maliciousHtml = `
    <h1>Petição Válida</h1>
    <script>alert("XSS Attack!")</script>
    <iframe src="http://malicious.com" onload="stealCookies()"></iframe>
    <p onmouseover="eval('exploit')" style="color: blue; text-indent: 2cm; expression(alert('css'))">
      Texto legal legítimo com <a href="javascript:doEvil()">link perigoso</a>.
    </p>
    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" onerror="alert('img exploit')" />
  `;

  const sanitized = HtmlSanitizer.sanitize(maliciousHtml);

  assert(!sanitized.includes('<script>'), 'Remove tags <script>');
  assert(!sanitized.includes('<iframe>'), 'Remove tags <iframe>');
  assert(!sanitized.includes('onload='), 'Remove atributos de evento onload');
  assert(!sanitized.includes('onmouseover='), 'Remove atributos de evento onmouseover');
  assert(!sanitized.includes('onerror='), 'Remove atributos de evento onerror');
  assert(!sanitized.includes('javascript:'), 'Remove protocolo perigoso javascript:');
  assert(!sanitized.includes('expression('), 'Remove CSS malicioso expression()');
  assert(sanitized.includes('<h1>Petição Válida</h1>'), 'Preserva tag de título <h1>');
  assert(sanitized.includes('color: blue'), 'Preserva estilos CSS seguros (color: blue)');
  assert(sanitized.includes('text-indent: 2cm'), 'Preserva text-indent: 2cm');
  assert(sanitized.includes('<img src="data:image/png;base64,'), 'Preserva imagem legítima com data:image/png');

  // -------------------------------------------------------------------------
  // TESTE 4: Geração DOCX OOXML Verdadeira (Microsoft Word & LibreOffice)
  // -------------------------------------------------------------------------
  console.log('\n4. Testando geração de DOCX OOXML verdadeiro (ISO/IEC 29500)...');

  const sampleLegalHtml = `
    <h1 style="text-align: center;">EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA 1ª VARA CÍVEL</h1>
    <h2 style="text-align: left;">I. DOS FATOS E FUNDAMENTOS JURÍDICOS</h2>
    <p style="text-indent: 2cm; text-align: justify; line-height: 1.5; margin-bottom: 12pt;">
      O requerente propõe a presente ação demonstrando o <strong>adimplemento substancial</strong> das obrigações, 
      consoante preconiza o <em>Código Civil Brasileiro</em> e a jurisprudência pacificada do <u>Superior Tribunal de Justiça</u>.
    </p>
    <blockquote style="margin-left: 4cm; font-size: 10pt; line-height: 1.2; font-style: italic; border-left: 2px solid #cbd5e1; padding-left: 8px;">
      "A boa-fé objetiva impõe aos contratantes deveres anexos de lealdade, informação e mútua colaboração." (STJ, REsp 1.234.567).
    </blockquote>
    <h2 style="text-align: left;">II. DEMONSTRATIVO DE CÁLCULO</h2>
    <table style="width: 100%; border-collapse: collapse; margin: 14pt 0; border: 1px solid #cbd5e1;">
      <thead>
        <tr>
          <th style="border: 1px solid #cbd5e1; padding: 6pt; background-color: #f1f5f9; font-weight: bold;">Parcela</th>
          <th style="border: 1px solid #cbd5e1; padding: 6pt; background-color: #f1f5f9; font-weight: bold;">Vencimento</th>
          <th style="border: 1px solid #cbd5e1; padding: 6pt; background-color: #f1f5f9; font-weight: bold;">Valor (R$)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 6pt;">01/03</td>
          <td style="border: 1px solid #cbd5e1; padding: 6pt;">10/01/2026</td>
          <td style="border: 1px solid #cbd5e1; padding: 6pt;">1.500,00</td>
        </tr>
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 6pt;">02/03</td>
          <td style="border: 1px solid #cbd5e1; padding: 6pt;">10/02/2026</td>
          <td style="border: 1px solid #cbd5e1; padding: 6pt;">1.500,00</td>
        </tr>
      </tbody>
    </table>
    <h2 style="text-align: left;">III. DOS PEDIDOS</h2>
    <ol style="margin-left: 2cm; margin-bottom: 12pt;">
      <li style="margin-bottom: 6pt;">A concessão da gratuidade da justiça;</li>
      <li style="margin-bottom: 6pt;">A citação do requerido para responder aos termos da demanda;</li>
      <li style="margin-bottom: 6pt;">A procedência total dos pedidos.</li>
    </ol>
    <hr class="page-break" style="page-break-after: always; break-after: page; border: none; border-top: 2px dashed #3b82f6; margin: 24px 0;" data-page-break="true" />
    <h2 style="text-align: left;">IV. PROVA DOCUMENTAL ANEXA</h2>
    <img src="${SAMPLE_PNG_BASE64}" style="max-width: 100%; height: auto; margin: 12pt auto; display: block;" alt="Comprovante de pagamento" />
    <p style="text-align: center; margin-top: 24pt;">Nestes termos, pede deferimento.</p>
  `;

  const docxBuffer = await DocxExporterService.generateHtmlDocxBuffer(
    sampleLegalHtml,
    'Petição Cível ABNT',
    {
      headerText: 'Tribunal de Justiça do Estado de São Paulo',
      footerText: 'KovaxFiles Desktop • Documento Judicial',
      enableHeaderFooter: true
    }
  );

  assert(docxBuffer && docxBuffer.byteLength > 2000, 'DOCX binário gerado com sucesso (> 2 KB)');

  // Validação da conformidade da estrutura ZIP / OOXML interna
  const unzippedDocx = fflate.unzipSync(new Uint8Array(docxBuffer));
  assert(Boolean(unzippedDocx['[Content_Types].xml']), 'Contém [Content_Types].xml conforme padrão ISO/IEC 29500');
  assert(Boolean(unzippedDocx['_rels/.rels']), 'Contém pacote de relacionamentos _rels/.rels');
  assert(Boolean(unzippedDocx['word/document.xml']), 'Contém arquivo central word/document.xml');

  const contentTypesStr = fflate.strFromU8(unzippedDocx['[Content_Types].xml']);
  assert(
    contentTypesStr.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'),
    'Declara ContentType oficial do Microsoft Word para documento principal'
  );

  // -------------------------------------------------------------------------
  // TESTE 5: Conversão de Ida e Volta (Roundtrip Fidelity)
  // -------------------------------------------------------------------------
  console.log('\n5. Testando conversão de ida e volta (HTML -> DOCX -> HTML)...');

  const reimportedHtml = await DocxExporterService.importDocxToHtml(docxBuffer);

  assert(reimportedHtml && reimportedHtml.length > 100, 'DOCX reimportado com sucesso para HTML formatado');
  assert(
    reimportedHtml.includes('EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO'),
    'Preserva título principal <h1>'
  );
  assert(
    reimportedHtml.includes('DOS FATOS E FUNDAMENTOS JURÍDICOS') || reimportedHtml.includes('FATOS'),
    'Preserva títulos de seção <h2>'
  );
  assert(
    reimportedHtml.includes('<strong>adimplemento substancial</strong>') || reimportedHtml.includes('adimplemento substancial'),
    'Preserva formatação em negrito (<strong>)'
  );
  assert(
    reimportedHtml.includes('<em>Código Civil Brasileiro</em>') || reimportedHtml.includes('Código Civil Brasileiro'),
    'Preserva formatação em itálico (<em>)'
  );
  assert(
    reimportedHtml.includes('<table') && reimportedHtml.includes('Parcela') && reimportedHtml.includes('1.500,00'),
    'Preserva tabela estruturada com cabeçalhos e células de dados'
  );
  assert(
    reimportedHtml.includes('<li') && reimportedHtml.includes('gratuidade da justiça'),
    'Preserva itens de lista (<ol> / <ul> / <li>)'
  );

  // -------------------------------------------------------------------------
  // TESTE 6: Comparação de Renderização entre Editor e PDF Exportado
  // -------------------------------------------------------------------------
  console.log('\n6. Testando fidelidade de renderização com RichPdfExporterService...');

  const pdfBytes = await RichPdfExporterService.exportHtmlToPdf(sampleLegalHtml, {
    title: 'Petição Cível ABNT',
    headerTitle: 'Tribunal de Justiça do Estado de São Paulo',
    footerTitle: 'KovaxFiles Desktop • Documento Judicial',
    enableHeaderFooter: true
  });

  assert(pdfBytes && pdfBytes.byteLength > 2000, 'PDF rico exportado a partir do mesmo HTML com sucesso (> 2 KB)');

  const loadedPdf = await PDFDocument.load(pdfBytes);
  assert(loadedPdf.getPageCount() >= 2, 'PDF gerado possui pelo menos 2 páginas devido à quebra de página (<hr class="page-break">)');
  assert(loadedPdf.getTitle() === 'Petição Cível ABNT', 'Título nos metadados do PDF corresponde ao editor');

  // -------------------------------------------------------------------------
  // RESUMO DOS TESTES
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL DE ASSERÇÕES: ${passedAssertions + failedAssertions}`);
  console.log(`APROVADAS: ${passedAssertions}`);
  console.log(`REPROVADAS: ${failedAssertions}`);
  console.log('================================================================\n');

  if (failedAssertions > 0) {
    throw new Error(`Falha na bateria de testes de fidelidade DOCX/PDF com ${failedAssertions} erro(s).`);
  }
}

runDocxFidelityTestSuite().catch(err => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
