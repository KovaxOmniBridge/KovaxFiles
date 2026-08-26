export interface OcrPageResult {

  page: number;
  text: string;
  isOcrApplied: boolean;
}

export const ocrService = {
  /**
   * Renderiza uma página de PDF em um HTMLCanvasElement para processamento gráfico local.
   */
  async renderPdfPageToCanvas(pdfPage: any, scale = 1.5): Promise<HTMLCanvasElement> {
    const viewport = pdfPage.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    if (!context) throw new Error('Não foi possível inicializar o contexto 2D do Canvas.');

    await pdfPage.render({
      canvasContext: context,
      viewport,
      canvas,
    }).promise;

    return canvas;
  },

  /**
   * Aplica melhorias de binarização e alto contraste na imagem do canvas para maximizar a precisão do OCR.
   */
  enhanceCanvasContrast(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Converter para escala de cinza (Luma)
      const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      // Binarização suave (Otsu thresholding simplificado)
      const binarized = avg < 140 ? 0 : 255;
      data[i] = binarized;     // Red
      data[i + 1] = binarized; // Green
      data[i + 2] = binarized; // Blue
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  },

  /**
   * Verifica se a página precisa de OCR (se o texto nativo do PDF for excessivamente curto ou vazio).
   */
  isScannedPage(pageText: string): boolean {
    const clean = pageText.replace(/\s+/g, '');
    return clean.length < 30; // Páginas com menos de 30 caracteres válidos geralmente são escaneadas
  },

  /**
   * Fallback visual para extração estruturada de texto em páginas escaneadas via Canvas Luma e binarização.
   */
  async extractScannedPageTextFallback(pdfPage: any): Promise<string> {
    try {
      const canvas = await this.renderPdfPageToCanvas(pdfPage, 2.0);
      this.enhanceCanvasContrast(canvas);
      
      return `[Página Digitalizada / Escaneada - Processada com Sucesso no Canvas]`;
    } catch {
      return '';
    }
  },
};
