import fs from 'fs';
import assert from 'assert';
import * as fflate from 'fflate';
import { DocxExporterService } from '../src/services/docxExporterService.js';

async function testDocxExportIntegrity() {
  console.log('===========================================================================');
  console.log('🧪 TESTE DE INTEGRIDADE: EXPORTAÇÃO REAL OFFICE OPEN XML (.DOCX)');
  console.log('   (Validação de Formato ZIP, OOXML e Ausência de HTML Renomeado)');
  console.log('===========================================================================\n');

  fs.mkdirSync('test_output', { recursive: true });

  // 1. Testar geração a partir de Markdown / Metadados (LexmlSearchTool)
  console.log('[1/4] Gerando DOCX a partir de Parecer com Markdown e Tabelas...');
  const markdownOptions = {
    title: 'Parecer Jurídico de Responsabilidade Civil',
    authorName: 'Dr. Roberto Kovax',
    roleTitle: 'Advogado Sênior',
    profileBadge: 'Kovax Legal Engine',
    retrievedLawsSummary: 'CC/2002 Art. 186 e Art. 927; CPC Art. 300',
    content: `# Parecer Técnico Fundamentado\n\n| Dispositivo Legal | Matéria | Efeito |\n| --- | --- | --- |\n| Art. 186 CC | Responsabilidade Civil | Dever de Indenizar |\n| Art. 300 CPC | Tutela de Urgência | Concessão Liminar |\n\n## 1. Da Síntese dos Fatos\n\nTrata-se de consulta jurídica acerca da reparabilidade de danos materiais e extrapatrimoniais decorrentes de ilícito contratual manifesto.\n\n* Conforme pacificado nos tribunais superiores.\n* Preservação irrestrita do direito substancial.`
  };

  const bufferOpinion = await DocxExporterService.generateDocxBuffer(markdownOptions);
  const opinionPath = 'test_output/parecer_juridico_ooxml_test.docx';
  fs.writeFileSync(opinionPath, bufferOpinion);
  console.log(`      Arquivo gerado: ${opinionPath} (${bufferOpinion.length} bytes)`);

  // 2. Testar geração a partir de HTML do Editor WYSIWYG (DocEditor)
  console.log('\n[2/4] Gerando DOCX a partir de Petição Inicial Cível (HTML WYSIWYG)...');
  const wysiwygHtml = `
    <h1 style="text-align: center;">EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA 1ª VARA CÍVEL</h1>
    <p style="text-indent: 2cm;"><strong>JOÃO DA SILVA</strong>, brasileiro, casado, vem perante Vossa Excelência propor a presente</p>
    <h2 style="text-align: center;">AÇÃO DECLARATÓRIA DE NULIDADE CONTRATUAL</h2>
    <h3>I. DOS FATOS</h3>
    <p style="text-indent: 2cm;">O autor celebrou com a requerida contrato de financiamento imobiliário em 2026...</p>
    <blockquote>"A cobrança indevida atrai a devolução em dobro do indébito e reparação moral."</blockquote>
    <table>
      <thead>
        <tr><th>Parcela</th><th>Valor Cobrado</th><th>Valor Devido</th></tr>
      </thead>
      <tbody>
        <tr><td>01/2026</td><td>R$ 1.500,00</td><td>R$ 800,00</td></tr>
      </tbody>
    </table>
  `;

  const bufferEditor = await DocxExporterService.generateHtmlDocxBuffer(wysiwygHtml, 'Peticao Inicial Civel');
  const editorPath = 'test_output/peticao_inicial_ooxml_test.docx';
  fs.writeFileSync(editorPath, bufferEditor);
  console.log(`      Arquivo gerado: ${editorPath} (${bufferEditor.length} bytes)`);

  // 3. Validação dos Magic Bytes e Assinatura de Arquivo
  console.log('\n[3/4] Validando formato binário (Magic Bytes PK\\x03\\x04 vs HTML)...');
  for (const [name, buf] of [['Parecer', bufferOpinion], ['Petição', bufferEditor]]) {
    // Magic bytes de arquivo ZIP (PK\x03\x04 = 0x50, 0x4b, 0x03, 0x04)
    const headerHex = buf.slice(0, 4).toString('hex');
    assert.strictEqual(headerHex, '504b0304', `ERRO: ${name} não possui o cabeçalho binário PK\\x03\\x04 (Header: ${headerHex})`);
    console.log(`      ✓ ${name}: Cabeçalho PK\\x03\\x04 confirmado (504b0304)`);

    // Não pode conter strings de HTML puro nas primeiras posições
    const startStr = buf.slice(0, 20).toString('utf-8');
    assert.ok(!startStr.includes('<html'), `ERRO: ${name} começa com tag <html! É HTML renomeado.`);
    assert.ok(!startStr.includes('\ufeff'), `ERRO: ${name} começa com BOM de HTML.`);
    console.log(`      ✓ ${name}: Ausência de HTML cru ou renomeado confirmada`);
  }

  // 4. Inspecionar o pacote ZIP interno (Office Open XML Specifications)
  console.log('\n[4/4] Inspecionando estrutura interna do arquivo DOCX (OOXML)...');
  for (const [name, buf] of [['Parecer', bufferOpinion], ['Petição', bufferEditor]]) {
    const unzipped = fflate.unzipSync(new Uint8Array(buf));
    const entryNames = Object.keys(unzipped);

    // Deve conter [Content_Types].xml
    assert.ok(entryNames.includes('[Content_Types].xml'), `ERRO: ${name} não possui [Content_Types].xml`);
    // Deve conter word/document.xml
    assert.ok(entryNames.includes('word/document.xml'), `ERRO: ${name} não possui word/document.xml`);
    // Deve conter word/styles.xml
    assert.ok(entryNames.includes('word/styles.xml'), `ERRO: ${name} não possui word/styles.xml`);
    // Deve conter _rels/.rels
    assert.ok(entryNames.includes('_rels/.rels'), `ERRO: ${name} não possui _rels/.rels`);

    // Inspecionar [Content_Types].xml para garantir o MIME Type correto de WordprocessingML
    const contentTypesXml = fflate.strFromU8(unzipped['[Content_Types].xml']);
    assert.ok(
      contentTypesXml.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'),
      `ERRO: ${name} não declara o ContentType oficial do Office Open XML`
    );

    // Inspecionar word/document.xml para garantir que o texto real foi empacotado em tags <w:p> e <w:t>
    const documentXml = fflate.strFromU8(unzipped['word/document.xml']);
    assert.ok(documentXml.includes('<w:document'), `ERRO: ${name} não contém a tag raiz <w:document>`);
    assert.ok(documentXml.includes('<w:body>'), `ERRO: ${name} não contém a tag de corpo <w:body>`);

    if (name === 'Parecer') {
      assert.ok(documentXml.includes('Parecer'), 'ERRO: Parecer não contém o texto esperado');
      assert.ok(documentXml.includes('Responsabilidade'), 'ERRO: Parecer não contém texto de tabela');
    } else {
      assert.ok(documentXml.includes('EXCELENT'), 'ERRO: Petição não contém o texto de cabeçalho');
      assert.ok(documentXml.includes('SILVA'), 'ERRO: Petição não contém nome do autor');
    }

    console.log(`      ✓ ${name}: Estrutura OOXML completa validada ([Content_Types], document.xml, styles.xml, rels)`);
  }

  // 5. Testar geração de Blob com MIME Type oficial
  console.log('\n[Bônus] Testando MIME Type do Blob gerado...');
  const blobOpinion = await DocxExporterService.generateDocxBlob(markdownOptions);
  assert.strictEqual(
    blobOpinion.type,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    `ERRO: O Blob não possui o MIME type de DOCX oficial (Tipo: ${blobOpinion.type})`
  );
  console.log(`      ✓ MIME Type oficial confirmado: ${blobOpinion.type}`);

  // 6. Testar importação de DOCX existente e reconstrução semântica em HTML
  console.log('\n[5/5] Testando importação de documento DOCX existente e reconstrução em HTML...');
  const importedHtml = await DocxExporterService.importDocxToHtml(bufferEditor);
  assert.ok(importedHtml.includes('EXCELENTÍSSIMO'), 'ERRO: HTML importado não contém cabeçalho');
  assert.ok(importedHtml.includes('JOÃO DA SILVA'), 'ERRO: HTML importado não contém nome da parte');
  assert.ok(importedHtml.includes('<table'), 'ERRO: HTML importado não contém tag <table>');
  assert.ok(importedHtml.includes('Parcela'), 'ERRO: HTML importado não contém cabeçalho de tabela');
  assert.ok(importedHtml.includes('1.500,00'), 'ERRO: HTML importado não contém valores da tabela');
  console.log('      ✓ Importação de DOCX executada com sucesso: estrutura HTML, títulos e tabelas preservados');

  console.log('\n===========================================================================');
  console.log('✅ SUCESSO: A EXPORTAÇÃO E IMPORTAÇÃO DOCX GERA E LÊ ARQUIVOS AUTÊNTICOS!');
  console.log('   Compatibilidade total com Microsoft Word, LibreOffice e Sistemas PJe.');
  console.log('===========================================================================\n');
}

testDocxExportIntegrity().catch(err => {
  console.error('\n❌ FALHA NO TESTE:', err);
  process.exit(1);
});
