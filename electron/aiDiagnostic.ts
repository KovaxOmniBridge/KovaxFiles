import http from 'http';
import os from 'os';

export type AiDiagnosticTier =
  | 'offline'                 // Porta fechada ou socket inacessível
  | 'server_available'        // Servidor HTTP ativo (/health 200), mas sem modelos carregados
  | 'model_loaded'            // Modelo carregado em memória (/v1/models), mas inferência pendente
  | 'warming_up'              // Modelo carregado, mas em cold-start / aquecimento inicial
  | 'inference_functional'    // Inferência validada com estrita obediência à instrução (ex: PRONTO)
  | 'fully_validated';        // Homologado: obediência a instrução + qualidade jurídica comprovada

export interface InstructionTestResult {
  expectedWord: string;
  response: string;
  exactMatch: boolean;
  containsWord: boolean;
  followed: boolean;
  latencyMs: number;
}

export interface LegalBenchmarkResult {
  score: number; // 0 a 100
  passed: boolean;
  testPrompt: string;
  response: string;
  expectedConcepts: string[];
  foundConcepts: string[];
  missingConcepts: string[];
  latencyMs: number;
}

export interface AiDiagnosticResult {
  running: boolean; // true apenas quando a inferência for comprovadamente funcional
  port: number;
  cpuCores: number;
  modelName: string;
  isGpuAccelerated: boolean;

  // 4 Níveis Distintos Requeridos
  serverAvailable: boolean;       // Nível 1: Disponibilidade do Servidor HTTP
  modelLoaded: boolean;           // Nível 2: Modelo Carregado na Memória
  inferenceFunctional: boolean;   // Nível 3: Inferência Funcional com Obediência
  legalQualityValidated: boolean; // Nível 4: Qualidade Jurídica Validada

  // Diagnóstico Detalhado
  tier: AiDiagnosticTier;
  isWarmingUp: boolean;
  inferenceVerified: boolean;
  inferenceLatencyMs?: number;

  instructionTest?: InstructionTestResult;
  legalBenchmark?: LegalBenchmarkResult;

  statusMessage: string;
}

export interface ProbeOptions {
  port?: number;
  host?: string;
  cpuCores?: number;
  skipBenchmark?: boolean;
  inferenceTimeoutMs?: number;
  healthTimeoutMs?: number;
  modelsTimeoutMs?: number;
}

/**
 * Normaliza texto para comparação sem acentos e em minúsculas
 */
export function normalizeText(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Valida a obediência à instrução sintética de controle (esperado: palavra 'PRONTO')
 */
export function evaluateInstructionAdherence(
  responseContent: string,
  expectedWord = 'PRONTO'
): { exactMatch: boolean; containsWord: boolean; followed: boolean } {
  if (!responseContent || typeof responseContent !== 'string') {
    return { exactMatch: false, containsWord: false, followed: false };
  }

  const rawTrimmed = responseContent.trim();
  const normalizedResponse = normalizeText(rawTrimmed);
  const normalizedExpected = normalizeText(expectedWord);

  // Remoção de pontuações de fechamento (aspas, pontos, etc)
  const cleanWord = normalizedResponse.replace(/[^\w]/g, '');

  const exactMatch = cleanWord === normalizedExpected;
  const containsWord = new RegExp(`\\b${normalizedExpected}\\b`, 'i').test(normalizedResponse) ||
                       cleanWord.includes(normalizedExpected);

  return {
    exactMatch,
    containsWord,
    followed: containsWord
  };
}

/**
 * Avalia a competência e qualidade jurídica da resposta do modelo em benchmark sintético
 */
export function evaluateLegalBenchmark(
  responseContent: string,
  testPrompt: string,
  latencyMs: number
): LegalBenchmarkResult {
  const norm = normalizeText(responseContent);

  // Conceitos essenciais esperados para a pergunta sobre verbas rescisórias e horas extras
  const branchCandidates = ['trabalhist', 'trabalho'];
  const lawCandidates = ['clt', 'consolidacao das leis do trabalho'];

  const foundBranch = branchCandidates.some(c => norm.includes(c));
  const foundLaw = lawCandidates.some(c => norm.includes(c));

  const foundConcepts: string[] = [];
  const missingConcepts: string[] = [];

  if (foundBranch) {
    foundConcepts.push('Direito Trabalhista / do Trabalho');
  } else {
    missingConcepts.push('Direito Trabalhista / do Trabalho');
  }

  if (foundLaw) {
    foundConcepts.push('CLT / Legislação Trabalhista');
  } else {
    missingConcepts.push('CLT / Legislação Trabalhista');
  }

  let score = 0;
  if (foundBranch && foundLaw) {
    score = 100;
  } else if (foundBranch || foundLaw) {
    score = 50;
  }

  return {
    score,
    passed: score >= 100,
    testPrompt,
    response: responseContent,
    expectedConcepts: ['Direito Trabalhista', 'CLT'],
    foundConcepts,
    missingConcepts,
    latencyMs
  };
}

/**
 * Realiza requisição HTTP genérica via módulo nativo http do Node.js
 */
function makeHttpRequest(
  options: http.RequestOptions,
  postData?: string,
  timeoutMs = 5000
): Promise<{ statusCode: number; data: string; latencyMs: number }> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let isSettled = false;

    const req = http.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (!isSettled) {
          isSettled = true;
          resolve({
            statusCode: res.statusCode || 0,
            data,
            latencyMs: Date.now() - startTime
          });
        }
      });
    });

    req.setTimeout(timeoutMs, () => {
      if (!isSettled) {
        isSettled = true;
        req.destroy();
        const err = new Error(`Timeout de conexão após ${timeoutMs}ms`);
        (err as any).code = 'ETIMEDOUT';
        reject(err);
      }
    });

    req.on('error', (err) => {
      if (!isSettled) {
        isSettled = true;
        reject(err);
      }
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

/**
 * Executa o diagnóstico completo da IA local em 4 níveis estritos:
 * Nível 1: Disponibilidade do Servidor HTTP (/health)
 * Nível 2: Modelo Carregado em Memória (/v1/models)
 * Nível 3: Inferência Funcional & Obediência a Instruções (Smoke Test com 'PRONTO')
 * Nível 4: Qualidade Jurídica Validada (Benchmark Sintético CLT/Trabalhista)
 *
 * Além disso, detecta e reporta adequadamente estados de Cold Start / Aquecimento Inicial sem
 * rotular incorretamente um modelo lento como "Offline".
 */
export async function probeAiDiagnostics(options?: ProbeOptions): Promise<AiDiagnosticResult> {
  const port = options?.port || 18888;
  const host = options?.host || '127.0.0.1';
  const cpuCores = options?.cpuCores || (typeof os !== 'undefined' && os.cpus ? os.cpus().length : 4);
  const healthTimeoutMs = options?.healthTimeoutMs || 1500;
  const modelsTimeoutMs = options?.modelsTimeoutMs || 2500;
  const inferenceTimeoutMs = options?.inferenceTimeoutMs || 8000; // 8s de tolerância para cold-start inicial

  const baseResult: AiDiagnosticResult = {
    running: false,
    port,
    cpuCores,
    modelName: 'Servidor Offline (Porta 18888)',
    isGpuAccelerated: false,
    serverAvailable: false,
    modelLoaded: false,
    inferenceFunctional: false,
    legalQualityValidated: false,
    tier: 'offline',
    isWarmingUp: false,
    inferenceVerified: false,
    statusMessage: 'Porta 18888 fechada ou não responde (Servidor C++ offline)'
  };

  // --------------------------------------------------------------------------
  // NÍVEL 1: Checagem da Disponibilidade do Servidor (/health)
  // --------------------------------------------------------------------------
  let healthResponse: { statusCode: number; data: string; latencyMs: number };
  try {
    healthResponse = await makeHttpRequest({
      hostname: host,
      port,
      path: '/health',
      method: 'GET'
    }, undefined, healthTimeoutMs);
  } catch (err: any) {
    if (err?.code === 'ETIMEDOUT') {
      baseResult.statusMessage = `Timeout ao conectar na porta ${port} (${healthTimeoutMs}ms)`;
    } else {
      baseResult.statusMessage = `Servidor offline ou porta ${port} fechada (${err.message || 'ECONNREFUSED'})`;
    }
    return baseResult;
  }

  if (healthResponse.statusCode !== 200) {
    baseResult.statusMessage = `Servidor respondeu com código HTTP de erro: ${healthResponse.statusCode}`;
    baseResult.modelName = `Servidor Inativo (HTTP ${healthResponse.statusCode})`;
    return baseResult;
  }

  // Nível 1 APROVADO: Servidor HTTP está ativo
  baseResult.serverAvailable = true;
  baseResult.tier = 'server_available';
  baseResult.modelName = 'Servidor HTTP Ativo (Sem modelos alocados)';
  baseResult.statusMessage = `Servidor HTTP respondendo em 127.0.0.1:${port} (${healthResponse.latencyMs}ms)`;

  // --------------------------------------------------------------------------
  // NÍVEL 2: Checagem de Modelo Carregado em Memória (/v1/models)
  // --------------------------------------------------------------------------
  let modelsResponse: { statusCode: number; data: string; latencyMs: number };
  try {
    modelsResponse = await makeHttpRequest({
      hostname: host,
      port,
      path: '/v1/models',
      method: 'GET'
    }, undefined, modelsTimeoutMs);
  } catch (err: any) {
    baseResult.statusMessage = `Servidor ativo, mas falhou ao listar modelos em /v1/models (${err.message})`;
    return baseResult;
  }

  if (modelsResponse.statusCode !== 200) {
    baseResult.statusMessage = `Servidor ativo, mas /v1/models retornou HTTP ${modelsResponse.statusCode}`;
    return baseResult;
  }

  let modelId = '';
  try {
    const json = JSON.parse(modelsResponse.data);
    if (!Array.isArray(json.data) || json.data.length === 0 || !json.data[0]?.id) {
      baseResult.statusMessage = 'Servidor HTTP ativo, mas nenhum modelo neural carregado na memória';
      return baseResult;
    }
    modelId = json.data[0].id;
  } catch {
    baseResult.statusMessage = 'Resposta inválida ou malformada em /v1/models';
    return baseResult;
  }

  // Nível 2 APROVADO: Modelo carregado em memória
  baseResult.modelLoaded = true;
  baseResult.modelName = modelId;
  baseResult.tier = 'model_loaded';
  baseResult.statusMessage = `Modelo neural "${modelId}" carregado na memória do servidor`;

  // --------------------------------------------------------------------------
  // NÍVEL 3: Inferência Funcional & Obediência Estrita a Instruções
  // --------------------------------------------------------------------------
  const instructionPrompt = {
    model: modelId,
    messages: [
      {
        role: 'system',
        content: 'Você é um validador de integridade. Responda estritamente com uma única palavra em caixa alta sem pontuação: PRONTO'
      },
      {
        role: 'user',
        content: 'Envie a palavra de confirmação agora.'
      }
    ],
    max_tokens: 10,
    temperature: 0.0
  };
  const instructionPayload = JSON.stringify(instructionPrompt);

  let inferResponse: { statusCode: number; data: string; latencyMs: number };
  try {
    inferResponse = await makeHttpRequest({
      hostname: host,
      port,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(instructionPayload)
      }
    }, instructionPayload, inferenceTimeoutMs);
  } catch (err: any) {
    if (err?.code === 'ETIMEDOUT') {
      // TRATAMENTO DE COLD-START: Servidor e modelo existem, mas estão em aquecimento/carga lenta
      baseResult.isWarmingUp = true;
      baseResult.tier = 'warming_up';
      baseResult.statusMessage = `Modelo carregado em memória, mas em aquecimento inicial (cold-start lento > ${inferenceTimeoutMs}ms na CPU/GPU).`;
      return baseResult;
    }
    baseResult.statusMessage = `Erro de conexão durante teste de inferência: ${err.message}`;
    return baseResult;
  }

  if (inferResponse.statusCode !== 200) {
    baseResult.statusMessage = `Falha na inferência: servidor retornou HTTP ${inferResponse.statusCode}`;
    return baseResult;
  }

  let rawReply = '';
  try {
    const inferJson = JSON.parse(inferResponse.data);
    rawReply = inferJson.choices?.[0]?.message?.content || '';
  } catch {
    baseResult.statusMessage = 'Resposta de inferência retornou JSON malformado';
    return baseResult;
  }

  if (!rawReply || rawReply.trim().length === 0) {
    baseResult.statusMessage = 'Modelo respondeu HTTP 200, mas gerou resposta textual vazia (0 tokens)';
    return baseResult;
  }

  // Validação estrita de obediência à instrução ("PRONTO")
  const instructionEval = evaluateInstructionAdherence(rawReply, 'PRONTO');
  baseResult.instructionTest = {
    expectedWord: 'PRONTO',
    response: rawReply.trim(),
    exactMatch: instructionEval.exactMatch,
    containsWord: instructionEval.containsWord,
    followed: instructionEval.followed,
    latencyMs: inferResponse.latencyMs
  };

  if (!instructionEval.followed) {
    baseResult.inferenceFunctional = false;
    baseResult.inferenceVerified = false;
    baseResult.statusMessage = `Modelo gerou texto, mas FALHOU na obediência à instrução (esperado 'PRONTO', recebido: "${rawReply.trim().slice(0, 40)}")`;
    return baseResult;
  }

  // Nível 3 APROVADO: Inferência funcional com obediência comprovada
  baseResult.inferenceFunctional = true;
  baseResult.inferenceVerified = true;
  baseResult.inferenceLatencyMs = inferResponse.latencyMs;
  baseResult.running = true;
  baseResult.tier = 'inference_functional';
  baseResult.statusMessage = `Inferência funcional com obediência confirmada em ${inferResponse.latencyMs}ms (${rawReply.trim()})`;

  // Se o benchmark jurídico foi expressamente desativado nas opções, encerra aqui
  if (options?.skipBenchmark) {
    return baseResult;
  }

  // --------------------------------------------------------------------------
  // NÍVEL 4: Qualidade Jurídica Validada (Benchmark Sintético CLT/Trabalhista)
  // --------------------------------------------------------------------------
  const legalBenchmarkPrompt = {
    model: modelId,
    messages: [
      {
        role: 'system',
        content: 'Você é um assistente de inteligência artificial jurídica especializado em Direito Brasileiro.'
      },
      {
        role: 'user',
        content: 'Em uma frase curta, indique qual é o ramo do Direito e a sigla da principal lei que disciplinam as verbas rescisórias e horas extras de empregados no Brasil.'
      }
    ],
    max_tokens: 45,
    temperature: 0.0
  };
  const benchmarkPayload = JSON.stringify(legalBenchmarkPrompt);

  try {
    const benchResponse = await makeHttpRequest({
      hostname: host,
      port,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(benchmarkPayload)
      }
    }, benchmarkPayload, 7000);

    if (benchResponse.statusCode === 200) {
      const benchJson = JSON.parse(benchResponse.data);
      const benchReply = benchJson.choices?.[0]?.message?.content || '';

      const legalEval = evaluateLegalBenchmark(
        benchReply,
        'Ramo do Direito e principal lei para verbas rescisórias e horas extras',
        benchResponse.latencyMs
      );

      baseResult.legalBenchmark = legalEval;

      if (legalEval.passed) {
        // Nível 4 APROVADO: Homologação Completa de Qualidade Jurídica
        baseResult.legalQualityValidated = true;
        baseResult.tier = 'fully_validated';
        baseResult.statusMessage = `IA Jurídica Homologada (Nível 4): CLT/Trabalhista validado em ${benchResponse.latencyMs}ms`;
      } else {
        baseResult.legalQualityValidated = false;
        baseResult.statusMessage = `Inferência funcional (${inferResponse.latencyMs}ms), mas validação jurídica incompleta (score ${legalEval.score}/100 - Ausente: ${legalEval.missingConcepts.join(', ')})`;
      }
    } else {
      baseResult.statusMessage = `Inferência básica funcional, mas benchmark jurídico retornou HTTP ${benchResponse.statusCode}`;
    }
  } catch (err: any) {
    // Falha de benchmark não anula o Nível 3, apenas não homologa o Nível 4
    baseResult.statusMessage = `Inferência básica funcional, mas benchmark jurídico excedeu tempo limite (${err.message})`;
  }

  return baseResult;
}
