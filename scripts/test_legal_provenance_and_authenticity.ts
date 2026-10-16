/**
 * Bateria de Testes Automatizados da Cadeia de Proveniência e Autenticidade do Acervo Jurídico
 *
 * Valida os Requisitos Estruturais de Honestidade Forense:
 * 1. Cadeia de Proveniência em 4 Camadas:
 *    - Publicação oficial identificada (órgão, diário, data formal, ato)
 *    - Cópia ou captura verificável da fonte (URL exata, hostname verificado, hash externo independente)
 *    - Comparação do texto e controle de versão (texto canônico, conferência literal, histórico)
 *    - Status de autenticidade com evidências técnicas defensáveis em juízo
 * 2. Bloqueio de menções de domínio em substring (anti-spoofing)
 * 3. URN sintética gerada pelo app NÃO comprova que o ato foi oficialmente publicado
 * 4. Bloqueio incondicional de autovalidação circular (clonagem do hash local como hash externo)
 * 5. Remoção integral de datas de captura presumidas (a data de publicação não é a data de captura)
 * 6. Registros sem captura independente documentada são transparentemente NAO_VERIFICADO_EXTERNAMENTE
 * 7. Suspensão preventiva obrigatória da Súmula Vinculante 30 (não publicada no DJe pelo STF)
 * 8. Ingestão documental com snapshot físico bruto comprovado gera COMPROVADO_COM_EVIDENCIA
 */

import assert from 'assert';
import { JURISPRUDENCE_STATUTES } from '../src/data/jurisprudenceData.ts';
import { LegalCorpusAuditorService, normalizeCanonicalLegalText } from '../src/services/legalCorpusAuditorService.ts';
import { LegalKnowledgeBaseService, LegalArticle } from '../src/services/legalKnowledgeBaseService.ts';
import { OfficialSourceIngestionService } from '../src/services/officialSourceIngestionService.ts';

async function runLegalProvenanceTestSuite() {
  console.log('='.repeat(80));
  console.log('  TESTES DE AUTENTICIDADE E CADEIA DE PROVENIÊNCIA DO ACERVO JURÍDICO');
  console.log('='.repeat(80));

  let testsPassed = 0;
  let testsFailed = 0;

  function runTest(testName: string, fn: () => void) {
    try {
      fn();
      console.log(`  [PASS] ${testName}`);
      testsPassed++;
    } catch (err: any) {
      console.error(`  [FAIL] ${testName} -> ${err?.message || err}`);
      testsFailed++;
    }
  }

  // =========================================================================
  // 1. VALIDAÇÃO ESTRITA DE DOMÍNIO GOVERNAMENTAL (ANTI-SPOOFING)
  // =========================================================================
  console.log('\n[1/7] Testando Validação Estrita de Domínio (Rejeição de Substrings e Spoofing)...');

  runTest('URL com domínio governamental em path ou query não pode ser aceita como fonte oficial', () => {
    const fakePathUrl = 'https://attacker.com/portal/planalto.gov.br/lei13709';
    const res = LegalCorpusAuditorService.validateOfficialDomain(fakePathUrl);
    assert.strictEqual(res.isValid, false, 'Deve rejeitar domínio governamental inserido apenas no path');
    assert.strictEqual(res.hostname, 'attacker.com');
  });

  runTest('Subdomínio de atacante simulando autoridade oficial deve ser rejeitado', () => {
    const fakeSubdomain = 'https://planalto.gov.br.malicious-server.net/norma';
    const res = LegalCorpusAuditorService.validateOfficialDomain(fakeSubdomain);
    assert.strictEqual(res.isValid, false, 'Deve rejeitar subdomínio fraudulento fora da terminação .gov.br');
  });

  runTest('Hostname legítimo de Tribunal (*.jus.br) deve ser homologado com isJudicial=true', () => {
    const stfUrl = 'https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/801';
    const res = LegalCorpusAuditorService.validateOfficialDomain(stfUrl);
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.isJudicial, true);
    assert.strictEqual(res.hostname, 'jurisprudencia.stf.jus.br');
  });

  runTest('Hostname legítimo da Presidência (*.gov.br) deve ser homologado com isExecutive=true', () => {
    const planaltoUrl = 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm';
    const res = LegalCorpusAuditorService.validateOfficialDomain(planaltoUrl);
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.isExecutive, true);
    assert.strictEqual(res.hostname, 'www.planalto.gov.br');
  });

  runTest('Mera menção textual em nota de rodapé NÃO comprova origem', () => {
    const res = LegalCorpusAuditorService.isValidOfficialSource('', 'Publicado no Diário Oficial da União');
    assert.strictEqual(res, false, 'Menção textual sem URL governamental oficial comprovada deve ser rejeitada');
  });

  // =========================================================================
  // 2. URN SINTÉTICA NÃO COMPROVA PUBLICAÇÃO OFICIAL
  // =========================================================================
  console.log('\n[2/7] Testando Distinção entre URN Oficial e URN Sintética Provisória...');

  runTest('URN construída pelo aplicativo deve ser rotulada como provisória (isOfficialUrnVerified=false)', () => {
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
  });

  runTest('Dispositivo com URN oficial homologada na fonte deve ter isOfficialUrnVerified=true', () => {
    const sv1 = JURISPRUDENCE_STATUTES.find(a => a.id === 'stf-sv-1')!;
    assert.strictEqual(sv1.isOfficialUrnVerified, true, 'Súmula Vinculante 1 possui URN oficial verificada no STF');
    const isVerified = LegalCorpusAuditorService.isUrnOfficiallyVerified(sv1);
    assert.strictEqual(isVerified, true);
  });

  // =========================================================================
  // 3. BLOQUEIO DE AUTOVALIDAÇÃO E EXIGÊNCIA DE CAPTURA INDEPENDENTE
  // =========================================================================
  console.log('\n[3/7] Testando Bloqueio de Autovalidação e Exigência de Captura Real...');

  runTest('Tentativa de clonar o hash local para o campo externo sem captura é REJEITADA como autovalidação', () => {
    const localContent = 'Texto armazenado localmente no repositório de teste.';
    const localHash = LegalCorpusAuditorService.computeCanonicalSha256(localContent);

    const circularArticle: LegalArticle = {
      id: 'circular-fraud-test',
      lawName: 'Lei Simulada',
      article: 'Artigo 1º',
      title: 'Teste de Autovalidação',
      content: localContent,
      keywords: ['teste'],
      sourceUrl: 'https://www.planalto.gov.br/ccivil_03/leis/l000.htm',
      officialPublisher: 'Presidência da República',
      queryDate: '2026-01-01',
      // Falsa evidência: reutilização do hash do texto local
      externalSourceHash: localHash,
      officialContentSha256: localHash
    };

    const report = LegalCorpusAuditorService.verifyArticle(circularArticle);
    assert.strictEqual(
      report.authenticityStatus,
      'NAO_VERIFICADO_EXTERNAMENTE',
      'Tentativa de autovalidação circular DEVE ser rebaixada para NAO_VERIFICADO_EXTERNAMENTE'
    );
    assert.strictEqual(report.isDefensible, false, 'Não é defensável em juízo');
    assert.strictEqual(report.provenance?.evidence.isAutovalidationRejected, true, 'isAutovalidationRejected deve ser true');
    assert.ok(report.auditNotes.includes('Autovalidação circular rejeitada'), 'Nota de auditoria deve explicar a rejeição');
  });

  runTest('Remoção de datas presumidas: timestamp que imita data histórica de publicação é descartado', () => {
    const historicalArticle: LegalArticle = {
      id: 'historical-date-test',
      lawName: 'Súmula Histórica',
      article: 'Súmula 1',
      title: 'Teste Histórico',
      content: 'Texto histórico.',
      keywords: ['teste'],
      sourceUrl: 'https://jurisprudencia.stf.jus.br/sumula/1',
      queryDate: '2007-06-06',
      provenance: {
        publication: {
          authority: 'Supremo Tribunal Federal',
          officialJournal: 'DJe 31/2007',
          publicationDate: '2007-06-06',
          actNumber: 'Súmula 1',
          isOfficialUrnVerified: true
        },
        sourceCapture: {
          exactUrl: 'https://jurisprudencia.stf.jus.br/sumula/1',
          verifiedHostname: 'jurisprudencia.stf.jus.br',
          isDomainVerified: true,
          capturedAt: '2007-06-06T12:00:00Z', // Data presumida forjada!
          captureMethod: 'MANUAL_UNVERIFIED',
          sourceFormat: 'HTML'
        },
        versionControl: {
          versionReference: 'v1.0',
          canonicalText: 'Texto histórico.',
          storedContentHash: LegalCorpusAuditorService.computeCanonicalSha256('Texto histórico.'),
          contentMatch: false,
          versionHistory: []
        },
        evidence: {
          status: 'NAO_VERIFICADO_EXTERNAMENTE',
          isDefensible: false,
          hasIdentifiedPublication: true,
          hasVerifiableCapture: false,
          hasValidExternalHash: false,
          hasContentMatch: false,
          isDomainVerified: true,
          isOfficialUrnVerified: true,
          hasDocumentedSnapshot: false,
          auditNotes: 'Pendente'
        }
      }
    };

    const chain = LegalCorpusAuditorService.buildProvenanceChain(historicalArticle);
    assert.strictEqual(chain.sourceCapture.capturedAt, undefined, 'A data presumida de 2007 DEVE ser descartada');
  });

  runTest('Ingestão oficial com captura real documentada gera COMPROVADO_COM_EVIDENCIA de modo defensável', () => {
    const rawOfficialPayload = '{"orgao":"STF","dje":"DJe 31/2007","enunciado":"Ofende a garantia constitucional do ato jurídico perfeito a decisão que, sem ponderar as circunstâncias do caso concreto, desconsidera a validez e a eficácia de acordo constante de termo de adesão instituído pela Lei Complementar nº 110/2001."}';
    const extractedText = 'Ofende a garantia constitucional do ato jurídico perfeito a decisão que, sem ponderar as circunstâncias do caso concreto, desconsidera a validez e a eficácia de acordo constante de termo de adesão instituído pela Lei Complementar nº 110/2001.';
    const realTimestamp = '2026-10-16T08:30:00.000Z';

    const sv1 = JURISPRUDENCE_STATUTES.find(a => a.id === 'stf-sv-1')!;
    const ingestedSv1 = OfficialSourceIngestionService.ingestOfficialArtifact({
      article: sv1,
      rawPayload: rawOfficialPayload,
      extractedText,
      exactUrl: 'https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/801',
      authority: 'Supremo Tribunal Federal (Plenário)',
      officialJournal: 'DJe nº 31/2007, p. 1',
      publicationDate: '2007-06-06',
      capturedAt: realTimestamp,
      captureMethod: 'OFFICIAL_DJE_SNAPSHOT',
      sourceFormat: 'JSON_OFFICIAL'
    });

    const report = LegalCorpusAuditorService.verifyArticle(ingestedSv1);
    assert.strictEqual(report.authenticityStatus, 'COMPROVADO_COM_EVIDENCIA');
    assert.strictEqual(report.isDefensible, true);
    assert.strictEqual(report.isSuspended, false);
    assert.strictEqual(report.provenance?.sourceCapture.hasDocumentedSnapshot, true);
    assert.strictEqual(report.provenance?.sourceCapture.capturedAt, realTimestamp);
    assert.strictEqual(report.provenance?.versionControl.contentMatch, true);
  });

  // =========================================================================
  // 4. CONTROLE DE VERSÃO E PRESERVAÇÃO DE HISTÓRICO
  // =========================================================================
  console.log('\n[4/7] Testando Controle de Versão e Preservação de Histórico em Atualizações e Revogações...');

  runTest('createVersionUpdate arquiva redação anterior no histórico e cria nova versão com vigência', () => {
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
      version: 'v1.0-ORIGINAL'
    };

    const updated = LegalCorpusAuditorService.createVersionUpdate(baseArticle, {
      newContent: newText,
      modifyingAct: 'Lei nº 14.905/2024',
      effectiveDate: '2024-08-30'
    });

    // 1. Conteúdo ativo atualizado
    assert.strictEqual(updated.content, newText);
    // 2. Histórico preservado
    assert.ok(updated.provenance?.versionControl.versionHistory.length === 1);
    const archived = updated.provenance!.versionControl.versionHistory[0];
    assert.strictEqual(archived.canonicalText, originalText);
    assert.strictEqual(archived.status, 'ALTERADO');
    assert.strictEqual(archived.modifyingAct, 'Lei nº 14.905/2024');
    assert.strictEqual(archived.effectiveEndDate, '2024-08-30');
  });

  // =========================================================================
  // 5. SUSPENSÃO PREVENTIVA DA SÚMULA VINCULANTE 30
  // =========================================================================
  console.log('\n[5/7] Testando Suspensão Preventiva da Súmula Vinculante 30 (Não Publicada no DJe)...');

  runTest('Súmula Vinculante 30 deve possuir status SUSPENSO_PREVENTIVAMENTE e isDefensible=false', () => {
    const sv30 = JURISPRUDENCE_STATUTES.find(a => a.id === 'stf-sv-30');
    assert.ok(sv30, 'SV 30 deve constar no acervo');

    const rep = LegalCorpusAuditorService.verifyArticle(sv30);
    assert.strictEqual(rep.authenticityStatus, 'SUSPENSO_PREVENTIVAMENTE');
    assert.strictEqual(rep.isSuspended, true);
    assert.strictEqual(rep.isDefensible, false);
    assert.ok(rep.auditNotes.includes('PSV 30'));
    assert.ok(rep.auditNotes.includes('não foi publicado no DJe'));
  });

  // =========================================================================
  // 6. PROTEÇÃO DE CITAÇÃO E ADVERTÊNCIA DE REGISTRO NÃO COMPROVADO
  // =========================================================================
  console.log('\n[6/7] Testando Minutas de Citação e Advertências de Fundamentação...');

  runTest('Citação de dispositivo não verificado externamente adverte o operador jurídico com nota de acervo local', () => {
    const sv1 = JURISPRUDENCE_STATUTES.find(a => a.id === 'stf-sv-1')!;
    const citation = LegalKnowledgeBaseService.formatCitation(sv1, 'PETICAO_ABNT');
    assert.ok(
      citation.includes('NOTA DE AUDITORIA') && citation.includes('Registro documental de acervo local'),
      'Citação deve conter aviso explícito de acervo local pendente de homologação'
    );
    assert.ok(
      !citation.includes('PROVENIÊNCIA OFICIAL COMPROVADA'),
      'NÃO pode exibir selo de comprovado para registro sem captura arquivada'
    );
  });

  runTest('Citação de súmula com proveniência documentada exibe data real, veículo e hash de captura', () => {
    const sv1 = JURISPRUDENCE_STATUTES.find(a => a.id === 'stf-sv-1')!;
    const realTimestamp = '2026-10-16T08:30:00.000Z';
    const ingestedSv1 = OfficialSourceIngestionService.ingestOfficialArtifact({
      article: sv1,
      rawPayload: JSON.stringify({ orgao: 'STF', dje: 'DJe 31/2007', enunciado: sv1.content }),
      extractedText: sv1.content,
      exactUrl: 'https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/801',
      authority: 'Supremo Tribunal Federal (Plenário)',
      officialJournal: 'DJe nº 31/2007, p. 1',
      publicationDate: '2007-06-06',
      capturedAt: realTimestamp
    });

    const citation = LegalKnowledgeBaseService.formatCitation(ingestedSv1, 'PETICAO_ABNT');
    assert.ok(citation.includes('PROVENIÊNCIA OFICIAL COMPROVADA'), 'Deve exibir selo para ingestão documentada');
    assert.ok(citation.includes('DJe nº 31/2007'), 'Deve exibir veículo oficial');
    assert.ok(citation.includes('SHA-256 da Fonte:'), 'Deve exibir hash da captura');
    assert.ok(citation.includes(realTimestamp), 'Deve exibir o timestamp real da captura');
  });

  // =========================================================================
  // 7. CADEIA DE PROVENIÊNCIA DAS 62 SÚMULAS VINCULANTES
  // =========================================================================
  console.log('\n[7/7] Validando Cadeia de Proveniência nas 62 Súmulas Vinculantes do STF...');

  runTest('Todas as 62 Súmulas Vinculantes são auditadas com honestidade forense (sem falsos comprovados)', () => {
    assert.strictEqual(JURISPRUDENCE_STATUTES.length, 62);
    let unverifiedCount = 0;
    let suspendedCount = 0;
    let fakeAuthenticCount = 0;

    for (const sv of JURISPRUDENCE_STATUTES) {
      assert.ok(sv.provenance, `Súmula ${sv.id} deve possuir objeto provenance`);
      assert.ok(sv.provenance.publication.authority.includes('Supremo Tribunal Federal'));
      assert.ok(sv.provenance.sourceCapture.exactUrl.startsWith('https://jurisprudencia.stf.jus.br'));
      assert.strictEqual(sv.provenance.sourceCapture.isDomainVerified, true);
      assert.ok(sv.provenance.versionControl.storedContentHash.length === 64);
      assert.strictEqual(sv.provenance.sourceCapture.capturedAt, undefined, `Súmula ${sv.id} não pode ter capturedAt presumido`);

      if (sv.id === 'stf-sv-30') {
        assert.strictEqual(sv.provenance.evidence.status, 'SUSPENSO_PREVENTIVAMENTE');
        suspendedCount++;
      } else {
        assert.strictEqual(sv.provenance.evidence.status, 'NAO_VERIFICADO_EXTERNAMENTE');
        assert.strictEqual(sv.provenance.evidence.isDefensible, false);
        assert.strictEqual(sv.provenance.evidence.hasDocumentedSnapshot, false);
        assert.strictEqual(sv.provenance.versionControl.contentMatch, false);
        unverifiedCount++;
      }

      if (sv.authenticityStatus === 'COMPROVADO_COM_EVIDENCIA') {
        fakeAuthenticCount++;
      }
    }

    assert.strictEqual(unverifiedCount, 61, '61 Súmulas Vinculantes devem estar honestamente marcadas como NAO_VERIFICADO_EXTERNAMENTE');
    assert.strictEqual(suspendedCount, 1, 'Exatamente 1 Súmula Vinculante (SV 30) deve estar suspensa preventivamente');
    assert.strictEqual(fakeAuthenticCount, 0, 'ZERO súmulas sem captura documentada podem receber COMPROVADO_COM_EVIDENCIA');
  });

  console.log('\n' + '='.repeat(80));
  console.log(`RESULTADO DA BATERIA DE PROVENIÊNCIA E AUTENTICIDADE:`);
  console.log(`  Testes Passados: ${testsPassed}`);
  console.log(`  Testes Falhados: ${testsFailed}`);
  console.log('='.repeat(80));

  if (testsFailed > 0) {
    throw new Error(`Falha na bateria de proveniência com ${testsFailed} erro(s).`);
  }
}

runLegalProvenanceTestSuite().catch(err => {
  console.error('\nErro fatal durante execução da bateria de proveniência:', err);
  process.exit(1);
});
