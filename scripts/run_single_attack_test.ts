import fs from 'fs';
import path from 'path';
import { ChatModuleService } from '../src/services/chatModuleService.js';
import { LegalKnowledgeBaseService } from '../src/services/legalKnowledgeBaseService.js';

async function runTest() {
  const contractText = `CONTRATO ADMINISTRATIVO DE INEXIGIBILIDADE DE LICITAÇÃO Nº 08/2026
CONTRATANTE: Prefeitura Municipal de Vila Nova / Secretaria de Governo.
CONTRATADA: Tecnologia Global Ltda., CNPJ 04.111.222/0001-33.
CLÁUSULA PRIMEIRA - DO OBJETO: Prestação de serviços de assessoria jurídica e consultoria fiscal e implementação de sistema informatizado de gestão integrada.
CLÁUSULA SEGUNDA - DA INEXIGIBILIDADE: A contratação é realizada por Inexigibilidade de Licitação fundada na reputação da contratada, dispensando-se qualquer procedimento prévio de chamamento público, credenciamento ou cotação de mercado.
CLÁUSULA TERCEIRA - DO PREÇO: Valor global de R$ 950.000,00. Fica dispensada a apresentação de justificativa detalhada de preços por se tratar de notória especialização presumida pelas partes.
CLÁUSULA QUARTA - DO REAJUSTE DE PREÇOS: O contrato poderá sofrer reajuste anual pelo IPCA.
CLÁUSULA QUINTA - DAS PENALIDADES: Advertência por escrito, Multa rescisória ou penalidade de suspensão temporária de participação em licitações em caso de prejuízo causado à Administração Pública.
CLÁUSULA SEXTA - DO FORO: Fica eleito o Foro da Comarca de Vila Nova.`;

  const query = "Faça uma teoria de ataque contra este documento em busca de sua anulação.";

  console.log("======================================================================");
  console.log("🧪 EXECUTANDO TESTE REAL DA PERGUNTA SOLICITADA");
  console.log(`Prompt: "${query}"`);
  console.log("======================================================================\n");

  const result = await ChatModuleService.processAdaptiveQuery(
    contractText,
    query,
    [],
    { engineMode: 'qwen' }
  );

  console.log("======================================================================");
  console.log("📄 RESULTADO GERADO PELA IA APÓS AS CORREÇÕES:");
  console.log("======================================================================\n");
  console.log(result.finalReport);
  console.log("\n======================================================================");
  console.log(`⚡ Desempenho: ${result.latencyMs}ms`);
  console.log("======================================================================");
}

runTest().catch(console.error);
