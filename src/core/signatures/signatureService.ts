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
import { OperationResult } from '../../shared/contracts/operation.types';
import { ensureKovaxError } from '../../shared/errors/kovaxErrors';

export type PdfSignatureVerificationReport = PadesSignatureValidationResult;

export interface SignPdfInput {
  pdfBuffer: Uint8Array | ArrayBuffer;
  p12Buffer: Uint8Array | ArrayBuffer;
  password: string;
  signOptions?: PadesSignOptions;
}

export type SignPdfOptions = SignPdfInput;

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
        report = await electronApi.padesVerifyPdf({ pdfBuffer });
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
  static async signPdf(options: SignPdfInput): Promise<OperationResult<Uint8Array>> {
    const startTime = performance.now();
    try {
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
      const durationMs = Math.round(performance.now() - startTime);

      return {
        status: 'completed',
        isSuccess: true,
        data: signedBytes,
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
