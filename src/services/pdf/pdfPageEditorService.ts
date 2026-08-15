/**
 * PDF PAGE EDITOR SERVICE
 * Rotação, Reordenação e Exclusão de Páginas PDF.
 * 100% Client-Side via pdf-lib.
 */

import { PDFDocument, degrees } from 'pdf-lib';

export interface PageRotationMap {
  [pageZeroBasedIndex: number]: number; // 0, 90, 180, 270
}

export const pdfPageEditorService = {
  /**
   * Rotaciona páginas selecionadas de um PDF em ângulos de 90°, 180° ou 270°.
   */
  async rotatePdfPages(
    file: File,
    rotationMap: PageRotationMap,
    onProgress?: (percent: number, status: string) => void
  ): Promise<{ blob: Blob; size: number }> {
    onProgress?.(20, 'Carregando PDF para rotação de páginas...');
    const buffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

    onProgress?.(60, 'Aplicando rotação nas páginas selecionadas...');
    const pages = pdfDoc.getPages();

    pages.forEach((page, idx) => {
      const rotAngle = rotationMap[idx];
      if (rotAngle !== undefined && rotAngle !== 0) {
        const currentRot = page.getRotation().angle;
        const newRot = (currentRot + rotAngle) % 360;
        page.setRotation(degrees(newRot));
      }
    });

    onProgress?.(90, 'Salvando novo arquivo PDF com orientação ajustada...');
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    onProgress?.(100, 'Páginas do PDF rotacionadas com sucesso!');
    return {
      blob,
      size: blob.size,
    };
  },

  /**
   * Reordena ou exclui páginas de um PDF gerando um novo documento limpo.
   */
  async reorderAndDeletePages(
    file: File,
    keepPageIndices: number[], // 0-based indices
    onProgress?: (percent: number, status: string) => void
  ): Promise<{ blob: Blob; size: number }> {
    onProgress?.(20, 'Carregando documento PDF original...');
    const buffer = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

    onProgress?.(50, 'Criando novo PDF com as páginas selecionadas...');
    const newDoc = await PDFDocument.create();

    const copiedPages = await newDoc.copyPages(srcDoc, keepPageIndices);
    copiedPages.forEach((p) => newDoc.addPage(p));

    onProgress?.(90, 'Gerando arquivo PDF reordenado...');
    const pdfBytes = await newDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    onProgress?.(100, 'Reordenação e exclusão concluídas com sucesso!');
    return {
      blob,
      size: blob.size,
    };
  },
};
