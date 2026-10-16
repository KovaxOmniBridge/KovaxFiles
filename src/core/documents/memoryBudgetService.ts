/**
 * KovaxFiles Desktop — Core Memory Budget & Incremental Processing Service
 * Define limites estritos de memória por operação e por página,
 * garantindo processamento fatiado (chunking) sem congelamento da thread de interface.
 */

import { DocumentProcessingError } from '../../shared/errors/kovaxErrors';
import { CancellationToken, ProgressCallback } from '../../shared/contracts/operation.types';
import { cryptoAdapter } from '../../infrastructure/crypto/cryptoAdapter';

export const MEMORY_BUDGETS = {
  MAX_OPERATION_BYTES: 250 * 1024 * 1024, // Limite de 250 MB por operação individual
  MAX_PAGE_ESTIMATED_BYTES: 30 * 1024 * 1024, // Limite de 30 MB por página descompactada em memória
  CHUNK_PAGE_SIZE: 5, // Processa no máximo 5 páginas por ciclo antes de ceder a thread
  YIELD_INTERVAL_MS: 0 // Yield cooperativo imediato para event loop
} as const;

export class MemoryBudgetService {
  /**
   * Cede a execução temporariamente para o Event Loop do JavaScript,
   * permitindo que a interface processe eventos de renderização e o garbage collector atue.
   */
  static async yieldToEventLoop(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * Estima o consumo de memória não-comprimida de uma página PDF quando renderizada em raster (RGBA 32-bit)
   */
  static estimatePageRasterMemory(widthPoints: number, heightPoints: number, scale = 1.5): number {
    // 72 pontos = 1 polegada
    const widthPixels = Math.ceil(widthPoints * scale);
    const heightPixels = Math.ceil(heightPoints * scale);
    const bytesPerPixel = 4; // RGBA 32-bit
    return widthPixels * heightPixels * bytesPerPixel;
  }

  /**
   * Valida se a estimativa de consumo de uma página não ultrapassa o teto seguro
   */
  static assertSafePageMemory(widthPoints: number, heightPoints: number, pageNumber: number, scale = 1.5): void {
    const estimated = this.estimatePageRasterMemory(widthPoints, heightPoints, scale);
    if (estimated > MEMORY_BUDGETS.MAX_PAGE_ESTIMATED_BYTES) {
      throw new DocumentProcessingError(
        `A página ${pageNumber} (${(estimated / 1024 / 1024).toFixed(1)} MB) excede o limite seguro de memória de ${(MEMORY_BUDGETS.MAX_PAGE_ESTIMATED_BYTES / 1024 / 1024).toFixed(0)} MB. Reduza a escala de renderização.`,
        'ERR_PAGE_MEMORY_LIMIT_EXCEEDED'
      );
    }
  }

  /**
   * Processador fatiado (chunked) incremental para coleções volumosas ou documentos com muitas páginas.
   * Executa em pequenos lotes com yield cooperativo e descarte de buffers intermediários.
   */
  static async processIncrementally<TInput, TOutput>(
    items: TInput[],
    processor: (item: TInput, index: number) => Promise<TOutput>,
    options: {
      chunkSize?: number;
      onProgress?: ProgressCallback;
      cancellationToken?: CancellationToken;
      stageDescription?: string;
    } = {}
  ): Promise<TOutput[]> {
    const chunkSize = options.chunkSize || MEMORY_BUDGETS.CHUNK_PAGE_SIZE;
    const total = items.length;
    const outputs: TOutput[] = [];

    for (let i = 0; i < total; i += chunkSize) {
      if (options.cancellationToken?.isCancelled) {
        options.cancellationToken.throwIfCancelled();
      }

      const chunk = items.slice(i, i + chunkSize);

      for (let j = 0; j < chunk.length; j++) {
        if (options.cancellationToken?.isCancelled) {
          options.cancellationToken.throwIfCancelled();
        }

        const globalIndex = i + j;
        const result = await processor(chunk[j], globalIndex);
        outputs.push(result);

        if (options.onProgress) {
          options.onProgress({
            stage: options.stageDescription || 'Processando em lotes incrementais',
            current: globalIndex + 1,
            total,
            percentage: Math.round(((globalIndex + 1) / total) * 100),
            itemDetail: `Item ${globalIndex + 1} de ${total}`
          });
        }
      }

      // Ceder execução para o event loop após cada fatia concluída
      await this.yieldToEventLoop();
    }

    return outputs;
  }

  /**
   * Limpa com segurança um buffer binário intermediário liberando a memória
   */
  static wipeIntermediateBuffer(buffer: Uint8Array | null | undefined): void {
    if (buffer && buffer.length > 0) {
      cryptoAdapter.secureWipeBuffer(buffer);
    }
  }
}
