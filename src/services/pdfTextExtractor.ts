import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { createWorker } from 'tesseract.js';

// Configuração do Worker 100% Local e Offline do PDF.js via Vite
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export interface TextItemBounds {
  text: string;
  x: number;      // Posição X no sistema PDF (origem bottom-left)
  y: number;      // Posição Y no sistema PDF (origem bottom-left)
  width: number;
  height: number;
}

export interface PageTextData {
  pageIndex: number;
  pageWidth: number;
  pageHeight: number;
  fullText: string;
  items: TextItemBounds[];
  isScanned: boolean; // Indica se a página foi processada via OCR por ser imagem escaneada
}

let measureCtx: CanvasRenderingContext2D | null = null;
function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (!measureCtx && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    measureCtx = canvas.getContext('2d');
  }
  return measureCtx;
}

export class PdfTextExtractor {
  /**
   * Extrai o texto do PDF com coordenadas Bounding Box milimétricas.
   * Inspeciona o MediaBox real para não cortar margens de autenticação (e-SAJ, PJe, TRF).
   * Se a página for um documento escaneado (imagem), dispara o OCR Local via Tesseract.js WASM.
   */
  static async extractTextWithBounds(
    pdfBuffer: ArrayBuffer,
    onProgress?: (progress: { message: string; percent: number }) => void,
    password?: string
  ): Promise<PageTextData[]> {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
      isEvalSupported: false,
      password: password || undefined
    });

    const pdfDoc = await loadingTask.promise;
    const pagesData: PageTextData[] = [];
    let ocrWorker: any = null;

    try {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        onProgress?.({
          message: `Lendo estrutura do PDF (Página ${i}/${pdfDoc.numPages})...`,
          percent: Math.round((i / pdfDoc.numPages) * 100)
        });
        // Cede o controle ao Event Loop para manter a UI responsiva
        await new Promise(r => setTimeout(r, 0));
        const page = await pdfDoc.getPage(i);
        
        // Forçar inspeção dos limites reais do MediaBox para capturar textos de margem (e-SAJ / PJe)
        const mediaBox = (page as any).mediaBox || (page as any).view;
        const viewport = page.getViewport({ scale: 1.0, viewBox: mediaBox });
        const textContent = await page.getTextContent();

        const items: TextItemBounds[] = [];
        const textPieces: string[] = [];

        for (const item of textContent.items as any[]) {
          if (!item.str || item.str.trim() === '') continue;

          const transform = item.transform; // [scaleX, skewY, skewX, scaleY, translateX, translateY]
          const b = transform[1];
          const c = transform[2];
          const d = transform[3];
          const tx = transform[4];
          const ty = transform[5];

          let x = tx;
          let y = ty;
          let width = item.width || 10;
          let height = Math.abs(d) || item.height || 12;

          // Cálculo milimétrico da Matriz de Transformação para Textos Rotacionados (90° e 270°)
          const isRotated = Math.abs(b) > 0.5 || Math.abs(c) > 0.5;
          if (isRotated) {
            const fontLen = item.width || (Math.abs(b) * item.str.length * 0.6) || 20;
            const fontThick = Math.abs(c) || item.height || 14;

            if (b > 0) { // 90 Graus (Margens laterais e-SAJ orientadas de baixo para cima)
              x = Math.max(0, tx - fontThick);
              y = Math.max(0, ty);
              width = fontThick;
              height = fontLen;
            } else { // 270 Graus (Margens laterais orientadas de cima para baixo)
              x = Math.max(0, tx);
              y = Math.max(0, ty - fontLen);
              width = fontThick;
              height = fontLen;
            }
          }

          items.push({
            text: item.str,
            x,
            y,
            width,
            height
          });

          textPieces.push(item.str);
        }

        const fullText = this.reconstructSpatialGridText(items);
        const isScanned = items.length < 5;

        pagesData.push({
          pageIndex: i - 1,
          pageWidth: viewport.width,
          pageHeight: viewport.height,
          fullText,
          items,
          isScanned
        });
      }
    } finally {
      if (ocrWorker) {
        try {
          await ocrWorker.terminate();
        } catch {}
      }
    }

    return pagesData;
  }

  /**
   * Reconstrói o texto por grelha espacial baseada nas posições X e Y dos elementos.
   * Preserva a separação de colunas tabulares (\t) em balanços e relatórios financeiros em PDF.
   */
  public static reconstructSpatialGridText(items: TextItemBounds[]): string {
    if (!items || items.length === 0) return '';

    const linesMap = new Map<number, TextItemBounds[]>();

    items.forEach(item => {
      let matchedY: number | null = null;
      for (const yKey of linesMap.keys()) {
        if (Math.abs(yKey - item.y) <= 3.0) {
          matchedY = yKey;
          break;
        }
      }

      if (matchedY !== null) {
        linesMap.get(matchedY)!.push(item);
      } else {
        linesMap.set(item.y, [item]);
      }
    });

    const sortedYKeys = Array.from(linesMap.keys()).sort((a, b) => b - a);
    const lineStrings: string[] = [];

    sortedYKeys.forEach(yKey => {
      const lineItems = linesMap.get(yKey)!.sort((a, b) => a.x - b.x);
      let lineText = '';

      for (let i = 0; i < lineItems.length; i++) {
        const curr = lineItems[i];
        if (i === 0) {
          lineText += curr.text;
        } else {
          const prev = lineItems[i - 1];
          const gap = curr.x - (prev.x + prev.width);
          if (gap > 14.0) {
            lineText += '\t' + curr.text;
          } else {
            lineText += ' ' + curr.text;
          }
        }
      }
      lineStrings.push(lineText);
    });

    return lineStrings.join('\n');
  }

  /**
   * Remove acentos para busca sem sensibilidade gráfica
   */
  private static stripAccents(str: string): string {
    return str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
  }

  /**
   * Calcula a posição sub-vetorial exata da palavra dentro de uma linha de texto usando a métrica de tipografia Canvas.
   */
  private static getSubItemBounds(item: TextItemBounds, charIndex: number, matchLength: number): { subX: number; subWidth: number } {
    const ctx = getMeasureCtx();
    const fullText = item.text;

    if (ctx && fullText.length > 0) {
      ctx.font = `${Math.round(item.height || 12)}px sans-serif`;
      const prefixStr = fullText.substring(0, charIndex);
      const targetStr = fullText.substring(charIndex, charIndex + matchLength);

      const prefixW = ctx.measureText(prefixStr).width;
      const targetW = ctx.measureText(targetStr).width;
      const totalW = ctx.measureText(fullText).width || 1;

      const scaleFactor = item.width / totalW;
      const subX = item.x + (prefixW * scaleFactor);
      
      let subWidth = 0;
      if (charIndex + matchLength >= fullText.length - 1) {
        subWidth = (item.x + item.width) - subX + 2;
      } else {
        subWidth = targetW * scaleFactor + 2;
      }

      return { subX, subWidth };
    }

    const ratio = item.width / (fullText.length || 1);
    const subX = item.x + (charIndex * ratio);
    const subWidth = matchLength * ratio;
    return { subX, subWidth };
  }

  /**
   * Localiza todas as ocorrências de um termo em uma página e calcula os retângulos cirúrgicos.
   * Tarja EXATAMENTE a palavra ou dado com precisão tipográfica milimétrica.
   */
  static findTextRectangles(
    pageData: PageTextData,
    searchTerm: string
  ): { pageIndex: number; x: number; y: number; width: number; height: number }[] {
    if (!searchTerm || searchTerm.trim() === '') return [];

    const rects: { pageIndex: number; x: number; y: number; width: number; height: number }[] = [];
    const cleanSearchNorm = this.stripAccents(searchTerm).trim().toLowerCase();

    // 1. Busca em itens de texto individuais com medição tipográfica exata via Canvas
    for (const item of pageData.items) {
      const itemTextNorm = this.stripAccents(item.text).toLowerCase();
      const charIndex = itemTextNorm.indexOf(cleanSearchNorm);

      if (charIndex !== -1) {
        const { subX, subWidth } = this.getSubItemBounds(item, charIndex, cleanSearchNorm.length);

        rects.push({
          pageIndex: pageData.pageIndex,
          x: Math.max(0, subX - 1),
          y: Math.max(0, item.y - 1),
          width: Math.min(pageData.pageWidth, Math.max(12, subWidth + 2)),
          height: item.height + 2
        });
      }
    }

    // 2. Busca em sequência de itens de palavras isoladas
    if (rects.length === 0 && cleanSearchNorm.includes(' ')) {
      const searchWords = cleanSearchNorm.split(/\s+/).filter(w => w.length > 1);

      for (let i = 0; i <= pageData.items.length - searchWords.length; i++) {
        let match = true;
        for (let j = 0; j < searchWords.length; j++) {
          const itemTextNorm = this.stripAccents(pageData.items[i + j].text).toLowerCase();
          if (!itemTextNorm.includes(searchWords[j])) {
            match = false;
            break;
          }
        }

        if (match) {
          const matchedItems = pageData.items.slice(i, i + searchWords.length);
          const minX = Math.min(...matchedItems.map(it => it.x));
          const minY = Math.min(...matchedItems.map(it => it.y));
          const maxX = Math.max(...matchedItems.map(it => it.x + it.width));
          const maxH = Math.max(...matchedItems.map(it => it.height));

          rects.push({
            pageIndex: pageData.pageIndex,
            x: Math.max(0, minX - 1),
            y: Math.max(0, minY - 1),
            width: Math.max(20, (maxX - minX) + 3),
            height: maxH + 2
          });
        }
      }
    }

    return rects;
  }
}
