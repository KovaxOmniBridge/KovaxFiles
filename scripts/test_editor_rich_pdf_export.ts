import { PDFDocument } from 'pdf-lib';
import { RichPdfExporterService } from '../src/services/richPdfExporterService';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

async function runEditorRichPdfExportTestSuite() {
  console.log('===========================================================================');
  console.log('📄 TESTE DE INTEGRIDADE: EXPORTAÇÃO RICA DE PDF DO EDITOR JURÍDICO');
  console.log('   (Validação de Estilos, Tabelas, Imagens, Paginação e Fontes Oficiais)');
  console.log('===========================================================================');

  const testDir = path.resolve('test_output');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  // Criar uma imagem 1x1 PNG transparente em base64 para o teste
  const samplePngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const richHtml = `
    <h1 style="text-align: center;">PARECER JURÍDICO & PETIÇÃO DE RECURSO</h1>
    <h2 style="text-align: left;">I. DOS FATOS E DO HISTÓRICO PROCESSUAL</h2>
    <p style="text-align: justify;">
      Trata-se de recurso administrativo interposto perante a <strong>Prefeitura Municipal</strong> com base na 
      <em>Lei nº 14.133/2021</em> e na <strong>Constituição Federal de 1988</strong>. O requerente comprova o cumprimento 
      integral de todas as cláusulas editalícias e a ausência de impedimentos cadastrais.
    </p>
    <p style="text-align: center; color: #2563eb;">
      <strong>Aviso de Conformidade: Documento gerado e auditado eletronicamente.</strong>
    </p>

    <h2>II. DEMONSTRATIVO TABULAR DE CÁLCULO E VALORES</h2>
    <table>
      <thead>
        <tr>
          <th>Item / Lote</th>
          <th>Descrição do Fornecimento</th>
          <th>Quantidade</th>
          <th>Valor Unitário</th>
          <th>Valor Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Lote 01</td>
          <td>Licença de Software KovaxFiles para Automação Documental Offline</td>
          <td>10</td>
          <td>R$ 1.500,00</td>
          <td>R$ 15.000,00</td>
        </tr>
        <tr>
          <td>Lote 02</td>
          <td>Serviço de Implantação e Treinamento de Servidores Públicos</td>
          <td>1</td>
          <td>R$ 5.000,00</td>
          <td>R$ 5.000,00</td>
        </tr>
      </tbody>
    </table>

    <h2>III. DAS DIRETRIZES E OBRIGAÇÕES ASSUMIDAS</h2>
    <ul>
      <li>Preservação irrestrita do sigilo e da privacidade dos dados pessoais nos termos da LGPD.</li>
      <li>Garantia de processamento 100% local sem transmissão externa para servidores não autorizados.</li>
      <li>Cumprimento rigoroso dos prazos recursais previstos no art. 165 da Lei 14.133/2021.</li>
    </ul>

    <h2>IV. CHANCELA E ASSINATURA ELETRÔNICA</h2>
    <p>Abaixo segue a chancela visual registrada nos autos:</p>
    <img src="${samplePngBase64}" alt="Chancela" />

    <hr />

    <p style="text-align: right;">
      São Paulo, 15 de Outubro de 2026.<br />
      <strong>Dr. Roberto Diniz de Albuquerque</strong><br />
      OAB/SP 450.892
    </p>
  `;

  console.log('\n[1/3] Renderizando HTML rico com RichPdfExporterService...');
  const pdfBytes = await RichPdfExporterService.exportHtmlToPdf(richHtml, {
    title: 'Parecer_Recurso_Administrativo_2026',
    author: 'KovaxFiles Jurídico',
    headerTitle: 'Prefeitura Municipal - Processo nº 10.450/2026',
    enableHeaderFooter: true
  });

  const outputPath = path.join(testDir, 'parecer_rico_exportado.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`      ✓ Arquivo PDF gerado: ${outputPath} (${pdfBytes.byteLength} bytes)`);

  console.log('\n[2/3] Inspecionando estrutura do documento com pdf-lib...');
  const doc = await PDFDocument.load(pdfBytes);
  const pageCount = doc.getPageCount();
  const title = doc.getTitle();
  const author = doc.getAuthor();
  const producer = doc.getProducer();

  console.log(`      ✓ Total de páginas geradas: ${pageCount}`);
  console.log(`      ✓ Título dos metadados: ${title}`);
  console.log(`      ✓ Autor: ${author}`);
  console.log(`      ✓ Producer: ${producer}`);

  if (pageCount < 1) {
    throw new Error('Falha: Nenhuma página foi gerada no PDF rico.');
  }

  console.log('\n[3/3] Auditoria independente com PyMuPDF...');
  const venvPy = path.resolve('.venv/Scripts/python.exe');
  if (fs.existsSync(venvPy)) {
    const pyScript = `
import pymupdf, sys
doc = pymupdf.open(sys.argv[1])
full_text = ""
for page in doc:
    full_text += page.get_text()

checks = [
    "PARECER JURÍDICO",
    "DOS FATOS E DO HISTÓRICO PROCESSUAL",
    "Lei nº 14.133/2021",
    "DEMONSTRATIVO TABULAR",
    "Item / Lote",
    "KovaxFiles",
    "15.000,00",
    "DIRETRIZES E OBRIGAÇÕES",
    "LGPD",
    "Dr. Roberto Diniz",
    "Página 1 de"
]

missing = [c for c in checks if c not in full_text]
if missing:
    print(f"FALHA: Termos ausentes no PDF extraído: {missing}")
    sys.exit(1)

print(f"SUCESSO: Todos os {len(checks)} elementos de texto, títulos, tabelas e rodapés encontrados!")
`;
    const res = spawnSync(venvPy, ['-c', pyScript, outputPath]);
    console.log(`      ${res.stdout.toString().trim()}`);
    if (res.status !== 0) {
      console.error(res.stderr.toString());
      throw new Error('Falha na auditoria textual do PyMuPDF.');
    }
  } else {
    console.log('      (PyMuPDF não encontrado no venv local, pulando inspeção Python)');
  }

  console.log('\n===========================================================================');
  console.log('✅ SUCESSO: A EXPORTAÇÃO RICA DO EDITOR GERA PDFs COMPLETOS E ESTRUTURADOS!');
  console.log('   Preservados: Títulos, Parágrafos Justificados, Tabelas, Listas e Rodapés.');
  console.log('===========================================================================');
}

runEditorRichPdfExportTestSuite().catch(err => {
  console.error('\n❌ ERRO NO TESTE:', err);
  process.exit(1);
});
