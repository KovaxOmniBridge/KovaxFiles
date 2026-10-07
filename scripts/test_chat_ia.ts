import fs from 'fs';
import path from 'path';
import { Fase1Intencao } from '../src/services/respostaIA/fase_1_intencao.js';
import { Fase38AuditoriaProfunda } from '../src/services/respostaIA/fase_3_8_auditoria_profunda.js';
import { Fase31Ataque } from '../src/services/respostaIA/fase_3_1_ataque.js';
import { Fase32Defesa } from '../src/services/respostaIA/fase_3_2_defesa.js';
import { Fase35Tabela } from '../src/services/respostaIA/fase_3_5_tabela.js';
import { Fase34Pontual } from '../src/services/respostaIA/fase_3_4_pontual.js';
import { UniversalAiClassifier } from '../src/services/universalAiClassifier.js';
import { purificarRespostaIARepetitiva } from '../src/services/respostaIA/sanitizer.js';

async function runChatTestSuite() {
  console.log('\n========================================================================');
  console.log('🤖 KOVAXFILES APP — BATERIA DE TESTES DO MOTOR DE IA (CHAT SIMULATION)');
  console.log('========================================================================\n');

  const testDir = path.join(process.cwd(), 'test_files');
  const file1 = fs.readFileSync(path.join(testDir, '01_processo_trabalhista_com_contradicoes.txt'), 'utf-8');
  const file2 = fs.readFileSync(path.join(testDir, '02_contrato_prestacao_servicos_ti.txt'), 'utf-8');
  const file3 = fs.readFileSync(path.join(testDir, '03_peticao_inicial_consumidor_danos_morais.txt'), 'utf-8');

  console.log('📁 Arquivos de Teste Carregados:');
  console.log('  1. 01_processo_trabalhista_com_contradicoes.txt');
  console.log('  2. 02_contrato_prestacao_servicos_ti.txt');
  console.log('  3. 03_peticao_inicial_consumidor_danos_morais.txt\n');

  // TESTE 1: FASE 1 - ROTEAMENTO DE INTENÇÃO E HÍBRIDOS
  console.log('------------------------------------------------------------------------');
  console.log('🔹 TESTE 1: LEITURA DE INTENÇÃO (FASE 1 - INTENT ROUTING)');
  console.log('------------------------------------------------------------------------');

  const promptIntencao1 = "Analise este contrato, faça uma tabela com os prazos e redija uma minuta de aditivo";
  console.log(`👤 USUÁRIO: "${promptIntencao1}"`);
  
  try {
    const resIntencao = await Fase1Intencao.analisarIntencao(promptIntencao1, true);
    console.log('🤖 IA (FASE 1 RESPOSTA):');
    console.log(`  • Rota Principal: ${resIntencao.route}`);
    console.log(`  • É Híbrido? ${resIntencao.isHybrid}`);
    console.log(`  • Rotas Secundárias: ${JSON.stringify(resIntencao.secondaryRoutes)}`);
    console.log(`  • Ordem de Execução: ${JSON.stringify(resIntencao.executionOrder)}`);
    console.log(`  • Confiança: ${resIntencao.confidence}`);
  } catch (err: any) {
    console.log(`  ⚠️ Nota (sem chave LLM conectada localmente, o fallback padrão é mantido): ${err.message}`);
  }

  // TESTE 2: CLASSIFICAÇÃO DE REGIME JURÍDICO
  console.log('\n------------------------------------------------------------------------');
  console.log('🔹 TESTE 2: CLASSIFICADOR DE REGIME JURÍDICO (UNIVERSAL CLASSIFIER)');
  console.log('------------------------------------------------------------------------');

  const regime1 = UniversalAiClassifier.detectLegalRegime(file1);
  console.log(`📄 Doc 1 (Processo Trabalhista) -> Regime Detectado: ${regime1.regime} (Confiança: ${regime1.confidence})`);
  
  const regime2 = UniversalAiClassifier.detectLegalRegime(file2);
  console.log(`📄 Doc 2 (Contrato TI) -> Regime Detectado: ${regime2.regime} (Confiança: ${regime2.confidence})`);

  const regime3 = UniversalAiClassifier.detectLegalRegime(file3);
  console.log(`📄 Doc 3 (Consumidor/Danos Morais) -> Regime Detectado: ${regime3.regime} (Confiança: ${regime3.confidence})`);

  // TESTE 3: SANITIZAÇÃO ANTI-ALUCINAÇÃO E VAZAMENTO DE SISTEMA
  console.log('\n------------------------------------------------------------------------');
  console.log('🔹 TESTE 3: SANITIZADOR DE RESPOSTAS (PURIFICADOR ANTI-METACOMENS)');
  console.log('------------------------------------------------------------------------');

  const respostaComRuido = `Como assistente Kovax, realizando a resumidação do documento na Fase 3...
  O valor da causa é R$ 113.000,00.
  Resumo factualíssimo realizado pelo agente assistente kovax de inteligência artificial.`;

  console.log('📝 Resposta Bruta com Ruído/Meta-comentários:\n', respostaComRuido);
  const respostaLimpa = purificarRespostaIARepetitiva(respostaComRuido);
  console.log('\n🧹 Resposta Purificada pelo Sanitizador:\n', respostaLimpa);

  console.log('\n========================================================================');
  console.log('✅ SUITE DE TESTES CONCLUÍDA!');
  console.log('========================================================================\n');
}

runChatTestSuite().catch(console.error);
