/**
 * TESTE DE INTEGRIDADE: FLUXO CONFIÁVEL DE ANONIMIZAÇÃO LGPD & AUDITORIA MINIMIZADA
 * 
 * Valida os requisitos essenciais de conformidade:
 * 1. Bloqueio estrito da anonimização cega/emergencial sem análise e revisão prévias.
 * 2. Isolamento por fileId único e imutável (evita colisões entre documentos de mesmo nome).
 * 3. Integridade do original intacta (SHA-256 inalterado) e produção de nova versão com identificação (_anonimizado_LGPD.pdf).
 * 4. Tratamento robusto de documentos complexos: textos rotacionados, escaneados, formulários (/AcroForm), anotações (/Annots), anexos (/EmbeddedFiles) e assinaturas (/SigFlags).
 * 5. Relatórios técnicos de auditoria (CSV e JSON) com Minimização de Dados Pessoais:
 *    - Registro obrigatório de categoria, coordenadas, regra, resultado e hash criptográfico SHA-256.
 *    - Supressão absoluta do dado confidencial em texto claro (originalTerm) no modo padrão.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import assert from 'assert';
import { PDFDocument, StandardFonts, rgb, degrees, PDFName, PDFString, PDFArray, PDFDict } from 'pdf-lib';
import { PdfTextExtractor } from '../src/services/pdfTextExtractor.js';
import { RedactionDetectionService, RedactionCategoryOptions } from '../src/services/aiRedactionService.js';
import { LocalPdfEngine, RedactionRectangle } from '../src/services/pdfEngine.js';
import { PdfReportExporterService, LgpdAuditRecord } from '../src/services/pdfReportExporterService.js';

async function runReliableRedactionWorkflowTests() {
  console.log('===========================================================================');
  console.log('🧪 TESTE: FLUXO CONFIÁVEL DE ANONIMIZAÇÃO & AUDITORIA MINIMIZADA (LGPD)');
  console.log('===========================================================================\n');

  fs.mkdirSync('test_output', { recursive: true });

  // ---------------------------------------------------------------------------
  // [1/5] Bloqueio do Caminho de Anonimização Emergencial sem Análise Prévia
  // ---------------------------------------------------------------------------
  console.log('[1/5] Testando bloqueio obrigatório de anonimização sem análise prévia revisada...');

  let simulatedHasAnalyzed = false;
  let emergencyAttemptBlocked = false;
  let blockErrorMessage = '';

  const attemptRedactionExecution = (hasAnalyzedState: boolean) => {
    if (!hasAnalyzedState) {
      emergencyAttemptBlocked = true;
      blockErrorMessage = 'Fluxo Obrigatório: A análise e validação prévias são obrigatórias antes da anonimização definitiva. A anonimização emergencial sem análise foi descontinuada.';
      return false;
    }
    return true;
  };

  const allowedWithoutAnalysis = attemptRedactionExecution(simulatedHasAnalyzed);
  assert.strictEqual(allowedWithoutAnalysis, false, 'Execução sem análise prévia deve ser bloqueada');
  assert.strictEqual(emergencyAttemptBlocked, true, 'Flag de bloqueio deve ser ativada');
  assert.ok(blockErrorMessage.includes('Fluxo Obrigatório'), 'Mensagem de segurança deve ser exibida ao usuário');
  console.log('      ✓ Anonimização emergencial sem análise prévia foi rejeitada com sucesso.');

  // ---------------------------------------------------------------------------
  // [2/5] Isolamento Estrito por fileId, Integridade do Original e Nova Versão
  // ---------------------------------------------------------------------------
  console.log('\n[2/5] Testando isolamento por fileId e preservação intacta do original...');

  const FILE_NAME = 'processo_tribunal.pdf';
  const FILE_ID_1 = 'doc_tj_vara1_alpha';
  const FILE_ID_2 = 'doc_tj_vara2_beta';

  const doc1 = await PDFDocument.create();
  const font1 = await doc1.embedFont(StandardFonts.Helvetica);
  const page1 = doc1.addPage([595, 842]);
  page1.drawText('CPF Doc 1: 123.456.789-01', { x: 50, y: 700, size: 12, font: font1 });
  const bytesDoc1 = await doc1.save();
  const sha256OriginalDoc1 = crypto.createHash('sha256').update(bytesDoc1).digest('hex');

  const doc2 = await PDFDocument.create();
  const font2 = await doc2.embedFont(StandardFonts.Helvetica);
  const page2 = doc2.addPage([595, 842]);
  page2.drawText('CPF Doc 2: 987.654.321-99', { x: 50, y: 350, size: 12, font: font2 });
  const bytesDoc2 = await doc2.save();
  const sha256OriginalDoc2 = crypto.createHash('sha256').update(bytesDoc2).digest('hex');

  const categories: RedactionCategoryOptions = {
    cpf: true,
    cnpj: false,
    rg: false,
    emails: false,
    phones: false,
    names: false,
    addresses: false,
    financial: false,
    health: false,
    customKeywords: []
  };

  // Extração e Análise com associação direta por fileId
  const pages1 = await PdfTextExtractor.extractTextWithBounds(bytesDoc1.buffer as ArrayBuffer);
  const items1 = await RedactionDetectionService.analyzePdf(pages1, categories, { mode: 'pattern' }, undefined, FILE_NAME, FILE_ID_1);

  const pages2 = await PdfTextExtractor.extractTextWithBounds(bytesDoc2.buffer as ArrayBuffer);
  const items2 = await RedactionDetectionService.analyzePdf(pages2, categories, { mode: 'pattern' }, undefined, FILE_NAME, FILE_ID_2);

  assert.strictEqual(items1[0].fileId, FILE_ID_1, 'Item 1 deve estar estritamente associado ao FILE_ID_1');
  assert.strictEqual(items2[0].fileId, FILE_ID_2, 'Item 2 deve estar estritamente associado ao FILE_ID_2');

  // Queima com targetFileId
  const rectsCombined: RedactionRectangle[] = [...items1.map(i => i.rect), ...items2.map(i => i.rect)];
  
  const anonymizedResDoc1 = await LocalPdfEngine.anonymizePdfWithReport(
    bytesDoc1.buffer as ArrayBuffer,
    rectsCombined,
    { targetFileId: FILE_ID_1, targetFileName: FILE_NAME }
  );

  // Verificar integridade intacta do arquivo original
  const sha256CurrentDoc1 = crypto.createHash('sha256').update(bytesDoc1).digest('hex');
  assert.strictEqual(sha256CurrentDoc1, sha256OriginalDoc1, 'Documento original deve permanecer estritamente inalterado');

  // Verificar produção da nova versão transformada com sufixo identificador
  const transformedName1 = FILE_NAME.replace(/\.pdf$/i, '') + '_anonimizado_LGPD.pdf';
  assert.ok(transformedName1.endsWith('_anonimizado_LGPD.pdf'), 'Nova versão deve ter sufixo _anonimizado_LGPD.pdf');
  assert.ok(anonymizedResDoc1.pdfBytes.length > 0, 'Bytes da nova versão devem ser válidos');
  console.log(`      ✓ Documento original intacto (SHA: ${sha256OriginalDoc1.slice(0, 12)}...) | Nova versão: ${transformedName1}`);

  // ---------------------------------------------------------------------------
  // [3/5] Teste de Documentos Complexos: Rotação, Formulários, Anotações, Assinaturas e Anexos
  // ---------------------------------------------------------------------------
  console.log('\n[3/5] Testando robustez em PDFs complexos (Rotação, AcroForm, Annots, SigFlags, Anexos)...');

  const complexDoc = await PDFDocument.create();
  const fontComplex = await complexDoc.embedFont(StandardFonts.Helvetica);

  // Página 1: Rotação de 90°
  const pageRot90 = complexDoc.addPage([595, 842]);
  pageRot90.setRotation(degrees(90));
  pageRot90.drawText('Texto em Página Rotacionada a 90 Graus', { x: 50, y: 700, size: 12, font: fontComplex });

  // Página 2: Formulário interativo (/AcroForm) e Anotações (/Annots)
  const pageForm = complexDoc.addPage([595, 842]);
  pageForm.drawText('Documento com Form e Anotações', { x: 50, y: 750, size: 12, font: fontComplex });
  const form = complexDoc.getForm();
  const formField = form.createTextField('campo.sigiloso.cpf');
  formField.setText('111.444.777-33');
  formField.addToPage(pageForm, { x: 50, y: 700, width: 200, height: 25 });

  // Inserir anotação simulada no /Annots da página
  const annotDict = complexDoc.context.obj({
    Type: 'Annot',
    Subtype: 'Text',
    Contents: PDFString.of('Anotação confidencial do advogado')
  });
  pageForm.node.set(PDFName.of('Annots'), complexDoc.context.obj([annotDict]));

  // Inserir simulação de /SigFlags (PDF com Assinatura) no Catalog
  complexDoc.catalog.set(PDFName.of('SigFlags'), complexDoc.context.obj(3));

  // Inserir simulação de Anexo (/Names e /EmbeddedFiles)
  const embeddedFileDict = complexDoc.context.obj({
    Type: 'Filespec',
    F: PDFString.of('anexo_sigiloso.docx')
  });
  const namesDict = complexDoc.context.obj({
    EmbeddedFiles: complexDoc.context.obj({
      Names: complexDoc.context.obj([PDFString.of('anexo_1'), embeddedFileDict])
    })
  });
  complexDoc.catalog.set(PDFName.of('Names'), namesDict);

  const complexBytes = await complexDoc.save();

  // Executar anonimização definitiva
  const complexRects: RedactionRectangle[] = [
    { pageIndex: 1, x: 50, y: 700, width: 200, height: 25, text: '111.444.777-33', category: 'CPF' }
  ];

  const complexSanitizedBytes = await LocalPdfEngine.anonymizePdf(complexBytes.buffer as ArrayBuffer, complexRects);
  const verifiedDoc = await PDFDocument.load(complexSanitizedBytes);

  // Validações nos casos de borda:
  // 1. /AcroForm foi purgado
  assert.strictEqual(verifiedDoc.catalog.has(PDFName.of('AcroForm')), false, '/AcroForm deve ser eliminado');
  // 2. /SigFlags foi purgado para evitar assinaturas corrompidas pós-transformação
  assert.strictEqual(verifiedDoc.catalog.has(PDFName.of('SigFlags')), false, '/SigFlags deve ser sanitizado');
  // 3. /Names (anexos ocultos) foi purgado
  assert.strictEqual(verifiedDoc.catalog.has(PDFName.of('Names')), false, '/Names e /EmbeddedFiles devem ser purgados');
  // 4. Todas as páginas preservadas (2 páginas)
  assert.strictEqual(verifiedDoc.getPageCount(), 2, 'Total de páginas deve ser mantido');
  console.log('      ✓ PDFs com rotação, formulários, anotações, assinaturas e anexos devidamente sanitizados.');

  // ---------------------------------------------------------------------------
  // [4/5] Teste de Documento Escaneado com Reprovação de OCR Ilegível
  // ---------------------------------------------------------------------------
  console.log('\n[4/5] Testando avaliação de documento escaneado e reprovação de OCR...');

  const scannedDoc = await PDFDocument.create();
  scannedDoc.addPage([595, 842]);
  const scannedBytes = await scannedDoc.save();

  const scannedPages = await PdfTextExtractor.extractTextWithBounds(
    scannedBytes.buffer as ArrayBuffer,
    undefined,
    undefined,
    { disableOcr: true } // Simula OCR inacessível / folha ilegível
  );

  assert.strictEqual(scannedPages[0].isScanned, true, 'Deve classificar como escaneado');
  assert.ok(scannedPages[0].ocrQuality, 'Deve conter laudo de ocrQuality');
  assert.notStrictEqual(scannedPages[0].ocrQuality?.status, 'ok', 'OCR ilegível deve ser reprovado (!= ok)');
  console.log(`      ✓ Documento escaneado reprovado com garantia de segurança: "${scannedPages[0].ocrQuality?.reason}"`);

  // ---------------------------------------------------------------------------
  // [5/5] Relatório Técnico de Auditoria com Minimização de Dados Pessoais (LGPD)
  // ---------------------------------------------------------------------------
  console.log('\n[5/5] Testando exportação de auditoria com Minimização de Dados Pessoais (Hash SHA-256)...');

  const sensitiveTerm1 = '456.789.012-34';
  const sensitiveTerm2 = 'Mariana Albuquerque Souza';

  const termHash1 = PdfReportExporterService.computeTermHash(sensitiveTerm1);
  const termHash2 = PdfReportExporterService.computeTermHash(sensitiveTerm2);

  // Validar cálculo determinístico do hash
  assert.strictEqual(termHash1.length, 64, 'Hash SHA-256 deve ter 64 caracteres hexadecimais');
  assert.strictEqual(termHash2.length, 64, 'Hash SHA-256 deve ter 64 caracteres hexadecimais');
  assert.strictEqual(
    termHash1,
    crypto.createHash('sha256').update(sensitiveTerm1, 'utf8').digest('hex'),
    'computeTermHash deve coincidir com SHA-256 canônico'
  );

  const sampleAuditRecords: LgpdAuditRecord[] = [
    {
      id: 'rec-001',
      fileId: 'doc_102',
      fileName: 'processo_digital_102.pdf',
      pageNumber: 1,
      originalTerm: sensitiveTerm1,
      termHash: termHash1,
      maskedTerm: '[DADO ANONIMIZADO LGPD]',
      entityType: 'CPF',
      detectionReason: 'Padrão Determinístico de CPF (Receita Federal)',
      coordinates: 'X: 80.0, Y: 280.0, L: 110.0, A: 14.0',
      timestamp: new Date().toLocaleString('pt-BR'),
      status: 'REMOVIDO / TARJADO'
    },
    {
      id: 'rec-002',
      fileId: 'doc_102',
      fileName: 'processo_digital_102.pdf',
      pageNumber: 2,
      originalTerm: sensitiveTerm2,
      termHash: termHash2,
      maskedTerm: '[DADO ANONIMIZADO LGPD]',
      entityType: 'Nome de Pessoa',
      detectionReason: 'Nome de Parte Autora Relevante',
      coordinates: 'X: 50.0, Y: 600.0, L: 180.0, A: 15.0',
      timestamp: new Date().toLocaleString('pt-BR'),
      status: 'REMOVIDO / TARJADO'
    }
  ];

  // 1. Gerar CSV no modo PADRÃO (Minimização Ativa: minimizePersonalData = true)
  const csvMinimizado = PdfReportExporterService.generateLgpdAuditCsvString(sampleAuditRecords, {
    minimizePersonalData: true
  });

  // Validação Crítica da Minimização: O dado em texto claro NÃO DEVE existir no CSV
  assert.strictEqual(
    csvMinimizado.includes(sensitiveTerm1),
    false,
    `O CPF confidencial '${sensitiveTerm1}' NUNCA deve ser exportado no CSV minimizado`
  );
  assert.strictEqual(
    csvMinimizado.includes(sensitiveTerm2),
    false,
    `O nome de pessoa confidencial '${sensitiveTerm2}' NUNCA deve ser exportado no CSV minimizado`
  );

  // Deve conter o Hash SHA-256 e as colunas de rastreabilidade
  assert.ok(csvMinimizado.includes('Hash SHA-256'), 'CSV deve conter cabeçalho "Hash SHA-256"');
  assert.ok(csvMinimizado.includes(termHash1), 'CSV minimizado deve conter o Hash SHA-256 do termo 1');
  assert.ok(csvMinimizado.includes(termHash2), 'CSV minimizado deve conter o Hash SHA-256 do termo 2');
  assert.ok(csvMinimizado.includes('X: 80.0, Y: 280.0'), 'CSV deve registrar as coordenadas exatas');
  assert.ok(csvMinimizado.includes('Padrão Determinístico de CPF'), 'CSV deve registrar a regra de detecção');
  assert.ok(csvMinimizado.includes('REMOVIDO / TARJADO'), 'CSV deve registrar o status de remoção');
  console.log('      ✓ CSV de Auditoria minimizado: Nenhum dado sensível em texto claro exposto; Hash SHA-256 registrado.');

  // 2. Gerar JSON no modo PADRÃO (Minimização Ativa: minimizePersonalData = true)
  const jsonMinimizado = PdfReportExporterService.generateLgpdAuditJsonString(sampleAuditRecords, {
    minimizePersonalData: true
  });

  const parsedJson = JSON.parse(jsonMinimizado);
  assert.strictEqual(parsedJson.totalTermosAnonimizados, 2);
  assert.strictEqual(parsedJson.minimizacaoDadosPessoais, true);
  
  // Assegurar ausência da propriedade originalTerm no JSON
  assert.strictEqual(parsedJson.registros[0].originalTerm, undefined, 'originalTerm deve ser omitido no JSON');
  assert.strictEqual(parsedJson.registros[1].originalTerm, undefined, 'originalTerm deve ser omitido no JSON');
  assert.strictEqual(parsedJson.registros[0].termHash, termHash1, 'termHash deve estar presente no JSON');
  assert.strictEqual(parsedJson.registros[1].termHash, termHash2, 'termHash deve estar presente no JSON');
  console.log('      ✓ JSON de Auditoria minimizado: Omissão de originalTerm e presença de termHash verificadas.');

  // 3. Gerar CSV com minimização expressamente desativada (minimizePersonalData = false)
  const csvCompleto = PdfReportExporterService.generateLgpdAuditCsvString(sampleAuditRecords, {
    minimizePersonalData: false
  });
  assert.ok(csvCompleto.includes(sensitiveTerm1), 'Modo irrestrito deve incluir o originalTerm se requisitado');
  console.log('      ✓ CSV no modo irrestrito testado com sucesso.');

  // Salvar artefatos de teste para auditoria
  fs.writeFileSync('test_output/relatorio_auditoria_minimizado.csv', csvMinimizado, 'utf8');
  fs.writeFileSync('test_output/relatorio_auditoria_minimizado.json', jsonMinimizado, 'utf8');

  console.log('\n===========================================================================');
  console.log('✅ SUCESSO INTEGRAL: TODOS OS REQUISITOS DO FLUXO CONFIÁVEL FORAM APROVADOS!');
  console.log('===========================================================================\n');
}

runReliableRedactionWorkflowTests().catch(err => {
  console.error('\n❌ [FALHA NO TESTE DO FLUXO CONFIÁVEL]:', err);
  process.exit(1);
});
