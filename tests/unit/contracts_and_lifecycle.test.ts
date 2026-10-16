/**
 * KovaxFiles Desktop — Unit Tests: Contracts, Operation Lifecycle & Error Categorization
 */

import {
  determineBatchStatus,
  CancellationTokenSource,
  OperationCancelledException
} from '../../src/shared/contracts/operation.types';
import {
  KovaxError,
  ValidationError,
  SecurityViolationError,
  CryptoOperationError,
  FileSystemError,
  ensureKovaxError
} from '../../src/shared/errors/kovaxErrors';
import { cryptoAdapter } from '../../src/infrastructure/crypto/cryptoAdapter';
import { CoreDocumentFactory } from '../../src/core/documents/documentFactory';
import { createSamplePdfBytes } from '../fixtures/sample_doc';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  [FAIL] ${msg}`);
    failed++;
    throw new Error(msg);
  } else {
    console.log(`  [PASS] ${msg}`);
    passed++;
  }
}

async function runUnitTests() {
  console.log('\n================================================================================');
  console.log('  TESTES UNITÁRIOS: CONTRATOS, CICLO DE VIDA E MODELOS CENTRAIS');
  console.log('================================================================================\n');

  console.log('[1/5] Testando determinação estrita de status de lote (determineBatchStatus)...');
  // Se 100% suceder: 'completed'
  assert(determineBatchStatus({ total: 5, succeeded: 5, failed: 0, canceled: 0 }) === 'completed',
    'Lote com 100% de sucesso deve retornar "completed"');

  // REGRA CRÍTICA: Se parte suceder e parte falhar: NUNCA deve ser 'completed', DEVE ser 'partial'
  assert(determineBatchStatus({ total: 5, succeeded: 3, failed: 2, canceled: 0 }) === 'partial',
    'Lote com 3 sucessos e 2 falhas DEVE retornar "partial" (nunca "completed")');

  assert(determineBatchStatus({ total: 5, succeeded: 4, failed: 0, canceled: 1 }) === 'partial',
    'Lote com 4 sucessos e 1 cancelado DEVE retornar "partial"');

  // Se todos falharem: 'failed'
  assert(determineBatchStatus({ total: 5, succeeded: 0, failed: 5, canceled: 0 }) === 'failed',
    'Lote onde todos os itens falharam deve retornar "failed"');

  // Se cancelado antes de qualquer item concluir: 'canceled'
  assert(determineBatchStatus({ total: 5, succeeded: 0, failed: 0, canceled: 5 }) === 'canceled',
    'Lote cancelado sem conclusões deve retornar "canceled"');

  console.log('\n[2/5] Testando CancellationTokenSource e cancelamento cooperativo...');
  const cts = new CancellationTokenSource();
  assert(!cts.isCancelled, 'Token inicial deve ter isCancelled=false');

  let listenerFired = false;
  cts.token.onCancel((reason) => {
    listenerFired = true;
    assert(reason === 'Teste de cancelamento', 'Motivo do cancelamento deve ser propagado');
  });

  cts.cancel('Teste de cancelamento');
  assert(cts.isCancelled, 'Após cancel(), isCancelled deve ser true');
  assert(listenerFired, 'Listener registrado em onCancel deve ter sido disparado');

  let threw = false;
  try {
    cts.throwIfCancelled();
  } catch (e: any) {
    threw = true;
    assert(e instanceof OperationCancelledException, 'throwIfCancelled deve lançar OperationCancelledException');
  }
  assert(threw, 'Exceção de cancelamento deve ter sido disparada');

  console.log('\n[3/5] Testando Categorização de Erros de Domínio (KovaxError)...');
  const valErr = new ValidationError('Campo obrigatório ausente', { field: 'name' });
  assert(valErr.code === 'ERR_VALIDATION', 'Código de ValidationError deve ser ERR_VALIDATION');
  assert(valErr.category === 'VALIDATION', 'Categoria de ValidationError deve ser VALIDATION');

  const secErr = new SecurityViolationError('Path traversal detectado');
  assert(secErr.category === 'SECURITY' && secErr.severity === 'fatal', 'SecurityViolationError deve ter categoria SECURITY e severidade fatal');

  const wrapped = ensureKovaxError(new Error('Erro nativo'));
  assert(wrapped instanceof KovaxError, 'ensureKovaxError deve empacotar Error padrão em KovaxError');

  console.log('\n[4/5] Testando Adaptador Criptográfico e Limpeza de Memória...');
  const helloHash = cryptoAdapter.computeSha256Sync('hello world');
  assert(helloHash === 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
    'Hash SHA-256 de "hello world" deve coincidir com o padrão RFC');

  const sensitiveBuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  cryptoAdapter.secureWipeBuffer(sensitiveBuffer);
  assert(sensitiveBuffer.every(b => b === 0), 'secureWipeBuffer deve preencher o array inteiramente com zeros');

  console.log('\n[5/5] Testando Core Document Factory com ID Imutável e Verificação de Integridade...');
  const samplePdf = createSamplePdfBytes('Petição Inicial');
  const docPayload = await CoreDocumentFactory.createDocument({
    name: 'peticao.pdf',
    bytes: samplePdf
  });

  assert(typeof docPayload.metadata.id === 'string' && docPayload.metadata.id.startsWith('doc_'),
    'Documento deve possuir identificador imutável com prefixo doc_');
  assert(docPayload.metadata.sha256.length === 64, 'Documento deve conter SHA-256 de 64 caracteres hex');

  const isValidIntegrity = await CoreDocumentFactory.verifyIntegrity(docPayload);
  assert(isValidIntegrity, 'Documento recém-criado deve passar na verificação de integridade');

  // Simular adulteração de byte
  const tamperedContent = new Uint8Array(docPayload.content);
  tamperedContent[tamperedContent.length - 1] = 0x00;
  const tamperedPayload = { ...docPayload, content: tamperedContent };
  const isTamperedValid = await CoreDocumentFactory.verifyIntegrity(tamperedPayload);
  assert(!isTamperedValid, 'Documento adulterado DEVE reprovar na verificação de integridade');

  console.log('\n================================================================================');
  console.log(`RESULTADO DOS TESTES UNITÁRIOS:`);
  console.log(`  Testes Passados: ${passed}`);
  console.log(`  Testes Falhados: ${failed}`);
  console.log('================================================================================\n');

  if (failed > 0) process.exit(1);
}

runUnitTests().catch(err => {
  console.error('Erro fatal nos testes unitários:', err);
  process.exit(1);
});
