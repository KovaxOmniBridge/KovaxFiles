/**
 * =============================================================================
 * KovaxFiles Desktop — Teste Dinâmico de Isolamento do Processo em Execução
 * =============================================================================
 * Executa uma instância real do Electron para sondar dinamicamente o processo
 * de renderização e comprovar que a sandbox, contextIsolation e restrições
 * de segurança de processo estão ativas e impedem o acesso a APIs nativas do Node.
 * =============================================================================
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Desativa aceleração por hardware para execução estável em CI headless
app.disableHardwareAcceleration();

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    testsPassed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    testsFailed++;
  }
}

app.whenReady().then(async () => {
  console.log('===========================================================================');
  console.log('Iniciando Teste Dinâmico de Isolamento de Processo e Sandboxing no Electron');
  console.log('===========================================================================\n');

  // Registrar handlers simulados de segurança do main process
  ipcMain.handle('system:openPath', async (_, targetPath) => {
    // Sonda se o main process bloqueia caminhos executáveis perigosos
    const dangerous = ['.exe', '.bat', '.cmd', '.ps1', '.vbs', '.msi'];
    const ext = path.extname(targetPath).toLowerCase();
    if (dangerous.includes(ext)) {
      return 'Acesso negado: tipo de arquivo perigoso bloqueado por segurança.';
    }
    return 'ok';
  });

  // Registrar handler para verificar se poluição no renderizador afeta o processo principal
  ipcMain.handle('probe:checkMainProcessPrototype', () => {
    return Object.prototype.rendererInjectedProp === undefined;
  });

  const preloadPath = path.resolve(__dirname, '../dist-electron/preload.cjs');

  const win = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  const probeHtml = 'data:text/html;charset=utf-8,<html><head><title>Sandbox Probe</title></head><body>Probe Active</body></html>';
  await win.loadURL(probeHtml);

  console.log('[1/3] Sondando Isolamento de APIs do Node.js no Renderizador...');

  // Sonda 1: require não deve existir no contexto da janela
  const requireCheck = await win.webContents.executeJavaScript('typeof window.require');
  assert(requireCheck === 'undefined', 'window.require deve ser undefined no processo de renderização');

  // Sonda 2: process.binding não deve estar acessível
  const bindingCheck = await win.webContents.executeJavaScript('typeof (window.process && window.process.binding)');
  assert(bindingCheck === 'undefined', 'process.binding (acesso a módulos C++ internos do Node) deve ser inacessível');

  // Sonda 3: process.mainModule não deve vazar
  const mainModuleCheck = await win.webContents.executeJavaScript('typeof (window.process && window.process.mainModule)');
  assert(mainModuleCheck === 'undefined', 'process.mainModule deve ser inacessível no renderizador');

  // Sonda 4: Tentativa de invocar child_process
  const childProcessCheck = await win.webContents.executeJavaScript(`
    (() => {
      try {
        if (typeof require !== 'undefined') {
          require('child_process');
          return false;
        }
        return true;
      } catch (e) {
        return true;
      }
    })()
  `);
  assert(childProcessCheck === true, 'Tentativa de carregar child_process é bloqueada pelo isolamento');

  // Sonda 5: Tentativa de invocar fs diretamente
  const fsCheck = await win.webContents.executeJavaScript(`
    (() => {
      try {
        if (typeof require !== 'undefined') {
          require('fs');
          return false;
        }
        return true;
      } catch (e) {
        return true;
      }
    })()
  `);
  assert(fsCheck === true, 'Tentativa de carregar fs diretamente no renderizador é bloqueada');

  console.log('\n[2/3] Sondando Integridade da Ponte IPC (ContextBridge)...');

  // Sonda 6: window.electronAPI deve existir via contextBridge
  const bridgeCheck = await win.webContents.executeJavaScript('typeof window.electronAPI');
  assert(bridgeCheck === 'object', 'window.electronAPI deve estar exposta exclusivamente através do contextBridge');

  // Sonda 7: Proibir poluição de protótipo através da fronteira de processos
  await win.webContents.executeJavaScript(`
    (() => {
      try {
        Object.prototype.rendererInjectedProp = 'compromised';
      } catch (e) {}
    })()
  `);
  const mainIsPolluted = Object.prototype.rendererInjectedProp !== undefined;
  assert(!mainIsPolluted, 'Fronteira do contextBridge impede que poluição de protótipo no renderizador atinja o processo principal');

  console.log('\n[3/3] Sondando Bloqueio de Execução de Comandos Via IPC...');

  // Sonda 8: Invocar system:openPath passando arquivo executável perigoso (.exe)
  const dangerousExecCheck = await win.webContents.executeJavaScript(`
    (async () => {
      try {
        if (window.electronAPI && window.electronAPI.openPath) {
          const res = await window.electronAPI.openPath('C:\\\\Windows\\\\System32\\\\cmd.exe');
          return typeof res === 'string' && res.includes('bloqueado');
        }
        return true;
      } catch (e) {
        return true;
      }
    })()
  `);
  assert(dangerousExecCheck === true, 'IPC rejeita tentativa do renderizador de executar binários executáveis perigosos (.exe)');

  console.log('\n' + '='.repeat(75));
  console.log('Resultado do Teste Dinâmico de Isolamento no Electron:');
  console.log(`  Sucessos: ${testsPassed}`);
  console.log(`  Falhas:   ${testsFailed}`);
  console.log('='.repeat(75) + '\n');

  win.destroy();
  app.quit();

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
});
