import Tesseract, { createWorker, OEM } from 'tesseract.js';

/**
 * Utilitário de configuração e inicialização 100% OFFLINE para o Tesseract.js.
 * 
 * Por padrão, o Tesseract.js tenta baixar o worker.min.js, os binários WASM e
 * os dados treinados (por.traineddata) a partir de CDNs públicos na internet (jsdelivr, naptha).
 * 
 * Este módulo assegura que em qualquer ambiente (Electron em produção via file://,
 * servidor de desenvolvimento Vite local via http://localhost, ou execução headless em Node):
 * 1. O worker.min.js seja carregado exclusivamente a partir de assets locais empacotados.
 * 2. Os núcleos WASM (tesseract-core-lstm / simd) sejam carregados localmente.
 * 3. O modelo de reconhecimento do idioma português (por.traineddata) seja servido localmente.
 * 4. A descompressão gzip seja desativada se o arquivo estiver no formato bruto .traineddata.
 * 5. Nenhuma requisição de rede externa seja realizada.
 */

/**
 * Determina o caminho base local para os assets do tessdata
 */
export function getTessdataBasePath(): string {
  // 1. Ambiente Navegador / Electron Renderer
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.protocol === 'file:') {
      // Produção Electron (ex: file:///C:/Users/.../dist/index.html)
      const href = window.location.href;
      const baseDir = href.substring(0, href.lastIndexOf('/') + 1);
      return `${baseDir}tessdata`;
    }
    // Servidor de desenvolvimento local (ex: http://localhost:5173/)
    const origin = window.location.origin;
    return `${origin}/tessdata`;
  }

  // 2. Ambiente Node.js (scripts de teste, validação headless, CLI)
  if (typeof process !== 'undefined' && process.cwd) {
    try {
      // Import dinâmico ou resolução estática de caminhos no Node
      const cwd = process.cwd();
      return `${cwd}/public/tessdata`;
    } catch {
      return './public/tessdata';
    }
  }

  return './tessdata';
}

/**
 * Gera as opções de inicialização do Tesseract para operação garantidamente offline
 */
export function getOfflineWorkerOptions(
  customOptions?: Partial<Tesseract.WorkerOptions>
): Partial<Tesseract.WorkerOptions> {
  const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
  const basePath = getTessdataBasePath();
  const workerLocalPath = isBrowser ? `${basePath}/worker.min.js` : `${basePath}/worker.min.js`;

  return {
    workerPath: workerLocalPath,
    corePath: basePath,
    langPath: basePath,
    gzip: false,
    ...customOptions
  };
}

/**
 * Cria e inicializa um Worker do Tesseract configurado estritamente para o ambiente local offline.
 * 
 * @param lang Idioma para reconhecimento OCR (padrão: 'por' para português brasileiro)
 * @param options Opções adicionais do Worker (logger, tratador de erros, etc.)
 */
export async function createOfflineWorker(
  lang: string = 'por',
  options?: Partial<Tesseract.WorkerOptions>
): Promise<Tesseract.Worker> {
  const workerOpts = getOfflineWorkerOptions(options);
  
  // Utiliza motor LSTM moderno com os dados treinados locais
  return await createWorker(lang, OEM.LSTM_ONLY, workerOpts);
}
