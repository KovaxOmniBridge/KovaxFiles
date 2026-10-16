/**
 * KovaxFiles Desktop — Electron Window Manager
 * Cria e configura a janela principal com isolamento de contexto, sandbox e proteção de navegação.
 */

import { BrowserWindow, shell, app } from 'electron';
import path from 'path';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private readonly preloadPath: string;

  constructor(preloadPath: string) {
    this.preloadPath = preloadPath;
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  createWindow(): BrowserWindow {
    this.mainWindow = new BrowserWindow({
      width: 1280,
      height: 850,
      minWidth: 980,
      minHeight: 650,
      title: 'KovaxFiles Desktop — Engenharia Documental 100% Local',
      backgroundColor: '#0f172a',
      webPreferences: {
        preload: this.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false
      },
      show: false
    });

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

    // Interceptar criação de novas janelas: apenas links externos http/https no navegador do SO
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https:') || url.startsWith('http:')) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    // Interceptar navegações internas indevidas
    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      if (isDev && process.env.VITE_DEV_SERVER_URL && url.startsWith(process.env.VITE_DEV_SERVER_URL)) {
        return;
      }
      event.preventDefault();
    });

    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
      this.mainWindow.webContents.openDevTools();
    } else {
      // Em produção carrega o build da pasta dist
      const distIndex = path.join(path.dirname(this.preloadPath), '../dist/index.html');
      this.mainWindow.loadFile(distIndex);
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }
}
