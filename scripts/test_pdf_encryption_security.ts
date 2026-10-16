import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { spawnSync } from 'child_process';
import { PDFDocument } from 'pdf-lib';
import { EncryptionEngine } from '../src/services/encryptionEngine.ts';

/**
 * =============================================================================
 * SUÍTE DE TESTES: CRIPTOGRAFIA REAL DE PDFs E PREVENÇÃO DE FALHA SILENCIOSA
 * =============================================================================
 * Valida de ponta a ponta:
 * 1. O motor aplica criptografia AES-256 padrão ISO 32000 real aos arquivos PDF.
 * 2. É IMPOSSÍVEL exportar um PDF como "protegido" se o motor não tiver aplicado a criptografia.
 * 3. O arquivo gerado é verificado com PyMuPDF e requer senha obrigatória para leitura.
 * 4. Senhas incorretas são rejeitadas.
 * 5. A descriptografia remove com sucesso a proteção quando fornecida a senha correta.
 * 6. O Cofre Forte AES-GCM 256 bits funciona com integridade criptográfica.
 * =============================================================================
 */

async function runPdfEncryptionSecurityTest() {
  console.log('='.repeat(75));
  console.log('🔒 TESTE DE SEGURANÇA: CRIPTOGRAFIA REAL DE PDFs (ISO 32000 AES-256)');
  console.log('='.repeat(75) + '\n');

  const testDir = path.resolve('test_output');
  fs.mkdirSync(testDir, { recursive: true });

  const testPassword = 'KovaxSenhaSegura@2026!';
  const wrongPassword = 'SenhaInvalidaErrada!';

  // --------------------------------------------------------------------------
  // ETAPA 1: Criar PDF de teste original (sem senha) com texto sensível
  // --------------------------------------------------------------------------
  console.log('[1/5] Gerando documento PDF confidencial não criptografado...');
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([500, 300]);
  page.drawText('CONTEUDO ALTAMENTE CONFIDENCIAL - PROCESSO JUDICIAL', { x: 50, y: 200, size: 14 });
  page.drawText('CPF: 111.222.333-44 - SIGILO BANCARIO DEFERIDO', { x: 50, y: 160, size: 12 });
  const rawBytes = await pdfDoc.save();

  const rawPath = path.join(testDir, 'confidential_raw.pdf');
  fs.writeFileSync(rawPath, rawBytes);
  console.log('  -> PDF original gerado:', rawPath, `(${rawBytes.length} bytes)`);

  const rawStatus = await EncryptionEngine.isPdfEncrypted(rawBytes);
  assert.strictEqual(rawStatus.encrypted, false, 'Documento inicial não deve estar criptografado');

  // --------------------------------------------------------------------------
  // ETAPA 2: Testar rejeição de senha vazia (sem falha silenciosa!)
  // --------------------------------------------------------------------------
  console.log('\n[2/5] Testando validação defensiva contra chamadas vazias sem senha...');
  let emptyPassRejected = false;
  try {
    await EncryptionEngine.encryptPdf(rawBytes, { userPassword: '', ownerPassword: '' });
  } catch (err: any) {
    emptyPassRejected = true;
    console.log('  [OK] Rejeitado corretamente com erro:', err.message);
  }
  assert.ok(emptyPassRejected, 'O motor NÃO pode salvar sem senha quando criptografia é solicitada');

  // --------------------------------------------------------------------------
  // ETAPA 3: Criptografar PDF com AES-256 e validar com motor independente (PyMuPDF)
  // --------------------------------------------------------------------------
  console.log('\n[3/5] Criptografando documento com AES-256 (Padrão ISO 32000)...');
  const encryptedBytes = await EncryptionEngine.encryptPdf(rawBytes, {
    userPassword: testPassword,
    ownerPassword: testPassword + '_admin',
    allowPrinting: false,
    allowCopying: false,
    allowModifying: false
  });

  const encryptedPath = path.join(testDir, 'confidential_protected.pdf');
  fs.writeFileSync(encryptedPath, encryptedBytes);
  console.log('  -> PDF criptografado gerado:', encryptedPath, `(${encryptedBytes.length} bytes)`);

  // Verificar com isPdfEncrypted interno
  const encStatus = await EncryptionEngine.isPdfEncrypted(encryptedBytes);
  assert.strictEqual(encStatus.encrypted, true, 'isPdfEncrypted deve confirmar que o documento está protegido');
  assert.strictEqual(encStatus.algorithm, 'AES-256', 'O algoritmo deve ser AES-256');
  console.log('  -> Detecção interna:', encStatus);

  // Verificação Forense com PyMuPDF independente
  const venvPython = fs.existsSync('.venv/Scripts/python.exe') ? '.venv/Scripts/python.exe' : 'python';
  const pyVerifyScript = `
import pymupdf, sys, json

doc = pymupdf.open(sys.argv[1])
result = {
  "is_encrypted": bool(doc.is_encrypted),
  "needs_pass": bool(doc.needs_pass),
  "auth_wrong": doc.authenticate("${wrongPassword}"),
  "auth_correct": doc.authenticate("${testPassword}"),
  "page_count": len(doc),
  "permissions": int(doc.permissions)
}
print(json.dumps(result))
`;

  const pyRes = spawnSync(venvPython, ['-c', pyVerifyScript, encryptedPath], { encoding: 'utf8' });
  if (pyRes.status !== 0) {
    throw new Error('Falha ao validar com PyMuPDF: ' + pyRes.stderr);
  }

  const pyResult = JSON.parse(pyRes.stdout.trim().split('\n').pop() || '{}');
  console.log('  -> Auditoria PyMuPDF independente:', pyResult);

  assert.strictEqual(pyResult.is_encrypted, true, 'PyMuPDF deve atestar que o PDF é criptografado');
  assert.strictEqual(pyResult.needs_pass, true, 'PyMuPDF deve exigir senha para acesso aos dados');
  assert.strictEqual(pyResult.auth_wrong, 0, 'Senha incorreta deve retornar falha de autenticação (0)');
  assert.ok(pyResult.auth_correct > 0, 'Senha correta deve autenticar com sucesso (> 0)');
  assert.strictEqual(pyResult.page_count, 1, 'Após autenticado, deve ter 1 página legível');

  // Verificação Independente com motor PDF.js (pdfjs-dist - padrão Mozilla/Chromium)
  console.log('  -> Executando verificação forense independente com pdfjs-dist...');
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');

  // 1. Tentar abrir sem senha -> DEVE rejeitar com PasswordException (NEED_PASSWORD)
  let noPassPdfjsCaught = false;
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(encryptedBytes) });
    await loadingTask.promise;
  } catch (err: any) {
    if (err.name === 'PasswordException' || err.message?.toLowerCase().includes('password')) {
      noPassPdfjsCaught = true;
      console.log('      ✓ pdfjs-dist rejeitou acesso sem senha (PasswordException: NEED_PASSWORD)');
    }
  }
  assert.ok(noPassPdfjsCaught, 'pdfjs-dist deve recusar abertura de PDF criptografado sem senha');

  // 2. Tentar abrir com senha errada -> DEVE rejeitar com PasswordException (INCORRECT_PASSWORD)
  let wrongPassPdfjsCaught = false;
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(encryptedBytes),
      password: wrongPassword
    });
    await loadingTask.promise;
  } catch (err: any) {
    if (err.name === 'PasswordException' || err.message?.toLowerCase().includes('password')) {
      wrongPassPdfjsCaught = true;
      console.log('      ✓ pdfjs-dist rejeitou senha incorreta (PasswordException: INCORRECT_PASSWORD)');
    }
  }
  assert.ok(wrongPassPdfjsCaught, 'pdfjs-dist deve rejeitar senha incorreta');

  // 3. Abrir com a senha correta -> DEVE abrir e renderizar página
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(encryptedBytes),
    password: testPassword
  });
  const pdfDocJs = await loadingTask.promise;
  assert.strictEqual(pdfDocJs.numPages, 1, 'pdfjs-dist deve abrir o PDF com senha e ler 1 página');
  const page1 = await pdfDocJs.getPage(1);
  const textContent = await page1.getTextContent();
  const fullExtractedText = textContent.items.map((it: any) => it.str).join(' ');
  assert.ok(fullExtractedText.includes('CONTEUDO ALTAMENTE CONFIDENCIAL'), 'Texto descriptografado deve ser acessível via pdfjs-dist');
  console.log('      ✓ pdfjs-dist autenticou senha correta com sucesso! Páginas:', pdfDocJs.numPages, '- Texto descriptografado confirmado.');

  // --------------------------------------------------------------------------
  // ETAPA 4: Testar Descriptografia do PDF com senha correta e rejeição com errada
  // --------------------------------------------------------------------------
  console.log('\n[4/5] Testando rotina de remoção de senha (decryptPdf)...');

  // Tentativa com senha errada
  let wrongPassCaught = false;
  try {
    await EncryptionEngine.decryptPdf(encryptedBytes, wrongPassword);
  } catch (err: any) {
    wrongPassCaught = true;
    console.log('  [OK] Tentativa com senha errada rejeitada:', err.message);
  }
  assert.ok(wrongPassCaught, 'decryptPdf deve rejeitar senha incorreta');

  // Descriptografia com senha correta
  const decryptedBytes = await EncryptionEngine.decryptPdf(encryptedBytes, testPassword);
  const decryptedPath = path.join(testDir, 'confidential_decrypted.pdf');
  fs.writeFileSync(decryptedPath, decryptedBytes);
  console.log('  -> PDF descriptografado salvo em:', decryptedPath);

  const decStatus = await EncryptionEngine.isPdfEncrypted(decryptedBytes);
  assert.strictEqual(decStatus.encrypted, false, 'Documento descriptografado não deve mais conter criptografia');

  // --------------------------------------------------------------------------
  // ETAPA 5: Testar Cofre Forte AES-GCM 256 bits para arquivos arbitrários
  // --------------------------------------------------------------------------
  console.log('\n[5/5] Testando Cofre Forte AES-GCM 256 bits (encryptFileAesGcm)...');
  const vaultSecret = 'ArquivoTextoComDadosSigilososDeCliente';
  const vaultBuffer = new TextEncoder().encode(vaultSecret);

  const vaultEncrypted = await EncryptionEngine.encryptFileAesGcm(vaultBuffer, 'Cofre@MasterKey99');
  assert.ok(vaultEncrypted.length > vaultBuffer.length + 32, 'Buffer do cofre deve incluir cabeçalho, salt e IV');

  const vaultDecrypted = await EncryptionEngine.decryptFileAesGcm(vaultEncrypted, 'Cofre@MasterKey99');
  const decryptedText = new TextDecoder().decode(vaultDecrypted);
  assert.strictEqual(decryptedText, vaultSecret, 'Texto extraído do cofre deve ser idêntico ao original');

  let vaultWrongRejected = false;
  try {
    await EncryptionEngine.decryptFileAesGcm(vaultEncrypted, 'SenhaIncorreta');
  } catch (err: any) {
    vaultWrongRejected = true;
    console.log('  [OK] Cofre rejeitou senha errada:', err.message);
  }
  assert.ok(vaultWrongRejected, 'Cofre deve rejeitar senha errada');

  console.log('\n' + '='.repeat(75));
  console.log('✅ SUCESSO: A CRIPTOGRAFIA DE PDFs É GENUÍNA, SEGURA E HOMOLOGADA!');
  console.log('='.repeat(75) + '\n');
}

runPdfEncryptionSecurityTest().catch(err => {
  console.error('\n❌ FALHA NO TESTE DE CRIPTOGRAFIA:', err);
  process.exit(1);
});
