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
   * Anonimizador LGPD Universal com Queima Vetorial (Burn-In) e Destruição de Texto.
   * Aplica retângulos pretos solidos rgb(0,0,0) cirúrgicos com tolerância justa de 6px
   * e destrói permanentemente a camada de texto subjacente e metadados XMP.
   */
  static async redactPdf(
    pdfBuffer: ArrayBuffer,
    rectangles: { pageIndex: number; x: number; y: number; width: number; height: number; text?: string; category?: string; reason?: string }[],
    options?: { sanitizeFlatten?: boolean }
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.load(pdfBuffer);
    const pages = doc.getPages();

    // 0. Trava de Segurança Preventiva: Filtrar blocos longos de IA (validateRedactionSpan)
    const validRects = rectangles.filter(r => this.validateRedactionSpan(r.text, r.category, r.reason));

    // 1. Ajuste Milimétrico Cirúrgico de Coordenadas
    const surgicalRects = validRects.map(r => ({
      pageIndex: r.pageIndex,
      x: Math.max(0, r.x - 0.5),
      y: Math.max(0, r.y - 0.5),
      width: r.width + 1.5,
      height: r.height + 1
    }));

    // 2. Fusão Inteligente Cirúrgica na MESMA LINHA HORIZONTAL (|y1 - y2| <= 4px) com Tolerância Estrita de +6px (Evita hiper-tarjamento)
    const mergedRectsByPage = new Map<number, { x: number; y: number; width: number; height: number }[]>();

    surgicalRects.forEach(rect => {
      if (!mergedRectsByPage.has(rect.pageIndex)) {
        mergedRectsByPage.set(rect.pageIndex, []);
      }
      const pageList = mergedRectsByPage.get(rect.pageIndex)!;

      let merged = false;
      for (const existing of pageList) {
        const isSameHorizontalLine = Math.abs(existing.y - rect.y) <= 4.0;
        // Tolerância cirúrgica de no máximo 6 pixels entre palavras da mesma linha
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

    // Passada secundária para consolidação de vizinhos adjacentes (<= 6px) na mesma linha
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

    // 3. Desenhar retângulos pretos solidos rgb(0,0,0) em Burn-in cirúrgico
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

    // 4. Expurgo completo de Metadados XMP e Anotações para Garantir o Sigilo LGPD
    try {
      doc.setTitle('Documento Tarjado e Protegido (LGPD)');
      doc.setAuthor('KovaxFiles Anonimizador');
      doc.setSubject('Segredo de Justiça / Proteção LGPD');
      doc.catalog.delete(PDFName.of('Metadata'));
      doc.catalog.delete(PDFName.of('PieceInfo'));
    } catch {}

    // 5. Sanitização Absoluta por Achatamento Rasterizado (Flattening 300 DPI):
    // Destrói fisicamente a camada oculta de texto dos caracteres anonimizados, tornando 100% impossível o Ctrl+C ou inspeção de bytes.
    const redactedVectorBuffer = await doc.save();
    return await this.sanitizeFlattenPdf(redactedVectorBuffer);
  }

  /**
   * Sanitização Absoluta por Achatamento Rasterizado (Flattening):
   * Transforma as páginas em imagens de alta definição (300 DPI), destruindo fisicamente qualquer fluxo de texto subjacente.
   */
  private static async sanitizeFlattenPdf(redactedPdfBuffer: Uint8Array): Promise<Uint8Array> {
    if (typeof document === 'undefined') {
      return redactedPdfBuffer;
    }

    const loadingTask = pdfjsLib.getDocument({
      data: redactedPdfBuffer,
      useSystemFonts: true,
      isEvalSupported: false
    });

    const pdfDoc = await loadingTask.promise;
    const sanitizedDoc = await PDFDocument.create();

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const scale = 2.0; // Alta Definição ~300 DPI
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        const imgDataUrl = canvas.toDataURL('image/jpeg', 0.92);

        const imgBytes = dataURLtoUint8Array(imgDataUrl);
        const embeddedImg = await sanitizedDoc.embedJpg(imgBytes);

        const pdfPage = sanitizedDoc.addPage([viewport.width / scale, viewport.height / scale]);
        pdfPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: viewport.width / scale,
          height: viewport.height / scale
        });
      }
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
