import { app, BrowserWindow, ipcMain, dialog, shell, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import os from 'os';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

// Extensões de arquivos expressamente autorizadas para manipulação e visualização documental
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.heic',
  '.docx', '.txt', '.md', '.json', '.zip', '.csv'
]);

// Lista de extensões perigosas ou executáveis bloqueadas incondicionalmente
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh',
  '.ps1', '.ps1xml', '.ps2', '.ps2xml', '.psc1', '.psc2', '.msh', '.msh1', '.msh2',
  '.msi', '.msp', '.com', '.scr', '.pif', '.reg', '.dll', '.cpl', '.hta', '.jar', '.lnk',
  '.scf', '.inf', '.sys', '.sh', '.bash', '.app', '.dmg', '.pkg'
]);

/**
 * Validador estrito de caminhos de arquivos para mitigar riscos de Path Traversal,
 * injeção de executáveis e acesso indevido ao sistema operacional pelo renderer.
 */
function validateSafeFilePath(inputPath: unknown): { valid: boolean; normalizedPath?: string; error?: string } {
  if (typeof inputPath !== 'string' || inputPath.trim().length === 0) {
    return { valid: false, error: 'Caminho de arquivo inválido ou vazio.' };
  }

  // Previne injeção de byte nulo (\0 poisoning)
  if (inputPath.includes('\0')) {
    return { valid: false, error: 'Tentativa de injeção de caractere nulo detectada.' };
  }

  // Previne caminhos UNC remotos (ex: \\malicious.com\share ou //smb/...)
  if (inputPath.startsWith('\\\\') || inputPath.startsWith('//')) {
    return { valid: false, error: 'Caminhos de rede UNC remotos não são permitidos por segurança.' };
  }

  // Previne esquemas de protocolos perigosos (javascript:, data:, vbscript:, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(inputPath) && !/^[a-zA-Z]:[\\\/]/.test(inputPath)) {
    return { valid: false, error: 'Esquemas de protocolo de URL não são autorizados em caminhos locais.' };
  }

  try {
    const resolved = path.resolve(inputPath);

    // Exige caminho canônico e absoluto
    if (!path.isAbsolute(resolved)) {
      return { valid: false, error: 'O caminho do arquivo deve ser absoluto.' };
    }

    // Valida existência física no disco
    if (!fs.existsSync(resolved)) {
      return { valid: false, error: 'O arquivo ou diretório especificado não foi encontrado.' };
    }

    // Resolve links simbólicos (symlinks / junctions) para inspecionar o arquivo real de destino
    const canonical = fs.realpathSync(resolved);

    const stat = fs.statSync(canonical);
    if (stat.isDirectory()) {
      return { valid: true, normalizedPath: canonical };
    }

    // Se for arquivo regular, valida a extensão real
    const ext = path.extname(canonical).toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      return { valid: false, error: `Abertura bloqueada: extensões executáveis (${ext}) são proibidas por segurança.` };
    }

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return { valid: false, error: `Extensão não autorizada (${ext}). Apenas documentos e imagens permitidos.` };
    }

    return { valid: true, normalizedPath: canonical };
  } catch (err: any) {
    return { valid: false, error: `Falha na sanitização de caminho: ${err?.message || 'Caminho malformado'}` };
  }
}

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

  if (result.canceled) return null;
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

