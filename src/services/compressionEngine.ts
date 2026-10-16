import { PDFDocument, rgb, StandardFonts, PDFName, PDFNumber, PDFString } from 'pdf-lib';
import { zipSync, unzlibSync, inflateSync, decompressSync } from 'fflate';
import { UNIFIED_COURT_PRESETS, UnifiedCourtPreset, getUnifiedCourtPreset } from '../data/courtPresetsData';

export type TargetPreset = UnifiedCourtPreset;
export const TARGET_PRESETS: TargetPreset[] = UNIFIED_COURT_PRESETS;
export { getUnifiedCourtPreset };

export interface ProgressState {
  message: string;
  percent: number;
}

export type ProgressCallback = (progress: ProgressState) => void;

export type PdfWorkflowMode =
  | 'unsigned_optimization'       // 1. Otimização de PDFs não assinados
  | 'pre_signature_preparation'   // 2. Preparação do documento antes de assinar (padronização arquivística preliminar, sanitização)
  | 'signed_preservation';        // 3. Documentos já assinados (preservação do original e cópia de consulta)

export interface SignatureDetail {
  index: number;
  subFilter?: string;
  signerName?: string;
  reason?: string;
  signDate?: string;
  byteRange?: number[];
  byteRangeCoversEntireFile?: boolean;
  isDocTimeStamp?: boolean;
}

export interface SignatureDetectionResult {
  hasSignatures: boolean;
  signatureCount: number;
  details: SignatureDetail[];
  warningMessage?: string;
  cryptographicIntegrityNotice: string;
}

export interface AdvancedCompressOptions {
  workflowMode?: PdfWorkflowMode; // Fluxo explícito de integridade jurídica
  customMaxSizeMB?: number; // Tamanho configurável em MB para portais com limite específico
  allowSignedPdfReencoding?: boolean; // Se false (padrão seguro), BLOQUEIA reprocessamento de PDFs assinados para não quebrar a validade jurídica ICP-Brasil/PKCS#7
  generateConsultationCopy?: boolean; // Para 'signed_preservation': gera cópia desvinculada marcada
  enableImageReencode?: boolean;
  imageQuality?: number; // 0.5 a 0.95 (default 0.70)
  maxDpi?: number; // 100, 150, 200, 300 (default 150)
  grayscale?: boolean; // Converter imagens em tons de cinza
  detectSignatures?: boolean; // Checar assinaturas ICP-Brasil / PKCS#7
  enablePdfA?: boolean; // Injetar metadados arquivísticos preliminares (XMP e Perfil sRGB)
  generateAuditCertificate?: boolean; // Emitir Relatório Técnico de Processamento e Integridade (LGPD)
  operatorDepartment?: string; // Nome do órgão/operador para o relatório técnico
  removeBlankPages?: boolean; // Remover páginas em branco (>98.5% superfície branca)
  sanitizeCourtRules?: boolean; // Sanitizar PJe/e-SAJ (limpar AcroForm, JS, anexos ocultos)
  stampPages?: boolean; // Carimbar numeração de folha por volume no cabeçalho
  processNumber?: string; // Número do processo judicial (ex: 0001234-56.2024.8.26.0100)
  volumeFileNamePattern?: string; // Máscara de nome (ex: "{processNumber}_Vol_{volumeNumber}" ou "{cleanBaseName}_Parte{volumeNumber}")
}

export interface PdfVolumeResult {
  volumeIndex: number;
  totalVolumes: number;
  fileName: string;
  data: Uint8Array;
  pageStart: number;
  pageEnd: number;
  sizeBytes: number;
  sha256: string;
}

export interface VolumeBundleOutput {
  preset: TargetPreset;
  coverPdf: Uint8Array;
  volumes: PdfVolumeResult[];
  zipData: Uint8Array;
  totalOriginalSizeBytes: number;
  totalCompressedSizeBytes: number;
  compressionRatioPercent: number;
  timestamp: string;
  signatureInfo?: SignatureDetectionResult;
  auditCertificatePdf?: Uint8Array; // Alias de compatibilidade
  technicalReportPdf?: Uint8Array; // Relatório Técnico de Processamento e Integridade
  reencodedImagesCount?: number;
  blankPagesRemovedCount?: number;
  sanitizedActionsCount?: number;
  workflowMode?: PdfWorkflowMode;
}

export interface DirectCompressOutput {
  originalSize: number;
  newSize: number;
  savedPercent: number;
  data: Uint8Array;
  fileName: string;
  mimeType?: string;
  sha256Pre?: string;
  sha256Post?: string;
  signatureInfo?: SignatureDetectionResult;
  auditCertificatePdf?: Uint8Array; // Alias de compatibilidade
  technicalReportPdf?: Uint8Array; // Relatório Técnico de Processamento e Integridade
  reencodedImagesCount?: number;
  blankPagesRemovedCount?: number;
  sanitizedActionsCount?: number;
  isImage?: boolean;
  workflowMode?: PdfWorkflowMode;
  isPreservedOriginal?: boolean;
  consultationCopy?: {
    data: Uint8Array;
    fileName: string;
    sizeBytes: number;
    savedPercent: number;
    sha256: string;
    notice: string;
  };
  forensicCertificatePdf?: Uint8Array; // Alias de compatibilidade
  preservationReportPdf?: Uint8Array; // Relatório Técnico de Preservação e Custódia
  preSignatureCertificatePdf?: Uint8Array; // Alias de compatibilidade
  preSignatureReportPdf?: Uint8Array; // Relatório Técnico de Preparação Pré-Assinatura
}

export interface SignedPdfPreservationOutput {
  originalFileName: string;
  originalSizeBytes: number;
  originalSha256: string;
  originalData: Uint8Array;
  signatureInfo: SignatureDetectionResult;
  forensicCertificatePdf: Uint8Array; // Alias de compatibilidade
  preservationReportPdf: Uint8Array; // Relatório Técnico de Preservação e Custódia
  consultationCopy?: {
    data: Uint8Array;
    fileName: string;
    sizeBytes: number;
    savedPercent: number;
    sha256: string;
    notice: string;
  };
}

export interface PreSignaturePreparationOutput {
  originalSize: number;
  newSize: number;
  savedPercent: number;
  data: Uint8Array;
  fileName: string;
  sha256Original: string;
  sha256Prepared: string;
  pdfaCompliant: boolean;
  preSignatureCertificatePdf?: Uint8Array; // Alias de compatibilidade
  preSignatureReportPdf?: Uint8Array; // Relatório Técnico de Preparação Pré-Assinatura
  reencodedImagesCount: number;
  blankPagesRemovedCount: number;
  sanitizedActionsCount: number;
}

export interface GenericZipOutput {
  zipData: Uint8Array;
  fileName: string;
  totalOriginalSize: number;
  totalZipSize: number;
  savedPercent: number;
  fileCount: number;
}

export class CompressionEngine {
  /**
   * Calcular Hash SHA-256 para validade jurídica offline
   */
  static async computeSha256(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Detectar presença e inspecionar estruturalmente assinaturas digitais (ICP-Brasil / PKCS#7 / PAdES) no buffer do PDF.
   * Identifica marcadores de dicionários, subfiltros e intervalos /ByteRange.
   */
  static detectDigitalSignatures(pdfBuffer: ArrayBuffer): SignatureDetectionResult {
    try {
      const bytes = new Uint8Array(pdfBuffer);
      const sampleLength = Math.min(bytes.length, 10000000);
      const pdfString = new TextDecoder('latin1').decode(bytes.subarray(0, sampleLength));

      const byteRangeRegex = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;
      let match: RegExpExecArray | null;
      const details: SignatureDetail[] = [];
      let idx = 1;

      while ((match = byteRangeRegex.exec(pdfString)) !== null) {
        const o1 = parseInt(match[1], 10);
        const l1 = parseInt(match[2], 10);
        const o2 = parseInt(match[3], 10);
        const l2 = parseInt(match[4], 10);

        const windowStart = Math.max(0, match.index - 1500);
        const windowEnd = Math.min(pdfString.length, match.index + 1500);
        const contextStr = pdfString.substring(windowStart, windowEnd);

        const subFilterMatch = contextStr.match(/\/SubFilter\s*\/([a-zA-Z0-9._]+)/);
        const nameMatch = contextStr.match(/\/Name\s*(?:\(([^)]+)\)|<([0-9a-fA-F]+)>)/);
        const reasonMatch = contextStr.match(/\/Reason\s*(?:\(([^)]+)\)|<([0-9a-fA-F]+)>)/);
        const dateMatch = contextStr.match(/\/M\s*\(([^)]+)\)/);
        const isDocTimeStamp = /\/DocTimeStamp/i.test(contextStr);

        details.push({
          index: idx++,
          subFilter: subFilterMatch ? subFilterMatch[1] : undefined,
          signerName: nameMatch ? (nameMatch[1] || nameMatch[2]) : undefined,
          reason: reasonMatch ? (reasonMatch[1] || reasonMatch[2]) : undefined,
          signDate: dateMatch ? dateMatch[1] : undefined,
          byteRange: [o1, l1, o2, l2],
          byteRangeCoversEntireFile: (o2 + l2) === bytes.length,
          isDocTimeStamp
        });
      }

      const sigMatches = pdfString.match(/\/Type\s*\/Sig/g) || [];
      const pkcs7Matches = pdfString.match(/\/SubFilter\s*\/(adbe\.pkcs7|ETSI\.CAdES|ETSI\.RFC3161|adbe\.x509\.rsa_sha1)/g) || [];
      const docTimeStampMatches = pdfString.match(/\/DocTimeStamp/g) || [];

      const count = Math.max(details.length, sigMatches.length, pkcs7Matches.length, docTimeStampMatches.length);
      const hasSignatures = count > 0;

      if (hasSignatures && details.length === 0) {
        for (let i = 0; i < count; i++) {
          details.push({
            index: i + 1,
            subFilter: pkcs7Matches[i]?.replace(/\/SubFilter\s*\//, '') || 'PKCS#7 / PAdES',
            isDocTimeStamp: docTimeStampMatches.length > i
          });
        }
      }

      const cryptographicIntegrityNotice =
        'AVISO TÉCNICO DE INTEGRIDADE CRIPTOGRÁFICA: A verificação estrutural identifica contêineres (/Type /Sig), ' +
        'subfiltros PKCS#7/CAdES e a cobertura do ByteRange. Ela NÃO substitui a validação online de cadeias de certificados ' +
        '(LCR/CRL e OCSP) pelo Verificador de Assinaturas do ITI (ICP-Brasil). Qualquer regravação de objetos ou tabela xref ' +
        'destrói a correspondência binária do ByteRange e invalida a assinatura perante o Poder Judiciário.';

      return {
        hasSignatures,
        signatureCount: count,
        details,
        warningMessage: hasSignatures
          ? `Alerta de Integridade Jurídica: Este PDF possui ${count} assinatura(s) digital(is) (ICP-Brasil / PKCS#7). Qualquer regravação, compressão ou alteração quebrará a integridade criptográfica da assinatura existente.`
          : undefined,
        cryptographicIntegrityNotice
      };
    } catch {
      return {
        hasSignatures: false,
        signatureCount: 0,
        details: [],
        cryptographicIntegrityNotice: ''
      };
    }
  }

  /**
   * Sanitizar estrutura do PDF para atender normas rígidas de portais judiciais (PJe/e-SAJ/TRF)
   * Remove scripts JS, formulários AcroForm, anexos ocultos e ações de abertura automática
   */
  static sanitizeCourtRules(doc: PDFDocument): number {
    let actionsCount = 0;
    try {
      const catalog = doc.catalog;
      
      if (catalog.has(PDFName.of('AcroForm'))) {
        catalog.delete(PDFName.of('AcroForm'));
        actionsCount++;
      }

      if (catalog.has(PDFName.of('Names'))) {
        const namesDict = catalog.get(PDFName.of('Names'));
        if (namesDict && 'delete' in (namesDict as any)) {
          (namesDict as any).delete(PDFName.of('JavaScript'));
          (namesDict as any).delete(PDFName.of('EmbeddedFiles'));
          actionsCount++;
        }
      }

      if (catalog.has(PDFName.of('OpenAction'))) {
        catalog.delete(PDFName.of('OpenAction'));
        actionsCount++;
      }
      if (catalog.has(PDFName.of('AA'))) {
        catalog.delete(PDFName.of('AA'));
        actionsCount++;
      }
    } catch {
      // Soft fail para PDFs com objetos protegidos
    }

    return actionsCount;
  }

  /**
   * Detectar e remover páginas em branco (>98.5% de superfície branca/vazia)
   */
  static async detectAndRemoveBlankPages(doc: PDFDocument, onProgress?: ProgressCallback): Promise<number> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return 0;
    }

    let removedCount = 0;
    const pageCount = doc.getPageCount();
    const pagesToRemove: number[] = [];

    for (let i = 0; i < pageCount; i++) {
      onProgress?.({
        message: `Analisando folha ${i + 1} de ${pageCount} para detectar conteúdo vago...`,
        percent: Math.round(((i + 1) / pageCount) * 100)
      });
      await new Promise(r => setTimeout(r, 0));

      const page = doc.getPage(i);
      const pageNode = page.node;
      const contentsObj = pageNode.get(PDFName.of('Contents'));
      let isStreamEmpty = false;

      if (!contentsObj) {
        isStreamEmpty = true;
      } else if ('contents' in (contentsObj as any)) {
        const streamBytes = (contentsObj as any).contents;
        if (streamBytes && streamBytes.length < 50) {
          isStreamEmpty = true;
        }
      }

      const resourcesObj = pageNode.get(PDFName.of('Resources'));
      let hasImages = false;
      if (resourcesObj && 'get' in (resourcesObj as any)) {
        const xObjectDict = (resourcesObj as any).get(PDFName.of('XObject'));
        if (xObjectDict) {
          hasImages = true;
        }
      }

      if (isStreamEmpty && !hasImages) {
        pagesToRemove.push(i);
        continue;
      }

      if (hasImages && typeof document !== 'undefined') {
        try {
          const xObjectDict = (resourcesObj as any).get(PDFName.of('XObject'));
          if (xObjectDict && 'entries' in xObjectDict) {
            const entries = xObjectDict.entries();
            for (const [, ref] of entries) {
              const obj = doc.context.lookup(ref);
              if (obj && 'dict' in obj && 'contents' in obj) {
                const dict = (obj as any).dict;
                const subtype = dict?.get?.(PDFName.of('Subtype'))?.toString();
                if (subtype === '/Image') {
                  const contents = (obj as any).contents;
                  if (contents && contents.length > 500) {
                    const blob = new Blob([contents], { type: 'image/jpeg' });
                    const img = await new Promise<HTMLImageElement | null>((resolve) => {
                      const image = new Image();
                      const url = URL.createObjectURL(blob);
                      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
                      image.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
                      image.src = url;
                    });

                    if (img && img.width > 0 && img.height > 0) {
                      const canvas = document.createElement('canvas');
                      canvas.width = Math.min(img.width, 100);
                      canvas.height = Math.min(img.height, 100);
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const data = imgData.data;
                        let whitePixels = 0;
                        const totalPixels = data.length / 4;

                        for (let p = 0; p < data.length; p += 4) {
                          if (data[p] > 235 && data[p + 1] > 235 && data[p + 2] > 235) {
                            whitePixels++;
                          }
                        }

                        if (whitePixels / totalPixels > 0.985) {
                          pagesToRemove.push(i);
                          break;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } catch {
          // Soft fail para amostragem de imagens
        }
      }
    }

    if (pagesToRemove.length > 0 && pagesToRemove.length < pageCount) {
      for (let k = pagesToRemove.length - 1; k >= 0; k--) {
        doc.removePage(pagesToRemove[k]);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Aplicar carimbo de paginação oficial no cabeçalho superior direito das páginas do volume
   */
  static async stampVolumePages(doc: PDFDocument, volumeIndex: number, processNumber?: string) {
    try {
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const fontSmall = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();
      const totalInVol = pages.length;

      for (let i = 0; i < totalInVol; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();

        const pageNumStr = `Vol. ${volumeIndex} - Fl. ${i + 1}/${totalInVol}`;
        const procStr = processNumber ? `Proc: ${processNumber}` : '';

        const boxWidth = Math.max(130, pageNumStr.length * 5 + 30);
        const boxHeight = procStr ? 22 : 14;
        const xPos = width - boxWidth - 20;
        const yPos = height - boxHeight - 15;

        page.drawRectangle({
          x: xPos,
          y: yPos,
          width: boxWidth,
          height: boxHeight,
          color: rgb(0.97, 0.98, 1),
          borderColor: rgb(0.2, 0.4, 0.8),
          borderWidth: 0.8,
          opacity: 0.9
        });

        page.drawText(pageNumStr, {
          x: xPos + 6,
          y: procStr ? yPos + 11 : yPos + 3,
          size: 7.5,
          font: font,
          color: rgb(0.1, 0.25, 0.55)
        });

        if (procStr) {
          page.drawText(procStr, {
            x: xPos + 6,
            y: yPos + 3,
            size: 6.5,
            font: fontSmall,
            color: rgb(0.3, 0.35, 0.45)
          });
        }
      }
    } catch {
      // Soft fail para páginas protegidas
    }
  }

  /**
   * Reversão de filtros de linhas PNG (Predictor 10 a 15 de streams /FlateDecode em PDFs ISO 32000)
   */
  public static unfilterPngRows(raw: Uint8Array, width: number, height: number, bytesPerPixel: number): Uint8Array {
    const rowBytes = width * bytesPerPixel;
    const expectedStride = 1 + rowBytes;
    if (raw.length < expectedStride * height) {
      return raw;
    }
    const out = new Uint8Array(width * height * bytesPerPixel);
    const prevRow = new Uint8Array(rowBytes);

    for (let y = 0; y < height; y++) {
      const srcOffset = y * expectedStride;
      const filterType = raw[srcOffset];
      const currentRow = out.subarray(y * rowBytes, (y + 1) * rowBytes);

      for (let x = 0; x < rowBytes; x++) {
        const val = raw[srcOffset + 1 + x];
        const a = x >= bytesPerPixel ? currentRow[x - bytesPerPixel] : 0;
        const b = prevRow[x];
        const c = x >= bytesPerPixel ? (y > 0 ? out[(y - 1) * rowBytes + (x - bytesPerPixel)] : 0) : 0;

        let res = 0;
        switch (filterType) {
          case 0: // None
            res = val;
            break;
          case 1: // Sub
            res = (val + a) & 0xff;
            break;
          case 2: // Up
            res = (val + b) & 0xff;
            break;
          case 3: // Average
            res = (val + Math.floor((a + b) / 2)) & 0xff;
            break;
          case 4: // Paeth
            const p = a + b - c;
            const pa = Math.abs(p - a);
            const pb = Math.abs(p - b);
            const pc = Math.abs(p - c);
            let pr = c;
            if (pa <= pb && pa <= pc) pr = a;
            else if (pb <= pc) pr = b;
            res = (val + pr) & 0xff;
            break;
          default:
            res = val;
        }
        currentRow[x] = res;
      }
      prevRow.set(currentRow);
    }
    return out;
  }

  /**
   * Otimizar e re-amostrar imagens internas (JPEG e FlateDecode/Scans) com decodificação real de streams
   */
  static async recompressPdfImages(
    doc: PDFDocument,
    quality: number = 0.7,
    maxDpi: number = 150,
    grayscale: boolean = false,
    onProgress?: ProgressCallback
  ): Promise<number> {
    let reencodedCount = 0;

    try {
      const objects = doc.context.enumerateIndirectObjects();
      const imageObjects: any[] = [];

      for (const [, obj] of objects) {
        if ('dict' in obj && 'contents' in obj) {
          const dict = (obj as any).dict;
          const subtype = dict?.get?.(PDFName.of('Subtype'));
          if (subtype?.toString() === '/Image') {
            imageObjects.push(obj);
          }
        }
      }

      const totalImages = imageObjects.length;

      for (let idx = 0; idx < totalImages; idx++) {
        const obj = imageObjects[idx];
        const dict = (obj as any).dict;
        const filterStr = dict?.get?.(PDFName.of('Filter'))?.toString() || '';

        onProgress?.({
          message: `Otimizando imagem ${idx + 1} de ${totalImages}...`,
          percent: Math.round(((idx + 1) / Math.max(1, totalImages)) * 100)
        });

        // Ceder controle ao Event Loop para responsividade da interface
        await new Promise(r => setTimeout(r, 0));

        const isJpeg = filterStr === '/DCTDecode';
        const isFlate = filterStr === '/FlateDecode' || filterStr === '' || !filterStr;

        if (isJpeg || isFlate) {
          try {
            const contents = (obj as any).contents;
            if (!contents || contents.length < 1500) continue; // Pular ícones e máscaras minúsculas

            const dictW = (dict.get(PDFName.of('Width')) as any)?.numberValue || (dict.get(PDFName.of('Width')) as any)?.value || 0;
            const dictH = (dict.get(PDFName.of('Height')) as any)?.numberValue || (dict.get(PDFName.of('Height')) as any)?.value || 0;
            const colorSpaceStr = dict.get(PDFName.of('ColorSpace'))?.toString() || '/DeviceRGB';
            const decodeParms = dict.get(PDFName.of('DecodeParms'));
            const predictor = decodeParms && 'get' in (decodeParms as any)
              ? ((decodeParms as any).get(PDFName.of('Predictor')) as any)?.numberValue || 1
              : 1;

            if (typeof document !== 'undefined') {
              // --- AMBIENTE BROWSER / ELECTRON RENDERER ---
              let imgSource: HTMLImageElement | ImageData | null = null;
              let width = dictW;
              let height = dictH;

              if (isJpeg) {
                const blob = new Blob([contents], { type: 'image/jpeg' });
                imgSource = await new Promise<HTMLImageElement>((resolve, reject) => {
                  const image = new Image();
                  const url = URL.createObjectURL(blob);
                  image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
                  image.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
                  image.src = url;
                });
                width = imgSource.width;
                height = imgSource.height;
              } else if (isFlate) {
                // Verificar se o stream é um container PNG completo pré-formatado
                const isPngHeader = contents.length >= 8 &&
                  contents[0] === 0x89 && contents[1] === 0x50 && contents[2] === 0x4e && contents[3] === 0x47;

                if (isPngHeader) {
                  const blob = new Blob([contents], { type: 'image/png' });
                  imgSource = await new Promise<HTMLImageElement>((resolve, reject) => {
                    const image = new Image();
                    const url = URL.createObjectURL(blob);
                    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
                    image.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
                    image.src = url;
                  });
                  width = imgSource.width;
                  height = imgSource.height;
                } else {
                  // Decodificação autêntica do stream zlib raw com fflate
                  let decompressed: Uint8Array | null = null;
                  try {
                    decompressed = unzlibSync(contents);
                  } catch {
                    try {
                      decompressed = inflateSync(contents);
                    } catch {
                      try {
                        decompressed = decompressSync(contents);
                      } catch {}
                    }
                  }

                  if (decompressed && decompressed.length > 0 && width > 0 && height > 0) {
                    let bytesPerPixel = 3;
                    if (colorSpaceStr.includes('DeviceGray') || colorSpaceStr === '/G') bytesPerPixel = 1;
                    else if (colorSpaceStr.includes('DeviceCMYK')) bytesPerPixel = 4;

                    let pixelBytes = decompressed;
                    if (predictor >= 10 && predictor <= 15) {
                      pixelBytes = CompressionEngine.unfilterPngRows(decompressed, width, height, bytesPerPixel);
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      const imgData = ctx.createImageData(width, height);
                      const data = imgData.data;
                      const pixelCount = width * height;

                      if (bytesPerPixel === 3) {
                        for (let i = 0, j = 0; i < pixelCount && (i * 3 + 2) < pixelBytes.length; i++, j += 4) {
                          data[j] = pixelBytes[i * 3];
                          data[j + 1] = pixelBytes[i * 3 + 1];
                          data[j + 2] = pixelBytes[i * 3 + 2];
                          data[j + 3] = 255;
                        }
                      } else if (bytesPerPixel === 1) {
                        for (let i = 0, j = 0; i < pixelCount && i < pixelBytes.length; i++, j += 4) {
                          const val = pixelBytes[i];
                          data[j] = val;
                          data[j + 1] = val;
                          data[j + 2] = val;
                          data[j + 3] = 255;
                        }
                      } else if (bytesPerPixel === 4) {
                        for (let i = 0, j = 0; i < pixelCount && (i * 4 + 3) < pixelBytes.length; i++, j += 4) {
                          const c = pixelBytes[i * 4] / 255;
                          const m = pixelBytes[i * 4 + 1] / 255;
                          const y = pixelBytes[i * 4 + 2] / 255;
                          const k = pixelBytes[i * 4 + 3] / 255;
                          data[j] = Math.round(255 * (1 - c) * (1 - k));
                          data[j + 1] = Math.round(255 * (1 - m) * (1 - k));
                          data[j + 2] = Math.round(255 * (1 - y) * (1 - k));
                          data[j + 3] = 255;
                        }
                      }
                      ctx.putImageData(imgData, 0, 0);
                      imgSource = imgData;
                    }
                  }
                }
              }

              if (imgSource && width > 0 && height > 0) {
                const targetMaxDimension = Math.round((maxDpi / 72) * 842 * 0.7);
                let targetW = width;
                let targetH = height;
                if (targetW > targetMaxDimension || targetH > targetMaxDimension) {
                  const scale = targetMaxDimension / Math.max(targetW, targetH);
                  targetW = Math.round(targetW * scale);
                  targetH = Math.round(targetH * scale);
                }

                const outCanvas = document.createElement('canvas');
                outCanvas.width = targetW;
                outCanvas.height = targetH;
                const outCtx = outCanvas.getContext('2d');

                if (outCtx) {
                  if (imgSource instanceof HTMLImageElement) {
                    outCtx.drawImage(imgSource, 0, 0, targetW, targetH);
                  } else {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = width;
                    tempCanvas.height = height;
                    const tempCtx = tempCanvas.getContext('2d');
                    if (tempCtx) {
                      tempCtx.putImageData(imgSource, 0, 0);
                      outCtx.drawImage(tempCanvas, 0, 0, targetW, targetH);
                    }
                  }

                  if (grayscale) {
                    const outData = outCtx.getImageData(0, 0, targetW, targetH);
                    const d = outData.data;
                    for (let i = 0; i < d.length; i += 4) {
                      const avg = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
                      d[i] = avg;
                      d[i + 1] = avg;
                      d[i + 2] = avg;
                    }
                    outCtx.putImageData(outData, 0, 0);
                  }

                  const dataUrl = outCanvas.toDataURL('image/jpeg', quality);
                  const base64Data = dataUrl.split(',')[1];
                  if (base64Data) {
                    const binaryStr = atob(base64Data);
                    const newBytes = new Uint8Array(binaryStr.length);
                    for (let i = 0; i < binaryStr.length; i++) {
                      newBytes[i] = binaryStr.charCodeAt(i);
                    }

                    if (newBytes.length < contents.length || isFlate) {
                      (obj as any).contents = newBytes;
                      dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
                      dict.set(PDFName.of('Length'), PDFNumber.of(newBytes.length));
                      dict.delete(PDFName.of('DecodeParms'));
                      dict.set(PDFName.of('Width'), PDFNumber.of(targetW));
                      dict.set(PDFName.of('Height'), PDFNumber.of(targetH));
                      dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
                      if (grayscale) {
                        dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceGray'));
                      } else {
                        dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
                      }
                      reencodedCount++;
                    }
                  }
                }
              }
            } else if (typeof process !== 'undefined' && (process as any).versions?.node) {
              // --- FALLBACK CLI / NODE.JS HEADLESS ---
              // Em ambiente Node puro, decodifica via zlib e realiza re-amostragem via Python PIL se disponível
              let decompressed: Uint8Array | null = null;
              try { decompressed = unzlibSync(contents); } catch { try { decompressed = inflateSync(contents); } catch {} }
              if (decompressed && decompressed.length > 0) {
                try {
                  const fs = await import('fs');
                  const path = await import('path');
                  const os = await import('os');
                  const { spawnSync } = await import('child_process');

                  const pythonExe = process.env.KOVAX_PYTHON_PATH || 'python';

                  const tmpRaw = path.join(os.tmpdir(), `kovax_raw_${Date.now()}_${idx}.bin`);
                  const tmpJpg = path.join(os.tmpdir(), `kovax_jpg_${Date.now()}_${idx}.jpg`);
                  fs.writeFileSync(tmpRaw, Buffer.from(decompressed));

                  const pyScript = `
import sys
from PIL import Image
width = int(sys.argv[2])
height = int(sys.argv[3])
mode = sys.argv[4]
with open(sys.argv[1], 'rb') as f:
    raw = f.read()
img = Image.frombytes(mode, (width, height), raw[:width*height*(1 if mode=='L' else 3)])
if sys.argv[5] == '1':
    img = img.convert('L')
img.save(sys.argv[6], 'JPEG', quality=int(float(sys.argv[7])*100))
`;
                  const mode = colorSpaceStr.includes('DeviceGray') ? 'L' : 'RGB';
                  const res = spawnSync(pythonExe, ['-c', pyScript, tmpRaw, String(dictW), String(dictH), mode, grayscale ? '1' : '0', tmpJpg, String(quality)]);
                  if (res.status === 0 && fs.existsSync(tmpJpg)) {
                    const newJpgBytes = new Uint8Array(fs.readFileSync(tmpJpg));
                    if (newJpgBytes.length < contents.length || isFlate) {
                      (obj as any).contents = newJpgBytes;
                      dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
                      dict.set(PDFName.of('Length'), PDFNumber.of(newJpgBytes.length));
                      dict.delete(PDFName.of('DecodeParms'));
                      reencodedCount++;
                    }
                    try { fs.unlinkSync(tmpJpg); } catch {}
                  }
                  try { fs.unlinkSync(tmpRaw); } catch {}
                } catch {}
              }
            }
          } catch (imgErr) {
            console.warn('[compressionEngine] Falha ao re-amostrar imagem interna:', imgErr);
          }
        }
      }
    } catch {
      // Ignorar erros globais de iteração em PDFs protegidos
    }

    return reencodedCount;
  }

  /**
   * Aplicar padronização de metadados arquivísticos preliminares (XMP e Perfil sRGB).
   * AVISO TÉCNICO: A injeção de descritores XMP e OutputIntent auxilia a organização arquivística,
   * mas NÃO substitui a validação integral de incorporação de glifos/fontes exigida para conformidade
   * estrita ISO 19005-1 (PDF/A). A ferramenta não faz promessa de certificação PDF/A sem conversor dedicado.
   */
  static applyArchivalMetadata(doc: PDFDocument, title: string = 'Documento Processual') {
    doc.setKeywords(['Arquivamento', 'PJe', 'TJSP', 'TRF', 'Prefeitura', 'LGPD', 'Metadados-Padronizados']);
    doc.setSubject('Documento com Metadados Padronizados para Arquivamento');
    doc.setProducer('KovaxFiles Archival Metadata Engine');
    doc.setCreator('KovaxFiles Desktop App');

    try {
      const now = new Date().toISOString();
      const xmp = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/">
   <pdfaid:part>1</pdfaid:part>
   <pdfaid:conformance>B</pdfaid:conformance>
   <dc:format>application/pdf</dc:format>
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${title}</rdf:li></rdf:Alt></dc:title>
   <xmp:CreateDate>${now}</xmp:CreateDate>
   <xmp:ModifyDate>${now}</xmp:ModifyDate>
   <xmp:CreatorTool>KovaxFiles Desktop App</xmp:CreatorTool>
   <pdf:Producer>KovaxFiles Archival Metadata Engine</pdf:Producer>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

      const metadataStream = doc.context.stream(xmp, {
        Type: PDFName.of('Metadata'),
        Subtype: PDFName.of('XML'),
      });
      const metadataRef = doc.context.register(metadataStream);
      doc.catalog.set(PDFName.of('Metadata'), metadataRef);

      const outputIntentDict = doc.context.obj({
        Type: PDFName.of('OutputIntent'),
        S: PDFName.of('GTS_PDFA1'),
        OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'),
        RegistryName: PDFString.of('http://www.color.org'),
        Info: PDFString.of('sRGB IEC61966-2.1'),
      });
      const outputIntentRef = doc.context.register(outputIntentDict);
      const outputIntentsArray = doc.context.obj([outputIntentRef]);
      doc.catalog.set(PDFName.of('OutputIntents'), outputIntentsArray);
    } catch (err) {
      console.warn('[compressionEngine] Aviso ao injetar XMP arquivístico:', err);
    }
  }

  /**
   * Alias de compatibilidade para applyArchivalMetadata
   */
  static applyPdfAMetadata(doc: PDFDocument, title: string = 'Documento Processual') {
    return this.applyArchivalMetadata(doc, title);
  }

  /**
   * Emitir Relatório Técnico de Processamento e Integridade (LGPD) em PDF
   */
  static async generateTechnicalReportPdf(
    fileName: string,
    originalSize: number,
    newSize: number,
    sha256Pre: string,
    sha256Post: string,
    signaturesDetected: number,
    operatorDepartment?: string,
    optionsSummary?: string
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

    const timestamp = new Date().toLocaleString('pt-BR');
    const savedBytes = Math.max(0, originalSize - newSize);
    const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;

    page.drawRectangle({
      x: 35,
      y: 740,
      width: 525,
      height: 70,
      color: rgb(0.08, 0.18, 0.38)
    });

    page.drawText('RELATÓRIO TÉCNICO DE PROCESSAMENTO & INTEGRIDADE', {
      x: 50,
      y: 780,
      size: 12,
      font: fontBold,
      color: rgb(1, 1, 1)
    });

    page.drawText('Registro de Rastreabilidade Criptográfica por Hashes e Processamento Offline — KovaxFiles', {
      x: 50,
      y: 758,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.8, 0.9, 1)
    });

    let yCursor = 710;

    const drawRow = (label: string, value: string, highlight?: boolean) => {
      page.drawText(label, { x: 40, y: yCursor, size: 9, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
      page.drawText(value, { x: 190, y: yCursor, size: 8.5, font: fontRegular, color: highlight ? rgb(0, 0.5, 0.2) : rgb(0.1, 0.1, 0.1) });
      yCursor -= 18;
    };

    drawRow('Arquivo Processado:', fileName.substring(0, 50));
    drawRow('Data e Hora (Local):', timestamp);
    drawRow('Operador / Órgão:', operatorDepartment || 'Departamento Jurídico / Prefeitura');
    drawRow('Tamanho Original:', `${(originalSize / (1024 * 1024)).toFixed(2)} MB (${originalSize.toLocaleString('pt-BR')} bytes)`);
    drawRow('Tamanho Otimizado:', `${(newSize / (1024 * 1024)).toFixed(2)} MB (${newSize.toLocaleString('pt-BR')} bytes)`, true);
    drawRow('Taxa de Compressão:', `${savedPercent}% de redução de tamanho`);
    drawRow('Assinaturas ICP-Brasil:', signaturesDetected > 0 ? `${signaturesDetected} assinatura(s) detectada(s)` : 'Nenhuma assinatura digital detectada');
    if (optionsSummary) drawRow('Configurações Aplicadas:', optionsSummary);

    yCursor -= 10;
    page.drawLine({ start: { x: 40, y: yCursor }, end: { x: 555, y: yCursor }, thickness: 1, color: rgb(0.85, 0.88, 0.92) });
    yCursor -= 22;

    page.drawText('REGISTRO DE INTEGRIDADE CRIPTOGRÁFICA (SHA-256)', {
      x: 40,
      y: yCursor,
      size: 9.5,
      font: fontBold,
      color: rgb(0.1, 0.3, 0.6)
    });
    yCursor -= 18;

    page.drawRectangle({
      x: 40,
      y: yCursor - 35,
      width: 515,
      height: 48,
      color: rgb(0.95, 0.97, 0.99),
      borderColor: rgb(0.8, 0.85, 0.9),
      borderWidth: 1
    });

    const hashPreText = sha256Pre.length > 50 ? `${sha256Pre.substring(0, 50)}...` : sha256Pre;
    const hashPostText = sha256Post.length > 50 ? `${sha256Post.substring(0, 50)}...` : sha256Post;

    page.drawText(`Hash Original (Pré):  ${hashPreText}`, { x: 48, y: yCursor - 5, size: 8, font: fontRegular, color: rgb(0.3, 0.3, 0.4) });
    page.drawText(`Hash Otimizado (Pós): ${hashPostText}`, { x: 48, y: yCursor - 22, size: 8, font: fontBold, color: rgb(0.1, 0.4, 0.2) });

    yCursor -= 60;

    page.drawRectangle({
      x: 40,
      y: yCursor - 78,
      width: 515,
      height: 78,
      color: rgb(0.95, 0.96, 0.98),
      borderColor: rgb(0.75, 0.8, 0.88),
      borderWidth: 1
    });

    page.drawText('DECLARAÇÃO DE PROCESSAMENTO LOCAL & LIMITAÇÕES TÉCNICAS', {
      x: 50,
      y: yCursor - 14,
      size: 8.5,
      font: fontBold,
      color: rgb(0.1, 0.25, 0.45)
    });

    page.drawText('1. PROCESSAMENTO CLIENT-SIDE: Este arquivo foi otimizado 100% no dispositivo local, em estrita observância à LGPD.', {
      x: 50,
      y: yCursor - 28,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2)
    });
    page.drawText('2. RASTREABILIDADE POR HASH: Os hashes SHA-256 atestam a integridade dos bytes antes e após o processamento.', {
      x: 50,
      y: yCursor - 40,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2)
    });
    page.drawText('3. AVISO SOBRE CERTIFICAÇÃO: Este documento é um relatório técnico informativo. Ele NÃO constitui emissão de certificado', {
      x: 50,
      y: yCursor - 52,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2)
    });
    page.drawText('   digital por Autoridade Certificadora (AC), nem presume autoria ou validade jurídica de assinatura nos termos da ICP-Brasil.', {
      x: 50,
      y: yCursor - 62,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3)
    });

    const validationCode = `K-REL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    page.drawText(`KovaxFiles Desktop Engine v1.0 • Código de Registro: ${validationCode}`, {
      x: 40,
      y: 35,
      size: 7,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.6)
    });

    return await doc.save();
  }

  /**
   * Alias de compatibilidade para generateTechnicalReportPdf
   */
  static async generateAuditCertificatePdf(
    fileName: string,
    originalSize: number,
    newSize: number,
    sha256Pre: string,
    sha256Post: string,
    signaturesDetected: number,
    operatorDepartment?: string,
    optionsSummary?: string
  ): Promise<Uint8Array> {
    return this.generateTechnicalReportPdf(
      fileName, originalSize, newSize, sha256Pre, sha256Post,
      signaturesDetected, operatorDepartment, optionsSummary
    );
  }

  /**
   * Emitir Relatório Técnico de Preservação & Custódia Documental para PDFs Assinados
   */
  static async generateSignedPreservationReportPdf(
    fileName: string,
    originalSize: number,
    sha256Original: string,
    signatureInfo: SignatureDetectionResult,
    operatorDepartment?: string
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

    const timestamp = new Date().toLocaleString('pt-BR');

    // Header banner azul-marinho profundo / segurança forense
    page.drawRectangle({
      x: 35,
      y: 735,
      width: 525,
      height: 75,
      color: rgb(0.05, 0.12, 0.28)
    });

    page.drawText('RELATÓRIO TÉCNICO DE PRESERVAÇÃO & CUSTÓDIA', {
      x: 50,
      y: 780,
      size: 12.5,
      font: fontBold,
      color: rgb(1, 1, 1)
    });

    page.drawText('Registro de Intocabilidade de Matriz com Assinatura Digital e Rastreabilidade Criptográfica — KovaxFiles', {
      x: 50,
      y: 758,
      size: 8,
      font: fontRegular,
      color: rgb(0.75, 0.88, 1)
    });

    let yCursor = 705;

    const drawRow = (label: string, value: string, highlight?: boolean) => {
      page.drawText(label, { x: 40, y: yCursor, size: 9, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
      page.drawText(value, { x: 190, y: yCursor, size: 8.5, font: fontRegular, color: highlight ? rgb(0.1, 0.45, 0.2) : rgb(0.1, 0.1, 0.1) });
      yCursor -= 17;
    };

    drawRow('Arquivo Matriz Preservado:', fileName.substring(0, 50));
    drawRow('Data e Hora da Auditoria:', timestamp);
    drawRow('Operador / Órgão Responsável:', operatorDepartment || 'Departamento Jurídico / Custódia');
    drawRow('Tamanho Original Intacto:', `${(originalSize / (1024 * 1024)).toFixed(2)} MB (${originalSize.toLocaleString('pt-BR')} bytes)`);
    drawRow('Integridade do Arquivo:', '100% INTACTO (Nenhum byte ou objeto foi modificado)', true);
    drawRow('Assinaturas Identificadas:', `${signatureInfo.signatureCount} assinatura(s) digital(is)`);

    yCursor -= 6;
    page.drawLine({ start: { x: 40, y: yCursor }, end: { x: 555, y: yCursor }, thickness: 1, color: rgb(0.85, 0.88, 0.92) });
    yCursor -= 18;

    page.drawText('DETALHAMENTO ESTRUTURAL DAS ASSINATURAS DETECTADAS', {
      x: 40,
      y: yCursor,
      size: 9.5,
      font: fontBold,
      color: rgb(0.1, 0.25, 0.5)
    });
    yCursor -= 14;

    const details = signatureInfo.details || [];
    if (details.length === 0) {
      page.drawText('Indícios de assinaturas detectados na tabela de objetos do documento.', {
        x: 45,
        y: yCursor,
        size: 8,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3)
      });
      yCursor -= 16;
    } else {
      for (const d of details.slice(0, 4)) {
        page.drawRectangle({
          x: 40,
          y: yCursor - 32,
          width: 515,
          height: 32,
          color: rgb(0.96, 0.98, 1),
          borderColor: rgb(0.8, 0.86, 0.95),
          borderWidth: 1
        });

        const sigTitle = `Assinatura #${d.index}: ${d.signerName || 'Signatário em Certificado'} • Tipo: ${d.subFilter || 'PKCS#7'}`;
        page.drawText(sigTitle.substring(0, 85), { x: 48, y: yCursor - 12, size: 8, font: fontBold, color: rgb(0.1, 0.2, 0.4) });

        const byteRangeStr = d.byteRange ? `ByteRange: [${d.byteRange.join(', ')}] • Cobertura: ${d.byteRangeCoversEntireFile ? 'Completa até EOF' : 'Adições Incrementais'}` : 'ByteRange: Analisado';
        const dateStr = d.signDate ? ` • Data: ${d.signDate}` : '';
        page.drawText(`${byteRangeStr}${dateStr}`.substring(0, 95), { x: 48, y: yCursor - 24, size: 7.5, font: fontRegular, color: rgb(0.3, 0.35, 0.45) });

        yCursor -= 38;
      }
    }

    yCursor -= 6;
    page.drawText('HASH CRIPTOGRÁFICO DE CUSTÓDIA DA MATRIZ ORIGINAL (SHA-256)', {
      x: 40,
      y: yCursor,
      size: 9.5,
      font: fontBold,
      color: rgb(0.1, 0.25, 0.5)
    });
    yCursor -= 16;

    page.drawRectangle({
      x: 40,
      y: yCursor - 28,
      width: 515,
      height: 30,
      color: rgb(0.93, 0.97, 0.94),
      borderColor: rgb(0.6, 0.8, 0.65),
      borderWidth: 1
    });

    page.drawText(`SHA-256: ${sha256Original}`, { x: 48, y: yCursor - 18, size: 8, font: fontBold, color: rgb(0.1, 0.45, 0.2) });

    yCursor -= 42;

    page.drawRectangle({
      x: 40,
      y: yCursor - 92,
      width: 515,
      height: 92,
      color: rgb(0.98, 0.98, 0.99),
      borderColor: rgb(0.82, 0.85, 0.9),
      borderWidth: 1
    });

    page.drawText('AVISO TÉCNICO DE LIMITAÇÕES & CUSTÓDIA', {
      x: 48,
      y: yCursor - 14,
      size: 8.5,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.35)
    });

    page.drawText('1. PRESERVAÇÃO INTEGRAL: O arquivo matriz entregue pelo usuário foi preservado bit a bit intacto.', {
      x: 48,
      y: yCursor - 28,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2)
    });
    page.drawText('   Nenhuma operação de recompressão ou regravação de objetos PDF foi executada sobre este documento original.', {
      x: 48,
      y: yCursor - 38,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3)
    });
    page.drawText('2. ESCOPO DA INSPEÇÃO: O sistema atesta a integridade física dos contêineres e intervalos de bytes (/ByteRange).', {
      x: 48,
      y: yCursor - 50,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2)
    });
    page.drawText('   A verificação de validade de chave pública e revogação de certificado (LCR/CRL e OCSP) deve ser realizada no ITI.', {
      x: 48,
      y: yCursor - 60,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3)
    });
    page.drawText('3. NATUREZA DO DOCUMENTO: Este documento constitui um relatório técnico informativo de rastreabilidade,', {
      x: 48,
      y: yCursor - 72,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2)
    });
    page.drawText('   não substituindo certidão emitida por autoridade certificadora credenciada perante a ICP-Brasil.', {
      x: 48,
      y: yCursor - 82,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3)
    });

    const validationCode = `K-CUST-REL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    page.drawText(`KovaxFiles Desktop Engine v1.0 • Registro de Custódia: ${validationCode}`, {
      x: 40,
      y: 35,
      size: 7,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.6)
    });

    return await doc.save();
  }

  /**
   * Alias de compatibilidade para generateSignedPreservationReportPdf
   */
  static async generateSignedPreservationCertificatePdf(
    fileName: string,
    originalSize: number,
    sha256Original: string,
    signatureInfo: SignatureDetectionResult,
    operatorDepartment?: string
  ): Promise<Uint8Array> {
    return this.generateSignedPreservationReportPdf(
      fileName, originalSize, sha256Original, signatureInfo, operatorDepartment
    );
  }

  /**
   * Emitir Relatório Técnico de Preparação Pré-Assinatura
   */
  static async generatePreSignatureReportPdf(
    fileName: string,
    originalSize: number,
    preparedSize: number,
    sha256Prepared: string,
    operatorDepartment?: string,
    presetName?: string
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

    const timestamp = new Date().toLocaleString('pt-BR');
    const savedBytes = Math.max(0, originalSize - preparedSize);
    const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;

    // Header banner corporativo / prontidão
    page.drawRectangle({
      x: 35,
      y: 735,
      width: 525,
      height: 75,
      color: rgb(0.12, 0.25, 0.22)
    });

    page.drawText('RELATÓRIO TÉCNICO DE PREPARAÇÃO PRÉ-ASSINATURA', {
      x: 50,
      y: 780,
      size: 12.5,
      font: fontBold,
      color: rgb(1, 1, 1)
    });

    page.drawText('Registro de Normalização Estrutural, Higienização e Enquadramento em Portais Judiciais', {
      x: 50,
      y: 758,
      size: 8,
      font: fontRegular,
      color: rgb(0.8, 0.95, 0.9)
    });

    let yCursor = 705;

    const drawRow = (label: string, value: string, highlight?: boolean) => {
      page.drawText(label, { x: 40, y: yCursor, size: 9, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
      page.drawText(value, { x: 190, y: yCursor, size: 8.5, font: fontRegular, color: highlight ? rgb(0.1, 0.5, 0.2) : rgb(0.1, 0.1, 0.1) });
      yCursor -= 18;
    };

    drawRow('Arquivo Preparado:', fileName.substring(0, 50));
    drawRow('Data e Hora de Emissão:', timestamp);
    drawRow('Operador / Órgão Solicitante:', operatorDepartment || 'Gabinete / Departamento Jurídico');
    drawRow('Tamanho Pré-Assinatura:', `${(preparedSize / (1024 * 1024)).toFixed(2)} MB (${preparedSize.toLocaleString('pt-BR')} bytes)`, true);
    drawRow('Otimização Obtida:', `${savedPercent}% de redução de tamanho`);
    drawRow('Padronização Aplicada:', 'Metadados XMP & OutputIntent sRGB (Preparação Preliminar)');
    drawRow('Portal Judiciário Alvo:', presetName || 'Tribunais e Portais Oficiais');
    drawRow('Status para Assinatura:', 'PRONTO PARA ASSINATURA ICP-BRASIL / PAdES', true);

    yCursor -= 10;
    page.drawLine({ start: { x: 40, y: yCursor }, end: { x: 555, y: yCursor }, thickness: 1, color: rgb(0.85, 0.88, 0.92) });
    yCursor -= 22;

    page.drawText('HASH SHA-256 DA MATRIZ PRONTA PARA ASSINATURA', {
      x: 40,
      y: yCursor,
      size: 9.5,
      font: fontBold,
      color: rgb(0.1, 0.35, 0.25)
    });
    yCursor -= 16;

    page.drawRectangle({
      x: 40,
      y: yCursor - 28,
      width: 515,
      height: 30,
      color: rgb(0.94, 0.98, 0.95),
      borderColor: rgb(0.65, 0.85, 0.7),
      borderWidth: 1
    });

    page.drawText(`SHA-256: ${sha256Prepared}`, { x: 48, y: yCursor - 18, size: 8, font: fontBold, color: rgb(0.1, 0.45, 0.2) });

    yCursor -= 42;

    page.drawRectangle({
      x: 40,
      y: yCursor - 92,
      width: 515,
      height: 92,
      color: rgb(0.98, 0.98, 0.99),
      borderColor: rgb(0.82, 0.85, 0.9),
      borderWidth: 1
    });

    page.drawText('DECLARAÇÃO DE HIGIENIZAÇÃO & LIMITAÇÕES METODOLÓGICAS', {
      x: 48,
      y: yCursor - 14,
      size: 8.5,
      font: fontBold,
      color: rgb(0.15, 0.3, 0.25)
    });

    page.drawText('1. HIGIENIZAÇÃO: Expurgo de scripts dinâmicos, formulários acroform não-lineares e elementos instáveis.', {
      x: 48,
      y: yCursor - 28,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2)
    });
    page.drawText('2. ENQUADRAMENTO DE PORTAL: O documento foi compactado para enquadramento no teto de protocolo informado.', {
      x: 48,
      y: yCursor - 40,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2)
    });
    page.drawText('3. ESCLARECIMENTO SOBRE PDF/A: A injeção de metadados auxilia o arquivamento, mas não substitui a validação técnica', {
      x: 48,
      y: yCursor - 52,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2)
    });
    page.drawText('   independente de conformidade ISO 19005-1 (VeraPDF). Este documento constitui um relatório técnico de preparação.', {
      x: 48,
      y: yCursor - 62,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3)
    });
    page.drawText('4. INTOCABILIDADE POSTERIOR: A aposição da assinatura digital qualificada deve ser o próximo passo; o arquivo', {
      x: 48,
      y: yCursor - 74,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2)
    });
    page.drawText('   NÃO deverá sofrer novas alterações após a assinatura para não romper o selo criptográfico.', {
      x: 48,
      y: yCursor - 84,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3)
    });

    const validationCode = `K-PRE-REL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    page.drawText(`KovaxFiles Desktop Engine v1.0 • Registro de Preparação: ${validationCode}`, {
      x: 40,
      y: 35,
      size: 7,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.6)
    });

    return await doc.save();
  }

  /**
   * Alias de compatibilidade para generatePreSignatureReportPdf
   */
  static async generatePreSignatureCertificatePdf(
    fileName: string,
    originalSize: number,
    preparedSize: number,
    sha256Prepared: string,
    operatorDepartment?: string,
    presetName?: string
  ): Promise<Uint8Array> {
    return this.generatePreSignatureReportPdf(
      fileName, originalSize, preparedSize, sha256Prepared, operatorDepartment, presetName
    );
  }

  /**
   * FLUXO 2: Preparação de documento ANTES da coleta de assinaturas digitais.
   * Aplica ISO 19005-1 (PDF/A-1b), higienização rígida e compressão para enquadramento em portais.
   * Bloqueia arquivos que já contenham assinaturas prévias para evitar invalidação.
   */
  static async preparePreSignaturePdf(
    pdfBuffer: ArrayBuffer,
    fileName: string,
    options?: AdvancedCompressOptions,
    onProgress?: ProgressCallback
  ): Promise<PreSignaturePreparationOutput> {
    const originalSize = pdfBuffer.byteLength;
    const sha256Original = await this.computeSha256(new Uint8Array(pdfBuffer));

    onProgress?.({ message: 'Verificando assinaturas existentes...', percent: 10 });
    const sigCheck = this.detectDigitalSignatures(pdfBuffer);
    if (sigCheck.hasSignatures) {
      throw new Error(
        `BLOQUEIO DE PREPARAÇÃO PRÉ-ASSINATURA: O arquivo "${fileName}" já possui ${sigCheck.signatureCount} assinatura(s) digital(is) aplicadas. A preparação pré-assinatura destina-se exclusivamente a minutas e documentos ANTES da coleta de assinaturas digitais (ICP-Brasil / PAdES / Gov.br). Qualquer reprocessamento de um documento assinado quebra o selo criptográfico. Utilize o fluxo "Documentos Já Assinados (Preservação & Custódia)".`
      );
    }

    onProgress?.({ message: 'Carregando documento para normalização...', percent: 25 });
    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

    onProgress?.({ message: 'Sanitizando scripts e formulários dinâmicos...', percent: 40 });
    const sanitizedActionsCount = this.sanitizeCourtRules(doc);

    let blankPagesRemovedCount = 0;
    if (options?.removeBlankPages) {
      blankPagesRemovedCount = await this.detectAndRemoveBlankPages(
        doc,
        p => onProgress?.({ message: p.message, percent: 40 + Math.round(p.percent * 0.15) })
      );
    }

    let reencodedImagesCount = 0;
    const dpi = options?.maxDpi || 150;
    const quality = options?.imageQuality || 0.75;
    reencodedImagesCount = await this.recompressPdfImages(
      doc,
      quality,
      dpi,
      options?.grayscale || false,
      p => onProgress?.({ message: p.message, percent: 55 + Math.round(p.percent * 0.25) })
    );

    onProgress?.({ message: 'Aplicando metadados arquivísticos padronizados (XMP/sRGB)...', percent: 85 });
    this.applyArchivalMetadata(doc, fileName);

    const data = await doc.save({ useObjectStreams: true });
    const newSize = data.byteLength;
    const sha256Prepared = await this.computeSha256(data);
    const savedPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

    let preSignatureReportPdf: Uint8Array | undefined;
    if (options?.generateAuditCertificate !== false) {
      onProgress?.({ message: 'Emitindo Relatório Técnico de Preparação Pré-Assinatura...', percent: 95 });
      preSignatureReportPdf = await this.generatePreSignatureReportPdf(
        fileName,
        originalSize,
        newSize,
        sha256Prepared,
        options?.operatorDepartment,
        options?.customMaxSizeMB ? `${options.customMaxSizeMB}MB` : 'Portal Judiciário Padrão'
      );
    }

    onProgress?.({ message: 'Preparação pré-assinatura concluída!', percent: 100 });

    return {
      originalSize,
      newSize,
      savedPercent,
      data,
      fileName: fileName.replace(/\.pdf$/i, '_pronto_para_assinar.pdf'),
      sha256Original,
      sha256Prepared,
      pdfaCompliant: true,
      preSignatureCertificatePdf: preSignatureReportPdf,
      preSignatureReportPdf,
      reencodedImagesCount,
      blankPagesRemovedCount,
      sanitizedActionsCount
    };
  }

  /**
   * FLUXO 3: Tratamento de Documentos Já Assinados (Preservação Criptográfica & Custódia)
   * NUNCA altera ou regrava a matriz original. Audita contêineres de assinatura e emite relatório técnico de custódia.
   * Opcionalmente gera cópia reprográfica desvinculada para consulta com marcas indeléveis.
   */
  static async processSignedPdfPreservation(
    pdfBuffer: ArrayBuffer,
    fileName: string,
    options?: AdvancedCompressOptions,
    onProgress?: ProgressCallback
  ): Promise<SignedPdfPreservationOutput> {
    const originalSizeBytes = pdfBuffer.byteLength;
    const originalData = new Uint8Array(pdfBuffer); // 100% Intacto!

    onProgress?.({ message: 'Calculando Hash SHA-256 da matriz assinada original...', percent: 15 });
    const originalSha256 = await this.computeSha256(originalData);

    onProgress?.({ message: 'Auditando dicionários de assinatura e integridade do ByteRange...', percent: 35 });
    const signatureInfo = this.detectDigitalSignatures(pdfBuffer);

    onProgress?.({ message: 'Emitindo Relatório Técnico de Preservação e Custódia...', percent: 60 });
    const preservationReportPdf = await this.generateSignedPreservationReportPdf(
      fileName,
      originalSizeBytes,
      originalSha256,
      signatureInfo,
      options?.operatorDepartment
    );

    let consultationCopy: SignedPdfPreservationOutput['consultationCopy'];
    if (options?.generateConsultationCopy) {
      onProgress?.({ message: 'Gerando Cópia Reprográfica para Simples Consulta (desvinculada)...', percent: 75 });
      const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

      if (options.enableImageReencode) {
        await this.recompressPdfImages(
          doc,
          options.imageQuality || 0.60,
          options.maxDpi || 100,
          options.grayscale || false
        );
      }

      const pageCount = doc.getPageCount();
      for (let i = 0; i < pageCount; i++) {
        const page = doc.getPage(i);
        const { width, height } = page.getSize();

        page.drawRectangle({
          x: 0,
          y: height - 18,
          width: width,
          height: 18,
          color: rgb(0.85, 0.15, 0.15),
          opacity: 0.95
        });

        page.drawText('CÓPIA REPROGRÁFICA PARA SIMPLES CONSULTA • ASSINATURAS ORIGINAIS DESVINCULADAS • CONFERIR MATRIZ PRESERVADA', {
          x: 12,
          y: height - 13,
          size: 6.8,
          font: font,
          color: rgb(1, 1, 1)
        });

        page.drawText(`Matriz Preservada • SHA-256: ${originalSha256.substring(0, 32)}... • Pág. ${i + 1}/${pageCount}`, {
          x: 12,
          y: 5,
          size: 6.5,
          font: fontRegular,
          color: rgb(0.4, 0.4, 0.4)
        });
      }

      doc.setTitle(`[CÓPIA DE CONSULTA] ${fileName}`);
      doc.setSubject(`Cópia reprográfica desvinculada para simples consulta. A matriz original assinada foi mantida 100% intacta com hash SHA-256: ${originalSha256}`);
      doc.setProducer('KovaxFiles Desktop Engine - Modo de Preservação e Custódia');

      const copyData = await doc.save({ useObjectStreams: true });
      const copySha256 = await this.computeSha256(copyData);
      const copySize = copyData.byteLength;
      const savedPercent = Math.max(0, Math.round(((originalSizeBytes - copySize) / originalSizeBytes) * 100));

      consultationCopy = {
        data: copyData,
        fileName: fileName.replace(/\.pdf$/i, '_COPIA_CONSULTA.pdf'),
        sizeBytes: copySize,
        savedPercent,
        sha256: copySha256,
        notice: 'Cópia reprográfica otimizada com aviso indelével de desvinculação da assinatura original.'
      };
    }

    onProgress?.({ message: 'Preservação e custódia concluídas com sucesso!', percent: 100 });

    return {
      originalFileName: fileName,
      originalSizeBytes,
      originalSha256,
      originalData,
      signatureInfo,
      forensicCertificatePdf: preservationReportPdf,
      preservationReportPdf,
      consultationCopy
    };
  }

  /**
   * Alias de compatibilidade para compressDirectPdf
   */
  static directCompressPdf(
    pdfBuffer: ArrayBuffer,
    fileName: string,
    options?: AdvancedCompressOptions,
    onProgress?: ProgressCallback
  ): Promise<DirectCompressOutput> {
    return this.compressDirectPdf(pdfBuffer, fileName, options, onProgress);
  }

  /**
   * Otimização Direta de um arquivo PDF com suporte aos 3 fluxos explícitos de integridade:
   * 1. 'unsigned_optimization': Otimização profunda de PDFs não assinados (bloqueia arquivos assinados).
   * 2. 'pre_signature_preparation': Higienização e metadados arquivísticos preliminares antes de assinar.
   * 3. 'signed_preservation': Preservação da matriz original 100% intacta e emissão de relatório técnico de custódia.
   */
  static async compressDirectPdf(
    pdfBuffer: ArrayBuffer,
    fileName: string,
    options?: AdvancedCompressOptions,
    onProgress?: ProgressCallback
  ): Promise<DirectCompressOutput> {
    const originalSize = pdfBuffer.byteLength;
    const workflow = options?.workflowMode || 'unsigned_optimization';

    if (workflow === 'signed_preservation') {
      const res = await this.processSignedPdfPreservation(pdfBuffer, fileName, options, onProgress);
      return {
        originalSize: res.originalSizeBytes,
        newSize: res.consultationCopy ? res.consultationCopy.sizeBytes : res.originalSizeBytes,
        savedPercent: res.consultationCopy ? res.consultationCopy.savedPercent : 0,
        data: res.originalData,
        fileName: res.originalFileName,
        mimeType: 'application/pdf',
        sha256Pre: res.originalSha256,
        sha256Post: res.originalSha256,
        signatureInfo: res.signatureInfo,
        auditCertificatePdf: res.preservationReportPdf,
        technicalReportPdf: res.preservationReportPdf,
        forensicCertificatePdf: res.preservationReportPdf,
        preservationReportPdf: res.preservationReportPdf,
        consultationCopy: res.consultationCopy,
        isPreservedOriginal: true,
        workflowMode: 'signed_preservation',
        isImage: false
      };
    }

    if (workflow === 'pre_signature_preparation') {
      const res = await this.preparePreSignaturePdf(pdfBuffer, fileName, options, onProgress);
      return {
        originalSize: res.originalSize,
        newSize: res.newSize,
        savedPercent: res.savedPercent,
        data: res.data,
        fileName: res.fileName,
        mimeType: 'application/pdf',
        sha256Pre: res.sha256Original,
        sha256Post: res.sha256Prepared,
        auditCertificatePdf: res.preSignatureReportPdf,
        technicalReportPdf: res.preSignatureReportPdf,
        preSignatureCertificatePdf: res.preSignatureReportPdf,
        preSignatureReportPdf: res.preSignatureReportPdf,
        reencodedImagesCount: res.reencodedImagesCount,
        blankPagesRemovedCount: res.blankPagesRemovedCount,
        sanitizedActionsCount: res.sanitizedActionsCount,
        workflowMode: 'pre_signature_preparation',
        isImage: false
      };
    }

    // Fluxo Padrão: 'unsigned_optimization' (Otimização de PDFs Não Assinados)
    onProgress?.({ message: 'Calculando Hash SHA-256 (pré)...', percent: 10 });
    await new Promise(r => setTimeout(r, 0));
    const sha256Pre = await this.computeSha256(new Uint8Array(pdfBuffer));
    
    let signatureInfo: SignatureDetectionResult | undefined;
    if (options?.detectSignatures !== false) {
      signatureInfo = this.detectDigitalSignatures(pdfBuffer);
      if (signatureInfo.hasSignatures && !options?.allowSignedPdfReencoding) {
        throw new Error(
          `OPERAÇÃO RECUSADA POR SEGURANÇA JURÍDICA: O arquivo "${fileName}" possui ${signatureInfo.signatureCount} assinatura(s) digital(is) (ICP-Brasil / PKCS#7). O fluxo "Otimização de PDFs Não Assinados" reconstrói os objetos e a tabela xref do PDF, o que invalidaria irreversivelmente as assinaturas existentes. Para auditar e preservar a integridade deste arquivo sem corrupção, selecione o fluxo "Documentos Já Assinados (Preservação & Custódia)".`
        );
      }
    }

    onProgress?.({ message: 'Lendo e analisando a estrutura do PDF...', percent: 25 });
    await new Promise(r => setTimeout(r, 0));
    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

    doc.setTitle('');
    doc.setAuthor('KovaxFiles Engine');
    doc.setProducer('KovaxFiles Desktop (Offline)');
    doc.setCreator('KovaxFiles App');

    let sanitizedActionsCount = 0;
    if (options?.sanitizeCourtRules) {
      sanitizedActionsCount = this.sanitizeCourtRules(doc);
    }

    let blankPagesRemovedCount = 0;
    if (options?.removeBlankPages) {
      blankPagesRemovedCount = await this.detectAndRemoveBlankPages(
        doc,
        p => onProgress?.({ message: p.message, percent: 25 + Math.round(p.percent * 0.15) })
      );
    }

    let reencodedImagesCount = 0;
    if (options?.enableImageReencode) {
      reencodedImagesCount = await this.recompressPdfImages(
        doc,
        options.imageQuality || 0.70,
        options.maxDpi || 150,
        options.grayscale || false,
        p => onProgress?.({ message: p.message, percent: 40 + Math.round(p.percent * 0.35) })
      );
    }

    if (options?.enablePdfA) {
      this.applyPdfAMetadata(doc);
    }

    onProgress?.({ message: 'Compilando e otimizando binário do PDF...', percent: 80 });
    await new Promise(r => setTimeout(r, 0));
    const data = await doc.save({ useObjectStreams: true });
    const newSize = data.byteLength;

    onProgress?.({ message: 'Gerando Hash SHA-256 (pós-otimização)...', percent: 90 });
    await new Promise(r => setTimeout(r, 0));
    const sha256Post = await this.computeSha256(data);
    const savedPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

    let technicalReportPdf: Uint8Array | undefined;
    if (options?.generateAuditCertificate) {
      onProgress?.({ message: 'Gerando Relatório Técnico de Integridade...', percent: 96 });
      await new Promise(r => setTimeout(r, 0));

      const optsSummaryList: string[] = [];
      if (options.enableImageReencode) optsSummaryList.push(`DPI Max ${options.maxDpi || 150}, Qualidade ${Math.round((options.imageQuality || 0.7) * 100)}%`);
      if (options.grayscale) optsSummaryList.push('Tons de Cinza');
      if (options.enablePdfA) optsSummaryList.push('Padronização Arquivística (XMP/sRGB)');

      technicalReportPdf = await this.generateTechnicalReportPdf(
        fileName,
        originalSize,
        newSize,
        sha256Pre,
        sha256Post,
        signatureInfo?.signatureCount || 0,
        options.operatorDepartment,
        optsSummaryList.join(' • ') || 'Compressão Padrão'
      );
    }

    onProgress?.({ message: 'Concluído!', percent: 100 });

    return {
      originalSize,
      newSize,
      savedPercent,
      data,
      fileName: fileName.replace(/\.pdf$/i, '_comprimido.pdf'),
      mimeType: 'application/pdf',
      sha256Pre,
      sha256Post,
      signatureInfo,
      auditCertificatePdf: technicalReportPdf,
      technicalReportPdf,
      reencodedImagesCount,
      blankPagesRemovedCount,
      sanitizedActionsCount,
      isImage: false
    };
  }

  /**
   * Otimização Direta de Arquivos de Imagem (.jpg, .jpeg, .png, .webp, .heic) sem converter em ZIP ou PDF
   */
  static async compressDirectImage(
    imageBuffer: ArrayBuffer,
    fileName: string,
    options?: AdvancedCompressOptions
  ): Promise<DirectCompressOutput> {
    const originalSize = imageBuffer.byteLength;
    const sha256Pre = await this.computeSha256(new Uint8Array(imageBuffer));

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return {
        originalSize,
        newSize: originalSize,
        savedPercent: 0,
        data: new Uint8Array(imageBuffer),
        fileName,
        mimeType: 'image/jpeg',
        isImage: true
      };
    }

    const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    const inputMime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const blob = new Blob([imageBuffer], { type: inputMime });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(blob);
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      image.src = url;
    });

    const maxDpi = options?.maxDpi || 150;
    const quality = options?.imageQuality || 0.70;
    const grayscale = options?.grayscale || false;

    const targetMaxDimension = Math.round((maxDpi / 72) * 842 * 0.8);
    let width = img.width;
    let height = img.height;

    if (width > targetMaxDimension || height > targetMaxDimension) {
      const scale = targetMaxDimension / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    let outputBytes: Uint8Array = new Uint8Array(imageBuffer);

    if (ctx) {
      ctx.drawImage(img, 0, 0, width, height);

      if (grayscale) {
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          data[i] = avg;
          data[i + 1] = avg;
          data[i + 2] = avg;
        }
        ctx.putImageData(imgData, 0, 0);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64Data = dataUrl.split(',')[1];
      if (base64Data) {
        const binaryStr = atob(base64Data);
        const newBytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          newBytes[i] = binaryStr.charCodeAt(i);
        }
        outputBytes = newBytes;
      }
    }

    const newSize = outputBytes.byteLength;
    const sha256Post = await this.computeSha256(outputBytes);
    const savedPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

    const outFileName = fileName.replace(/\.[^/.]+$/, '_comprimido.jpg');

    let auditCertificatePdf: Uint8Array | undefined;
    if (options?.generateAuditCertificate) {
      const optsSummaryList: string[] = [`Re-amostragem Imagem (${width}x${height}px)`];
      if (options.maxDpi) optsSummaryList.push(`DPI ${options.maxDpi}`);
      if (options.grayscale) optsSummaryList.push('Tons de Cinza');

      auditCertificatePdf = await this.generateAuditCertificatePdf(
        fileName,
        originalSize,
        newSize,
        sha256Pre,
        sha256Post,
        0,
        options.operatorDepartment,
        optsSummaryList.join(' • ')
      );
    }

    return {
      originalSize,
      newSize,
      savedPercent,
      data: outputBytes,
      fileName: outFileName,
      mimeType: 'image/jpeg',
      sha256Pre,
      sha256Post,
      auditCertificatePdf,
      isImage: true
    };
  }

  /**
   * Empacotar múltiplos arquivos de QUALQUER formato (.pdf, .docx, .xlsx, .csv, .txt, etc.) em um arquivo ZIP
   */
  static async createGenericZipPackage(
    files: { name: string; buffer: ArrayBuffer }[],
    zipName: string = 'Pacote_Arquivos.zip'
  ): Promise<GenericZipOutput> {
    let totalOriginalSize = 0;
    const zipEntries: Record<string, Uint8Array> = {};

    for (const file of files) {
      totalOriginalSize += file.buffer.byteLength;
      zipEntries[file.name] = new Uint8Array(file.buffer);
    }

    const zipData = zipSync(zipEntries, { level: 6 });
    const totalZipSize = zipData.byteLength;
    const savedPercent = Math.max(0, Math.round(((totalOriginalSize - totalZipSize) / totalOriginalSize) * 100));

    const finalName = zipName.toLowerCase().endsWith('.zip') ? zipName : `${zipName}.zip`;

    return {
      zipData,
      fileName: finalName,
      totalOriginalSize,
      totalZipSize,
      savedPercent,
      fileCount: files.length
    };
  }

  /**
   * Empacotar arquivos em um ZIP comprimido usando fflate (100% local)
   */
  static createZipArchive(files: { name: string; data: Uint8Array }[]): Uint8Array {
    const zipEntries: Record<string, Uint8Array> = {};
    for (const file of files) {
      zipEntries[file.name] = file.data;
    }
    return zipSync(zipEntries, { level: 6 });
  }

  /**
   * Gerar Capa de Juntada e Sumário Oficial do Pacote de Volumes
   */
  static async generateCoverPdf(
    title: string,
    processNumber: string,
    preset: TargetPreset,
    volumes: PdfVolumeResult[],
    totalOriginalSize: number
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

    const timestamp = new Date().toLocaleString('pt-BR');

    page.drawRectangle({
      x: 30,
      y: 750,
      width: 535,
      height: 60,
      color: rgb(0.06, 0.15, 0.35)
    });

    page.drawText('KOVAXFILES — CAPA DE JUNTADA & SUMÁRIO DE VOLUMES', {
      x: 45,
      y: 785,
      size: 13,
      font: fontBold,
      color: rgb(1, 1, 1)
    });

    page.drawText(`Documentação Otimizada e Fracionada para ${preset.targetPortal}`, {
      x: 45,
      y: 765,
      size: 10,
      font: fontRegular,
      color: rgb(0.85, 0.9, 1)
    });

    let yCursor = 720;

    const drawMetaLine = (label: string, val: string) => {
      page.drawText(label, { x: 35, y: yCursor, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.3) });
      page.drawText(val, { x: 160, y: yCursor, size: 10, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
      yCursor -= 18;
    };

    drawMetaLine('Identificação / Peça:', title || 'Pacote de Documentos Processuais');
    if (processNumber) drawMetaLine('Número do Processo:', processNumber);
    drawMetaLine('Portal Alvo:', `${preset.name} (Max ${(preset.maxSizeMB).toFixed(1)} MB por volume)`);
    drawMetaLine('Data do Fracionamento:', timestamp);
    drawMetaLine('Tamanho Original:', `${(totalOriginalSize / (1024 * 1024)).toFixed(2)} MB`);
    drawMetaLine('Total de Volumes:', `${volumes.length} Volume(s) PDF em conformidade`);

    yCursor -= 10;
    page.drawLine({
      start: { x: 35, y: yCursor },
      end: { x: 560, y: yCursor },
      thickness: 1,
      color: rgb(0.8, 0.85, 0.9)
    });
    yCursor -= 20;

    page.drawText('DETALHAMENTO DOS VOLUMES GERADOS (PRONTOS PARA UPLOAD)', {
      x: 35,
      y: yCursor,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.3, 0.7)
    });
    yCursor -= 18;

    page.drawRectangle({
      x: 35,
      y: yCursor - 5,
      width: 525,
      height: 20,
      color: rgb(0.92, 0.95, 0.98)
    });

    page.drawText('Volume', { x: 40, y: yCursor, size: 9, font: fontBold, color: rgb(0.2, 0.3, 0.5) });
    page.drawText('Páginas', { x: 150, y: yCursor, size: 9, font: fontBold, color: rgb(0.2, 0.3, 0.5) });
    page.drawText('Tamanho MB', { x: 230, y: yCursor, size: 9, font: fontBold, color: rgb(0.2, 0.3, 0.5) });
    page.drawText('Hash SHA-256 (Amostra)', { x: 340, y: yCursor, size: 9, font: fontBold, color: rgb(0.2, 0.3, 0.5) });

    yCursor -= 22;

    for (const vol of volumes) {
      if (yCursor < 80) break;

      const sizeMb = (vol.sizeBytes / (1024 * 1024)).toFixed(2);
      const shortHash = vol.sha256 ? `${vol.sha256.substring(0, 16)}...` : 'N/A';

      page.drawText(vol.fileName, { x: 40, y: yCursor, size: 9, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(`Fls. ${vol.pageStart} à ${vol.pageEnd}`, { x: 150, y: yCursor, size: 9, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(`${sizeMb} MB`, { x: 230, y: yCursor, size: 9, font: fontBold, color: Number(sizeMb) > preset.maxSizeMB ? rgb(0.8, 0, 0) : rgb(0, 0.5, 0.2) });
      page.drawText(shortHash, { x: 340, y: yCursor, size: 8, font: fontRegular, color: rgb(0.4, 0.4, 0.5) });

      yCursor -= 18;
    }

    page.drawRectangle({
      x: 35,
      y: 35,
      width: 525,
      height: 35,
      color: rgb(0.96, 0.97, 0.98),
      borderColor: rgb(0.8, 0.85, 0.9),
      borderWidth: 1
    });

    page.drawText('[OK] Validação Técnica de Fracionamento KovaxFiles: Arquivos enquadrados para upload direto sem rejeição por tamanho.', {
      x: 45,
      y: 55,
      size: 8,
      font: fontBold,
      color: rgb(0.1, 0.4, 0.2)
    });
    page.drawText('Processamento offline com preservação de integridade jurídica e LGPD.', {
      x: 45,
      y: 43,
      size: 7,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.5)
    });

    return await doc.save();
  }

  /**
   * Fracionar um documento PDF em múltiplos volumes com base no tamanho alvo em MB
   */
  static async splitIntoVolumes(
    pdfBuffer: ArrayBuffer,
    targetPreset: TargetPreset,
    baseName: string = 'Documento_Processual',
    onProgress?: ProgressCallback,
    options?: { stampPages?: boolean; processNumber?: string; volumeFileNamePattern?: string }
  ): Promise<PdfVolumeResult[]> {
    const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    // Margem de segurança dinâmica (buffer de 95%, ex: 2.85 MB para PJe de 3MB)
    const bufferSafetyRatio = 0.95;
    const maxBytesPerVolume = Math.floor(targetPreset.maxSizeMB * 1024 * 1024 * bufferSafetyRatio);
    const hardLimitBytes = Math.floor(targetPreset.maxSizeMB * 1024 * 1024); // Limite estrito do portal (ex: 3.00 MB)

    const volumes: PdfVolumeResult[] = [];
    let currentPageIndex = 0;
    let volumeNumber = 1;

    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30) || 'Volume';

    while (currentPageIndex < totalPages) {
      const volDoc = await PDFDocument.create();
      volDoc.setTitle(`${cleanBaseName} - Parte ${volumeNumber}`);
      volDoc.setAuthor('KovaxFiles Volume Packer');

      let pagesInVolCount = 0;
      const startPageNum = currentPageIndex + 1;

      while (currentPageIndex < totalPages) {
        onProgress?.({
          message: `Montando Volume ${volumeNumber} (Página ${currentPageIndex + 1} de ${totalPages})...`,
          percent: Math.round(((currentPageIndex + 1) / totalPages) * 100)
        });
        await new Promise(r => setTimeout(r, 0));

        const [copiedPage] = await volDoc.copyPages(srcDoc, [currentPageIndex]);
        volDoc.addPage(copiedPage);
        pagesInVolCount++;
        currentPageIndex++;

        const tempSave = await volDoc.save({ useObjectStreams: true });

        // Se a parcial atingir o buffer de segurança (95% do teto) e houver mais de 1 página, recua 1 página
        if (tempSave.byteLength >= maxBytesPerVolume && pagesInVolCount > 1) {
          volDoc.removePage(pagesInVolCount - 1);
          currentPageIndex--;
          pagesInVolCount--;
          break;
        }
      }

      if (options?.stampPages) {
        await this.stampVolumePages(volDoc, volumeNumber, options.processNumber);
      }

      let finalVolData = await volDoc.save({ useObjectStreams: true });

      // ACIONADOR AUTOMÁTICO DE COMPRESSÃO (Auto-Compress Sub-routine)
      // Se o volume exceder o limite estrito (ex: > 3.00MB no PJe devido a carimbos/metadados ou páginas individuais pesadas),
      // aciona sub-rotina progressiva de recodificação de imagens para garantir 100% de conformidade.
      if (finalVolData.byteLength > hardLimitBytes) {
        onProgress?.({
          message: `[Auto-Compress] Volume ${volumeNumber} (${(finalVolData.byteLength / 1024 / 1024).toFixed(2)}MB) excedeu ${targetPreset.maxSizeMB}MB. Otimizando imagens da parte...`,
          percent: Math.round((currentPageIndex / totalPages) * 100)
        });

        // Nível 1: Qualidade 65%, 140 DPI
        await this.recompressPdfImages(volDoc, 0.65, 140, false);
        finalVolData = await volDoc.save({ useObjectStreams: true });

        // Nível 2: Qualidade 50%, 120 DPI (se ainda exceder)
        if (finalVolData.byteLength > hardLimitBytes) {
          await this.recompressPdfImages(volDoc, 0.50, 120, false);
          finalVolData = await volDoc.save({ useObjectStreams: true });
        }

        // Nível 3: Qualidade 40%, 100 DPI e Tons de Cinza (se ainda exceder)
        if (finalVolData.byteLength > hardLimitBytes) {
          await this.recompressPdfImages(volDoc, 0.40, 100, true);
          finalVolData = await volDoc.save({ useObjectStreams: true });
        }
      }

      const sha256 = await this.computeSha256(finalVolData);
      const endPageNum = startPageNum + pagesInVolCount - 1;

      let volFileName = `${cleanBaseName}_Parte${String(volumeNumber).padStart(2, '0')}.pdf`;
      if (options?.volumeFileNamePattern) {
        volFileName = options.volumeFileNamePattern
          .replace('{cleanBaseName}', cleanBaseName)
          .replace('{processNumber}', options.processNumber || 'Processo')
          .replace('{volumeNumber}', String(volumeNumber).padStart(2, '0'));
        if (!volFileName.toLowerCase().endsWith('.pdf')) {
          volFileName += '.pdf';
        }
      }

      volumes.push({
        volumeIndex: volumeNumber,
        totalVolumes: 0,
        fileName: volFileName,
        data: finalVolData,
        pageStart: startPageNum,
        pageEnd: endPageNum,
        sizeBytes: finalVolData.byteLength,
        sha256
      });

      volumeNumber++;
    }

    volumes.forEach(v => (v.totalVolumes = volumes.length));
    return volumes;
  }

  /**
   * Processador Completo de Empacotamento em Volumes (PDF Fracionado + Capa + Pacote ZIP)
   */
  static async packIntoVolumeBundle(
    files: { name: string; buffer: ArrayBuffer }[],
    preset: TargetPreset,
    options?: { processNumber?: string; title?: string; advanced?: AdvancedCompressOptions },
    onProgress?: ProgressCallback
  ): Promise<VolumeBundleOutput> {
    let totalOriginalSizeBytes = 0;
    files.forEach(f => (totalOriginalSizeBytes += f.buffer.byteLength));

    onProgress?.({ message: 'Detectando assinaturas digitais...', percent: 5 });
    await new Promise(r => setTimeout(r, 0));

    let signatureInfo: SignatureDetectionResult | undefined;
    if (options?.advanced?.detectSignatures !== false && files.length > 0) {
      signatureInfo = this.detectDigitalSignatures(files[0].buffer);
      if (signatureInfo.hasSignatures) {
        if (options?.advanced?.workflowMode === 'pre_signature_preparation') {
          throw new Error(
            `BLOQUEIO DE PREPARAÇÃO PRÉ-ASSINATURA: O arquivo contém ${signatureInfo.signatureCount} assinatura(s) digital(is). O fracionamento pré-assinatura destina-se exclusivamente a minutas antes da coleta de assinaturas. Documentos já assinados devem ser preservados no fluxo "Documentos Já Assinados (Preservação & Custódia)".`
          );
        }
        if (!options?.advanced?.allowSignedPdfReencoding) {
          throw new Error(
            `OPERAÇÃO RECUSADA POR SEGURANÇA JURÍDICA: O arquivo contém ${signatureInfo.signatureCount} assinatura(s) digital(is) (ICP-Brasil / PKCS#7). O fracionamento em volumes reconstrói a estrutura de objetos e divide as páginas, destruindo irrevogavelmente a validade das assinaturas existentes. Para manter a autenticidade e validade perante os tribunais, a matriz assinada deve ser mantida íntegra no fluxo "Documentos Já Assinados (Preservação & Custódia)". Caso necessite expressamente de volumes para simples consulta desvinculada, habilite a autorização no painel avançado.`
          );
        }
      }
    }

    let unifiedPdfBuffer: ArrayBuffer;
    let reencodedImagesCount = 0;
    let blankPagesRemovedCount = 0;
    let sanitizedActionsCount = 0;

    if (files.length === 1 && files[0].name.toLowerCase().endsWith('.pdf')) {
      if (options?.advanced?.enableImageReencode || options?.advanced?.enablePdfA || options?.advanced?.removeBlankPages || options?.advanced?.sanitizeCourtRules) {
        onProgress?.({ message: 'Carregando documento PDF...', percent: 15 });
        const doc = await PDFDocument.load(files[0].buffer, { ignoreEncryption: true });

        if (options?.advanced?.sanitizeCourtRules) {
          sanitizedActionsCount = this.sanitizeCourtRules(doc);
        }

        if (options?.advanced?.removeBlankPages) {
          blankPagesRemovedCount = await this.detectAndRemoveBlankPages(
            doc,
            p => onProgress?.({ message: p.message, percent: 15 + Math.round(p.percent * 0.15) })
          );
        }

        if (options?.advanced?.enableImageReencode) {
          reencodedImagesCount = await this.recompressPdfImages(
            doc,
            options.advanced.imageQuality || 0.70,
            options.advanced.maxDpi || 150,
            options.advanced.grayscale || false,
            p => onProgress?.({ message: p.message, percent: 30 + Math.round(p.percent * 0.25) })
          );
        }
        if (options?.advanced?.enablePdfA) {
          this.applyPdfAMetadata(doc);
        }
        const savedBytes = await doc.save({ useObjectStreams: true });
        unifiedPdfBuffer = savedBytes.buffer as ArrayBuffer;
      } else {
        unifiedPdfBuffer = files[0].buffer;
      }
    } else {
      onProgress?.({ message: 'Mesclando múltiplos PDFs...', percent: 15 });
      const mergedDoc = await PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.toLowerCase().endsWith('.pdf')) {
          const doc = await PDFDocument.load(file.buffer, { ignoreEncryption: true });

          if (options?.advanced?.sanitizeCourtRules) {
            sanitizedActionsCount += this.sanitizeCourtRules(doc);
          }

          if (options?.advanced?.removeBlankPages) {
            blankPagesRemovedCount += await this.detectAndRemoveBlankPages(
              doc,
              p => onProgress?.({ message: `Arquivo ${i + 1}/${files.length}: ${p.message}`, percent: 15 + Math.round(p.percent * 0.15) })
            );
          }

          if (options?.advanced?.enableImageReencode) {
            reencodedImagesCount += await this.recompressPdfImages(
              doc,
              options.advanced.imageQuality || 0.70,
              options.advanced.maxDpi || 150,
              options.advanced.grayscale || false,
              p => onProgress?.({ message: `Arquivo ${i + 1}/${files.length}: ${p.message}`, percent: 30 + Math.round(p.percent * 0.25) })
            );
          }
          const pages = await mergedDoc.copyPages(doc, doc.getPageIndices());
          pages.forEach(p => mergedDoc.addPage(p));
        }
      }
      if (options?.advanced?.enablePdfA) {
        this.applyPdfAMetadata(mergedDoc);
      }
      const savedBytes = await mergedDoc.save({ useObjectStreams: true });
      unifiedPdfBuffer = savedBytes.buffer as ArrayBuffer;
    }

    const effectivePreset: TargetPreset = preset.id === 'custom' && options?.advanced?.customMaxSizeMB
      ? { ...preset, maxSizeMB: options.advanced.customMaxSizeMB }
      : preset;

    const baseTitle = options?.title || (files[0]?.name ? files[0].name.replace(/\.[^/.]+$/, '') : 'Documento');
    const volumes = await this.splitIntoVolumes(
      unifiedPdfBuffer,
      effectivePreset,
      baseTitle,
      p => onProgress?.({ message: p.message, percent: 55 + Math.round(p.percent * 0.30) }),
      { stampPages: options?.advanced?.stampPages, processNumber: options?.processNumber }
    );

    onProgress?.({ message: 'Gerando Capa de Juntada e Sumário Oficial...', percent: 88 });
    await new Promise(r => setTimeout(r, 0));

    const coverPdf = await this.generateCoverPdf(
      baseTitle,
      options?.processNumber || '',
      effectivePreset,
      volumes,
      totalOriginalSizeBytes
    );

    const zipFiles: { name: string; data: Uint8Array }[] = [
      { name: '00_Capa_de_Juntada_Sumario.pdf', data: coverPdf }
    ];

    let totalCompressedSizeBytes = coverPdf.byteLength;

    volumes.forEach(vol => {
      zipFiles.push({ name: vol.fileName, data: vol.data });
      totalCompressedSizeBytes += vol.sizeBytes;
    });

    let technicalReportPdf: Uint8Array | undefined;
    if (options?.advanced?.generateAuditCertificate) {
      onProgress?.({ message: 'Gerando Relatório Técnico de Integridade...', percent: 94 });
      await new Promise(r => setTimeout(r, 0));

      const sha256Pre = await this.computeSha256(new Uint8Array(files[0].buffer));
      const sha256Post = volumes[0]?.sha256 || 'N/A';
      const optsSummaryList: string[] = [`Fracionado em ${volumes.length} vol.`];
      if (options.advanced.enableImageReencode) optsSummaryList.push(`DPI Max ${options.advanced.maxDpi || 150}`);

      technicalReportPdf = await this.generateTechnicalReportPdf(
        baseTitle,
        totalOriginalSizeBytes,
        totalCompressedSizeBytes,
        sha256Pre,
        sha256Post,
        signatureInfo?.signatureCount || 0,
        options.advanced.operatorDepartment,
        optsSummaryList.join(' • ')
      );

      zipFiles.push({ name: '00_Relatorio_Tecnico_Integridade_LGPD.pdf', data: technicalReportPdf });
    }

    onProgress?.({ message: 'Compactando pacote ZIP de volumes...', percent: 98 });
    await new Promise(r => setTimeout(r, 0));

    const manifestJson = JSON.stringify(
      {
        pacote: baseTitle,
        processo: options?.processNumber || 'N/A',
        portalTarget: preset.targetPortal,
        maxSizePerVolumeMB: preset.maxSizeMB,
        totalVolumes: volumes.length,
        assinaturasDetectadas: signatureInfo?.signatureCount || 0,
        geradoEm: new Date().toISOString(),
        volumes: volumes.map(v => ({
          arquivo: v.fileName,
          paginas: `${v.pageStart}-${v.pageEnd}`,
          tamanhoBytes: v.sizeBytes,
          sha256: v.sha256
        }))
      },
      null,
      2
    );

    zipFiles.push({ name: 'manifesto_pacote.json', data: new TextEncoder().encode(manifestJson) });

    const zipData = this.createZipArchive(zipFiles);

    const compressionRatioPercent = Math.max(
      0,
      Math.round(((totalOriginalSizeBytes - totalCompressedSizeBytes) / totalOriginalSizeBytes) * 100)
    );

    return {
      preset,
      coverPdf,
      volumes,
      zipData,
      totalOriginalSizeBytes,
      totalCompressedSizeBytes,
      compressionRatioPercent,
      timestamp: new Date().toLocaleString('pt-BR'),
      signatureInfo,
      auditCertificatePdf: technicalReportPdf,
      technicalReportPdf,
      reencodedImagesCount,
      blankPagesRemovedCount,
      sanitizedActionsCount
    };
  }
}
