/**
 * Teste de Reprodução de Regressão — Homologação de Distribuição Limpa e Completa
 *
 * Captura as falhas identificadas:
 * 1. O teste de distribuição aceitava fallback silencioso para npx electron dist-electron/main.js
 *    quando o binário empacotado não estava disponível.
 * 2. O modo --smoke-test encerrava o processo com app.exit(0) antes de criar a janela principal,
 *    não demonstrando o funcionamento da interface, preload, IPC, fontes, OCR, PDF e I/O.
 */

import assert from 'assert';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function runDistributionReproTest() {
  console.log('='.repeat(80));
  console.log('  TESTE DE REPRODUÇÃO: HOMOLOGAÇÃO DE DISTRIBUIÇÃO LIMPA (ZERO-DEV RUNTIME)');
  console.log('='.repeat(80));

  const unpackedExe = path.resolve('release/win-unpacked/KovaxFiles Desktop.exe');
  assert.ok(
    fs.existsSync(unpackedExe),
    'O binário executável empacotado DEVE existir fisicamente em release/win-unpacked/. Proibido fallback para npx.'
  );

  // Execução com variáveis de ambiente limpas (simulando máquina de usuário final sem ferramentas de dev)
  const cleanEnv: Record<string, string | undefined> = {
    SYSTEMROOT: process.env.SYSTEMROOT || 'C:\\Windows',
    WINDIR: process.env.WINDIR || 'C:\\Windows',
    TMP: process.env.TMP,
    TEMP: process.env.TEMP,
    PATH: 'C:\\Windows\\system32;C:\\Windows' // Sem Node, sem Python, sem .venv
  };

  console.log('\n[1/2] Executando binário empacotado real com --smoke-test em ambiente limpo...');
  const output = execFileSync(unpackedExe, ['--smoke-test'], {
    env: cleanEnv,
    encoding: 'utf-8',
    timeout: 30000
  });

  console.log('Saída obtida do executável:');
  console.log(output);

  // O teste comprova a falha: O código atual NÃO cria a janela principal nem valida
  // a interface, preload, IPC, fontes, assets OCR ou operações de PDF.
  const requiredMilestones = [
    '[CleanRuntime:Interface] Janela principal e DOM carregados com sucesso',
    '[CleanRuntime:Preload] ContextBridge e API segura expostos no renderer',
    '[CleanRuntime:IPC] Comunicação IPC bidirecional validada',
    '[CleanRuntime:OCR] Ativos offline de OCR (tessdata) confirmados no pacote',
    '[CleanRuntime:PDF-IO] Operações de PDF e gravação de arquivos validadas'
  ];

  const missingMilestones = requiredMilestones.filter(m => !output.includes(m));

  if (missingMilestones.length > 0) {
    console.error('\nFALHA COMPROVADA (Comportamento não corrigido):');
    console.error('O executável empacotado encerrou antes de criar a janela ou não executou a homologação completa:');
    for (const m of missingMilestones) {
      console.error(`  - Faltando: ${m}`);
    }
    throw new Error(`Distribuição incompleta: ${missingMilestones.length} marcos obrigatórios não foram demonstrados.`);
  }

  console.log('\n[PASS] Todos os marcos da distribuição empacotada em ambiente limpo foram homologados!');
}

runDistributionReproTest();
