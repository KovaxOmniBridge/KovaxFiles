/**
 * PDF BATE STAMPING SERVICE
 * Injeção de carimbo de numeração de folhas (ex: "Fls. 001", "Fls. 002", "Doc. 1") no canto superior direito do PDF.
 * 100% Client-Side via pdf-lib.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface BateStampingOptions {
  prefix?: string; // ex: "Fls.", "Pag.", "Doc."
  startNumber?: number; // ex: 1
  fontSize?: number; // ex: 10
  colorHex?: string; // ex: "#000000" ou "#1E293B"
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  marginRightPt?: number;
  marginTopPt?: number;
  zeroPadding?: number; // ex: 3 -> "001", "002"
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return { r: 0.1, g: 0.1, b: 0.1 };
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

export const pdfBateStampingService = {
  /**
   * Aplica carimbo de numeração de folhas em todas as páginas de um arquivo PDF.
   */
  async applyBateStamping(
    file: File,
    options: BateStampingOptions = {},
    onProgress?: (percent: number, status: string) => void
  ): Promise<{ blob: Blob; size: number }> {
    onProgress?.(15, 'Carregando PDF para carimbo de numeração de folhas...');
    const buffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

    onProgress?.(40, 'Incorporando fonte e aplicando numeração de folhas...');
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const prefix = options.prefix !== undefined ? options.prefix.trim() : 'Fls.';
    const startNum = options.startNumber !== undefined ? options.startNumber : 1;
    const fontSize = options.fontSize || 10;
    const padding = options.zeroPadding !== undefined ? options.zeroPadding : 3;
    const pos = options.position || 'top-right';
    const { r, g, b } = hexToRgb(options.colorHex || '#000000');

    const marginTop = options.marginTopPt || 20;
    const marginRight = options.marginRightPt || 30;

    pages.forEach((page, idx) => {
      const pageNumStr = String(startNum + idx).padStart(padding, '0');
      const stampText = prefix ? `${prefix} ${pageNumStr}` : pageNumStr;

      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(stampText, fontSize);

      let x = width - textWidth - marginRight;
      let y = height - marginTop;

      if (pos === 'top-left') {
        x = marginRight;
        y = height - marginTop;
      } else if (pos === 'bottom-right') {
        x = width - textWidth - marginRight;
        y = marginTop;
      } else if (pos === 'bottom-left') {
        x = marginRight;
        y = marginTop;
      }

      // Fundo semi-transparente sutil atrás do texto para permitir leitura do conteúdo por trás
      page.drawRectangle({
        x: x - 4,
        y: y - 2,
        width: textWidth + 8,
        height: fontSize + 4,
        color: rgb(1, 1, 1),
        opacity: 0.20,
      });

      page.drawText(stampText, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(r, g, b),
      });
    });

    onProgress?.(90, 'Salvando PDF com carimbo de folhas...');
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    onProgress?.(100, 'Numeração de folhas aplicada com sucesso!');
    return {
      blob,
      size: blob.size,
    };
  },
};
