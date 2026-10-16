/**
 * KovaxFiles Desktop — Electron IPC Handler Registry
 */

import { BrowserWindow } from 'electron';
import { registerDialogHandlers } from './dialogHandlers';
import { registerFileHandlers } from './fileHandlers';
import { registerSystemHandlers } from './systemHandlers';
import { registerPadesHandlers } from './padesHandlers';

export function registerAllIpcHandlers(getMainWindow: () => BrowserWindow | null): void {
  registerDialogHandlers(getMainWindow);
  registerFileHandlers(getMainWindow);
  registerSystemHandlers(getMainWindow);
  registerPadesHandlers(getMainWindow);
}

export * from './ipcValidator';
