import { app, dialog, type BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { assertJourneyContent, waitForCondition } from './journeyChecks';

export async function runDocumentJourney(win: BrowserWindow): Promise<void> {
  if (!app.isPackaged) throw new Error('Jornada exige executável empacotado');
  const temp = fs.mkdtempSync(path.join(app.getPath('temp'), 'kovax-journey-'));
  const output = path.join(temp, 'merged.pdf');
  const fault = process.argv.find(arg => arg.startsWith('--journey-fault='))?.split('=')[1];
  const isNegative = process.argv.includes('--document-journey-negative');
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

  if (isNegative) {
    try {
      const ref0 = path.join(temp, 'reference-0.pdf');
      const doc0 = await PDFDocument.create(); doc0.addPage([600, 800]).drawText('M01 REFERENCE ALPHA');
      fs.writeFileSync(ref0, await doc0.save());

      const ref1 = path.join(temp, 'reference-1.pdf');
      const doc1 = await PDFDocument.create(); doc1.addPage([600, 800]).drawText('M01 REFERENCE BETA');
      fs.writeFileSync(ref1, await doc1.save());

      await wait("document.querySelector('[data-tool-id=manipulator]')", 'navegação React');
      await evaluate("document.querySelector('[data-tool-id=manipulator]').click()");
      await wait("document.querySelector('[data-testid=merge-input]')", 'ferramenta de fusão');
      win.webContents.debugger.attach('1.3');

      // --- CENÁRIO 1: IMPORTAÇÃO INVÁLIDA E RECUPERAÇÃO ---
      const invalidDoc = path.join(temp, 'documento-invalido.txt');
      fs.writeFileSync(invalidDoc, 'CONTEUDO_INVALIDO_NAO_PDF');
      await importFiles([invalidDoc]);
      await waitForCondition(async () => {
        const text = await evaluate("document.querySelector('[data-testid=pdf-error]')?.textContent");
        return Boolean(text && text.includes('Apenas arquivos PDF são aceitos'));
      }, 'erro visível na interface para formato inválido');

      const countAfterBadImport = await evaluate("document.querySelector('[data-testid=pdf-manipulator]')?.getAttribute('data-file-count')");
      assert.equal(countAfterBadImport, '0', 'Arquivo inválido não deve ser adicionado à lista');
      const hasExportAfterBad = await evaluate("Boolean(document.querySelector('[data-testid=merge-export]'))");
      assert.equal(hasExportAfterBad, false, 'Exportação indevida não pode ocorrer');

      // Recuperação: dispensar erro e adicionar arquivos válidos
      await evaluate("document.querySelector('[data-testid=dismiss-error]')?.click()");
      await waitForCondition(async () => !(await evaluate("Boolean(document.querySelector('[data-testid=pdf-error]'))")), 'dispensa de banner de erro');
      await importFiles([ref0, ref1]);
      await waitForCondition(async () => await evaluate("document.querySelector('[data-testid=pdf-manipulator]')?.getAttribute('data-file-count') === '2'"), 'recuperação com arquivos válidos');
      await evaluate("document.querySelector('[data-testid=merge-process]').click()");
      await waitForCondition(async () => Boolean(await evaluate("document.querySelector('[data-testid=merge-export]')")), 'sucesso após recuperação de importação');
      console.log('[DocumentJourney:Negative:ImportRecovery]');

      // --- CENÁRIO 2: PROCESSAMENTO COM ARQUIVO CORROMPIDO E RECUPERAÇÃO ---
      await evaluate("document.querySelector('[data-testid=merge-reset]').click()");
      await waitForCondition(async () => await evaluate("document.querySelector('[data-testid=pdf-manipulator]')?.getAttribute('data-file-count') === '0'"), 'limpeza para teste de processamento');

      const corruptPdf = path.join(temp, 'corrupted-syntax.pdf');
      fs.writeFileSync(corruptPdf, 'INVALID_PDF_SYNTAX_DATA_BYTE_CORRUPTION');
      await importFiles([ref0, corruptPdf]);
      await waitForCondition(async () => await evaluate("document.querySelector('[data-testid=pdf-manipulator]')?.getAttribute('data-file-count') === '2'"), 'arquivos entregues (1 válido + 1 corrompido)');
      await evaluate("document.querySelector('[data-testid=merge-process]').click()");
      await waitForCondition(async () => {
        const text = await evaluate("document.querySelector('[data-testid=pdf-error]')?.textContent");
        return Boolean(text && text.includes('Erro ao unir arquivos PDF'));
      }, 'erro visível na interface para falha de processamento');

      const hasExportAfterCorrupt = await evaluate("Boolean(document.querySelector('[data-testid=merge-export]'))");
      assert.equal(hasExportAfterCorrupt, false, 'Sucesso indevido não pode ocorrer após falha de processamento');
      const countPreserved = await evaluate("document.querySelector('[data-testid=pdf-manipulator]')?.getAttribute('data-file-count')");
      assert.equal(countPreserved, '2', 'Arquivos originais devem permanecer preservados para retry ou remoção');

      // Recuperação: remover arquivo corrompido (índice 1) e substituir por válido (ref1)
      await evaluate("document.querySelector('[data-testid=remove-file-1]').click()");
      await waitForCondition(async () => await evaluate("document.querySelector('[data-testid=pdf-manipulator]')?.getAttribute('data-file-count') === '1'"), 'remoção de arquivo corrompido');
      await importFiles([ref1]);
      await waitForCondition(async () => await evaluate("document.querySelector('[data-testid=pdf-manipulator]')?.getAttribute('data-file-count') === '2'"), 'segundo arquivo válido adicionado');
      await evaluate("document.querySelector('[data-testid=merge-process]').click()");
      await waitForCondition(async () => Boolean(await evaluate("document.querySelector('[data-testid=merge-export]')")), 'processamento concluído com sucesso após substituição');
      console.log('[DocumentJourney:Negative:ProcessRecovery]');

      // --- CENÁRIO 3: GRAVAÇÃO COM ERRO IPC E RECUPERAÇÃO ---
      dialog.showSaveDialog = (async () => {
        saveCalls++;
        return { canceled: false, filePath: path.join(temp, 'nonexistent-directory', 'merged.pdf') };
      }) as typeof dialog.showSaveDialog;

      await evaluate("document.querySelector('[data-testid=merge-export]').click()");
      await waitForCondition(async () => {
        const state = await evaluate("document.querySelector('[data-testid=pdf-manipulator]')?.getAttribute('data-export-state')");
        const errorText = await evaluate("document.querySelector('[data-testid=pdf-error]')?.textContent");
        return state === 'error' && Boolean(errorText && errorText.includes('Erro ao exportar PDF'));
      }, 'erro visível e estado export-state=error');

      assert.ok(!fs.existsSync(output), 'Arquivo físico não deve existir após falha de gravação');
      const hasExportStill = await evaluate("Boolean(document.querySelector('[data-testid=merge-export]'))");
      assert.equal(hasExportStill, true, 'Exportação deve permanecer disponível para retry');

      // Recuperação: configurar diálogo para caminho válido e retentar
      dialog.showSaveDialog = (async () => {
        saveCalls++;
        return { canceled: false, filePath: output };
      }) as typeof dialog.showSaveDialog;

      await evaluate("document.querySelector('[data-testid=merge-export]').click()");
      await waitForCondition(async () => {
        const state = await evaluate("document.querySelector('[data-testid=pdf-manipulator]')?.getAttribute('data-export-state')");
        return state === 'saved';
      }, 'gravação recuperada com sucesso após retry');
      assert.ok(fs.existsSync(output) && fs.statSync(output).size > 0, 'Arquivo final gravado fisicamente');
      console.log('[DocumentJourney:Negative:SaveRecovery]');

      // --- CENÁRIO 4: REABERTURA DE SAÍDA CORROMPIDA E RECUPERAÇÃO ---
      await evaluate("document.querySelector('[data-testid=merge-reset]').click()");
      await waitForCondition(async () => await evaluate("document.querySelector('[data-testid=pdf-manipulator]')?.getAttribute('data-file-count') === '0'"), 'limpeza antes da reabertura');

      const corruptedOutput = path.join(temp, 'corrupted-output.pdf');
      fs.writeFileSync(corruptedOutput, 'CORRUPTED_PHYSICAL_PDF_OUTPUT_BYTES');
      await importFiles([corruptedOutput]);
      await waitForCondition(async () => await evaluate("document.querySelector('[data-testid=pdf-manipulator]')?.getAttribute('data-file-count') === '1'"), 'entrega de arquivo corrompido ao input');

      const inspectResult: { ok: boolean; error?: string } = await evaluate(`
        (async () => {
          try {
            const data = await window.inspectReopenedJourneyFile();
            return { ok: true, data };
          } catch (err) {
            return { ok: false, error: String(err?.message || err) };
          }
        })()
      `);
      assert.equal(inspectResult.ok, false, 'Leitura de arquivo corrompido na reabertura deve falhar');
      assert.ok(Boolean(inspectResult.error), 'Mensagem de erro de estrutura PDF deve ser retornada na inspeção');

      // Recuperação: limpar lista e entregar o output legítimo gerado no cenário 3
      await evaluate("document.querySelector('[data-testid=clear-file-list]')?.click() || document.querySelector('[data-testid=clear-file-list-bottom]')?.click()");
      await waitForCondition(async () => await evaluate("document.querySelector('[data-testid=pdf-manipulator]')?.getAttribute('data-file-count') === '0'"), 'limpeza pós-rejeição de reabertura');

      await importFiles([output]);
      await waitForCondition(async () => await evaluate("document.querySelector('[data-testid=pdf-manipulator]')?.getAttribute('data-file-count') === '1'"), 'entrega de output legítimo ao input');

      const validInspectResult = await evaluate(`
        (async () => {
          try {
            return { ok: true, data: await window.inspectReopenedJourneyFile() };
          } catch (err) {
            return { ok: false, error: String(err?.message || err) };
          }
        })()
      `);
      assert.equal(validInspectResult.ok, true, 'Inspeção do output legítimo deve ter sucesso');
      assertJourneyContent(validInspectResult.data);
      console.log('[DocumentJourney:Negative:ReopenRecovery]');
      console.log('[DocumentJourney:Negative:Complete]');
    } catch (error) {
      console.error('[DocumentJourney:Negative:Failure]', error);
      exitCode = 1;
    } finally {
      dialog.showSaveDialog = nativeDialog;
      if (win.webContents.debugger.isAttached()) win.webContents.debugger.detach();
      fs.rmSync(temp, { recursive: true, force: true });
    }
    app.exit(exitCode);
    return;
  }

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
