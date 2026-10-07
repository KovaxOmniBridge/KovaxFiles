import fs from 'fs';
import path from 'path';
import { ChatModuleService } from '../src/services/chatModuleService.js';
import { purificarRespostaIARepetitiva } from '../src/services/respostaIA/sanitizer.js';

async function runE2EModelTest() {
  console.log('\n========================================================================');
  console.log('🧪 TESTE E2E DO MOTOR DE IA LOCAL (SIMULAÇÃO DIRETA DO APLICATIVO UI)');
  console.log('========================================================================\n');

  const testDir = path.join(process.cwd(), 'test_files');
  const file1 = fs.readFileSync(path.join(testDir, '01_processo_trabalhista_com_contradicoes.txt'), 'utf-8');

  const userQuery = "Analise se há prescrição bienal considerando a data de demissão (15/03/2021) e o ajuizamento (10/04/2024), e aponte a contradição com a folha de ponto.";

  console.log('📄 Documento Anexado: 01_processo_trabalhista_com_contradicoes.txt');
  console.log(`👤 Pergunta do Usuário: "${userQuery}"\n`);
  console.log('⚙️ Executando pipeline do Chat Geral Unificado (OmniBridge IA)...\n');

  const startTime = performance.now();
  const result = await ChatModuleService.processAdaptiveQuery(
    file1,
    userQuery,
    [{ name: '01_processo_trabalhista_com_contradicoes.txt', text: file1 }],
    {
      engineMode: 'qwen',
      onProgress: (p) => console.log(`  [Progresso ${p.percent}%] ${p.phase}: ${p.details}`)
    }
  );
  const durationMs = Math.round(performance.now() - startTime);

  console.log('\n========================================================================');
  console.log('🤖 RESPOSTA GERADA PELO CHAT UNIFICADO DO APLICATIVO (SANOTIZADA E LIMPA):');
  console.log('========================================================================\n');

  const cleanReport = purificarRespostaIARepetitiva(result.finalReport);
  console.log(cleanReport);

  console.log('\n========================================================================');
  console.log('📊 METADADOS DA EXECUÇÃO:');
  console.log(`  • Rota Detectada (Fase 1): ${result.intent.route}`);
  console.log(`  • Regime Jurídico: ${result.regime?.regime || 'DIREITO_PRIVADO'}`);
  console.log(`  • Tempo de Resposta: ${durationMs}ms`);
  console.log('========================================================================\n');
}

runE2EModelTest().catch(console.error);
