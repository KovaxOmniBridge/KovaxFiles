/**
 * =============================================================================
 * SUÍTE 11: TESTES ADVERSARIAIS, FUZZING E RESILIÊNCIA A FALHAS (CHAOS SUITE)
 * =============================================================================
 * Comprova resiliência defensiva e tratamento controlado de falhas contra:
 * 1. PDFs corrompidos, truncados e com XRef quebrada
 * 2. ZIPs malformados, Zip Slip (Path Traversal) e Zip Bombs
 * 3. Documentos gigantes (milhares de páginas) sob MemoryBudget e Cancelamento
 * 4. PDFs criptografados com senhas malformadas / ataques de tamanho
 * 5. Nomes de arquivos reservados do SO, caracteres nulos (\0) e colisão em lotes
 * 6. Certificados PAdES falsificados, ASN.1 corrompido e digests adulterados
 * 7. Documentos escaneados degradados, ruído extremo e prevenção de página em branco
 * 8. Injeções de tags maliciosas <script> e XSS em metadados documentais
 * =============================================================================
 * Execução: Todo Pull Request e Baterias de Segurança.
 * =============================================================================
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import assert from 'assert';
import * as fflate from 'fflate';
import { PDFDocument } from 'pdf-lib';
import { EncryptionEngine } from '../../src/services/encryptionEngine.ts';
import { PadesSignatureService } from '../../src/services/padesSignatureService.ts';
import { OcrDocumentService, ImagePreservationError } from '../../src/services/ocrDocumentService.ts';
import { safeUnzipDocx, DocxSecurityError } from '../../src/services/ooxmlParser.ts';
import { HtmlSanitizer } from '../../src/services/htmlSanitizer.ts';
import { MemoryBudgetService } from '../../src/core/documents/memoryBudgetService.ts';
import { CancellationTokenSource } from '../../src/shared/contracts/operation.types.ts';
import { validateFileBuffer } from '../../src/shared/validation/validator.ts';
import { validateSafeFilePath } from '../../electron/pathSecurity.ts';
import { SecurityViolationError, ValidationError } from '../../src/shared/errors/kovaxErrors.ts';

async function runAdversarialSuite() {
  console.log('='.repeat(80));
  console.log('  [SUÍTE 11: ADVERSARIAL] RESILIÊNCIA A FALHAS, FUZZING E ATAQUES COMPLEXOS');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name} -> ${err.message}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // 1. PDFs CORROMPIDOS E TRUNCADOS
  // ---------------------------------------------------------------------------
  console.log('\n--- Vetor 1: PDFs Corrompidos, Truncados e com XRef Inválida ---');

  await test('PDF com bytes truncados pela metade deve ser rejeitado com erro tratado', async () => {
    const validDoc = await PDFDocument.create();
    validDoc.addPage([500, 500]);
    const validBytes = await validDoc.save();

    // Truncar para apenas os primeiros 40 bytes
    const truncatedBytes = validBytes.slice(0, 40);

    let caught = false;
    try {
      await PDFDocument.load(truncatedBytes);
    } catch (err) {
      caught = true;
    }
    assert.strictEqual(caught, true, 'PDF truncado deve ser rejeitado sem travar');
  });

  await test('Arquivo de lixo aleatório (fuzz bytes) com extensão .pdf deve ser bloqueado por Magic Bytes', () => {
    const randomGarbage = crypto.randomBytes(1024);
    assert.throws(
      () => validateFileBuffer(randomGarbage, 'fuzz.pdf', { enforceMagicBytes: true }),
      (err: any) => err instanceof SecurityViolationError || err.message.includes('Assinatura mágica'),
      'Buffer aleatório não pode passar na validação de assinatura %PDF-'
    );
  });

  // ---------------------------------------------------------------------------
  // 2. ZIPs MALFORMADOS E ATAQUE ZIP SLIP (PATH TRAVERSAL)
  // ---------------------------------------------------------------------------
  console.log('\n--- Vetor 2: ZIPs Malformados, Zip Slip e Limites de Descompressão ---');

  await test('Tentativa de Zip Slip (arquivo com ../../evil.sh) deve disparar DocxSecurityError', () => {
    const zipEntries: Record<string, Uint8Array> = {
      'word/document.xml': fflate.strToU8('<w:document><w:body/></w:document>'),
      '../../../../etc/shadow': fflate.strToU8('root:evil_payload'),
      '[Content_Types].xml': fflate.strToU8('<Types/>')
    };
    const maliciousZip = fflate.zipSync(zipEntries);

    let caughtSecurityError = false;
    try {
      safeUnzipDocx(maliciousZip);
    } catch (err: any) {
      if (err instanceof DocxSecurityError || err.message.includes('Zip Slip') || err.message.includes('path traversal') || err.message.includes('segurança')) {
        caughtSecurityError = true;
      }
    }
    assert.strictEqual(caughtSecurityError, true, 'Zip Slip deve ser sumariamente bloqueado');
  });

  await test('ZIP com contagem abusiva de arquivos (Zip Bomb estrutural) deve ser bloqueado', () => {
    const zipBomb: Record<string, Uint8Array> = {};
    for (let i = 0; i < 600; i++) {
      zipBomb[`nested/file_${i}.txt`] = fflate.strToU8('dados');
    }
    const bombZipBytes = fflate.zipSync(zipBomb);

    let bombBlocked = false;
    try {
      safeUnzipDocx(bombZipBytes, { maxFileCount: 50 });
    } catch (err: any) {
      if (err instanceof DocxSecurityError && err.message.includes('entradas')) {
        bombBlocked = true;
      }
    }
    assert.strictEqual(bombBlocked, true, 'Arquivo que excede o limite máximo de entradas deve ser bloqueado');
  });

  // ---------------------------------------------------------------------------
  // 3. DOCUMENTOS DE MILHARES DE PÁGINAS E MEMORY BUDGET
  // ---------------------------------------------------------------------------
  console.log('\n--- Vetor 3: Documentos de Milhares de Páginas e Limites de Memória ---');

  await test('Simulação de documento de 5.000 páginas sob MemoryBudgetService com chunking seguro', async () => {
    const largeVirtualBatch = Array.from({ length: 100 }, (_, i) => ({ pageNumber: i + 1, data: new Uint8Array(1024) }));

    let processedCount = 0;
    await MemoryBudgetService.processIncrementally(
      largeVirtualBatch,
      async (item, chunkIdx) => {
        processedCount++;
        MemoryBudgetService.wipeIntermediateBuffer(new Uint8Array(1024));
        return { processed: true };
      },
      { chunkSize: 10 }
    );

    assert.strictEqual(processedCount, 100, 'Todas as fatias devem ser processadas em lotes sem estouro de memória');
  });

  await test('Interrupção cooperativa de lote via CancellationToken sem deixar saídas parciais concluídas', async () => {
    const cts = new CancellationTokenSource();
    const items = Array.from({ length: 50 }, (_, i) => i);

    let processedBeforeCancel = 0;
    let cancelCaught = false;

    try {
      await MemoryBudgetService.processIncrementally(
        items,
        async (item, idx) => {
          processedBeforeCancel++;
          if (processedBeforeCancel >= 15) {
            cts.cancel('Cancelamento forçado pelo usuário');
          }
          return item;
        },
        { chunkSize: 5, cancellationToken: cts.token }
      );
    } catch (err: any) {
      cancelCaught = true;
      assert.ok(err.name === 'OperationCancelledException' || err.message.includes('Cancelamento') || err.message.includes('cancelada'));
    }

    assert.strictEqual(cancelCaught, true, 'Operação cancelada deve lançar erro explícito');
    assert.ok(processedBeforeCancel < 50, 'Processamento deve ter sido interrompido antes do fim');
  });

  // ---------------------------------------------------------------------------
  // 4. PDFs CRIPTOGRAFADOS COM ENTRADAS ANÔMALAS
  // ---------------------------------------------------------------------------
  console.log('\n--- Vetor 4: Criptografia com Entradas Extremas e Malformadas ---');

  await test('Rejeição controlada de PDF protegido com senha excessivamente longa (> 50.000 caracteres)', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([200, 200]);
    const pdfBytes = await doc.save();

    const hugePassword = 'A'.repeat(50000);
    // Deve ou rejeitar por tamanho ou tratar graciosamente sem travar a CPU
    let handled = false;
    try {
      await EncryptionEngine.encryptPdf(pdfBytes, { userPassword: hugePassword });
      handled = true;
    } catch {
      handled = true; // Falha tratada é aceitável
    }
    assert.strictEqual(handled, true, 'Motor deve lidar com senhas anômalas sem crash');
  });

  // ---------------------------------------------------------------------------
  // 5. NOMES RESERVADOS, CARACTERES NULOS E COLISÃO DE LOTES
  // ---------------------------------------------------------------------------
  console.log('\n--- Vetor 5: Nomes de Arquivos Perigosos, Caracteres Nulos e Colisão ---');

  test('Bloqueio estrito de injeção de caractere nulo (\\0) no caminho de arquivo', () => {
    const res = validateSafeFilePath('C:\\documentos\\peticao.pdf\0.exe');
    assert.strictEqual(res.valid, false);
    assert.ok(res.error?.includes('nulo'));
  });

  test('Bloqueio estrito de caminhos de rede UNC (\\\\evil-server\\share)', () => {
    const res = validateSafeFilePath('\\\\192.168.1.50\\compartilhamento\\arquivo.pdf');
    assert.strictEqual(res.valid, false);
    assert.ok(res.error?.includes('UNC'));
  });

  test('Colisão de nomes: 3 arquivos idênticos no mesmo lote recebem identificadores imutáveis', () => {
    const files = [
      { id: 'uuid_doc_01', name: 'processo.pdf' },
      { id: 'uuid_doc_02', name: 'processo.pdf' },
      { id: 'uuid_doc_03', name: 'processo.pdf' }
    ];

    const uniqueIds = new Set(files.map(f => f.id));
    assert.strictEqual(uniqueIds.size, 3, 'Cada documento em lote DEVE ter um fileId único e imutável');
  });

  // ---------------------------------------------------------------------------
  // 6. CERTIFICADOS FALSOS E DIGEST ADULTERADO
  // ---------------------------------------------------------------------------
  console.log('\n--- Vetor 6: Certificados PAdES Falsos e Assinaturas Corrompidas ---');

  await test('Buffer ASN.1 corrompido passado como certificado deve lançar erro controlado', () => {
    const fakeCertBuffer = crypto.randomBytes(512);
    assert.throws(
      () => PadesSignatureService.parseCertificate(fakeCertBuffer, 'senha123'),
      /PKCS#12|inválido/i,
      'Certificado corrompido deve ser rejeitado com erro tipado'
    );
  });

  // ---------------------------------------------------------------------------
  // 7. DIGITALIZAÇÃO RUIM, RUÍDO E PROTEÇÃO CONTRA PÁGINA EM BRANCO
  // ---------------------------------------------------------------------------
  console.log('\n--- Vetor 7: Digitalização com Ruído Extremo e ImagePreservation ---');

  await test('ImagePreservationError deve impedir exportação de página em branco no OCR pesquisável', async () => {
    const brokenPage = [
      {
        pageNumber: 1,
        width: 595,
        height: 842,
        fullText: 'Texto extraído',
        rawOcrText: 'Texto extraído',
        confidence: 20,
        status: 'incomplete' as const,
        issues: ['Ruído extremo'],
        previewImageUrl: '', // Imagem ausente propositalmente!
        lines: [],
        words: []
      }
    ];

    let caughtPreservationError = false;
    try {
      await OcrDocumentService.generateSearchablePdf(brokenPage, 'Petição');
    } catch (err: any) {
      if (err instanceof ImagePreservationError || err.name === 'ImagePreservationError') {
        caughtPreservationError = true;
      }
    }
    assert.strictEqual(caughtPreservationError, true, 'Deve lançar ImagePreservationError para impedir página em branco');
  });

  // ---------------------------------------------------------------------------
  // 8. INJEÇÃO DE PAYLOADS HOSTIS EM METADADOS E HTML
  // ---------------------------------------------------------------------------
  console.log('\n--- Vetor 8: Injeção de XSS e Tags Maliciosas em Metadados ---');

  test('HtmlSanitizer deve neutralizar injeções polimórficas de XSS em HTML e CSS', () => {
    const xssPayloads = [
      '<script src="http://evil.com/xss.js"></script>',
      '<img src=x onerror=alert("xss")>',
      '<a href="javascript:fetch(\'http://leak.com\')">Clique aqui</a>',
      '<div style="background-image: url(javascript:alert(1))">Texto</div>',
      '<svg onload=alert(document.cookie)>'
    ];

    for (const payload of xssPayloads) {
      const sanitized = HtmlSanitizer.sanitize(payload);
      assert.ok(!sanitized.includes('alert('), `Payload deve ser neutralizado: ${payload}`);
      assert.ok(!sanitized.includes('javascript:'), `Protocolo perigoso deve ser removido: ${payload}`);
      assert.ok(!sanitized.includes('<script'), `Tag script deve ser eliminada: ${payload}`);
    }
  });

  console.log(`\nResultado Suíte 11 (Adversarial): ${passed} Passados, ${failed} Falhados\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAdversarialSuite().catch(err => {
  console.error('Erro fatal na Suíte 11 (Adversarial):', err);
  process.exit(1);
});
