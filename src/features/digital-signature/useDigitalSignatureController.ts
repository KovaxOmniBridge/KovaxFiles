/**
 * KovaxFiles Desktop — Feature: Digital Signature Controller
 * Desacopla carregamento de certificados PKCS#12, validação de integridade técnica
 * versus confiança jurídica (ICP-Brasil) e assinatura digital PAdES do componente visual.
 */

import { useState, useCallback } from 'react';
import {
  CoreSignatureService,
  PdfSignatureVerificationReport,
  Pkcs12CertificateInfo,
  SignPdfOptions
} from '../../core/signatures/signatureService';
import { OperationStatus } from '../../shared/contracts/operation.types';

export interface SignatureToolState {
  status: OperationStatus;
  verificationReport: PdfSignatureVerificationReport | null;
  certificateInfo: Pkcs12CertificateInfo | null;
  isVerifying: boolean;
  isSigning: boolean;
  errorMessage: string | null;
}

export function useDigitalSignatureController() {
  const [state, setState] = useState<SignatureToolState>({
    status: 'pending',
    verificationReport: null,
    certificateInfo: null,
    isVerifying: false,
    isSigning: false,
    errorMessage: null
  });

  const verifyDocument = useCallback(async (pdfBuffer: Uint8Array | ArrayBuffer) => {
    setState(prev => ({ ...prev, isVerifying: true, status: 'processing', errorMessage: null }));
    const result = await CoreSignatureService.verifyPdfSignatures(pdfBuffer);

    if (result.isSuccess && result.data) {
      setState(prev => ({
        ...prev,
        status: 'completed',
        isVerifying: false,
        verificationReport: result.data!
      }));
      return result.data;
    } else {
      setState(prev => ({
        ...prev,
        status: 'failed',
        isVerifying: false,
        errorMessage: result.error?.message || 'Falha ao verificar assinaturas do PDF.'
      }));
      throw result.error;
    }
  }, []);

  const loadCertificate = useCallback((p12Buffer: Uint8Array | ArrayBuffer, password: string) => {
    const result = CoreSignatureService.parseCertificate(p12Buffer, password);
    if (result.isSuccess && result.data) {
      setState(prev => ({ ...prev, certificateInfo: result.data!, errorMessage: null }));
      return result.data;
    } else {
      setState(prev => ({ ...prev, errorMessage: result.error?.message || 'Senha do certificado incorreta ou arquivo inválido.' }));
      throw result.error;
    }
  }, []);

  const signDocument = useCallback(async (options: SignPdfOptions) => {
    setState(prev => ({ ...prev, isSigning: true, status: 'processing', errorMessage: null }));
    const result = await CoreSignatureService.signPdf(options);

    if (result.isSuccess && result.data) {
      setState(prev => ({ ...prev, isSigning: false, status: 'completed' }));
      return result.data;
    } else {
      setState(prev => ({
        ...prev,
        isSigning: false,
        status: 'failed',
        errorMessage: result.error?.message || 'Falha ao assinar digitalmente o PDF.'
      }));
      throw result.error;
    }
  }, []);

  return {
    state,
    verifyDocument,
    loadCertificate,
    signDocument
  };
}
