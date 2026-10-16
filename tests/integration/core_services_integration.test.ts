/**
 * KovaxFiles Desktop — Integration Tests: Core Services, Batch Processing & Decoupled Execution
 */

import { CoreCompressionService } from '../../src/core/compression/compressionService';
import { CoreRedactionEngine } from '../../src/core/redaction/redactionCore';
import { CoreLegalCorpusService } from '../../src/core/legal-corpus/legalCorpusCore';
import { createSamplePdfBytes } from '../fixtures/sample_doc';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  [FAIL] ${msg}`);
    failed++;
    throw new Error(msg);
  } else {
    console.log(`  [PASS] ${msg}`);
    passed++;
  }
}

async function runIntegrationTests() {
  console.log('\n================================================================================');
  console.log('  TESTES DE INTEGRAÇÃO: SERVIÇOS CENTRAIS, LOTES E PROVENIÊNCIA');
  console.log('================================================================================\n');

  console.log('[1/3] Testando CoreCompressionService com processamento de lote e status parcial...');
  const samplePdf = createSamplePdfBytes('Documento de Teste para Compressão');

  const batchItems = [
    { id: 'item_1', name: 'valido_1.pdf', bytes: samplePdf, profile: 'balanced' as const },
    { id: 'item_2', name: 'invalido_corrompido.pdf', bytes: new Uint8Array([0, 1, 2]), profile: 'balanced' as const },
    { id: 'item_3', name: 'valido_2.pdf', bytes: samplePdf, profile: 'balanced' as const }
  ];

  const batchResult = await CoreCompressionService.compressBatch(batchItems);

  // REGRA CRÍTICA: Não deve registrar sucesso quando apenas parte de um lote foi processada!
  assert(batchResult.status === 'partial', 'Lote com 2 sucessos e 1 falha DEVE registrar status "partial"');
  assert(batchResult.succeededItems === 2, 'Total de sucessos deve ser exatamente 2');
  assert(batchResult.failedItems === 1, 'Total de falhas deve ser exatamente 1');
  assert(batchResult.items.length === 3, 'Relatório detalhado deve conter todos os 3 itens');

  console.log('\n[2/3] Testando CoreRedactionEngine com padrões brasileiros LGPD...');
  const sampleText = 'O réu João da Silva, inscrito no CPF 123.456.789-09 e CNPJ 12.345.678/0001-90, contato joao@email.com, nos autos do processo 0000001-83.2008.1.00.0000.';
  const matches = CoreRedactionEngine.scanText(sampleText);

  assert(matches.some(m => m.category === 'CPF' && m.matchedText === '123.456.789-09'), 'CPF deve ser detectado com precisão');
  assert(matches.some(m => m.category === 'CNPJ'), 'CNPJ deve ser detectado');
  assert(matches.some(m => m.category === 'EMAIL'), 'E-mail deve ser detectado');
  assert(matches.some(m => m.category === 'PROCESS_CNJ'), 'Processo padrão CNJ deve ser detectado');

  const redacted = CoreRedactionEngine.applyTextRedactions(sampleText, matches);
  assert(!redacted.includes('123.456.789-09') && !redacted.includes('joao@email.com'),
    'Texto anonimizado não pode conter os dados pessoais originais');
  assert(redacted.includes('██████████████'), 'Texto anonimizado deve conter máscara de tarjamento');

  console.log('\n[3/3] Testando CoreLegalCorpusService com cadeia de proveniência em 4 etapas...');
  const searchResults = CoreLegalCorpusService.search('FGTS');
  assert(searchResults.length > 0, 'Busca por FGTS deve retornar dispositivos');

  const sv1 = searchResults.find(r => r.id === 'stf-sv-1' || r.article === 'Súmula Vinculante 1');
  assert(!!sv1, 'Súmula Vinculante 1 deve ser encontrada no acervo');

  if (sv1) {
    const audit = CoreLegalCorpusService.auditArticle(sv1);
    assert(audit.isSuccess, 'SV 1 deve ser auditada com sucesso');
    assert(audit.data?.publication.authority.includes('STF') || audit.data?.publication.authority.includes('Supremo'), 'Órgão emissor deve ser STF');
    // Conforme AGENTS.md Regra 2.3: Dispositivos sem captura física bruta arquivada DEVEM permanecer como NAO_VERIFICADO_EXTERNAMENTE
    assert(audit.data?.evidence.status === 'NAO_VERIFICADO_EXTERNAMENTE', 'Sem captura arquivada, status deve ser NAO_VERIFICADO_EXTERNAMENTE');
    assert(audit.data?.evidence.isDefensible === false, 'Sem captura física, não pode declarar isDefensible: true');

    const citation = CoreLegalCorpusService.getDefensibleCitation(sv1);
    assert(citation.includes('NOTA DE AUDITORIA') || citation.includes('acervo local'), 'Citação deve evidenciar honestamente que o registro é do acervo local pendente de verificação');
  }

  console.log('\n================================================================================');
  console.log(`RESULTADO DOS TESTES DE INTEGRAÇÃO:`);
  console.log(`  Testes Passados: ${passed}`);
  console.log(`  Testes Falhados: ${failed}`);
  console.log('================================================================================\n');

  if (failed > 0) process.exit(1);
}

runIntegrationTests().catch(err => {
  console.error('Erro fatal nos testes de integração:', err);
  process.exit(1);
});
