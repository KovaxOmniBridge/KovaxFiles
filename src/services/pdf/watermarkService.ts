/**
 * PDF WATERMARK & VISUAL STAMP SERVICE
 * Injeção local de marcas d'água de texto/imagem com opacidade e rotação.
 * 100% Client-Side via pdf-lib.
 */

import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

export interface WatermarkOptions {
  text: string;
  fontSize?: number;
  opacity?: number; // 0.0 to 1.0
  rotationDegrees?: number; // e.g. -45, 0, 45, 90
  colorHex?: string; // e.g. '#EF4444', '#64748B', '#10B981'
  isTiled?: boolean;
  pages?: 'all' | 'first' | 'last';
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return { r: 0.8, g: 0.2, b: 0.2 };
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

export const watermarkService = {
  /**
   * Aplica uma marca d'água de texto personalizada (opacidade, rotação, mosaico) no PDF.
   */
  async applyTextWatermark(
    file: File,
    options: WatermarkOptions,
    onProgress?: (percent: number, status: string) => void
  ): Promise<{ blob: Blob; size: number }> {
    onProgress?.(20, 'Carregando documento PDF para marca d\'água...');
    const buffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

    onProgress?.(50, 'Incorporando fonte e aplicando marca d\'água...');
    const pages = pdfDoc.getPages();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const watermarkText = options.text.trim() || 'CONFIDENCIAL';
    const fontSize = options.fontSize || 48;
    const opacity = options.opacity !== undefined ? options.opacity : 0.25;
    const rotDeg = options.rotationDegrees !== undefined ? options.rotationDegrees : -45;
    const { r, g, b } = hexToRgb(options.colorHex || '#EF4444');

    const pagesToWatermark =
      options.pages === 'first'
        ? [pages[0]]
        : options.pages === 'last'
        ? [pages[pages.length - 1]]
        : pages;

    pagesToWatermark.forEach((page) => {
      const { width, height } = page.getSize();

      if (options.isTiled) {
        // Marca d'água em Mosaico / Padrão Repetido
        const stepX = 220;
        const stepY = 160;

        for (let x = 40; x < width; x += stepX) {
          for (let y = 60; y < height; y += stepY) {
            page.drawText(watermarkText, {
              x,
              y,
              size: fontSize * 0.5,
              font: fontBold,
              color: rgb(r, g, b),
              opacity,
              rotate: degrees(rotDeg),
            });
          }
        }
      } else {
        // Marca d'água centralizada no meio da página
        const textWidth = fontBold.widthOfTextAtSize(watermarkText, fontSize);
        const textHeight = fontBold.heightAtSize(fontSize);

        const centerX = (width - textWidth) / 2;
        const centerY = (height - textHeight) / 2;

        page.drawText(watermarkText, {
          x: centerX,
          y: centerY,
          size: fontSize,
          font: fontBold,
          color: rgb(r, g, b),
          opacity,
          rotate: degrees(rotDeg),
        });
      }
    });

    onProgress?.(85, 'Salvando PDF com marca d\'água preservada...');
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    onProgress?.(100, 'Marca d\'água aplicada com sucesso!');
    return {
      blob,
      size: blob.size,
    };
  },
};
