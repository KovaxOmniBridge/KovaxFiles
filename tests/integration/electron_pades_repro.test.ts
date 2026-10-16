/**
 * Reprodução do Bug P0: CoreSignatureService.verifyPdfSignatures e electron/ipc/padesHandlers.ts
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { CoreSignatureService } from '../../src/core/signatures/signatureService';

async function testCoreSignatureServiceVerifyCall() {
  console.log('[Teste 1] CoreSignatureService.verifyPdfSignatures deve passar pdfBuffer diretamente para electronApi.padesVerifyPdf');

  const dummyPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // %PDF-1.7
  let receivedDirectBuffer = false;

  // Simular ambiente Electron Renderer com window.electronAPI
  (globalThis as any).window = {
    electronAPI: {
      padesVerifyPdf: async (arg: any) => {
        if (arg && !(arg instanceof Uint8Array) && !(arg instanceof ArrayBuffer) && arg.pdfBuffer) {
          throw new TypeError('FALHA DE REGRESSÃO: padesVerifyPdf recebeu { pdfBuffer }, mas deve receber pdfBuffer diretamente!');
        }
        if (arg instanceof Uint8Array || arg instanceof ArrayBuffer) {
          receivedDirectBuffer = true;
          return {
            hasSignatures: false,
            allValid: false,
            signatures: [],
            totalSignatures: 0,
            validSignaturesCount: 0,
            icpBrasilCount: 0,
            nonIcpCount: 0,
            integritySummary: 'Test OK',
            revocationSummary: 'Test OK',
            incrementalRevisionsSummary: 'Test OK',
            overallAuditSummary: 'Test OK',
            conformanceWarning: ''
          };
        }
        throw new Error('Parâmetro desconhecido recebido');
      }
    }
  };

  const res = await CoreSignatureService.verifyPdfSignatures(dummyPdf);

  assert.strictEqual(
    res.isSuccess,
    true,
    `verifyPdfSignatures falhou: ${res.error?.message || 'Erro desconhecido'}`
  );
  assert.strictEqual(receivedDirectBuffer, true, 'electronApi.padesVerifyPdf deve ter recebido o buffer diretamente');
  console.log('  [PASS] verifyPdfSignatures passou o buffer diretamente para electronApi.padesVerifyPdf');
}

async function testPadesHandlersStaticAudit() {
  console.log('[Teste 2] electron/ipc/padesHandlers.ts não deve usar require("electron") e não deve silenciar falhas');
  const padesHandlersPath = path.resolve('electron/ipc/padesHandlers.ts');
  const content = fs.readFileSync(padesHandlersPath, 'utf-8');

  // Não pode usar require('electron') em projeto ESM
  assert.ok(
    !content.includes("require('electron')"),
    'padesHandlers.ts NÃO pode conter require(\'electron\') dentro de módulo ESM'
  );

  // Deve importar do módulo electron via import ESM
  assert.ok(
    /import\s+[^;]*from\s+['"]electron['"]/.test(content),
    'padesHandlers.ts deve importar do módulo "electron" via import ESM'
  );

  // Não deve conter retorno silencioso "if (!ipcMain) return;"
  assert.ok(
    !content.includes('if (!ipcMain) return;'),
    'registerPadesHandlers não pode retornar silenciosamente com "if (!ipcMain) return;"'
  );
}

async function run() {
  let failed = false;
  try {
    await testCoreSignatureServiceVerifyCall();
  } catch (err: any) {
    console.error('  [FAIL Teste 1]:', err.message);
    failed = true;
  }

  try {
    await testPadesHandlersStaticAudit();
  } catch (err: any) {
    console.error('  [FAIL Teste 2]:', err.message);
    failed = true;
  }

  if (failed) {
    process.exit(1);
  }
}

run();
