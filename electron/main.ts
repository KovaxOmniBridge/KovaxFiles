import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import http from 'http';

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

// IPC Handler para diagnóstico e health-check real da IA local (porta 18888)
ipcMain.handle('ai:getStatus', async () => {
  const cpuCores = os.cpus().length;
  const port = 18888;

  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: 1500 }, (res) => {
      if (res.statusCode === 200) {
        // Probe de modelo carregado via /v1/models
        http.get(`http://127.0.0.1:${port}/v1/models`, { timeout: 1500 }, (modelsRes) => {
          let data = '';
          modelsRes.on('data', chunk => { data += chunk; });
          modelsRes.on('end', () => {
            try {
              const json = JSON.parse(data);
              const modelId = json.data?.[0]?.id || 'Modelo Local C++ Ativo';
              resolve({
                running: true,
                port,
                cpuCores,
                modelName: modelId,
                isGpuAccelerated: false
              });
            } catch {
              resolve({
                running: true,
                port,
                cpuCores,
                modelName: 'Servidor Local C++ Ativo (Porta 18888)',
                isGpuAccelerated: false
              });
            }
          });
        }).on('error', () => {
          resolve({
            running: true,
            port,
            cpuCores,
            modelName: 'Servidor Local C++ Ativo (Porta 18888)',
            isGpuAccelerated: false
          });
        });
      } else {
        resolve({
          running: false,
          port,
          cpuCores,
          modelName: `Servidor Offline (HTTP ${res.statusCode})`,
          isGpuAccelerated: false
        });
      }
    });

    req.on('error', () => {
      resolve({
        running: false,
        port,
        cpuCores,
        modelName: 'Servidor Offline (Porta 18888 não responde)',
        isGpuAccelerated: false
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        running: false,
        port,
        cpuCores,
        modelName: 'Servidor Offline (Timeout na porta 18888)',
        isGpuAccelerated: false
      });
    });
  });
});

