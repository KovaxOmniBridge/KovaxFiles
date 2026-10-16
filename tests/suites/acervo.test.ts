/**
 * =============================================================================
 * SUÍTE 10: ACERVO JURÍDICO, PROVENIÊNCIA E AUTENTICIDADE
 * =============================================================================
 * Comprova: Fontes oficiais, versões, integridade, revogação e autenticidade.
 * Execução: Todo Pull Request.
 * =============================================================================
 */

import assert from 'assert';
import { LegalCorpusAuditorService } from '../../src/services/legalCorpusAuditorService.ts';
import { OfficialSourceIngestionService } from '../../src/services/officialSourceIngestionService.ts';
import { JURISPRUDENCE_STATUTES } from '../../src/data/jurisprudenceData.ts';
import { LegalArticle } from '../../src/services/legalKnowledgeBaseService.ts';

async function runAcervoSuite() {
  console.log('='.repeat(80));
  console.log('  [SUÍTE 10: ACERVO JURÍDICO] FONTES, VERSÕES, INTEGRIDADE, REVOGAÇÃO E AUTENTICIDADE');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name} -> ${err.message}`);
      failed++;
    }
  }

  // 1. Validação Estrita de Hostnames Governamentais e Judiciais (Anti-Spoofing)
  test('Validação estrita de fonte oficial: aceita jus.br/gov.br e rejeita spoofing em subdomínios/paths', () => {
    const validCourtUrl = 'https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/801';
    const validGovUrl = 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm';
    const spoofPathUrl = 'https://attacker.com/portal/planalto.gov.br/lei13709';
    const spoofSubdomainUrl = 'https://planalto.gov.br.malicious-server.net/norma';

    const courtAudit = LegalCorpusAuditorService.validateOfficialDomain(validCourtUrl);
    assert.strictEqual(courtAudit.isValid, true);
    assert.strictEqual(courtAudit.isJudicial, true);

    const govAudit = LegalCorpusAuditorService.validateOfficialDomain(validGovUrl);
    assert.strictEqual(govAudit.isValid, true);
    assert.strictEqual(govAudit.isExecutive, true);

    const spoofPathAudit = LegalCorpusAuditorService.validateOfficialDomain(spoofPathUrl);
    assert.strictEqual(spoofPathAudit.isValid, false, 'URL com domínio oficial no path deve ser rejeitada');

    const spoofSubAudit = LegalCorpusAuditorService.validateOfficialDomain(spoofSubdomainUrl);
    assert.strictEqual(spoofSubAudit.isValid, false, 'Subdomínio com sufixo forjado deve ser rejeitado');
  });

  // 2. Distinção entre URN Oficial LexML e URN Sintética Provisória
  test('Distinção de URN: Apenas registros autenticados na fonte recebem isOfficialUrnVerified=true', () => {
    const syntheticArticle: LegalArticle = {
      id: 'custom-art-99',
      lawName: 'Regulamento Local Teste',
      article: 'Artigo 1º',
      title: 'Teste',
      content: 'Conteúdo de teste.',
      keywords: ['teste']
    };

    const isVerified = LegalCorpusAuditorService.isUrnOfficiallyVerified(syntheticArticle);
    assert.strictEqual(isVerified, false, 'URN construída pelo app NÃO pode ser tratada como oficialmente verificada');

    const urn = LegalCorpusAuditorService.generateLexmlUrn(syntheticArticle);
    assert.ok(urn.startsWith('urn:lex:br:'), 'Gera URN sintética no padrão LexML para indexação interna');

    const sv1 = JURISPRUDENCE_STATUTES.find(a => a.id === 'stf-sv-1')!;
    assert.strictEqual(sv1.isOfficialUrnVerified, true, 'Súmula Vinculante 1 possui URN oficial verificada no STF');
  });

  // 3. Suspensão Preventiva da Súmula Vinculante 30 (Não Publicada)
  test('Suspensão preventiva automática da Súmula Vinculante 30 (DJe não publicado)', () => {
    const sv30 = JURISPRUDENCE_STATUTES.find(a => a.id === 'stf-sv-30');
    assert.ok(sv30, 'SV 30 deve constar no acervo');

    const rep = LegalCorpusAuditorService.verifyArticle(sv30);
    assert.strictEqual(rep.authenticityStatus, 'SUSPENSO_PREVENTIVAMENTE');
    assert.strictEqual(rep.isDefensible, false, 'SV 30 NÃO pode ser admitida como juridicamente defensável');
  });

  // 4. Controle de Versão e Preservação de Histórico de Revogação
  test('Controle de versões: Atualização normativa gera nova versão e preserva a redação anterior no histórico', () => {
    const originalText = 'A taxa de juros legais é de 6% ao ano.';
    const newText = 'A taxa de juros legais passa a ser calculada conforme a taxa Selic.';

    const baseArticle: LegalArticle = {
      id: 'lei-teste-art1',
      lawName: 'Lei dos Juros nº 1.000/1950',
      article: 'Artigo 1º',
      title: 'Taxa de Juros',
      content: originalText,
      keywords: ['juros'],
      sourceUrl: 'https://www.planalto.gov.br/leis/l1000.htm',
      officialPublisher: 'Presidência da República',
      queryDate: '1950-01-01',
      version: 'v1.0-ORIGINAL',
      externalSourceHash: LegalCorpusAuditorService.computeCanonicalSha256(originalText)
    };

    const newExternalHash = LegalCorpusAuditorService.computeCanonicalSha256(newText);
    const updated = LegalCorpusAuditorService.createVersionUpdate(baseArticle, {
      newContent: newText,
      modifyingAct: 'Lei nº 14.905/2024',
      effectiveDate: '2024-08-30',
      externalSourceHash: newExternalHash
    });

    assert.strictEqual(updated.content, newText);
    assert.strictEqual(updated.provenance?.versionControl.versionHistory.length, 1, 'Histórico deve conter a versão anterior');
    assert.strictEqual(updated.provenance!.versionControl.versionHistory[0].canonicalText, originalText);
  });

  // 6. Rejeição de Autovalidação Circular (Anti-Fraude de Fonte)
  test('Rejeição de autovalidação: O auditor rejeita clone do hash local como hash externo sem snapshot físico', () => {
    const fakeSelfValidated: LegalArticle = {
      id: 'fake-self-valid',
      lawName: 'Lei Imaginária',
      article: 'Artigo 1º',
      title: 'Teste',
      content: 'Texto que tenta se autovalidar copiando seu próprio hash.',
      keywords: ['teste'],
      sourceUrl: 'https://www.planalto.gov.br/ccivil_03/leis/l0001.htm',
      officialPublisher: 'Presidência da República',
      officialRef: 'DOU de 01/01/2026',
      queryDate: '2026-01-01',
      // Tenta forjar evidência copiando o próprio hash canônico
      externalSourceHash: LegalCorpusAuditorService.computeCanonicalSha256('Texto que tenta se autovalidar copiando seu próprio hash.')
    };

    const report = LegalCorpusAuditorService.verifyArticle(fakeSelfValidated);
    assert.strictEqual(report.authenticityStatus, 'NAO_VERIFICADO_EXTERNAMENTE', 'Autovalidação circular DEVE ser rebaixada para NAO_VERIFICADO_EXTERNAMENTE');
    assert.strictEqual(report.isDefensible, false, 'Não pode ser juridicamente defensável');
    assert.strictEqual(report.provenance?.evidence.isAutovalidationRejected, true, 'Flag isAutovalidationRejected deve ser verdadeira');
  });

  // 7. Remoção Obrigatória de Datas de Captura Presumidas
  test('Remoção de datas presumidas: Súmula sem captura documentada não herda data de publicação como capturedAt', () => {
    const sv1 = JURISPRUDENCE_STATUTES.find(a => a.id === 'stf-sv-1')!;
    assert.strictEqual(sv1.provenance?.sourceCapture.capturedAt, undefined, 'capturedAt não pode ser a data de publicação da súmula (2007)');
    assert.strictEqual(sv1.authenticityStatus, 'NAO_VERIFICADO_EXTERNAMENTE', 'Sem captura física arquivada, status deve ser NAO_VERIFICADO_EXTERNAMENTE');
  });

  // 8. Ingestão Legítima com Snapshot Bruto Comprovado
  test('Ingestão legítima: Apenas artefato oficial capturado com snapshot bruto e texto coincidente gera COMPROVADO_COM_EVIDENCIA', () => {
    const rawOfficialJson = JSON.stringify({
      tribunal: 'Supremo Tribunal Federal',
      enunciado: 'Texto oficial extraído do DJe com absoluta fidelidade.',
      dje: 'DJe nº 100/2026'
    });
    const realNow = new Date().toISOString();

    const sampleArticle: LegalArticle = {
      id: 'statute-ingest-test',
      lawName: 'Súmula Teste STF',
      article: 'Enunciado 1',
      title: 'Teste de Ingestão',
      content: 'Texto oficial extraído do DJe com absoluta fidelidade.',
      keywords: ['teste'],
      sourceUrl: 'https://jurisprudencia.stf.jus.br/sumula/100',
      officialPublisher: 'Supremo Tribunal Federal',
      queryDate: '2026-10-16'
    };

    const ingested = OfficialSourceIngestionService.ingestOfficialArtifact({
      article: sampleArticle,
      rawPayload: rawOfficialJson,
      extractedText: 'Texto oficial extraído do DJe com absoluta fidelidade.',
      exactUrl: 'https://jurisprudencia.stf.jus.br/sumula/100',
      authority: 'Supremo Tribunal Federal (Plenário)',
      officialJournal: 'DJe nº 100/2026',
      publicationDate: '2026-10-16',
      capturedAt: realNow,
      captureMethod: 'OFFICIAL_DJE_SNAPSHOT',
      sourceFormat: 'JSON_OFFICIAL'
    });

    assert.strictEqual(ingested.authenticityStatus, 'COMPROVADO_COM_EVIDENCIA');
    assert.strictEqual(ingested.provenance?.evidence.isDefensible, true);
    assert.strictEqual(ingested.provenance?.sourceCapture.hasDocumentedSnapshot, true);
    assert.strictEqual(ingested.provenance?.sourceCapture.capturedAt, realNow);
    assert.notStrictEqual(ingested.provenance?.sourceCapture.externalSourceHash, ingested.provenance?.versionControl.storedContentHash, 'O hash do artefato bruto JSON difere do hash do texto canônico');
  });

  console.log(`\nResultado Suíte 10 (Acervo): ${passed} Passados, ${failed} Falhados\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAcervoSuite().catch(err => {
  console.error('Erro fatal na Suíte 10 (Acervo):', err);
  process.exit(1);
});
