import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

// 1. Copiar PDF.js Worker
const srcPdfWorker = path.join(rootDir, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
if (fs.existsSync(srcPdfWorker)) {
  fs.copyFileSync(srcPdfWorker, path.join(distDir, 'pdf.worker.min.mjs'));
  fs.copyFileSync(srcPdfWorker, path.join(publicDir, 'pdf.worker.min.mjs'));
  console.log('[Worker Script] PDF.js worker (pdf.worker.min.mjs) copiado para dist/ e public/');
} else {
  console.error('[Worker Script] Erro: pdf.worker.min.mjs não encontrado em:', srcPdfWorker);
  process.exit(1);
}

// 2. Copiar FFmpeg Core (.js e .wasm)
const ffmpegDist = path.join(rootDir, 'node_modules', '@ffmpeg', 'core', 'dist', 'umd');
const ffmpegJs = path.join(ffmpegDist, 'ffmpeg-core.js');
const ffmpegWasm = path.join(ffmpegDist, 'ffmpeg-core.wasm');

if (fs.existsSync(ffmpegJs) && fs.existsSync(ffmpegWasm)) {
  fs.copyFileSync(ffmpegJs, path.join(distDir, 'ffmpeg-core.js'));
  fs.copyFileSync(ffmpegJs, path.join(publicDir, 'ffmpeg-core.js'));
  fs.copyFileSync(ffmpegWasm, path.join(distDir, 'ffmpeg-core.wasm'));
  fs.copyFileSync(ffmpegWasm, path.join(publicDir, 'ffmpeg-core.wasm'));
  console.log('[Worker Script] FFmpeg Core (ffmpeg-core.js / ffmpeg-core.wasm) copiado para dist/ e public/');
} else {
  console.warn('[Worker Script] Aviso: Arquivos do @ffmpeg/core não encontrados em:', ffmpegDist);
}
