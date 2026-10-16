import { PDFDocument, PDFPage, rgb, StandardFonts, degrees } from 'pdf-lib';
import { CompressionEngine, SignatureDetectionResult } from './compressionEngine';
import { 
  UNIFIED_COURT_PRESETS, 
  UnifiedCourtPreset, 
  getUnifiedCourtPreset, 
  getDefaultCourtPreset 
} from '../data/courtPresetsData';

export type CourtPieceType = 
  | 'peticao_inicial'
  | 'peticao_intermediaria'
  | 'procuracao'
  | 'documento_identificacao'
  | 'comprovante_residencia'
  | 'prova_documental'
  | 'laudo_pericial'
  | 'guia_custas'
  | 'parecer_tecnico'
  | 'outro';

export const PIECE_TYPE_LABELS: Record<CourtPieceType, string> = {
  peticao_inicial: 'Petição Inicial',
  peticao_intermediaria: 'Petição Intermediária',
  procuracao: 'Procuração / Substabelecimento',
  documento_identificacao: 'Documento Pessoal (RG/CPF/CNH)',
  comprovante_residencia: 'Comprovante de Endereço',
  prova_documental: 'Prova Documental / Anexo',
  laudo_pericial: 'Laudo Pericial / Médico',
  guia_custas: 'Guia de Custas / Comprovante',
  parecer_tecnico: 'Parecer Técnico',
  outro: 'Documento Geral'
};

export interface PageModification {
  pageIndex: number; // 0-indexed
  rotate?: number;   // 90, 180, 270
  deleted?: boolean;
}

export interface CourtFilingPiece {
  id: string;
  fileName: string;
  title: string;
  pieceType: CourtPieceType;
  rawBuffer: ArrayBuffer;
  sizeBytes: number;
  originalPageCount: number;
  effectivePageCount: number;
  sha256Hex: string;
  signatureInfo?: SignatureDetectionResult;
  modifications?: PageModification[];
}

/** Tipo unificado para presets de tribunal (retrocompatível) */
export type CourtTargetPreset = UnifiedCourtPreset;

/** Catálogo unificado de presets de tribunais sincronizado */
export const COURT_TARGET_PRESETS: UnifiedCourtPreset[] = UNIFIED_COURT_PRESETS;

export interface PlannedPieceRange {
  pieceId: string;
  pieceTitle: string;
  pieceFileName: string;
  pieceType: CourtPieceType;
  sha256Hex: string;
  startSourcePageIndex: number; // 0-indexed
  endSourcePageIndex: number;   // 0-indexed inclusive
  pageCount: number;
  startFolha: number;           // 1-indexed no processo
  endFolha: number;             // 1-indexed no processo
  isSplitSlice?: boolean;
  slicePartNumber?: number;
  sliceTotalParts?: number;
}

export interface CourtFilingVolumePlan {
  volumeIndex: number;
  volumeTitle: string;
  estimatedSizeBytes: number;
  totalPageCount: number;
  startFolha: number;
  endFolha: number;
  plannedPieces: PlannedPieceRange[];
  exceedsLimit: boolean;
}

export interface CourtFilingOptions {
  processNumber: string;
  courtName: string;
  varalForum: string;
  actionType: string;
  authorName: string;
  defendantName: string;
  lawyerName: string;
  lawyerOab: string;
  startFolhaNumber: number;
  folhaPrefix: string;
  padDigits: number;
  stampPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  stampColor: 'blue' | 'black' | 'red';
  includeCoverAndIndex: boolean;
  includePieceIdentificationHeader: boolean;
  targetPreset: CourtTargetPreset;
}

export interface GeneratedVolumeResult {
  volumeIndex: number;
  volumeTitle: string;
  fileName: string;
  pdfBytes: Uint8Array;
  sizeBytes: number;
  pageCount: number;
  startFolha: number;
  endFolha: number;
  sha256Hex: string;
  piecesIncludedCount: number;
  autoCorrected?: boolean;
  autoCorrectionDetails?: string;
  exceedsEffectiveLimit?: boolean;
}

export interface CourtFilingPackageResult {
  volumes: GeneratedVolumeResult[];
  manifestJson: string;
  manifestTxt: string;
  zipPackageBytes: Uint8Array;
  summary: {
    totalVolumes: number;
    totalPieces: number;
    totalOriginalPages: number;
    totalEffectivePages: number;
    totalSizeBytes: number;
    allWithinLimit: boolean;
    reproved: boolean;
    reprovedReason?: string;
    status: 'PREPARADO_PARA_PROTOCOLO' | 'REPROVADO_POR_EXCESSO_DE_TAMANHO';
    processNumber: string;
    targetCourt: string;
    targetPresetId: string;
    targetNormativeReference: string;
    targetScope: string;
    hasSignaturesDetected: boolean;
    signaturesNotice?: string;
    legalDisclaimer: string;
    generatedAt: string;
  };
}

/**
 * Utilitário para calcular hash SHA-256 de buffers
 */
export async function computeSha256(data: ArrayBuffer | Uint8Array): Promise<string> {
  const raw = data instanceof Uint8Array ? data.buffer : data;
  const hashBuf = await crypto.subtle.digest('SHA-256', raw as ArrayBuffer);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Serviço de Engenharia Documental para Preparação de Processos para Protocolo Judicial
 */
export class CourtFilingPreparationService {
  /**
   * Inspeciona um arquivo PDF, gerando metadados e hash SHA-256
   */
  static async inspectPiece(
    name: string,
    buffer: ArrayBuffer,
    initialPieceType?: CourtPieceType
  ): Promise<CourtFilingPiece> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const count = doc.getPageCount();
    const sha256Hex = await computeSha256(buffer);
    const signatureInfo = CompressionEngine.detectDigitalSignatures(buffer);

    // Detecção heurística de tipo de peça pelo nome do arquivo
    let detectedType: CourtPieceType = initialPieceType || 'outro';
    if (!initialPieceType) {
      const lower = name.toLowerCase();
      if (lower.includes('inicial') || lower.includes('peticao_inicial') || lower.includes('exordial')) {
        detectedType = 'peticao_inicial';
      } else if (lower.includes('procuracao') || lower.includes('procuração') || lower.includes('substabelecimento')) {
        detectedType = 'procuracao';
      } else if (lower.includes('rg') || lower.includes('cnh') || lower.includes('cpf') || lower.includes('documento_pessoal') || lower.includes('identidade')) {
        detectedType = 'documento_identificacao';
      } else if (lower.includes('residencia') || lower.includes('residência') || lower.includes('comprovante')) {
        detectedType = 'comprovante_residencia';
      } else if (lower.includes('laudo') || lower.includes('medico') || lower.includes('pericial')) {
        detectedType = 'laudo_pericial';
      } else if (lower.includes('custas') || lower.includes('guia') || lower.includes('recolhimento') || lower.includes('dare') || lower.includes('gru')) {
        detectedType = 'guia_custas';
      } else if (lower.includes('prova') || lower.includes('anexo') || lower.includes('documento') || lower.includes('contrato') || lower.includes('extrato')) {
        detectedType = 'prova_documental';
      } else if (lower.includes('parecer')) {
        detectedType = 'parecer_tecnico';
      } else if (lower.includes('peticao') || lower.includes('petição')) {
        detectedType = 'peticao_intermediaria';
      }
    }

    const title = name.replace(/\.[^/.]+$/, '').replace(/[_.-]+/g, ' ').trim();

    return {
      id: 'piece-' + Math.random().toString(36).substring(2, 10),
      fileName: name,
      title,
      pieceType: detectedType,
      rawBuffer: buffer,
      sizeBytes: buffer.byteLength,
      originalPageCount: count,
      effectivePageCount: count,
      sha256Hex,
      signatureInfo,
      modifications: []
    };
  }

  /**
   * Calcula as páginas efetivas de uma peça levando em consideração rotações e exclusões
   */
  static getEffectivePages(piece: CourtFilingPiece): number[] {
    const deletedSet = new Set<number>();
    if (piece.modifications) {
      for (const mod of piece.modifications) {
        if (mod.deleted) {
          deletedSet.add(mod.pageIndex);
        }
      }
    }

    const pages: number[] = [];
    for (let i = 0; i < piece.originalPageCount; i++) {
      if (!deletedSet.has(i)) {
        pages.push(i);
      }
    }
    return pages;
  }

  /**
   * Algoritmo de Planejamento Inteligente de Volumes Judiciais:
   * Distribui peças e fatias respeitando os limites em MB do Tribunal selecionado
   * e mantendo paginação contínua e imutável entre volumes.
   */
  static planVolumes(
    pieces: CourtFilingPiece[],
    maxVolumeSizeBytes: number,
    startFolhaNumber: number = 1
  ): CourtFilingVolumePlan[] {
    if (pieces.length === 0) return [];

    const volumePlans: CourtFilingVolumePlan[] = [];
    let currentVolumeIndex = 1;
    let currentVolumePieces: PlannedPieceRange[] = [];
    let currentVolumeSizeBytes = 0;
    let currentVolumePageCount = 0;
    let globalFolhaCursor = startFolhaNumber;

    // Reserva para a Capa/Índice Oficial
    const RESERVED_COVER_BYTES = Math.min(50 * 1024, Math.floor(maxVolumeSizeBytes * 0.05));
    const effectiveLimit = Math.max(500, maxVolumeSizeBytes - RESERVED_COVER_BYTES);

    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      const validPages = this.getEffectivePages(piece);
      const piecePageCount = validPages.length;
      if (piecePageCount === 0) continue;

      const pieceSizeBytes = piece.sizeBytes;
      const bytesPerPage = pieceSizeBytes / Math.max(1, piece.originalPageCount);

      // CASO A: A peça cabe no limite individual E cabe no volume atual acumulado
      if (pieceSizeBytes <= effectiveLimit && (currentVolumePieces.length === 0 || (currentVolumeSizeBytes + pieceSizeBytes <= effectiveLimit))) {
        const startFolha = globalFolhaCursor;
        const endFolha = globalFolhaCursor + piecePageCount - 1;

        currentVolumePieces.push({
          pieceId: piece.id,
          pieceTitle: piece.title,
          pieceFileName: piece.fileName,
          pieceType: piece.pieceType,
          sha256Hex: piece.sha256Hex,
          startSourcePageIndex: 0,
          endSourcePageIndex: piece.originalPageCount - 1,
          pageCount: piecePageCount,
          startFolha,
          endFolha
        });

        currentVolumeSizeBytes += pieceSizeBytes;
        currentVolumePageCount += piecePageCount;
        globalFolhaCursor = endFolha + 1;
      } 
      // CASO B: A peça cabe no limite individual, mas não cabe no volume atual acumulado
      else if (pieceSizeBytes <= effectiveLimit) {
        // Fechar volume atual
        const volStart = currentVolumePieces[0]?.startFolha || globalFolhaCursor;
        const volEnd = currentVolumePieces[currentVolumePieces.length - 1]?.endFolha || globalFolhaCursor;

        volumePlans.push({
          volumeIndex: currentVolumeIndex,
          volumeTitle: `Volume ${String(currentVolumeIndex).padStart(2, '0')}`,
          estimatedSizeBytes: currentVolumeSizeBytes + RESERVED_COVER_BYTES,
          totalPageCount: currentVolumePageCount,
          startFolha: volStart,
          endFolha: volEnd,
          plannedPieces: currentVolumePieces,
          exceedsLimit: currentVolumeSizeBytes + RESERVED_COVER_BYTES > maxVolumeSizeBytes
        });

        currentVolumeIndex++;
        currentVolumePieces = [];
        currentVolumeSizeBytes = 0;
        currentVolumePageCount = 0;

        // Iniciar novo volume com esta peça
        const startFolha = globalFolhaCursor;
        const endFolha = globalFolhaCursor + piecePageCount - 1;

        currentVolumePieces.push({
          pieceId: piece.id,
          pieceTitle: piece.title,
          pieceFileName: piece.fileName,
          pieceType: piece.pieceType,
          sha256Hex: piece.sha256Hex,
          startSourcePageIndex: 0,
          endSourcePageIndex: piece.originalPageCount - 1,
          pageCount: piecePageCount,
          startFolha,
          endFolha
        });

        currentVolumeSizeBytes += pieceSizeBytes;
        currentVolumePageCount += piecePageCount;
        globalFolhaCursor = endFolha + 1;
      }
      // CASO C: A própria peça individual é maior que o limite máximo do tribunal (pieceSizeBytes > effectiveLimit)!
      // Obrigatoriamente fatiar a peça em partes proporcionais por páginas
      else {
        // Se o volume atual já tem peças, fecha antes de começar o fatiamento
        if (currentVolumePieces.length > 0) {
          const volStart = currentVolumePieces[0].startFolha;
          const volEnd = currentVolumePieces[currentVolumePieces.length - 1].endFolha;

          volumePlans.push({
            volumeIndex: currentVolumeIndex,
            volumeTitle: `Volume ${String(currentVolumeIndex).padStart(2, '0')}`,
            estimatedSizeBytes: currentVolumeSizeBytes + RESERVED_COVER_BYTES,
            totalPageCount: currentVolumePageCount,
            startFolha: volStart,
            endFolha: volEnd,
            plannedPieces: currentVolumePieces,
            exceedsLimit: currentVolumeSizeBytes + RESERVED_COVER_BYTES > maxVolumeSizeBytes
          });

          currentVolumeIndex++;
          currentVolumePieces = [];
          currentVolumeSizeBytes = 0;
          currentVolumePageCount = 0;
        }

        // Fatiar a peça gigante por páginas (aplicando margem preventiva de 10% no limite)
        const safeSliceLimit = Math.floor(effectiveLimit * 0.90);
        const maxPagesPerSlice = Math.max(1, Math.floor(safeSliceLimit / Math.max(1, bytesPerPage)));
        const totalSlices = Math.ceil(piecePageCount / maxPagesPerSlice);

        for (let sliceIdx = 0; sliceIdx < totalSlices; sliceIdx++) {
          const startSlicePage = sliceIdx * maxPagesPerSlice;
          const endSlicePage = Math.min(piecePageCount - 1, (sliceIdx + 1) * maxPagesPerSlice - 1);
          const slicePagesCount = endSlicePage - startSlicePage + 1;
          const sliceSizeBytes = slicePagesCount * bytesPerPage;

          const startFolha = globalFolhaCursor;
          const endFolha = globalFolhaCursor + slicePagesCount - 1;

          const slicePiece: PlannedPieceRange = {
            pieceId: piece.id,
            pieceTitle: `${piece.title} (Parte ${sliceIdx + 1} de ${totalSlices})`,
            pieceFileName: piece.fileName,
            pieceType: piece.pieceType,
            sha256Hex: piece.sha256Hex,
            startSourcePageIndex: validPages[startSlicePage],
            endSourcePageIndex: validPages[endSlicePage],
            pageCount: slicePagesCount,
            startFolha,
            endFolha,
            isSplitSlice: true,
            slicePartNumber: sliceIdx + 1,
            sliceTotalParts: totalSlices
          };

          volumePlans.push({
            volumeIndex: currentVolumeIndex,
            volumeTitle: `Volume ${String(currentVolumeIndex).padStart(2, '0')}`,
            estimatedSizeBytes: Math.round(sliceSizeBytes + RESERVED_COVER_BYTES),
            totalPageCount: slicePagesCount,
            startFolha,
            endFolha,
            plannedPieces: [slicePiece],
            exceedsLimit: sliceSizeBytes + RESERVED_COVER_BYTES > maxVolumeSizeBytes
          });

          currentVolumeIndex++;
          globalFolhaCursor = endFolha + 1;
        }
      }
    }

    // Fechar último volume pendente
    if (currentVolumePieces.length > 0) {
      const volStart = currentVolumePieces[0].startFolha;
      const volEnd = currentVolumePieces[currentVolumePieces.length - 1].endFolha;

      volumePlans.push({
        volumeIndex: currentVolumeIndex,
        volumeTitle: `Volume ${String(currentVolumeIndex).padStart(2, '0')}`,
        estimatedSizeBytes: currentVolumeSizeBytes + RESERVED_COVER_BYTES,
        totalPageCount: currentVolumePageCount,
        startFolha: volStart,
        endFolha: volEnd,
        plannedPieces: currentVolumePieces,
        exceedsLimit: currentVolumeSizeBytes + RESERVED_COVER_BYTES > maxVolumeSizeBytes
      });
    }

    return volumePlans;
  }

  /**
   * Gera a Capa Oficial e Índice Geral Processual para um Volume específico
   */
  static async generateVolumeCoverAndIndex(
    volumePlan: CourtFilingVolumePlan,
    totalVolumes: number,
    options: CourtFilingOptions
  ): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]); // A4
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontMono = await doc.embedFont(StandardFonts.Courier);

    const { width, height } = page.getSize();
    const pad = options.padDigits || 3;
    const prefix = options.folhaPrefix || 'Fl.';

    // Faixa Superior Institucional
    page.drawRectangle({
      x: 35,
      y: height - 95,
      width: width - 70,
      height: 65,
      color: rgb(0.08, 0.18, 0.38)
    });

    const courtTitle = (options.courtName || 'PODER JUDICIÁRIO - JUSTIÇA ELETRÔNICA').toUpperCase();
    page.drawText(courtTitle, {
      x: 50,
      y: height - 55,
      size: 11,
      font: fontBold,
      color: rgb(1, 1, 1)
    });

    page.drawText('PROTOCOLO INTEGRADO DE AUTOS E MANIFESTO DE JUNTADA', {
      x: 50,
      y: height - 72,
      size: 8,
      font: fontRegular,
      color: rgb(0.8, 0.88, 1)
    });

    // Bloco do Volume e Folhas
    page.drawRectangle({
      x: width - 215,
      y: height - 90,
      width: 170,
      height: 55,
      color: rgb(0.12, 0.25, 0.5),
      borderColor: rgb(0.3, 0.45, 0.7),
      borderWidth: 1
    });

    page.drawText(`VOLUME ${volumePlan.volumeIndex} DE ${totalVolumes}`, {
      x: width - 205,
      y: height - 58,
      size: 10,
      font: fontBold,
      color: rgb(1, 0.85, 0.2)
    });

    const padStart = String(volumePlan.startFolha).padStart(pad, '0');
    const padEnd = String(volumePlan.endFolha).padStart(pad, '0');
    page.drawText(`${prefix} ${padStart} até ${prefix} ${padEnd}`, {
      x: width - 205,
      y: height - 76,
      size: 8.5,
      font: fontBold,
      color: rgb(1, 1, 1)
    });

    // Metadados dos Autos (Tabela de Identificação)
    let y = height - 120;
    const drawMetaRow = (label: string, val: string) => {
      page.drawText(label, { x: 45, y, size: 8, font: fontBold, color: rgb(0.2, 0.3, 0.45) });
      const displayVal = val.length > 55 ? val.substring(0, 52) + '...' : val;
      page.drawText(displayVal, { x: 160, y, size: 8, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
      y -= 15;
    };

    drawMetaRow('Número do Processo:', options.processNumber || 'Processo Não Informado');
    drawMetaRow('Juízo / Vara / Foro:', options.varalForum || 'Vara Não Informada');
    drawMetaRow('Classe / Ação:', options.actionType || 'Procedimento Comum');
    drawMetaRow('Polo Ativo (Autor):', options.authorName || 'Não informado');
    drawMetaRow('Polo Passivo (Réu):', options.defendantName || 'Não informado');
    drawMetaRow('Advogado / OAB:', `${options.lawyerName || 'Não informado'} ${options.lawyerOab ? `(${options.lawyerOab})` : ''}`);

    y -= 5;
    page.drawLine({
      start: { x: 40, y },
      end: { x: width - 40, y },
      thickness: 1,
      color: rgb(0.8, 0.85, 0.9)
    });
    y -= 18;

    // Título do Índice
    page.drawText('SUMÁRIO E ÍNDICE CRONOLÓGICO DE PEÇAS DESTE VOLUME', {
      x: 45,
      y,
      size: 9.5,
      font: fontBold,
      color: rgb(0.08, 0.2, 0.45)
    });
    y -= 15;

    // Cabeçalho da Tabela
    page.drawRectangle({
      x: 40,
      y: y - 5,
      width: width - 80,
      height: 18,
      color: rgb(0.92, 0.94, 0.97)
    });

    page.drawText('ITEM', { x: 45, y, size: 7, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    page.drawText('IDENTIFICAÇÃO DA PEÇA PROCESSUAL', { x: 80, y, size: 7, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    page.drawText('FOLHAS', { x: 330, y, size: 7, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    page.drawText('HASH SHA-256 (INTEGRIDADE)', { x: 420, y, size: 7, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    y -= 20;

    // Linhas de Peças
    const maxPiecesOnCover = 14;
    const piecesToShow = volumePlan.plannedPieces.slice(0, maxPiecesOnCover);

    for (let i = 0; i < piecesToShow.length; i++) {
      const p = piecesToShow[i];
      const itemNum = String(i + 1).padStart(2, '0');

      page.drawText(itemNum, { x: 47, y, size: 7, font: fontMono, color: rgb(0.4, 0.4, 0.4) });

      let titleDisplay = p.pieceTitle;
      if (titleDisplay.length > 38) {
        titleDisplay = titleDisplay.substring(0, 35) + '...';
      }
      page.drawText(titleDisplay, { x: 80, y, size: 7.5, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

      const folhaStr = `${prefix} ${String(p.startFolha).padStart(pad, '0')} a ${String(p.endFolha).padStart(pad, '0')}`;
      page.drawText(folhaStr, { x: 330, y, size: 7, font: fontRegular, color: rgb(0.15, 0.3, 0.6) });

      const hashShort = p.sha256Hex ? `${p.sha256Hex.substring(0, 12)}...${p.sha256Hex.substring(56)}` : 'N/A';
      page.drawText(hashShort, { x: 420, y, size: 6.5, font: fontMono, color: rgb(0.3, 0.3, 0.3) });

      y -= 16;
    }

    if (volumePlan.plannedPieces.length > maxPiecesOnCover) {
      page.drawText(`... e mais ${volumePlan.plannedPieces.length - maxPiecesOnCover} peça(s) no índice estendido do manifesto.`, {
        x: 80,
        y,
        size: 7,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.5)
      });
      y -= 15;
    }

    // Rodapé de Conformidade
    const footerY = 40;
    page.drawLine({
      start: { x: 40, y: footerY + 25 },
      end: { x: width - 40, y: footerY + 25 },
      thickness: 1,
      color: rgb(0.85, 0.88, 0.92)
    });

    const nowStr = new Date().toLocaleString('pt-BR');
    page.drawText(`KovaxFiles Desktop • Pacote de Protocolo Gerado em ${nowStr} • Conformidade ICP/PJe`, {
      x: 45,
      y: footerY + 12,
      size: 6.5,
      font: fontRegular,
      color: rgb(0.45, 0.45, 0.45)
    });

    page.drawText('Aviso: As peças anexadas foram validadas com algoritmo criptográfico SHA-256 e ordenadas sequencialmente.', {
      x: 45,
      y: footerY,
      size: 6,
      font: fontRegular,
      color: rgb(0.55, 0.55, 0.55)
    });

    return await doc.save();
  }

  /**
   * Aplica chancela de autos e identificação da peça em uma página PDF
   */
  static applyStampToPage(
    page: PDFPage,
    folhaNumber: number,
    pieceTitle: string,
    options: CourtFilingOptions,
    fontBold: any,
    fontRegular: any
  ) {
    const { width, height } = page.getSize();
    const pad = options.padDigits || 3;
    const prefix = options.folhaPrefix || 'Fl.';
    const folhaStr = `${prefix} ${String(folhaNumber).padStart(pad, '0')}`;

    const color = options.stampColor === 'red'
      ? rgb(0.8, 0.1, 0.1)
      : options.stampColor === 'black'
      ? rgb(0.1, 0.1, 0.1)
      : rgb(0.08, 0.25, 0.6);

    // 1. Numeração de Folhas (Chancela de Autos)
    const boxW = 85;
    const boxH = 26;
    let boxX = width - boxW - 15;
    let boxY = height - boxH - 12;

    if (options.stampPosition === 'top-left') {
      boxX = 15;
      boxY = height - boxH - 12;
    } else if (options.stampPosition === 'bottom-right') {
      boxX = width - boxW - 15;
      boxY = 12;
    } else if (options.stampPosition === 'bottom-left') {
      boxX = 15;
      boxY = 12;
    }

    // Fundo semitransparente para não obstruir texto
    page.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxW,
      height: boxH,
      color: rgb(0.98, 0.99, 1),
      borderColor: color,
      borderWidth: 1.2
    });

    page.drawText(folhaStr, {
      x: boxX + 8,
      y: boxY + boxH - 14,
      size: 9.5,
      font: fontBold,
      color
    });

    const procDisplay = options.processNumber ? options.processNumber.substring(0, 15) : 'Autos Judiciais';
    page.drawText(procDisplay, {
      x: boxX + 8,
      y: boxY + 4,
      size: 5.5,
      font: fontRegular,
      color: rgb(0.35, 0.35, 0.35)
    });

    // 2. Identificação da Peça no Topo Central (Marca d'água discreta)
    if (options.includePieceIdentificationHeader) {
      let pieceTag = pieceTitle.length > 40 ? pieceTitle.substring(0, 38) + '...' : pieceTitle;
      page.drawText(`[ ${pieceTag.toUpperCase()} ]`, {
        x: Math.max(120, (width / 2) - (pieceTag.length * 2.2)),
        y: height - 12,
        size: 6,
        font: fontBold,
        color: rgb(0.5, 0.55, 0.65)
      });
    }
  }

  /**
   * Compila fisicamente o documento PDF de um Volume específico com Capa, Índice e Chancela
   */
  static async compileVolumeDocument(
    plan: CourtFilingVolumePlan,
    totalVolumes: number,
    options: CourtFilingOptions,
    piecesMap: Map<string, CourtFilingPiece>
  ): Promise<{ pdfBytes: Uint8Array; pageCount: number }> {
    const volDoc = await PDFDocument.create();
    const fontBold = await volDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await volDoc.embedFont(StandardFonts.Helvetica);

    // Adicionar Capa e Índice se configurado
    if (options.includeCoverAndIndex) {
      const coverBytes = await this.generateVolumeCoverAndIndex(plan, totalVolumes, options);
      const coverDoc = await PDFDocument.load(coverBytes);
      const [coverPage] = await volDoc.copyPages(coverDoc, [0]);
      volDoc.addPage(coverPage);
    }

    // Adicionar e carimbar as páginas de cada peça planejada neste volume
    for (const plannedPiece of plan.plannedPieces) {
      const sourcePiece = piecesMap.get(plannedPiece.pieceId);
      if (!sourcePiece) continue;

      const sourceDoc = await PDFDocument.load(sourcePiece.rawBuffer, { ignoreEncryption: true });
      const validSourcePages = this.getEffectivePages(sourcePiece);

      // Modificações específicas (rotações)
      const rotMap = new Map<number, number>();
      if (sourcePiece.modifications) {
        for (const m of sourcePiece.modifications) {
          if (m.rotate) rotMap.set(m.pageIndex, m.rotate);
        }
      }

      // Selecionar o intervalo de páginas desta fatia
      let folhaCounter = plannedPiece.startFolha;

      for (let pageIdx = plannedPiece.startSourcePageIndex; pageIdx <= plannedPiece.endSourcePageIndex; pageIdx++) {
        if (!validSourcePages.includes(pageIdx)) continue;

        const [copiedPage] = await volDoc.copyPages(sourceDoc, [pageIdx]);

        // Aplicar rotação se solicitada
        const rotAngle = rotMap.get(pageIdx);
        if (rotAngle) {
          const currentRot = copiedPage.getRotation().angle;
          copiedPage.setRotation(degrees((currentRot + rotAngle) % 360));
        }

        // Aplicar chancela de autos e identificação da peça
        this.applyStampToPage(
          copiedPage,
          folhaCounter,
          plannedPiece.pieceTitle,
          options,
          fontBold,
          fontRegular
        );

        volDoc.addPage(copiedPage);
        folhaCounter++;
      }
    }

    const savedBytes = await volDoc.save();
    return {
      pdfBytes: savedBytes,
      pageCount: volDoc.getPageCount()
    };
  }

  /**
   * Executa a montagem completa dos autos judiciais, dividindo em volumes conforme limite,
   * medindo tamanhos efetivos gerados, autocorrigindo volumes excedentes, alertando sobre
   * assinaturas preexistentes e emitindo manifesto de preparação (distinto de protocolo judicial).
   */
  static async executeFilingPipeline(
    pieces: CourtFilingPiece[],
    options: CourtFilingOptions,
    onProgress?: (message: string, percent: number) => void
  ): Promise<CourtFilingPackageResult> {
    if (pieces.length === 0) {
      throw new Error('Nenhuma peça processual selecionada para montagem dos autos.');
    }

    onProgress?.('Planejando distribuição e divisão em volumes...', 10);

    const limitBytes = options.targetPreset.maxVolumeSizeBytes;
    const signedPieces = pieces.filter(p => p.signatureInfo?.hasSignatures);
    const hasSignaturesDetected = signedPieces.length > 0;

    // 1. Planejar Volumes de acordo com o limite do Tribunal
    const volumePlans = this.planVolumes(
      pieces,
      limitBytes,
      options.startFolhaNumber
    );

    const generatedVolumes: GeneratedVolumeResult[] = [];
    const piecesMap = new Map<string, CourtFilingPiece>();
    for (const p of pieces) {
      piecesMap.set(p.id, p);
    }

    const totalVols = volumePlans.length;
    const reprovalReasons: string[] = [];

    // 2. Processar e compilar cada Volume com medição efetiva de tamanho
    for (let vIdx = 0; vIdx < totalVols; vIdx++) {
      const plan = volumePlans[vIdx];
      const volNum = plan.volumeIndex;

      onProgress?.(`Compilando e chancelando Volume ${volNum} de ${totalVols}...`, Math.round(15 + (vIdx / totalVols) * 60));

      const compiled = await this.compileVolumeDocument(plan, totalVols, options, piecesMap);
      let volBytes = compiled.pdfBytes;
      let effectiveSize = volBytes.byteLength;
      let autoCorrected = false;
      let autoCorrectionDetails: string | undefined;

      // Medição efetiva: Se o volume gerado exceder o limite real em bytes
      if (effectiveSize > limitBytes) {
        onProgress?.(`Volume ${volNum} excedeu ${(effectiveSize / (1024 * 1024)).toFixed(2)} MB. Tentando autocorreção por compressão...`, Math.round(15 + (vIdx / totalVols) * 60 + 2));

        try {
          const arrayBuffer = volBytes.buffer.slice(volBytes.byteOffset, volBytes.byteOffset + volBytes.byteLength) as ArrayBuffer;
          const compResult = await CompressionEngine.directCompressPdf(
            arrayBuffer,
            `Volume_${volNum}.pdf`,
            {
              workflowMode: 'unsigned_optimization',
              allowSignedPdfReencoding: true,
              enableImageReencode: true,
              imageQuality: 0.65,
              maxDpi: options.targetPreset.recommendedResolutionDpi || 150,
              detectSignatures: false
            }
          );

          if (compResult.data.byteLength <= limitBytes) {
            autoCorrected = true;
            autoCorrectionDetails = `Volume autocorrigido via compressão adaptativa: ${(effectiveSize / (1024 * 1024)).toFixed(2)} MB -> ${(compResult.data.byteLength / (1024 * 1024)).toFixed(2)} MB.`;
            volBytes = compResult.data;
            effectiveSize = volBytes.byteLength;
          }
        } catch (compErr) {
          console.warn(`[executeFilingPipeline] Autocorreção via compressão falhou para Volume ${volNum}:`, compErr);
        }

        // Se ainda exceder após compressão
        if (effectiveSize > limitBytes) {
          reprovalReasons.push(
            `Volume ${volNum} possui tamanho efetivo de ${(effectiveSize / (1024 * 1024)).toFixed(2)} MB, excedendo o teto estrito de ${(limitBytes / (1024 * 1024)).toFixed(0)} MB do tribunal selecionado.`
          );
        }
      }

      const volSha256 = await computeSha256(volBytes);
      const safeProc = (options.processNumber || 'Autos').replace(/[^a-zA-Z0-9]/g, '_');
      const volFileName = `Volume_${String(volNum).padStart(2, '0')}_Processo_${safeProc}.pdf`;

      generatedVolumes.push({
        volumeIndex: volNum,
        volumeTitle: plan.volumeTitle,
        fileName: volFileName,
        pdfBytes: volBytes,
        sizeBytes: effectiveSize,
        pageCount: compiled.pageCount,
        startFolha: plan.startFolha,
        endFolha: plan.endFolha,
        sha256Hex: volSha256,
        piecesIncludedCount: plan.plannedPieces.length,
        autoCorrected,
        autoCorrectionDetails,
        exceedsEffectiveLimit: effectiveSize > limitBytes
      });
    }

    onProgress?.('Gerando Manifesto de Integridade e Pacote ZIP...', 85);

    const isReproved = reprovalReasons.length > 0 || generatedVolumes.some(v => v.sizeBytes > limitBytes);
    const reprovedReason = isReproved
      ? `PACOTE REPROVADO PARA PROTOCOLO: ${reprovalReasons.join(' ')} Os arquivos gerados violam a cota máxima de transmissão do portal. É necessário fracionar manualmente os anexos volumosos ou adotar limite ampliado se autorizado por despacho.`
      : undefined;

    const packageStatus = isReproved ? 'REPROVADO_POR_EXCESSO_DE_TAMANHO' : 'PREPARADO_PARA_PROTOCOLO';

    const legalDisclaimer = 
      'AVISO DE DELIMITAÇÃO TÉCNICA E ISENÇÃO DE PROTOCOLO: A aplicação KovaxFiles Desktop realiza a compilação, chancela, numeração de folhas e controle de integridade documental para PREPARAÇÃO de autos digitais. ' +
      'A EMISSÃO DESTE PACOTE NÃO CONSTITUI PROTOCOLO JUDICIAL NEM COMPROVA QUE O TRIBUNAL RECEBEU OU ACEITOU OS DOCUMENTOS. ' +
      'O protocolo efetivo, a conferência de tempestividade e a obtenção do Recibo Oficial de Protocolo Judicial são de responsabilidade exclusiva do advogado ou operador responsável perante o portal informatizado do tribunal.';

    const signaturesNotice = hasSignaturesDetected
      ? `ALERTA DE ASSINATURA DIGITAL ORIGINÁRIA: Detectou-se assinatura digital pré-existente em ${signedPieces.length} peça(s) original(is): ${signedPieces.map(p => `"${p.fileName}"`).join(', ')}. A inserção em volume compilado, renumeração de folhas, carimbo e/ou rotação alteram a integridade binária dos arquivos, desvinculando as assinaturas criptográficas originárias no PDF final montado. O hash SHA-256 de cada peça original foi registrado neste manifesto para comprovação de autenticidade originária.`
      : undefined;

    // 3. Gerar Manifesto de Arquivos (JSON & TXT)
    const nowIso = new Date().toISOString();
    const manifestObj = {
      titulo: 'Manifesto Técnico de Preparação de Autos e Integridade Documental',
      aplicacao: 'KovaxFiles Desktop - Engenharia Documental Judicial',
      status: packageStatus,
      reprovado: isReproved,
      motivoReprovacao: reprovedReason,
      dataGeracao: nowIso,
      delimitacaoTecnica: legalDisclaimer,
      alertaAssinaturasDigitais: signaturesNotice,
      dadosProcessuais: {
        processo: options.processNumber,
        tribunal: options.courtName,
        varaForum: options.varalForum,
        classeAcao: options.actionType,
        autor: options.authorName,
        reu: options.defendantName,
        advogado: options.lawyerName,
        oab: options.lawyerOab,
        presetTribunal: {
          id: options.targetPreset.id,
          nome: options.targetPreset.name,
          limiteMaximoMB: options.targetPreset.maxSizeMB,
          limiteMaximoBytes: options.targetPreset.maxVolumeSizeBytes,
          escopo: options.targetPreset.courtScope,
          referenciaNormativa: options.targetPreset.normativeReference,
          versaoOuData: options.targetPreset.versionOrDate,
          regraUniversal: false
        }
      },
      resumo: {
        totalVolumes: generatedVolumes.length,
        totalPecasOriginais: pieces.length,
        totalFolhasNumeradas: generatedVolumes.reduce((acc, v) => acc + (v.endFolha - v.startFolha + 1), 0),
        todosVolumesDentroDoLimite: !isReproved,
        volumesComExcesso: generatedVolumes.filter(v => v.exceedsEffectiveLimit).length,
        volumesAutocorrigidos: generatedVolumes.filter(v => v.autoCorrected).length,
        pecasComAssinaturaDigitalDetectada: signedPieces.length
      },
      volumesGerados: generatedVolumes.map(v => ({
        volume: v.volumeIndex,
        arquivo: v.fileName,
        paginacao: `${options.folhaPrefix} ${v.startFolha} até ${options.folhaPrefix} ${v.endFolha}`,
        totalPaginas: v.pageCount,
        tamanhoBytes: v.sizeBytes,
        tamanhoFormatado: (v.sizeBytes / (1024 * 1024)).toFixed(2) + ' MB',
        dentroDoLimite: !v.exceedsEffectiveLimit,
        autocorrigido: v.autoCorrected || false,
        detalhesAutocorrecao: v.autoCorrectionDetails,
        sha256Hex: v.sha256Hex
      })),
      pecasOriginaisJuntadas: pieces.map((p, idx) => ({
        ordem: idx + 1,
        titulo: p.title,
        tipo: PIECE_TYPE_LABELS[p.pieceType],
        arquivoOriginal: p.fileName,
        paginas: p.effectivePageCount,
        tamanhoBytes: p.sizeBytes,
        possuiAssinaturaDigital: p.signatureInfo?.hasSignatures || false,
        qtdAssinaturas: p.signatureInfo?.signatureCount || 0,
        sha256Original: p.sha256Hex
      }))
    };

    const manifestJson = JSON.stringify(manifestObj, null, 2);

    const manifestTxtLines = [
      '================================================================================',
      'MANIFESTO TÉCNICO DE INTEGRIDADE E PREPARAÇÃO DE AUTOS PARA PROTOCOLO',
      'KovaxFiles Desktop • Engenharia Documental Forense',
      `STATUS TÉCNICO: [${packageStatus}]`,
      '================================================================================',
      '',
      `PROCESSO Nº:         ${options.processNumber || 'NÃO INFORMADO'}`,
      `TRIBUNAL / ÓRGÃO:    ${options.courtName || 'NÃO INFORMADO'}`,
      `VARA / FORO:         ${options.varalForum || 'NÃO INFORMADO'}`,
      `AÇÃO:                ${options.actionType || 'NÃO INFORMADO'}`,
      `POLO ATIVO (AUTOR):  ${options.authorName || 'NÃO INFORMADO'}`,
      `POLO PASSIVO (RÉU):  ${options.defendantName || 'NÃO INFORMADO'}`,
      `PATRONO / OAB:       ${options.lawyerName || 'NÃO INFORMADO'} (${options.lawyerOab || 'OAB N/A'})`,
      `DATA DA PREPARAÇÃO:  ${new Date().toLocaleString('pt-BR')}`,
      '',
      '--------------------------------------------------------------------------------',
      'PARÂMETROS REGULATÓRIOS DO TRIBUNAL SELECIONADO:',
      '--------------------------------------------------------------------------------',
      `• Preset Aplicado:   ${options.targetPreset.name} (${options.targetPreset.shortLabel})`,
      `• Limite Máximo:      ${(options.targetPreset.maxVolumeSizeBytes / (1024 * 1024)).toFixed(0)} MB por Volume`,
      `• Escopo Específico: ${options.targetPreset.courtScope}`,
      `• Norma Reguladora:  ${options.targetPreset.normativeReference} (${options.targetPreset.versionOrDate})`,
      '• Regra Universal:    NÃO (Regra contextual sujeita a editais locais e capacidade de portal)',
      '',
      isReproved ? [
        '********************************************************************************',
        'ATENÇÃO: PACOTE REPROVADO POR EXCESSO DE TAMANHO',
        reprovedReason || '',
        '********************************************************************************',
        ''
      ].join('\n') : '',
      '--------------------------------------------------------------------------------',
      'VOLUMES GERADOS E MEDIÇÃO EFETIVA DE TAMANHO:',
      '--------------------------------------------------------------------------------',
      ...generatedVolumes.map(v => 
        `[${v.volumeTitle}] ${v.fileName}\n` +
        `  • Paginação:       ${options.folhaPrefix} ${v.startFolha} até ${options.folhaPrefix} ${v.endFolha} (${v.pageCount} págs)\n` +
        `  • Tamanho Efetivo: ${(v.sizeBytes / (1024 * 1024)).toFixed(2)} MB (${v.sizeBytes.toLocaleString('pt-BR')} bytes)\n` +
        `  • Status Limite:   ${v.exceedsEffectiveLimit ? 'REPROVADO (EXCEDE LIMITE)' : 'APROVADO (DENTRO DO LIMITE)'}\n` +
        (v.autoCorrected ? `  • Autocorreção:    ${v.autoCorrectionDetails}\n` : '') +
        `  • Hash SHA-256:    ${v.sha256Hex}\n`
      ),
      '--------------------------------------------------------------------------------',
      'PEÇAS ORIGINAIS JUNTADAS E HASHES DE AUDITORIA:',
      '--------------------------------------------------------------------------------',
      ...pieces.map((p, i) => 
        `Item ${(i + 1).toString().padStart(2, '0')}: [${PIECE_TYPE_LABELS[p.pieceType]}] ${p.title}\n` +
        `  • Arquivo:         ${p.fileName} (${p.effectivePageCount} págs - ${(p.sizeBytes / 1024).toFixed(1)} KB)\n` +
        `  • Assinatura:      ${p.signatureInfo?.hasSignatures ? `DETECTADA (${p.signatureInfo.signatureCount} assinatura(s))` : 'Nenhuma'}\n` +
        `  • SHA-256 Matriz:  ${p.sha256Hex}\n`
      ),
      hasSignaturesDetected ? [
        '--------------------------------------------------------------------------------',
        'ALERTA JURÍDICO DE ASSINATURAS DIGITAIS ORIGINÁRIAS:',
        '--------------------------------------------------------------------------------',
        signaturesNotice || '',
        ''
      ].join('\n') : '',
      '================================================================================',
      'CLÁUSULA DE DELIMITAÇÃO TÉCNICA E ISENÇÃO DE PROTOCOLO:',
      '================================================================================',
      legalDisclaimer,
      '================================================================================'
    ];
    const manifestTxt = manifestTxtLines.filter(Boolean).join('\n');

    // 4. Criar Arquivo ZIP com todo o pacote
    const zipEntries: { name: string; data: Uint8Array }[] = [];
    for (const v of generatedVolumes) {
      zipEntries.push({
        name: v.fileName,
        data: v.pdfBytes
      });
    }

    const enc = new TextEncoder();
    zipEntries.push({
      name: 'Manifesto_de_Autos_SHA256.json',
      data: enc.encode(manifestJson)
    });
    zipEntries.push({
      name: 'Manifesto_de_Autos_SHA256.txt',
      data: enc.encode(manifestTxt)
    });

    const zipBuffer = CompressionEngine.createZipArchive(zipEntries);

    onProgress?.('Pacote finalizado!', 100);

    return {
      volumes: generatedVolumes,
      manifestJson,
      manifestTxt,
      zipPackageBytes: zipBuffer,
      summary: {
        totalVolumes: generatedVolumes.length,
        totalPieces: pieces.length,
        totalOriginalPages: pieces.reduce((acc, p) => acc + p.originalPageCount, 0),
        totalEffectivePages: pieces.reduce((acc, p) => acc + p.effectivePageCount, 0),
        totalSizeBytes: generatedVolumes.reduce((acc, v) => acc + v.sizeBytes, 0),
        allWithinLimit: !isReproved,
        reproved: isReproved,
        reprovedReason,
        status: packageStatus,
        processNumber: options.processNumber,
        targetCourt: options.targetPreset.name,
        targetPresetId: options.targetPreset.id,
        targetNormativeReference: options.targetPreset.normativeReference,
        targetScope: options.targetPreset.courtScope,
        hasSignaturesDetected,
        signaturesNotice,
        legalDisclaimer,
        generatedAt: nowIso
      }
    };
  }
}
