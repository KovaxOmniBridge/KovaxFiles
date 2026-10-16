/**
 * =============================================================================
 * SUÍTE 10: ACERVO JURÍDICO, PROVENIÊNCIA E AUTENTICIDADE
 * =============================================================================
 * Comprova: Fontes oficiais, versões, integridade, revogação e autenticidade.
 * Execução: Todo Pull Request.
 *
 * RIGOR METODOLÓGICO:
 * Os testes desta suíte utilizam referências independentes e constantes
 * pré-computadas externamente (tests/fixtures/officialLegalReferences.ts)
 * para evitar qualquer autocertificação circular ou confirmação de consistência
 * meramente interna.
 * =============================================================================
 */

import assert from 'assert';
import { LegalCorpusAuditorService } from '../../src/services/legalCorpusAuditorService.ts';
import { OfficialSourceIngestionService } from '../../src/services/officialSourceIngestionService.ts';
import { OfficialArtifactRepositoryService } from '../../src/services/officialArtifactRepositoryService.ts';
import { JURISPRUDENCE_STATUTES } from '../../src/data/jurisprudenceData.ts';
import { LegalArticle } from '../../src/services/legalKnowledgeBaseService.ts';
import {
  STF_SV1_REFERENCE,
  STF_SV56_REFERENCE,
  CC_ART406_VERSION_TRANSITION,
  LGPD_ART1_REFERENCE
} from '../fixtures/officialLegalReferences.ts';

async function runAcervoSuite() {
  console.log('='.repeat(80));
  console.log('  [SUÍTE 10: ACERVO JURÍDICO] FONTES, VERSÕES, INTEGRIDADE E REFERÊNCIAS INDEPENDENTES');
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

  // 4. Conferência com Referências Independentes Externas FIPS 180-4 SHA-256
  test('Conferência com referência independente: Hash canônico local de SV1 e SV56 coincide 100% com digest externo pré-calculado', () => {
    const sv1 = JURISPRUDENCE_STATUTES.find(a => a.id === 'stf-sv-1')!;
    assert.ok(sv1, 'SV 1 deve existir no acervo');
    const localSv1Hash = LegalCorpusAuditorService.computeCanonicalSha256(sv1.content);
    assert.strictEqual(
      localSv1Hash,
      STF_SV1_REFERENCE.independentCanonicalSha256,
      'Hash canônico local de SV1 deve coincidir exatamente com o digest externo pré-calculado do DJe'
    );
    assert.strictEqual(
      sv1.provenance?.versionControl.storedContentHash,
      STF_SV1_REFERENCE.independentCanonicalSha256,
      'Hash armazenado no acervo deve corresponder à referência independente FIPS 180-4'
    );

    const sv56 = JURISPRUDENCE_STATUTES.find(a => a.id === 'stf-sv-56')!;
    assert.ok(sv56, 'SV 56 deve existir no acervo');
    const localSv56Hash = LegalCorpusAuditorService.computeCanonicalSha256(sv56.content);
    assert.strictEqual(
      localSv56Hash,
      STF_SV56_REFERENCE.independentCanonicalSha256,
      'Hash canônico local de SV56 deve coincidir exatamente com o digest externo pré-calculado do DJe'
    );
  });

  // 5. Controle de Versão e Preservação de Histórico com Hashes Independentes
  test('Controle de versões: Transição real (CC art. 406 pela Lei 14.905/2024) gera nova versão e preserva redação anterior', () => {
    const orig = CC_ART406_VERSION_TRANSITION.original;
    const upd = CC_ART406_VERSION_TRANSITION.updated;

    const baseArticle: LegalArticle = {
      id: 'cc-art-406',
      lawName: 'Código Civil (Lei nº 10.406/2002)',
      article: 'Artigo 406',
      title: 'Taxa Legal de Juros',
      content: orig.text,
      keywords: ['juros', 'taxa legal', 'código civil'],
      sourceUrl: orig.sourceUrl,
      officialPublisher: 'Presidência da República',
      queryDate: orig.publicationDate,
      version: 'v1.0-ORIGINAL'
    };

    const updated = LegalCorpusAuditorService.createVersionUpdate(baseArticle, {
      newContent: upd.text,
      modifyingAct: upd.modifyingAct,
      effectiveDate: upd.effectiveDate,
      externalSourceHash: upd.independentSha256
    });

    assert.strictEqual(updated.content, upd.text);
    const updatedHash = LegalCorpusAuditorService.computeCanonicalSha256(updated.content);
    assert.strictEqual(updatedHash, upd.independentSha256, 'Hash da versão atualizada deve coincidir com o hash externo da Lei 14.905/2024');

    assert.strictEqual(updated.provenance?.versionControl.versionHistory.length, 1, 'Histórico deve conter a versão anterior');
    const previousVersion = updated.provenance!.versionControl.versionHistory[0];
    assert.strictEqual(previousVersion.canonicalText, orig.text);
    assert.strictEqual(previousVersion.storedContentHash, orig.independentSha256);
    assert.strictEqual(previousVersion.modifyingAct, upd.modifyingAct);
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

  // 8. Ingestão Legítima com Snapshot Bruto Comprovado e Hashes de Referência
  test('Ingestão legítima: Snapshot oficial de DJe com payload bruto comprovado gera COMPROVADO_COM_EVIDENCIA', () => {
    const realNow = '2026-10-16T12:00:00.000Z';
    const sv1 = JURISPRUDENCE_STATUTES.find(a => a.id === 'stf-sv-1')!;

    const ingested = OfficialSourceIngestionService.ingestOfficialArtifact({
      article: sv1,
      rawPayload: STF_SV1_REFERENCE.rawPayload,
      extractedText: STF_SV1_REFERENCE.canonicalText,
      exactUrl: STF_SV1_REFERENCE.exactUrl,
      authority: STF_SV1_REFERENCE.authority,
      officialJournal: STF_SV1_REFERENCE.officialJournal,
      publicationDate: STF_SV1_REFERENCE.publicationDate,
      capturedAt: realNow,
      captureMethod: 'OFFICIAL_DJE_SNAPSHOT',
      sourceFormat: 'JSON_OFFICIAL'
    });

    assert.strictEqual(ingested.authenticityStatus, 'COMPROVADO_COM_EVIDENCIA');
    assert.strictEqual(ingested.provenance?.evidence.isDefensible, true);
    assert.strictEqual(ingested.provenance?.sourceCapture.hasDocumentedSnapshot, true);
    assert.strictEqual(ingested.provenance?.sourceCapture.capturedAt, realNow);
    assert.strictEqual(
      ingested.provenance?.sourceCapture.rawArtifactSha256,
      STF_SV1_REFERENCE.independentRawPayloadSha256,
      'Hash do artefato bruto deve corresponder ao digest pré-calculado da fonte DJe'
    );
    assert.strictEqual(
      ingested.provenance?.sourceCapture.extractedContentHash,
      STF_SV1_REFERENCE.independentCanonicalSha256,
      'Hash do texto extraído deve coincidir com a referência canônica independente'
    );
    assert.notStrictEqual(
      ingested.provenance?.sourceCapture.rawArtifactSha256,
      ingested.provenance?.versionControl.storedContentHash,
      'O hash do artefato bruto JSON difere do hash do texto canônico'
    );
  });

  // 9. Detecção e Bloqueio de Divergência Textual entre Acervo e Captura Oficial
  test('Detecção de divergência: Se o texto extraído da fonte oficial diferir do texto local, auditoria acusa DIVERGENCIA_DETECTADA', () => {
    const tamperedPayload = JSON.stringify({
      fonte_oficial: 'STF',
      enunciado: 'Texto adulterado contendo alterações não aprovadas pelo Plenário.'
    });
    const realNow = '2026-10-16T12:05:00.000Z';
    const sv1 = JURISPRUDENCE_STATUTES.find(a => a.id === 'stf-sv-1')!;

    const divergentIngested = OfficialSourceIngestionService.ingestOfficialArtifact({
      article: sv1,
      rawPayload: tamperedPayload,
      extractedText: 'Texto adulterado contendo alterações não aprovadas pelo Plenário.',
      exactUrl: STF_SV1_REFERENCE.exactUrl,
      authority: STF_SV1_REFERENCE.authority,
      officialJournal: STF_SV1_REFERENCE.officialJournal,
      publicationDate: STF_SV1_REFERENCE.publicationDate,
      capturedAt: realNow,
      captureMethod: 'OFFICIAL_DJE_SNAPSHOT',
      sourceFormat: 'JSON_OFFICIAL'
    });

    const report = LegalCorpusAuditorService.verifyArticle(divergentIngested);
    assert.strictEqual(report.authenticityStatus, 'DIVERGENCIA_DETECTADA', 'Divergência entre o texto armazenado e a captura oficial deve ser detectada');
    assert.strictEqual(report.isSuspended, true, 'Dispositivo divergente deve ser automaticamente suspenso');
    assert.strictEqual(report.isDefensible, false, 'Dispositivo com divergência não pode ser considerado defensável em juízo');
  });

  // 10. Bloqueio Obrigatório de Payload Arbitrário (Anti-Injeção de Falsa Evidência)
  test('Bloqueio de payload arbitrário: Payload arbitrário com URL e timestamp oficiais NÃO pode receber COMPROVADO_COM_EVIDENCIA', () => {
    const sv1 = JURISPRUDENCE_STATUTES.find(a => a.id === 'stf-sv-1')!;
    const arbitraryPayload = JSON.stringify({
      fakeInfo: 'qualquer texto irrelevante',
      timestamp: '2026-10-16T12:00:00Z'
    });

    const ingested = OfficialSourceIngestionService.ingestOfficialArtifact({
      article: sv1,
      rawPayload: arbitraryPayload,
      extractedText: sv1.content, // Chamador tenta fornecer o texto correto da súmula externamente
      exactUrl: STF_SV1_REFERENCE.exactUrl,
      authority: STF_SV1_REFERENCE.authority,
      officialJournal: STF_SV1_REFERENCE.officialJournal,
      publicationDate: STF_SV1_REFERENCE.publicationDate,
      capturedAt: '2026-10-16T12:00:00.000Z',
      sourceFormat: 'JSON_OFFICIAL'
    });

    assert.notStrictEqual(
      ingested.authenticityStatus,
      'COMPROVADO_COM_EVIDENCIA',
      'Payload arbitrário NUNCA pode ser aprovado como COMPROVADO_COM_EVIDENCIA'
    );
    assert.strictEqual(ingested.authenticityStatus, 'DIVERGENCIA_DETECTADA');
    assert.strictEqual(ingested.provenance?.evidence.isDefensible, false);

    const auditReport = LegalCorpusAuditorService.verifyArticle(ingested);
    assert.strictEqual(auditReport.authenticityStatus, 'DIVERGENCIA_DETECTADA');
    assert.strictEqual(auditReport.isDefensible, false);
  });

  // 11. Distinção Criptográfica Essencial: rawArtifactSha256 sobre Bytes Brutos sem Normalização
  test('Distinção criptográfica de rawArtifactSha256: Calculado estritamente sobre bytes brutos sem normalização textual', () => {
    const rawWithSpaces = '{\n  "enunciado": "Texto com formatacao original"  \r\n}';
    const rawCompact = '{"enunciado":"Texto com formatacao original"}';

    const hashSpaces = LegalCorpusAuditorService.computeRawArtifactSha256(rawWithSpaces);
    const hashCompact = LegalCorpusAuditorService.computeRawArtifactSha256(rawCompact);

    // Bytes brutos são diferentes, logo seus digests de artefato DEVEM ser diferentes
    assert.notStrictEqual(
      hashSpaces,
      hashCompact,
      'Artefatos brutos com formatações físicas distintas devem produzir hashes raw distintos'
    );

    // Já o hash canônico com normalização textual colapsaria as quebras e espaços
    const canonicalNormalized = LegalCorpusAuditorService.computeCanonicalSha256('Texto com formatacao original');
    assert.notStrictEqual(
      hashSpaces,
      canonicalNormalized,
      'rawArtifactSha256 do arquivo bruto JSON não pode ser igual ao canonicalSha256 do texto extraído'
    );

    // Validação com fixture imutável pré-calculada externamente
    const computedSv1Raw = LegalCorpusAuditorService.computeRawArtifactSha256(STF_SV1_REFERENCE.rawPayload);
    assert.strictEqual(
      computedSv1Raw,
      STF_SV1_REFERENCE.independentRawPayloadSha256,
      'Hash do artefato bruto de SV1 deve coincidir exatamente com a referência independente'
    );
  });

  // 12. Auditoria Forense Independente e Reproduzível a partir do Arquivo Original
  test('Auditoria independente: Auditor externo reproduz verificação a partir do arquivo bruto sem confiar em metadados do app', () => {
    const sv1 = JURISPRUDENCE_STATUTES.find(a => a.id === 'stf-sv-1')!;

    // 1. Auditoria com o arquivo autêntico da publicação oficial
    const genuineAudit = LegalCorpusAuditorService.auditPublicationIndependently({
      article: sv1,
      originalArtifact: STF_SV1_REFERENCE.rawPayload,
      exactUrl: STF_SV1_REFERENCE.exactUrl,
      authority: STF_SV1_REFERENCE.authority,
      publicationDate: STF_SV1_REFERENCE.publicationDate,
      sourceFormat: 'JSON_OFFICIAL',
      expectedRawHash: STF_SV1_REFERENCE.independentRawPayloadSha256
    });

    assert.strictEqual(genuineAudit.isAuthentic, true);
    assert.strictEqual(genuineAudit.auditStatus, 'COMPROVADO_COM_EVIDENCIA');
    assert.strictEqual(genuineAudit.rawArtifactHashMatches, true);
    assert.strictEqual(genuineAudit.textMatches, true);
    assert.strictEqual(genuineAudit.isDefensible, true);

    // 2. Auditoria com arquivo adulterado ou arbitrário
    const tamperedAudit = LegalCorpusAuditorService.auditPublicationIndependently({
      article: sv1,
      originalArtifact: '{"enunciado": "Texto adulterado sem autorização"}',
      exactUrl: STF_SV1_REFERENCE.exactUrl,
      authority: STF_SV1_REFERENCE.authority,
      publicationDate: STF_SV1_REFERENCE.publicationDate,
      sourceFormat: 'JSON_OFFICIAL',
      expectedRawHash: STF_SV1_REFERENCE.independentRawPayloadSha256
    });

    assert.strictEqual(tamperedAudit.isAuthentic, false);
    assert.notStrictEqual(tamperedAudit.auditStatus, 'COMPROVADO_COM_EVIDENCIA');
    assert.strictEqual(tamperedAudit.isDefensible, false);
  });

  // 13. Repositório de Custódia e Preservação com Controle de Versão
  test('Repositório de custódia: Preservação de artefatos brutos com rastreabilidade pericial', () => {
    OfficialArtifactRepositoryService.clear();

    const sv1Artifact = {
      snapshotId: 'snap-stf-sv-1',
      articleId: STF_SV1_REFERENCE.id,
      exactUrl: STF_SV1_REFERENCE.exactUrl,
      authority: STF_SV1_REFERENCE.authority,
      publicationDate: STF_SV1_REFERENCE.publicationDate,
      capturedAt: '2026-10-16T12:00:00.000Z',
      sourceFormat: 'JSON_OFFICIAL' as const,
      rawArtifactSha256: STF_SV1_REFERENCE.independentRawPayloadSha256,
      rawPayload: STF_SV1_REFERENCE.rawPayload,
      extractedCanonicalText: STF_SV1_REFERENCE.canonicalText,
      extractedContentHash: STF_SV1_REFERENCE.independentCanonicalSha256
    };

    OfficialArtifactRepositoryService.storePreservedArtifact(sv1Artifact);
    const retrieved = OfficialArtifactRepositoryService.getPreservedArtifact(STF_SV1_REFERENCE.id);

    assert.ok(retrieved);
    assert.strictEqual(retrieved.rawArtifactSha256, STF_SV1_REFERENCE.independentRawPayloadSha256);
    assert.strictEqual(retrieved.extractedContentHash, STF_SV1_REFERENCE.independentCanonicalSha256);
    assert.strictEqual(OfficialArtifactRepositoryService.listPreservedArtifacts().length, 1);
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
