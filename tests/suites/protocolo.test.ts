/**
 * =============================================================================
 * SUÍTE 9: PROTOCOLO PROCESSUAL E JUNTADA (COURT FILING)
 * =============================================================================
 * Comprova: Paginação contínua, divisão real em volumes, limites de tamanho e manifesto.
 * Execução: Todo Pull Request.
 * =============================================================================
 */

import { PDFDocument } from 'pdf-lib';
import assert from 'assert';
import {
  CourtFilingPreparationService,
  CourtFilingOptions
} from '../../src/services/courtFilingPreparationService.ts';
import { CoreCourtFilingService } from '../../src/core/court-filing/courtFilingService.ts';

async function createSamplePdf(pageCount: number, labelPrefix: string): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`${labelPrefix} - Folha ${i} de ${pageCount}`, {
      x: 50,
      y: 750,
      size: 14
    });
  }
  const bytes = await doc.save();
  return bytes.buffer;
}

async function runProtocoloSuite() {
  console.log('='.repeat(80));
  console.log('  [SUÍTE 9: PROTOCOLO] PAGINAÇÃO, DIVISÃO REAL, LIMITES E MANIFESTO DE JUNTADA');
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

  // 1. Inspecionar Peças e Hashes SHA-256
  const bufInicial = await createSamplePdf(3, 'PETIÇÃO INICIAL');
  const bufProcuracao = await createSamplePdf(2, 'PROCURAÇÃO');
  const bufDocumentos = await createSamplePdf(5, 'DOCUMENTOS ANEXOS');

  const piece1 = await CourtFilingPreparationService.inspectPiece('01_Peticao_Inicial.pdf', bufInicial);
  const piece2 = await CourtFilingPreparationService.inspectPiece('02_Procuracao.pdf', bufProcuracao);
  const piece3 = await CourtFilingPreparationService.inspectPiece('03_Documentos.pdf', bufDocumentos);

  await test('Inspeção de peças processuais com cálculo de SHA-256 determinístico', async () => {
    assert.strictEqual(piece1.originalPageCount, 3);
    assert.strictEqual(piece2.originalPageCount, 2);
    assert.strictEqual(piece3.originalPageCount, 5);
    assert.strictEqual(piece1.sha256Hex.length, 64, 'Deve conter hash SHA-256 de 64 caracteres');
  });

  // 2. Divisão em Volumes com Base em Limite de Tamanho / MB
  const pieces = [piece1, piece2, piece3];
  const simulatedLimitBytes = Math.round(piece1.sizeBytes + piece2.sizeBytes + 500);
  const plannedVolumes = CourtFilingPreparationService.planVolumes(pieces, simulatedLimitBytes, 1);

  await test('Planejamento de divisão real de volumes respeitando cotas', async () => {
    assert.ok(plannedVolumes.length >= 2, `Deve dividir em múltiplos volumes (planejado: ${plannedVolumes.length})`);
    assert.strictEqual(plannedVolumes[0].startFolha, 1, 'Volume 1 deve iniciar na folha 1');
    assert.strictEqual(plannedVolumes[1].startFolha, plannedVolumes[0].endFolha + 1, 'Continuidade estrita de paginação');
  });

  // 3. Execução da Pipeline Integrada com Paginação, Chancela e Manifesto
  let result: any;
  const options: CourtFilingOptions = {
    processNumber: '1002345-88.2026.8.26.0100',
    courtName: 'Tribunal de Justiça do Estado de São Paulo',
    varalForum: '1ª Vara Cível da Comarca da Capital',
    actionType: 'Ação Ordinária',
    authorName: 'Autor da Ação',
    defendantName: 'Réu da Ação',
    lawyerName: 'Dr. Roberto Diniz',
    lawyerOab: 'OAB/SP 432.100',
    startFolhaNumber: 1,
    folhaPrefix: 'Fl.',
    padDigits: 3,
    stampPosition: 'top-right',
    stampColor: 'blue',
    includeCoverAndIndex: true,
    includePieceIdentificationHeader: true,
    targetPreset: {
      id: 'test_preset',
      name: 'Preset Teste',
      shortLabel: 'Teste',
      maxVolumeSizeBytes: simulatedLimitBytes,
      description: 'Cota de teste'
    }
  };

  await test('Executar pipeline de montagem: volumes gerados, capa sumária e pacote ZIP', async () => {
    result = await CourtFilingPreparationService.executeFilingPipeline(
      pieces,
      options,
      (msg, pct) => {
        // Progresso
      }
    );

    assert.strictEqual(result.volumes.length, plannedVolumes.length, 'Qtd de volumes deve coincidir com o planejamento');
    assert.ok(result.zipPackageBytes.length > 1000, 'Pacote ZIP com todos os volumes deve ser gerado');
  });

  // 4. Verificação do Manifesto Oficial de Protocolo
  await test('Manifesto Oficial de Protocolo: hashes SHA-256 de todos os volumes e relação de peças', async () => {
    const manifestJson = JSON.parse(result.manifestJson);
    assert.strictEqual(manifestJson.dadosProcessuais.processo, '1002345-88.2026.8.26.0100');
    assert.strictEqual(manifestJson.resumo.totalVolumes, result.volumes.length);

    for (let i = 0; i < result.volumes.length; i++) {
      assert.strictEqual(manifestJson.volumesGerados[i].sha256Hex, result.volumes[i].sha256Hex, 'Hash do volume no manifesto deve bater exatamente');
      assert.ok(manifestJson.volumesGerados[i].sha256Hex.length === 64);
    }
  });

  // 5. Proibição de declarar sucesso quando o pacote excede os limites do tribunal
  await test('Proibição absoluta de declarar sucesso ou pronto para protocolo quando um pacote excede os limites', async () => {
    const strictOptions: CourtFilingOptions = {
      ...options,
      targetPreset: {
        id: 'limite_ultra_estrito',
        name: 'Tribunal Cota Mínima',
        shortLabel: 'TRIB',
        maxVolumeSizeBytes: 100, // Menor que qualquer volume PDF
        description: 'Cota de 100 bytes'
      }
    };

    const opResult = await CoreCourtFilingService.prepareFiling(pieces, strictOptions);
    assert.strictEqual(opResult.isSuccess, false, 'Pacote com volume excedente JAMAIS pode ter isSuccess: true');
    assert.notStrictEqual(opResult.status, 'completed', 'Pacote com volume excedente JAMAIS pode ter status "completed"');
    assert.strictEqual(opResult.data?.summary.reproved, true, 'Deve indicar reprovado: true no resumo');
    assert.strictEqual(opResult.data?.summary.status, 'REPROVADO_POR_EXCESSO_DE_TAMANHO');
    assert.ok(opResult.error, 'Deve conter erro explícito de validação');
  });

  console.log(`\nResultado Suíte 9 (Protocolo): ${passed} Passados, ${failed} Falhados\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runProtocoloSuite().catch(err => {
  console.error('Erro fatal na Suíte 9 (Protocolo):', err);
  process.exit(1);
});
