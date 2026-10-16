/**
 * KovaxFiles Desktop — Electron IPC Sender Validation
 * Assegura que cada chamada IPC partiu exclusivamente da janela principal autorizada
 * e de frames com origens legítimas (checklist de segurança Electron).
 */

import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';

function getIsAppPackaged(): boolean {
  try {
    if ((globalThis as any).process?.versions?.electron) {
      // @ts-ignore
      const electron = require('electron');
      if (electron?.app) return electron.app.isPackaged;
    }
    return process.env.NODE_ENV === 'production';
  } catch {
    return process.env.NODE_ENV === 'production';
  }
}

export function validateIpcSender(
  event: IpcMainInvokeEvent,
  channel: string,
  mainWindow: BrowserWindow | null
): void {
  const frame = event.senderFrame;
  if (!frame) {
    console.warn(`[Segurança Electron] IPC '${channel}' bloqueado: senderFrame ausente.`);
    throw new Error(`Acesso negado: remetente IPC '${channel}' sem contexto de frame válido.`);
  }

  // Verificar se o remetente é o webContents da nossa janela principal
  if (mainWindow && event.sender !== mainWindow.webContents) {
    console.warn(`[Segurança Electron] IPC '${channel}' bloqueado: sender não coincide com a janela principal.`);
    throw new Error(`Acesso negado: processo remetente IPC '${channel}' não autorizado.`);
  }

  const frameUrl = frame.url;
  const isDev = process.env.NODE_ENV === 'development' || !getIsAppPackaged();

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    if (frameUrl.startsWith(process.env.VITE_DEV_SERVER_URL)) {
      return;
    }
  }

  if (frameUrl.startsWith('file://')) {
    return;
  }

  console.warn(`[Segurança Electron] IPC '${channel}' bloqueado: URL de origem não autorizada (${frameUrl}).`);
  throw new Error(`Acesso negado: URL de origem do remetente IPC '${channel}' inválida.`);
}
