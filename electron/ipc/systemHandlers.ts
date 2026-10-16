/**
 * KovaxFiles Desktop — Electron System IPC Handlers (Open path, show in folder)
 */

import { ipcMain, shell, BrowserWindow } from 'electron';
import { validateIpcSender } from './ipcValidator';
import { validateSafeFilePath } from '../pathSecurity';

export function registerSystemHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('system:openPath', async (event, filePath: string) => {
    validateIpcSender(event, 'system:openPath', getMainWindow());

    const validation = validateSafeFilePath(filePath);
    if (!validation.valid || !validation.normalizedPath) {
      console.warn(`[Segurança Electron] Requisição bloqueada em system:openPath: ${validation.error} (Entrada: ${filePath})`);
      return validation.error || 'Caminho de arquivo inválido ou inseguro.';
    }
    return await shell.openPath(validation.normalizedPath);
  });

  ipcMain.handle('system:showItemInFolder', async (event, filePath: string) => {
    validateIpcSender(event, 'system:showItemInFolder', getMainWindow());

    const validation = validateSafeFilePath(filePath);
    if (!validation.valid || !validation.normalizedPath) {
      console.warn(`[Segurança Electron] Requisição bloqueada em system:showItemInFolder: ${validation.error} (Entrada: ${filePath})`);
      return false;
    }
    shell.showItemInFolder(validation.normalizedPath);
    return true;
  });
}
