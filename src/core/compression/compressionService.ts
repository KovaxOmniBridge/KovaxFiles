/**
 * KovaxFiles Desktop — Core Compression Service
 * Pipeline de compressão de documentos PDF com suporte a lotes,
 * estados de ciclo de vida granulares (completed/partial/failed/canceled),
 * cancelamento cooperativo e notificação uniforme de progresso.
 */

import {
  OperationStatus,
  OperationProgress,
  ProgressCallback,
  CancellationToken,
  BatchOperationResult,
  BatchItemResult,
  determineBatchStatus
} from '../../shared/contracts/operation.types';
import { pdfEngineAdapter } from '../../infrastructure/pdf/pdfEngineAdapter';
import { DocumentProcessingError, ValidationError } from '../../shared/errors/kovaxErrors';

export type CompressionProfile = 'balanced' | 'aggressive' | 'extreme' | 'court_pje' | 'court_esaj';

export interface CompressDocumentInput {
  id: string;
  name: string;
  bytes: Uint8Array;
  profile: CompressionProfile;
  targetMaxSizeBytes?: number;
}

export interface CompressDocumentOutput {
  id: string;
  name: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  reductionPercentage: number;
  outputBytes: Uint8Array;
}

export class CoreCompressionService {
  /**
   * Executa a compressão de um único documento PDF
   */
  static async compressDocument(
    input: CompressDocumentInput,
    onProgress?: ProgressCallback,
    cancellationToken?: CancellationToken
  ): Promise<CompressDocumentOutput> {
    if (cancellationToken?.isCancelled) {
      cancellationToken.throwIfCancelled();
    }

    if (!input.bytes || input.bytes.length === 0) {
      throw new ValidationError(`O documento "${input.name}" não contém bytes válidos.`);
    }

    onProgress?.({
      stage: 'Carregando estrutura do PDF',
      current: 10,
      total: 100,
      percentage: 10,
      itemDetail: input.name
    });

    // 1. Carregar via adaptador desacoplado
    const pdfDoc = await pdfEngineAdapter.loadDocument(input.bytes);

    if (cancellationToken?.isCancelled) {
      cancellationToken.throwIfCancelled();
    }

    onProgress?.({
      stage: 'Otimizando streams e objetos estruturais',
      current: 50,
      total: 100,
      percentage: 50,
      itemDetail: input.name
    });

    // 2. Serializar aplicando compressão de object streams
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false
    });

    if (cancellationToken?.isCancelled) {
      cancellationToken.throwIfCancelled();
    }

    const originalSize = input.bytes.length;
    const finalSize = compressedBytes.length;
    const reduction = originalSize > 0 ? Math.max(0, ((originalSize - finalSize) / originalSize) * 100) : 0;

    onProgress?.({
      stage: 'Compressão concluída',
      current: 100,
      total: 100,
      percentage: 100,
      itemDetail: input.name
    });

    return {
      id: input.id,
      name: input.name,
      originalSizeBytes: originalSize,
      compressedSizeBytes: finalSize,
      reductionPercentage: parseFloat(reduction.toFixed(2)),
      outputBytes: compressedBytes
    };
  }

  /**
   * Executa a compressão em lote (Batch) com garantia estrita de integridade de status:
   * - Se todos sucedem: 'completed'
   * - Se alguns sucedem e outros falham/cancelam: 'partial' (NUNCA 'completed'!)
   * - Se todos falham: 'failed'
   * - Se cancelado antes de qualquer item concluir: 'canceled'
   */
  static async compressBatch(
    items: CompressDocumentInput[],
    onProgress?: ProgressCallback,
    cancellationToken?: CancellationToken
  ): Promise<BatchOperationResult<CompressDocumentInput, CompressDocumentOutput>> {
    const startTime = performance.now();
    const totalItems = items.length;
    const itemResults: BatchItemResult<CompressDocumentInput, CompressDocumentOutput>[] = [];

    let succeeded = 0;
    let failed = 0;
    let canceled = 0;

    for (let i = 0; i < totalItems; i++) {
      const item = items[i];

      // Verificar cancelamento antes de cada item
      if (cancellationToken?.isCancelled) {
        canceled++;
        itemResults.push({
          id: item.id,
          input: item,
          status: 'canceled',
          error: new Error(cancellationToken.cancelReason || 'Cancelado pelo operador.'),
          durationMs: 0
        });
        continue;
      }

      const itemStart = performance.now();
      try {
        onProgress?.({
          stage: `Processando item ${i + 1} de ${totalItems}`,
          current: i + 1,
          total: totalItems,
          percentage: Math.round(((i) / totalItems) * 100),
          message: `Comprimindo "${item.name}"...`,
          itemDetail: item.name
        });

        const output = await this.compressDocument(item, undefined, cancellationToken);
        const itemDuration = Math.round(performance.now() - itemStart);

        succeeded++;
        itemResults.push({
          id: item.id,
          input: item,
          status: 'completed',
          data: output,
          durationMs: itemDuration
        });
      } catch (err: any) {
        const itemDuration = Math.round(performance.now() - itemStart);
        if (err.name === 'OperationCancelledException' || cancellationToken?.isCancelled) {
          canceled++;
          itemResults.push({
            id: item.id,
            input: item,
            status: 'canceled',
            error: err,
            durationMs: itemDuration
          });
        } else {
          failed++;
          itemResults.push({
            id: item.id,
            input: item,
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

    const summary = `Lote finalizado com status "${finalStatus}": ${succeeded}/${totalItems} sucessos, ${failed} falhas, ${canceled} cancelamentos em ${totalDuration}ms.`;

    onProgress?.({
      stage: 'Processamento do lote finalizado',
      current: totalItems,
      total: totalItems,
      percentage: 100,
      message: summary
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
      summary
    };
  }
}
