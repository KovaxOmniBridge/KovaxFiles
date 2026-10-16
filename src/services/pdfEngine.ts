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
  appendAuditPage?: boolean; // Termo de Encerramento e Integridade SHA-256
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
  fileId?: string;
  fileName?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  category?: string;
  reason?: string;
}

export type RasterizationQualityProfile = 'balanced' | 'high_quality' | 'compact' | 'custom';

export type PageRasterizationStatus = 'optimal' | 'adapted_acceptable' | 'below_standard' | 'measurement_unavailable';

export interface PageRasterizationInfo {
  pageNumber: number;
  widthPt: number;
  heightPt: number;
  targetDpi: number;
  effectiveDpi: number;
  minDpiThreshold: number;
  renderedWidthPx: number;
  renderedHeightPx: number;
  megaPixels: number;
  wasAdapted: boolean;
  qualityWarning?: string;
  status: PageRasterizationStatus;
  measurementStatus?: 'measured' | 'measurement_unavailable';
}

export interface RasterizationQualityReport {
  profile: RasterizationQualityProfile;
  targetDpi: number;
  minDpi: number;
  quality: number;
  maxPixelsPerPage: number;
  totalPages: number;
  averageEffectiveDpi: number;
  minEffectiveDpi: number;
  maxEffectiveDpi: number;
  adaptedPagesCount: number;
  pages: PageRasterizationInfo[];
  securitySanitizationStatus: 'fully_destroyed_and_flattened';
  summaryMessage: string;
  status?: 'optimal' | 'adapted_acceptable' | 'below_standard' | 'measurement_unavailable';
  measurementStatus?: 'measured' | 'measurement_unavailable';
}

export const RASTER_QUALITY_PROFILES: Record<
  Exclude<RasterizationQualityProfile, 'custom'>,
  {
    name: string;
    description: string;
    targetDpi: number;
    minDpi: number;
    quality: number; // 0.0 a 1.0
    maxPixelsPerPage: number;
    recommendedFor: string;
  }
> = {
  balanced: {
    name: 'Equilibrado (Padrão)',
    description: '300 DPI nominais com piso de 150 DPI para plantas/páginas grandes. Ideal para processos judiciais e uso institucional geral.',
    targetDpi: 300,
    minDpi: 150,
    quality: 0.88,
    maxPixelsPerPage: 25_000_000,
    recommendedFor: 'Processos jurídicos, certidões, contratos e documentos administrativos.'
  },
  high_quality: {
    name: 'Alta Fidelidade Forense',
    description: '300 DPI nominais com piso rigoroso de 220 DPI e teto de 50 MP. Preserva carimbos diminutos, assinaturas manuscritas e perícias.',
    targetDpi: 300,
    minDpi: 220,
    quality: 0.95,
    maxPixelsPerPage: 50_000_000,
    recommendedFor: 'Perícias grafotécnicas, plantas de alta precisão, carimbos notariais antigos e documentos com letras miúdas.'
  },
  compact: {
    name: 'Econômico / Portais Judiciais (PJe)',
    description: '200 DPI nominais com piso de 100 DPI e compressão otimizada. Reduz drasticamente o tamanho do arquivo final.',
    targetDpi: 200,
    minDpi: 100,
    quality: 0.75,
    maxPixelsPerPage: 12_000_000,
    recommendedFor: 'Sistemas com limite rígido de upload (ex: PJe, Projudi e e-SAJ) que exigem arquivos menores que 10 MB.'
  }
};

export interface AnonymizePdfOptions {
  dpi?: number;
  quality?: number;
  maxPixelsPerPage?: number;
  minDpi?: number;
  profile?: RasterizationQualityProfile;
  onProgress?: (progress: { current: number; total: number; stage: string }) => void;
  onReport?: (report: RasterizationQualityReport) => void;
  targetFileName?: string;
  targetFileId?: string;
  /**
   * Se true, reprova a operação com erro fatal se o motor de rasterização
   * não fornecer as medições obrigatórias reais (DPI efetivo, pixels renderizados).
   * Se false ou omitido, retorna o relatório explicitamente identificado como 'measurement_unavailable',
   * sem jamais presumir valores arbitrários (como A4, DPI nominal ou status 'optimal').
   */
  strictReport?: boolean;
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

import { UNIFIED_COURT_PRESETS, UnifiedCourtPreset } from '../data/courtPresetsData';

export type CompressPreset = UnifiedCourtPreset;
export const COMPRESS_PRESETS: CompressPreset[] = UNIFIED_COURT_PRESETS;

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
   * Valida se um relatório de rasterização contém todas as medições técnicas obrigatórias reais,
   * reprovando relatórios com medidas presumidas, incompletas ou corrompidas.
   */
  static validateRasterizationReport(report: any): report is RasterizationQualityReport {
    if (!report || typeof report !== 'object') return false;
    if (typeof report.totalPages !== 'number' || report.totalPages < 1) return false;
    if (!Array.isArray(report.pages) || report.pages.length !== report.totalPages) return false;
    if (typeof report.averageEffectiveDpi !== 'number' || report.averageEffectiveDpi <= 0) return false;
    if (typeof report.minEffectiveDpi !== 'number' || report.minEffectiveDpi <= 0) return false;
    if (typeof report.maxEffectiveDpi !== 'number' || report.maxEffectiveDpi <= 0) return false;

    return report.pages.every((p: any) =>
      p &&
      typeof p.pageNumber === 'number' && p.pageNumber >= 1 &&
      typeof p.widthPt === 'number' && p.widthPt > 0 &&
      typeof p.heightPt === 'number' && p.heightPt > 0 &&
      typeof p.effectiveDpi === 'number' && p.effectiveDpi > 0 &&
      typeof p.renderedWidthPx === 'number' && p.renderedWidthPx > 0 &&
      typeof p.renderedHeightPx === 'number' && p.renderedHeightPx > 0 &&
      typeof p.megaPixels === 'number' && p.megaPixels >= 0 &&
      ['optimal', 'adapted_acceptable', 'below_standard', 'measurement_unavailable'].includes(p.status)
    );
  }

  /**
   * Cria um laudo técnico seguro com identificação explícita de 'measurement_unavailable',
   * sem jamais presumir tamanho A4 (595x842 pt), DPI nominal ou status 'optimal'.
   */
  static createUnavailableMeasurementReport(
    profile: RasterizationQualityProfile,
    targetDpi: number,
    minDpi: number,
    quality: number,
    maxPixelsPerPage: number,
    realPages: Array<{ widthPt: number; heightPt: number }>
  ): RasterizationQualityReport {
    const pagesInfo: PageRasterizationInfo[] = realPages.length > 0
      ? realPages.map((p, idx) => ({
          pageNumber: idx + 1,
          widthPt: Math.round(p.widthPt * 10) / 10,
          heightPt: Math.round(p.heightPt * 10) / 10,
          targetDpi,
          effectiveDpi: 0,
          minDpiThreshold: minDpi,
          renderedWidthPx: 0,
          renderedHeightPx: 0,
          megaPixels: 0,
          wasAdapted: false,
          qualityWarning: 'Medições técnicas de DPI e pixels não disponibilizadas pelo motor de rasterização headless (status: measurement_unavailable).',
          status: 'measurement_unavailable',
          measurementStatus: 'measurement_unavailable'
        }))
      : [{
          pageNumber: 1,
          widthPt: 0,
          heightPt: 0,
          targetDpi,
          effectiveDpi: 0,
          minDpiThreshold: minDpi,
          renderedWidthPx: 0,
          renderedHeightPx: 0,
          megaPixels: 0,
          wasAdapted: false,
          qualityWarning: 'Dimensões da página e medições técnicas indisponíveis (measurement_unavailable).',
          status: 'measurement_unavailable',
          measurementStatus: 'measurement_unavailable'
        }];

    return {
      profile,
      targetDpi,
      minDpi,
      quality,
      maxPixelsPerPage,
      totalPages: pagesInfo.length,
      averageEffectiveDpi: 0,
      minEffectiveDpi: 0,
      maxEffectiveDpi: 0,
      adaptedPagesCount: 0,
      pages: pagesInfo,
      securitySanitizationStatus: 'fully_destroyed_and_flattened',
      summaryMessage: 'Sanitização por achatamento concluída, porém as medições técnicas de resolução não puderam ser aferidas pelo motor headless. Status identificado expressamente como measurement_unavailable.',
      status: 'measurement_unavailable',
      measurementStatus: 'measurement_unavailable'
    };
  }

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
   * Converte uma string de intervalos de páginas (ex: "1-3, 5, 8-10") em índices 0-indexed
   */
  static parsePageRanges(rangeStr: string, totalPages: number): number[] {
    const indices = new Set<number>();
    const parts = rangeStr.split(/[,;\s]+/).map(p => p.trim()).filter(Boolean);

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.max(1, Math.min(start, end));
          const max = Math.min(totalPages, Math.max(start, end));
          for (let p = min; p <= max; p++) {
            indices.add(p - 1);
          }
        }
      } else {
        const p = parseInt(part, 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
          indices.add(p - 1);
        }
      }
    }

    return Array.from(indices).sort((a, b) => a - b);
  }

  /**
   * Extrair páginas por intervalo configurável (ex: "1-4, 7, 10-12") gerando um novo PDF
   */
  static async extractPagesByRange(pdfBuffer: ArrayBuffer | Uint8Array, rangeStr: string): Promise<Uint8Array> {
    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const totalPages = doc.getPageCount();
    const selectedIndices = this.parsePageRanges(rangeStr, totalPages);

    if (selectedIndices.length === 0) {
      throw new Error(`Nenhuma página válida encontrada para o intervalo "${rangeStr}" (total de páginas: ${totalPages}).`);
    }

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(doc, selectedIndices);
    copiedPages.forEach(p => newDoc.addPage(p));
    return await newDoc.save();
  }

  /**
   * Reorganizar, rotacionar e excluir páginas de um PDF
   */
  static async reorganizePdf(
    pdfBuffer: ArrayBuffer | Uint8Array,
    pagesConfig: { originalIndex: number; rotationDelta: number }[]
  ): Promise<Uint8Array> {
    if (pagesConfig.length === 0) {
      throw new Error('O documento resultante não pode ficar sem nenhuma página.');
    }

    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const newDoc = await PDFDocument.create();

    const originalIndices = pagesConfig.map(p => p.originalIndex);
    const copiedPages = await newDoc.copyPages(doc, originalIndices);

    copiedPages.forEach((page, i) => {
      const config = pagesConfig[i];
      if (config.rotationDelta !== 0) {
        const currentRotation = page.getRotation().angle;
        const newAngle = (currentRotation + config.rotationDelta + 360) % 360;
        page.setRotation(degrees(newAngle));
      }
      newDoc.addPage(page);
    });

    return await newDoc.save();
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

      const effectivePrefix = options.prefix !== undefined ? options.prefix : 'Fl.';
      let stampText = `${effectivePrefix} ${pageNumFormatted}`.trim();
      if (options.textMask) {
        stampText = options.textMask
          .replace('{page}', pageNumFormatted)
          .replace('{prefix}', effectivePrefix)
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

        const timeText = options.showTimestamp ? timestamp : 'Chancela Oficial';
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

      auditPage.drawText('TERMO DE JUNTADA & REGISTRO DE INTEGRIDADE DOCUMENTAL', {
        x: 45,
        y: pHeight - 55,
        size: 12,
        font: font,
        color: rgb(1, 1, 1)
      });

      auditPage.drawText('Numeração Oficial de Autos e Registro de Imutabilidade com Hash SHA-256', {
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
      const auditPrefix = options.prefix !== undefined ? options.prefix : 'Fl.';
      drawAuditRow('Paginação Sequencial:', `${auditPrefix} ${options.startPageNumber} até ${auditPrefix} ${options.startPageNumber + pages.length - 1} (${pages.length} páginas)`);
      drawAuditRow('Estilo da Chancela:', options.stampShape === 'round' ? `Selo Redondo Oficial (Marca d'água ${(opacity * 100).toFixed(0)}%)` : `Retangular (Marca d'água ${(opacity * 100).toFixed(0)}%)`);
      drawAuditRow('Natureza do Registro:', 'Chancela Administrativa de Juntada e Numeração com Hash SHA-256');
      drawAuditRow('Aviso de Conformidade:', 'Chancela administrativa com hash SHA-256 (Não constitui assinatura digital PAdES/ICP-Brasil).');

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
      auditPage.drawText('CHANCELA', { x: 74, y: yCursor - 30, size: 9, font: font, color: textColor });
      auditPage.drawText('OFICIAL', { x: 78, y: yCursor - 42, size: 6.5, font: fontSmall, color: subTextColor });

      auditPage.drawRectangle({
        x: 155,
        y: yCursor - 70,
        width: pWidth - 200,
        height: 70,
        color: rgb(0.97, 0.98, 1),
        borderColor: rgb(0.8, 0.85, 0.9),
        borderWidth: 1
      });

      const legalNoticeLine1 = 'DECLARAÇÃO DE REGISTRO ADMINISTRATIVO E INTEGRIDADE:';
      const legalNoticeLine2 = 'Este termo e a chancela de juntada certificam a ordenação sequencial de folhas e a imutabilidade';
      const legalNoticeLine3 = 'técnica do documento mediante o cálculo do hash criptográfico SHA-256 do arquivo original.';
      const legalNoticeLine4 = 'NOTA: Este ato administrativo não substitui assinatura digital qualificada (ICP-Brasil) ou PAdES.';

      auditPage.drawText(legalNoticeLine1, { x: 165, y: yCursor - 15, size: 8, font: font, color: rgb(0.15, 0.3, 0.6) });
      auditPage.drawText(legalNoticeLine2, { x: 165, y: yCursor - 30, size: 7.5, font: fontSmall, color: rgb(0.3, 0.35, 0.45) });
      auditPage.drawText(legalNoticeLine3, { x: 165, y: yCursor - 42, size: 7.5, font: fontSmall, color: rgb(0.3, 0.35, 0.45) });
      auditPage.drawText(legalNoticeLine4, { x: 165, y: yCursor - 54, size: 7.5, font: fontSmall, color: rgb(0.3, 0.35, 0.45) });

      yCursor -= 100;

      auditPage.drawText(`KovaxFiles Desktop App • Processado em ${fullIsoTimestamp} • Chancela Documental Offline com Hash SHA-256`, {
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
   * Gera uma Capa de Juntada e Índice Automático de Peças com Manifesto SHA-256
   */
  static async generateJuntadaCoverAndIndex(options: {
    processNumber: string;
    departmentName: string;
    signerName: string;
    prefix: string;
    padDigits?: number;
    pieces: {
      pieceIndex: number;
      title: string;
      fileName: string;
      startFolha: number;
      endFolha: number;
      pageCount: number;
      sha256Hex: string;
    }[];
  }): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontMono = await doc.embedFont(StandardFonts.Courier);

    const { width, height } = page.getSize();
    const pad = options.padDigits || 3;

    // Header Box
    page.drawRectangle({
      x: 35,
      y: height - 100,
      width: width - 70,
      height: 70,
      color: rgb(0.06, 0.15, 0.35)
    });

    const deptStr = (options.departmentName || 'PODER JUDICIÁRIO / ADMINISTRAÇÃO PÚBLICA').toUpperCase();
    page.drawText(deptStr, {
      x: 50,
      y: height - 55,
      size: 11,
      font: fontBold,
      color: rgb(0.85, 0.9, 1)
    });

    page.drawText('TERMO DE JUNTADA, ÍNDICE DE PEÇAS & MANIFESTO CRIPTOGRÁFICO', {
      x: 50,
      y: height - 75,
      size: 12.5,
      font: fontBold,
      color: rgb(1, 1, 1)
    });

    page.drawText('Numeração Sequencial Contínua e Imutabilidade com Hash SHA-256', {
      x: 50,
      y: height - 90,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.8, 0.88, 0.98)
    });

    // Metadata details
    let y = height - 125;
    const drawRow = (label: string, val: string) => {
      page.drawText(label, { x: 40, y, size: 9.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
      page.drawText(val, { x: 170, y, size: 9.5, font: fontRegular, color: rgb(0.1, 0.1, 0.15) });
      y -= 17;
    };

    drawRow('Autos do Processo nº:', options.processNumber || 'Processo Administrativo/Judicial');
    drawRow('Responsável pela Juntada:', options.signerName || 'Servidor / Advogado Credenciado');
    const totalFolhas = options.pieces.length > 0 
      ? options.pieces[options.pieces.length - 1].endFolha 
      : 0;
    const firstFolha = options.pieces.length > 0 ? options.pieces[0].startFolha : 1;
    drawRow('Extensão dos Autos:', `${options.prefix} ${String(firstFolha).padStart(pad, '0')} até ${options.prefix} ${String(totalFolhas).padStart(pad, '0')} (${totalFolhas - firstFolha + 1} folhas)`);
    drawRow('Data e Hora de Registro:', new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR'));

    y -= 10;
    page.drawLine({
      start: { x: 35, y },
      end: { x: width - 35, y },
      thickness: 1,
      color: rgb(0.75, 0.82, 0.9)
    });

    y -= 25;
    page.drawText('ÍNDICE SISTEMÁTICO DE PEÇAS E ANEXOS JUNTADOS', {
      x: 40,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.08, 0.22, 0.5)
    });

    y -= 20;

    // Table Header
    page.drawRectangle({
      x: 35,
      y: y - 5,
      width: width - 70,
      height: 20,
      color: rgb(0.92, 0.94, 0.98),
      borderColor: rgb(0.8, 0.85, 0.9),
      borderWidth: 1
    });

    page.drawText('Seq.', { x: 42, y: y, size: 8.5, font: fontBold, color: rgb(0.1, 0.2, 0.4) });
    page.drawText('Identificação da Peça / Arquivo', { x: 75, y: y, size: 8.5, font: fontBold, color: rgb(0.1, 0.2, 0.4) });
    page.drawText('Folhas', { x: 330, y: y, size: 8.5, font: fontBold, color: rgb(0.1, 0.2, 0.4) });
    page.drawText('Manifesto Hash SHA-256 (32 primeiros chars)', { x: 395, y: y, size: 8.5, font: fontBold, color: rgb(0.1, 0.2, 0.4) });

    y -= 24;

    options.pieces.forEach((piece, idx) => {
      if (y < 90) return;

      const isEven = idx % 2 === 0;
      page.drawRectangle({
        x: 35,
        y: y - 4,
        width: width - 70,
        height: 20,
        color: isEven ? rgb(0.98, 0.99, 1) : rgb(1, 1, 1),
        borderColor: rgb(0.9, 0.92, 0.95),
        borderWidth: 0.5
      });

      page.drawText(String(piece.pieceIndex).padStart(2, '0'), {
        x: 45,
        y: y + 2,
        size: 8,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.3)
      });

      const maxTitle = piece.title.length > 40 ? piece.title.substring(0, 38) + '...' : piece.title;
      page.drawText(maxTitle, {
        x: 75,
        y: y + 2,
        size: 8,
        font: fontRegular,
        color: rgb(0.1, 0.1, 0.15)
      });

      const folhasStr = `${options.prefix} ${String(piece.startFolha).padStart(pad, '0')}-${String(piece.endFolha).padStart(pad, '0')}`;
      page.drawText(folhasStr, {
        x: 330,
        y: y + 2,
        size: 8,
        font: fontBold,
        color: rgb(0.1, 0.3, 0.6)
      });

      const shortHash = piece.sha256Hex ? piece.sha256Hex.substring(0, 24) + '...' : 'Pendente';
      page.drawText(shortHash, {
        x: 395,
        y: y + 2,
        size: 7.5,
        font: fontMono,
        color: rgb(0.3, 0.3, 0.4)
      });

      y -= 22;
    });

    // Certidão de encerramento no rodapé da capa
    y = Math.min(y - 15, 120);
    page.drawRectangle({
      x: 35,
      y: y - 55,
      width: width - 70,
      height: 60,
      color: rgb(0.96, 0.98, 1),
      borderColor: rgb(0.7, 0.8, 0.95),
      borderWidth: 1
    });

    page.drawText('CERTIDÃO DE JUNTADA & AUTENTICAÇÃO FORMAL', {
      x: 45,
      y: y - 10,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.25, 0.55)
    });

    const certText = 'Certifico e dou fé que nesta data procedi à juntada aos autos do processo supra das peças documentais indicadas neste índice, com numeração cronológica de folhas contínua e imutabilidade criptográfica assegurada por hash SHA-256.';
    page.drawText(certText, {
      x: 45,
      y: y - 26,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.2, 0.25, 0.35),
      maxWidth: width - 90,
      lineHeight: 10
    });

    page.drawText(`Assinado digitalmente / chancelado por: ${options.signerName}`, {
      x: 45,
      y: y - 48,
      size: 8,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.4)
    });

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

    // 0. Trava preventiva e isolamento estrito por documento (fileId prioritário, targetFileName secundário)
    let targetRects = rectangles;
    if (options?.targetFileId) {
      targetRects = targetRects.filter(r => r.fileId === options.targetFileId);
    } else if (options?.targetFileName) {
      targetRects = targetRects.filter(r => r.fileName === options.targetFileName);
    }
    const validRects = targetRects.filter(r => this.validateRedactionSpan(r.text, r.category, r.reason));
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
      const { pdfBytes, report } = await this.sanitizeFlattenPdf(redactedVectorBuffer, options);
      (pdfBytes as any).rasterReport = report;
      if (options?.onReport) {
        try {
          options.onReport(report);
        } catch (cbErr) {
          console.warn('[LocalPdfEngine] Erro no callback onReport:', cbErr);
        }
      }
      return pdfBytes;
    } catch (err: any) {
      console.error('[LocalPdfEngine] Falha crítica de sanitização por achatamento:', err);
      throw new Error(`Falha crítica de segurança na anonimização: Não foi possível comprovar a destruição da camada de texto subjacente (${err?.message || 'Erro na etapa de rasterização'}). A exportação foi interrompida para impedir vazamento de dados confidenciais.`);
    }
  }

  /**
   * Anonimiza o PDF com destruição total de conteúdo e retorna tanto o buffer resultante
   * quanto o relatório detalhado de qualidade de rasterização por página.
   */
  static async anonymizePdfWithReport(
    pdfBuffer: ArrayBuffer | Uint8Array,
    rectangles: RedactionRectangle[],
    options?: AnonymizePdfOptions
  ): Promise<{ pdfBytes: Uint8Array; report: RasterizationQualityReport }> {
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

    // 0. Trava preventiva e isolamento estrito por documento (fileId prioritário, targetFileName secundário)
    let targetRects = rectangles;
    if (options?.targetFileId) {
      targetRects = targetRects.filter(r => r.fileId === options.targetFileId);
    } else if (options?.targetFileName) {
      targetRects = targetRects.filter(r => r.fileName === options.targetFileName);
    }
    const validRects = targetRects.filter(r => this.validateRedactionSpan(r.text, r.category, r.reason));
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
      const res = await this.sanitizeFlattenPdf(redactedVectorBuffer, options);
      (res.pdfBytes as any).rasterReport = res.report;
      if (options?.onReport) {
        try {
          options.onReport(res.report);
        } catch (cbErr) {
          console.warn('[LocalPdfEngine] Erro no callback onReport:', cbErr);
        }
      }
      return res;
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
   * Suporta critérios de qualidade mínima (minDpi), perfis de exportação e emissão de relatório por página.
   * Suporta renderização via Canvas HTML5 (Browser / Electron) e fallback headless com PyMuPDF (Node.js).
   * 
   * IMPORTANTE: Se o processo de rasterização falhar ou não estiver disponível,
   * este método DISPARA UMA EXCEÇÃO e NUNCA entrega silenciosamente um PDF vetorial com texto recuperável.
   */
  private static async sanitizeFlattenPdf(
    redactedPdfBuffer: Uint8Array,
    options?: AnonymizePdfOptions
  ): Promise<{ pdfBytes: Uint8Array; report: RasterizationQualityReport }> {
    const profile = options?.profile || 'balanced';
    const profileConfig = profile !== 'custom' ? RASTER_QUALITY_PROFILES[profile] : RASTER_QUALITY_PROFILES.balanced;

    const targetDpi = options?.dpi ?? profileConfig.targetDpi;
    const minDpi = Math.min(options?.minDpi ?? profileConfig.minDpi, targetDpi);
    const targetQuality = options?.quality ?? profileConfig.quality;
    const maxPixels = options?.maxPixelsPerPage ?? profileConfig.maxPixelsPerPage;

    // 1. Fallback Headless para ambientes Node.js / CLI sem DOM
    if (typeof document === 'undefined') {
      if (typeof process !== 'undefined' && (process as any).versions?.node) {
        let tmpIn: string | undefined;
        let tmpOut: string | undefined;
        let tmpReport: string | undefined;
        try {
          const { spawnSync } = await import('child_process');
          const fs = await import('fs');
          const path = await import('path');
          const os = await import('os');
          
          tmpIn = path.join(os.tmpdir(), `kovax_redact_in_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
          tmpOut = path.join(os.tmpdir(), `kovax_redact_out_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
          tmpReport = path.join(os.tmpdir(), `kovax_redact_rep_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
          fs.writeFileSync(tmpIn, redactedPdfBuffer);

          const flattenerScript = path.resolve('scripts/headless_flattener.py');
          let pythonExe = process.env.KOVAX_PYTHON_PATH;
          if (!pythonExe) {
            const isWin = process.platform === 'win32';
            const venvWin = path.resolve('.venv/Scripts/python.exe');
            const venvPosix = path.resolve('.venv/bin/python');
            const venvPosix3 = path.resolve('.venv/bin/python3');
            if (isWin && fs.existsSync(venvWin)) {
              pythonExe = venvWin;
            } else if (!isWin && fs.existsSync(venvPosix)) {
              pythonExe = venvPosix;
            } else if (!isWin && fs.existsSync(venvPosix3)) {
              pythonExe = venvPosix3;
            } else {
              pythonExe = isWin ? 'python' : 'python3';
            }
          }

          if (!fs.existsSync(flattenerScript)) {
            throw new Error(`Script headless_flattener.py não encontrado para execução em modo Node CLI sem DOM.`);
          }

          const qualityParam = String(Math.round(targetQuality * 100));
          const res = spawnSync(
            pythonExe,
            [
              flattenerScript,
              tmpIn,
              tmpOut,
              String(targetDpi),
              qualityParam,
              String(maxPixels),
              String(minDpi),
              tmpReport
            ],
            { stdio: 'pipe' }
          );

          if (res.status === 0 && fs.existsSync(tmpOut)) {
            const outBytes = fs.readFileSync(tmpOut);
            let parsedReport: RasterizationQualityReport | undefined;

            if (fs.existsSync(tmpReport)) {
              try {
                const reportRaw = fs.readFileSync(tmpReport, 'utf-8');
                const jsonRep = JSON.parse(reportRaw);

                if (LocalPdfEngine.validateRasterizationReport(jsonRep)) {
                  parsedReport = {
                    ...jsonRep,
                    profile,
                    measurementStatus: 'measured',
                    pages: jsonRep.pages.map((p: any) => ({
                      ...p,
                      measurementStatus: 'measured' as const
                    }))
                  };
                } else {
                  console.warn('[LocalPdfEngine] Relatório de rasterização gerado pelo motor headless reprovado: não contém todas as medidas obrigatórias.');
                }
              } catch (parseErr) {
                console.warn('[LocalPdfEngine] Falha ao ler relatório técnico de rasterização headless:', parseErr);
              }
            }

            try {
              if (tmpIn && fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
              if (tmpOut && fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
              if (tmpReport && fs.existsSync(tmpReport)) fs.unlinkSync(tmpReport);
            } catch {}

            // Se o chamador exigiu relatório medido estrito ou se faltarem medidas sob reprovação obrigatória:
            if (!parsedReport && options?.strictReport) {
              throw new Error(
                'Falha de integridade e auditoria: O motor headless não forneceu as medições obrigatórias de rasterização ' +
                '(DPI efetivo, dimensões reais em pixels e métricas por página). A geração do relatório foi reprovada.'
              );
            }

            let finalReport: RasterizationQualityReport;
            if (parsedReport) {
              finalReport = parsedReport;
            } else {
              // Inspeção segura do binário PDF resultante para aferir dimensões reais sem presumir A4, DPI nominal ou status optimal
              const realPages: Array<{ widthPt: number; heightPt: number }> = [];
              try {
                const outDoc = await PDFDocument.load(outBytes);
                const totalPages = outDoc.getPageCount();
                for (let idx = 0; idx < totalPages; idx++) {
                  const p = outDoc.getPage(idx);
                  realPages.push({
                    widthPt: p.getWidth(),
                    heightPt: p.getHeight()
                  });
                }
              } catch {}

              finalReport = LocalPdfEngine.createUnavailableMeasurementReport(
                profile,
                targetDpi,
                minDpi,
                targetQuality,
                maxPixels,
                realPages
              );
            }

            return {
              pdfBytes: new Uint8Array(outBytes),
              report: finalReport
            };
          } else {
            const stderr = res.stderr?.toString() || 'Erro desconhecido ao executar script de achatamento';
            throw new Error(`Falha no motor headless de achatamento (código ${res.status}): ${stderr}`);
          }
        } catch (nodeErr: any) {
          try {
            const fs = await import('fs');
            if (tmpIn && fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
            if (tmpOut && fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
            if (tmpReport && fs.existsSync(tmpReport)) fs.unlinkSync(tmpReport);
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
    const pagesInfo: PageRasterizationInfo[] = [];

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const baseViewport = page.getViewport({ scale: 1.0 });

      // Cálculo adaptativo de resolução com critério mínimo de qualidade garantido
      const nominalScale = targetDpi / PDF_BASE_POINTS_PER_INCH;
      const rawPixels = (baseViewport.width * nominalScale) * (baseViewport.height * nominalScale);

      let effectiveScale = nominalScale;
      let wasAdapted = false;
      let qualityWarning: string | undefined = undefined;
      let status: 'optimal' | 'adapted_acceptable' | 'below_standard' = 'optimal';

      if (rawPixels > maxPixels) {
        wasAdapted = true;
        const theoreticalScale = Math.sqrt(maxPixels / (baseViewport.width * baseViewport.height));
        const theoreticalDpi = Math.round(theoreticalScale * PDF_BASE_POINTS_PER_INCH);

        if (theoreticalDpi < minDpi) {
          // Enforce minimum quality threshold to protect stamps, signatures, and small text
          effectiveScale = minDpi / PDF_BASE_POINTS_PER_INCH;
          qualityWarning = `Resolução fixada no piso mínimo de qualidade (${minDpi} DPI) para preservar legibilidade de assinaturas, carimbos e notas. A página possui dimensões excepcionais (${Math.round(baseViewport.width)}x${Math.round(baseViewport.height)} pt).`;
          status = 'adapted_acceptable';
        } else {
          effectiveScale = theoreticalScale;
          const resultingDpi = theoreticalDpi;
          qualityWarning = `Resolução adaptada para ${resultingDpi} DPI para controle de memória e tamanho de arquivo (piso mínimo de ${minDpi} DPI garantido).`;
          status = resultingDpi >= 200 ? 'optimal' : 'adapted_acceptable';
        }

        console.warn(
          `[LocalPdfEngine] Página ${i} (${baseViewport.width.toFixed(0)}x${baseViewport.height.toFixed(0)}pt): ` +
          `DPI adaptado para ${(effectiveScale * PDF_BASE_POINTS_PER_INCH).toFixed(0)} DPI (piso mínimo: ${minDpi} DPI).`
        );
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

      const effectiveDpi = Math.round(effectiveScale * PDF_BASE_POINTS_PER_INCH);
      pagesInfo.push({
        pageNumber: i,
        widthPt: Math.round(baseViewport.width * 10) / 10,
        heightPt: Math.round(baseViewport.height * 10) / 10,
        targetDpi,
        effectiveDpi,
        minDpiThreshold: minDpi,
        renderedWidthPx: canvas.width,
        renderedHeightPx: canvas.height,
        megaPixels: Number(((canvas.width * canvas.height) / 1_000_000).toFixed(2)),
        wasAdapted,
        qualityWarning,
        status,
        measurementStatus: 'measured'
      });

      if (options?.onProgress) {
        try {
          options.onProgress({
            current: i,
            total: pdfDoc.numPages,
            stage: `Achatando página ${i}/${pdfDoc.numPages} (${effectiveDpi} DPI)`
          });
        } catch {}
      }
    }

    if (sanitizedDoc.getPageCount() !== pdfDoc.numPages) {
      throw new Error(`Falha de integridade na sanitização: Esperadas ${pdfDoc.numPages} páginas, mas apenas ${sanitizedDoc.getPageCount()} foram processadas.`);
    }

    const savedPdfBytes = await sanitizedDoc.save();
    const avgDpi = Math.round(pagesInfo.reduce((acc, p) => acc + p.effectiveDpi, 0) / pagesInfo.length);
    const minEffectiveDpi = Math.min(...pagesInfo.map(p => p.effectiveDpi));
    const maxEffectiveDpi = Math.max(...pagesInfo.map(p => p.effectiveDpi));
    const adaptedPagesCount = pagesInfo.filter(p => p.wasAdapted).length;

    const report: RasterizationQualityReport = {
      profile,
      targetDpi,
      minDpi,
      quality: targetQuality,
      maxPixelsPerPage: maxPixels,
      totalPages: pagesInfo.length,
      averageEffectiveDpi: avgDpi,
      minEffectiveDpi,
      maxEffectiveDpi,
      adaptedPagesCount,
      pages: pagesInfo,
      securitySanitizationStatus: 'fully_destroyed_and_flattened',
      summaryMessage: (
        `Sanitização por achatamento concluída. ${pagesInfo.length} página(s) processada(s) ` +
        `com DPI efetivo médio de ${avgDpi} DPI. ` +
        (adaptedPagesCount > 0 ? `${adaptedPagesCount} página(s) adaptada(s) respeitando o piso de ${minDpi} DPI.` : 'Todas as páginas renderizadas no DPI nominal.')
      ),
      measurementStatus: 'measured'
    };

    return {
      pdfBytes: savedPdfBytes,
      report
    };
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
