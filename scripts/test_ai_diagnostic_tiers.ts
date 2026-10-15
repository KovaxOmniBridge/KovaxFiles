import http from 'http';
import {
  probeAiDiagnostics,
  evaluateInstructionAdherence,
  evaluateLegalBenchmark,
  type AiDiagnosticResult
} from '../electron/aiDiagnostic.ts';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message}`);
  }
}

/**
 * Cria um servidor HTTP mock local em porta efêmera para simular os diferentes comportamentos da IA
 */
function createMockAiServer(port: number, handler: (req: http.IncomingMessage, res: http.ServerResponse) => void): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

async function runTestSuite() {
  console.log('===========================================================================');
  console.log('Iniciando Bateria de Testes dos 4 Níveis de Diagnóstico de IA Local');
  console.log('===========================================================================\n');

  // -------------------------------------------------------------------------
  // [1/6] Testes Unitários: Avaliação de Obediência à Instrução ('PRONTO')
  // -------------------------------------------------------------------------
  console.log('[1/6] Testando Obediência Estrita a Instruções (Instruction Following Test)...');
  {
    const r1 = evaluateInstructionAdherence('PRONTO', 'PRONTO');
    assert(r1.followed && r1.exactMatch, 'Palavra exata "PRONTO" deve ser aprovada com exactMatch: true');

    const r2 = evaluateInstructionAdherence('  pronto.  ', 'PRONTO');
    assert(r2.followed, 'Palavra "pronto." em minúsculas com pontuação deve ser aprovada');

    const r3 = evaluateInstructionAdherence('Sim, estou PRONTO para responder.', 'PRONTO');
    assert(r3.followed && r3.containsWord, 'Frase contendo a palavra PRONTO deve ser aprovada');

    const r4 = evaluateInstructionAdherence('Olá, sou a inteligência artificial jurídica.', 'PRONTO');
    assert(!r4.followed, 'Texto arbitrário sem a palavra solicitada deve ser rejeitado');

    const r5 = evaluateInstructionAdherence('', 'PRONTO');
    assert(!r5.followed, 'String vazia deve ser sumariamente rejeitada');

    const r6 = evaluateInstructionAdherence('OK', 'PRONTO');
    assert(!r6.followed, 'Outra palavra afirmativa ("OK") deve ser rejeitada quando solicitou "PRONTO"');
  }

  // -------------------------------------------------------------------------
  // [2/6] Testes Unitários: Benchmark de Qualidade Jurídica (CLT / Trabalhista)
  // -------------------------------------------------------------------------
  console.log('\n[2/6] Testando Benchmark de Qualidade e Competência Jurídica...');
  {
    const b1 = evaluateLegalBenchmark(
      'Trata-se de matéria de Direito Trabalhista regida pela CLT (Consolidação das Leis do Trabalho).',
      'Pergunta sobre verbas rescisórias e horas extras',
      120
    );
    assert(b1.passed && b1.score === 100, 'Resposta contendo "Trabalhista" e "CLT" deve obter score 100 e status passed: true');
    assert(b1.methodologyDisclaimer.includes('smoke test preliminar'), 'Benchmark deve conter aviso metodológico explicando limitações do teste preliminar');

    const b2 = evaluateLegalBenchmark(
      'As relações de trabalho são fundamentais para o desenvolvimento econômico.',
      'Pergunta sobre verbas rescisórias e horas extras',
      150
    );
    assert(!b2.passed && b2.score === 50, 'Resposta contendo apenas menção a "trabalho" sem citar a CLT deve obter score parcial (50/100) e reprovar homologação');

    const b3 = evaluateLegalBenchmark(
      'O direito tributário é regulado pelo Código Tributário Nacional (CTN).',
      'Pergunta sobre verbas rescisórias e horas extras',
      200
    );
    assert(!b3.passed && b3.score === 0, 'Resposta juridicamente incorreta (Tributário/CTN) deve obter score 0/100');
  }

  // -------------------------------------------------------------------------
  // [3/6] Diagnóstico E2E: Cenário 1 - Servidor Offline (Porta Fechada)
  // -------------------------------------------------------------------------
  console.log('\n[3/6] Testando Cenário de Servidor Offline (Porta Inacessível)...');
  {
    // Porta 19991 intencionalmente não alocada
    const res = await probeAiDiagnostics({
      port: 19991,
      healthTimeoutMs: 500,
      modelsTimeoutMs: 500,
      inferenceTimeoutMs: 500
    });

    assert(res.tier === 'offline', 'Status deve ser classificado como tier: "offline"');
    assert(!res.serverAvailable, 'serverAvailable deve ser false');
    assert(!res.modelLoaded, 'modelLoaded deve ser false');
    assert(!res.inferenceFunctional, 'inferenceFunctional deve ser false');
    assert(!res.basicLegalSmokeTestPassed, 'basicLegalSmokeTestPassed deve ser false');
    assert(!res.legalQualityValidated, 'legalQualityValidated deve ser false');
    assert(!res.running, 'running deve ser false quando servidor está offline');
  }

  // -------------------------------------------------------------------------
  // [4/6] Diagnóstico E2E: Cenário 2 - Servidor Ativo sem Modelos Carregados
  // -------------------------------------------------------------------------
  console.log('\n[4/6] Testando Cenário de Servidor HTTP Ativo sem Modelos Carregados...');
  {
    const testPort = 19992;
    const server = await createMockAiServer(testPort, (req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } else if (req.url === '/v1/models') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ object: 'list', data: [] })); // Sem modelos
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    const res = await probeAiDiagnostics({
      port: testPort,
      healthTimeoutMs: 1000,
      modelsTimeoutMs: 1000
    });

    assert(res.tier === 'server_available', 'tier deve ser "server_available"');
    assert(res.serverAvailable === true, 'Nível 1 (serverAvailable) deve ser true');
    assert(res.modelLoaded === false, 'Nível 2 (modelLoaded) deve ser false');
    assert(res.inferenceFunctional === false, 'Nível 3 (inferenceFunctional) deve ser false');
    assert(res.basicLegalSmokeTestPassed === false, 'Nível 4 (basicLegalSmokeTestPassed) deve ser false');
    assert(res.legalQualityValidated === false, 'Nível 4 (legalQualityValidated) deve ser false');
    assert(!res.running, 'running deve ser false quando não há modelos em memória');

    await new Promise((r) => server.close(r));
  }

  // -------------------------------------------------------------------------
  // [5/6] Diagnóstico E2E: Cenário 3 - Cold-Start / Aquecimento Inicial
  // -------------------------------------------------------------------------
  console.log('\n[5/6] Testando Cenário de Cold-Start / Aquecimento Inicial de Modelo Lento...');
  {
    const testPort = 19993;
    const server = await createMockAiServer(testPort, (req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } else if (req.url === '/v1/models') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          data: [{ id: 'KovaxLegal-8B-Q4_K_M', object: 'model' }]
        }));
      } else if (req.url === '/v1/chat/completions') {
        // Simula modelo demorando para compilar tensores / cold-start
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            choices: [{ message: { content: 'PRONTO' } }]
          }));
        }, 1500); // Demora 1500ms
      }
    });

    // Testamos com timeout de inferência curto (400ms) para forçar detecção de cold-start
    const res = await probeAiDiagnostics({
      port: testPort,
      healthTimeoutMs: 500,
      modelsTimeoutMs: 500,
      inferenceTimeoutMs: 400
    });

    assert(res.serverAvailable === true, 'serverAvailable deve ser true mesmo durante cold start');
    assert(res.modelLoaded === true, 'modelLoaded deve ser true');
    assert(res.isWarmingUp === true, 'isWarmingUp deve ser true quando requisição atinge timeout de aquecimento');
    assert(res.tier === 'warming_up', 'tier deve ser classificado como "warming_up" (e NÃO offline!)');
    assert(res.modelName === 'KovaxLegal-8B-Q4_K_M', 'Nome do modelo deve ser preservado');

    await new Promise((r) => server.close(r));
  }

  // -------------------------------------------------------------------------
  // [6/6] Diagnóstico E2E: Cenários de Validação de Instrução vs Homologação Jurídica
  // -------------------------------------------------------------------------
  console.log('\n[6/6] Testando Distinção entre Inferência Básica vs Homologação Jurídica Completa...');
  {
    const testPort = 19994;
    let requestCount = 0;

    const server = await createMockAiServer(testPort, (req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } else if (req.url === '/v1/models') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          data: [{ id: 'KovaxLegal-8B-Juridico', object: 'model' }]
        }));
      } else if (req.url === '/v1/chat/completions') {
        requestCount++;
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          const json = JSON.parse(body);
          const isInstructionTest = json.messages.some((m: any) => m.content.includes('PRONTO'));

          if (isInstructionTest) {
            // Responde estritamente PRONTO
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              choices: [{ message: { content: 'PRONTO' } }]
            }));
          } else {
            // Benchmark Jurídico: responde com conceitos do Direito do Trabalho e CLT
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              choices: [{ message: { content: 'O ramo é o Direito Trabalhista e o diploma aplicável é a CLT.' } }]
            }));
          }
        });
      }
    });

    const res = await probeAiDiagnostics({
      port: testPort,
      healthTimeoutMs: 1000,
      modelsTimeoutMs: 1000,
      inferenceTimeoutMs: 2000
    });

    assert(res.serverAvailable === true, 'Nível 1 (serverAvailable): true');
    assert(res.modelLoaded === true, 'Nível 2 (modelLoaded): true');
    assert(res.inferenceFunctional === true, 'Nível 3 (inferenceFunctional): true (obediência confirmada)');
    assert(res.instructionTest?.followed === true, 'instructionTest.followed deve ser true');
    assert(res.basicLegalSmokeTestPassed === true, 'Nível 4 (basicLegalSmokeTestPassed): true');
    assert(res.legalQualityValidated === false, 'legalQualityValidated deve ser false (expressão reservada para avaliação com profissionais)');
    assert(res.legalBenchmark?.score === 100, 'legalBenchmark.score deve ser 100');
    assert(res.legalBenchmark?.methodologyDisclaimer.includes('smoke test preliminar'), 'Aviso metodológico deve estar presente');
    assert(res.tier === 'basic_legal_smoke_test_passed', 'tier deve ser "basic_legal_smoke_test_passed"');
    assert(res.running === true, 'running deve ser true quando Nível 3 e Nível 4 são satisfeitos');

    await new Promise((r) => server.close(r));
  }

  // Cenário de falha na instrução (modelo não obedece e responde texto arbitrário)
  {
    const testPort = 19995;
    const server = await createMockAiServer(testPort, (req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } else if (req.url === '/v1/models') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          data: [{ id: 'GenericModel-Unaligned', object: 'model' }]
        }));
      } else if (req.url === '/v1/chat/completions') {
        // Responde sem seguir a instrução
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          choices: [{ message: { content: 'Eu sou um robô e não vou falar a palavra pedida.' } }]
        }));
      }
    });

    const res = await probeAiDiagnostics({
      port: testPort,
      healthTimeoutMs: 1000,
      modelsTimeoutMs: 1000,
      inferenceTimeoutMs: 2000
    });

    assert(res.serverAvailable === true, 'serverAvailable deve ser true');
    assert(res.modelLoaded === true, 'modelLoaded deve ser true');
    assert(res.inferenceFunctional === false, 'inferenceFunctional deve ser FALSE quando a palavra PRONTO não é obedecida');
    assert(res.instructionTest?.followed === false, 'instructionTest.followed deve ser false');
    assert(res.basicLegalSmokeTestPassed === false, 'basicLegalSmokeTestPassed não pode ser true');
    assert(res.legalQualityValidated === false, 'legalQualityValidated não pode ser true');
    assert(res.tier === 'model_loaded', 'tier deve permanecer como "model_loaded"');
    assert(!res.running, 'running deve ser false quando a instrução falha');

    await new Promise((r) => server.close(r));
  }

  console.log('\n===========================================================================');
  console.log('Resultado da Bateria de Diagnóstico de IA:');
  console.log(`  Sucessos: ${passedTests}`);
  console.log(`  Falhas:   ${failedTests}`);
  console.log('===========================================================================');

  if (failedTests > 0) {
    process.exitCode = 1;
  }
}

runTestSuite().catch((err) => {
  console.error('Erro fatal durante a bateria de testes de IA:', err);
  process.exitCode = 1;
});
