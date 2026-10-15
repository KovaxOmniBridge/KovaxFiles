import { app, BrowserWindow, ipcMain, dialog, shell, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import os from 'os';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

import {
  ALLOWED_EXTENSIONS,
  DANGEROUS_EXTENSIONS,
  sessionAuthorizedFiles,
  sessionAuthorizedDirectories,
  authorizeSessionPath,
  validateFileContentMatchesType,
  validateSafeFilePath
} from './pathSecurity.ts';

import {
  probeAiDiagnostics,
  evaluateInstructionAdherence,
  evaluateLegalBenchmark,
  type AiDiagnosticTier,
  type AiDiagnosticResult,
  type InstructionTestResult,
  type LegalBenchmarkResult
} from './aiDiagnostic.ts';

export {
  ALLOWED_EXTENSIONS,
  DANGEROUS_EXTENSIONS,
  sessionAuthorizedFiles,
  sessionAuthorizedDirectories,
  authorizeSessionPath,
  validateFileContentMatchesType,
  validateSafeFilePath,
  probeAiDiagnostics,
  evaluateInstructionAdherence,
  evaluateLegalBenchmark,
  type AiDiagnosticTier,
  type AiDiagnosticResult,
  type InstructionTestResult,
  type LegalBenchmarkResult
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 980,
    minHeight: 650,
    title: 'KovaxFiles Desktop — Engenharia Documental 100% Local',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    show: false
  });

  // Mostrar janela somente quando pronta para evitar flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  // Interceptar criação de novas janelas: apenas links externos http/https no navegador do SO
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Interceptar navegações internas indevidas
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isDev && process.env.VITE_DEV_SERVER_URL && url.startsWith(process.env.VITE_DEV_SERVER_URL)) {
      return;
    }
    event.preventDefault();
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // Em produção carrega o build da pasta dist
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Rejeitar solicitações de permissões não requeridas pela aplicação
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers para operações nativas locais do sistema com validação rigorosa de segurança
ipcMain.handle('dialog:openFile', async (_, options?: { multi?: boolean; extensions?: string[] }) => {
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

  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: options?.multi ? ['openFile', 'multiSelections'] : ['openFile'],
    filters
  });

  if (result.canceled || !result.filePaths) return null;
  for (const filePath of result.filePaths) {
    authorizeSessionPath(filePath);
  }
  return result.filePaths;
});

ipcMain.handle('dialog:saveFile', async (_, defaultName?: string) => {
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

  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: safeDefaultName,
    filters: [{ name: 'Documento PDF', extensions: ['pdf'] }]
  });

  if (result.canceled || !result.filePath) return null;
  authorizeSessionPath(result.filePath);
  return result.filePath;
});

ipcMain.handle('system:openPath', async (_, filePath: string) => {
  const validation = validateSafeFilePath(filePath);
  if (!validation.valid || !validation.normalizedPath) {
    console.warn(`[Segurança Electron] Requisição bloqueada em system:openPath: ${validation.error} (Entrada: ${filePath})`);
    return validation.error || 'Caminho de arquivo inválido ou inseguro.';
  }
  return await shell.openPath(validation.normalizedPath);
});

ipcMain.handle('system:showItemInFolder', async (_, filePath: string) => {
  const validation = validateSafeFilePath(filePath);
  if (!validation.valid || !validation.normalizedPath) {
    console.warn(`[Segurança Electron] Requisição bloqueada em system:showItemInFolder: ${validation.error} (Entrada: ${filePath})`);
    return false;
  }
  shell.showItemInFolder(validation.normalizedPath);
  return true;
});

// IPC Handler para diagnóstico da IA local em 4 níveis (Disponibilidade, Modelo, Inferência, Qualidade Jurídica)
ipcMain.handle('ai:getStatus', async () => {
  return await probeAiDiagnostics({
    port: 18888,
    healthTimeoutMs: 1500,
    modelsTimeoutMs: 2500,
    inferenceTimeoutMs: 8000
  });
});

