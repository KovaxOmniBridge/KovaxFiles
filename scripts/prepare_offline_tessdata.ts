import fs from 'fs';
import path from 'path';

/**
 * Script de preparação dos assets 100% offline para o Tesseract.js.
 * Copia os binários WASM, workers e dados treinados (por.traineddata)
 * para public/tessdata/, garantindo que estejam empacotados pelo Vite e Electron
 * para execução imediata em ambientes isolados / air-gapped na primeira utilização.
 * 
 * REGRA RIGOROSA: Caso qualquer recurso obrigatório não seja encontrado ou esteja vazio,
 * o processo DEVE FALHAR O BUILD com código de saída 1 (fatal error), impedindo
 * a geração de instaladores ou pacotes incompletos.
 */
export function prepareOfflineTessdata(silent = false): void {
  const rootDir = process.cwd();
  const targetDir = path.join(rootDir, 'public', 'tessdata');
  const missingFiles: string[] = [];

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. Modelo de linguagem treinado para português (por.traineddata) - OBRIGATÓRIO
  const sourceLang = path.join(rootDir, 'por.traineddata');
  const targetLang = path.join(targetDir, 'por.traineddata');
  if (fs.existsSync(sourceLang)) {
    const stat = fs.statSync(sourceLang);
    if (stat.size < 1000) {
      missingFiles.push(`por.traineddata corrompido ou vazio (${stat.size} bytes) em ${sourceLang}`);
    } else {
      fs.copyFileSync(sourceLang, targetLang);
      if (!silent) console.log(`[Tessdata] Copiado: por.traineddata (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  } else {
    missingFiles.push(`por.traineddata não encontrado na raiz: ${sourceLang}`);
  }

  // 2. Worker do Tesseract.js - OBRIGATÓRIO
  const workerSource = path.join(rootDir, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js');
  const workerTarget = path.join(targetDir, 'worker.min.js');
  if (fs.existsSync(workerSource)) {
    const stat = fs.statSync(workerSource);
    if (stat.size < 1000) {
      missingFiles.push(`worker.min.js corrompido ou vazio (${stat.size} bytes) em ${workerSource}`);
    } else {
      fs.copyFileSync(workerSource, workerTarget);
      if (!silent) console.log(`[Tessdata] Copiado: worker.min.js`);
    }
  } else {
    missingFiles.push(`worker.min.js não encontrado em ${workerSource}`);
  }

  // 3. Motores WASM e scripts JS do Tesseract.js-Core - OBRIGATÓRIOS
  const coreDir = path.join(rootDir, 'node_modules', 'tesseract.js-core');
  const mandatoryCoreFiles = [
    'tesseract-core-lstm.wasm.js',
    'tesseract-core-lstm.wasm',
    'tesseract-core-simd-lstm.wasm.js',
    'tesseract-core-simd-lstm.wasm'
  ];

  const optionalCoreFiles = [
    'tesseract-core.wasm.js',
    'tesseract-core.wasm',
    'tesseract-core-simd.wasm.js',
    'tesseract-core-simd.wasm'
  ];

  for (const file of mandatoryCoreFiles) {
    const src = path.join(coreDir, file);
    const dest = path.join(targetDir, file);
    if (fs.existsSync(src)) {
      const stat = fs.statSync(src);
      if (stat.size < 500) {
        missingFiles.push(`Núcleo WASM obrigatório corrompido ou vazio: ${file}`);
      } else {
        fs.copyFileSync(src, dest);
        if (!silent) console.log(`[Tessdata] Copiado (obrigatório): ${file}`);
      }
    } else {
      missingFiles.push(`Núcleo WASM obrigatório ausente em node_modules/tesseract.js-core: ${file}`);
    }
  }

  for (const file of optionalCoreFiles) {
    const src = path.join(coreDir, file);
    const dest = path.join(targetDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      if (!silent) console.log(`[Tessdata] Copiado (opcional): ${file}`);
    }
  }

  // 4. Verificação Fatal: Se qualquer arquivo obrigatório faltar, REPROVAR O BUILD
  if (missingFiles.length > 0) {
    const errorReport = [
      '================================================================================',
      '🛑 ERRO FATAL NO BUILD: ATIVOS OFFLINE OBRIGATÓRIOS DO OCR AUSENTES',
      '================================================================================',
      'O aplicativo foi configurado para operação 100% isolada e air-gapped.',
      'A compilação NÃO pode prosseguir sem todos os binários locais do Tesseract.',
      'Falhas detectadas:',
      ...missingFiles.map(f => `  ❌ ${f}`),
      '================================================================================'
    ].join('\n');

    console.error(errorReport);
    throw new Error(`Falha no build: ${missingFiles.length} ativo(s) obrigatório(s) do OCR ausente(s).`);
  }

  if (!silent) {
    console.log(`[Tessdata] ✅ Sucesso: Todos os ativos obrigatórios do OCR offline foram validados e preparados em ${targetDir}`);
  }
}

// Execução direta via CLI
if (process.argv[1] && (process.argv[1].endsWith('prepare_offline_tessdata.ts') || process.argv[1].endsWith('prepare_offline_tessdata.js'))) {
  try {
    prepareOfflineTessdata();
  } catch (err: any) {
    console.error(`[Tessdata] Processo finalizado com erro: ${err.message}`);
    process.exit(1);
  }
}
