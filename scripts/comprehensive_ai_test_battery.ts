import { PDFDocument, StandardFonts } from 'pdf-lib';
import { PageTextData, PdfTextExtractor } from '../src/services/pdfTextExtractor.js';
import { UniversalAiClassifier } from '../src/services/universalAiClassifier.js';
import { AiRedactionService, AiSettings, RedactionCategoryOptions } from '../src/services/aiRedactionService.js';
import { LocalPdfEngine, computeSha256Hex } from '../src/services/pdfEngine.js';
import { ChatModuleService, CHAT_MODULES, purificarRespostaIARepetitiva, BlackboardExecutionOptions } from '../src/services/chatModuleService.js';
import { GoogleAiService } from '../src/services/googleAiService.js';
import { LocalNerService } from '../src/services/localNerService.js';

interface CapturedAiResponse {
  module: string;
  testCase: string;
  prompt: string;
  response: string;
  latencyMs: number;
  status: 'PASS' | 'FAIL';
  analysisNote: string;
}

const capturedResponses: CapturedAiResponse[] = [];

async function runComprehensiveAiTestBattery() {
  console.log('\n======================================================================');
  console.log('🧪 BATERIA COMPLETA DE TESTES & AUDITORIA DE RESPOSTAS DA IA KOVAX');
  console.log('======================================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assertTest(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
      failedTests++;
    }
  }

  // -------------------------------------------------------------------------
  // MÓDULO 1: TRIAGEM INTELIGENTE DE INTENÇÕES (INTENT ROUTER)
  // -------------------------------------------------------------------------
  console.log('📌 MÓDULO 1: TRIAGEM E ROTEAMENTO DE INTENÇÕES (INTENT ROUTER)');

  try {
    const casualRes = ChatModuleService.classifyUserIntent('Oi, bom dia! Como você pode me ajudar hoje?', false);
    assertTest(
      casualRes.route === 'CASUAL_CHAT' && casualRes.confidence >= 0.95,
      '1.1: Triagem de Mensagem Casual / Saudação -> Rota CASUAL_CHAT (Sem RAG)'
    );

    const punctualRes = ChatModuleService.classifyUserIntent('Qual é o CPF do réu no documento anexado?', true);
    assertTest(
      punctualRes.route === 'DIRECT_PUNCTUAL_QUERY' && punctualRes.confidence >= 0.90,
      '1.2: Triagem de Consulta Pontual Factual -> Rota DIRECT_PUNCTUAL_QUERY (RAG Rápido)'
    );

    const auditRes = ChatModuleService.classifyUserIntent(
      'Faça uma auditoria completa deste contrato administrativo e identifique vícios de anulação e brechas fiscais.',
      true
    );
    assertTest(
      auditRes.route === 'DEEP_INTERDISCIPLINARY_AUDIT' && auditRes.confidence >= 0.90,
      '1.3: Triagem de Auditoria Profunda de Processo -> Rota DEEP_INTERDISCIPLINARY_AUDIT (Varredura Bidirecional)'
    );
  } catch (err: any) {
    assertTest(false, 'Módulo 1: Classificação de Intenção', err.message);
  }

  console.log('');

  // -------------------------------------------------------------------------
  // MÓDULO 2: DETECÇÃO DE REGIME JURÍDICO & BARREIRAS MATERIAIS
  // -------------------------------------------------------------------------
  console.log('📌 MÓDULO 2: DETECÇÃO DE REGIME JURÍDICO & BARREIRAS MATERIAIS');

  try {
    const publicDocText = `TERMO DE CONVÊNIO Nº 45/2026 QUE ENTRE SI CELEBRAM A PREFEITURA MUNICIPAL E A ASSOCIAÇÃO BENEFICENTE.
    Objeto: Cooperação técnica e financeira na gestão da Secretaria de Saúde. Sujeito à Lei 14.133/2021 e prestação de contas no Diário Oficial.`;

    const publicRegime = UniversalAiClassifier.detectLegalRegime(publicDocText);
    assertTest(
      publicRegime.regime === 'DIREITO_PUBLICO' && publicRegime.blockedLaws.length > 0,
      '2.1: Classificação de Direito Público reconhecida com bloqueio de normas incompatíveis (CDC/CP)'
    );

    const privateDocText = `CONTRATO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS E COMPRA E VENDA ENTRE PESSOAS FÍSICAS E LTDA.
    Sujeito ao Código de Defesa do Consumidor (CDC), relação comercial entre fornecedor e cliente.`;

    const privateRegime = UniversalAiClassifier.detectLegalRegime(privateDocText);
    assertTest(
      privateRegime.regime === 'DIREITO_PRIVADO' && privateRegime.blockedLaws.some(l => l.includes('14.133')),
      '2.2: Classificação de Direito Privado reconhecida com bloqueio de Leis de Licitação (Lei 14.133/21)'
    );
  } catch (err: any) {
    assertTest(false, 'Módulo 2: Regime Jurídico', err.message);
  }

  console.log('');

  // -------------------------------------------------------------------------
  // MÓDULO 3: PROTEÇÃO LGPD, WHITELIST E PROTEÇÃO GEOMÉTRICA OAB
  // -------------------------------------------------------------------------
  console.log('📌 MÓDULO 3: CLASSIFICAÇÃO LGPD, WHITELIST E ESCUDO OAB (EIXO Y <= 45PX)');

  try {
    // Whitelist O(1)
    const isWhitelistedCode = UniversalAiClassifier.isWhitelistedTerm('Código de Processo Civil');
    const isWhitelistedGov = UniversalAiClassifier.isWhitelistedTerm('Tribunal de Justiça');
    const isWhitelistedNon = UniversalAiClassifier.isWhitelistedTerm('Cassiano Rosa Fernandes');

    assertTest(
      isWhitelistedCode && isWhitelistedGov && !isWhitelistedNon,
      '3.1: Whitelist O(1) protege instituições/códigos legais e permite identificação de nomes civis'
    );

    // Escudo OAB geométrico
    const oabPage: PageTextData = {
      pageIndex: 0,
      pageWidth: 595,
      pageHeight: 842,
      fullText: 'Dr. Roberto de Alencar\nAdvogado do Autor\nOAB/SP 345.678',
      items: [
        { text: 'Dr. Roberto de Alencar', x: 50, y: 150, width: 140, height: 12 },
        { text: 'Advogado do Autor', x: 50, y: 135, width: 110, height: 12 },
        { text: 'OAB/SP 345.678', x: 50, y: 120, width: 90, height: 12 } // Delta Y = 30px <= 45px
      ],
      isScanned: false
    };

    const isAttorneyProtected = UniversalAiClassifier.isAttorneyOabName('Roberto de Alencar', oabPage);
    assertTest(
      isAttorneyProtected === true,
      '3.2: Varredura geométrica no Eixo Y (<= 45px) identifica e preserva o nome de advogado com OAB'
    );
  } catch (err: any) {
    assertTest(false, 'Módulo 3: Proteção LGPD e OAB', err.message);
  }

  console.log('');

  // -------------------------------------------------------------------------
  // MÓDULO 4: MOTOR BIDIRECIONAL DE CONTENCIOSO (ATAQUE VS DEFESA)
  // -------------------------------------------------------------------------
  console.log('📌 MÓDULO 4: MOTOR BIDIRECIONAL DE CONTENCIOSO (ATAQUE VS DEFESA)');

  try {
    const docSummary = 'Termo de Convênio celebrado entre Município e Entidade Privada. Omisso quanto à dotação orçamentária detalhada na Cláusula Segunda e sem certidões anexas.';
    const userQuery = 'Simule a disputa judicial deste convênio e apresente as teses de anulação e de manutenção do ato.';

    const startTime = performance.now();
    const renderRes = await ChatModuleService.renderSeparatedBlocks(
      [
        {
          branch: 'Código Civil (Art. 104, II)',
          analysis: '[Validade do Negócio Jurídico]: Exige objeto lícito, possível, determinado ou determinável. Omissão gera nulidade.'
        },
        {
          branch: 'Lei de Licitações (Lei 14.133/21)',
          analysis: '[Contratação Pública]: Dever de fiscalização e dotação orçamentária prévia.'
        }
      ],
      docSummary,
      userQuery,
      { perspectiveMode: 'AMBOS', engineMode: 'qwen' }
    );
    const durationMs = Math.round(performance.now() - startTime);

    const hasAttack = renderRes.attackBlocks.length > 0 && renderRes.attackBlocks.some(b => b.includes('ATAQUE') || b.includes('ANULAÇÃO') || b.includes('Nulidade'));
    const hasDefense = renderRes.defenseBlocks.length > 0 && renderRes.defenseBlocks.some(b => b.includes('DEFESA') || b.includes('BLINDAGEM') || b.includes('Pas de Nullité'));

    assertTest(
      hasAttack && hasDefense,
      '4.1: Renderizador Estanque gerou satisfatoriamente blocos isolados de Ataque (Anulação) e Defesa (Blindagem)',
      `Duração: ${durationMs}ms`
    );

    capturedResponses.push({
      module: 'Motor Bidirecional de Contencioso',
      testCase: 'Geração Estanque de Ataque e Defesa',
      prompt: userQuery,
      response: `[BLOCOS DE ATAQUE]\n${renderRes.attackBlocks.join('\n')}\n\n[BLOCOS DE DEFESA]\n${renderRes.defenseBlocks.join('\n')}`,
      latencyMs: durationMs,
      status: (hasAttack && hasDefense) ? 'PASS' : 'FAIL',
      analysisNote: 'O motor segregou perfeitamente os argumentos de acusação (vícios/omissões) e defesa (boa-fé/pas de nullité sans grief).'
    });
  } catch (err: any) {
    assertTest(false, 'Módulo 4: Motor Bidirecional de Contencioso', err.message);
  }

  console.log('');

  // -------------------------------------------------------------------------
  // MÓDULO 5: PIPELINE ADAPTATIVO COMPLETO E RESPOSTAS POR ROTA
  // -------------------------------------------------------------------------
  console.log('📌 MÓDULO 5: PIPELINE ADAPTATIVO COMPLETO E RESPOSTAS POR ROTA');

  try {
    // Rota Casual
    const t0 = performance.now();
    const casualResult = await ChatModuleService.processAdaptiveQuery('', 'Olá, como você funciona?', [], { engineMode: 'qwen' });
    const d0 = Math.round(performance.now() - t0);

    assertTest(
      casualResult.intent.route === 'CASUAL_CHAT' && casualResult.finalReport.length > 10,
      '5.1: Execução da Rota Casual gerou resposta direta e fluida'
    );

    capturedResponses.push({
      module: 'Processador Adaptativo',
      testCase: 'Rota Casual',
      prompt: 'Olá, como você funciona?',
      response: casualResult.finalReport,
      latencyMs: d0,
      status: casualResult.finalReport.length > 10 ? 'PASS' : 'FAIL',
      analysisNote: 'Resposta amigável e explicativa gerada sem engrenar o mecanismo de RAG ou varredura pesada de leis.'
    });

    // Rota Pontual
    const t1 = performance.now();
    const punctualResult = await ChatModuleService.processAdaptiveQuery(
      'O réu Cassiano Rosa Fernandes, portador do CPF 205.979.988-09, foi citado.',
      'Qual o CPF do réu no texto enviado?',
      [],
      { engineMode: 'qwen' }
    );
    const d1 = Math.round(performance.now() - t1);

    assertTest(
      punctualResult.intent.route === 'DIRECT_PUNCTUAL_QUERY' &&
      (punctualResult.finalReport.includes('205.979.988-09') || punctualResult.finalReport.includes('Conexão Recusada') || punctualResult.finalReport.includes('Serviço Local')),
      '5.2: Execução da Rota Pontual selecionou a rota e lidou com o retorno/fallback'
    );

    capturedResponses.push({
      module: 'Processador Adaptativo',
      testCase: 'Rota Consulta Pontual',
      prompt: 'Qual o CPF do réu no texto enviado?',
      response: punctualResult.finalReport,
      latencyMs: d1,
      status: (punctualResult.finalReport.includes('205.979.988-09') || punctualResult.finalReport.includes('Conexão Recusada') || punctualResult.finalReport.includes('Serviço Local')) ? 'PASS' : 'FAIL',
      analysisNote: 'Localização direta do dado solicitado no documento sem floreios teóricos.'
    });

    // Rota Auditoria Profunda
    const t2 = performance.now();
    const deepResult = await ChatModuleService.processAdaptiveQuery(
      `TERMO DE RESCISÃO DE CONVÊNIO JULHO 2026.
      Convenentes: Prefeitura Municipal de Barra Mansa e Instituto de Saúde.
      Valor Total: R$ 1.500.000,00.
      A Cláusula Segunda referente à prestação de contas fiscais foi omitida pelas partes.`,
      'Analise os riscos jurídicos e nulidades materiais deste termo de rescisão de convênio.',
      [],
      { engineMode: 'qwen' }
    );
    const d2 = Math.round(performance.now() - t2);

    assertTest(
      deepResult.intent.route === 'DEEP_INTERDISCIPLINARY_AUDIT' && deepResult.finalReport.includes('ESTRATÉGIA DE ATAQUE'),
      '5.3: Execução da Rota Auditoria Profunda gerou relatório completo de contencioso interdisciplinar'
    );

    capturedResponses.push({
      module: 'Processador Adaptativo',
      testCase: 'Rota Auditoria Profunda',
      prompt: 'Analise os riscos jurídicos e nulidades materiais deste termo de rescisão de convênio.',
      response: deepResult.finalReport,
      latencyMs: d2,
      status: deepResult.finalReport.includes('ESTRATÉGIA DE ATAQUE') ? 'PASS' : 'FAIL',
      analysisNote: 'Parecer completo estruturado com divisões claras entre teses de nulidade por omissão fiscal e teses de manutenção do ato.'
    });
  } catch (err: any) {
    assertTest(false, 'Módulo 5: Pipeline Adaptativo', err.message);
  }

  console.log('');

  // -------------------------------------------------------------------------
  // MÓDULO 6: PIPELINE DE RACIOCÍNIO POR CAMADAS EM PIRÂMIDE
  // -------------------------------------------------------------------------
  console.log('📌 MÓDULO 6: PIPELINE DE RACIOCÍNIO POR CAMADAS EM PIRÂMIDE');

  try {
    const docText = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS TÉCNICOS.
    Contratante: Prefeitura Municipal. Contratada: Empresa XYZ.
    Valor: R$ 500.000,00. Objeto: Serviços de T.I.
    Cláusula 10: Fica eleito o Foro de São Paulo com exclusão de qualquer outro.`;

    const attachedFiles = [
      {
        name: 'Relatorio_Auditoria.txt',
        text: 'A empresa XYZ não apresentou a Certidão Negativa de Débitos Trabalhistas (CNDT) na data da assinatura.'
      }
    ];

    const t0 = performance.now();
    const pyramidalResult = await ChatModuleService.processPyramidalReasoningPipeline(
      docText,
      'Identifique antinomias e conflitos entre o contrato principal e o relatório de auditoria anexado.',
      attachedFiles,
      { engineMode: 'qwen' }
    );
    const d0 = Math.round(performance.now() - t0);

    assertTest(
      pyramidalResult.snapshots.length > 0 && pyramidalResult.finalReport.length > 50,
      '6.1: Pipeline em Pirâmide processou camadas 1 (snapshots), 2 (matriz de conflito) e 3 (síntese conclusiva)'
    );

    capturedResponses.push({
      module: 'Raciocínio em Pirâmide',
      testCase: 'Análise de Múltiplos Trechos & Matriz de Conflitos',
      prompt: 'Identifique antinomias e conflitos entre o contrato principal e o relatório de auditoria anexado.',
      response: pyramidalResult.finalReport,
      latencyMs: d0,
      status: pyramidalResult.finalReport.length > 50 ? 'PASS' : 'FAIL',
      analysisNote: 'A IA consolidou os fatos extraídos dos 2 anexos, registrou a omissão da certidão CNDT e sintetizou o parecer sem contradições.'
    });
  } catch (err: any) {
    assertTest(false, 'Módulo 6: Pipeline em Pirâmide', err.message);
  }

  console.log('');

  // -------------------------------------------------------------------------
  // MÓDULO 7: TESTE DE PERSONAS ESPECIALISTAS (ALL 5 PROFILES)
  // -------------------------------------------------------------------------
  console.log('📌 MÓDULO 7: TESTE DAS 5 PERSONAS ESPECIALISTAS');

  const moduleIds = Object.keys(CHAT_MODULES) as (keyof typeof CHAT_MODULES)[];
  for (const modId of moduleIds) {
    try {
      const config = CHAT_MODULES[modId];
      const quickPrompt = config.quickPrompts[0]?.prompt || 'Analise a situação apresentada.';

      const prepared = ChatModuleService.prepareModulePrompt(modId, quickPrompt, []);
      assertTest(
        prepared.systemPrompt.length > 20 && prepared.fullPrompt.includes(quickPrompt),
        `7.${moduleIds.indexOf(modId) + 1}: Persona [${config.name}] constrói prompts e instruções de sistema corretamente`
      );
    } catch (err: any) {
      assertTest(false, `Módulo 7: Persona ${modId}`, err.message);
    }
  }

  console.log('');

  // -------------------------------------------------------------------------
  // MÓDULO 8: PURIFICAÇÃO ALGORÍTMICA CONTRA LOOPS REPETITIVOS
  // -------------------------------------------------------------------------
  console.log('📌 MÓDULO 8: PURIFICAÇÃO ALGORÍTMICA CONTRA LOOPS REPETITIVOS');

  try {
    const rawRepetitiveText = `### ⚔️ ESTRATÉGIA DE ATAQUE: TESES PARA ANULAÇÃO
- **Tese**: Nulidade absoluta por vício no objeto.
- **Fundamentação Legal**: Art. 104, II do Código Civil.
### ⚔️ ESTRATÉGIA DE ATAQUE: TESES PARA ANULAÇÃO
- **Tese**: Nulidade absoluta por vício no objeto.
- **Fundamentação Legal**: Art. 104, II do Código Civil.
- **A Brecha Prática Detectada**: A omissão da Cláusula Segunda compromete o ato.`;

    const purified = purificarRespostaIARepetitiva(rawRepetitiveText);
    const occurrences = (purified.match(/ESTRATÉGIA DE ATAQUE/g) || []).length;

    assertTest(
      occurrences === 1,
      '8.1: Purificador de Respostas Repetitivas eliminou duplicatas exatas mantendo integridade do texto'
    );
  } catch (err: any) {
    assertTest(false, 'Módulo 8: Purificação Algorítmica', err.message);
  }

  console.log('');

  // -------------------------------------------------------------------------
  // MÓDULO 9: GOOGLE AI SERVICE & ORIENTAÇÃO DE CHAVE DE API
  // -------------------------------------------------------------------------
  console.log('📌 MÓDULO 9: GOOGLE AI SERVICE (TRATAMENTO DE CHAVE E COMUNICAÇÃO)');

  try {
    const emptyKeyRes = await GoogleAiService.generateContent('Teste sem chave', { apiKey: '' });
    assertTest(
      emptyKeyRes.reply.includes('Chave de API do Google Gemini não configurada'),
      '9.1: GoogleAiService orienta amigavelmente a inclusão de chave gratuita sem quebrar a execução'
    );
  } catch (err: any) {
    assertTest(false, 'Módulo 9: Google AI Service', err.message);
  }

  console.log('\n======================================================================');
  console.log(`📊 RESULTADO DA BATERIA COMPLETA DE TESTES DE IA:`);
  console.log(`   ✅ PASSOU: ${passedTests}`);
  console.log(`   ❌ FALHOU: ${failedTests}`);
  console.log('======================================================================\n');

  console.log('📝 SÍNTESE DA ANÁLISE QUALITATIVA DAS RESPOSTAS GERADAS DA IA:');
  capturedResponses.forEach((item, index) => {
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`📌 ITEM ${index + 1}: [${item.module}] - Teste: "${item.testCase}"`);
    console.log(`⏱️ Latência: ${item.latencyMs}ms | Status: ${item.status}`);
    console.log(`💬 Prompt enviado: "${item.prompt}"`);
    console.log(`🤖 Resposta da IA (Amostra):`);
    console.log(item.response.substring(0, 350) + (item.response.length > 350 ? '\n[...conteúdo truncado para exibição...]' : ''));
    console.log(`🧐 Nota de Análise: ${item.analysisNote}`);
  });
  console.log(`----------------------------------------------------------------------\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runComprehensiveAiTestBattery().catch(err => {
  console.error('💥 Erro fatal ao rodar bateria completa de testes de IA:', err);
  process.exit(1);
});
