import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { PdfTextExtractor, PageTextData } from '../src/services/pdfTextExtractor.js';
import { UniversalAiClassifier } from '../src/services/universalAiClassifier.js';
import { AiRedactionService, AiSettings, RedactionCategoryOptions } from '../src/services/aiRedactionService.js';
import { LocalPdfEngine, computeSha256Hex } from '../src/services/pdfEngine.js';

/**
 * Suite de Testes E2E & Estresse de Engenharia de Confiabilidade (SRE / QA)
 * KovaxFiles Desktop - Motor LGPD Universal
 */
async function runUniversalStressTestSuite() {
  console.log('\n======================================================================');
  console.log('🚀 KOVAXFILES DESKTOP — SUITE E2E & ESTRESSE SRE DE ANONYMIZAÇÃO LGPD');
  console.log('======================================================================\n');

  let totalPassed = 0;
  let totalFailed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      totalPassed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
      totalFailed++;
    }
  }

  // -------------------------------------------------------------------------
  // MÓDULO 1: RESILIÊNCIA E CONCORRÊNCIA DA FILA DE IA (Módulos 2 e 8)
  // -------------------------------------------------------------------------
  console.log('📌 SUITE 1: COMPORTAMENTO E RESILIÊNCIA DA FILA DE IA & FALLBACK');

  // Teste 1.1: Concorrência de CPU (Múltiplas requisições simultâneas)
  try {
    const pagesData: PageTextData[] = Array.from({ length: 6 }, (_, idx) => ({
      pageIndex: idx,
      pageWidth: 595,
      pageHeight: 842,
      fullText: `Página ${idx + 1}: Réu Cassiano Rosa Fernandes, CPF 205.979.988-09. Processo 1008479-34.2015.8.26.0100. CNPJ 03.484.611/0001-40.`,
      items: [
        { text: 'Réu', x: 50, y: 700, width: 30, height: 12 },
        { text: 'Cassiano Rosa Fernandes', x: 90, y: 700, width: 140, height: 12 },
        { text: 'CPF 205.979.988-09', x: 240, y: 700, width: 110, height: 12 }
      ],
      isScanned: false
    }));

    const categories: RedactionCategoryOptions = {
      cpf: true, cnpj: true, rg: true, emails: true, phones: true,
      names: true, addresses: true, financial: true, health: true, customKeywords: []
    };

    const aiSettings: AiSettings = {
      mode: 'ollama',
      ollamaUrl: 'http://localhost:11434/api/generate',
      ollamaModel: 'llama3.2',
      geminiApiKey: ''
    };

    const startTime = performance.now();
    const concurrentRuns = await Promise.all([
      AiRedactionService.analyzePdf(pagesData, categories, aiSettings),
      AiRedactionService.analyzePdf(pagesData, categories, aiSettings),
      AiRedactionService.analyzePdf(pagesData, categories, aiSettings)
    ]);
    const durationMs = Math.round(performance.now() - startTime);

    assert(
      concurrentRuns.length === 3 && concurrentRuns[0].length > 0,
      'Teste 1.1: Processamento em concorrência simultânea executado sem crash de thread pool',
      `Duração: ${durationMs}ms`
    );
  } catch (err: any) {
    assert(false, 'Teste 1.1: Concorrência simultânea de CPU', err.message);
  }

  // Teste 1.2: Fallback Transparente quando Motor 3 (LLM) sofre AbortController Timeout (5s) ou Erro
  try {
    const singlePage: PageTextData = {
      pageIndex: 0,
      pageWidth: 595,
      pageHeight: 842,
      fullText: 'Paciente Maria Oliveira. Diagnóstico CID M54.5. CPF 123.456.789-00.',
      items: [
        { text: 'Paciente Maria Oliveira.', x: 50, y: 700, width: 140, height: 12 },
        { text: 'Diagnóstico CID M54.5.', x: 200, y: 700, width: 120, height: 12 },
        { text: 'CPF 123.456.789-00.', x: 330, y: 700, width: 130, height: 12 }
      ],
      isScanned: false
    };

    const categories: RedactionCategoryOptions = {
      cpf: true, cnpj: true, rg: true, emails: true, phones: true,
      names: true, addresses: true, financial: true, health: true, customKeywords: []
    };

    // Configuração apontando para porta inválida para forçar recuo/fallback imediato
    const invalidAiSettings: AiSettings = {
      mode: 'embedded',
      ollamaUrl: 'http://127.0.0.1:99999/invalid',
      ollamaModel: 'invalid-model',
      geminiApiKey: ''
    };

    const fallbackResults = await AiRedactionService.analyzePdf([singlePage], categories, invalidAiSettings);

    const foundCpf = fallbackResults.some(r => r.category === 'CPF');
    assert(
      foundCpf && fallbackResults.length > 0,
      'Teste 1.2: Recuo automático (Fallback) para Motor 2 ativado transparentemente após erro/timeout de LLM'
    );
  } catch (err: any) {
    assert(false, 'Teste 1.2: Fallback transparente em erro de LLM', err.message);
  }

  console.log('');

  // -------------------------------------------------------------------------
  // MÓDULO 2: ADAPTAÇÃO GEOMÉTRICA UNIVERSAL (Módulos 1, 2, 6 e 7)
  // -------------------------------------------------------------------------
  console.log('📌 SUITE 2: TESTE DE ADAPTAÇÃO GEOMÉTRICA & MARGENS ROTACIONADAS');

  // Teste 2.1: Proximidade Vertical Y de OAB (isAttorneyOabName)
  try {
    const oabPageData: PageTextData = {
      pageIndex: 0,
      pageWidth: 595,
      pageHeight: 842,
      fullText: 'Dr. Cassiano Rosa Fernandes\nAdvogado do Autor\nOAB/SP 205.979',
      items: [
        { text: 'Dr. Cassiano Rosa Fernandes', x: 50, y: 100, width: 160, height: 12 },
        { text: 'Advogado do Autor', x: 50, y: 88, width: 100, height: 12 },
        { text: 'OAB/SP 205.979', x: 50, y: 75, width: 90, height: 12 } // Delta Y = 25px <= 45px
      ],
      isScanned: false
    };

    const isAttorney = UniversalAiClassifier.isAttorneyOabName('Cassiano Rosa Fernandes', oabPageData);
    assert(
      isAttorney === true,
      'Teste 2.1: Proximidade vertical Y (Eixo Y <= 45px) reconhece e preserva nome de advogado com OAB'
    );
  } catch (err: any) {
    assert(false, 'Teste 2.1: Proximidade vertical Y de OAB', err.message);
  }

  // Teste 2.2: Validação da Whitelist Estática para Leis e Instituições Públicas
  try {
    const isWhitelistedCode = UniversalAiClassifier.isWhitelistedTerm('Código Civil');
    const isWhitelistedConst = UniversalAiClassifier.isWhitelistedTerm('Constituição Federal');
    const isWhitelistedCrm = UniversalAiClassifier.isWhitelistedTerm('Conselho Regional de Medicina');
    const isWhitelistedGov = UniversalAiClassifier.isWhitelistedTerm('Prefeitura Municipal');

    assert(
      isWhitelistedCode && isWhitelistedConst && isWhitelistedCrm && isWhitelistedGov,
      'Teste 2.2: Whitelist estática O(1) ignora termos de leis e órgãos públicos (zero falsos positivos)'
    );
  } catch (err: any) {
    assert(false, 'Teste 2.2: Whitelist estática', err.message);
  }

  // Teste 2.3: Mapeamento Sub-Vetorial (getSubItemBounds) em tabelas complexas
  try {
    const tablePageData: PageTextData = {
      pageIndex: 0,
      pageWidth: 595,
      pageHeight: 842,
      fullText: 'PACIENTE: João da Silva | CNPJ: 03.484.611/0001-40 | CID: M54.5',
      items: [
        { text: 'PACIENTE: João da Silva | CNPJ: 03.484.611/0001-40 | CID: M54.5', x: 40, y: 500, width: 400, height: 12 }
      ],
      isScanned: false
    };

    const rectsJoao = PdfTextExtractor.findTextRectangles(tablePageData, 'João da Silva');
    const rectsCnpj = PdfTextExtractor.findTextRectangles(tablePageData, '03.484.611/0001-40');

    assert(
      rectsJoao.length > 0 && rectsCnpj.length > 0 && rectsJoao[0].width < 390,
      'Teste 2.3: Mapeamento Sub-Vetorial calcula a sub-posição de palavras sem corromper bordas da tabela'
    );
  } catch (err: any) {
    assert(false, 'Teste 2.3: Mapeamento Sub-Vetorial', err.message);
  }

  console.log('');

  // -------------------------------------------------------------------------
  // MÓDULO 3: COBERTURA DE DOMÍNIO & CRITÉRIOS DE SUCESSO (Caixa-Preta)
  // -------------------------------------------------------------------------
  console.log('📌 SUITE 3: COBERTURA DE DOMÍNIO & QUEIMA VETORIAL BURN-IN');

  try {
    // Gerar um PDF sintético de alta complexidade contendo dados sensíveis
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    const font = await doc.embedFont(StandardFonts.Helvetica);

    page.drawText('PETIÇÃO INICIAL DE TESTE LGPD', { x: 50, y: 800, size: 14, font });
    page.drawText('Autor: Alexandre de Moraes, CPF: 111.222.333-44, RG: 12.345.678-9', { x: 50, y: 760, size: 10, font });
    page.drawText('Réu: Cassiano Rosa Fernandes, CNPJ: 03.484.611/0001-40', { x: 50, y: 740, size: 10, font });
    page.drawText('E-mail: contato@empresa.com.br, Telefone: (11) 98765-4321', { x: 50, y: 720, size: 10, font });
    page.drawText('Advogado: Dr. Marcos Paulo, OAB/SP 123.456', { x: 50, y: 700, size: 10, font });

    doc.setTitle('Documento Confidencial com Metadados Ocultos');
    doc.setAuthor('Autor Confidencial Scanner XMP');

    const originalPdfBytes = await doc.save();

    // Inspecionar metadados originais
    const metaReportBefore = await LocalPdfEngine.inspectPdfMetadata(originalPdfBytes);
    assert(
      metaReportBefore.author === 'Autor Confidencial Scanner XMP',
      'Teste 3.1: Identificação prévia de risco de metadados ocultos'
    );

    // Anonimizar retângulos
    const rectsToRedact = [
      { pageIndex: 0, x: 120, y: 755, width: 140, height: 14 }, // CPF
      { pageIndex: 0, x: 265, y: 755, width: 100, height: 14 }, // RG
      { pageIndex: 0, x: 230, y: 735, width: 130, height: 14 }, // CNPJ
      { pageIndex: 0, x: 90, y: 715, width: 130, height: 14 }   // E-mail
    ];

    const redactedPdfBytes = await LocalPdfEngine.redactPdf(originalPdfBytes, rectsToRedact, { sanitizeFlatten: true });

    // Sanitizar metadados
    const sanitizedPdfBytes = await LocalPdfEngine.sanitizePdfMetadata(redactedPdfBytes, {
      cleanAuthorAndCreator: true,
      cleanDates: true,
      cleanXmpAndPrivateData: true,
      removeAnnotations: true,
      removeAttachments: true
    });

    const metaReportAfter = await LocalPdfEngine.inspectPdfMetadata(sanitizedPdfBytes);

    assert(
      !metaReportAfter.author && metaReportAfter.riskLevel !== 'high',
      'Teste 3.2: Expurgo completo de propriedades e schemas XMP de editores/escâneres'
    );
  } catch (err: any) {
    assert(false, 'Teste 3: Cobertura de domínio e queima vetorial', err.message);
  }

  console.log('');

  // -------------------------------------------------------------------------
  // MÓDULO 4: RELATÓRIO DE AUDITORIA E INTEGRIDADE (SHA-256)
  // -------------------------------------------------------------------------
  console.log('📌 SUITE 4: RELATÓRIO DE AUDITORIA & VALIDAÇÃO SHA-256');

  try {
    const sampleDoc = await PDFDocument.create();
    const p = sampleDoc.addPage([595, 842]);
    p.drawText('Documento Final de Auditoria LGPD', { x: 50, y: 750, size: 12 });
    const pdfBytes = await sampleDoc.save();

    const calculatedHash = await computeSha256Hex(pdfBytes);
    const metaReport = await LocalPdfEngine.inspectPdfMetadata(pdfBytes);

    assert(
      metaReport.sha256Hash === calculatedHash && calculatedHash.length === 64,
      'Teste 4.1: Sumário de integridade SHA-256 calculado corretamente (64 caracteres hexadecimais)'
    );
  } catch (err: any) {
    assert(false, 'Teste 4: Relatório de auditoria SHA-256', err.message);
  }

  console.log('\n======================================================================');
  console.log(`📊 RESULTADO FINAL DOS TESTES DE ESTRESSE SRE:`);
  console.log(`   ✅ PASSOU: ${totalPassed}`);
  console.log(`   ❌ FALHOU: ${totalFailed}`);
  console.log('======================================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

// Executar suíte de testes
runUniversalStressTestSuite().catch(err => {
  console.error('💥 Erro fatal ao rodar suíte de testes de estresse SRE:', err);
  process.exit(1);
});
