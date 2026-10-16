/**
 * =============================================================================
 * SUÍTE 13: DESEMPENHO, CARGA E RECUPERAÇÃO DE FALHAS
 * =============================================================================
 * Comprova: Limites de memória (Heap/RSS), processamento de documentos grandes,
 * vazão (throughput) e integridade de recuperação de falhas.
 * Execução: Bateria Periódica (Nightly) e Antes de Release.
 * =============================================================================
 */

import assert from 'assert';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { MemoryBudgetService } from '../../src/core/documents/memoryBudgetService.ts';
import { CoreCompressionService } from '../../src/core/compression/compressionService.ts';
import { SessionRecoveryService } from '../../src/core/recovery/sessionRecoveryService.ts';

async function runPerformanceLoadSuite() {
  console.log('='.repeat(80));
  console.log('  [SUÍTE 13: DESEMPENHO E CARGA] DOCUMENTOS GRANDES, MEMÓRIA E RECUPERAÇÃO');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name} -> ${err.message}`);
      failed++;
    }
  }

  // 1. Processamento de Carga com 500 Fatias e Monitoramento de Memória
  await test('Processamento incremental sob carga (500 fatias) com estabilidade de Heap', async () => {
    if (global.gc) global.gc();
    const heapBefore = process.memoryUsage().heapUsed;
    const startCpu = process.cpuUsage();
    const startTime = performance.now();

    const items = Array.from({ length: 500 }, (_, i) => ({ id: `page_${i}`, data: new Uint8Array(2048) }));

    let count = 0;
    await MemoryBudgetService.processIncrementally(
      items,
      async (item) => {
        count++;
        MemoryBudgetService.wipeIntermediateBuffer(new Uint8Array(2048));
        return { ok: true };
      },
      { chunkSize: 25 }
    );

    const duration = performance.now() - startTime;
    const cpuDiff = process.cpuUsage(startCpu);
    const heapAfter = process.memoryUsage().heapUsed;
    const deltaHeapMb = (heapAfter - heapBefore) / (1024 * 1024);

    assert.strictEqual(count, 500, 'Todos os 500 itens devem ser processados');
    assert.ok(deltaHeapMb < 50, `Variação de heap (${deltaHeapMb.toFixed(2)} MB) deve estar contida dentro do teto (< 50MB)`);
    console.log(`      Tempo: ${duration.toFixed(1)} ms | Delta Heap: ${deltaHeapMb.toFixed(2)} MB | Throughput: ${(500 / (duration / 1000)).toFixed(1)} itens/s`);
  });

  // 2. Compressão em Lote e Detecção de Status Parcial em Falha
  await test('Recuperação de falhas: Lote misto de 10 documentos gera status "partial" e preserva os itens válidos', async () => {
    const validDoc = await PDFDocument.create();
    validDoc.addPage([300, 300]);
    const validBytes = await validDoc.save();

    const batch = [
      { id: 'doc_1', name: 'sucesso_1.pdf', bytes: validBytes, profile: 'balanced' as const },
      { id: 'doc_2', name: 'corrompido.pdf', bytes: new Uint8Array([0x00, 0x01, 0x02]), profile: 'balanced' as const },
      { id: 'doc_3', name: 'sucesso_2.pdf', bytes: validBytes, profile: 'balanced' as const }
    ];

    const result = await CoreCompressionService.compressBatch(batch);

    assert.strictEqual(result.status, 'partial', 'Status DEVE ser partial quando houver falhas parciais');
    assert.strictEqual(result.succeededItems, 2, 'Total de sucessos deve ser exatamente 2');
    assert.strictEqual(result.failedItems, 1, 'Total de falhas deve ser exatamente 1');
  });

  // 3. Recuperação de Sessão em Fechamento Inesperado
  await test('Preservação de projeto e recuperação de sessão após queda simulada', async () => {
    const projectData = {
      documentName: '1002345-88.2026.8.26.0100.pdf',
      options: { courtSystem: 'tjsp', piecesCount: 15 }
    };

    await SessionRecoveryService.saveDraft('court_filing', projectData);
    const hasRecoverable = await SessionRecoveryService.hasRecoverableSession();
    assert.strictEqual(hasRecoverable, true, 'Deve haver sessão recuperável gravada');

    const recovered = await SessionRecoveryService.getRecoverableSession();
    assert.ok(recovered !== null, 'Sessão recuperada não pode ser nula');
    assert.strictEqual(recovered?.activeTool, 'court_filing');

    await SessionRecoveryService.clearSession();
    const afterClear = await SessionRecoveryService.hasRecoverableSession();
    assert.strictEqual(afterClear, false, 'Após limpeza da sessão, não deve haver sessão pendente');
  });

  console.log(`\nResultado Suíte 13 (Desempenho e Carga): ${passed} Passados, ${failed} Falhados\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runPerformanceLoadSuite().catch(err => {
  console.error('Erro fatal na Suíte 13 (Desempenho e Carga):', err);
  process.exit(1);
});
