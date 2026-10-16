/**
 * KovaxFiles Desktop — Core Court Filing (Peticionamento Eletrônico) Service
 * Requisitos e limites de tribunais brasileiros (PJe, e-SAJ, Projudi, TRF, STJ, STF),
 * fracionamento documental por tamanho limite e paginação jurídica.
 */

export * from '../../services/courtFilingPreparationService';

import {
  CourtFilingPreparationService,
  CourtFilingPiece,
  CourtFilingOptions,
  CourtFilingPackageResult
} from '../../services/courtFilingPreparationService';
import {
  UnifiedCourtPreset,
  UNIFIED_COURT_PRESETS,
  getUnifiedCourtPreset
} from '../../data/courtPresetsData';
import { CancellationToken, OperationProgress, ProgressCallback, OperationResult, OperationStatus } from '../../shared/contracts/operation.types';
import { ensureKovaxError, ValidationError } from '../../shared/errors/kovaxErrors';

export type CourtSystemConfig = UnifiedCourtPreset;
export type FilingPreparationPlan = CourtFilingPackageResult;

export class CoreCourtFilingService {
  /**
   * Obtém a lista de configurações e presets de tribunais homologados
   */
  static getSupportedCourts(): UnifiedCourtPreset[] {
    return UNIFIED_COURT_PRESETS;
  }

  /**
   * Obtém a configuração de um sistema de tribunal específico
   */
  static getCourtConfig(courtId: string): UnifiedCourtPreset | undefined {
    return getUnifiedCourtPreset(courtId);
  }

  /**
   * Inspeciona um documento PDF para inclusão no fluxo de peticionamento
   */
  static async inspectPiece(
    fileName: string,
    buffer: ArrayBuffer,
    pieceType?: any
  ): Promise<CourtFilingPiece> {
    return CourtFilingPreparationService.inspectPiece(fileName, buffer, pieceType);
  }

  /**
   * Calcula o planejamento prévio de divisão de volumes antes da execução
   */
  static planVolumes(
    pieces: CourtFilingPiece[],
    maxVolumeSizeBytes: number,
    startFolhaNumber: number = 1
  ): any[] {
    return CourtFilingPreparationService.planVolumes(pieces, maxVolumeSizeBytes, startFolhaNumber);
  }

  /**
   * Calcula a contagem efetiva de páginas considerando exclusões de páginas
   */
  static getEffectivePages(piece: CourtFilingPiece): number[] {
    return CourtFilingPreparationService.getEffectivePages(piece);
  }

  /**
   * Prepara e fraciona documentos para peticionamento eletrônico em conformidade com o tribunal.
   * REGRA CRÍTICA P0: Se qualquer volume exceder a cota máxima do tribunal (result.summary.reproved),
   * o serviço JAMAIS pode retornar status 'completed' ou isSuccess: true.
   */
  static async prepareFiling(
    pieces: CourtFilingPiece[],
    options: CourtFilingOptions,
    onProgress?: ProgressCallback,
    cancellationToken?: CancellationToken
  ): Promise<OperationResult<CourtFilingPackageResult>> {
    const startTime = performance.now();
    try {
      if (cancellationToken?.isCancelled) {
        cancellationToken.throwIfCancelled();
      }

      if (!pieces || pieces.length === 0) {
        throw new ValidationError('Nenhuma peça processual fornecida para preparação de protocolo judicial.');
      }

      if (!options || !options.targetPreset) {
        throw new ValidationError('Configurações do tribunal ou preset de destino não fornecidos.');
      }

      onProgress?.({
        stage: 'Iniciando planejamento de peticionamento',
        current: 10,
        total: 100,
        percentage: 10,
        message: 'Validando limites de tamanho do tribunal...'
      });

      const result = await CourtFilingPreparationService.executeFilingPipeline(
        pieces,
        options,
        (message: string, percent: number) => {
          if (cancellationToken?.isCancelled) {
            cancellationToken.throwIfCancelled();
          }
          onProgress?.({
            stage: message,
            current: Math.round(percent),
            total: 100,
            percentage: Math.round(percent),
            message
          });
        }
      );

      if (cancellationToken?.isCancelled) {
        cancellationToken.throwIfCancelled();
      }

      const durationMs = Math.round(performance.now() - startTime);

      // REGRA DE INTEGRIDADE: Se o pacote foi reprovado por excesso de tamanho, NUNCA declarar sucesso!
      const isReproved = result.summary.reproved || result.volumes.some(v => v.exceedsEffectiveLimit);
      if (isReproved) {
        const volumesExceeding = result.volumes.filter(v => v.exceedsEffectiveLimit).length;
        const totalVolumes = result.volumes.length;
        const finalStatus: OperationStatus = (volumesExceeding === totalVolumes) ? 'failed' : 'partial';

        return {
          status: finalStatus,
          isSuccess: false,
          data: result,
          error: new ValidationError(
            result.summary.reprovedReason || 'O pacote de protocolo judicial excede o teto regulamentar de tamanho do tribunal.',
            {
              targetCourt: options.targetPreset.name,
              maxSizeMB: options.targetPreset.maxSizeMB,
              volumesExceeding,
              totalVolumes
            }
          ),
          durationMs
        };
      }

      return {
        status: 'completed',
        isSuccess: true,
        data: result,
        durationMs
      };
    } catch (err) {
      const durationMs = Math.round(performance.now() - startTime);
      const isCancelled = (err as any)?.name === 'OperationCancelledException' || cancellationToken?.isCancelled;

      return {
        status: isCancelled ? 'canceled' : 'failed',
        isSuccess: false,
        error: ensureKovaxError(err, 'DOCUMENT_PROCESSING'),
        durationMs
      };
    }
  }
}
