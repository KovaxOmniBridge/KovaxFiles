import { app, dialog, type BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { assertJourneyContent, waitForCondition } from './journeyChecks';

export async function runDocumentJourney(win: BrowserWindow): Promise<void> {
  if (!app.isPackaged) throw new Error('Jornada exige executável empacotado');
  const temp = fs.mkdtempSync(path.join(app.getPath('temp'), 'kovax-journey-'));
  const output = path.join(temp, 'merged.pdf');
  const fault = process.argv.find(arg => arg.startsWith('--journey-fault='))?.split('=')[1];
  const nativeDialog = dialog.showSaveDialog;
  let saveCalls = 0;
  let exitCode = 0;
  const evaluate = (script: string) => win.webContents.executeJavaScript(script);
  const wait = (expression: string, label: string) => waitForCondition(async () => {
    const state = await evaluate(`({ ready: Boolean(${expression}), error: document.querySelector('[data-testid="pdf-error"]')?.textContent, errors: window.packagedSmokeErrors })`);
    if (state.error || state.errors?.length) throw new Error(`${label}: ${state.error || JSON.stringify(state.errors)}`);
    return state.ready;
  }, label);
  const importFiles = async (files: string[]) => {
    for (const file of files) if (!fs.statSync(file).isFile()) throw new Error('Importação: referência indisponível');
    const { root } = await win.webContents.debugger.sendCommand('DOM.getDocument');
    const { nodeId } = await win.webContents.debugger.sendCommand('DOM.querySelector', { nodeId: root.nodeId, selector: '[data-testid="merge-input"]' });
    if (!nodeId) throw new Error('Importação: seletor real ausente');
    await win.webContents.debugger.sendCommand('DOM.setFileInputFiles', { nodeId, files });
  };
  try {
    const references: string[] = [];
    for (const [index, text] of ['M01 REFERENCE ALPHA', 'M01 REFERENCE BETA'].entries()) {
      const doc = await PDFDocument.create(); doc.addPage([600, 800]).drawText(text);
      const file = path.join(temp, `reference-${index}.pdf`);
      fs.writeFileSync(file, fault === 'process' ? Buffer.from('invalid PDF') : await doc.save());
      references.push(file);
    }
    await wait("document.querySelector('[data-tool-id=manipulator]')", 'navegação React');
    await evaluate("document.querySelector('[data-tool-id=manipulator]').click()");
    await wait("document.querySelector('[data-testid=merge-input]')", 'ferramenta de fusão');
    win.webContents.debugger.attach('1.3');
    if (fault === 'import') references[0] = path.join(temp, 'reference-missing.pdf');
    await importFiles(references);
    await wait("document.querySelector('[data-testid=pdf-manipulator]')?.getAttribute('data-file-count') === '2'", 'importação real');
    console.log('[DocumentJourney:Import]');
    await evaluate("document.querySelector('[data-testid=merge-process]').click()");
    await wait("document.querySelector('[data-testid=merge-export]')", 'processamento real');
    console.log('[DocumentJourney:Process]');
    // Only replace the OS dialog in diagnostic mode. IPC validation, adapter,
    // buffer checks, atomic write and session authorization remain production code.
    dialog.showSaveDialog = (async () => {
      saveCalls++;
      return { canceled: false, filePath: fault === 'save' ? path.join(temp, 'missing-directory', 'merged.pdf') : output };
    }) as typeof dialog.showSaveDialog;
    await evaluate("document.querySelector('[data-testid=merge-export]').click()");
    await wait("document.querySelector('[data-testid=pdf-manipulator]')?.getAttribute('data-export-state') === 'saved'", 'exportação IPC');
    if (saveCalls !== 1 || !fs.existsSync(output)) throw new Error('Gravação: caminho IPC/diálogo não foi exercitado');
    console.log('[DocumentJourney:SaveIPC]');
    if (fault === 'reopen') fs.writeFileSync(output, 'corrupted PDF');
    const reopened = await PDFDocument.load(fs.readFileSync(output));
    if (reopened.getPageCount() !== 2) throw new Error('Reabertura física divergente');
    await evaluate("document.querySelector('[data-testid=merge-reset]').click()");
    await wait("document.querySelector('[data-testid=pdf-manipulator]')?.getAttribute('data-file-count') === '0'", 'limpeza antes de reimportar');
    await importFiles([output]);
    await wait("document.querySelector('[data-testid=pdf-manipulator]')?.getAttribute('data-file-count') === '1'", 'reimportação da saída');
    assertJourneyContent(await evaluate('window.inspectReopenedJourneyFile()'));
    console.log('[DocumentJourney:Reopen]\n[DocumentJourney:Complete]');
  } catch (error) {
    console.error('[DocumentJourney:Failure]', error); exitCode = 1;
  } finally {
    dialog.showSaveDialog = nativeDialog;
    if (win.webContents.debugger.isAttached()) win.webContents.debugger.detach();
    fs.rmSync(temp, { recursive: true, force: true });
  }
  app.exit(exitCode);
}
