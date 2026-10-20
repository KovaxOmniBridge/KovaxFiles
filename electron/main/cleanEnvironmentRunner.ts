import { BrowserWindow, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { assertRendererReady, assertOcrAssets, assertPdfExport } from './packagedSmokeChecks';

/** Automated packaged diagnostic. Clean-machine installer acceptance is separate. */
export async function runCleanEnvironmentPackagedTest(win: BrowserWindow): Promise<void> {
  const temp = fs.mkdtempSync(path.join(app.getPath('temp'), 'kovax-pdf-'));
  let exitCode = 0;
  const requireCheck = (condition: unknown, label: string) => { if (!condition) throw new Error(label); };
  try {
    requireCheck(app.isPackaged, 'Smoke exige aplicativo empacotado');
    // Wait for React commit, then use a real navigation control to exercise state.
    await win.webContents.executeJavaScript(`(async () => {
      const deadline = Date.now() + 15000;
      while (!document.querySelector('#root main') || !document.querySelector('#root button')) {
        if (Date.now() > deadline) throw new Error('React não montou');
        await new Promise(r => setTimeout(r, 100));
      }
      const button = [...document.querySelectorAll('#root button')].find(b => b.textContent.includes('Editor de Documentos'));
      if (!button) throw new Error('Navegação React ausente');
      button.click();
      await new Promise(r => setTimeout(r, 300));
      if (!document.querySelector('[contenteditable="true"]')) throw new Error('Navegação React não funcionou');
    })()`);
    const snapshot = await win.webContents.executeJavaScript(`({
      mounted: !!document.querySelector('#root main'),
      interactive: !!document.querySelector('[contenteditable="true"]'),
      preload: typeof window.electronAPI?.getAppVersion === 'function',
      isolated: typeof require === 'undefined' && (typeof process === 'undefined' || typeof process.binding === 'undefined')
    })`);
    assertRendererReady(snapshot);
    console.log('[PackagedSmoke:Interface]');
    const version = await win.webContents.executeJavaScript(`(async () => {
      if (typeof require !== 'undefined' || (typeof process !== 'undefined' && process.binding)) throw new Error('Isolamento violado');
      const api = window.electronAPI;
      if (!api || typeof api.padesVerifyPdf !== 'function' || typeof api.saveExportedFile !== 'function') throw new Error('Preload ausente');
      return await api.getAppVersion();
    })()`);
    requireCheck(version === app.getVersion(), 'Versão IPC divergente');
    console.log('[PackagedSmoke:Preload]\n[PackagedSmoke:IPC]');
    const assets = path.join(app.getAppPath(), 'dist/tessdata');
    assertOcrAssets(file => fs.statSync(path.join(assets, file)).size);
    const result = await win.webContents.executeJavaScript('window.runPackagedRendererSmoke()');
    requireCheck(result.text.includes('DOCUMENTO'), 'OCR não reconheceu referência');
    console.log('[PackagedSmoke:OCR]');
    const exported = path.join(temp, 'exported.pdf');
    fs.writeFileSync(exported, Buffer.from(result.pdf));
    const reopened = await PDFDocument.load(fs.readFileSync(exported));
    assertPdfExport(reopened.getPageCount());
    console.log('[PackagedSmoke:PDF-IO]');
    const errors = await win.webContents.executeJavaScript('window.packagedSmokeErrors');
    requireCheck(Array.isArray(errors) && errors.length === 0, `Erros renderer: ${JSON.stringify(errors)}`);
    console.log('[PackagedSmoke:Complete]');
  } catch (error) {
    console.error('[PackagedSmoke:Failure]', error);
    exitCode = 1;
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
  app.exit(exitCode);
}
