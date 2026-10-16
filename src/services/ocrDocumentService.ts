import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createOfflineWorker } from './tesseractOfflineConfig';

// Configuração do Worker 100% Local e Offline do PDF.js via Vite
const pdfjs = (pdfjsLib as any).getDocument ? pdfjsLib : ((pdfjsLib as any).default || pdfjsLib);
if (typeof window !== 'undefined' && 'Worker' in window && pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export interface DocumentPageMeta {
  pageNumber: number; // 1-indexed
  width: number;
  height: number;
  thumbnailUrl?: string;
  sourceFile?: File;
  selected: boolean;
}

export interface InspectDocumentResult {
  documentName: string;
  fileType: 'pdf' | 'images';
  totalPages: number;
  pages: DocumentPageMeta[];
  fileSize: number;
}

export interface OcrWordBounds {
  text: string;
  x: number; // PDF coordinates (origem bottom-left)
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface OcrLineBounds {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  words: OcrWordBounds[];
}

export interface OcrProcessedPage {
  pageNumber: number;
  width: number;
  height: number;
  fullText: string; // Editável pelo usuário durante a revisão
  rawOcrText: string;
  confidence: number; // Média da página (0 a 100)
  status: 'complete' | 'incomplete' | 'warning' | 'error';
  issues: string[];
  previewImageUrl: string; // Imagem renderizada da página em alta resolução
  lines: OcrLineBounds[];
  words: OcrWordBounds[];
  isRevised?: boolean;
}

export interface OcrProgressState {
  message: string;
  percent: number;
  currentPage?: number;
  totalPages?: number;
}

export type OcrProgressCallback = (state: OcrProgressState) => void;

export class OcrDocumentService {
  /**
   * Inspeciona um arquivo PDF ou lote de imagens e gera os metadados de páginas
   * com miniaturas para seleção prévia pelo usuário.
   */
  static async inspectDocument(
    files: File[]
  ): Promise<InspectDocumentResult> {
    if (!files || files.length === 0) {
      throw new Error('Nenhum arquivo fornecido para inspeção.');
    }

    const firstFile = files[0];
    const isSinglePdf = files.length === 1 && (firstFile.type === 'application/pdf' || firstFile.name.toLowerCase().endsWith('.pdf'));

    if (isSinglePdf) {
      const buffer = await firstFile.arrayBuffer();
      const getDoc = pdfjs.getDocument || (pdfjsLib as any).getDocument;
      const loadingTask = getDoc({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        isEvalSupported: false,
      });

      const pdfDoc = await loadingTask.promise;
      const totalPages = pdfDoc.numPages;
      const pagesMeta: DocumentPageMeta[] = [];

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const mediaBox = (page as any).mediaBox || (page as any).view;
        const viewport = page.getViewport({ scale: 1.0, viewBox: mediaBox });

        let thumbnailUrl: string | undefined;
        if (typeof document !== 'undefined') {
          try {
            // Miniatura rápida a 0.35x para exibição na grade de seleção
            const thumbViewport = page.getViewport({ scale: 0.35, viewBox: mediaBox });
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(thumbViewport.width);
            canvas.height = Math.round(thumbViewport.height);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              await page.render({ canvasContext: ctx, viewport: thumbViewport }).promise;
              thumbnailUrl = canvas.toDataURL('image/jpeg', 0.65);
            }
          } catch (e) {
            console.warn(`[OcrDocumentService] Falha ao gerar miniatura da página ${i}:`, e);
          }
        }

        pagesMeta.push({
          pageNumber: i,
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
          thumbnailUrl,
          selected: true // Por padrão, todas as páginas vêm selecionadas
        });
      }

      return {
        documentName: firstFile.name,
        fileType: 'pdf',
        totalPages,
        pages: pagesMeta,
        fileSize: firstFile.size
      };
    } else {
      // Lista de imagens (ou arquivos mistos tratados como páginas individuais)
      const pagesMeta: DocumentPageMeta[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let width = 595;
        let height = 842;
        let thumbnailUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;

        if (file.type.startsWith('image/') && typeof window !== 'undefined') {
          try {
            await new Promise<void>((resolve) => {
              const img = new Image();
              const url = URL.createObjectURL(file);
              img.onload = () => {
                width = img.width || 595;
                height = img.height || 842;
                URL.revokeObjectURL(url);
                resolve();
              };
              img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve();
              };
              img.src = url;
            });
          } catch {}
        }

        pagesMeta.push({
          pageNumber: i + 1,
          width,
          height,
          thumbnailUrl,
          sourceFile: file,
          selected: true
        });
      }

      return {
        documentName: files.length === 1 ? files[0].name : `Lote de ${files.length} imagens`,
        fileType: 'images',
        totalPages: files.length,
        pages: pagesMeta,
        fileSize: files.reduce((acc, f) => acc + f.size, 0)
      };
    }
  }

  /**
   * Executa o OCR offline completo nas páginas selecionadas de um documento ou lote de imagens.
   */
  static async processDocumentOcr(
    files: File[],
    selectedPageNumbers: number[],
    ocrLanguage: string = 'por',
    onProgress?: OcrProgressCallback
  ): Promise<OcrProcessedPage[]> {
    if (!files || files.length === 0) {
      throw new Error('Nenhum arquivo fornecido para processamento OCR.');
    }

    const firstFile = files[0];
    const isSinglePdf = files.length === 1 && (firstFile.type === 'application/pdf' || firstFile.name.toLowerCase().endsWith('.pdf'));
    const results: OcrProcessedPage[] = [];

    onProgress?.({ message: 'Inicializando motor OCR Local (Português offline)...', percent: 5 });
    let ocrWorker: any = null;

    try {
      ocrWorker = await createOfflineWorker(ocrLanguage);

      if (isSinglePdf) {
        const buffer = await firstFile.arrayBuffer();
        const getDoc = pdfjs.getDocument || (pdfjsLib as any).getDocument;
        const loadingTask = getDoc({
          data: new Uint8Array(buffer),
          useSystemFonts: true,
          isEvalSupported: false,
        });
        const pdfDoc = await loadingTask.promise;
        const totalSelected = selectedPageNumbers.length;

        for (let idx = 0; idx < totalSelected; idx++) {
          const pageNum = selectedPageNumbers[idx];
          const percentBase = Math.round((idx / totalSelected) * 90);

          onProgress?.({
            message: `Renderizando página ${pageNum}/${pdfDoc.numPages} em alta resolução...`,
            percent: percentBase + 2,
            currentPage: idx + 1,
            totalPages: totalSelected
          });

          await new Promise(r => setTimeout(r, 0));
          const page = await pdfDoc.getPage(pageNum);
          const mediaBox = (page as any).mediaBox || (page as any).view;
          const origViewport = page.getViewport({ scale: 1.0, viewBox: mediaBox });

          // Escala 2.0x (144-200 DPI) para nitidez de OCR
          const ocrScale = 2.0;
          const ocrViewport = page.getViewport({ scale: ocrScale, viewBox: mediaBox });
          
          let previewDataUrl = '';
          let imageSource: any = null;

          if (typeof document !== 'undefined') {
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(ocrViewport.width);
            canvas.height = Math.round(ocrViewport.height);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              await page.render({ canvasContext: ctx, viewport: ocrViewport }).promise;
              previewDataUrl = canvas.toDataURL('image/jpeg', 0.88);
              imageSource = canvas;
            }
          }

          if (!imageSource) {
            results.push({
              pageNumber: pageNum,
              width: Math.round(origViewport.width),
              height: Math.round(origViewport.height),
              fullText: '',
              rawOcrText: '',
              confidence: 0,
              status: 'error',
              issues: ['Não foi possível renderizar a imagem da página para análise'],
              previewImageUrl: previewDataUrl,
              lines: [],
              words: []
            });
            continue;
          }

          onProgress?.({
            message: `Reconhecendo caracteres na página ${pageNum} (${idx + 1}/${totalSelected})...`,
            percent: percentBase + 8,
            currentPage: idx + 1,
            totalPages: totalSelected
          });

          const pageResult = await this.recognizeImageSource(
            ocrWorker,
            imageSource,
            ocrScale,
            origViewport.width,
            origViewport.height,
            pageNum,
            previewDataUrl
          );

          results.push(pageResult);
        }
      } else {
        // Lote de imagens
        const totalSelected = selectedPageNumbers.length;
        for (let idx = 0; idx < totalSelected; idx++) {
          const pageNum = selectedPageNumbers[idx];
          const file = files[pageNum - 1];
          if (!file) continue;

          const percentBase = Math.round((idx / totalSelected) * 90);
          onProgress?.({
            message: `Processando imagem ${idx + 1}/${totalSelected} (${file.name})...`,
            percent: percentBase + 5,
            currentPage: idx + 1,
            totalPages: totalSelected
          });

          const imgData = await this.loadImageFileToCanvas(file);
          const pageResult = await this.recognizeImageSource(
            ocrWorker,
            imgData.canvas,
            1.0,
            imgData.width,
            imgData.height,
            pageNum,
            imgData.previewDataUrl
          );

          results.push(pageResult);
        }
      }

      onProgress?.({ message: 'Reconhecimento OCR concluído com sucesso!', percent: 100 });
      return results;
    } finally {
      if (ocrWorker) {
        try {
          await ocrWorker.terminate();
        } catch {}
      }
    }
  }

  /**
   * Executa o reconhecimento óptico em um canvas/imagem e analisa palavras, linhas,
   * coordenadas no sistema PDF (origem bottom-left) e diagnóstico de reconhecimento incompleto.
   */
  private static async recognizeImageSource(
    worker: any,
    imageSource: any,
    scale: number,
    pageWidth: number,
    pageHeight: number,
    pageNumber: number,
    previewImageUrl: string
  ): Promise<OcrProcessedPage> {
    try {
      const ocrResult = await worker.recognize(imageSource);
      const data = ocrResult?.data;

      const fullText = (data?.text || '').trim();
      const meanConfidence = typeof data?.confidence === 'number' ? Math.round(data.confidence) : 0;
      const issues: string[] = [];

      const lines: OcrLineBounds[] = [];
      const allWords: OcrWordBounds[] = [];

      if (data?.lines && data.lines.length > 0) {
        for (const rawLine of data.lines) {
          if (!rawLine || !rawLine.text || rawLine.text.trim() === '') continue;
          const lBbox = rawLine.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 };
          const lineWords: OcrWordBounds[] = [];

          if (rawLine.words && rawLine.words.length > 0) {
            for (const rw of rawLine.words) {
              if (!rw || !rw.text || rw.text.trim() === '') continue;
              const wBbox = rw.bbox || lBbox;
              const wordX = Math.max(0, wBbox.x0 / scale);
              const wordY = Math.max(0, pageHeight - (wBbox.y1 / scale));
              const wordWidth = Math.max(4, (wBbox.x1 - wBbox.x0) / scale);
              const wordHeight = Math.max(8, (wBbox.y1 - wBbox.y0) / scale);
              const wConf = typeof rw.confidence === 'number' ? Math.round(rw.confidence) : meanConfidence;

              const wordObj: OcrWordBounds = {
                text: rw.text.trim(),
                x: wordX,
                y: wordY,
                width: wordWidth,
                height: wordHeight,
                confidence: wConf
              };
              lineWords.push(wordObj);
              allWords.push(wordObj);
            }
          }

          const lineX = Math.max(0, lBbox.x0 / scale);
          const lineY = Math.max(0, pageHeight - (lBbox.y1 / scale));
          const lineWidth = Math.max(10, (lBbox.x1 - lBbox.x0) / scale);
          const lineHeight = Math.max(8, (lBbox.y1 - lBbox.y0) / scale);
          const lConf = typeof rawLine.confidence === 'number' ? Math.round(rawLine.confidence) : meanConfidence;

          lines.push({
            text: rawLine.text.trim(),
            x: lineX,
            y: lineY,
            width: lineWidth,
            height: lineHeight,
            confidence: lConf,
            words: lineWords
          });
        }
      }

      // Diagnóstico minucioso de reconhecimento incompleto
      let status: 'complete' | 'incomplete' | 'warning' | 'error' = 'complete';

      if (fullText.length === 0) {
        status = 'warning';
        issues.push('Nenhum texto ou caractere legível foi identificado nesta página.');
      } else {
        if (meanConfidence < 65) {
          status = 'incomplete';
          issues.push(`Confiança média muito baixa (${meanConfidence}%). Texto com provável degradação visual ou manuscrito.`);
        } else if (meanConfidence < 75) {
          status = 'incomplete';
          issues.push(`Confiança média moderada (${meanConfidence}%). Recomenda-se conferência manual de nomes e números.`);
        }

        const lowConfWords = allWords.filter(w => w.confidence < 50);
        if (lowConfWords.length > 5) {
          issues.push(`${lowConfWords.length} palavras com confiança abaixo de 50% (caracteres apagados ou carimbados).`);
          if (status === 'complete') status = 'incomplete';
        }

        if (fullText.length < 20 && pageHeight > 400) {
          issues.push('Pouquíssimos caracteres detectados em uma página inteira. Verifique se há imagens sem texto.');
          if (status === 'complete') status = 'incomplete';
        }
      }

      return {
        pageNumber,
        width: Math.round(pageWidth),
        height: Math.round(pageHeight),
        fullText,
        rawOcrText: fullText,
        confidence: meanConfidence,
        status,
        issues,
        previewImageUrl,
        lines,
        words: allWords
      };
    } catch (err: any) {
      return {
        pageNumber,
        width: Math.round(pageWidth),
        height: Math.round(pageHeight),
        fullText: '',
        rawOcrText: '',
        confidence: 0,
        status: 'error',
        issues: [`Falha ao processar OCR: ${err?.message || 'Erro de leitura'}`],
        previewImageUrl,
        lines: [],
        words: []
      };
    }
  }

  /**
   * Carrega um arquivo de imagem em um canvas para processamento
   */
  private static async loadImageFileToCanvas(file: File): Promise<{
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    previewDataUrl: string;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context não suportado'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const previewDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        resolve({
          canvas,
          width: img.width,
          height: img.height,
          previewDataUrl
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Falha ao abrir imagem: ${file.name}`));
      };
      img.src = url;
    });
  }

  /**
   * Gera um PDF Pesquisável (Searchable PDF / Sandwich PDF):
   * Cada página preserva a imagem original escaneada como camada visual de fundo
   * e sobrepõe uma camada de texto invisível (opacity: 0) com as palavras e posições reais,
   * permitindo busca instantânea (Ctrl+F), seleção e cópia de texto em qualquer leitor.
   * Se o usuário revisou o texto na interface, o texto revisado é utilizado!
   */
  static async generateSearchablePdf(
    pages: OcrProcessedPage[],
    documentTitle: string = 'Documento Digitalizado Pesquisável',
    onProgress?: (percent: number) => void
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);

    doc.setTitle(documentTitle);
    doc.setSubject('Documento digitalizado com camada de texto pesquisável (OCR)');
    doc.setProducer('KovaxFiles OCR Engine (Offline)');
    doc.setCreator('KovaxFiles Desktop App');

    const total = pages.length;

    for (let i = 0; i < total; i++) {
      onProgress?.(Math.round(((i + 1) / total) * 90));
      await new Promise(r => setTimeout(r, 0));

      const pData = pages[i];
      const page = doc.addPage([pData.width, pData.height]);

      // 1. Embutir a imagem da página escaneada
      if (pData.previewImageUrl && pData.previewImageUrl.startsWith('data:image/')) {
        try {
          const isPng = pData.previewImageUrl.startsWith('data:image/png');
          const base64Data = pData.previewImageUrl.split(',')[1];
          const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

          const embeddedImage = isPng
            ? await doc.embedPng(imageBytes)
            : await doc.embedJpg(imageBytes);

          page.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: pData.width,
            height: pData.height
          });
        } catch (imgErr) {
          console.warn(`[OcrDocumentService] Falha ao embutir imagem na página ${pData.pageNumber}:`, imgErr);
          // Fundo de fallback neutro
          page.drawRectangle({
            x: 0,
            y: 0,
            width: pData.width,
            height: pData.height,
            color: rgb(0.98, 0.98, 0.98)
          });
        }
      }

      // 2. Sobrepor a camada de texto pesquisável invisível
      // Se a página foi editada/revisada pelo usuário ou se não tem posições detalhadas, desenha as linhas do texto revisado
      if (pData.isRevised || pData.lines.length === 0) {
        const textLines = (pData.fullText || '').split('\n').filter(l => l.trim() !== '');
        const startY = pData.height - 40;
        const lineSpacing = 14;

        for (let lIdx = 0; lIdx < textLines.length; lIdx++) {
          const lineY = Math.max(20, startY - (lIdx * lineSpacing));
          const sanitizedLine = textLines[lIdx].replace(/[^\x00-\xFF]/g, ' ');

          try {
            page.drawText(sanitizedLine, {
              x: 40,
              y: lineY,
              size: 10,
              font,
              opacity: 0 // Camada invisível pesquisável
            });
          } catch {}
        }
      } else {
        // Usa as coordenadas milimétricas extraídas pelo OCR para cada palavra ou linha
        for (const line of pData.lines) {
          if (line.words && line.words.length > 0) {
            for (const word of line.words) {
              const sanitizedWord = word.text.replace(/[^\x00-\xFF]/g, ' ');
              const fontSize = Math.max(6, Math.min(18, word.height * 0.85));

              try {
                page.drawText(sanitizedWord, {
                  x: word.x,
                  y: word.y,
                  size: fontSize,
                  font,
                  opacity: 0 // Camada invisível pesquisável (Ctrl+F)
                });
              } catch {}
            }
          } else {
            const sanitizedLine = line.text.replace(/[^\x00-\xFF]/g, ' ');
            const fontSize = Math.max(6, Math.min(18, line.height * 0.85));

            try {
              page.drawText(sanitizedLine, {
                x: line.x,
                y: line.y,
                size: fontSize,
                font,
                opacity: 0
              });
            } catch {}
          }
        }
      }
    }

    onProgress?.(98);
    const pdfBytes = await doc.save({ useObjectStreams: true });
    onProgress?.(100);
    return pdfBytes;
  }
}
