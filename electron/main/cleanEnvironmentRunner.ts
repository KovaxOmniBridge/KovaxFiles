/**
 * KovaxFiles Desktop — Clean Environment Packaged Test Runner
 *
 * Executa a homologação completa de distribuição em ambiente limpo (Zero-Dev Runtime):
 * 1. Abertura da interface e renderização do DOM
 * 2. Preload, ContextBridge e Sandboxing
 * 3. Comunicação IPC bidirecional com o processo principal
 * 4. Verificação de integridade dos assets offline de OCR (tessdata) e fontes
 * 5. Operações de PDF e gravação física de arquivos no disco
 */

import { BrowserWindow, app } from 'electron';
import fs from 'fs';
import path from 'path';

export async function runCleanEnvironmentPackagedTest(win: BrowserWindow): Promise<void> {
  console.log('='.repeat(80));
  console.log('  [CleanRuntime] INICIANDO HOMOLOGAÇÃO COMPLETA DE DISTRIBUIÇÃO EM AMBIENTE LIMPO');
  console.log('='.repeat(80));

  try {
    // 1. Verificação da Abertura da Interface e Carregamento do DOM
    if (!win || win.isDestroyed()) {
      throw new Error('Janela principal não foi criada ou foi destruída prematuramente.');
    }

    const currentUrl = win.webContents.getURL();
    console.log(`  -> URL da interface carregada: ${currentUrl}`);

    const domInfo = await win.webContents.executeJavaScript(`
      (() => {
        return {
          title: document.title,
          hasBody: Boolean(document.body),
          hasRoot: Boolean(document.getElementById('root')),
          childCount: document.body ? document.body.children.length : 0
        };
      })()
    `);

    if (!domInfo.hasBody) {
      throw new Error('Interface web não carregou o elemento <body>.');
    }
    console.log('  [CleanRuntime:Interface] Janela principal e DOM carregados com sucesso');

    // 2. Verificação de Preload, ContextBridge e Sandboxing
    const preloadCheck = await win.webContents.executeJavaScript(`
      (() => {
        const api = window.electronAPI || window.electronApi;
        const hasApi = typeof api === 'object' && api !== null;
        const hasPadesVerify = hasApi && typeof api.padesVerifyPdf === 'function';
        const hasGetVersion = hasApi && typeof api.getAppVersion === 'function';
        const hasSave = hasApi && typeof api.saveExportedFile === 'function';
        const isProcessIsolated = typeof process === 'undefined' || typeof process.binding === 'undefined';
        const isRequireBlocked = typeof require === 'undefined';

        return {
          hasApi,
          hasPadesVerify,
          hasGetVersion,
          hasSave,
          isProcessIsolated,
          isRequireBlocked
        };
      })()
    `);

    if (!preloadCheck.hasApi || !preloadCheck.hasPadesVerify || !preloadCheck.hasGetVersion) {
      throw new Error('Objeto window.electronAPI ausente ou incompleto no renderer.');
    }
    if (!preloadCheck.isProcessIsolated || !preloadCheck.isRequireBlocked) {
      throw new Error('Falha de Sandbox: processo interno ou require vazou para o contexto da janela.');
    }
    console.log('  [CleanRuntime:Preload] ContextBridge e API segura expostos no renderer');

    // 3. Verificação de IPC Bidirecional
    const ipcResult = await win.webContents.executeJavaScript(`
      (async () => {
        try {
          const api = window.electronAPI || window.electronApi;
          const version = await api.getAppVersion();
          return { success: true, version };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      })()
    `);

    if (!ipcResult.success || !ipcResult.version) {
      throw new Error(`Chamada IPC getAppVersion falhou: ${ipcResult.error}`);
    }
    console.log(`  -> IPC getAppVersion retornou: v${ipcResult.version}`);
    console.log('  [CleanRuntime:IPC] Comunicação IPC bidirecional validada');

    // 4. Verificação de Ativos Offline de OCR (tessdata) e Fontes Locais
    const appDir = app.getAppPath();
    const possibleTessdataPaths = [
      path.join(appDir, 'dist/tessdata'),
      path.join(process.resourcesPath || '', 'app.asar/dist/tessdata'),
      path.join(process.resourcesPath || '', 'dist/tessdata'),
      path.resolve('dist/tessdata')
    ];

    let tessdataFound = false;
    let foundTessdataPath = '';

    for (const p of possibleTessdataPaths) {
      const modelPath = path.join(p, 'por.traineddata');
      if (fs.existsSync(modelPath)) {
        const stat = fs.statSync(modelPath);
        if (stat.size > 2000000) { // Modelo de língua portuguesa > 2 MB
          tessdataFound = true;
          foundTessdataPath = p;
          break;
        }
      }
    }

    if (!tessdataFound) {
      throw new Error(`Ativos de OCR offline (por.traineddata > 2MB) não encontrados em nenhum dos caminhos de produção.`);
    }

    const workerJs = path.join(foundTessdataPath, 'worker.min.js');
    const wasmFile = path.join(foundTessdataPath, 'tesseract-core-lstm.wasm');
    if (!fs.existsSync(workerJs) || !fs.existsSync(wasmFile)) {
      throw new Error('Worker ou WebAssembly do OCR offline ausentes no pacote de distribuição.');
    }
    console.log(`  -> OCR offline verificado em: ${foundTessdataPath}`);
    console.log('  [CleanRuntime:OCR] Ativos offline de OCR (tessdata) confirmados no pacote');

    // 5. Operações de PDF e Gravação Física de Arquivos no Disco
    const tempDir = app.getPath('temp');
    const testPdfPath = path.join(tempDir, `kovax_clean_test_${Date.now()}.pdf`);

    // Sequência binária válida de PDF 1.4 minimal
    const minimalPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 44 >> stream
BT /F1 12 Tf 72 712 Td (KovaxFiles Clean Runtime OK) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000201 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
296
%%EOF`;

    // Gravação física no disco
    fs.writeFileSync(testPdfPath, Buffer.from(minimalPdf, 'utf-8'));
    if (!fs.existsSync(testPdfPath) || fs.statSync(testPdfPath).size === 0) {
      throw new Error(`Falha de I/O: arquivo de teste em ${testPdfPath} não pôde ser gravado.`);
    }

    // Leitura e conferência física
    const readBuffer = fs.readFileSync(testPdfPath);
    if (!readBuffer.toString('utf-8').includes('KovaxFiles Clean Runtime OK')) {
      throw new Error('Falha de leitura ou corrupção de bytes no arquivo gravado.');
    }

    // Remoção limpa do arquivo temporário
    fs.unlinkSync(testPdfPath);
    console.log('  [CleanRuntime:PDF-IO] Operações de PDF e gravação de arquivos validadas');

    console.log('\n' + '='.repeat(80));
    console.log('  [CleanRuntime] HOMOLOGAÇÃO DE DISTRIBUIÇÃO EM AMBIENTE LIMPO: 100% SUCESSO');
    console.log('='.repeat(80));

    // Fechar e sair com código 0
    setTimeout(() => {
      try {
        if (!win.isDestroyed()) win.destroy();
      } catch {}
      app.exit(0);
    }, 200);

  } catch (err: any) {
    console.error(`\n❌ [CleanRuntime:ERRO] Falha na homologação de distribuição limpa: ${err?.message || err}`);
    if (err?.stack) console.error(err.stack);
    setTimeout(() => {
      try {
        if (!win.isDestroyed()) win.destroy();
      } catch {}
      app.exit(1);
    }, 200);
  }
}
