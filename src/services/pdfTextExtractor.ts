import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { createOfflineWorker } from './tesseractOfflineConfig.ts';

// Configuração do Worker 100% Local e Offline do PDF.js via Vite com compatibilidade Node/Browser
const pdfjs = (pdfjsLib as any).getDocument ? pdfjsLib : ((pdfjsLib as any).default || pdfjsLib);
if (typeof window !== 'undefined' && 'Worker' in window && pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export interface TextItemBounds {
  text: string;
  x: number;      // Posição X no sistema PDF (origem bottom-left)
  y: number;      // Posição Y no sistema PDF (origem bottom-left)
  width: number;
  height: number;
}

export interface PageOcrQuality {
  status: 'ok' | 'rejected_failed' | 'rejected_illegible' | 'rejected_low_confidence';
  meanConfidence: number;
  wordCount: number;
  reason?: string;
}

export interface PageTextData {
  pageIndex: number;
  pageWidth: number;
  pageHeight: number;
  fullText: string;
  items: TextItemBounds[];
  isScanned: boolean; // Indica se a página foi processada via OCR por ser imagem escaneada
  ocrQuality?: PageOcrQuality;
}

export interface ExtractTextOptions {
  disableOcr?: boolean;
  ocrLanguage?: string;
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
   * Se a página for um documento escaneado (imagem), dispara o OCR Local via Tesseract.js WASM
   * e extrai palavras e linhas com coordenadas no sistema PDF (origem bottom-left).
   */
  static async extractTextWithBounds(
    pdfBuffer: ArrayBuffer,
    onProgress?: (progress: { message: string; percent: number }) => void,
    password?: string,
    options?: ExtractTextOptions
  ): Promise<PageTextData[]> {
    const initialPdfBytes = new Uint8Array(pdfBuffer.byteLength > 0 ? pdfBuffer.slice(0) : pdfBuffer);
    const getDoc = pdfjs.getDocument || (pdfjsLib as any).getDocument;
    const loadingTask = getDoc({
      data: initialPdfBytes.slice(0),
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

        let items: TextItemBounds[] = [];
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

        let fullText = this.reconstructSpatialGridText(items);
        const isScanned = items.length < 5;

        let ocrQuality: PageOcrQuality | undefined = undefined;
        let ocrErrorCaught: any = null;
        let ocrResultConfidence: number = 0;

        // Se a página for um documento escaneado (pouco texto vetorial) e o OCR não estiver desativado:
        if (isScanned && !options?.disableOcr) {
          let imageSource: any = null;
          let ocrScale = 2.0;

          if (typeof document !== 'undefined') {
            try {
              // 1. Renderização de alta fidelidade em Canvas (Navegador Web / Electron Renderer)
              const maxOcrPixels = 4_000_000;
              const rawPixelsAt2x = (viewport.width * 2.0) * (viewport.height * 2.0);
              ocrScale = rawPixelsAt2x > maxOcrPixels
                ? Math.max(1.0, Math.sqrt(maxOcrPixels / (viewport.width * viewport.height)))
                : 2.0;

              const ocrViewport = page.getViewport({ scale: ocrScale, viewBox: mediaBox });
              const canvas = document.createElement('canvas');
              canvas.width = Math.round(ocrViewport.width);
              canvas.height = Math.round(ocrViewport.height);
              const ctx = canvas.getContext('2d');

              if (ctx) {
                await page.render({ canvasContext: ctx, viewport: ocrViewport }).promise;
                imageSource = canvas;
              }
            } catch (renderErr) {
              console.warn(`[PdfTextExtractor] Falha ao renderizar Canvas para OCR na página ${i}:`, renderErr);
            }
          } else if (typeof process !== 'undefined' && (process as any).versions?.node) {
            // 2. Fallback Headless para ambiente Node.js / CLI (ex: testes automatizados)
            try {
              const fs = await import('fs');
              const path = await import('path');
              const os = await import('os');
              const { spawnSync } = await import('child_process');

              const tmpPdf = path.join(os.tmpdir(), `kovax_ocr_in_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
              const tmpPng = path.join(os.tmpdir(), `kovax_ocr_out_${Date.now()}_${Math.random().toString(36).substring(7)}.png`);
              fs.writeFileSync(tmpPdf, initialPdfBytes);

              const venvPython = path.resolve('.venv/Scripts/python.exe');
              const pythonExe = fs.existsSync(venvPython) ? venvPython : 'python';

              const renderPy = `
import pymupdf, sys
doc = pymupdf.open(sys.argv[1])
p = doc.load_page(int(sys.argv[2]))
pix = p.get_pixmap(dpi=144)
pix.save(sys.argv[3])
`;
              const res = spawnSync(pythonExe, ['-c', renderPy, tmpPdf, String(i - 1), tmpPng]);
              if (res.status === 0 && fs.existsSync(tmpPng)) {
                imageSource = tmpPng;
                ocrScale = 2.0;
              }
              try { if (fs.existsSync(tmpPdf)) fs.unlinkSync(tmpPdf); } catch {}
            } catch (nodeErr) {
              console.warn(`[PdfTextExtractor] Falha ao renderizar página headless no Node:`, nodeErr);
            }
          }

          if (imageSource) {
            try {
              if (!ocrWorker) {
                onProgress?.({
                  message: `Inicializando motor OCR Local (Tesseract WASM)...`,
                  percent: Math.round(((i - 0.9) / pdfDoc.numPages) * 100)
                });
                ocrWorker = await createOfflineWorker(options?.ocrLanguage || 'por');
              }

              onProgress?.({
                message: `Executando OCR na página digitalizada ${i}/${pdfDoc.numPages}...`,
                percent: Math.round(((i - 0.4) / pdfDoc.numPages) * 100)
              });

              const ocrResult = await ocrWorker.recognize(imageSource);
              if (ocrResult?.data) {
                ocrResultConfidence = typeof ocrResult.data.confidence === 'number' ? ocrResult.data.confidence : 0;
                const ocrItems: TextItemBounds[] = [];
                const lines = ocrResult.data.lines || [];

                if (lines.length > 0) {
                  for (const line of lines) {
                    if (!line || !line.text || line.text.trim() === '') continue;
                    const lineBbox = line.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 };
                    const words = (line.words || []).filter((w: any) => w && w.text && w.text.trim() !== '');

                    // Envelope vertical unificado da linha expandido pelos ascendentes/descendentes de cada palavra
                    let lineMinY = lineBbox.y0;
                    let lineMaxY = lineBbox.y1;
                    for (const w of words) {
                      if (w.bbox) {
                        if (w.bbox.y0 < lineMinY) lineMinY = w.bbox.y0;
                        if (w.bbox.y1 > lineMaxY) lineMaxY = w.bbox.y1;
                      }
                    }

                    const lineY = Math.max(0, viewport.height - (lineMaxY / ocrScale));
                    const lineHeight = Math.max(8, (lineMaxY - lineMinY) / ocrScale);

                    if (words.length > 0) {
                      for (const w of words) {
                        const wBbox = w.bbox || lineBbox;
                        const wordX = Math.max(0, wBbox.x0 / ocrScale);
                        const wordWidth = Math.max(4, (wBbox.x1 - wBbox.x0) / ocrScale);

                        ocrItems.push({
                          text: w.text.trim(),
                          x: wordX,
                          y: lineY,
                          width: wordWidth,
                          height: lineHeight
                        });
                      }
                    } else {
                      const lineX = Math.max(0, lineBbox.x0 / ocrScale);
                      const lineWidth = Math.max(10, (lineBbox.x1 - lineBbox.x0) / ocrScale);
                      ocrItems.push({
                        text: line.text.trim(),
                        x: lineX,
                        y: lineY,
                        width: lineWidth,
                        height: lineHeight
                      });
                    }
                  }
                } else if (ocrResult.data.words && ocrResult.data.words.length > 0) {
                  for (const w of ocrResult.data.words) {
                    if (!w || !w.text || w.text.trim() === '') continue;
                    const wBbox = w.bbox;
                    const wordX = Math.max(0, wBbox.x0 / ocrScale);
                    const wordY = Math.max(0, viewport.height - (wBbox.y1 / ocrScale));
                    const wordWidth = Math.max(4, (wBbox.x1 - wBbox.x0) / ocrScale);
                    const wordHeight = Math.max(8, (wBbox.y1 - wBbox.y0) / ocrScale);

                    ocrItems.push({
                      text: w.text.trim(),
                      x: wordX,
                      y: wordY,
                      width: wordWidth,
                      height: wordHeight
                    });
                  }
                }

                if (ocrItems.length > 0) {
                  items = ocrItems;
                  fullText = this.reconstructSpatialGridText(items);
                  if (!fullText && ocrResult.data.text) {
                    fullText = ocrResult.data.text.trim();
                  }
                } else if (ocrResult.data.text && ocrResult.data.text.trim().length > 0) {
                  fullText = ocrResult.data.text.trim();
                }
              }
            } catch (ocrErr: any) {
              console.warn(`[PdfTextExtractor] Falha durante OCR na página ${i}:`, ocrErr);
              ocrErrorCaught = ocrErr;
            } finally {
              if (typeof imageSource === 'string') {
                try {
                  const fs = await import('fs');
                  if (fs.existsSync(imageSource)) fs.unlinkSync(imageSource);
                } catch {}
              }
            }
          }
        }

        // Avaliação de integridade e qualidade do OCR para documentos escaneados
        if (isScanned) {
          if (options?.disableOcr) {
            ocrQuality = {
              status: 'rejected_failed',
              meanConfidence: 0,
              wordCount: 0,
              reason: 'Página digitalizada com OCR desativado nas opções de extração.'
            };
          } else if (ocrErrorCaught) {
            ocrQuality = {
              status: 'rejected_failed',
              meanConfidence: 0,
              wordCount: 0,
              reason: `Falha no motor OCR local: ${ocrErrorCaught?.message || 'Erro inesperado'}`
            };
          } else {
            const wordCount = items.length;
            if (wordCount === 0 && (!fullText || fullText.trim().length === 0)) {
              ocrQuality = {
                status: 'rejected_illegible',
                meanConfidence: ocrResultConfidence,
                wordCount: 0,
                reason: 'Nenhum caractere ou palavra legível pôde ser detectada na página digitalizada (rasura, mancha ou baixa resolução).'
              };
            } else if (ocrResultConfidence > 0 && ocrResultConfidence < 50 && wordCount < 5) {
              ocrQuality = {
                status: 'rejected_low_confidence',
                meanConfidence: ocrResultConfidence,
                wordCount,
                reason: `Confiança óptica crítica (${Math.round(ocrResultConfidence)}%). Risco iminente de não detecção de dados pessoais por ilegibilidade.`
              };
            } else {
              ocrQuality = {
                status: 'ok',
                meanConfidence: ocrResultConfidence || 100,
                wordCount
              };
            }
          }
        }

        pagesData.push({
          pageIndex: i - 1,
          pageWidth: viewport.width,
          pageHeight: viewport.height,
          fullText,
          items,
          isScanned,
          ocrQuality
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

    // 2. Busca em sequência de itens de palavras isoladas ou fragmentos OCR
    if (rects.length === 0) {
      const searchWords = cleanSearchNorm.includes(' ')
        ? cleanSearchNorm.split(/\s+/).filter(w => w.length > 0)
        : null;

      if (searchWords && searchWords.length > 1) {
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
            // Agrupamento por linha para preservar geometria correta mesmo se houver quebra de linha
            const linesGroup: TextItemBounds[][] = [];
            matchedItems.forEach(item => {
              const grp = linesGroup.find(g => Math.abs(g[0].y - item.y) <= 4.0);
              if (grp) grp.push(item);
              else linesGroup.push([item]);
            });

            for (const lineItems of linesGroup) {
              const minX = Math.min(...lineItems.map(it => it.x));
              const minY = Math.min(...lineItems.map(it => it.y));
              const maxX = Math.max(...lineItems.map(it => it.x + it.width));
              const maxH = Math.max(...lineItems.map(it => it.height));

              rects.push({
                pageIndex: pageData.pageIndex,
                x: Math.max(0, minX - 1),
                y: Math.max(0, minY - 1),
                width: Math.max(12, (maxX - minX) + 2),
                height: maxH + 2
              });
            }
          }
        }
      } else {
        // Busca resiliente por tokens adjacentes na mesma linha (ex: CPF / CNPJ / RG / telefone dividido pelo OCR)
        const cleanNoPunct = cleanSearchNorm.replace(/[\s.\/\\-]/g, '');
        for (let i = 0; i < pageData.items.length; i++) {
          let accumText = '';
          let accumNoPunct = '';
          const matchedSlice: TextItemBounds[] = [];

          for (let j = i; j < Math.min(pageData.items.length, i + 6); j++) {
            const it = pageData.items[j];
            if (matchedSlice.length > 0 && Math.abs(matchedSlice[0].y - it.y) > 4.0) {
              break;
            }
            matchedSlice.push(it);
            accumText += this.stripAccents(it.text).toLowerCase();
            accumNoPunct += this.stripAccents(it.text).toLowerCase().replace(/[\s.\/\\-]/g, '');

            if (accumText.includes(cleanSearchNorm) || (cleanNoPunct.length >= 5 && accumNoPunct.includes(cleanNoPunct))) {
              const minX = Math.min(...matchedSlice.map(item => item.x));
              const minY = Math.min(...matchedSlice.map(item => item.y));
              const maxX = Math.max(...matchedSlice.map(item => item.x + item.width));
              const maxH = Math.max(...matchedSlice.map(item => item.height));

              rects.push({
                pageIndex: pageData.pageIndex,
                x: Math.max(0, minX - 1),
                y: Math.max(0, minY - 1),
                width: Math.max(12, (maxX - minX) + 2),
                height: maxH + 2
              });
              break;
            }
          }
        }
      }
    }

    return rects;
  }
}
