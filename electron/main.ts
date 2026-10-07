import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

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
      sandbox: false
    },
    show: false
  });

  // Mostrar janela somente quando pronta para evitar flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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

// IPC Handlers para operações nativas locais do sistema
ipcMain.handle('dialog:openFile', async (_, options?: { multi?: boolean; extensions?: string[] }) => {
  const filters = options?.extensions && options.extensions.length > 0 
    ? [{ name: 'Documentos', extensions: options.extensions }]
    : [
        { name: 'Documentos e PDFs', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'heic', 'docx', 'md', 'txt'] },
        { name: 'Todos os Arquivos', extensions: ['*'] }
      ];

  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: options?.multi ? ['openFile', 'multiSelections'] : ['openFile'],
    filters
  });

  if (result.canceled) return null;
  return result.filePaths;
});

ipcMain.handle('dialog:saveFile', async (_, defaultName?: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: defaultName || 'documento_processado.pdf',
    filters: [{ name: 'Documento PDF', extensions: ['pdf'] }]
  });

  if (result.canceled) return null;
  return result.filePath;
});

ipcMain.handle('system:openPath', async (_, filePath: string) => {
  return await shell.openPath(filePath);
});

ipcMain.handle('system:showItemInFolder', async (_, filePath: string) => {
  shell.showItemInFolder(filePath);
  return true;
});

