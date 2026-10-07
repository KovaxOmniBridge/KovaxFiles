import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
// @ts-ignore
import pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

// Import Platform Services with correct class names
import { CnjProcessNormalizer } from '../src/services/cnjProcessNormalizer';
import { UniversalAiClassifier } from '../src/services/universalAiClassifier';
import { LlmDispatcher } from '../src/services/respostaIA/llmDispatcher';

async function extractPdfText(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data, disableFontFace: true });
  const doc = await loadingTask.promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    text += `--- Página ${i} ---\n` + strings.join(' ') + '\n';
  }
  return text;
}

async function startLocalServerIfNeeded(): Promise<ChildProcess | null> {
  try {
    const res = await fetch('http://127.0.0.1:18888/v1/models');
    if (res.ok) {
      console.log('Local C++ server already running on port 18888.');
      return null;
    }
  } catch (e) {}

  const binaryPath = path.resolve('binaries/llama-server.exe');
  const modelPath = path.resolve('models/qwen2.5-1.5b-instruct-q4_k_m.gguf');

  if (!fs.existsSync(binaryPath) || !fs.existsSync(modelPath)) {
    console.error('Binary or model missing!');
    return null;
  }

  console.log('Starting local C++ server (Qwen 2.5 1.5B) on port 18888...');
  const proc = spawn(binaryPath, [
    '-m', modelPath,
    '--port', '18888',
    '--ctx-size', '4096',
    '--threads', '4'
  ], { stdio: 'ignore' });

  // Wait up to 45 seconds for server to be ready
  for (let i = 0; i < 45; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const res = await fetch('http://127.0.0.1:18888/v1/models');
      if (res.ok) {
        console.log(`Local C++ server is READY on port 18888! (loaded in ${i+1}s)`);
        return proc;
      }
    } catch (e) {}
  }
  console.warn('Server start timeout, proceeding anyway...');
  return proc;
}

async function runScenario() {
  console.log('================================================================');
  console.log('   INICIANDO CENÁRIO DE TESTES REAL - KOVAX FILES PLATFORM   ');
  console.log('================================================================\n');

  console.log('[1/5] EXTRAÇÃO DE TEXTO DOS DOCUMENTOS DE TESTE...');
  const file1 = path.resolve('documento_teste_1_licitacao.pdf');
  const file2 = path.resolve('documento_teste_2_trabalhista.pdf');

  const text1 = await extractPdfText(file1);
  const text2 = await extractPdfText(file2);

  console.log('\n--- CONTEÚDO EXTRAÍDO: DOCUMENTO 1 (Licitação / Prestação de Serviços) ---');
  console.log(text1.trim());

  console.log('\n--- CONTEÚDO EXTRAÍDO: DOCUMENTO 2 (Trabalhista / Contrato Individual) ---');
  console.log(text2.trim());

  console.log('\n[2/5] CLASSIFICAÇÃO UNIVERSAL DE REGIME JURÍDICO...');
  const class1 = UniversalAiClassifier.detectLegalRegime(text1);
  const class2 = UniversalAiClassifier.detectLegalRegime(text2);
  console.log('Doc 1 (Licitação):', JSON.stringify(class1, null, 2));
  console.log('Doc 2 (Trabalhista):', JSON.stringify(class2, null, 2));

  console.log('\n[3/5] RECONHECIMENTO DE ENTIDADES E PII (LGPD)...');
  const cpfs1 = text1.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/g) || [];
  const cpfs2 = text2.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/g) || [];
  const cnpjs1 = text1.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g) || [];
  const cnpjs2 = text2.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g) || [];
  
  console.log(`Doc 1 PII Encontrados: CPFs=[${cpfs1.join(', ')}], CNPJs=[${cnpjs1.join(', ')}]`);
  console.log(`Doc 2 PII Encontrados: CPFs=[${cpfs2.join(', ')}], CNPJs=[${cnpjs2.join(', ')}]`);

  console.log('\n[4/5] EXECUTANDO SERVIDOR E CONVERSAS DE CHAT VIA IA LOCAL (PORTA 18888)...');
  const serverProc = await startLocalServerIfNeeded();

  try {
    // Warmup
    await LlmDispatcher.warmup();

    // Pergunta 1: Licitação
    console.log('\n----------------------------------------------------------------');
    console.log('💬 CONVERSA 1: Análise do Contrato Público de Licitação (Doc 1)');
    console.log('----------------------------------------------------------------');
    const q1 = "Qual é o objeto do contrato, quem são as partes e quais cláusulas de penalidade/reajuste são estabelecidas?";
    console.log("👤 USUÁRIO:", q1);

    const prompt1 = `Analise o documento abaixo e responda objetivamente em formato estruturado:

[DOCUMENTO: LICITAÇÃO]
${text1}

[PERGUNTA]
${q1}`;

    const res1 = await LlmDispatcher.dispatch(
      prompt1,
      {},
      'qwen',
      false,
      "Você é um assistente jurídico sênior especializado em contratos administrativos e regramento público."
    );

    console.log("\n🤖 KOVAX AI (100% LOCAL):");
    console.log(res1.reply);
    console.log(`⏱️ Latência: ${res1.latencyMs}ms | Motor: ${res1.engineName}`);

    // Pergunta 2: Trabalhista
    console.log('\n----------------------------------------------------------------');
    console.log('💬 CONVERSA 2: Análise do Contrato Trabalhista (Doc 2)');
    console.log('----------------------------------------------------------------');
    const q2 = "Quem é o empregado, quais as regras de jornada/banco de horas e o que diz a cláusula de proteção de dados?";
    console.log("👤 USUÁRIO:", q2);

    const prompt2 = `Analise o contrato de trabalho abaixo e responda resumidamente com as partes, regras de banco de horas e proteção de dados:

[DOCUMENTO: TRABALHISTA]
${text2}

[PERGUNTA]
${q2}`;

    const res2 = await LlmDispatcher.dispatch(
      prompt2,
      {},
      'qwen',
      false,
      "Você é um advogado especialista em direito trabalhista e conformidade LGPD."
    );

    console.log("\n🤖 KOVAX AI (100% LOCAL):");
    console.log(res2.reply);
    console.log(`⏱️ Latência: ${res2.latencyMs}ms | Motor: ${res2.engineName}`);

    // Pergunta 3: Risco LGPD
    console.log('\n----------------------------------------------------------------');
    console.log('💬 CONVERSA 3: Auditoria de Risco LGPD e Parecer de Tarjamento');
    console.log('----------------------------------------------------------------');
    const q3 = "Avalie a legalidade da Cláusula 6ª do Documento 2 perante a LGPD (compartilhamento irrestrito de dados pessoais, bancários e de saúde) e indique os dados que devem ser tarjados.";
    console.log("👤 USUÁRIO:", q3);

    const prompt3 = `Analise os dados extraídos:
Documento 1 (Contrato Público): Contratante Município de Vila Nova, Contratada Tecnologia Global Ltda., Contrato 45/2026.
Documento 2 (Trabalhista): Empregado Carlos Alberto da Silva (CPF 000.000.000-00), Empregador Logística Expressa S.A., Cláusula 6ª autoriza compartilhamento irrestrito de dados pessoais, bancários e de saúde para marketing.

Elabore um parecer conciso sobre a legalidade da Cláusula 6ª perante a LGPD e quais dados devem ser tarjados.`;

    const res3 = await LlmDispatcher.dispatch(
      prompt3,
      {},
      'qwen',
      false,
      "Você é um encarregado de proteção de dados (DPO) e consultor especialista em LGPD."
    );

    console.log("\n🤖 KOVAX AI (100% LOCAL):");
    console.log(res3.reply);
    console.log(`⏱️ Latência: ${res3.latencyMs}ms | Motor: ${res3.engineName}`);

    console.log('\n================================================================');
    console.log('   BATERIA DE TESTES FINALIZADA COM SUCESSO!   ');
    console.log('================================================================');

  } finally {
    if (serverProc) {
      console.log('\nEncerrando servidor C++ local de teste...');
      serverProc.kill();
    }
  }
}

runScenario().catch(err => {
  console.error('Erro no teste:', err);
  process.exit(1);
});
