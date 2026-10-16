/**
 * KovaxFiles Desktop — Core Cryptography & Vault Service
 * Criptografia forte AES-GCM 256 bits com PBKDF2 (Cofre Forte) e proteção ISO 32000 por senha,
 * com ciclo de vida uniforme, cancelamento limpo e preservação estrita de arquivos originais.
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
import { EncryptionEngine, PdfEncryptionOptions } from '../../services/encryptionEngine';
import { ValidationError, CryptoOperationError, ensureKovaxError } from '../../shared/errors/kovaxErrors';
import { cryptoAdapter } from '../../infrastructure/crypto/cryptoAdapter';

export { EncryptionEngine };
export type { PdfEncryptionOptions };

export interface VaultEncryptInput {
  id: string;
  name: string;
  bytes: Uint8Array | ArrayBuffer;
  password: string;
}

export interface VaultDecryptInput {
  id: string;
  name: string;
  encryptedBytes: Uint8Array | ArrayBuffer;
  password: string;
}

export interface PdfEncryptInput {
  id: string;
  name: string;
  pdfBytes: Uint8Array | ArrayBuffer;
  options: PdfEncryptionOptions;
}

export interface PdfDecryptInput {
  id: string;
  name: string;
  encryptedPdfBytes: Uint8Array | ArrayBuffer;
  password: string;
}

export interface VaultBatchItem {
  id: string;
  name: string;
  mode: 'encrypt' | 'decrypt';
  bytes: Uint8Array | ArrayBuffer;
  password: string;
}

export class CoreCryptoVaultService {
  /**
   * Criptografa arquivo no padrão Cofre Forte AES-GCM 256 bits.
   * O buffer original de entrada é preservado intacto.
   */
  static async encryptVault(
    input: VaultEncryptInput,
    cancellationToken?: CancellationToken
  ): Promise<OperationResult<Uint8Array>> {
    const startTime = performance.now();
    try {
      if (cancellationToken?.isCancelled) {
        cancellationToken.throwIfCancelled();
      }

      if (!input.password || input.password.trim().length === 0) {
        throw new ValidationError('Senha para o Cofre Forte AES-256 não informada.');
      }

      if (!input.bytes || input.bytes.byteLength === 0) {
        throw new ValidationError(`Arquivo "${input.name}" vazio ou inválido para proteção em cofre.`);
      }

      // Cópia isolada de leitura para garantir imutabilidade do buffer original
      const bytesCopy = input.bytes instanceof Uint8Array
        ? new Uint8Array(input.bytes)
        : new Uint8Array(input.bytes.slice(0));

      const encrypted = await EncryptionEngine.encryptFileAesGcm(bytesCopy, input.password);

      if (cancellationToken?.isCancelled) {
        cryptoAdapter.secureWipeBuffer(encrypted);
        cancellationToken.throwIfCancelled();
      }

      const durationMs = Math.round(performance.now() - startTime);

      return {
        status: 'completed',
        isSuccess: true,
        data: encrypted,
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
   * Descriptografa e autentica arquivo do Cofre Forte AES-GCM 256 bits.
   * Se os dados estiverem adulterados ou a senha for incorreta, rejeita sem corromper.
   */
  static async decryptVault(
    input: VaultDecryptInput,
    cancellationToken?: CancellationToken
  ): Promise<OperationResult<Uint8Array>> {
    const startTime = performance.now();
    try {
      if (cancellationToken?.isCancelled) {
        cancellationToken.throwIfCancelled();
      }

      if (!input.password || input.password.trim().length === 0) {
        throw new ValidationError('Senha de desbloqueio do Cofre Forte não informada.');
      }

      if (!input.encryptedBytes || input.encryptedBytes.byteLength < 32) {
        throw new ValidationError(`Dados do arquivo "${input.name}" corrompidos ou inferiores ao cabeçalho mínimo do cofre.`);
      }

      const bytesCopy = input.encryptedBytes instanceof Uint8Array
        ? new Uint8Array(input.encryptedBytes)
        : new Uint8Array(input.encryptedBytes.slice(0));

      // Validação rápida de assinatura mágica KVX1
      const magic = String.fromCharCode(...bytesCopy.subarray(0, 4));
      if (magic !== 'KVX1') {
        throw new ValidationError('O arquivo não possui o cabeçalho KVX1 de Cofre Forte legítimo.');
      }

      const decrypted = await EncryptionEngine.decryptFileAesGcm(bytesCopy, input.password);

      if (cancellationToken?.isCancelled) {
        cryptoAdapter.secureWipeBuffer(decrypted);
        cancellationToken.throwIfCancelled();
      }

      const durationMs = Math.round(performance.now() - startTime);

      return {
        status: 'completed',
        isSuccess: true,
        data: decrypted,
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
   * Criptografa PDF com senha no padrão ISO 32000 (AES-256).
   */
  static async encryptPdf(
    input: PdfEncryptInput,
    cancellationToken?: CancellationToken
  ): Promise<OperationResult<Uint8Array>> {
    const startTime = performance.now();
    try {
      if (cancellationToken?.isCancelled) {
        cancellationToken.throwIfCancelled();
      }

      if (!input.pdfBytes || input.pdfBytes.byteLength === 0) {
        throw new ValidationError(`Arquivo PDF "${input.name}" vazio ou inválido.`);
      }

      const bytesCopy = input.pdfBytes instanceof Uint8Array
        ? new Uint8Array(input.pdfBytes)
        : new Uint8Array(input.pdfBytes.slice(0));

      const encrypted = await EncryptionEngine.encryptPdf(bytesCopy, input.options);

      if (cancellationToken?.isCancelled) {
        cancellationToken.throwIfCancelled();
      }

      const durationMs = Math.round(performance.now() - startTime);

      return {
        status: 'completed',
        isSuccess: true,
        data: encrypted,
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
   * Descriptografa PDF protegido por senha.
   */
  static async decryptPdf(
    input: PdfDecryptInput,
    cancellationToken?: CancellationToken
  ): Promise<OperationResult<Uint8Array>> {
    const startTime = performance.now();
    try {
      if (cancellationToken?.isCancelled) {
        cancellationToken.throwIfCancelled();
      }

      if (!input.password) {
        throw new ValidationError('Senha para abertura do PDF não informada.');
      }

      if (!input.encryptedPdfBytes || input.encryptedPdfBytes.byteLength === 0) {
        throw new ValidationError(`Arquivo PDF "${input.name}" vazio ou inválido.`);
      }

      const bytesCopy = input.encryptedPdfBytes instanceof Uint8Array
        ? new Uint8Array(input.encryptedPdfBytes)
        : new Uint8Array(input.encryptedPdfBytes.slice(0));

      const decrypted = await EncryptionEngine.decryptPdf(bytesCopy, input.password);

      if (cancellationToken?.isCancelled) {
        cancellationToken.throwIfCancelled();
      }

      const durationMs = Math.round(performance.now() - startTime);

      return {
        status: 'completed',
        isSuccess: true,
        data: decrypted,
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
   * Executa operações de cofre em lote com garantia estrita de integridade de status:
   * 100% sucesso -> 'completed', mistura -> 'partial', 100% falha -> 'failed'.
   */
  static async processVaultBatch(
    items: VaultBatchItem[],
    onProgress?: ProgressCallback,
    cancellationToken?: CancellationToken
  ): Promise<BatchOperationResult<VaultBatchItem, Uint8Array>> {
    const startTime = performance.now();
    const totalItems = items.length;
    const itemResults: BatchItemResult<VaultBatchItem, Uint8Array>[] = [];

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
          error: new Error(cancellationToken.cancelReason || 'Operação de cofre cancelada.'),
          durationMs: 0
        });
        continue;
      }

      const itemStart = performance.now();
      try {
        onProgress?.({
          stage: `Processando item de cofre ${i + 1} de ${totalItems}`,
          current: i + 1,
          total: totalItems,
          percentage: Math.round((i / totalItems) * 100),
          message: `${item.mode === 'encrypt' ? 'Criptografando' : 'Descriptografando'} "${item.name}"...`,
          itemDetail: item.name
        });

        const opResult = item.mode === 'encrypt'
          ? await this.encryptVault({ id: item.id, name: item.name, bytes: item.bytes, password: item.password }, cancellationToken)
          : await this.decryptVault({ id: item.id, name: item.name, encryptedBytes: item.bytes, password: item.password }, cancellationToken);

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
      summary: `Lote de cofre finalizado com status "${finalStatus}": ${succeeded}/${totalItems} sucessos, ${failed} falhas, ${canceled} cancelamentos.`
    };
  }

  /**
   * Criptografa dados com AES-GCM 256 bits no padrão Cofre Forte
   */
  static async encryptFileAesGcm(data: Uint8Array | ArrayBuffer, password: string): Promise<Uint8Array> {
    return EncryptionEngine.encryptFileAesGcm(data, password);
  }

  /**
   * Descriptografa dados com AES-GCM 256 bits no padrão Cofre Forte
   */
  static async decryptFileAesGcm(data: Uint8Array | ArrayBuffer, password: string): Promise<Uint8Array> {
    return EncryptionEngine.decryptFileAesGcm(data, password);
  }

  /**
   * Criptografa PDF com senha
   */
  static async encryptPdfDirect(pdfBytes: Uint8Array | ArrayBuffer, options: PdfEncryptionOptions): Promise<Uint8Array> {
    return EncryptionEngine.encryptPdf(pdfBytes, options);
  }

  /**
   * Descriptografa PDF protegido com senha
   */
  static async decryptPdfDirect(pdfBytes: Uint8Array | ArrayBuffer, password: string): Promise<Uint8Array> {
    return EncryptionEngine.decryptPdf(pdfBytes, password);
  }

  /**
   * Calcula digest SHA-256
   */
  static async computeSha256(data: Uint8Array | ArrayBuffer): Promise<string> {
    return EncryptionEngine.computeSha256(data);
  }
}

