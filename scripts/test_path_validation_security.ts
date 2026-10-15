/**
 * Bateria de Testes Automatizados de Validação e Segurança de Caminhos (Electron IPC)
 * Valida:
 * 1. Autorização Estrita de Sessão (Princípio do Menor Privilégio / Capability-Based Access Control)
 * 2. Bloqueio de Abertura de Diretórios Arbitrários do Sistema
 * 3. Validação de Assinatura Mágica de Conteúdo (Magic Bytes) contra Executáveis Disfarçados (MZ, ELF, Mach-O, Shebang)
 * 4. Validação de Correspondência entre Conteúdo Real e Extensão Declarada (%PDF-, PNG, JPEG, ZIP/DOCX)
 * 5. Bloqueio de Vetores de Ataque (Null Bytes, UNC Paths, Protocol Handlers, Path Traversal)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  validateSafeFilePath,
  validateFileContentMatchesType,
  authorizeSessionPath,
  sessionAuthorizedFiles,
  sessionAuthorizedDirectories
} from '../electron/pathSecurity.ts';

async function runTestSuite() {
  console.log('='.repeat(70));
  console.log('Iniciando Bateria de Testes de Segurança de Caminhos e Magic Bytes');
  console.log('='.repeat(70));

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kovax-sec-test-'));
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      testsPassed++;
    } else {
      console.error(`  [FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
      testsFailed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // 1. TESTE DE AUTORIZAÇÃO DE SESSÃO (Princípio do Menor Privilégio)
    // -------------------------------------------------------------------------
    console.log('\n[1/5] Testando Autorização de Sessão (Capability-Based Control)...');

    const unauthorizedPdf = path.join(tmpDir, 'unauthorized_document.pdf');
    fs.writeFileSync(unauthorizedPdf, '%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

    // Tentativa de validar arquivo existente no disco SEM ter sido selecionado pelo usuário na sessão
    const unauthResult = validateSafeFilePath(unauthorizedPdf);
    assert(
      !unauthResult.valid && !!unauthResult.error?.includes('não foi explicitamente autorizado'),
      'Arquivo existente não autorizado na sessão deve ser sumariamente bloqueado',
      unauthResult.error
    );

    // Agora simula a seleção do arquivo via FileDialog
    authorizeSessionPath(unauthorizedPdf);
    const authResult = validateSafeFilePath(unauthorizedPdf);
    assert(
      authResult.valid && authResult.normalizedPath === fs.realpathSync(unauthorizedPdf),
      'Arquivo expressamente selecionado na sessão deve ser validado com sucesso'
    );

    // Um outro arquivo no mesmo diretório NÃO deve ser acessível individualmente
    const siblingFile = path.join(tmpDir, 'sibling_unselected.pdf');
    fs.writeFileSync(siblingFile, '%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const siblingResult = validateSafeFilePath(siblingFile);
    assert(
      !siblingResult.valid && !!siblingResult.error?.includes('não foi explicitamente autorizado'),
      'Arquivo irmão no mesmo diretório NÃO autorizado deve ser bloqueado'
    );

    // -------------------------------------------------------------------------
    // 2. TESTE DE BLOQUEIO DE DIRETÓRIOS ARBITRÁRIOS
    // -------------------------------------------------------------------------
    console.log('\n[2/5] Testando Restrição de Diretórios do Sistema...');

    // Tentativa de abrir diretório do sistema operacional (ex: C:\Windows ou pasta temp não autorizada)
    const sysDir = process.platform === 'win32' ? 'C:\\Windows' : '/etc';
    if (fs.existsSync(sysDir)) {
      const sysDirResult = validateSafeFilePath(sysDir);
      assert(
        !sysDirResult.valid && !!sysDirResult.error?.includes('não foi explicitamente autorizado'),
        `Diretório do sistema (${sysDir}) deve ser bloqueado por não estar na sessão autorizada`,
        sysDirResult.error
      );
    }

    // Diretório autorizado na sessão (onde o usuário salvou ou selecionou arquivo)
    const authDirResult = validateSafeFilePath(tmpDir);
    assert(
      authDirResult.valid && authDirResult.normalizedPath === fs.realpathSync(tmpDir),
      'Diretório associado a arquivo explicitamente salvo/autorizado na sessão deve ser permitido'
    );

    // -------------------------------------------------------------------------
    // 3. TESTE DE MAGIC BYTES E BLOQUEIO DE BINÁRIOS DISFARÇADOS
    // -------------------------------------------------------------------------
    console.log('\n[3/5] Testando Detecção de Executáveis e Binários Disfarçados (Magic Bytes)...');

    // Cenário Crítico: Executável Windows (MZ) camuflado como documento PDF
    const peDisguisedAsPdf = path.join(tmpDir, 'trojan_disguised.pdf');
    const peBuffer = Buffer.concat([
      Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]), // Header MZ
      Buffer.from('This program cannot be run in DOS mode.')
    ]);
    fs.writeFileSync(peDisguisedAsPdf, peBuffer);
    authorizeSessionPath(peDisguisedAsPdf);

    const peCheck = validateSafeFilePath(peDisguisedAsPdf);
    assert(
      !peCheck.valid && !!peCheck.error?.includes('Windows PE (MZ)'),
      'Executável Windows PE (MZ) disfarçado com extensão .pdf deve ser detectado e bloqueado',
      peCheck.error
    );

    // Cenário: Binário Linux ELF camuflado como imagem PNG
    const elfDisguisedAsPng = path.join(tmpDir, 'payload.png');
    const elfBuffer = Buffer.from([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00]);
    fs.writeFileSync(elfDisguisedAsPng, elfBuffer);
    authorizeSessionPath(elfDisguisedAsPng);

    const elfCheck = validateSafeFilePath(elfDisguisedAsPng);
    assert(
      !elfCheck.valid && !!elfCheck.error?.includes('ELF'),
      'Binário ELF Linux disfarçado com extensão .png deve ser detectado e bloqueado',
      elfCheck.error
    );

    // Cenário: Script shell com Shebang camuflado como documento docx
    const shebangDisguisedAsDocx = path.join(tmpDir, 'script.docx');
    fs.writeFileSync(shebangDisguisedAsDocx, '#!/bin/bash\nrm -rf /tmp/data\n');
    authorizeSessionPath(shebangDisguisedAsDocx);

    const shebangCheck = validateSafeFilePath(shebangDisguisedAsDocx);
    assert(
      !shebangCheck.valid && !!shebangCheck.error?.includes('Shebang #!'),
      'Script com Shebang (#!/) disfarçado com extensão .docx deve ser detectado e bloqueado',
      shebangCheck.error
    );

    // -------------------------------------------------------------------------
    // 4. TESTE DE CORRESPONDÊNCIA DE TIPO DOCUMENTAL
    // -------------------------------------------------------------------------
    console.log('\n[4/5] Testando Validação Estrutural de Tipo Documental...');

    // Arquivo falso de texto renomeado para .pdf (sem cabeçalho %PDF-)
    const fakePdf = path.join(tmpDir, 'corrupted_fake.pdf');
    fs.writeFileSync(fakePdf, 'Este é um texto comum que alguém renomeou para PDF.');
    authorizeSessionPath(fakePdf);

    const fakePdfCheck = validateSafeFilePath(fakePdf);
    assert(
      !fakePdfCheck.valid && !!fakePdfCheck.error?.includes('%PDF-'),
      'Arquivo sem assinatura mágica %PDF- deve ser rejeitado',
      fakePdfCheck.error
    );

    // Imagem PNG legítima
    const validPng = path.join(tmpDir, 'valid_image.png');
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
    fs.writeFileSync(validPng, pngHeader);
    authorizeSessionPath(validPng);

    const validPngCheck = validateSafeFilePath(validPng);
    assert(
      validPngCheck.valid,
      'Imagem PNG com assinatura mágica correta deve ser autorizada'
    );

    // Imagem JPEG legítima
    const validJpg = path.join(tmpDir, 'valid_photo.jpg');
    const jpgHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
    fs.writeFileSync(validJpg, jpgHeader);
    authorizeSessionPath(validJpg);

    const validJpgCheck = validateSafeFilePath(validJpg);
    assert(
      validJpgCheck.valid,
      'Imagem JPEG com assinatura mágica correta deve ser autorizada'
    );

    // Container Zip / DOCX legítimo
    const validDocx = path.join(tmpDir, 'valid_doc.docx');
    const zipHeader = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
    fs.writeFileSync(validDocx, zipHeader);
    authorizeSessionPath(validDocx);

    const validDocxCheck = validateSafeFilePath(validDocx);
    assert(
      validDocxCheck.valid,
      'Documento DOCX com container ZIP/PK válido deve ser autorizado'
    );

    // -------------------------------------------------------------------------
    // 5. TESTE DE VETORES DE ATAQUE (UNC, Null Bytes, Protocolos)
    // -------------------------------------------------------------------------
    console.log('\n[5/5] Testando Vetores de Ataque e Sanitização de Entrada...');

    // Null byte injection
    const nullByteCheck = validateSafeFilePath(tmpDir + '/doc\0.pdf');
    assert(
      !nullByteCheck.valid && !!nullByteCheck.error?.includes('nulo'),
      'Injeção de caractere nulo (\\0) deve ser bloqueada'
    );

    // Remote UNC share
    const uncCheck = validateSafeFilePath('\\\\attacker.com\\share\\document.pdf');
    assert(
      !uncCheck.valid && !!uncCheck.error?.includes('UNC'),
      'Caminhos remotos UNC (\\\\...) devem ser sumariamente bloqueados'
    );

    // Protocol URL injection
    const protocolCheck = validateSafeFilePath('javascript:alert(1)');
    assert(
      !protocolCheck.valid && !!protocolCheck.error?.includes('protocolo'),
      'Esquemas de protocolo (javascript:, vbscript:, etc.) devem ser bloqueados'
    );

    // Extensão executável direta
    const exeFile = path.join(tmpDir, 'exploit.exe');
    fs.writeFileSync(exeFile, peBuffer);
    authorizeSessionPath(exeFile); // Mesmo se o arquivo estivesse autorizado na sessão
    const exeCheck = validateSafeFilePath(exeFile);
    assert(
      !exeCheck.valid && !!exeCheck.error?.includes('proibidas'),
      'Extensões executáveis diretas (.exe, .bat, etc.) devem ser incondicionalmente bloqueadas',
      exeCheck.error
    );

  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }

  console.log('\n' + '='.repeat(70));
  console.log(`Resultado da Bateria de Validação de Caminhos:`);
  console.log(`  Sucessos: ${testsPassed}`);
  console.log(`  Falhas:   ${testsFailed}`);
  console.log('='.repeat(70));

  if (testsFailed > 0) {
    throw new Error(`A bateria de testes falhou com ${testsFailed} erro(s).`);
  }
}

runTestSuite().catch((err) => {
  console.error('\n[FATAL] Erro na execução da bateria de testes:', err);
  process.exitCode = 1;
});
