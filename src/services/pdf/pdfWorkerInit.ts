import * as pdfjsLib from 'pdfjs-dist';

let isInitialized = false;

/**
 * Inicializa o Worker do PDF.js utilizando o arquivo empacotado localmente.
 * Elimina qualquer dependência de CDNs externas (ex: cdnjs.cloudflare.com)
 * para garantir a conformidade 100% offline.
 */
export function setupPdfWorker(): void {
  if (typeof window === 'undefined' || !('Worker' in window)) return;
  if (isInitialized && pdfjsLib.GlobalWorkerOptions.workerSrc) return;

  try {
    const basePath = window.location.pathname.endsWith('/')
      ? window.location.pathname
      : window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
    
    // Define a URL do worker local compilado no build
    const localWorkerUrl = new URL(`.${basePath}dist/pdf.worker.min.mjs`, window.location.origin).href;
    pdfjsLib.GlobalWorkerOptions.workerSrc = localWorkerUrl;
    isInitialized = true;
  } catch {
    // Fallback relativo para ambientes onde a URL não pôde ser instanciada
    pdfjsLib.GlobalWorkerOptions.workerSrc = './dist/pdf.worker.min.mjs';
    isInitialized = true;
  }
}
