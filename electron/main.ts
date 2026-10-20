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
import { runPadesE2eRealElectronTest } from './main/padesE2eRunner';
import { runDocumentJourney } from './main/documentJourneyRunner';
import { runCleanEnvironmentPackagedTest } from './main/cleanEnvironmentRunner';

export * from './pathSecurity';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const preloadPath = path.join(__dirname, 'preload.cjs');
const windowManager = new WindowManager(preloadPath);
const isJourneyTest = process.argv.includes('--document-journey') || process.argv.includes('--document-journey-negative');
const isSmokeTest = process.argv.includes('--smoke-test') || process.argv.includes('--test-clean-environment');
const isPadesE2eTest = process.argv.includes('--test-pades-e2e');

app.whenReady().then(() => {
  // 1. Configurar segurança de sessão (bloqueio de rede e CSP estrita)
  configureSessionSecurity();

  // 2. Registrar todos os canais IPC validados
  registerAllIpcHandlers(() => windowManager.getMainWindow());

  // 3. Suporte a Smoke Test / Teste de Execução em Ambiente Limpo (CI / Testes Automatizados)
  if (isSmokeTest || isJourneyTest) {
    const timer = setTimeout(() => { console.error('Packaged smoke timeout'); app.exit(1); }, 150000);
    const fail = (_event: unknown, ...detail: unknown[]) => { console.error('Packaged smoke runtime failure', ...detail); app.exit(1); };
    process.on('uncaughtException', e => { console.error(e); app.exit(1); });
    process.on('unhandledRejection', e => { console.error(e); app.exit(1); });
    const win = windowManager.createWindow();
    win.webContents.on('did-fail-load', fail);
    win.webContents.on('preload-error', fail);
    win.webContents.on('render-process-gone', fail);
    win.webContents.on('console-message', (_event, level, message) => { if (level === 3) { console.error(message); app.exit(1); } });
    win.webContents.once('did-finish-load', async () => {
      if (isJourneyTest) await runDocumentJourney(win);
      else await runCleanEnvironmentPackagedTest(win);
      clearTimeout(timer);
    });
    return;
  }

  // 4. Suporte a Teste E2E de Integração Criptográfica Real no Electron
  if (isPadesE2eTest) {
    const win = windowManager.createWindow();
    win.webContents.once('did-finish-load', async () => {
      await runPadesE2eRealElectronTest(win);
    });
    return;
  }

  // 4. Inicializar a janela principal da aplicação
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
