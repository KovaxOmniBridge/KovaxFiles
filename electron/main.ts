/**
 * KovaxFiles Desktop — Electron Main Process Entry Point
 * Orquestra WindowManager, SessionSecurity e IPC Handlers de forma modular e desacoplada.
 */

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

import { WindowManager } from './main/windowManager';
import { configureSessionSecurity } from './main/sessionSecurity';
import { registerAllIpcHandlers } from './ipc';

export * from './pathSecurity';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const preloadPath = path.join(__dirname, 'preload.cjs');
const windowManager = new WindowManager(preloadPath);

app.whenReady().then(() => {
  // 1. Configurar segurança de sessão (bloqueio de rede e CSP estrita)
  configureSessionSecurity();

  // 2. Registrar todos os canais IPC validados
  registerAllIpcHandlers(() => windowManager.getMainWindow());

  // 3. Inicializar a janela principal da aplicação
  windowManager.createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
