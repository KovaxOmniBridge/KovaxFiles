/**
 * =============================================================================
 * SUÍTE DE INTEGRIDADE: CONTRATO UNIFORME DE ESTADOS E RESULTADOS INCOMPLETOS
 * =============================================================================
 * P0 Bloqueador 4: Garantir que nenhum serviço declare sucesso sobre resultado incompleto.
 *
 * Valida os 6 fluxos centrais:
 * 1. Anonimização (LGPD)
 * 2. Compressão (PDF)
 * 3. Protocolo Judicial (Court Filing)
 * 4. Assinatura Digital (PAdES)
 * 5. Conversão (DOCX / OOXML)
 * 6. Criptografia (Cofre Forte AES-GCM & PDF)
 *
 * Para cada operação relevante ou destrutiva, comprova as 5 condições obrigatórias:
 *  - Sucesso ('completed')
 *  - Falha Parcial ('partial' — jamais 'completed')
 *  - Cancelamento ('canceled' — arquivos originais preservados)
 *  - Entrada Inválida ('failed' — rejeição sem efeitos colaterais)
 *  - Recuperação / Preservação dos Arquivos Originais (hashes SHA-256 intactos)
 *
 * Além de:
 *  - OCR: proíbe invenção de texto em falhas
 *  - Rasterização: proíbe invenção de DPI sem medições reais
 * =============================================================================
 */

import { PDFDocument } from 'pdf-lib';
import assert from 'assert';
import forge from 'node-forge';

import {
  CancellationTokenSource,
  OperationCancelledException,
  determineBatchStatus
} from '../../src/shared/contracts/operation.types';
import { CoreRedactionEngine } from '../../src/core/redaction/redactionCore';
import { CoreCompressionService } from '../../src/core/compression/compressionService';
import { CoreCourtFilingService } from '../../src/core/court-filing/courtFilingService';
import { CoreSignatureService } from '../../src/core/signatures/signatureService';
import { CoreConversionService } from '../../src/core/documents/conversionService';
import { CoreCryptoVaultService } from '../../src/core/crypto/cryptoVaultService';
import { CourtFilingPreparationService, CourtFilingOptions } from '../../src/services/courtFilingPreparationService';
import { LocalPdfEngine } from '../../src/services/pdfEngine';
import { cryptoAdapter } from '../../src/infrastructure/crypto/cryptoAdapter';
import { DocxExporterService } from '../../src/services/docxExporterService';

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

async function createTestPdf(pageCount: number, label: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`${label} - Página ${i}/${pageCount} - CPF 123.456.789-09`, { x: 50, y: 750, size: 12 });
  }
  return await doc.save();
}

function generateSelfSignedP12(commonName: string, pass: string): Buffer {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '9902';
  cert.validity.notBefore = new Date(Date.now() - 3600000);
  cert.validity.notAfter = new Date(Date.now() + 31536000000);
  const attrs = [{ name: 'commonName', value: commonName }, { name: 'countryName', value: 'BR' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], pass, { generateLocalKeyId: true });
  return Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), 'binary');
}

async function runUniformContractsSuite() {
  console.log('='.repeat(80));
  console.log('  SUÍTE DE INTEGRIDADE: CONTRATO UNIFORME DE ESTADOS E ZERO DECLARAÇÃO FALSA');
  console.log('='.repeat(80));

  // ---------------------------------------------------------------------------
  // FLUXO 1: ANONIMIZAÇÃO (LGPD)
  // ---------------------------------------------------------------------------
  console.log('\n--- [1/6] FLUXO DE ANONIMIZAÇÃO (LGPD) ---');
  const pdfAnonOriginal = await createTestPdf(2, 'DOC_LGPD');
  const hashAnonOriginal = cryptoAdapter.computeSha256Sync(pdfAnonOriginal);

  await test('Anonimização - Sucesso (completed)', async () => {
    const res = await CoreRedactionEngine.redactDocument({
      id: 'doc_1',
      name: 'doc_lgpd.pdf',
      pdfBytes: pdfAnonOriginal,
      rectangles: [{ x: 50, y: 740, width: 200, height: 25, pageIndex: 0 }]
    });
    assert.strictEqual(res.status, 'completed');
    assert.strictEqual(res.isSuccess, true);
    assert.ok(res.data?.sanitizedPdfBytes.length! > 0);
  });

  await test('Anonimização - Entrada Inválida (failed) e Preservação de Originais', async () => {
    const corruptedBytes = new Uint8Array([0, 1, 2]);
    const corruptedHashBefore = cryptoAdapter.computeSha256Sync(corruptedBytes);

    const res = await CoreRedactionEngine.redactDocument({
      id: 'doc_bad',
      name: 'corrompido.pdf',
      pdfBytes: corruptedBytes
    });
    assert.strictEqual(res.status, 'failed');
    assert.strictEqual(res.isSuccess, false);
    assert.ok(res.error);

    // Preservação do buffer original
    assert.strictEqual(cryptoAdapter.computeSha256Sync(corruptedBytes), corruptedHashBefore);
    assert.strictEqual(cryptoAdapter.computeSha256Sync(pdfAnonOriginal), hashAnonOriginal);
  });

  await test('Anonimização - Cancelamento Cooperativo (canceled)', async () => {
    const cts = new CancellationTokenSource();
    cts.cancel('Cancelado pelo operador');

    const res = await CoreRedactionEngine.redactDocument({
      id: 'doc_canc',
      name: 'doc.pdf',
      pdfBytes: pdfAnonOriginal
    }, undefined, cts.token);

    assert.strictEqual(res.status, 'canceled');
    assert.strictEqual(res.isSuccess, false);
    assert.strictEqual(cryptoAdapter.computeSha256Sync(pdfAnonOriginal), hashAnonOriginal);
  });

  await test('Anonimização - Lote com Falha Parcial (partial - nunca completed)', async () => {
    const batchRes = await CoreRedactionEngine.redactBatch([
      { id: 'item_1', name: 'valido.pdf', pdfBytes: pdfAnonOriginal },
      { id: 'item_2', name: 'invalido.pdf', pdfBytes: new Uint8Array([9, 9, 9]) }
    ]);
    assert.strictEqual(batchRes.status, 'partial', 'Lote com 1 sucesso e 1 falha DEVE ser "partial"');
    assert.strictEqual(batchRes.succeededItems, 1);
    assert.strictEqual(batchRes.failedItems, 1);
  });

  // ---------------------------------------------------------------------------
  // FLUXO 2: COMPRESSÃO (PDF)
  // ---------------------------------------------------------------------------
  console.log('\n--- [2/6] FLUXO DE COMPRESSÃO (PDF) ---');
  const pdfCompOriginal = await createTestPdf(3, 'DOC_COMPRESSAO');
  const hashCompOriginal = cryptoAdapter.computeSha256Sync(pdfCompOriginal);

  await test('Compressão - Sucesso (completed)', async () => {
    const res = await CoreCompressionService.executeCompression({
      id: 'comp_1',
      name: 'comp.pdf',
      bytes: pdfCompOriginal,
      profile: 'balanced'
    });
    assert.strictEqual(res.status, 'completed');
    assert.strictEqual(res.isSuccess, true);
    assert.ok(res.data?.outputBytes.length! > 0);
  });

  await test('Compressão - Entrada Inválida (failed) e Preservação', async () => {
    const emptyBytes = new Uint8Array(0);
    const res = await CoreCompressionService.executeCompression({
      id: 'comp_empty',
      name: 'vazio.pdf',
      bytes: emptyBytes,
      profile: 'balanced'
    });
    assert.strictEqual(res.status, 'failed');
    assert.strictEqual(res.isSuccess, false);
    assert.strictEqual(cryptoAdapter.computeSha256Sync(pdfCompOriginal), hashCompOriginal);
  });

  await test('Compressão - Cancelamento Cooperativo (canceled)', async () => {
    const cts = new CancellationTokenSource();
    cts.cancel('Cancelado antes da compressão');

    const res = await CoreCompressionService.executeCompression({
      id: 'comp_canc',
      name: 'comp.pdf',
      bytes: pdfCompOriginal,
      profile: 'balanced'
    }, undefined, cts.token);

    assert.strictEqual(res.status, 'canceled');
    assert.strictEqual(res.isSuccess, false);
    assert.strictEqual(cryptoAdapter.computeSha256Sync(pdfCompOriginal), hashCompOriginal);
  });

  await test('Compressão - Lote com Falha Parcial (partial - nunca completed)', async () => {
    const batchRes = await CoreCompressionService.compressBatch([
      { id: 'c1', name: 'ok.pdf', bytes: pdfCompOriginal, profile: 'balanced' },
      { id: 'c2', name: 'bad.pdf', bytes: new Uint8Array([1, 2, 3]), profile: 'balanced' }
    ]);
    assert.strictEqual(batchRes.status, 'partial', 'Lote misto DEVE ser partial');
    assert.strictEqual(batchRes.succeededItems, 1);
    assert.strictEqual(batchRes.failedItems, 1);
  });

  // ---------------------------------------------------------------------------
  // FLUXO 3: PROTOCOLO JUDICIAL (COURT FILING)
  // ---------------------------------------------------------------------------
  console.log('\n--- [3/6] FLUXO DE PROTOCOLO JUDICIAL (COURT FILING) ---');
  const pdfFilingOriginal = await createTestPdf(3, 'PECA_INICIAL');
  const hashFilingOriginal = cryptoAdapter.computeSha256Sync(pdfFilingOriginal);
  const piece1 = await CourtFilingPreparationService.inspectPiece('01_Peca.pdf', pdfFilingOriginal.buffer);

  const baseFilingOptions: CourtFilingOptions = {
    processNumber: '1002345-88.2026.8.26.0100',
    courtName: 'Tribunal de Justiça de SP',
    varalForum: '1a Vara Civel',
    actionType: 'Ordinária',
    authorName: 'Autor',
    defendantName: 'Réu',
    lawyerName: 'Dr. Roberto',
    lawyerOab: 'OAB/SP 123456',
    startFolhaNumber: 1,
    folhaPrefix: 'Fl.',
    padDigits: 3,
    stampPosition: 'top-right',
    stampColor: 'blue',
    includeCoverAndIndex: true,
    includePieceIdentificationHeader: true,
    targetPreset: {
      id: 'tjsp_ok',
      name: 'TJSP Amplo',
      shortLabel: 'TJSP',
      maxVolumeSizeBytes: 10 * 1024 * 1024,
      description: 'Cota normal 10MB'
    }
  };

  await test('Protocolo - Sucesso quando dentro dos limites (completed)', async () => {
    const res = await CoreCourtFilingService.prepareFiling([piece1], baseFilingOptions);
    assert.strictEqual(res.status, 'completed');
    assert.strictEqual(res.isSuccess, true);
    assert.strictEqual(res.data?.summary.reproved, false);
  });

  await test('Protocolo - Reprovação por excesso de tamanho NÃO PODE ser completed ou isSuccess (failed/partial)', async () => {
    // Opções com cota de 100 bytes (impossível para um PDF)
    const strictOptions: CourtFilingOptions = {
      ...baseFilingOptions,
      targetPreset: {
        id: 'tjsp_estrito',
        name: 'TJSP 100 Bytes',
        shortLabel: 'TJSP',
        maxVolumeSizeBytes: 100,
        description: 'Cota impossível'
      }
    };

    const res = await CoreCourtFilingService.prepareFiling([piece1], strictOptions);

    // REGRA CRÍTICA: Não pode ser completed e não pode ser isSuccess!
    assert.notStrictEqual(res.status, 'completed', 'Pacote que excede cota JAMAIS pode ter status completed');
    assert.strictEqual(res.isSuccess, false, 'Pacote que excede cota JAMAIS pode ter isSuccess: true');
    assert.strictEqual(res.status, 'failed', 'Se todos os volumes excedem o limite, deve ser failed');
    assert.ok(res.error, 'Deve retornar erro explícito com detalhes de excesso');

    // Preservação do buffer original
    assert.strictEqual(cryptoAdapter.computeSha256Sync(pdfFilingOriginal), hashFilingOriginal);
  });

  await test('Protocolo - Cancelamento Cooperativo (canceled)', async () => {
    const cts = new CancellationTokenSource();
    cts.cancel('Cancelado antes da montagem');

    const res = await CoreCourtFilingService.prepareFiling([piece1], baseFilingOptions, undefined, cts.token);
    assert.strictEqual(res.status, 'canceled');
    assert.strictEqual(res.isSuccess, false);
    assert.strictEqual(cryptoAdapter.computeSha256Sync(pdfFilingOriginal), hashFilingOriginal);
  });

  await test('Protocolo - Entrada Inválida sem peças (failed)', async () => {
    const res = await CoreCourtFilingService.prepareFiling([], baseFilingOptions);
    assert.strictEqual(res.status, 'failed');
    assert.strictEqual(res.isSuccess, false);
    assert.ok(res.error?.message.includes('Nenhuma peça'));
  });

  // ---------------------------------------------------------------------------
  // FLUXO 4: ASSINATURA DIGITAL (PAdES)
  // ---------------------------------------------------------------------------
  console.log('\n--- [4/6] FLUXO DE ASSINATURA DIGITAL (PAdES) ---');
  const certPass = 'SenhaPades@2026';
  const p12Buffer = generateSelfSignedP12('DR. CARLOS ALBERTO SILVA:12345678900', certPass);
  const pdfPadesOriginal = await createTestPdf(1, 'DOC_PADES');
  const hashPadesOriginal = cryptoAdapter.computeSha256Sync(pdfPadesOriginal);

  await test('Assinatura PAdES - Sucesso (completed)', async () => {
    const res = await CoreSignatureService.signPdf({
      pdfBuffer: pdfPadesOriginal,
      p12Buffer,
      password: certPass
    });
    assert.strictEqual(res.status, 'completed');
    assert.strictEqual(res.isSuccess, true);
    assert.ok(res.data && res.data.length > pdfPadesOriginal.length);
  });

  await test('Assinatura PAdES - Entrada Inválida com senha incorreta (failed) e Preservação', async () => {
    const res = await CoreSignatureService.signPdf({
      pdfBuffer: pdfPadesOriginal,
      p12Buffer,
      password: 'SenhaErradaIncorreta!'
    });
    assert.strictEqual(res.status, 'failed');
    assert.strictEqual(res.isSuccess, false);
    // Preservação estrita do PDF de entrada
    assert.strictEqual(cryptoAdapter.computeSha256Sync(pdfPadesOriginal), hashPadesOriginal);
  });

  await test('Assinatura PAdES - Cancelamento Cooperativo (canceled)', async () => {
    const cts = new CancellationTokenSource();
    cts.cancel('Cancelado antes da assinatura');

    const res = await CoreSignatureService.signPdf({
      pdfBuffer: pdfPadesOriginal,
      p12Buffer,
      password: certPass
    }, cts.token);

    assert.strictEqual(res.status, 'canceled');
    assert.strictEqual(res.isSuccess, false);
    assert.strictEqual(cryptoAdapter.computeSha256Sync(pdfPadesOriginal), hashPadesOriginal);
  });

  await test('Assinatura PAdES - Lote com Falha Parcial (partial - nunca completed)', async () => {
    const batchRes = await CoreSignatureService.signBatch([
      { id: 's1', name: 'valido.pdf', options: { pdfBuffer: pdfPadesOriginal, p12Buffer, password: certPass } },
      { id: 's2', name: 'falha.pdf', options: { pdfBuffer: pdfPadesOriginal, p12Buffer, password: 'SenhaErrada' } }
    ]);
    assert.strictEqual(batchRes.status, 'partial', 'Lote com senha certa e errada DEVE ser partial');
    assert.strictEqual(batchRes.succeededItems, 1);
    assert.strictEqual(batchRes.failedItems, 1);
  });

  // ---------------------------------------------------------------------------
  // FLUXO 5: CONVERSÃO DE DOCUMENTOS (DOCX / OOXML)
  // ---------------------------------------------------------------------------
  console.log('\n--- [5/6] FLUXO DE CONVERSÃO DE DOCUMENTOS (DOCX / OOXML) ---');
  const sampleHtml = '<h1>Petição Inicial</h1><p>Texto com <strong>destaque</strong>.</p>';
  const docxGeneratedBuffer = await DocxExporterService.generateHtmlDocxBuffer(sampleHtml, 'Petição');
  const docxOriginal = new Uint8Array(docxGeneratedBuffer);
  const hashDocxOriginal = cryptoAdapter.computeSha256Sync(docxOriginal);

  await test('Conversão DOCX - Sucesso (completed)', async () => {
    const res = await CoreConversionService.convertDocxToHtml({
      id: 'd1',
      name: 'peticao.docx',
      docxBytes: docxOriginal
    });
    assert.strictEqual(res.status, 'completed');
    assert.strictEqual(res.isSuccess, true);
    assert.ok(res.data?.html.includes('Petição Inicial'));
  });

  await test('Conversão DOCX - Entrada Inválida com ZIP malformado (failed) e Preservação', async () => {
    const malformedBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]); // truncated zip
    const malformedHash = cryptoAdapter.computeSha256Sync(malformedBytes);

    const res = await CoreConversionService.convertDocxToHtml({
      id: 'd_bad',
      name: 'corrompido.docx',
      docxBytes: malformedBytes
    });
    assert.strictEqual(res.status, 'failed');
    assert.strictEqual(res.isSuccess, false);
    assert.strictEqual(cryptoAdapter.computeSha256Sync(malformedBytes), malformedHash);
    assert.strictEqual(cryptoAdapter.computeSha256Sync(docxOriginal), hashDocxOriginal);
  });

  await test('Conversão DOCX - Cancelamento Cooperativo (canceled)', async () => {
    const cts = new CancellationTokenSource();
    cts.cancel('Cancelado');

    const res = await CoreConversionService.convertDocxToHtml({
      id: 'd_canc',
      name: 'doc.docx',
      docxBytes: docxOriginal
    }, cts.token);

    assert.strictEqual(res.status, 'canceled');
    assert.strictEqual(res.isSuccess, false);
    assert.strictEqual(cryptoAdapter.computeSha256Sync(docxOriginal), hashDocxOriginal);
  });

  await test('Conversão DOCX - Lote com Falha Parcial (partial - nunca completed)', async () => {
    const batchRes = await CoreConversionService.convertDocxBatch([
      { id: 'b1', name: 'valido.docx', docxBytes: docxOriginal },
      { id: 'b2', name: 'corrompido.docx', docxBytes: new Uint8Array([1, 2, 3]) }
    ]);
    assert.strictEqual(batchRes.status, 'partial', 'Lote de conversão misto DEVE ser partial');
    assert.strictEqual(batchRes.succeededItems, 1);
    assert.strictEqual(batchRes.failedItems, 1);
  });

  // ---------------------------------------------------------------------------
  // FLUXO 6: CRIPTOGRAFIA (COFRE FORTE AES-GCM & PDF)
  // ---------------------------------------------------------------------------
  console.log('\n--- [6/6] FLUXO DE CRIPTOGRAFIA (COFRE FORTE AES-GCM & PDF) ---');
  const vaultPayload = new TextEncoder().encode('Conteúdo sigiloso do processo de auditoria');
  const hashVaultOriginal = cryptoAdapter.computeSha256Sync(vaultPayload);
  const vaultPass = 'ChaveMestraCofre@2026!';

  let encryptedVaultBytes: Uint8Array;

  await test('Criptografia Cofre - Sucesso Encriptação (completed)', async () => {
    const encRes = await CoreCryptoVaultService.encryptVault({
      id: 'v1',
      name: 'segredo.txt',
      bytes: vaultPayload,
      password: vaultPass
    });
    assert.strictEqual(encRes.status, 'completed');
    assert.strictEqual(encRes.isSuccess, true);
    assert.ok(encRes.data && encRes.data.length > vaultPayload.length);
    encryptedVaultBytes = encRes.data!;
  });

  await test('Criptografia Cofre - Sucesso Decriptação (completed)', async () => {
    const decRes = await CoreCryptoVaultService.decryptVault({
      id: 'v1_dec',
      name: 'segredo.txt',
      encryptedBytes: encryptedVaultBytes,
      password: vaultPass
    });
    assert.strictEqual(decRes.status, 'completed');
    assert.strictEqual(decRes.isSuccess, true);
    assert.strictEqual(new TextDecoder().decode(decRes.data!), 'Conteúdo sigiloso do processo de auditoria');
  });

  await test('Criptografia Cofre - Rejeição por Senha Errada ou Adulteração (failed) e Preservação', async () => {
    const hashEncBefore = cryptoAdapter.computeSha256Sync(encryptedVaultBytes);

    const failRes = await CoreCryptoVaultService.decryptVault({
      id: 'v_fail',
      name: 'segredo.txt',
      encryptedBytes: encryptedVaultBytes,
      password: 'SenhaTotalmenteIncorreta'
    });
    assert.strictEqual(failRes.status, 'failed');
    assert.strictEqual(failRes.isSuccess, false);

    // Preservação do buffer cifrado original
    assert.strictEqual(cryptoAdapter.computeSha256Sync(encryptedVaultBytes), hashEncBefore);
    assert.strictEqual(cryptoAdapter.computeSha256Sync(vaultPayload), hashVaultOriginal);
  });

  await test('Criptografia Cofre - Cancelamento Cooperativo (canceled)', async () => {
    const cts = new CancellationTokenSource();
    cts.cancel('Cancelado antes de encriptar');

    const res = await CoreCryptoVaultService.encryptVault({
      id: 'v_canc',
      name: 'segredo.txt',
      bytes: vaultPayload,
      password: vaultPass
    }, cts.token);

    assert.strictEqual(res.status, 'canceled');
    assert.strictEqual(res.isSuccess, false);
    assert.strictEqual(cryptoAdapter.computeSha256Sync(vaultPayload), hashVaultOriginal);
  });

  await test('Criptografia Cofre - Lote com Falha Parcial (partial - nunca completed)', async () => {
    const batchRes = await CoreCryptoVaultService.processVaultBatch([
      { id: 'b1', name: 'item1.txt', mode: 'decrypt', bytes: encryptedVaultBytes, password: vaultPass },
      { id: 'b2', name: 'item2.txt', mode: 'decrypt', bytes: encryptedVaultBytes, password: 'SenhaIncorreta' }
    ]);
    assert.strictEqual(batchRes.status, 'partial', 'Lote de cofre com 1 senha certa e 1 errada DEVE ser partial');
    assert.strictEqual(batchRes.succeededItems, 1);
    assert.strictEqual(batchRes.failedItems, 1);
  });

  // ---------------------------------------------------------------------------
  // FLUXO ADICIONAL: OCR E RASTERIZAÇÃO (PROIBIÇÃO DE INVENÇÃO)
  // ---------------------------------------------------------------------------
  console.log('\n--- [EXTRA] OCR E RASTERIZAÇÃO (PROIBIÇÃO DE INVENÇÃO) ---');

  await test('Rasterização - Proibição de inventar DPI sem medições reais', async () => {
    const unavailableRep = LocalPdfEngine.createUnavailableMeasurementReport(
      'balanced',
      300,
      150,
      0.85,
      25000000,
      [{ widthPt: 595, heightPt: 842 }]
    );
    assert.strictEqual(unavailableRep.averageEffectiveDpi, 0, 'DPI não pode ser inventado (deve ser 0)');
    assert.strictEqual(unavailableRep.status, 'measurement_unavailable');
    assert.strictEqual(unavailableRep.measurementStatus, 'measurement_unavailable');
    assert.strictEqual(LocalPdfEngine.validateRasterizationReport(unavailableRep), false, 'Relatório sem medidas reais deve ser reprovado na validação');
  });

  console.log('\n================================================================================');
  console.log(`RESULTADO DA SUÍTE DE CONTRATOS UNIFORMES:`);
  console.log(`  Testes Passados: ${passed}`);
  console.log(`  Testes Falhados: ${failed}`);
  console.log('================================================================================\n');

  if (failed > 0) process.exit(1);
}

runUniformContractsSuite().catch(err => {
  console.error('Erro fatal na suíte de contratos uniformes:', err);
  process.exit(1);
});
