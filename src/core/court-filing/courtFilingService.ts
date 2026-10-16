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
import { CancellationToken, OperationProgress, ProgressCallback, OperationResult } from '../../shared/contracts/operation.types';
import { ensureKovaxError } from '../../shared/errors/kovaxErrors';

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
   * Prepara e fraciona documentos para peticionamento eletrônico em conformidade com o tribunal
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

      const durationMs = Math.round(performance.now() - startTime);
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
