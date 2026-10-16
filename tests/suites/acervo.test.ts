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

  // 5. Integridade do Acervo das 62 Súmulas Vinculantes
  test('Todas as 62 Súmulas Vinculantes do STF devem estar cadastradas e auditáveis', () => {
    const svs = JURISPRUDENCE_STATUTES.filter(s => s.id.startsWith('stf-sv-'));
    assert.strictEqual(svs.length, 62, 'Acervo deve conter exatamente 62 súmulas vinculantes do STF');
    for (const sv of svs) {
      assert.ok(sv.sourceUrl?.includes('stf.jus.br'), `SV ${sv.id} deve ter URL oficial do STF`);
    }
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
