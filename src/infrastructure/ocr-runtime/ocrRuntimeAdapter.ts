/**
 * KovaxFiles Desktop — Decoupled OCR Runtime Infrastructure Adapter
 * Fornece interface padronizada para execução de reconhecimento óptico de caracteres (OCR)
 * via Tesseract.js de forma estritamente offline e isolada de UI.
 */

import { createOfflineWorker } from '../../services/tesseractOfflineConfig';
import { DocumentProcessingError } from '../../shared/errors/kovaxErrors';
import type { CancellationToken, ProgressCallback } from '../../shared/contracts/operation.types';

export interface OcrRecognizeResult {
  text: string;
  confidence: number;
}

export interface IOcrRuntimeAdapter {
  recognizeImage(
    imageSource: string | HTMLCanvasElement | Uint8Array,
    lang?: string,
    onProgress?: ProgressCallback,
    cancellationToken?: CancellationToken
  ): Promise<OcrRecognizeResult>;
}

export class StandardOcrRuntimeAdapter implements IOcrRuntimeAdapter {
  async recognizeImage(
    imageSource: string | HTMLCanvasElement | Uint8Array,
    lang = 'por',
    onProgress?: ProgressCallback,
    cancellationToken?: CancellationToken
  ): Promise<OcrRecognizeResult> {
    if (cancellationToken?.isCancelled) {
      cancellationToken.throwIfCancelled();
    }

    let worker: any = null;
    try {
      worker = await createOfflineWorker(lang, {
        logger: (m) => {
          if (cancellationToken?.isCancelled) {
            return;
          }
          if (m.status === 'recognizing text' && onProgress) {
            const progressRatio = typeof m.progress === 'number' ? m.progress : 0;
            onProgress({
              stage: 'Reconhecendo caracteres (OCR)',
              current: Math.round(progressRatio * 100),
              total: 100,
              percentage: Math.round(progressRatio * 100),
              message: `OCR em andamento (${Math.round(progressRatio * 100)}%)`
            });
          }
        }
      });

      if (cancellationToken?.isCancelled) {
        cancellationToken.throwIfCancelled();
      }

      const ret = await worker.recognize(imageSource as any);

      if (cancellationToken?.isCancelled) {
        cancellationToken.throwIfCancelled();
      }

      return {
        text: ret.data.text || '',
        confidence: ret.data.confidence || 0
      };
    } catch (err: any) {
      if (err.name === 'OperationCancelledException' || cancellationToken?.isCancelled) {
        throw err;
      }
      throw new DocumentProcessingError(`Falha na execução do motor OCR: ${err.message}`, 'ERR_OCR_EXECUTION_FAILED', {
        error: err
      });
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // Ignorar erro no encerramento de worker
        }
      }
    }
  }
}

export const ocrRuntimeAdapter = new StandardOcrRuntimeAdapter();
