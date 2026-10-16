/**
 * KovaxFiles Desktop — Electron Dialog IPC Handlers
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import path from 'path';
import { validateIpcSender } from './ipcValidator';
import {
  ALLOWED_EXTENSIONS,
  DANGEROUS_EXTENSIONS,
  authorizeSessionPath
} from '../pathSecurity';

export function registerDialogHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('dialog:openFile', async (event, options?: { multi?: boolean; extensions?: string[] }) => {
    validateIpcSender(event, 'dialog:openFile', getMainWindow());

    let safeExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'heic', 'docx', 'md', 'txt'];
    if (Array.isArray(options?.extensions) && options.extensions.length > 0) {
      const filtered = options.extensions
        .filter((ext): ext is string => typeof ext === 'string')
        .map(ext => ext.replace(/^\./, '').toLowerCase().trim())
        .filter(ext => /^[a-z0-9]+$/.test(ext) && !DANGEROUS_EXTENSIONS.has(`.${ext}`) && ALLOWED_EXTENSIONS.has(`.${ext}`));
      if (filtered.length > 0) {
        safeExtensions = filtered;
      }
    }

    const filters = [
      { name: 'Documentos Permitidos', extensions: safeExtensions },
      { name: 'Documentos e PDFs', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'heic', 'docx', 'md', 'txt'] }
    ];

    const win = getMainWindow();
    if (!win) return null;

    const result = await dialog.showOpenDialog(win, {
      properties: options?.multi ? ['openFile', 'multiSelections'] : ['openFile'],
      filters
    });

    if (result.canceled || !result.filePaths) return null;
    for (const filePath of result.filePaths) {
      authorizeSessionPath(filePath);
    }
    return result.filePaths;
  });

  ipcMain.handle('dialog:saveFile', async (event, defaultName?: string) => {
    validateIpcSender(event, 'dialog:saveFile', getMainWindow());

    let safeDefaultName = 'documento_processado.pdf';
    if (typeof defaultName === 'string' && defaultName.trim().length > 0) {
      const base = path.basename(defaultName.trim()).replace(/[/\\?%*:|"<>]/g, '_');
      const ext = path.extname(base).toLowerCase();
      if (ext && !DANGEROUS_EXTENSIONS.has(ext) && ALLOWED_EXTENSIONS.has(ext)) {
        safeDefaultName = base;
      } else {
        const nameWithoutExt = ext ? base.slice(0, -ext.length) : base;
        safeDefaultName = `${nameWithoutExt || 'documento_processado'}.pdf`;
      }
    }

    const win = getMainWindow();
    if (!win) return null;

    const result = await dialog.showSaveDialog(win, {
      defaultPath: safeDefaultName,
      filters: [{ name: 'Documento PDF', extensions: ['pdf'] }]
    });

    if (result.canceled || !result.filePath) return null;
    authorizeSessionPath(result.filePath);
    return result.filePath;
  });
}
