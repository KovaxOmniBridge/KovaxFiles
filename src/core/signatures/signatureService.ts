/**
 * KovaxFiles Desktop — Core Signatures & Cryptographic PAdES Contracts
 * Define contratos tipados de assinatura digital, distinção de integridade técnica
 * versus confiança jurídica (ICP-Brasil), e delegação desacoplada.
 */

export * from '../../services/padesSignatureService';

import {
  PadesSignatureService,
  PadesSignatureValidationResult,
  PadesSignOptions,
  Pkcs12CertificateInfo
} from '../../services/padesSignatureService';
import {
  OperationResult,
  OperationStatus,
  BatchOperationResult,
  BatchItemResult,
  determineBatchStatus,
  CancellationToken,
  ProgressCallback
} from '../../shared/contracts/operation.types';
import { ensureKovaxError, ValidationError } from '../../shared/errors/kovaxErrors';

export type PdfSignatureVerificationReport = PadesSignatureValidationResult;

export interface SignPdfInput {
  pdfBuffer: Uint8Array | ArrayBuffer;
  p12Buffer: Uint8Array | ArrayBuffer;
  password: string;
  signOptions?: PadesSignOptions;
}

export type SignPdfOptions = SignPdfInput;

export interface SignPdfBatchItem {
  id: string;
  name: string;
  options: SignPdfInput;
}

export class CoreSignatureService {
  /**
   * Executa a verificação técnica e jurídica das assinaturas digitais de um PDF
   */
  static async verifyPdfSignatures(
    pdfBuffer: Uint8Array | ArrayBuffer
  ): Promise<OperationResult<PadesSignatureValidationResult>> {
    const startTime = performance.now();
    try {
      const electronApi = typeof window !== 'undefined' ? (window as any).electronAPI : undefined;
      let report: PadesSignatureValidationResult;
      if (electronApi?.padesVerifyPdf) {
        report = await electronApi.padesVerifyPdf(pdfBuffer);
      } else {
        report = await PadesSignatureService.verifyPdf(pdfBuffer);
      }
      const durationMs = Math.round(performance.now() - startTime);

      return {
        status: 'completed',
        isSuccess: true,
        data: report,
        durationMs
      };
    } catch (err) {
      const durationMs = Math.round(performance.now() - startTime);
      const kovaxErr = ensureKovaxError(err, 'CRYPTO');

      return {
        status: 'failed',
        isSuccess: false,
        error: kovaxErr,
        durationMs
      };
    }
  }

  /**
   * Assina digitalmente um PDF no padrão PAdES (com suporte a append incremental)
   */
  static async signPdf(
    options: SignPdfInput,
    cancellationToken?: CancellationToken
  ): Promise<OperationResult<Uint8Array>> {
    const startTime = performance.now();
    try {
      if (cancellationToken?.isCancelled) {
        cancellationToken.throwIfCancelled();
      }

      if (!options.pdfBuffer || options.pdfBuffer.byteLength === 0) {
        throw new ValidationError('Buffer de PDF inválido ou vazio para assinatura PAdES.');
      }
      if (!options.p12Buffer || options.p12Buffer.byteLength === 0) {
        throw new ValidationError('Certificado A1 (PKCS#12) inválido ou vazio.');
      }
      if (!options.password) {
        throw new ValidationError('Senha do certificado digital não informada.');
      }

      const electronApi = typeof window !== 'undefined' ? (window as any).electronAPI : undefined;
      let signedBytes: Uint8Array;
      if (electronApi?.padesSignPdf) {
        signedBytes = await electronApi.padesSignPdf({
          pdfBuffer: options.pdfBuffer,
          p12Buffer: options.p12Buffer,
          password: options.password,
          signOptions: options.signOptions
        });
      } else {
        signedBytes = await PadesSignatureService.signPdf(
          options.pdfBuffer,
          options.p12Buffer,
          options.password,
          options.signOptions
        );
      }

      if (cancellationToken?.isCancelled) {
        cancellationToken.throwIfCancelled();
      }

      const durationMs = Math.round(performance.now() - startTime);

      return {
        status: 'completed',
        isSuccess: true,
        data: signedBytes,
        durationMs
      };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      const isCancelled = err.name === 'OperationCancelledException' || cancellationToken?.isCancelled;

      return {
        status: isCancelled ? 'canceled' : 'failed',
        isSuccess: false,
        error: ensureKovaxError(err, 'CRYPTO'),
        durationMs
      };
    }
  }

  /**
   * Executa a assinatura PAdES em lote com garantia estrita de integridade de status:
   * 100% sucesso -> 'completed', mistura -> 'partial', 100% falha -> 'failed'.
   */
  static async signBatch(
    items: SignPdfBatchItem[],
    onProgress?: ProgressCallback,
    cancellationToken?: CancellationToken
  ): Promise<BatchOperationResult<SignPdfBatchItem, Uint8Array>> {
    const startTime = performance.now();
    const totalItems = items.length;
    const itemResults: BatchItemResult<SignPdfBatchItem, Uint8Array>[] = [];

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
          error: new Error(cancellationToken.cancelReason || 'Assinatura cancelada.'),
          durationMs: 0
        });
        continue;
      }

      const itemStart = performance.now();
      try {
        onProgress?.({
          stage: `Assinando documento ${i + 1} de ${totalItems}`,
          current: i + 1,
          total: totalItems,
          percentage: Math.round((i / totalItems) * 100),
          message: `Assinando "${item.name}"...`,
          itemDetail: item.name
        });

        const opResult = await this.signPdf(item.options, cancellationToken);
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
      summary: `Lote de assinaturas PAdES finalizado com status "${finalStatus}": ${succeeded}/${totalItems} sucessos, ${failed} falhas, ${canceled} cancelamentos.`
    };
  }

  /**
   * Analisa e inspeciona um certificado PKCS#12 (.pfx/.p12)
   */
  static async parseCertificate(
    p12Buffer: Uint8Array | ArrayBuffer,
    password: string
  ): Promise<OperationResult<Pkcs12CertificateInfo>> {
    const startTime = performance.now();
    try {
      const electronApi = typeof window !== 'undefined' ? (window as any).electronAPI : undefined;
      let certInfo: Pkcs12CertificateInfo;
      if (electronApi?.padesParseCertificate) {
        const res = await electronApi.padesParseCertificate({ p12Buffer, password });
        certInfo = res.certInfo;
      } else {
        const parsed = PadesSignatureService.parseCertificate(p12Buffer, password);
        certInfo = parsed.certInfo;
      }
      const durationMs = Math.round(performance.now() - startTime);

      return {
        status: 'completed',
        isSuccess: true,
        data: certInfo,
        durationMs
      };
    } catch (err) {
      const durationMs = Math.round(performance.now() - startTime);
      const kovaxErr = ensureKovaxError(err, 'CRYPTO');

      return {
        status: 'failed',
        isSuccess: false,
        error: kovaxErr,
        durationMs
      };
    }
  }
}
