import { LegalKnowledgeBaseService } from '../src/services/legalKnowledgeBaseService.js';
import { UniversalAiClassifier } from '../src/services/universalAiClassifier.js';
import { ChatModuleService } from '../src/services/chatModuleService.js';

async function testPipeline() {
  const contractText = `CONTRATO ADMINISTRATIVO DE INEXIGIBILIDADE DE LICITAÇÃO Nº 08/2026
CONTRATANTE: Prefeitura Municipal de Vila Nova / Secretaria de Governo.
CONTRATADA: Tecnologia Global Ltda., CNPJ 04.111.222/0001-33.
CLÁUSULA PRIMEIRA - DO OBJETO: Prestação de serviços de assessoria jurídica e consultoria fiscal e implementação de sistema informatizado de gestão integrada.
CLÁUSULA SEGUNDA - DA INEXIGIBILIDADE: A contratação é realizada por Inexigibilidade de Licitação fundada na reputação da contratada, dispensando-se qualquer procedimento prévio de chamamento público, credenciamento ou cotação de mercado.
CLÁUSULA TERCEIRA - DO PREÇO: Valor global de R$ 950.000,00. Fica dispensada a apresentação de justificativa detalhada de preços por se tratar de notória especialização presumida pelas partes.
CLÁUSULA QUARTA - DO REAJUSTE DE PREÇOS: O contrato poderá sofrer reajuste anual pelo IPCA.
CLÁUSULA QUINTA - DAS PENALIDADES: Advertência por escrito, Multa rescisória ou penalidade de suspensão temporária de participação em licitações em caso de prejuízo causado à Administração Pública.
CLÁUSULA SEXTA - DO FORO: Fica eleito o Foro da Comarca de Vila Nova.`;

  const userQuery = "Faça uma teoria de ataque contra este documento em busca de sua anulação.";

  console.log("=== 1. CLASSIFICAÇÃO DE REGIME JURÍDICO ===");
  const regime = UniversalAiClassifier.detectLegalRegime(contractText);
  console.log(`Regime Identificado: ${regime.regime}`);
  console.log(`Fundamentação: ${regime.reasoning}`);

  console.log("\n=== 2. SELEÇÃO DE BASE LEGISLATIVA (RAG) ===");
  const allArticles = LegalKnowledgeBaseService.getAllArticles();
  const licitacaoArticles = allArticles.filter(a => a.lawName.includes('14.133'));
  console.log(`Artigos da Lei 14.133/2021 Recuperados: ${licitacaoArticles.length}`);
  licitacaoArticles.forEach(a => {
    console.log(`  - ${a.lawName} (${a.article}): ${a.summary}`);
  });

  console.log("\n=== 3. MONTAGEM DAS INSTRUÇÕES ESTREITAS DE ATAQUE vs DEFESA ===");
  const attackBlocks = await ChatModuleService.executeAttackPipeline(
    licitacaoArticles.map(article => ({
      branch: `${article.lawName} (${article.article})`,
      analysis: `Artigo: ${article.article}\nResumo: ${article.summary}\nConteúdo: ${article.content}`
    })),
    contractText,
    userQuery,
    { engineMode: 'qwen' }
  );

  const defenseBlocks = await ChatModuleService.executeDefensePipeline(
    licitacaoArticles.map(article => ({
      branch: `${article.lawName} (${article.article})`,
      analysis: `Artigo: ${article.article}\nResumo: ${article.summary}\nConteúdo: ${article.content}`
    })),
    contractText,
    userQuery,
    { engineMode: 'qwen' }
  );

  console.log("\n=== BLOCS DE ATAQUE GERADOS ===");
  console.log(attackBlocks.join("\n\n"));

  console.log("\n=== BLOCS DE DEFESA GERADOS ===");
  console.log(defenseBlocks.join("\n\n"));
}

testPipeline().catch(console.error);
