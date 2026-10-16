/**
 * KovaxFiles Desktop — Electron PAdES Cryptographic Service IPC Handlers
 * Executa operações de certificação digital e assinatura em contexto isolado no processo principal.
 *
 * GARANTIAS DE SEGURANÇA CRÍTICOS:
 * 1. Chaves privadas e objetos internos complexos (node-forge) NUNCA são expostos ao renderer via IPC.
 * 2. O renderer recebe estritamente metadados públicos e certificados limpos (certInfo serializável).
 * 3. Limites estritos de payload (tamanho de certificado e documento) previnem exaustão de memória/DoS.
 */

import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';
import { validateIpcSender } from './ipcValidator';
import type { Pkcs12CertificateInfo } from '../../src/services/padesSignatureService';

function getIpcMain(): any {
  try {
    // @ts-ignore
    const electron = require('electron');
    return electron?.ipcMain || null;
  } catch {
    return null;
  }
}

export const MAX_PADES_CERTIFICATE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB para pacotes PKCS#12 (.pfx/.p12)
export const MAX_PADES_PDF_SIZE_BYTES = 200 * 1024 * 1024;         // 200 MB para documentos PDF

/**
 * Valida o tamanho do buffer para mitigar ataques de Denial-of-Service por estouro de memória no processo principal.
 */
export function validatePadesPayloadSize(size: number, maxAllowed: number, typeName: string): void {
  if (size > maxAllowed) {
    const sizeMb = (size / (1024 * 1024)).toFixed(1);
    const limitMb = (maxAllowed / (1024 * 1024)).toFixed(0);
    throw new Error(`O arquivo de ${typeName} (${sizeMb} MB) excede o limite máximo permitido de ${limitMb} MB.`);
  }
}

/**
 * Sanitiza certInfo para um objeto puramente serializável e seguro para trânsito IPC,
 * eliminando qualquer risco de vazamento de chave privada ou métodos de objetos C++/Forge.
 */
export function sanitizeCertInfoForIpc(certInfo: Pkcs12CertificateInfo): Pkcs12CertificateInfo {
  return {
    commonName: String(certInfo.commonName || ''),
    organization: String(certInfo.organization || ''),
    country: String(certInfo.country || ''),
    cpfCnpj: certInfo.cpfCnpj ? String(certInfo.cpfCnpj) : undefined,
    issuer: String(certInfo.issuer || ''),
    serialNumber: String(certInfo.serialNumber || ''),
    notBefore: new Date(certInfo.notBefore),
    notAfter: new Date(certInfo.notAfter),
    isValidTemporal: Boolean(certInfo.isValidTemporal),
    fingerprintSha256: String(certInfo.fingerprintSha256 || ''),
    isSelfSigned: Boolean(certInfo.isSelfSigned),
    isIcpBrasil: Boolean(certInfo.isIcpBrasil),
    hasIcpBrasilClues: Boolean(certInfo.hasIcpBrasilClues),
    trustStatus: certInfo.trustStatus,
    legalSignatureType: certInfo.legalSignatureType,
    hasLegalPresumption: Boolean(certInfo.hasLegalPresumption),
    legalClassificationText: String(certInfo.legalClassificationText || ''),
    legalBasis: String(certInfo.legalBasis || ''),
    juridicalWarning: certInfo.juridicalWarning ? String(certInfo.juridicalWarning) : undefined,
    hasCrlOrOcspDeclared: Boolean(certInfo.hasCrlOrOcspDeclared)
  };
}

export function registerPadesHandlers(getMainWindow: () => BrowserWindow | null): void {
  const ipcMain = getIpcMain();
  if (!ipcMain) return;

  // 1. Inspecionar Certificado Digital PKCS#12
  ipcMain.handle('pades:parseCertificate', async (event: IpcMainInvokeEvent, options: { p12Buffer: Uint8Array | number[] | ArrayBuffer; password: string }) => {
    validateIpcSender(event, 'pades:parseCertificate', getMainWindow());

    if (!options || !options.p12Buffer || typeof options.password !== 'string') {
      throw new Error('Parâmetros obrigatórios ausentes para inspeção de certificado PKCS#12.');
    }

    const buf = options.p12Buffer instanceof Uint8Array ? options.p12Buffer : new Uint8Array(options.p12Buffer as any);
    validatePadesPayloadSize(buf.length, MAX_PADES_CERTIFICATE_SIZE_BYTES, 'certificado PKCS#12');

    const { PadesSignatureService } = await import('../../src/services/padesSignatureService');
    const parsed = PadesSignatureService.parseCertificate(buf, options.password);

    // SEGURANÇA E ISOLAMENTO CRÍTICO:
    // Retornar estritamente o objeto de metadados sanitizado certInfo.
    // A chave privada e os certificados internos do node-forge são descartados do retorno IPC.
    const safeCertInfo = sanitizeCertInfoForIpc(parsed.certInfo);

    // Descarte explícito das referências sensíveis da memória
    (parsed as any).privateKey = null;
    (parsed as any).certificate = null;
    (parsed as any).caCertificates = null;

    return { certInfo: safeCertInfo };
  });

  // 2. Assinar Digitalmente PDF (PAdES)
  ipcMain.handle('pades:signPdf', async (event: IpcMainInvokeEvent, options: { pdfBuffer: Uint8Array | number[] | ArrayBuffer; p12Buffer: Uint8Array | number[] | ArrayBuffer; password: string; signOptions?: any }) => {
    validateIpcSender(event, 'pades:signPdf', getMainWindow());

    if (!options || !options.pdfBuffer || !options.p12Buffer || typeof options.password !== 'string') {
      throw new Error('Parâmetros obrigatórios ausentes para assinatura digital PAdES.');
    }

    const pdfBuf = options.pdfBuffer instanceof Uint8Array ? options.pdfBuffer : new Uint8Array(options.pdfBuffer as any);
    validatePadesPayloadSize(pdfBuf.length, MAX_PADES_PDF_SIZE_BYTES, 'documento PDF');

    const p12Buf = options.p12Buffer instanceof Uint8Array ? options.p12Buffer : new Uint8Array(options.p12Buffer as any);
    validatePadesPayloadSize(p12Buf.length, MAX_PADES_CERTIFICATE_SIZE_BYTES, 'certificado PKCS#12');

    const { PadesSignatureService } = await import('../../src/services/padesSignatureService');
    return await PadesSignatureService.signPdf(pdfBuf, p12Buf, options.password, options.signOptions);
  });

  // 3. Auditar e Verificar Assinaturas PAdES em PDF
  ipcMain.handle('pades:verifyPdf', async (event: IpcMainInvokeEvent, pdfBuffer: Uint8Array | number[] | ArrayBuffer) => {
    validateIpcSender(event, 'pades:verifyPdf', getMainWindow());

    if (!pdfBuffer) {
      throw new Error('Buffer do documento PDF ausente para verificação PAdES.');
    }

    const buf = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer as any);
    validatePadesPayloadSize(buf.length, MAX_PADES_PDF_SIZE_BYTES, 'documento PDF');

    const { PadesSignatureService } = await import('../../src/services/padesSignatureService');
    return PadesSignatureService.verifyPdf(buf);
  });
}
