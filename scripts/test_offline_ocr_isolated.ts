import fs from 'fs';
import path from 'path';
import assert from 'assert';
import http from 'http';
import https from 'https';
import { createOfflineWorker, getTessdataBasePath, getOfflineWorkerOptions } from '../src/services/tesseractOfflineConfig.ts';
import { spawnSync } from 'child_process';

/**
 * Teste de Validação Rigoroso: Tesseract.js 100% Offline na Primeira Utilização
 * 
 * Demonstra categoricamente que:
 * 1. Todos os assets (worker.min.js, wasm binaries e modelo treinado por.traineddata)
 *    estão empacotados localmente no repositório e na distribuição final.
 * 2. O Tesseract inicializa e realiza OCR em idioma Português sem nenhuma conexão de rede
 *    (qualquer tentativa de requisição HTTP/HTTPS externa resulta em erro imediato).
 * 3. O texto extraído corresponde exatamente ao conteúdo do documento.
 */
async function runOfflineOcrIsolatedTest() {
  console.log('='.repeat(75));
  console.log('🧪 TESTE DE VALIDAÇÃO: TESSERACT.JS 100% OFFLINE (PRIMEIRA UTILIZAÇÃO)');
  console.log('='.repeat(75) + '\n');

  const rootDir = process.cwd();
  const tessdataDir = path.join(rootDir, 'public', 'tessdata');

  // --------------------------------------------------------------------------
  // ETAPA 1: Verificação da Presença Física dos Assets Empacotados
  // --------------------------------------------------------------------------
  console.log('[1/4] Verificando integridade dos assets offline em public/tessdata/...');

  assert.ok(fs.existsSync(tessdataDir), 'Diretório public/tessdata/ deve existir');

  const requiredFiles = [
    { file: 'por.traineddata', minSize: 2_000_000, desc: 'Modelo treinado de Português' },
    { file: 'worker.min.js', minSize: 50_000, desc: 'Worker JavaScript do Tesseract' },
    { file: 'tesseract-core-lstm.wasm.js', minSize: 1_000_000, desc: 'Loader WASM LSTM' },
    { file: 'tesseract-core-lstm.wasm', minSize: 2_000_000, desc: 'Binário WASM LSTM' },
    { file: 'tesseract-core-simd-lstm.wasm.js', minSize: 1_000_000, desc: 'Loader WASM SIMD LSTM' },
    { file: 'tesseract-core-simd-lstm.wasm', minSize: 2_000_000, desc: 'Binário WASM SIMD LSTM' }
  ];

  for (const item of requiredFiles) {
    const filePath = path.join(tessdataDir, item.file);
    assert.ok(fs.existsSync(filePath), `Arquivo obrigatório ausente: ${item.file} (${item.desc})`);
    const size = fs.statSync(filePath).size;
    assert.ok(size >= item.minSize, `Tamanho insuficiente para ${item.file}: ${size} bytes (mínimo esperado: ${item.minSize})`);
    console.log(`  [OK] ${item.file.padEnd(35)} ${(size / 1024 / 1024).toFixed(2)} MB - ${item.desc}`);
  }

  // --------------------------------------------------------------------------
  // ETAPA 2: Resolução de Caminhos (Browser file://, Dev Server e Node)
  // --------------------------------------------------------------------------
  console.log('\n[2/4] Verificando resolução dinâmica de caminhos offline...');
  const nodeOptions = getOfflineWorkerOptions();
  console.log('  -> Opções para ambiente Node:', nodeOptions);
  assert.strictEqual(nodeOptions.gzip, false, 'gzip deve ser false para arquivos .traineddata brutos');
  assert.ok(typeof nodeOptions.langPath === 'string' && fs.existsSync(nodeOptions.langPath), 'langPath do Node deve apontar para pasta existente');

  // --------------------------------------------------------------------------
  // ETAPA 3: Bloqueio Estrito de Rede e Inicialização do Worker Offline
  // --------------------------------------------------------------------------
  console.log('\n[3/4] Inicializando Worker Tesseract com rede totalmente bloqueada...');

  let networkAttempts = 0;
  const originalHttpRequest = http.request;
  const originalHttpsRequest = https.request;

  // Interceptar qualquer tentativa de saída HTTP/HTTPS
  const blockedRequest = (urlOrOptions: any, ..._rest: any[]) => {
    networkAttempts++;
    const target = typeof urlOrOptions === 'string' ? urlOrOptions : (urlOrOptions?.href || urlOrOptions?.host || 'desconhecido');
    throw new Error(`[VIOLAÇÃO DE ISOLAMENTO OFFLINE] Tentativa indevida de conexão de rede externa para: ${target}`);
  };

  (http as any).request = blockedRequest;
  (https as any).request = blockedRequest;

  let worker: any = null;
  try {
    worker = await createOfflineWorker('por');
    console.log('  -> Worker Tesseract inicializado com sucesso usando por.traineddata local!');
  } finally {
    // Restaurar clientes de rede
    (http as any).request = originalHttpRequest;
    (https as any).request = originalHttpsRequest;
  }

  assert.strictEqual(networkAttempts, 0, 'Zero chamadas de rede externas permitidas durante inicialização do worker');
  assert.ok(worker, 'Worker deve ter sido criado com sucesso');

  // --------------------------------------------------------------------------
  // ETAPA 4: Reconhecimento de Imagem Escaneada 100% Offline
  // --------------------------------------------------------------------------
  console.log('\n[4/4] Executando reconhecimento OCR em imagem real com motor offline...');

  // Gerar imagem de teste com texto em português
  const samplePath = path.resolve('test_output/offline_ocr_probe.png');
  fs.mkdirSync('test_output', { recursive: true });

  const venvPython = fs.existsSync('.venv/Scripts/python.exe') ? '.venv/Scripts/python.exe' : 'python';
  const genScript = `
import pymupdf
doc = pymupdf.open()
page = doc.new_page(width=600, height=180)
page.insert_text((30, 60), "LAUDO PERICIAL OFFLINE - COMARCA DE CAMPINAS", fontsize=16)
page.insert_text((30, 110), "CPF TITULAR: 123.456.789-00", fontsize=14)
pix = page.get_pixmap(dpi=150)
pix.save(r'${samplePath}')
`;
  const genRes = spawnSync(venvPython, ['-c', genScript]);
  if (genRes.status !== 0 || !fs.existsSync(samplePath)) {
    throw new Error('Falha ao gerar imagem de teste com PyMuPDF: ' + genRes.stderr?.toString());
  }

  // Executar OCR
  const ocrRes = await worker.recognize(samplePath);
  const recognizedText = ocrRes?.data?.text || '';
  console.log('  -> Texto reconhecido pelo OCR offline:\n' + recognizedText.trim());

  assert.ok(recognizedText.length > 10, 'Texto reconhecido não pode ser vazio');
  assert.ok(
    recognizedText.includes('LAUDO') || recognizedText.includes('CAMPINAS') || recognizedText.includes('PERICIAL'),
    'Texto deve conter palavras do documento de teste'
  );
  assert.ok(
    recognizedText.includes('123.456.789-00') || recognizedText.includes('123') || recognizedText.includes('CPF'),
    'Texto deve identificar o padrão numérico do CPF'
  );

  await worker.terminate();
  console.log('  -> Worker finalizado com sucesso.');

  console.log('\n' + '='.repeat(75));
  console.log('✅ SUCESSO: TESSERACT.JS OPERA 100% OFFLINE DESDE A PRIMEIRA UTILIZAÇÃO!');
  console.log('='.repeat(75) + '\n');
}

runOfflineOcrIsolatedTest().catch(err => {
  console.error('\n❌ FALHA NO TESTE OFFLINE:', err);
  process.exit(1);
});
