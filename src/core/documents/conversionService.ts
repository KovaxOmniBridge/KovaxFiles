/**
 * KovaxFiles Desktop — Core Document Conversion Service (DOCX / OOXML / HTML)
 * Conversão e exportação estruturada em conformidade com ISO/IEC 29500 e padrões judiciais (PJe / ABNT),
 * com ciclo de vida tipado, cancelamento cooperativo e integridade estrita de status.
 */

import {
  OperationResult,
  OperationStatus,
  BatchOperationResult,
  BatchItemResult,
  determineBatchStatus,
  CancellationToken,
  ProgressCallback
} from '../../shared/contracts/operation.types';
import { DocxExporterService, DocxFormattingOptions, DocxSecurityError, MalformedDocxError } from '../../services/docxExporterService';
import { LocalPdfEngine, ImageToPdfItem, ImageToPdfOptions, PdfToImageOptions, TextToPdfOptions } from '../../services/pdfEngine';
import { ValidationError, ensureKovaxError } from '../../shared/errors/kovaxErrors';
import { cryptoAdapter } from '../../infrastructure/crypto/cryptoAdapter';

export {
  DocxExporterService
};
export type {
  DocxFormattingOptions,
  DocxSecurityError,
  MalformedDocxError,
  ImageToPdfItem,
  ImageToPdfOptions,
  PdfToImageOptions,
  TextToPdfOptions
};

export interface ConvertDocxToHtmlInput {
  id: string;
  name: string;
  docxBytes: Uint8Array | ArrayBuffer;
}

export interface ConvertHtmlToDocxInput {
  id: string;
  name: string;
  htmlContent: string;
  title?: string;
  formatting?: DocxFormattingOptions;
}

export interface ConvertDocxOutput {
  id: string;
  name: string;
  html: string;
  originalSizeBytes: number;
  sha256Hex: string;
}

export interface ConvertHtmlOutput {
  id: string;
  name: string;
  docxBytes: Uint8Array;
  sizeBytes: number;
  sha256Hex: string;
}

export class CoreConversionService {
  /**
   * Converte um arquivo .docx (Office Open XML) em HTML estruturado semântico.
   * Preserva integralmente o buffer original do chamador (sem mutações in-place).
   */
  static async convertDocxToHtml(
    input: ConvertDocxToHtmlInput,
    cancellationToken?: CancellationToken
  ): Promise<OperationResult<ConvertDocxOutput>> {
    const startTime = performance.now();
    try {
      if (cancellationToken?.isCancelled) {
        cancellationToken.throwIfCancelled();
      }

      if (!input.docxBytes || input.docxBytes.byteLength === 0) {
        throw new ValidationError(`O documento "${input.name}" não contém bytes válidos para conversão.`);
      }

      // Cópia isolada de leitura para garantir imutabilidade do buffer original
      const bytesCopy = input.docxBytes instanceof Uint8Array
        ? new Uint8Array(input.docxBytes)
        : new Uint8Array(input.docxBytes.slice(0));

      const html = await DocxExporterService.importDocxToHtml(bytesCopy);

      if (cancellationToken?.isCancelled) {
        cancellationToken.throwIfCancelled();
      }

      const sha256Hex = cryptoAdapter.computeSha256Sync(bytesCopy);
      const durationMs = Math.round(performance.now() - startTime);

      return {
        status: 'completed',
        isSuccess: true,
        data: {
          id: input.id,
          name: input.name,
          html,
          originalSizeBytes: input.docxBytes.byteLength,
          sha256Hex
        },
        durationMs
      };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      const isCancelled = err.name === 'OperationCancelledException' || cancellationToken?.isCancelled;

      return {
        status: isCancelled ? 'canceled' : 'failed',
        isSuccess: false,
        error: ensureKovaxError(err, 'DOCUMENT_PROCESSING'),
        durationMs
      };
    }
  }

  /**
   * Converte conteúdo HTML para pacote DOCX (OOXML) válido.
   */
  static async convertHtmlToDocx(
    input: ConvertHtmlToDocxInput,
    cancellationToken?: CancellationToken
  ): Promise<OperationResult<ConvertHtmlOutput>> {
    const startTime = performance.now();
    try {
      if (cancellationToken?.isCancelled) {
        cancellationToken.throwIfCancelled();
      }

      if (!input.htmlContent || input.htmlContent.trim().length === 0) {
        throw new ValidationError(`Conteúdo HTML vazio para conversão em DOCX no item "${input.name}".`);
      }

      const docxArrayBuffer = await DocxExporterService.generateHtmlDocxBuffer(
        input.htmlContent,
        input.title || input.name,
        input.formatting
      );

      if (cancellationToken?.isCancelled) {
        cancellationToken.throwIfCancelled();
      }

      const docxBytes = new Uint8Array(docxArrayBuffer);
      const sha256Hex = cryptoAdapter.computeSha256Sync(docxBytes);
      const durationMs = Math.round(performance.now() - startTime);

      return {
        status: 'completed',
        isSuccess: true,
        data: {
          id: input.id,
          name: input.name,
          docxBytes,
          sizeBytes: docxBytes.byteLength,
          sha256Hex
        },
        durationMs
      };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      const isCancelled = err.name === 'OperationCancelledException' || cancellationToken?.isCancelled;

      return {
        status: isCancelled ? 'canceled' : 'failed',
        isSuccess: false,
        error: ensureKovaxError(err, 'DOCUMENT_PROCESSING'),
        durationMs
      };
    }
  }

  /**
   * Executa a conversão de arquivos DOCX em lote com garantia estrita de integridade de status:
   * 100% sucesso -> 'completed', parcial -> 'partial', 100% falha -> 'failed'.
   */
  static async convertDocxBatch(
    items: ConvertDocxToHtmlInput[],
    onProgress?: ProgressCallback,
    cancellationToken?: CancellationToken
  ): Promise<BatchOperationResult<ConvertDocxToHtmlInput, ConvertDocxOutput>> {
    const startTime = performance.now();
    const totalItems = items.length;
    const itemResults: BatchItemResult<ConvertDocxToHtmlInput, ConvertDocxOutput>[] = [];

    let succeeded = 0;
    let failed = 0;
    let canceled = 0;

    for (let i = 0; i < totalItems; i++) {
      const item = items[i];

      if (cancellationToken?.isCancelled) {
        canceled++;
        itemResults.push({
          id: item.id,
          input: item,
          status: 'canceled',
          error: new Error(cancellationToken.cancelReason || 'Conversão cancelada.'),
          durationMs: 0
        });
        continue;
      }

      const itemStart = performance.now();
      try {
        onProgress?.({
          stage: `Convertendo DOCX ${i + 1} de ${totalItems}`,
          current: i + 1,
          total: totalItems,
          percentage: Math.round((i / totalItems) * 100),
          message: `Convertendo "${item.name}"...`,
          itemDetail: item.name
        });

        const opResult = await this.convertDocxToHtml(item, cancellationToken);
        const itemDuration = Math.round(performance.now() - itemStart);

        if (opResult.status === 'completed' && opResult.data) {
          succeeded++;
          itemResults.push({
            id: item.id,
            input: item,
            status: 'completed',
            data: opResult.data,
            durationMs: itemDuration
          });
        } else if (opResult.status === 'canceled') {
          canceled++;
          itemResults.push({
            id: item.id,
            input: item,
            status: 'canceled',
            error: opResult.error as any,
            durationMs: itemDuration
          });
        } else {
          failed++;
          itemResults.push({
            id: item.id,
            input: item,
            status: 'failed',
            error: opResult.error as any,
            durationMs: itemDuration
          });
        }
      } catch (err: any) {
        const itemDuration = Math.round(performance.now() - itemStart);
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
      summary: `Lote de conversão finalizado com status "${finalStatus}": ${succeeded}/${totalItems} sucessos, ${failed} falhas, ${canceled} cancelamentos.`
    };
  }

  /**
   * Converte diretamente arquivo DOCX em HTML estruturado
   */
  static async importDocxToHtml(docxBytes: ArrayBuffer | Uint8Array): Promise<string> {
    return DocxExporterService.importDocxToHtml(docxBytes);
  }

  /**
   * Exporta conteúdo HTML para arquivo DOCX estruturado
   */
  static async exportHtmlToDocx(
    html: string,
    title?: string,
    options?: DocxFormattingOptions
  ): Promise<void> {
    return DocxExporterService.exportHtmlToDocx(html, title, options);
  }

  /**
   * Converte lista de imagens em documento PDF
   */
  static async imagesToPdf(
    items: ImageToPdfItem[],
    options: ImageToPdfOptions
  ): Promise<Uint8Array> {
    return LocalPdfEngine.imagesToPdf(items, options);
  }

  /**
   * Converte páginas de PDF em imagens renderizadas
   */
  static async pdfToImages(
    pdfBytes: ArrayBuffer | Uint8Array,
    options: PdfToImageOptions
  ): Promise<{ pageIndex: number; dataUrl: string; bytes: Uint8Array; fileName: string }[]> {
    return LocalPdfEngine.pdfToImages(pdfBytes, options);
  }

  /**
   * Converte texto simples estruturado em documento PDF formatado
   */
  static async textToPdf(
    text: string,
    options: TextToPdfOptions
  ): Promise<Uint8Array> {
    return LocalPdfEngine.textToPdf(text, options);
  }
}


