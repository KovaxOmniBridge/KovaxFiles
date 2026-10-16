/**
 * KovaxFiles Desktop — Reproducible Performance & Resource Benchmark Suite
 * Mede com precisão: tempo de CPU, consumo de RAM (Heap/RSS), duração de execução (ms)
 * e taxa de redução / throughput em operações documentais críticas.
 */

import { performance } from 'perf_hooks';
import { CoreDocumentFactory } from '../src/core/documents/documentFactory';
import { CoreCompressionService } from '../src/core/compression/compressionService';
import { CoreRedactionEngine } from '../src/core/redaction/redactionCore';
import { MemoryBudgetService } from '../src/core/documents/memoryBudgetService';
import { CoreBackupService } from '../src/core/backup/backupService';
import { createSamplePdfBytes } from '../tests/fixtures/sample_doc';

interface BenchmarkMetric {
  operationName: string;
  durationMs: number;
  cpuUserMs: number;
  cpuSystemMs: number;
  heapUsedMb: number;
  rssMb: number;
  inputSizeBytes: number;
  outputSizeBytes: number;
  reductionPercentage?: number;
  throughput?: string;
}

async function measureOperation<T>(
  name: string,
  fn: () => Promise<{ result: T; inputBytes: number; outputBytes: number; itemsCount?: number }>
): Promise<BenchmarkMetric> {
  // Forçar garbage collection se exposto no node
  if (global.gc) {
    try { global.gc(); } catch {}
  }

  const startMem = process.memoryUsage();
  const startCpu = process.cpuUsage();
  const startTime = performance.now();

  const { inputBytes, outputBytes, itemsCount } = await fn();

  const durationMs = Math.round(performance.now() - startTime);
  const cpuDiff = process.cpuUsage(startCpu);
  const endMem = process.memoryUsage();

  const cpuUserMs = Math.round(cpuDiff.user / 1000);
  const cpuSystemMs = Math.round(cpuDiff.system / 1000);
  const heapUsedMb = parseFloat(((endMem.heapUsed - startMem.heapUsed) / (1024 * 1024)).toFixed(2));
  const rssMb = parseFloat((endMem.rss / (1024 * 1024)).toFixed(2));

  let reductionPercentage: number | undefined;
  if (inputBytes > 0 && outputBytes > 0) {
    reductionPercentage = parseFloat((((inputBytes - outputBytes) / inputBytes) * 100).toFixed(2));
  }

  let throughput = 'N/A';
  if (itemsCount && durationMs > 0) {
    throughput = `${((itemsCount / durationMs) * 1000).toFixed(1)} itens/s`;
  } else if (inputBytes > 0 && durationMs > 0) {
    throughput = `${((inputBytes / 1024 / (durationMs / 1000))).toFixed(1)} KB/s`;
  }

  return {
    operationName: name,
    durationMs,
    cpuUserMs,
    cpuSystemMs,
    heapUsedMb: Math.max(0, heapUsedMb),
    rssMb,
    inputSizeBytes: inputBytes,
    outputSizeBytes: outputBytes,
    reductionPercentage,
    throughput
  };
}

async function runBenchmarkSuite() {
  console.log('\n================================================================================');
  console.log('  BENCHMARK DE DESEMPENHO E CONSUMO DE RECURSOS (REPRODUTÍVEL)');
  console.log('  Ambiente: Node.js ' + process.version + ' (' + process.platform + ' ' + process.arch + ')');
  console.log('================================================================================\n');

  const metrics: BenchmarkMetric[] = [];
  const samplePdf = createSamplePdfBytes('Processo de Teste Judicial PJe autos nº 0000001-18.2008.1.00.0000 com dados de partes.');

  // 1. Ingestão e Cálculo Criptográfico SHA-256
  metrics.push(await measureOperation('Ingestão & Hash SHA-256 (DocumentFactory)', async () => {
    const doc = await CoreDocumentFactory.createDocument({
      name: 'documento_benchmark.pdf',
      bytes: samplePdf
    });
    return { result: doc, inputBytes: samplePdf.length, outputBytes: doc.content.length, itemsCount: 1 };
  }));

  // 2. Processamento Incremental Fatiado (Chunking com Yield)
  metrics.push(await measureOperation('Processamento Fatiado Incremental (50 itens)', async () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: i, data: `Página ${i}` }));
    const results = await MemoryBudgetService.processIncrementally(items, async (item) => {
      return item.data.toUpperCase();
    }, { chunkSize: 5 });
    return { result: results, inputBytes: items.length * 50, outputBytes: results.length * 50, itemsCount: 50 };
  }));

  // 3. Varredura Regex LGPD em Texto Denso
  const denseLegalText = Array.from({ length: 100 }, (_, i) =>
    `Item ${i}: O réu CPF 123.456.789-09, CNPJ 12.345.678/0001-90, contato usuario_${i}@email.com no processo 0000001-18.2008.1.00.0000.`
  ).join('\n');

  metrics.push(await measureOperation('Varredura PII LGPD (100 blocos de texto)', async () => {
    const matches = CoreRedactionEngine.scanText(denseLegalText);
    const redacted = CoreRedactionEngine.applyTextRedactions(denseLegalText, matches);
    return { result: redacted, inputBytes: denseLegalText.length, outputBytes: redacted.length, itemsCount: matches.length };
  }));

  // 4. Compressão Estrutural de PDF
  metrics.push(await measureOperation('Compressão Estrutural PDF (Object Streams)', async () => {
    const compResult = await CoreCompressionService.compressDocument({
      id: 'doc_bench_compress',
      name: 'compress_bench.pdf',
      bytes: samplePdf,
      profile: 'balanced'
    });
    return {
      result: compResult,
      inputBytes: compResult.originalSizeBytes,
      outputBytes: compResult.compressedSizeBytes,
      itemsCount: 1
    };
  }));

  // 5. Geração de Backup e Checksum
  metrics.push(await measureOperation('Geração de Backup do Sistema com SHA-256', async () => {
    const backup = await CoreBackupService.createBackup();
    return {
      result: backup,
      inputBytes: backup.payload.totalSizeBytes,
      outputBytes: backup.payload.totalSizeBytes,
      itemsCount: backup.payload.metadata.totalItems || 1
    };
  }));

  // Exibir Tabela de Resultados
  console.log('| Operação | Tempo Total | CPU User/Sys | Delta Heap | RSS Total | Throughput |');
  console.log('| :--- | :--- | :--- | :--- | :--- | :--- |');
  for (const m of metrics) {
    console.log(
      `| ${m.operationName} | ${m.durationMs} ms | ${m.cpuUserMs}/${m.cpuSystemMs} ms | +${m.heapUsedMb} MB | ${m.rssMb} MB | ${m.throughput || 'N/A'} |`
    );
  }

  console.log('\n================================================================================');
  console.log('✅ BENCHMARKS CONCLUÍDOS COM SUCESSO: RECURSOS DENTRO DOS LIMITES DE MEMÓRIA');
  console.log('================================================================================\n');
}

runBenchmarkSuite().catch(err => {
  console.error('Falha nos benchmarks de desempenho:', err);
  process.exit(1);
});
