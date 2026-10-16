/**
 * KovaxFiles Desktop — Electron PAdES Cryptographic Service IPC Handlers
 */

import { ipcMain, BrowserWindow } from 'electron';
import { validateIpcSender } from './ipcValidator';

export function registerPadesHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('pades:parseCertificate', async (event, options: { p12Buffer: Uint8Array | number[] | ArrayBuffer; password: string }) => {
    validateIpcSender(event, 'pades:parseCertificate', getMainWindow());

    const { PadesSignatureService } = await import('../../src/services/padesSignatureService');
    const buf = options.p12Buffer instanceof Uint8Array ? options.p12Buffer : new Uint8Array(options.p12Buffer as any);
    return PadesSignatureService.parseCertificate(buf, options.password);
  });

  ipcMain.handle('pades:signPdf', async (event, options: { pdfBuffer: Uint8Array | number[] | ArrayBuffer; p12Buffer: Uint8Array | number[] | ArrayBuffer; password: string; signOptions?: any }) => {
    validateIpcSender(event, 'pades:signPdf', getMainWindow());

    const { PadesSignatureService } = await import('../../src/services/padesSignatureService');
    const pdfBuf = options.pdfBuffer instanceof Uint8Array ? options.pdfBuffer : new Uint8Array(options.pdfBuffer as any);
    const p12Buf = options.p12Buffer instanceof Uint8Array ? options.p12Buffer : new Uint8Array(options.p12Buffer as any);
    return await PadesSignatureService.signPdf(pdfBuf, p12Buf, options.password, options.signOptions);
  });

  ipcMain.handle('pades:verifyPdf', async (event, pdfBuffer: Uint8Array | number[] | ArrayBuffer) => {
    validateIpcSender(event, 'pades:verifyPdf', getMainWindow());

    const { PadesSignatureService } = await import('../../src/services/padesSignatureService');
    const buf = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer as any);
    return PadesSignatureService.verifyPdf(buf);
  });
}
