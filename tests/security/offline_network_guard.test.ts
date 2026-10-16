/**
 * KovaxFiles Desktop — Security Test: Air-Gapped 100% Offline Network Guard
 * Valida que o aplicativo opera com estrito isolamento de rede desde a primeira execução:
 * - Nenhuma requisição a CDNs (jsdelivr, unpkg, cdnjs, etc.)
 * - Nenhuma requisição a serviços do Google (fontes, telemetria)
 * - Validação de integridade física de todos os assets locais do Tesseract (WASM, workers e por.traineddata)
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { getOfflineWorkerOptions, getTessdataBasePath } from '../../src/services/tesseractOfflineConfig';
import { CoreLegalCorpusService } from '../../src/core/legal-corpus/legalCorpusCore';
import { CoreCompressionService } from '../../src/core/compression/compressionService';
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

async function runOfflineNetworkGuardTest() {
  console.log('\n================================================================================');
  console.log('  TESTE DE SEGURANÇA E REDE: OPERAÇÃO 100% OFFLINE (AIR-GAPPED COMPLIANCE)');
  console.log('================================================================================\n');

  // 1. Armadilha de Rede: Intercepta qualquer tentativa de requisição HTTP/HTTPS externa
  const interceptedRequests: string[] = [];

  const originalHttpRequest = http.request;
  const originalHttpsRequest = https.request;

  const interceptor = (protocol: string, originalFn: any) => {
    return (options: any, callback?: any) => {
      const targetHost = typeof options === 'string' ? options : (options.host || options.hostname || 'unknown');
      interceptedRequests.push(`${protocol}://${targetHost}`);
      throw new Error(`[Air-Gapped Violation] Tentativa de conexão externa bloqueada para: ${targetHost}`);
    };
  };

  (http as any).request = interceptor('http', originalHttpRequest);
  (https as any).request = interceptor('https', originalHttpsRequest);

  try {
    console.log('[1/4] Auditando integridade física dos assets offline empacotados em public/tessdata...');
    const tessDir = path.join(process.cwd(), 'public', 'tessdata');
    assert(fs.existsSync(tessDir), 'Diretório public/tessdata deve existir no pacote da aplicação');

    const requiredAssets = [
      'por.traineddata',
      'worker.min.js',
      'tesseract-core-lstm.wasm.js',
      'tesseract-core-lstm.wasm',
      'tesseract-core-simd-lstm.wasm.js',
      'tesseract-core-simd-lstm.wasm'
    ];

    for (const asset of requiredAssets) {
      const assetPath = path.join(tessDir, asset);
      assert(fs.existsSync(assetPath), `Ativo offline obrigatório "${asset}" deve estar presente localmente`);
      const size = fs.statSync(assetPath).size;
      assert(size > 1000, `Ativo offline "${asset}" não pode estar vazio (tamanho: ${size} bytes)`);
    }

    console.log('\n[2/4] Verificando configuração do motor Tesseract para isolamento de rede...');
    const workerOptions = getOfflineWorkerOptions();
    assert(workerOptions.workerPath !== undefined && !workerOptions.workerPath.includes('http'),
      'workerPath do Tesseract não pode apontar para CDN remoto na internet');
    assert(workerOptions.corePath !== undefined && !workerOptions.corePath.includes('http'),
      'corePath do Tesseract não pode apontar para CDN remoto');
    assert(workerOptions.langPath !== undefined && !workerOptions.langPath.includes('http'),
      'langPath do Tesseract não pode apontar para repositório externo');

    console.log('\n[3/4] Executando busca no acervo jurídico e compressão em ambiente desconectado...');
    const results = CoreLegalCorpusService.search('FGTS');
    assert(results.length > 0, 'Busca jurídica deve responder instantaneamente a partir do acervo local');

    const samplePdf = createSamplePdfBytes('Documento Seguro 100% Local');
    const compResult = await CoreCompressionService.compressDocument({
      id: 'doc_offline_test',
      name: 'teste_offline.pdf',
      bytes: samplePdf,
      profile: 'balanced'
    });
    assert(compResult.outputBytes.length > 0, 'Compressão de PDF deve concluir sem tocar na rede');

    console.log('\n[4/4] Verificando ausência absoluta de tentativas de conexão externa...');
    assert(interceptedRequests.length === 0,
      `Nenhuma requisição externa foi emitida durante o ciclo de inicialização e execução (Total: ${interceptedRequests.length})`);

  } finally {
    // Restaurar handlers originais
    (http as any).request = originalHttpRequest;
    (https as any).request = originalHttpsRequest;
  }

  console.log('\n================================================================================');
  console.log(`RESULTADO DO TESTE DE REDE OFFLINE:`);
  console.log(`  Testes Passados: ${passed}`);
  console.log(`  Testes Falhados: ${failed}`);
  console.log('================================================================================\n');

  if (failed > 0) process.exit(1);
}

runOfflineNetworkGuardTest().catch(err => {
  console.error('Erro fatal no teste de rede offline:', err);
  process.exit(1);
});
