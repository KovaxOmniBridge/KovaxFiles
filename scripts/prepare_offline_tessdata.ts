import fs from 'fs';
import path from 'path';

/**
 * Script de preparação dos assets 100% offline para o Tesseract.js.
 * Copia os binários WASM, workers e dados treinados (por.traineddata)
 * para public/tessdata/, garantindo que estejam empacotados pelo Vite e Electron
 * para execução imediata em ambientes isolados / air-gapped na primeira utilização.
 */
export function prepareOfflineTessdata(silent = false) {
  const rootDir = process.cwd();
  const targetDir = path.join(rootDir, 'public', 'tessdata');

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. Modelo de linguagem treinado para português (por.traineddata)
  const sourceLang = path.join(rootDir, 'por.traineddata');
  const targetLang = path.join(targetDir, 'por.traineddata');
  if (fs.existsSync(sourceLang)) {
    fs.copyFileSync(sourceLang, targetLang);
    if (!silent) console.log(`[Tessdata] Copiado: por.traineddata (${(fs.statSync(targetLang).size / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    console.error(`[Tessdata] ERRO CRÍTICO: por.traineddata não encontrado na raiz: ${sourceLang}`);
  }

  // 2. Worker do Tesseract.js
  const workerSource = path.join(rootDir, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js');
  const workerTarget = path.join(targetDir, 'worker.min.js');
  if (fs.existsSync(workerSource)) {
    fs.copyFileSync(workerSource, workerTarget);
    if (!silent) console.log(`[Tessdata] Copiado: worker.min.js`);
  } else {
    console.error(`[Tessdata] ERRO CRÍTICO: worker.min.js não encontrado em node_modules/tesseract.js/dist`);
  }

  // 3. Motores WASM do Tesseract.js-Core
  const coreDir = path.join(rootDir, 'node_modules', 'tesseract.js-core');
  const coreFiles = [
    'tesseract-core-lstm.wasm.js',
    'tesseract-core-lstm.wasm',
    'tesseract-core-simd-lstm.wasm.js',
    'tesseract-core-simd-lstm.wasm',
    'tesseract-core.wasm.js',
    'tesseract-core.wasm',
    'tesseract-core-simd.wasm.js',
    'tesseract-core-simd.wasm',
  ];

  for (const file of coreFiles) {
    const src = path.join(coreDir, file);
    const dest = path.join(targetDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      if (!silent) console.log(`[Tessdata] Copiado: ${file}`);
    } else {
      console.warn(`[Tessdata] Aviso: arquivo do core não encontrado: ${file}`);
    }
  }

  if (!silent) {
    console.log(`[Tessdata] Sucesso: Todos os assets offline do Tesseract foram preparados em ${targetDir}`);
  }
}

// Execução direta via CLI
if (process.argv[1] && process.argv[1].endsWith('prepare_offline_tessdata.ts')) {
  prepareOfflineTessdata();
}
