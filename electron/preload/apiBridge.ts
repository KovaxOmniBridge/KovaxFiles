/**
 * KovaxFiles Desktop — Electron ContextBridge API Implementation
 * Expõe as APIs nativas do sistema com segurança para a janela isolada no renderer.
 */

import { contextBridge, ipcRenderer } from 'electron';

export function exposeElectronApi(): void {
  contextBridge.exposeInMainWorld('electronAPI', {
    openFileDialog: (options?: { multi?: boolean; extensions?: string[] }): Promise<string[] | null> => {
      return ipcRenderer.invoke('dialog:openFile', options);
    },
    saveFileDialog: (defaultName?: string): Promise<string | null> => {
      return ipcRenderer.invoke('dialog:saveFile', defaultName);
    },
    saveExportedFile: (defaultName: string, buffer: Uint8Array | ArrayBuffer): Promise<{ canceled?: boolean; success?: boolean; filePath?: string; error?: string }> => {
      return ipcRenderer.invoke('file:saveExportedFile', { defaultName, buffer });
    },
    openPath: (filePath: string): Promise<string> => {
      return ipcRenderer.invoke('system:openPath', filePath);
    },
    showItemInFolder: (filePath: string): Promise<boolean> => {
      return ipcRenderer.invoke('system:showItemInFolder', filePath);
    },
    // Serviço criptográfico em contexto apropriado (IPC restrito e isolado)
    padesVerifyPdf: (pdfBuffer: Uint8Array | ArrayBuffer): Promise<any> => {
      return ipcRenderer.invoke('pades:verifyPdf', pdfBuffer);
    },
    padesSignPdf: (options: { pdfBuffer: Uint8Array | ArrayBuffer; p12Buffer: Uint8Array | ArrayBuffer; password: string; signOptions?: any }): Promise<Uint8Array> => {
      return ipcRenderer.invoke('pades:signPdf', options);
    },
    padesParseCertificate: (options: { p12Buffer: Uint8Array | ArrayBuffer; password: string }): Promise<any> => {
      return ipcRenderer.invoke('pades:parseCertificate', options);
    },
    isElectron: true
  });
}
