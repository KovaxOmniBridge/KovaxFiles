/**
 * KovaxFiles Desktop — Reproduction Test for P0 Bloqueador 4:
 * "Garantir que nenhum serviço declare sucesso sobre resultado incompleto"
 *
 * Reproduces failure when:
 * 1. A court filing package exceeds the court limit, but CoreCourtFilingService
 *    declares status: 'completed' and isSuccess: true.
 * 2. Incomplete or destructive workflows lack uniform contract states.
 */

import { PDFDocument } from 'pdf-lib';
import assert from 'assert';
import { CoreCourtFilingService } from '../../src/core/court-filing/courtFilingService';
import { CourtFilingPreparationService, CourtFilingPiece, CourtFilingOptions } from '../../src/services/courtFilingPreparationService';

async function createSamplePdf(pageCount: number, label: string): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`${label} - Pagina ${i}/${pageCount}`, { x: 50, y: 750, size: 14 });
  }
  const bytes = await doc.save();
  return bytes.buffer;
}

async function runReproTest() {
  console.log('='.repeat(80));
  console.log('  REPRO TEST: NENHUM SERVIÇO PODE DECLARAR SUCESSO SOBRE RESULTADO INCOMPLETO');
  console.log('='.repeat(80));

  // 1. Criar peça PDF
  const pdfBuf = await createSamplePdf(3, 'ANEXO VOLUMOSO');
  const piece = await CourtFilingPreparationService.inspectPiece('anexo_denso.pdf', pdfBuf);

  // 2. Definir um limite do tribunal que propositalmente NÃO comporta a peça (ex: limite de 100 bytes)
  const options: CourtFilingOptions = {
    processNumber: '1002345-88.2026.8.26.0100',
    courtName: 'Tribunal de Justiça de SP',
    varalForum: '1a Vara Civel',
    actionType: 'Procedimento Comum',
    authorName: 'Autor',
    defendantName: 'Reu',
    lawyerName: 'Dr. Advogado',
    lawyerOab: 'OAB/SP 123456',
    startFolhaNumber: 1,
    folhaPrefix: 'Fl.',
    padDigits: 3,
    stampPosition: 'top-right',
    stampColor: 'blue',
    includeCoverAndIndex: true,
    includePieceIdentificationHeader: true,
    targetPreset: {
      id: 'tjsp_estrito',
      name: 'TJSP Estrito Limite Minimo',
      shortLabel: 'TJSP',
      maxVolumeSizeBytes: 500, // Menor que o PDF de ~2KB
      description: 'Cota de teste ultra restrita'
    }
  };

  console.log('[1/1] Testando se CoreCourtFilingService.prepareFiling NUNCA declara "completed" ou isSuccess: true quando volume excede o limite...');
  const opResult = await CoreCourtFilingService.prepareFiling([piece], options);

  // O pacote foi reprovado por exceder o limite do tribunal
  assert.strictEqual(opResult.data?.summary.reproved, true, 'O pacote deve estar reprovado no resumo interno');

  // REGRA BLOQUEADORA: Se o pacote exceder o limite, NÃO PODE retornar status: 'completed' e NÃO PODE ter isSuccess: true!
  assert.notStrictEqual(opResult.status, 'completed', 'FALHA: CoreCourtFilingService declarou status: "completed" sobre pacote que excedeu o limite do tribunal!');
  assert.strictEqual(opResult.isSuccess, false, 'FALHA: CoreCourtFilingService declarou isSuccess: true sobre pacote reprovado por limite!');
  assert.ok(opResult.error, 'Deve conter erro explicando a reprovação');

  console.log('\n[REPRO SUCESSO]: A verificação de bloqueio está funcionando corretamente!\n');
}

runReproTest().catch(err => {
  console.error('\n[REPRO COMPROVADA - O bug existe antes da correção]:', err.message);
  process.exit(1);
});
