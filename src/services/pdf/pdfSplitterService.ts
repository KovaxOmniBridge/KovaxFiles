/**
 * PDF SPLITTER SERVICE
 * Divisão automática de arquivos PDF em volumes menores respeitando os limites em MB dos Tribunais (PJe 1.5MB/5MB/25MB, TJSP 3MB/10MB, STJ, etc.).
 * 100% Client-Side via pdf-lib.
 */

import { PDFDocument } from 'pdf-lib';

export interface SplitResultItem {
  partIndex: number;
  totalParts: number;
  name: string;
  blob: Blob;
  size: number;
  pageRange: string;
}

export const pdfSplitterService = {
  /**
   * Divide um arquivo PDF grande em múltiplos arquivos cujos tamanhos individuais fiquem abaixo do limite targetMaxMB.
   */
  async splitPdfByMaxSize(
    file: File,
    targetMaxMB: number,
    onProgress?: (percent: number, status: string) => void
  ): Promise<SplitResultItem[]> {
    onProgress?.(10, 'Carregando documento PDF original para cálculo de páginas...');
    const buffer = await file.arrayBuffer();
    const srcPdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = srcPdf.getPageCount();

    const targetMaxBytes = Math.floor(targetMaxMB * 1024 * 1024 * 0.92); // 92% para margem de segurança de cabeçalhos PDF
    const totalBytes = file.size;

    if (totalBytes <= targetMaxBytes || totalPages <= 1) {
      onProgress?.(100, 'Arquivo já está dentro do limite configurado.');
      return [
        {
          partIndex: 1,
          totalParts: 1,
          name: file.name,
          blob: file,
          size: file.size,
          pageRange: `Páginas 1 a ${totalPages}`,
        },
      ];
    }

    onProgress?.(25, `Analisando ${totalPages} páginas para estimativa de divisão por lote...`);

    // Estimativa inicial de páginas por parte
    const estimatedParts = Math.ceil(totalBytes / targetMaxBytes);
    const avgPagesPerPart = Math.max(1, Math.floor(totalPages / estimatedParts));

    const resultParts: SplitResultItem[] = [];
    let currentPageIndex = 0;
    let partNum = 1;

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const ext = file.name.split('.').pop() || 'pdf';

    while (currentPageIndex < totalPages) {
      onProgress?.(
        Math.min(90, Math.floor(25 + (currentPageIndex / totalPages) * 65)),
        `Gerando Parte ${partNum} do documento...`
      );

      let pagesToInclude: number[] = [];
      let lastValidBytes: Uint8Array | null = null;
      let lastValidPagesCount = 0;

      // Adiciona páginas progressivamente até atingir o limite maxBytes
      for (let i = currentPageIndex; i < totalPages; i++) {
        pagesToInclude.push(i);

        const tempDoc = await PDFDocument.create();
        const copied = await tempDoc.copyPages(srcPdf, pagesToInclude);
        copied.forEach((p) => tempDoc.addPage(p));

        const tempBytes = await tempDoc.save();

        if (tempBytes.byteLength > targetMaxBytes && pagesToInclude.length > 1) {
          // Excedeu limite, recua a última página
          pagesToInclude.pop();
          break;
        } else {
          lastValidBytes = tempBytes;
          lastValidPagesCount = pagesToInclude.length;

          // Se tiver atingido o número médio estimado de páginas e estiver perto do limite de tamanho, encerra esta parte
          if (
            pagesToInclude.length >= avgPagesPerPart &&
            tempBytes.byteLength >= targetMaxBytes * 0.7
          ) {
            break;
          }
        }
      }

      if (!lastValidBytes || lastValidPagesCount === 0) {
        // Se uma única página for maior do que o limite maxMB
        pagesToInclude = [currentPageIndex];
        const singleDoc = await PDFDocument.create();
        const copied = await singleDoc.copyPages(srcPdf, pagesToInclude);
        copied.forEach((p) => singleDoc.addPage(p));
        lastValidBytes = await singleDoc.save();
        lastValidPagesCount = 1;
      }

      const startPageDisplay = currentPageIndex + 1;
      const endPageDisplay = currentPageIndex + lastValidPagesCount;

      const partBlob = new Blob([lastValidBytes], { type: 'application/pdf' });
      const partName = `${baseName}_Parte_${String(partNum).padStart(2, '0')}.${ext}`;

      resultParts.push({
        partIndex: partNum,
        totalParts: 0, // Atualizado no final
        name: partName,
        blob: partBlob,
        size: partBlob.size,
        pageRange: startPageDisplay === endPageDisplay ? `Página ${startPageDisplay}` : `Páginas ${startPageDisplay} a ${endPageDisplay}`,
      });

      currentPageIndex += lastValidPagesCount;
      partNum++;
    }

    // Corrige a contagem total de partes
    const totalFinalParts = resultParts.length;
    resultParts.forEach((part) => {
      part.totalParts = totalFinalParts;
    });

    onProgress?.(100, `PDF dividido com sucesso em ${totalFinalParts} partes!`);
    return resultParts;
  },
};
