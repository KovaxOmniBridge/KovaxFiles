/**
 * Reprodução do Bloqueador P0: Cadeia de Custódia do Acervo Jurídico
 *
 * Demonstra a vulnerabilidade atual:
 * Informar um payload bruto arbitrário (lixo/conteúdo aleatório), mas passar separadamente
 * o texto correto de uma súmula e obter indevidamente COMPROVADO_COM_EVIDENCIA.
 *
 * O sistema deve REJEITAR e NUNCA conceder COMPROVADO_COM_EVIDENCIA para payloads arbitrários!
 */

import assert from 'assert';
import { OfficialSourceIngestionService } from '../../src/services/officialSourceIngestionService';
import { LegalCorpusAuditorService } from '../../src/services/legalCorpusAuditorService';
import { JURISPRUDENCE_STATUTES } from '../../src/data/jurisprudenceData';
import { STF_SV1_REFERENCE } from '../fixtures/officialLegalReferences';

async function testArbitraryPayloadMustBeRejected() {
  console.log('[Teste de Vulnerabilidade] Ingestão com payload arbitrário NÃO pode receber COMPROVADO_COM_EVIDENCIA');

  const sv1 = JURISPRUDENCE_STATUTES.find(a => a.id === 'stf-sv-1')!;

  // Atacante / chamador fornece payload arbitrário (conteúdo que NÃO contém a norma)
  const arbitraryRawPayload = JSON.stringify({
    dados_aleatorios: 'Lorem ipsum dolor sit amet, texto arbitrário de teste',
    sistema: 'servidor_teste',
    timestamp: Date.now()
  });

  // Mas o chamador fornece o texto correto da SV 1 no campo extractedText
  const injectedValidText = sv1.content;

  const result = OfficialSourceIngestionService.ingestOfficialArtifact({
    article: sv1,
    rawPayload: arbitraryRawPayload,
    extractedText: injectedValidText, // Texto forjado pelo chamador, ausente no rawPayload!
    exactUrl: 'https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/801',
    authority: 'Supremo Tribunal Federal (Plenário)',
    officialJournal: 'DJe nº 31/2007, p. 1',
    publicationDate: '2007-06-06',
    capturedAt: '2026-10-16T12:00:00.000Z',
    captureMethod: 'OFFICIAL_DJE_SNAPSHOT',
    sourceFormat: 'JSON_OFFICIAL'
  });

  const auditReport = LegalCorpusAuditorService.verifyArticle(result);

  console.log('Status obtido com payload arbitrário:', result.authenticityStatus);
  console.log('Status no relatório de auditoria:', auditReport.authenticityStatus);
  console.log('Defensável:', auditReport.isDefensible);

  // EXIGÊNCIA MANDATÓRIA DE SEGURANÇA:
  // Um payload arbitrário NUNCA pode receber COMPROVADO_COM_EVIDENCIA nem ser defensável!
  assert.notStrictEqual(
    result.authenticityStatus,
    'COMPROVADO_COM_EVIDENCIA',
    'VULNERABILIDADE DETECTADA: Payload arbitrário recebeu indevidamente COMPROVADO_COM_EVIDENCIA!'
  );
  assert.strictEqual(
    auditReport.isDefensible,
    false,
    'VULNERABILIDADE DETECTADA: Registro com payload arbitrário não pode ser juridicamente defensável!'
  );
}

testArbitraryPayloadMustBeRejected()
  .then(() => {
    console.log('Teste passou: o sistema já rejeita payload arbitrário.');
  })
  .catch(err => {
    console.error('Falha esperada na reprodução do bug:');
    console.error(err.message);
    process.exit(1);
  });
