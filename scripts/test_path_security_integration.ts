/**
 * Suíte de Testes de Integração de Segurança de Caminhos e Exportação de Arquivos
 * 
 * Valida:
 * 1. Ciclo de Vida Completo de Exportação Nativa (Gravação em disco, Magic Bytes e Autorização de Sessão)
 * 2. Abertura segura de arquivos recém-exportados (openPath e showItemInFolder)
 * 3. Prevenção de Ampliação de Privilégio (Diretório pai NÃO é autorizado automaticamente)
 * 4. Isolamento estrito de arquivos irmãos (siblings) no diretório de exportação
 * 5. Proteção contra adulteração pós-exportação (Tampering com binário executável)
 * 6. Expurgamento total de autorizações no encerramento de sessão (clearSessionAuthorizations)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  validateSafeFilePath,
  validateFileContentMatchesType,
  authorizeSessionPath,
  authorizeSessionDirectory,
  clearSessionAuthorizations,
  sessionAuthorizedFiles,
  sessionAuthorizedDirectories
} from '../electron/pathSecurity.ts';
import { PDFDocument } from 'pdf-lib';
import { LocalPdfEngine } from '../src/services/pdfEngine.ts';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message} ${detail ? `-> ${detail}` : ''}`);
  }
}

/**
 * Simula a rotina IPC executada por file:saveExportedFile no Electron
 */
function simulateSaveExportedFile(targetPath: string, buffer: Uint8Array): { success: boolean; filePath?: string; error?: string } {
  try {
    const ext = path.extname(targetPath).toLowerCase();
    fs.writeFileSync(targetPath, Buffer.from(buffer));

    // Validação estrutural de integridade (Magic Bytes)
    const magicCheck = validateFileContentMatchesType(targetPath, ext);
    if (!magicCheck.valid) {
      try { fs.unlinkSync(targetPath); } catch {}
      return { success: false, error: magicCheck.error };
    }

    // Autorização de sessão do arquivo recém-gerado
    authorizeSessionPath(targetPath);

    return { success: true, filePath: targetPath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function runIntegrationSuite() {
  console.log('===========================================================================');
  console.log('Iniciando Testes de Integração: Segurança de Caminhos e Exportação Desktop');
  console.log('===========================================================================\n');

  const testTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kovax-export-int-'));

  try {
    // -------------------------------------------------------------------------
    // [1/5] Ciclo de Vida de Anonimização, Gravação e Autorização de Sessão
    // -------------------------------------------------------------------------
    console.log('[1/5] Testando Ciclo de Exportação e Autorização de Sessão...');
    clearSessionAuthorizations();

    // 1. Gera um PDF anonimizado real usando PDFDocument e o LocalPdfEngine
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([595, 842]);
    const basePdf = await pdfDoc.save();
    const rects = [{ pageIndex: 0, x: 50, y: 500, width: 200, height: 30 }];
    const anonymizedBytes = await LocalPdfEngine.anonymizePdf(basePdf, rects);

    const exportFilePath = path.join(testTempDir, 'relatorio_processo_anonimizado_LGPD.pdf');

    // 2. Executa a rotina de exportação simulada
    const saveResult = simulateSaveExportedFile(exportFilePath, anonymizedBytes);
    assert(saveResult.success === true, 'Arquivo recém-exportado deve ser gravado com sucesso no disco');
    assert(fs.existsSync(exportFilePath), 'Arquivo recém-exportado deve existir fisicamente no disco');

    // 3. Verifica se o arquivo recém-exportado passa na autorização de sessão
    const validationResult = validateSafeFilePath(exportFilePath);
    assert(
      validationResult.valid === true && validationResult.normalizedPath === fs.realpathSync(exportFilePath),
      'Arquivo recém-exportado deve ser automaticamente autorizado na sessão ativa'
    );

    // -------------------------------------------------------------------------
    // [2/5] Simulação de Chamadas IPC: system:openPath e system:showItemInFolder
    // -------------------------------------------------------------------------
    console.log('\n[2/5] Testando Abertura (openPath) e Revelação (showItemInFolder)...');

    // Simulação do handler system:openPath
    const openValidation = validateSafeFilePath(exportFilePath);
    assert(
      openValidation.valid === true,
      'system:openPath deve autorizar a abertura do arquivo recém-exportado'
    );

    // Simulação do handler system:showItemInFolder
    const showValidation = validateSafeFilePath(exportFilePath);
    assert(
      showValidation.valid === true,
      'system:showItemInFolder deve autorizar a revelação do arquivo recém-exportado'
    );

    // -------------------------------------------------------------------------
    // [3/5] Prevenção de Ampliação de Privilégio (Diretório Pai NÃO Autorizado)
    // -------------------------------------------------------------------------
    console.log('\n[3/5] Testando Prevenção de Ampliação Indevida de Privilégio...');

    // O diretório pai de exportação NÃO deve ser aberto diretamente via IPC
    const parentDirValidation = validateSafeFilePath(testTempDir);
    assert(
      parentDirValidation.valid === false && !!parentDirValidation.error?.includes('não foi explicitamente autorizado'),
      'Diretório de exportação NÃO deve ser registrado em sessionAuthorizedDirectories (privilégio mínimo)',
      parentDirValidation.error
    );

    // Arquivo irmão pré-existente no mesmo diretório NÃO deve ser acessível
    const siblingPdf = path.join(testTempDir, 'outro_documento_sigiloso.pdf');
    fs.writeFileSync(siblingPdf, '%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

    const siblingValidation = validateSafeFilePath(siblingPdf);
    assert(
      siblingValidation.valid === false && !!siblingValidation.error?.includes('não foi explicitamente autorizado'),
      'Arquivos irmãos no diretório de exportação NÃO devem herdar autorização'
    );

    // -------------------------------------------------------------------------
    // [4/5] Proteção contra Adulteração Pós-Exportação (Tampering com Executável)
    // -------------------------------------------------------------------------
    console.log('\n[4/5] Testando Resiliência a Adulteração de Conteúdo Pós-Exportação...');

    const tamperedPdfPath = path.join(testTempDir, 'documento_adulterado.pdf');
    // Inicialmente grava um PDF válido e autoriza na sessão
    fs.writeFileSync(tamperedPdfPath, '%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    authorizeSessionPath(tamperedPdfPath);

    // Agora simula ataque externo: malware sobrescreve o arquivo autorizado com um executável Windows PE
    const maliciousPeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // MZ
    fs.writeFileSync(tamperedPdfPath, maliciousPeBuffer);

    // O validador de caminhos deve rejeitar a abertura, mesmo estando na lista de caminhos autorizados!
    const tamperedValidation = validateSafeFilePath(tamperedPdfPath);
    assert(
      tamperedValidation.valid === false && !!tamperedValidation.error?.includes('Assinatura de executável Windows PE'),
      'Arquivo autorizado que sofreu adulteração com binário PE deve ser bloqueado por Magic Bytes',
      tamperedValidation.error
    );

    // -------------------------------------------------------------------------
    // [5/5] Expurgamento Total no Encerramento da Sessão (clearSessionAuthorizations)
    // -------------------------------------------------------------------------
    console.log('\n[5/5] Testando Expurgamento de Sessão (clearSessionAuthorizations)...');

    clearSessionAuthorizations();
    assert(sessionAuthorizedFiles.size === 0, 'sessionAuthorizedFiles deve estar vazio após clear');
    assert(sessionAuthorizedDirectories.size === 0, 'sessionAuthorizedDirectories deve estar vazio após clear');

    // Tentativa de acessar o arquivo exportado anterior após a sessão ser encerrada
    const postClearValidation = validateSafeFilePath(exportFilePath);
    assert(
      postClearValidation.valid === false && !!postClearValidation.error?.includes('não foi explicitamente autorizado'),
      'Nenhum arquivo recém-exportado deve ser acessível após o encerramento da sessão'
    );

  } finally {
    try {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    } catch {}
  }

  console.log('\n===========================================================================');
  console.log('Resultado dos Testes de Integração de Segurança de Caminhos:');
  console.log(`  Sucessos: ${passedTests}`);
  console.log(`  Falhas:   ${failedTests}`);
  console.log('===========================================================================');

  if (failedTests > 0) {
    process.exitCode = 1;
  }
}

runIntegrationSuite().catch((err) => {
  console.error('Erro fatal durante a suíte de integração:', err);
  process.exitCode = 1;
});
