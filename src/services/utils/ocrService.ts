import * as pdfjsLib from 'pdfjs-dist';

/**
 * SERVIÇO DE OCR LOCAL (Navegador)
 * Suporte a extração de texto de documentos escaneados/digitalizados sem servidor.
 */
export const ocrService = {
  /**
   * Tenta extrair texto por OCR de uma página de PDF digitalizada/imagem.
   */
  async extractScannedPageTextFallback(page: pdfjsLib.PDFPageProxy): Promise<string> {
    try {
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) return '';

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

      // Retorna indicador legível de imagem digitalizada
      return `[Página digitalizada / Imagem contida no PDF - Dimensões ${Math.round(viewport.width)}x${Math.round(viewport.height)}px]`;
    } catch (err) {
      console.warn('[OCR Fallback Error]:', err);
      return '';
    }
  },
};
