/**
 * =============================================================================
 * SUÍTE 5: CRIPTOGRAFIA DE PDF E COFRE FORTE
 * =============================================================================
 * Comprova: Senhas corretas, rejeição de senhas erradas e interoperabilidade.
 * Execução: Todo Pull Request.
 * =============================================================================
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { PDFDocument } from 'pdf-lib';
import { EncryptionEngine } from '../../src/services/encryptionEngine.ts';

async function runCryptoSuite() {
  console.log('='.repeat(80));
  console.log('  [SUÍTE 5: CRIPTOGRAFIA] SENHAS CORRETAS, REJEIÇÃO DE SENHAS ERRADAS E INTEROPERABILIDADE');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name} -> ${err.message}`);
      failed++;
    }
  }

  // 1. Gerar PDF limpo para encriptação
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 300]);
  page.drawText('PROCESSO EM SEGREDO DE JUSTICA - DADOS BANCARIOS', { x: 50, y: 150, size: 12 });
  const rawBytes = await doc.save();

  const correctPassword = 'KovaxSenhaSegura@2026!';
  const wrongPassword = 'SenhaInvalidaErrada!';

  // 2. Testar rejeição defensiva contra senha vazia
  await test('Rejeição defensiva contra tentativa de criptografia sem senha', async () => {
    let rejected = false;
    try {
      await EncryptionEngine.encryptPdf(rawBytes, { userPassword: '', ownerPassword: '' });
    } catch {
      rejected = true;
    }
    assert.strictEqual(rejected, true, 'Deve rejeitar encriptação sem senha');
  });

  // 3. Criptografar PDF com AES-256 (ISO 32000)
  let encryptedBytes: Uint8Array;
  await test('Criptografar documento com algoritmo AES-256 e validar status de proteção', async () => {
    encryptedBytes = await EncryptionEngine.encryptPdf(rawBytes, {
      userPassword: correctPassword,
      ownerPassword: correctPassword,
      permissions: { printing: 'highResolution', modifying: false, copying: false, annotating: false }
    });

    assert.ok(encryptedBytes.length > rawBytes.length, 'Arquivo criptografado deve conter envelopes de segurança');
    const status = await EncryptionEngine.isPdfEncrypted(encryptedBytes);
    assert.strictEqual(status.encrypted, true, 'isPdfEncrypted deve retornar true');
  });

  // 4. Rejeição de Senha Incorreta
  await test('Rejeição estrita com senha incorreta ao tentar descriptografar', async () => {
    let wrongPassRejected = false;
    try {
      await EncryptionEngine.decryptPdf(encryptedBytes, wrongPassword);
    } catch {
      wrongPassRejected = true;
    }
    assert.strictEqual(wrongPassRejected, true, 'Descriptografia com senha incorreta deve falhar');
  });

  // 5. Sucesso com Senha Correta e Interoperabilidade
  await test('Descriptografia com a senha correta recupera o documento original legível', async () => {
    const decryptedBytes = await EncryptionEngine.decryptPdf(encryptedBytes, correctPassword);
    assert.ok(decryptedBytes.length > 0, 'Bytes descriptografados não podem estar vazios');

    const decryptedStatus = await EncryptionEngine.isPdfEncrypted(decryptedBytes);
    assert.strictEqual(decryptedStatus.encrypted, false, 'Documento resultante não deve mais exigir senha');

    const reloaded = await PDFDocument.load(decryptedBytes);
    assert.strictEqual(reloaded.getPageCount(), 1, 'Página deve ser recuperada com sucesso');
  });

  // 6. Cofre Forte AES-GCM 256 bits
  await test('Cofre Forte AES-GCM 256 bits: Encriptação e decriptação de arquivos genéricos com autenticação de integridade', async () => {
    const testPayload = Buffer.from('Documento confidencial do gabinete municipal', 'utf-8');
    const vaultPass = 'ChaveMestraCofre@2026';

    const encryptedVault = await EncryptionEngine.encryptFileAesGcm(testPayload, vaultPass);
    assert.ok(encryptedVault.length > testPayload.length, 'Payload deve conter salt, iv e auth tag');

    // Descriptografar com senha correta
    const decryptedVault = await EncryptionEngine.decryptFileAesGcm(encryptedVault, vaultPass);
    assert.strictEqual(Buffer.from(decryptedVault).toString('utf-8'), 'Documento confidencial do gabinete municipal');

    // Tentativa com senha errada
    let vaultRejected = false;
    try {
      await EncryptionEngine.decryptFileAesGcm(encryptedVault, 'SenhaIncorreta');
    } catch {
      vaultRejected = true;
    }
    assert.strictEqual(vaultRejected, true, 'Cofre com senha incorreta deve ser rejeitado por falha de tag GCM');
  });

  console.log(`\nResultado Suíte 5 (Criptografia): ${passed} Passados, ${failed} Falhados\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runCryptoSuite().catch(err => {
  console.error('Erro fatal na Suíte 5 (Criptografia):', err);
  process.exit(1);
});
