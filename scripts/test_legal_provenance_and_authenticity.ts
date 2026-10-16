/**
 * Bateria de Testes Automatizados da Cadeia de Proveniência e Autenticidade do Acervo Jurídico
 *
 * Valida os Requisitos Estruturais:
 * 1. Cadeia de Proveniência em 4 Camadas:
 *    - Publicação oficial identificada (órgão, diário, data formal, ato)
 *    - Cópia ou captura verificável da fonte (URL exata, hostname verificado, hash externo independente)
 *    - Comparação do texto e controle de versão (texto canônico, conferência literal, histórico)
 *    - Status de autenticidade com evidências técnicas defensáveis em juízo
 * 2. Bloqueio de menções de domínio em substring (anti-spoofing)
 * 3. URN sintética gerada pelo app NÃO comprova que o ato foi oficialmente publicado
 * 4. Bloqueio incondicional de reutilização do hash do conteúdo local como se fosse de fonte externa
 * 5. Controle de versão estrito: atualizações e revogações geram novas versões preservando histórico
 * 6. Registros não verificados NUNCA aparecem como fundamentação oficialmente comprovada
 * 7. Suspensão preventiva da Súmula Vinculante 30 (não publicada no DJe pelo STF)
 */

import assert from 'assert';
import { JURISPRUDENCE_STATUTES } from '../src/data/jurisprudenceData.ts';
import { LegalCorpusAuditorService, normalizeCanonicalLegalText } from '../src/services/legalCorpusAuditorService.ts';
import { LegalKnowledgeBaseService, LegalArticle } from '../src/services/legalKnowledgeBaseService.ts';

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
  // 3. BLOQUEIO DE REUTILIZAÇÃO DE HASH LOCAL COMO HASH EXTERNO
  // =========================================================================
  console.log('\n[3/7] Testando Bloqueio de Reutilização de Hash Local (Anti-Fraude de Fonte)...');

  runTest('Artigo sem captura externa com hash independente NUNCA recebe status COMPROVADO_COM_EVIDENCIA', () => {
    const localOnlyArticle: LegalArticle = {
      id: 'local-statute-unverified',
      lawName: 'Código de Posturas de Exemplo',
      article: 'Artigo 10',
      title: 'Disposição Geral',
      content: 'Texto apenas cadastrado localmente no software sem snapshot da fonte oficial externa.',
      keywords: ['posturas'],
      sourceUrl: 'https://www.prefeitura.sp.gov.br/legislacao/posturas'
    };

    const report = LegalCorpusAuditorService.verifyArticle(localOnlyArticle);
    assert.strictEqual(
      report.authenticityStatus,
      'NAO_VERIFICADO_EXTERNAMENTE',
      'Sem hash da captura externa, status DEVE ser NAO_VERIFICADO_EXTERNAMENTE'
    );
    assert.strictEqual(report.isDefensible, false, 'Não é tecnicamente defensável em juízo sem hash externo independente');
    assert.ok(
      report.auditNotes.includes('O hash do conteúdo local não pode ser reutilizado'),
      'Nota de auditoria deve explicar que hash local não comprova fonte externa'
    );
  });

  runTest('Artigo com hash externo independente que coincide com o texto local é homologado com evidência', () => {
    const sampleText = 'São poderes da União, independentes e harmônicos entre si, o Legislativo, o Executivo e o Judiciário.';
    const externalDigest = LegalCorpusAuditorService.computeCanonicalSha256(sampleText);

    const verifiedArticle: LegalArticle = {
      id: 'cf88-art2-verified',
      lawName: 'Constituição Federal de 1988',
      article: 'Artigo 2º',
      title: 'Separação dos Poderes',
      content: sampleText,
      keywords: ['poderes', 'separação', 'cf88'],
      sourceUrl: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm',
      officialPublisher: 'Presidência da República / Imprensa Nacional',
      officialRef: 'DOU de 05/10/1988',
      queryDate: '2026-10-15',
      isOfficialUrnVerified: true,
      externalSourceHash: externalDigest
    };

    const report = LegalCorpusAuditorService.verifyArticle(verifiedArticle);
    assert.strictEqual(report.authenticityStatus, 'COMPROVADO_COM_EVIDENCIA');
    assert.strictEqual(report.isDefensible, true);
    assert.strictEqual(report.isSuspended, false);
    assert.strictEqual(report.canonicalSha256, externalDigest);
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

    // 1. Conteúdo ativo atualizado
    assert.strictEqual(updated.content, newText);
    // 2. Histórico preservado
    assert.ok(updated.provenance?.versionControl.versionHistory.length === 1);
    const archived = updated.provenance!.versionControl.versionHistory[0];
    assert.strictEqual(archived.canonicalText, originalText);
    assert.strictEqual(archived.status, 'ALTERADO');
    assert.strictEqual(archived.modifyingAct, 'Lei nº 14.905/2024');
    assert.strictEqual(archived.effectiveEndDate, '2024-08-30');
    // 3. Nova versão homologada
    const newReport = LegalCorpusAuditorService.verifyArticle(updated);
    assert.strictEqual(newReport.authenticityStatus, 'COMPROVADO_COM_EVIDENCIA');
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

  runTest('Citação de dispositivo não verificado externamente adverte o operador jurídico', () => {
    const unverifiedArticle: LegalArticle = {
      id: 'unverified-test',
      lawName: 'Decreto Local 500',
      article: 'Artigo 5º',
      title: 'Taxa Local',
      content: 'Fixa a taxa local em 5 UFM.',
      keywords: ['taxa'],
      authenticityStatus: 'NAO_VERIFICADO_EXTERNAMENTE'
    };

    const citation = LegalKnowledgeBaseService.formatCitation(unverifiedArticle, 'PETICAO_ABNT');
    assert.ok(
      citation.includes('NOTA DE AUDITORIA') && citation.includes('Captura de fonte externa independente pendente'),
      'Citação deve conter aviso explícito de que captura externa não foi homologada'
    );
    assert.ok(
      !citation.includes('PROVENIÊNCIA OFICIAL COMPROVADA'),
      'NÃO pode exibir selo de comprovado para registro não verificado'
    );
  });

  runTest('Citação de súmula com proveniência comprovada exibe data, veículo e hash de captura', () => {
    const sv1 = JURISPRUDENCE_STATUTES.find(a => a.id === 'stf-sv-1')!;
    const citation = LegalKnowledgeBaseService.formatCitation(sv1, 'PETICAO_ABNT');
    assert.ok(citation.includes('PROVENIÊNCIA OFICIAL COMPROVADA'));
    assert.ok(citation.includes('DJe nº 31/2007'));
    assert.ok(citation.includes('Captura Verificada SHA-256:'));
  });

  // =========================================================================
  // 7. CADEIA DE PROVENIÊNCIA DAS 62 SÚMULAS VINCULANTES
  // =========================================================================
  console.log('\n[7/7] Validando Cadeia de Proveniência nas 62 Súmulas Vinculantes do STF...');

  runTest('Todas as 62 Súmulas Vinculantes devem conter ProvenanceChain estruturada em 4 camadas', () => {
    assert.strictEqual(JURISPRUDENCE_STATUTES.length, 62);
    let authenticCount = 0;
    let suspendedCount = 0;

    for (const sv of JURISPRUDENCE_STATUTES) {
      assert.ok(sv.provenance, `Súmula ${sv.id} deve possuir objeto provenance`);
      assert.ok(sv.provenance.publication.authority.includes('Supremo Tribunal Federal'));
      assert.ok(sv.provenance.sourceCapture.exactUrl.startsWith('https://jurisprudencia.stf.jus.br'));
      assert.strictEqual(sv.provenance.sourceCapture.isDomainVerified, true);
      assert.ok(sv.provenance.versionControl.storedContentHash.length === 64);

      if (sv.id === 'stf-sv-30') {
        assert.strictEqual(sv.provenance.evidence.status, 'SUSPENSO_PREVENTIVAMENTE');
        suspendedCount++;
      } else {
        assert.strictEqual(sv.provenance.evidence.status, 'COMPROVADO_COM_EVIDENCIA');
        assert.strictEqual(sv.provenance.evidence.isDefensible, true);
        assert.strictEqual(sv.provenance.versionControl.contentMatch, true);
        authenticCount++;
      }
    }

    assert.strictEqual(authenticCount, 61, '61 Súmulas Vinculantes devem estar comprovadas com evidência');
    assert.strictEqual(suspendedCount, 1, 'Exatamente 1 Súmula Vinculante (SV 30) deve estar suspensa preventivamente');
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
