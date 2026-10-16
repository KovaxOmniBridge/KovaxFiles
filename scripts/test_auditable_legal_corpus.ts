import assert from 'assert';
import { JURISPRUDENCE_STATUTES } from '../src/data/jurisprudenceData.js';
import { LegalCorpusAuditorService } from '../src/services/legalCorpusAuditorService.js';
import { LegalKnowledgeBaseService, LegalArticle } from '../src/services/legalKnowledgeBaseService.js';
import { CustomLegalKnowledgeService } from '../src/services/customLegalKnowledgeService.js';

async function runAuditableLegalCorpusSuite() {
  console.log('===========================================================================');
  console.log('⚖️ TESTE DE AUDITORIA: ACERVO JURÍDICO AUDITÁVEL & SUSPENSÃO DE INAUTÊNTICOS');
  console.log('   (Verificação de URN LexML, Fonte Oficial, SHA-256 e Suspensão Preventiva)');
  console.log('===========================================================================\n');

  // --- [TESTE 1] Metadados Oficiais Mandatórios em Cada Dispositivo ---
  console.log('[TESTE 1] Validando presença dos 6 pilares de auditabilidade em cada dispositivo...');
  
  const sampleArticles = JURISPRUDENCE_STATUTES.slice(0, 10);
  for (const art of sampleArticles) {
    const report = LegalCorpusAuditorService.verifyArticle(art);
    assert.ok(report.officialId, `ERRO: Dispositivo ${art.id} deve possuir Identificador Oficial (URN LexML)`);
    assert.ok(report.officialId.startsWith('urn:lex:br:'), `ERRO: URN LexML deve seguir padrão nacional (urn:lex:br:...): ${report.officialId}`);
    assert.ok(report.sourceUrl, `ERRO: Dispositivo ${art.id} deve possuir Fonte Específica`);
    assert.ok(report.queryDate, `ERRO: Dispositivo ${art.id} deve possuir Data de Consulta/Auditoria`);
    assert.ok(report.version, `ERRO: Dispositivo ${art.id} deve possuir Versão Normativa`);
    assert.ok(report.statusVigencia, `ERRO: Dispositivo ${art.id} deve possuir Vigência`);
    assert.ok(report.canonicalSha256, `ERRO: Dispositivo ${art.id} deve possuir Hash SHA-256 Canônico`);
  }
  console.log(`      ✓ 10 dispositivos amostrais auditados com URN LexML, Fonte Oficial, Data, Versão e SHA-256`);

  // --- [TESTE 2] Comparação Automatizada de Enunciados com Publicação Oficial ---
  console.log('\n[TESTE 2] Executando comparação automatizada de enunciados com a publicação oficial via SHA-256...');
  
  const sv1 = JURISPRUDENCE_STATUTES.find(a => a.id === 'stf-sv-1')!;
  const sv1Report = LegalCorpusAuditorService.verifyArticle(sv1);
  assert.ok(
    sv1Report.authenticityStatus === 'COMPROVADO_COM_EVIDENCIA' || sv1Report.authenticityStatus === 'AUTENTICO_COMPROVADO',
    `ERRO: SV 1 deve ser homologada como autêntica (obtido: ${sv1Report.authenticityStatus})`
  );
  assert.strictEqual(sv1Report.isSuspended, false, 'ERRO: SV 1 não pode estar suspensa');
  assert.ok(sv1Report.canonicalSha256.length === 64, 'ERRO: Hash SHA-256 deve possuir 64 caracteres hexadecimais');
  console.log(`      ✓ SV 1 auditada: Hash SHA-256 canônico gerado (${sv1Report.canonicalSha256.substring(0, 16)}...) e autenticidade comprovada perante o STF`);

  const sv6 = JURISPRUDENCE_STATUTES.find(a => a.id === 'stf-sv-6')!;
  const sv6Report = LegalCorpusAuditorService.verifyArticle(sv6);
  assert.ok(
    sv6Report.authenticityStatus === 'COMPROVADO_COM_EVIDENCIA' || sv6Report.authenticityStatus === 'AUTENTICO_COMPROVADO',
    `ERRO: SV 6 deve ser homologada como autêntica (obtido: ${sv6Report.authenticityStatus})`
  );
  console.log(`      ✓ SV 6 auditada: Autenticidade literal comprovada com a publicação do Plenário do STF`);

  // --- [TESTE 3] Suspensão Obrigatória de Registros Não Comprovados (Caso SV 30) ---
  console.log('\n[TESTE 3] Auditando suspensão obrigatória de enunciados cuja autenticidade não pode ser comprovada (SV 30)...');
  
  const sv30 = JURISPRUDENCE_STATUTES.find(a => a.id === 'stf-sv-30')!;
  assert.ok(sv30, 'ERRO: SV 30 deve existir no catálogo de jurisprudência');
  
  const sv30Report = LegalCorpusAuditorService.verifyArticle(sv30);
  assert.strictEqual(sv30Report.isSuspended, true, 'ERRO: SV 30 DEVE ser suspensa por não ter sido publicada no DJe');
  assert.ok(
    sv30Report.authenticityStatus === 'SUSPENSO_PREVENTIVAMENTE' || sv30Report.authenticityStatus === 'SUSPENSO_NAO_COMPROVADO',
    `ERRO: Status de autenticidade deve ser SUSPENSO_PREVENTIVAMENTE (obtido: ${sv30Report.authenticityStatus})`
  );
  assert.strictEqual(sv30Report.statusVigencia, 'SUSPENSA_NAO_COMPROVADA', 'ERRO: Vigência deve ser SUSPENSA_NAO_COMPROVADA');
  assert.ok(sv30Report.auditNotes.includes('PSV 30') || sv30Report.auditNotes.includes('suspenso'), 'ERRO: Nota de auditoria deve explicar suspensão pelo STF');
  console.log(`      ✓ SV 30 suspensa com sucesso: Bloqueada por falta de publicação no DJe (PSV 30)`);
  console.log(`      ✓ Nota de Auditoria da SV 30: "${sv30Report.auditNotes}"`);

  // --- [TESTE 4] Detecção de Divergência Material e Suspensão Proativa ---
  console.log('\n[TESTE 4] Simulando tentativa de adulteração ou divergência de texto contra a publicação oficial...');
  
  const originalSv1Sha = sv1Report.canonicalSha256;
  const tamperedSv: LegalArticle = {
    ...sv1,
    id: 'stf-sv-tampered-test',
    content: 'Texto adulterado com exclusão indevida da Lei Complementar nº 110/2001 e distorção do sentido.',
    officialContentSha256: originalSv1Sha, // Espera o hash original
    externalSourceHash: originalSv1Sha
  };

  const tamperedReport = LegalCorpusAuditorService.verifyArticle(tamperedSv);
  assert.strictEqual(tamperedReport.authenticityStatus, 'DIVERGENCIA_DETECTADA', 'ERRO: Auditor deve detectar divergência material');
  assert.strictEqual(tamperedReport.isSuspended, true, 'ERRO: Registro com divergência deve ser suspenso');
  assert.strictEqual(tamperedReport.statusVigencia, 'SUSPENSA_NAO_COMPROVADA', 'ERRO: Registro com divergência deve receber status SUSPENSA_NAO_COMPROVADA');
  console.log(`      ✓ Divergência detectada com sucesso! Registro suspenso preventivamente para proteger o operador.`);

  // --- [TESTE 5] Suspensão Preventiva de Dispositivos sem Fonte Oficial (Acervo Customizado) ---
  console.log('\n[TESTE 5] Validando regra de suspensão preventiva para dispositivos sem comprovação de fonte oficial...');
  
  const unverifiedArticle: LegalArticle = {
    id: 'custom-unverified-test',
    lawName: 'Regulamento Provisório Desconhecido',
    article: 'Artigo 1º',
    title: 'Dispositivo sem Fonte Comprovada',
    content: 'Dispositivo inserido manualmente sem comprovação de publicação em diário oficial.',
    keywords: ['teste', 'desconhecido'],
    sourceUrl: 'http://site-duvidoso-nao-governamental.com/texto'
  };

  const unverifiedReport = LegalCorpusAuditorService.verifyArticle(unverifiedArticle);
  assert.ok(
    unverifiedReport.authenticityStatus === 'ORIGEM_NAO_COMPROVADA' || unverifiedReport.authenticityStatus === 'FONTE_AUSENTE',
    `ERRO: Deve marcar ORIGEM_NAO_COMPROVADA para domínio não governamental/tribunal (obtido: ${unverifiedReport.authenticityStatus})`
  );
  assert.strictEqual(unverifiedReport.isSuspended, true, 'ERRO: Registro sem fonte oficial deve ser suspenso');
  assert.strictEqual(unverifiedReport.statusVigencia, 'SUSPENSA_NAO_COMPROVADA', 'ERRO: Vigência deve ser marcada como SUSPENSA_NAO_COMPROVADA');
  console.log(`      ✓ Registro sem fonte oficial foi preventivamente suspenso (ORIGEM_NAO_COMPROVADA)`);

  // Agora testando com fonte governamental oficial (.gov.br) e hash de captura externa
  const contentHashPlanalto = LegalCorpusAuditorService.computeCanonicalSha256(unverifiedArticle.content);
  const verifiedArticle: LegalArticle = {
    ...unverifiedArticle,
    sourceUrl: 'https://www.planalto.gov.br/ccivil_03/leis/l8078.htm',
    officialRef: 'Diário Oficial da União de 12/09/1990',
    externalSourceHash: contentHashPlanalto,
    officialContentSha256: contentHashPlanalto
  };
  const verifiedReport = LegalCorpusAuditorService.verifyArticle(verifiedArticle);
  assert.ok(
    verifiedReport.authenticityStatus === 'COMPROVADO_COM_EVIDENCIA' || verifiedReport.authenticityStatus === 'AUTENTICO_COMPROVADO',
    `ERRO: Deve homologar fonte governamental oficial com hash externo (obtido: ${verifiedReport.authenticityStatus})`
  );
  assert.strictEqual(verifiedReport.isSuspended, false, 'ERRO: Registro com fonte oficial comprovada não pode ser suspenso');
  console.log(`      ✓ Registro com fonte governamental (.gov.br / Planalto) aprovado como COMPROVADO_COM_EVIDENCIA`);

  // --- [TESTE 6] Proteção em Minutas de Citação (formatCitation) ---
  console.log('\n[TESTE 6] Validando aposição de alerta explícito em citações de registros suspensos...');
  
  const citationValid = LegalKnowledgeBaseService.formatCitation(sv1, 'PETICAO_ABNT');
  assert.ok(!citationValid.includes('REGISTRO SUSPENSO'), 'ERRO: Citação válida não deve conter alerta de suspensão');
  assert.ok(citationValid.includes('urn:lex:br:'), 'ERRO: Citação deve incluir identificador oficial LexML');
  console.log(`      ✓ Citação de registro válido formatada com URN LexML oficial`);

  const citationSuspended = LegalKnowledgeBaseService.formatCitation(sv30, 'PETICAO_ABNT');
  assert.ok(citationSuspended.includes('ATENÇÃO: REGISTRO SUSPENSO'), 'ERRO: Citação de dispositivo suspenso DEVE conter alerta explícito');
  assert.ok(citationSuspended.includes('AUTENTICIDADE NÃO COMPROVADA'), 'ERRO: Citação deve alertar sobre autenticidade não comprovada');
  console.log(`      ✓ Citação de registro suspenso protegida: Alerta obrigatório anexado para evitar indução a erro`);

  // --- [TESTE 7] Auditoria Global do Acervo e Filtro de Artigos Usáveis ---
  console.log('\n[TESTE 7] Executando auditoria do acervo e aplicando filtro de exclusão de suspensos...');
  
  const auditSummary = LegalCorpusAuditorService.auditCorpus(JURISPRUDENCE_STATUTES, true);
  assert.ok(auditSummary.totalAudited >= 60, 'ERRO: Total auditado incorreto');
  assert.ok(auditSummary.totalSuspended >= 1, 'ERRO: Deve constar ao menos 1 registro suspenso (SV 30)');
  assert.ok(auditSummary.complianceRatePercent >= 95, `ERRO: Taxa de conformidade esperada >= 95%, obtido: ${auditSummary.complianceRatePercent}%`);
  console.log(`      ✓ Auditoria em lote concluída: ${auditSummary.totalAudited} analisados, ${auditSummary.totalAuthentic} autênticos, ${auditSummary.totalSuspended} suspenso(s)`);
  console.log(`      ✓ Taxa de Conformidade Oficial: ${auditSummary.complianceRatePercent}%`);

  const usableArticles = LegalCorpusAuditorService.filterUsableArticles(JURISPRUDENCE_STATUTES, false);
  const foundSuspendedInUsable = usableArticles.some(a => a.id === 'stf-sv-30' || a.statusVigencia === 'SUSPENSA_NAO_COMPROVADA');
  assert.strictEqual(foundSuspendedInUsable, false, 'ERRO: Registros suspensos NÃO podem figurar no compêndio de normas ativas');
  console.log(`      ✓ Filtro de segurança: Registros suspensos expurgados da lista ativa com sucesso!`);

  console.log('\n===========================================================================');
  console.log('🎉 TODOS OS TESTES DE AUDITORIA, CRIPTOGRAFIA E SUSPENSÃO PASSARAM (100% OK)!');
  console.log('   Nenhum dispositivo sem autenticidade comprovada é apresentado como correto.');
  console.log('===========================================================================\n');
}

runAuditableLegalCorpusSuite().catch(err => {
  console.error('\n❌ FALHA NO TESTE DE AUDITORIA:', err);
  process.exit(1);
});
