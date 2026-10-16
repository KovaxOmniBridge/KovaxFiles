/**
 * KovaxFiles Desktop — Core OCR Service
 * Execução e orquestração de reconhecimento óptico de caracteres em PDFs e imagens,
 * com ciclo de vida tipado e cancelamento cooperativo.
 */

import {
  OperationStatus,
  ProgressCallback,
  CancellationToken,
  BatchOperationResult,
  BatchItemResult,
  determineBatchStatus
} from '../../shared/contracts/operation.types';
import { ocrRuntimeAdapter, OcrRecognizeResult } from '../../infrastructure/ocr-runtime/ocrRuntimeAdapter';
import { ValidationError } from '../../shared/errors/kovaxErrors';

export interface OcrJobInput {
  id: string;
  name: string;
  source: string | HTMLCanvasElement | Uint8Array;
  language?: string;
}

export interface OcrJobOutput {
  id: string;
  name: string;
  text: string;
  confidence: number;
}

export class CoreOcrService {
  /**
   * Processa uma única imagem/página de documento
   */
  static async processOcrJob(
    input: OcrJobInput,
    onProgress?: ProgressCallback,
    cancellationToken?: CancellationToken
  ): Promise<OcrJobOutput> {
    if (cancellationToken?.isCancelled) {
      cancellationToken.throwIfCancelled();
    }

    if (!input.source) {
      throw new ValidationError(`Fonte de imagem inválida para o job de OCR "${input.name}".`);
    }

    const result = await ocrRuntimeAdapter.recognizeImage(
      input.source,
      input.language || 'por',
      onProgress,
      cancellationToken
    );

    return {
      id: input.id,
      name: input.name,
      text: result.text,
      confidence: result.confidence
    };
  }

  /**
   * Executa jobs de OCR em lote com conformidade rigorosa aos estados operacionais
   */
  static async processBatch(
    jobs: OcrJobInput[],
    onProgress?: ProgressCallback,
    cancellationToken?: CancellationToken
  ): Promise<BatchOperationResult<OcrJobInput, OcrJobOutput>> {
    const startTime = performance.now();
    const totalItems = jobs.length;
    const itemResults: BatchItemResult<OcrJobInput, OcrJobOutput>[] = [];

    let succeeded = 0;
    let failed = 0;
    let canceled = 0;

    for (let i = 0; i < totalItems; i++) {
      const job = jobs[i];

      if (cancellationToken?.isCancelled) {
        canceled++;
        itemResults.push({
          id: job.id,
          input: job,
          status: 'canceled',
          error: new Error(cancellationToken.cancelReason || 'Job cancelado.'),
          durationMs: 0
        });
        continue;
      }

      const itemStart = performance.now();
      try {
        onProgress?.({
          stage: `Executando OCR (${i + 1}/${totalItems})`,
          current: i + 1,
          total: totalItems,
          percentage: Math.round((i / totalItems) * 100),
          itemDetail: job.name
        });

        const output = await this.processOcrJob(job, undefined, cancellationToken);
        const itemDuration = Math.round(performance.now() - itemStart);

        succeeded++;
        itemResults.push({
          id: job.id,
          input: job,
          status: 'completed',
          data: output,
          durationMs: itemDuration
        });
      } catch (err: any) {
        const itemDuration = Math.round(performance.now() - itemStart);
        if (err.name === 'OperationCancelledException' || cancellationToken?.isCancelled) {
          canceled++;
          itemResults.push({
            id: job.id,
            input: job,
            status: 'canceled',
            error: err,
            durationMs: itemDuration
          });
        } else {
          failed++;
          itemResults.push({
            id: job.id,
            input: job,
            status: 'failed',
            error: err,
            durationMs: itemDuration
          });
        }
      }
    }

    const totalDuration = Math.round(performance.now() - startTime);
    const finalStatus: OperationStatus = determineBatchStatus({
      total: totalItems,
      succeeded,
      failed,
      canceled
    });

    return {
      status: finalStatus,
      totalItems,
      processedItems: succeeded + failed + canceled,
      succeededItems: succeeded,
      failedItems: failed,
      canceledItems: canceled,
      items: itemResults,
      durationMs: totalDuration,
      summary: `Lote de OCR finalizado como "${finalStatus}": ${succeeded} reconhecidos, ${failed} falhas, ${canceled} cancelados.`
    };
  }
}
