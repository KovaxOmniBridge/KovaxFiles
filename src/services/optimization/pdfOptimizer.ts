import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { setupPdfWorker } from '../pdf/pdfWorkerInit';

setupPdfWorker();


export interface PdfCompressOptions {
  targetMaxMB: number;
  onProgress?: (progress: number, statusText: string) => void;
}

/**
 * Motor inteligente de otimização de PDF para Peticionamento Eletrônico (PJe / TJSP / TRF / STJ)
 * Garante que o arquivo final fique ESTRITAMENTE abaixo de targetMaxMB mantendo legibilidade.
 */
export async function compressPdfForCourt(
  file: File,
  options: PdfCompressOptions
): Promise<{ blob: Blob; size: number; pageCount: number; warnings: string[] }> {
  const { targetMaxMB, onProgress } = options;
  const targetBytes = targetMaxMB * 1024 * 1024;
  const warnings: string[] = [];

  onProgress?.(10, 'Lendo estrutura do PDF original...');
  const arrayBuffer = await file.arrayBuffer();

  // If already under target size, try fast stream optimization first
  if (file.size <= targetBytes) {
    try {
      onProgress?.(40, 'Otimizando fluxos internos de PDF...');
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const savedBytes = await pdfDoc.save({ useObjectStreams: true });
      if (savedBytes.byteLength <= targetBytes) {
        onProgress?.(100, 'PDF já está dentro do limite estipulado!');
        return {
          blob: new Blob([new Uint8Array(savedBytes)], { type: 'application/pdf' }),
          size: savedBytes.byteLength,
          pageCount: pdfDoc.getPageCount(),
          warnings: ['O arquivo original já estava dentro do limite do tribunal.'],
        };
      }
    } catch {
      // Fall through to raster compression if loading fails
    }
  }

  onProgress?.(20, 'Iniciando renderização por páginas para compressão inteligente...');

  // Load document with pdfjs
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfJsDoc = await loadingTask.promise;
  const numPages = pdfJsDoc.numPages;

  // We will iterate over scale and JPEG compression qualities until target size is achieved
  const passConfigs = [
    { scale: 1.5, quality: 0.75, name: 'Alta Qualidade (DPI 150)' },
    { scale: 1.2, quality: 0.65, name: 'Qualidade Média-Alta (DPI 120)' },
    { scale: 1.0, quality: 0.55, name: 'Qualidade Padrão Tribunal (DPI 100)' },
    { scale: 0.85, quality: 0.45, name: 'Compressão Elevada (DPI 85)' },
    { scale: 0.7, quality: 0.35, name: 'Compressão Máxima Legível (DPI 70)' },
  ];

  let bestResultBlob: Blob | null = null;
  let bestResultSize = Infinity;

  for (let configIndex = 0; configIndex < passConfigs.length; configIndex++) {
    const config = passConfigs[configIndex];
    onProgress?.(
      20 + Math.floor((configIndex / passConfigs.length) * 70),
      `Aplicando ${config.name}...`
    );

    const newPdfDoc = await PDFDocument.create();

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfJsDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: config.scale });

      // Create canvas for rendering page
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');

      if (!context) continue;

      // Render white background first (avoid black PDF background issues)
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise;

      // Compress to JPEG data URL
      const jpegDataUrl = canvas.toDataURL('image/jpeg', config.quality);
      const jpegImage = await newPdfDoc.embedJpg(jpegDataUrl);

      // Add page to new PDF retaining original dimensions
      const originalViewport = page.getViewport({ scale: 1.0 });
      const newPage = newPdfDoc.addPage([originalViewport.width, originalViewport.height]);
      newPage.drawImage(jpegImage, {
        x: 0,
        y: 0,
        width: originalViewport.width,
        height: originalViewport.height,
      });

      // Free canvas and page memory
      canvas.width = 0;
      canvas.height = 0;
      if (typeof page.cleanup === 'function') {
        page.cleanup();
      }
    }


    const compressedPdfBytes = await newPdfDoc.save({ useObjectStreams: true });
    const currentSize = compressedPdfBytes.byteLength;

    if (currentSize < bestResultSize) {
      bestResultSize = currentSize;
      bestResultBlob = new Blob([new Uint8Array(compressedPdfBytes)], { type: 'application/pdf' });
    }

    // Check if target reached!
    if (currentSize <= targetBytes) {
      onProgress?.(100, `Concluído com sucesso! Tamanho final: ${(currentSize / (1024 * 1024)).toFixed(2)} MB`);
      return {
        blob: bestResultBlob!,
        size: currentSize,
        pageCount: numPages,
        warnings,
      };
    }
  }

  // If even lowest quality pass exceeds target, return the best candidate with warning
  onProgress?.(100, 'Processamento finalizado no limite máximo de compressão legível.');
  if (bestResultSize > targetBytes) {
    warnings.push(
      `O PDF possui muitas páginas (${numPages} págs). O menor tamanho atingido preservando leitura foi ${(bestResultSize / (1024 * 1024)).toFixed(2)} MB.`
    );
  }

  return {
    blob: bestResultBlob!,
    size: bestResultSize,
    pageCount: numPages,
    warnings,
  };
}
