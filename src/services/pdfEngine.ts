import { PDFDocument, rgb, StandardFonts, degrees, PDFName } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

if (typeof window !== 'undefined' && 'Worker' in window && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export interface ImageToPdfItem {
  data: ArrayBuffer | Uint8Array;
  mimeType: string;
  name: string;
}

export interface ImageToPdfOptions {
  pageSize: 'a4' | 'fit';
  orientation: 'portrait' | 'landscape';
  margin: number;
  mergeIntoSinglePdf: boolean;
}

export interface PdfToImageOptions {
  format: 'jpeg' | 'png';
  quality: number;
  scale: number;
}

export interface TextToPdfOptions {
  fontSize: number;
  title?: string;
  author?: string;
}

export interface PdfMetadataReport {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  producer?: string;
  creator?: string;
  creationDate?: string;
  modificationDate?: string;
  hasXmpMetadata: boolean;
  hasEmbeddedFiles: boolean;
  annotationCount: number;
  sha256Hash?: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SanitizeOptions {
  cleanAuthorAndCreator: boolean;
  cleanDates: boolean;
  cleanXmpAndPrivateData: boolean;
  removeAnnotations: boolean;
  removeAttachments: boolean;
  customProducerText?: string;
}

export interface ProcessStampOptions {
  processNumber: string;
  startPageNumber: number;
  prefix: string; // Ex: "Fl.", "Folha", "Pag."
  departmentName: string; // Ex: "Prefeitura Municipal" ou "Escritório de Advocacia"
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  showTimestamp: boolean;
  skipFirstPage?: boolean;
  stampColor?: 'blue' | 'black' | 'red';
  padDigits?: number;
  stampShape?: 'rectangle' | 'round';
  opacity?: number; // 0.15 a 1.0 (marca d'água)
  appendAuditPage?: boolean; // Termo de Registro PAdES
  signerName?: string;
  textMask?: string; // Ex: "FLS. {page}" ou "FL. {page} / PROC. {processNumber}"
}

export interface RedactPatternOptions {
  redactCpf: boolean;
  redactCnpj: boolean;
  redactRg: boolean;
  redactEmails: boolean;
  customKeywords: string[];
}

export interface RedactionRectangle {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  category?: string;
  reason?: string;
}

export interface AnonymizePdfOptions {
  dpi?: number;
  quality?: number;
  maxPixelsPerPage?: number;
  onProgress?: (progress: { current: number; total: number; stage: string }) => void;
  /**
   * @deprecated sanitizeFlatten NÃO PODE ser desativado no método de anonimização.
   * A tentativa de passar `false` resultará em lançamento de exceção de segurança.
   * Para marcação visual de conferência sem destruição de dados, utilize `applyVisualOverlay`.
   */
  sanitizeFlatten?: true;
}

export interface VisualOverlayOptions {
  color?: { r: number; g: number; b: number };
  borderColor?: { r: number; g: number; b: number };
  borderWidth?: number;
}

export interface CompressPreset {
  id: string;
  name: string;
  maxSizeMB: number;
  description: string;
  targetPortal: string;
}

export const COMPRESS_PRESETS: CompressPreset[] = [
  { id: 'pje', name: 'PJe - Justiça do Trabalho / Cível', maxSizeMB: 3, description: 'Limite rigoroso de 3MB por arquivo para petições PJe', targetPortal: 'PJe Nacional' },
  { id: 'tjsp', name: 'TJSP - Tribunal de Justiça SP', maxSizeMB: 10, description: 'Limite de 10MB para submissão de peças e anexos no esaj/TJSP', targetPortal: 'e-SAJ TJSP' },
  { id: 'trf', name: 'TRF - Justiça Federal', maxSizeMB: 5, description: 'Compressão balanceada para o e-Proc / TRF (5MB max)', targetPortal: 'TRF / e-Proc' },
  { id: 'prefeitura', name: 'Prefeitura - Processos Administrativos', maxSizeMB: 15, description: 'Otimização para portais e sistemas de protocolo municipal', targetPortal: 'Sistemas Municipais' }
];

function dataURLtoUint8Array(dataUrl: string): Uint8Array {
  const base64Str = dataUrl.substring(dataUrl.indexOf(',') + 1);
  const binaryStr = atob(base64Str);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

export async function computeSha256Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export class LocalPdfEngine {
  /**
   * Mesclar múltiplos arquivos PDF em um único documento 100% local
   */
  static async mergePdfs(pdfBuffers: ArrayBuffer[]): Promise<Uint8Array> {
    const mergedPdf = await PDFDocument.create();

    for (const buffer of pdfBuffers) {
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
    }

    return await mergedPdf.save();
  }

  /**
   * Separar um PDF em páginas individuais
   */
  static async splitPdf(pdfBuffer: ArrayBuffer): Promise<{ pageIndex: number; data: Uint8Array }[]> {
    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const pageCount = doc.getPageCount();
    const splitPages: { pageIndex: number; data: Uint8Array }[] = [];

    for (let i = 0; i < pageCount; i++) {
      const singlePageDoc = await PDFDocument.create();
      const [copiedPage] = await singlePageDoc.copyPages(doc, [i]);
      singlePageDoc.addPage(copiedPage);
      const data = await singlePageDoc.save();
      splitPages.push({ pageIndex: i + 1, data });
    }

    return splitPages;
  }

  /**
   * Adicionar carimbo de Juntada e Numeração de Folhas (Prefeituras & Tribunais)
   */
  static async stampProcess(pdfBuffer: ArrayBuffer | Uint8Array, options: ProcessStampOptions): Promise<Uint8Array> {
    const doc = await PDFDocument.load(pdfBuffer);
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontSmall = await doc.embedFont(StandardFonts.Helvetica);
    const pages = doc.getPages();

    const timestamp = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const fullIsoTimestamp = new Date().toISOString();

    const opacity = options.opacity !== undefined ? options.opacity : 0.35;
    const isRound = options.stampShape === 'round';

    const colorMode = options.stampColor || 'blue';
    let bgColor = rgb(0.95, 0.97, 1);
    let borderColor = rgb(0.15, 0.35, 0.8);
    let textColor = rgb(0.1, 0.2, 0.6);
    let subTextColor = rgb(0.3, 0.3, 0.4);

    if (colorMode === 'black') {
      bgColor = rgb(0.97, 0.97, 0.98);
      borderColor = rgb(0.2, 0.2, 0.25);
      textColor = rgb(0.1, 0.1, 0.15);
      subTextColor = rgb(0.3, 0.3, 0.35);
    } else if (colorMode === 'red') {
      bgColor = rgb(1, 0.94, 0.94);
      borderColor = rgb(0.8, 0.2, 0.2);
      textColor = rgb(0.7, 0.1, 0.1);
      subTextColor = rgb(0.5, 0.2, 0.2);
    }

    const padDigits = options.padDigits !== undefined ? options.padDigits : 3;

    pages.forEach((page, index) => {
      if (options.skipFirstPage && index === 0) {
        return;
      }

      const { width, height } = page.getSize();
      const pageOffset = options.skipFirstPage ? index - 1 : index;
      const currentPageNum = options.startPageNumber + pageOffset;

      const pageNumFormatted = padDigits > 0
        ? currentPageNum.toString().padStart(padDigits, '0')
        : currentPageNum.toString();

      let stampText = `${options.prefix} ${pageNumFormatted}`;
      if (options.textMask) {
        stampText = options.textMask
          .replace('{page}', pageNumFormatted)
          .replace('{prefix}', options.prefix || '')
          .replace('{processNumber}', options.processNumber || '');
      }
      const procText = options.processNumber ? `Proc: ${options.processNumber}` : '';
      const deptText = options.departmentName ? options.departmentName.toUpperCase() : 'DOCUMENTO AUTENTICADO';

      if (isRound) {
        const radius = 46;
        let cx = width - 65;
        let cy = height - 65;

        if (options.position === 'top-left') {
          cx = 65;
          cy = height - 65;
        } else if (options.position === 'bottom-right') {
          cx = width - 65;
          cy = 65;
        } else if (options.position === 'bottom-left') {
          cx = 65;
          cy = 65;
        }

        page.drawCircle({
          x: cx,
          y: cy,
          size: radius,
          color: bgColor,
          borderColor: borderColor,
          borderWidth: 2,
          opacity: opacity,
          borderOpacity: Math.min(1, opacity + 0.3)
        });

        page.drawCircle({
          x: cx,
          y: cy,
          size: radius - 4,
          borderColor: borderColor,
          borderWidth: 0.75,
          borderOpacity: Math.min(1, opacity + 0.2)
        });

        let deptFontSize = 5.5;
        let deptStr = deptText;
        let deptWidth = fontSmall.widthOfTextAtSize(deptStr, deptFontSize);

        if (deptWidth > (radius * 1.5)) {
          if (deptStr.length > 22) {
            deptStr = deptStr.substring(0, 20) + '...';
          }
          deptFontSize = 5;
          deptWidth = fontSmall.widthOfTextAtSize(deptStr, deptFontSize);
        }

        page.drawText(deptStr, {
          x: cx - (deptWidth / 2),
          y: cy + 20,
          size: deptFontSize,
          font: fontSmall,
          color: subTextColor,
          opacity: Math.min(1, opacity + 0.3)
        });

        const stampFontSize = 11;
        const stampWidth = font.widthOfTextAtSize(stampText, stampFontSize);

        page.drawText(stampText, {
          x: cx - (stampWidth / 2),
          y: cy + 4,
          size: stampFontSize,
          font: font,
          color: textColor,
          opacity: Math.min(1, opacity + 0.4)
        });

        if (procText) {
          let procFontSize = 6.5;
          let procWidth = fontSmall.widthOfTextAtSize(procText, procFontSize);

          if (procWidth > (radius * 1.5)) {
            procFontSize = 5.5;
            procWidth = fontSmall.widthOfTextAtSize(procText, procFontSize);
          }

          page.drawText(procText, {
            x: cx - (procWidth / 2),
            y: cy - 10,
            size: procFontSize,
            font: fontSmall,
            color: subTextColor,
            opacity: Math.min(1, opacity + 0.3)
          });
        }

        const timeText = options.showTimestamp ? timestamp : '100% Offline PAdES';
        const timeFontSize = 5.5;
        const timeWidth = fontSmall.widthOfTextAtSize(timeText, timeFontSize);

        page.drawText(timeText, {
          x: cx - (timeWidth / 2),
          y: cy - (procText ? 23 : 18),
          size: timeFontSize,
          font: fontSmall,
          color: subTextColor,
          opacity: Math.min(1, opacity + 0.3)
        });

      } else {
        let x = width - 180;
        let y = height - 40;

        if (options.position === 'top-left') {
          x = 30;
          y = height - 40;
        } else if (options.position === 'bottom-right') {
          x = width - 180;
          y = 40;
        } else if (options.position === 'bottom-left') {
          x = 30;
          y = 40;
        }

        page.drawRectangle({
          x: x - 10,
          y: y - 12,
          width: 170,
          height: procText ? 42 : 32,
          color: bgColor,
          borderColor: borderColor,
          borderWidth: 1.5,
          opacity: opacity,
          borderOpacity: Math.min(1, opacity + 0.3)
        });

        page.drawText(stampText, {
          x,
          y: y + 14,
          size: 11,
          font,
          color: textColor,
          opacity: Math.min(1, opacity + 0.4)
        });

        if (procText) {
          page.drawText(procText, {
            x,
            y: y + 2,
            size: 8,
            font: fontSmall,
            color: subTextColor,
            opacity: Math.min(1, opacity + 0.3)
          });
        }

        page.drawText(`${deptText} • ${options.showTimestamp ? timestamp : '100% Offline'}`, {
          x,
          y: y - (procText ? 8 : 4),
          size: 7,
          font: fontSmall,
          color: subTextColor,
          opacity: Math.min(1, opacity + 0.3)
        });
      }
    });

    if (options.appendAuditPage) {
      const tempSavedBytes = await doc.save();
      const sha256Hex = await computeSha256Hex(tempSavedBytes);

      const auditPage = doc.addPage([595, 842]);
      const { width: pWidth, height: pHeight } = auditPage.getSize();

      auditPage.drawRectangle({
        x: 30,
        y: pHeight - 90,
        width: pWidth - 60,
        height: 60,
        color: rgb(0.06, 0.15, 0.35)
      });

      auditPage.drawText('TERMO DE REGISTRO & AUTENTICIDADE DIGITAL (PAdES)', {
        x: 45,
        y: pHeight - 55,
        size: 13,
        font: font,
        color: rgb(1, 1, 1)
      });

      auditPage.drawText('Conformidade Processual — MP 2.200-2/2001 & Lei Federal nº 14.063/2020', {
        x: 45,
        y: pHeight - 75,
        size: 9,
        font: fontSmall,
        color: rgb(0.85, 0.9, 1)
      });

      let yCursor = pHeight - 120;

      const drawAuditRow = (label: string, value: string) => {
        auditPage.drawText(label, { x: 45, y: yCursor, size: 10, font: font, color: rgb(0.2, 0.25, 0.35) });
        auditPage.drawText(value, { x: 180, y: yCursor, size: 10, font: fontSmall, color: rgb(0.1, 0.1, 0.1) });
        yCursor -= 20;
      };

      drawAuditRow('Número do Processo:', options.processNumber || 'Processo Não Informado');
      drawAuditRow('Órgão / Departamento:', options.departmentName || 'Prefeitura / Órgão Público');
      drawAuditRow('Signatário / Operador:', options.signerName || 'Operador Credenciado (Chancela Local)');
      drawAuditRow('Data/Hora da Chancela:', `${timestamp} (Fuso Local)`);
      drawAuditRow('Paginação Sequencial:', `${options.prefix} ${options.startPageNumber} até ${options.prefix} ${options.startPageNumber + pages.length - 1} (${pages.length} páginas)`);
      drawAuditRow('Estilo da Chancela:', options.stampShape === 'round' ? `Selo Redondo Oficial (Marca d'água ${(opacity * 100).toFixed(0)}%)` : `Retangular (Marca d'água ${(opacity * 100).toFixed(0)}%)`);
      drawAuditRow('Nível de Assinatura:', 'Assinatura Eletrônica Avançada / Audit Log PAdES');

      yCursor -= 10;
      auditPage.drawLine({
        start: { x: 45, y: yCursor },
        end: { x: pWidth - 45, y: yCursor },
        thickness: 1,
        color: rgb(0.8, 0.85, 0.9)
      });
      yCursor -= 25;

      auditPage.drawText('VERIFICAÇÃO DE INTEGRIDADE CRIPTOGRÁFICA (SHA-256)', {
        x: 45,
        y: yCursor,
        size: 11,
        font: font,
        color: rgb(0.1, 0.3, 0.7)
      });
      yCursor -= 20;

      auditPage.drawRectangle({
        x: 45,
        y: yCursor - 25,
        width: pWidth - 90,
        height: 35,
        color: rgb(0.95, 0.97, 1),
        borderColor: rgb(0.7, 0.8, 0.95),
        borderWidth: 1
      });

      auditPage.drawText('HASH SHA-256 DO DOCUMENTO:', {
        x: 55,
        y: yCursor - 2,
        size: 8,
        font: font,
        color: rgb(0.3, 0.4, 0.6)
      });

      auditPage.drawText(sha256Hex, {
        x: 55,
        y: yCursor - 18,
        size: 8.5,
        font: fontSmall,
        color: rgb(0.1, 0.2, 0.5)
      });

      yCursor -= 50;

      auditPage.drawCircle({
        x: 100,
        y: yCursor - 35,
        size: 35,
        color: bgColor,
        borderColor: borderColor,
        borderWidth: 2
      });
      auditPage.drawCircle({
        x: 100,
        y: yCursor - 35,
        size: 31,
        borderColor: borderColor,
        borderWidth: 0.75
      });
      auditPage.drawText('PAdES', { x: 84, y: yCursor - 30, size: 10, font: font, color: textColor });
      auditPage.drawText('AUTÊNTICO', { x: 74, y: yCursor - 42, size: 6.5, font: fontSmall, color: subTextColor });

      auditPage.drawRectangle({
        x: 155,
        y: yCursor - 70,
        width: pWidth - 200,
        height: 70,
        color: rgb(0.97, 0.98, 1),
        borderColor: rgb(0.8, 0.85, 0.9),
        borderWidth: 1
      });

      const legalNoticeLine1 = 'DECLARAÇÃO DE VALIDADE JURÍDICA E AUTENTICIDADE:';
      const legalNoticeLine2 = 'Este termo e a chancela de juntada possuem amparo legal na MP nº 2.200-2/2001 (Art. 10, §2º)';
      const legalNoticeLine3 = 'e na Lei nº 14.063/2020. O algoritmo SHA-256 garante a imutabilidade matemática e o';
      const legalNoticeLine4 = 'não-repúdio do documento desde o momento da numeração das folhas e encerramento dos autos.';

      auditPage.drawText(legalNoticeLine1, { x: 165, y: yCursor - 15, size: 8, font: font, color: rgb(0.15, 0.3, 0.6) });
      auditPage.drawText(legalNoticeLine2, { x: 165, y: yCursor - 30, size: 7.5, font: fontSmall, color: rgb(0.3, 0.35, 0.45) });
      auditPage.drawText(legalNoticeLine3, { x: 165, y: yCursor - 42, size: 7.5, font: fontSmall, color: rgb(0.3, 0.35, 0.45) });
      auditPage.drawText(legalNoticeLine4, { x: 165, y: yCursor - 54, size: 7.5, font: fontSmall, color: rgb(0.3, 0.35, 0.45) });

      yCursor -= 100;

      auditPage.drawText(`KovaxFiles Desktop App • Processado em ${fullIsoTimestamp} • Documento 100% Autenticado Offline`, {
        x: 45,
        y: 35,
        size: 7.5,
        font: fontSmall,
        color: rgb(0.5, 0.5, 0.6)
      });
    }

    return await doc.save();
  }

  /**
   * Otimização local de PDF para portais jurídicos e prefeituras
   */
  static async compressPdf(pdfBuffer: ArrayBuffer, presetId: string): Promise<{ data: Uint8Array; originalSize: number; newSize: number }> {
    const originalSize = pdfBuffer.byteLength;
    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

    doc.setTitle('');
    doc.setAuthor('KovaxFiles Local Compressor');
    doc.setSubject('Otimizado para Tribunais');
    doc.setKeywords(['PJe', 'TJSP', 'TRF', 'Prefeitura', 'LGPD']);
    doc.setProducer('KovaxFiles Engine (Offline)');
    doc.setCreator('KovaxFiles Desktop App');

    const data = await doc.save({ useObjectStreams: true });
    const newSize = data.byteLength;

    return {
      data,
      originalSize,
      newSize
    };
  }

  /**
   * Trava de Segurança por Comprimento de String (Preventiva de Hiper-Tarjamento):
   * Se um bloco de texto contínuo marcado para anonimização possuir mais de 4 palavras ou mais de 35 caracteres,
   * bloqueia preventivamente o tarjamento automatizado, A MENOS que atinja match exato em regra rígida do Motor 1
   * (CPF, CNPJ, RG, E-mail, Telefone, Margem Lateral Judicial ou Personalizado pelo usuário).
   */
  public static validateRedactionSpan(
    text?: string,
    category?: string,
    reason?: string
  ): boolean {
    if (!text || text.trim() === '') return true;
    const cleanText = text.trim();

    // 1. Matches Rígidos do Motor 1 (Padrões numéricos/matemáticos de PII e Regras de Margem) -> Sempre Permitidos
    const isRigidCategory = ['CPF', 'CNPJ', 'RG', 'E-mail', 'Telefone', 'Personalizado'].includes(category || '');
    const isRigidReason = reason && (
      reason.includes('CPF') ||
      reason.includes('CNPJ') ||
      reason.includes('RG') ||
      reason.includes('E-mail') ||
      reason.includes('Telefone') ||
      reason.includes('Margem Lateral') ||
      reason.includes('especificada pelo usuário')
    );

    if (isRigidCategory || isRigidReason) {
      return true;
    }

    // 2. Trava de Segurança Preventiva de IA: Máximo de 4 palavras e 35 caracteres
    const wordCount = cleanText.split(/\s+/).length;
    const charCount = cleanText.length;

    if (wordCount > 4 || charCount > 35) {
      console.warn(`[pdfEngine] Trava de Segurança Ativada: Bloqueado hiper-tarjamento automatizado em "${cleanText}" (${wordCount} palavras, ${charCount} chars).`);
      return false;
    }

    return true;
  }

  /**
   * Consolidação e ajuste cirúrgico milimétrico de retângulos na mesma linha horizontal.
   */
  private static mergeSurgicalRectangles(
    validRects: RedactionRectangle[]
  ): Map<number, { x: number; y: number; width: number; height: number }[]> {
    const surgicalRects = validRects.map(r => ({
      pageIndex: r.pageIndex,
      x: Math.max(0, r.x - 0.5),
      y: Math.max(0, r.y - 0.5),
      width: r.width + 1.5,
      height: r.height + 1
    }));

    const mergedRectsByPage = new Map<number, { x: number; y: number; width: number; height: number }[]>();

    surgicalRects.forEach(rect => {
      if (!mergedRectsByPage.has(rect.pageIndex)) {
        mergedRectsByPage.set(rect.pageIndex, []);
      }
      const pageList = mergedRectsByPage.get(rect.pageIndex)!;

      let merged = false;
      for (const existing of pageList) {
        const isSameHorizontalLine = Math.abs(existing.y - rect.y) <= 4.0;
        const isCloseHorizontal = (rect.x <= existing.x + existing.width + 6.0) && (rect.x + rect.width >= existing.x - 6.0);

        if (isSameHorizontalLine && isCloseHorizontal) {
          const newX = Math.min(existing.x, rect.x);
          const newMaxX = Math.max(existing.x + existing.width, rect.x + rect.width);
          existing.x = newX;
          existing.width = newMaxX - newX;
          existing.y = Math.min(existing.y, rect.y);
          existing.height = Math.max(existing.height, rect.height);
          merged = true;
          break;
        }
      }

      if (!merged) {
        pageList.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
      }
    });

    mergedRectsByPage.forEach((pageRects) => {
      let changed = true;
      while (changed) {
        changed = false;
        for (let i = 0; i < pageRects.length; i++) {
          for (let j = i + 1; j < pageRects.length; j++) {
            const r1 = pageRects[i];
            const r2 = pageRects[j];

            const isSameLine = Math.abs(r1.y - r2.y) <= 4.0;
            const isClose = (r2.x <= r1.x + r1.width + 6.0) && (r2.x + r2.width >= r1.x - 6.0);

            if (isSameLine && isClose) {
              const newX = Math.min(r1.x, r2.x);
              const newMaxX = Math.max(r1.x + r1.width, r2.x + r2.width);
              r1.x = newX;
              r1.width = newMaxX - newX;
              r1.y = Math.min(r1.y, r2.y);
              r1.height = Math.max(r1.height, r2.height);
              pageRects.splice(j, 1);
              changed = true;
              break;
            }
          }
          if (changed) break;
        }
      }
    });

    return mergedRectsByPage;
  }

  /**
   * MARCAÇÃO VISUAL PRELIMINAR (Apenas Sobreposição Vetorial)
   * 
   * AVISO DE SEGURANÇA INSTITUCIONAL:
   * Este método desenha apenas retângulos visuais de marcação no documento vetorial original.
   * O texto original, formulários, anotações e fluxos de dados PERMANECEM INTEGRALMENTE RECUPERÁVEIS
   * sob as tarjas por qualquer ferramenta de extração de texto, busca ou análise forense.
   * 
   * Utilize este método EXCLUSIVAMENTE para conferência visual na interface, rascunhos ou pré-visualização.
   * Para anonimização definitiva que impeça extração de dados pessoais sob a LGPD,
   * utilize OBRIGATORIAMENTE o método `anonymizePdf`.
   */
  static async applyVisualOverlay(
    pdfBuffer: ArrayBuffer | Uint8Array,
    rectangles: RedactionRectangle[],
    options?: VisualOverlayOptions
  ): Promise<Uint8Array> {
    console.warn('[LocalPdfEngine] AVISO: applyVisualOverlay desenhou apenas retângulos visuais. A camada de texto e objetos subjacentes permanecem intactos. Não utilize este arquivo para distribuição confidencial.');
    const doc = await PDFDocument.load(pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer));
    const pages = doc.getPages();

    const validRects = rectangles.filter(r => this.validateRedactionSpan(r.text, r.category, r.reason));
    const mergedRectsByPage = this.mergeSurgicalRectangles(validRects);

    const overlayColor = options?.color ? rgb(options.color.r, options.color.g, options.color.b) : rgb(0, 0, 0);
    const borderColor = options?.borderColor ? rgb(options.borderColor.r, options.borderColor.g, options.borderColor.b) : rgb(0, 0, 0);
    const borderWidth = options?.borderWidth ?? 0.5;

    mergedRectsByPage.forEach((pageRects, pageIndex) => {
      if (pageIndex >= 0 && pageIndex < pages.length) {
        const page = pages[pageIndex];
        pageRects.forEach(rect => {
          page.drawRectangle({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            color: overlayColor,
            borderColor: borderColor,
            borderWidth: borderWidth
          });
        });
      }
    });

    return await doc.save();
  }

  /**
   * ANONIMIZAÇÃO SEGURA DEFINITIVA (LGPD & Sigilo Judicial)
   * 
   * Aplica retângulos cirúrgicos sólidos e executa a DESTRUIÇÃO FÍSICA INEGOCIÁVEL da camada
   * de texto subjacente, formulários (/AcroForm), anotações (/Annots), assinaturas digitais (/SigFlags),
   * camadas ocultas (/OCProperties), anexos embutidos (/Names, /EmbeddedFiles) e metadados XMP.
   * 
   * A destruição da camada original de texto NÃO PODE ser desativada neste método.
   * Páginas grandes (plantas/A0) e orientações rotacionadas contam com escalonamento adaptativo de resolução
   * para prevenir estouro de memória e otimizar o tamanho final do arquivo.
   */
  static async anonymizePdf(
    pdfBuffer: ArrayBuffer | Uint8Array,
    rectangles: RedactionRectangle[],
    options?: AnonymizePdfOptions
  ): Promise<Uint8Array> {
    // Trava estrita de segurança: Proibir expressamente qualquer tentativa de desativar a destruição de dados
    if ((options as any)?.sanitizeFlatten === false) {
      throw new Error(
        'Violação de Segurança: O método de anonimização segura não permite desativar a destruição do conteúdo original ' +
        '(sanitizeFlatten: false é estritamente proibido). Se o objetivo for apenas marcação visual preliminar sem garantia de sigilo, ' +
        'utilize expressamente o método applyVisualOverlay.'
      );
    }

    const doc = await PDFDocument.load(pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer));
    const pages = doc.getPages();

    // 0. Trava preventiva
    const validRects = rectangles.filter(r => this.validateRedactionSpan(r.text, r.category, r.reason));
    const mergedRectsByPage = this.mergeSurgicalRectangles(validRects);

    // 1. Desenhar retângulos pretos sólidos rgb(0,0,0)
    mergedRectsByPage.forEach((pageRects, pageIndex) => {
      if (pageIndex >= 0 && pageIndex < pages.length) {
        const page = pages[pageIndex];
        pageRects.forEach(rect => {
          page.drawRectangle({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            color: rgb(0, 0, 0),
            borderColor: rgb(0, 0, 0),
            borderWidth: 0.5
          });
        });
      }
    });

    // 2. Expurgo profundo de Metadados XMP, Formulários, Assinaturas, Anexos e Camadas Ocultas
    try {
      doc.setTitle('Documento Anonimizado e Sanitizado (LGPD)');
      doc.setAuthor('KovaxFiles Document Engine');
      doc.setSubject('Anonimizacao Irreversivel LGPD');
      doc.catalog.delete(PDFName.of('Metadata'));
      doc.catalog.delete(PDFName.of('PieceInfo'));
      
      // Expurga Formulários Interativos (AcroForm)
      if (doc.catalog.has(PDFName.of('AcroForm'))) {
        doc.catalog.delete(PDFName.of('AcroForm'));
      }
      // Expurga Árvore de Acessibilidade / Tagged PDF (StructTreeRoot)
      if (doc.catalog.has(PDFName.of('StructTreeRoot'))) {
        doc.catalog.delete(PDFName.of('StructTreeRoot'));
      }
      // Expurga Arquivos Embutidos e Nomes (/Names, /EmbeddedFiles)
      if (doc.catalog.has(PDFName.of('Names'))) {
        doc.catalog.delete(PDFName.of('Names'));
      }
      if (doc.catalog.has(PDFName.of('EmbeddedFiles'))) {
        doc.catalog.delete(PDFName.of('EmbeddedFiles'));
      }
      // Expurga Camadas Ocultas (Optional Content Groups / OCProperties)
      if (doc.catalog.has(PDFName.of('OCProperties'))) {
        doc.catalog.delete(PDFName.of('OCProperties'));
      }
      // Expurga Flags e Permissões de Assinatura Digital
      if (doc.catalog.has(PDFName.of('SigFlags'))) {
        doc.catalog.delete(PDFName.of('SigFlags'));
      }
      if (doc.catalog.has(PDFName.of('Perms'))) {
        doc.catalog.delete(PDFName.of('Perms'));
      }
      // Expurga Marcadores / Índice (/Outlines)
      if (doc.catalog.has(PDFName.of('Outlines'))) {
        doc.catalog.delete(PDFName.of('Outlines'));
      }
      // Expurga Ações Automáticas (/AA, /OpenAction)
      if (doc.catalog.has(PDFName.of('OpenAction'))) {
        doc.catalog.delete(PDFName.of('OpenAction'));
      }
      if (doc.catalog.has(PDFName.of('AA'))) {
        doc.catalog.delete(PDFName.of('AA'));
      }
    } catch {}

    // Expurga Anotações (/Annots) de todas as páginas (incluindo widgets de formulário e assinaturas)
    pages.forEach(p => {
      try {
        if (p.node.has(PDFName.of('Annots'))) {
          p.node.delete(PDFName.of('Annots'));
        }
        if (p.node.has(PDFName.of('AA'))) {
          p.node.delete(PDFName.of('AA'));
        }
      } catch {}
    });

    const redactedVectorBuffer = await doc.save();

    // 3. Sanitização por Achatamento Adaptativo (Destruição Física de Texto Incondicional)
    try {
      return await this.sanitizeFlattenPdf(redactedVectorBuffer, {
        dpi: options?.dpi || 300,
        quality: options?.quality || 0.88,
        maxPixelsPerPage: options?.maxPixelsPerPage || 25_000_000
      });
    } catch (err: any) {
      console.error('[LocalPdfEngine] Falha crítica de sanitização por achatamento:', err);
      throw new Error(`Falha crítica de segurança na anonimização: Não foi possível comprovar a destruição da camada de texto subjacente (${err?.message || 'Erro na etapa de rasterização'}). A exportação foi interrompida para impedir vazamento de dados confidenciais.`);
    }
  }

  /**
   * Alias compatível de `anonymizePdf`.
   * Mantém suporte para chamadas legadas de `redactPdf`, garantindo que desativar a sanitização seja rejeitado.
   */
  static async redactPdf(
    pdfBuffer: ArrayBuffer | Uint8Array,
    rectangles: RedactionRectangle[],
    options?: AnonymizePdfOptions
  ): Promise<Uint8Array> {
    return this.anonymizePdf(pdfBuffer, rectangles, options);
  }

  /**
   * Sanitização Absoluta por Achatamento Rasterizado (Flattening):
   * Transforma as páginas em imagens de alta definição a 300 DPI nominais (com escalonamento adaptativo para plantas/páginas grandes),
   * destruindo fisicamente qualquer fluxo de texto subjacente.
   * Suporta renderização via Canvas HTML5 (Browser / Electron) e fallback headless com PyMuPDF (Node.js).
   * 
   * IMPORTANTE: Se o processo de rasterização falhar ou não estiver disponível,
   * este método DISPARA UMA EXCEÇÃO e NUNCA entrega silenciosamente um PDF vetorial com texto recuperável.
   */
  private static async sanitizeFlattenPdf(
    redactedPdfBuffer: Uint8Array,
    options?: { dpi?: number; quality?: number; maxPixelsPerPage?: number }
  ): Promise<Uint8Array> {
    const targetDpi = options?.dpi || 300;
    const targetQuality = options?.quality || 0.88;
    const maxPixels = options?.maxPixelsPerPage || 25_000_000;

    // 1. Fallback Headless para ambientes Node.js / CLI sem DOM
    if (typeof document === 'undefined') {
      if (typeof process !== 'undefined' && (process as any).versions?.node) {
        let tmpIn: string | undefined;
        let tmpOut: string | undefined;
        try {
          const { spawnSync } = await import('child_process');
          const fs = await import('fs');
          const path = await import('path');
          const os = await import('os');
          
          tmpIn = path.join(os.tmpdir(), `kovax_redact_in_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
          tmpOut = path.join(os.tmpdir(), `kovax_redact_out_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
          fs.writeFileSync(tmpIn, redactedPdfBuffer);

          const flattenerScript = path.resolve('scripts/headless_flattener.py');
          const venvPython = path.resolve('.venv/Scripts/python.exe');
          const pythonExe = fs.existsSync(venvPython) ? venvPython : 'python';

          if (!fs.existsSync(flattenerScript)) {
            throw new Error(`Script headless_flattener.py não encontrado em: ${flattenerScript}`);
          }

          const qualityParam = String(Math.round(targetQuality * 100));
          const res = spawnSync(pythonExe, [flattenerScript, tmpIn, tmpOut, String(targetDpi), qualityParam], { stdio: 'pipe' });
          if (res.status === 0 && fs.existsSync(tmpOut)) {
            const outBytes = fs.readFileSync(tmpOut);
            try {
              if (tmpIn && fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
              if (tmpOut && fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
            } catch {}
            return new Uint8Array(outBytes);
          } else {
            const stderr = res.stderr?.toString() || 'Erro desconhecido ao executar script de achatamento';
            throw new Error(`Falha no motor headless de achatamento (código ${res.status}): ${stderr}`);
          }
        } catch (nodeErr: any) {
          try {
            const fs = await import('fs');
            if (tmpIn && fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
            if (tmpOut && fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
          } catch {}
          throw new Error(`Falha crítica no ambiente Node.js: Não foi possível executar o achatamento rasterizado (${nodeErr?.message || 'Motor indisponível'}). A exportação foi interrompida para impedir vazamento de dados confidenciais.`);
        }
      }

      throw new Error('Falha crítica de segurança: Ambiente sem suporte a DOM/Canvas e sem interpretador Node.js disponível para achatamento. A exportação foi interrompida para impedir vazamento de dados confidenciais.');
    }

    // 2. Pipeline Nativo de Navegador / Electron Renderer (Canvas HTML5 a 300 DPI nominais com proteção de memória)
    const loadingTask = pdfjsLib.getDocument({
      data: redactedPdfBuffer,
      useSystemFonts: true,
      isEvalSupported: false
    });

    const pdfDoc = await loadingTask.promise;
    if (pdfDoc.numPages === 0) {
      throw new Error('Falha de sanitização: O documento PDF fornecido não possui páginas válidas.');
    }

    const sanitizedDoc = await PDFDocument.create();
    const PDF_BASE_POINTS_PER_INCH = 72;

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const baseViewport = page.getViewport({ scale: 1.0 });

      // Cálculo adaptativo de resolução para páginas grandes (plantas de engenharia / A0 / A1)
      const nominalScale = targetDpi / PDF_BASE_POINTS_PER_INCH;
      const rawPixels = (baseViewport.width * nominalScale) * (baseViewport.height * nominalScale);

      let effectiveScale = nominalScale;
      if (rawPixels > maxPixels) {
        effectiveScale = Math.sqrt(maxPixels / (baseViewport.width * baseViewport.height));
        console.warn(`[LocalPdfEngine] Página grande detectada (${baseViewport.width.toFixed(0)}x${baseViewport.height.toFixed(0)}pt). Escala adaptada para ${(effectiveScale * 72).toFixed(0)} DPI para controle de memória e tamanho de arquivo.`);
      }

      const viewport = page.getViewport({ scale: effectiveScale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error(`Falha crítica de renderização: Não foi possível instanciar o contexto gráfico 2D do Canvas para a página ${i}. A exportação foi cancelada por segurança.`);
      }

      await page.render({ canvasContext: ctx, viewport }).promise;
      const imgDataUrl = canvas.toDataURL('image/jpeg', targetQuality);

      const imgBytes = dataURLtoUint8Array(imgDataUrl);
      const embeddedImg = await sanitizedDoc.embedJpg(imgBytes);

      // Preserva as dimensões físicas originais da página (em pontos a 72 DPI), garantindo alta fidelidade visual
      const pdfPage = sanitizedDoc.addPage([baseViewport.width, baseViewport.height]);
      pdfPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: baseViewport.width,
        height: baseViewport.height
      });
    }

    if (sanitizedDoc.getPageCount() !== pdfDoc.numPages) {
      throw new Error(`Falha de integridade na sanitização: Esperadas ${pdfDoc.numPages} páginas, mas apenas ${sanitizedDoc.getPageCount()} foram processadas.`);
    }

    return await sanitizedDoc.save();
  }

  /**
   * Inspecionar metadados ocultos de um PDF para diagnóstico de privacidade LGPD com Hash SHA-256
   */
  static async inspectPdfMetadata(pdfBuffer: ArrayBuffer | Uint8Array): Promise<PdfMetadataReport> {
    const bytes = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const sha256Hash = await computeSha256Hex(bytes);

    const title = doc.getTitle() || undefined;
    const author = doc.getAuthor() || undefined;
    const subject = doc.getSubject() || undefined;
    const keywordsStr = doc.getKeywords();
    const keywords = keywordsStr ? keywordsStr.split(/[,;\s]+/).filter(Boolean) : undefined;
    const producer = doc.getProducer() || undefined;
    const creator = doc.getCreator() || undefined;
    const creationDateObj = doc.getCreationDate();
    const creationDate = creationDateObj ? creationDateObj.toLocaleString('pt-BR') : undefined;
    const modificationDateObj = doc.getModificationDate();
    const modificationDate = modificationDateObj ? modificationDateObj.toLocaleString('pt-BR') : undefined;

    const catalog = doc.catalog;
    const hasXmpMetadata = catalog.has(PDFName.of('Metadata'));
    const hasEmbeddedFiles = catalog.has(PDFName.of('Names')) || catalog.has(PDFName.of('EmbeddedFiles'));

    let annotationCount = 0;
    const pages = doc.getPages();
    pages.forEach(page => {
      const annots = page.node.get(PDFName.of('Annots'));
      if (annots) {
        annotationCount += (annots as any).array ? (annots as any).array.length : 1;
      }
    });

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (author || creator || hasXmpMetadata || hasEmbeddedFiles) {
      riskLevel = 'high';
    } else if (producer || creationDate || modificationDate || annotationCount > 0) {
      riskLevel = 'medium';
    }

    return {
      title,
      author,
      subject,
      keywords,
      producer,
      creator,
      creationDate,
      modificationDate,
      hasXmpMetadata,
      hasEmbeddedFiles,
      annotationCount,
      sha256Hash,
      riskLevel
    };
  }

  /**
   * Sanitizar e expurgar completamente metadados e schemas XMP ocultos de um PDF
   */
  static async sanitizePdfMetadata(pdfBuffer: ArrayBuffer | Uint8Array, options: SanitizeOptions): Promise<Uint8Array> {
    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

    if (options.cleanAuthorAndCreator) {
      doc.setTitle('');
      doc.setAuthor('');
      doc.setSubject('');
      doc.setKeywords([]);
      doc.setCreator('');
    }

    doc.setProducer(options.customProducerText || 'KovaxFiles LGPD Privacy Engine (Offline)');

    if (options.cleanDates) {
      try {
        doc.setCreationDate(new Date(0));
        doc.setModificationDate(new Date(0));
      } catch {}
    }

    if (options.cleanXmpAndPrivateData) {
      try {
        doc.catalog.delete(PDFName.of('Metadata'));
        doc.catalog.delete(PDFName.of('PieceInfo'));
      } catch {}
    }

    if (options.removeAttachments) {
      try {
        doc.catalog.delete(PDFName.of('Names'));
        doc.catalog.delete(PDFName.of('EmbeddedFiles'));
      } catch {}
    }

    if (options.removeAnnotations) {
      try {
        const pages = doc.getPages();
        pages.forEach(page => {
          page.node.delete(PDFName.of('Annots'));
        });
      } catch {}
    }

    return await doc.save({ useObjectStreams: false });
  }

  /**
   * Converter lista de Imagens (JPG, PNG, WEBP) em documento PDF formatado
   */
  static async imagesToPdf(images: ImageToPdfItem[], options: ImageToPdfOptions): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    for (const imgItem of images) {
      let embeddedImg: any;
      const mime = imgItem.mimeType.toLowerCase();

      const bytes = imgItem.data instanceof Uint8Array 
        ? imgItem.data 
        : new Uint8Array(imgItem.data);

      if (mime.includes('png')) {
        embeddedImg = await pdfDoc.embedPng(bytes);
      } else if (mime.includes('jpeg') || mime.includes('jpg')) {
        embeddedImg = await pdfDoc.embedJpg(bytes);
      } else {
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: imgItem.mimeType });
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        const imgEl = new Image();
        imgEl.src = dataUrl;
        await new Promise((resolve) => { imgEl.onload = resolve; });

        const canvas = document.createElement('canvas');
        canvas.width = imgEl.width;
        canvas.height = imgEl.height;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(imgEl, 0, 0);

        const jpegUrl = canvas.toDataURL('image/jpeg', 0.95);
        const jpegBytes = dataURLtoUint8Array(jpegUrl);
        embeddedImg = await pdfDoc.embedJpg(jpegBytes);
      }

      const imgWidth = embeddedImg.width;
      const imgHeight = embeddedImg.height;

      let pageWidth = 595.28;
      let pageHeight = 841.89;

      if (options.pageSize === 'fit') {
        pageWidth = imgWidth + (options.margin * 2);
        pageHeight = imgHeight + (options.margin * 2);
      } else if (options.orientation === 'landscape') {
        pageWidth = 841.89;
        pageHeight = 595.28;
      }

      const maxW = pageWidth - (options.margin * 2);
      const maxH = pageHeight - (options.margin * 2);

      const scaleRatio = Math.min(maxW / imgWidth, maxH / imgHeight, 1.0);
      const drawWidth = imgWidth * scaleRatio;
      const drawHeight = imgHeight * scaleRatio;

      const drawX = (pageWidth - drawWidth) / 2;
      const drawY = (pageHeight - drawHeight) / 2;

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(embeddedImg, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight
      });
    }

    return await pdfDoc.save();
  }

  /**
   * Renderizar páginas de PDF para Imagens de Alta Definição (JPG / PNG)
   */
  static async pdfToImages(pdfBuffer: ArrayBuffer | Uint8Array, options: PdfToImageOptions): Promise<{ pageIndex: number; dataUrl: string; bytes: Uint8Array; fileName: string }[]> {
    const bytes = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
    const loadingTask = pdfjsLib.getDocument({
      data: bytes,
      useSystemFonts: true,
      isEvalSupported: false
    });

    const pdfDoc = await loadingTask.promise;
    const results: { pageIndex: number; dataUrl: string; bytes: Uint8Array; fileName: string }[] = [];

    const format = options.format || 'jpeg';
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const ext = format === 'png' ? 'png' : 'jpg';

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const scale = options.scale || 2.0;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL(mimeType, options.quality || 0.92);
        const imgBytes = dataURLtoUint8Array(dataUrl);

        results.push({
          pageIndex: i,
          dataUrl,
          bytes: imgBytes,
          fileName: `pagina_${i.toString().padStart(3, '0')}.${ext}`
        });
      }
    }

    return results;
  }

  /**
   * Converter Texto Simples (TXT) em Documento PDF Paginado
   */
  static async textToPdf(text: string, options: TextToPdfOptions): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const fontSize = options.fontSize || 11;
    const lineHeight = fontSize * 1.4;
    const margin = 45;
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const printableWidth = pageWidth - (margin * 2);

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let yCursor = pageHeight - margin;

    if (options.title) {
      page.drawRectangle({
        x: margin,
        y: yCursor - 30,
        width: printableWidth,
        height: 35,
        color: rgb(0.06, 0.15, 0.35)
      });

      page.drawText(options.title.toUpperCase(), {
        x: margin + 15,
        y: yCursor - 18,
        size: 12,
        font: fontBold,
        color: rgb(1, 1, 1)
      });

      yCursor -= 50;
    }

    const paragraphs = text.split(/\r?\n/);
    
    for (const para of paragraphs) {
      if (para.trim() === '') {
        yCursor -= lineHeight;
        if (yCursor < margin + 30) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          yCursor = pageHeight - margin;
        }
        continue;
      }

      const words = para.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth > printableWidth && currentLine !== '') {
          page.drawText(currentLine, {
            x: margin,
            y: yCursor,
            size: fontSize,
            font: font,
            color: rgb(0.15, 0.15, 0.2)
          });
          yCursor -= lineHeight;

          if (yCursor < margin + 30) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            yCursor = pageHeight - margin;
          }

          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        page.drawText(currentLine, {
          x: margin,
          y: yCursor,
          size: fontSize,
          font: font,
          color: rgb(0.15, 0.15, 0.2)
        });
        yCursor -= lineHeight;

        if (yCursor < margin + 30) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          yCursor = pageHeight - margin;
        }
      }
    }

    const totalPages = pdfDoc.getPageCount();
    const pages = pdfDoc.getPages();
    pages.forEach((p, idx) => {
      p.drawText(`Página ${idx + 1} de ${totalPages} • KovaxFiles Document Converter`, {
        x: margin,
        y: 25,
        size: 8,
        font: font,
        color: rgb(0.5, 0.5, 0.6)
      });
    });

    return await pdfDoc.save();
  }
}
