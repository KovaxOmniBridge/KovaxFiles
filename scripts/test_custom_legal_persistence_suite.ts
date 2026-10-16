/**
 * Test Suite: CustomLegalKnowledgeService Persistence, Quota Overflow & Backup/Restore
 * 
 * Valida:
 * 1. Resiliência a QuotaExceededError no localStorage com persistência em IndexedDB
 * 2. Leitura assíncrona consistente através de getCustomArticlesAsync e getCustomDocsAsync
 * 3. Exportação padronizada do acervo pessoal em arquivo JSON com integridade
 * 4. Restauração e importação (modos merge e replace) com resolução de duplicatas
 * 5. Integração com algoritmo BM25 após restauração
 */

// Mock de localStorage com suporte a simulação de estouro de cota
class MockLocalStorage {
  private store = new Map<string, string>();
  public shouldThrowQuotaError = false;

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.shouldThrowQuotaError) {
      const err = new Error('QuotaExceededError: DOMException 22 - The quota has been exceeded.');
      err.name = 'QuotaExceededError';
      throw err;
    }
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// Mock nativo em memória de IndexedDB compatível com IndexedDbStorage
class MockIDBStore {
  private data = new Map<string, any>();

  get(key: string) {
    const req: any = { result: undefined, onsuccess: null, onerror: null };
    queueMicrotask(() => {
      req.result = this.data.get(key);
      if (req.onsuccess) req.onsuccess();
    });
    return req;
  }

  put(value: any, key: string) {
    const req: any = { onsuccess: null, onerror: null };
    this.data.set(key, value);
    queueMicrotask(() => {
      if (req.onsuccess) req.onsuccess();
    });
    return req;
  }

  delete(key: string) {
    const req: any = { onsuccess: null, onerror: null };
    this.data.delete(key);
    queueMicrotask(() => {
      if (req.onsuccess) req.onsuccess();
    });
    return req;
  }

  clear() {
    const req: any = { onsuccess: null, onerror: null };
    this.data.clear();
    queueMicrotask(() => {
      if (req.onsuccess) req.onsuccess();
    });
    return req;
  }
}

class MockIDBDatabase {
  public stores = new Map<string, MockIDBStore>();
  public objectStoreNames = {
    contains: (name: string) => this.stores.has(name)
  };

  createObjectStore(name: string) {
    const store = new MockIDBStore();
    this.stores.set(name, store);
    return store;
  }

  transaction(storeName: string, mode: string) {
    let store = this.stores.get(storeName);
    if (!store) {
      store = new MockIDBStore();
      this.stores.set(storeName, store);
    }
    return {
      objectStore: () => store
    };
  }
}

const mockDb = new MockIDBDatabase();
const mockLS = new MockLocalStorage();

// Configura o ambiente global antes de importar os serviços
(globalThis as any).window = globalThis;
(globalThis as any).localStorage = mockLS;
(globalThis as any).indexedDB = {
  open: (_name: string, _version: number) => {
    const req: any = { result: mockDb, onupgradeneeded: null, onsuccess: null, onerror: null };
    queueMicrotask(() => {
      if (req.onupgradeneeded) {
        req.onupgradeneeded({ target: { result: mockDb } });
      }
      if (req.onsuccess) {
        req.onsuccess();
      }
    });
    return req;
  }
};

async function runTestSuite() {
  console.log('🧪 Iniciando Bateria de Testes: Persistência & Backup do Acervo Personalizado');

  // Import dinâmico após mocks definidos
  const { CustomLegalKnowledgeService } = await import('../src/services/customLegalKnowledgeService.js');

  // =========================================================================
  // Teste 1: Simulação de QuotaExceededError no localStorage
  // =========================================================================
  console.log('\n--- [TESTE 1] Simulação de QuotaExceededError no localStorage ---');
  
  mockLS.shouldThrowQuotaError = true; // Força erro de cota (5MB) no localStorage
  
  const municipalLawRawText = `
LEI ORGÂNICA DO MUNICÍPIO DE METRÓPOLE MODELO
Artigo 1º - O Município de Metrópole Modelo, parte integrante da República Federativa do Brasil, organiza-se autonomamente nos termos desta Lei Orgânica.
Artigo 2º - São poderes do Município, independentes e harmônicos entre si, o Legislativo e o Executivo.
Artigo 3º - Constituem bens municipais todas as coisas móveis e imóveis, direitos e ações que pertençam ao Município.
Artigo 4º - O Município instituirá tributos municipais de sua competência: ISS, IPTU e ITBI.
Artigo 5º - O Plano Diretor Estratégico Municipal é instrumento básico da política de desenvolvimento e de expansão urbana.
`;

  const addResult = await CustomLegalKnowledgeService.addCustomLawDocumentAsync(
    'Lei Orgânica de Metrópole Modelo (Lei 001/2026)',
    municipalLawRawText,
    'municipal',
    'em_vigor'
  );

  console.log(`✓ Documento adicionado mesmo com localStorage estourado: ${addResult.doc.name}`);
  console.log(`✓ Dispositivos extraídos: ${addResult.addedArticlesCount}`);

  if (addResult.addedArticlesCount !== 5) {
    throw new Error(`Esperado 5 artigos extraídos, obtido ${addResult.addedArticlesCount}`);
  }

  // =========================================================================
  // Teste 2: Leitura assíncrona consistente do IndexedDB
  // =========================================================================
  console.log('\n--- [TESTE 2] Leitura assíncrona consistente via IndexedDB ---');
  
  // Limpa o localStorage para garantir que a leitura vem genuinamente do IndexedDB
  mockLS.clear();

  const retrievedDocs = await CustomLegalKnowledgeService.getCustomDocsAsync();
  const retrievedArticles = await CustomLegalKnowledgeService.getCustomArticlesAsync();

  console.log(`✓ Documentos recuperados do IndexedDB: ${retrievedDocs.length}`);
  console.log(`✓ Artigos recuperados do IndexedDB: ${retrievedArticles.length}`);

  if (retrievedDocs.length !== 1 || retrievedDocs[0].name !== 'Lei Orgânica de Metrópole Modelo (Lei 001/2026)') {
    throw new Error('Falha ao recuperar documentos do IndexedDB');
  }

  if (retrievedArticles.length !== 5) {
    throw new Error(`Esperado 5 artigos recuperados, obtido ${retrievedArticles.length}`);
  }

  const art4 = retrievedArticles.find(a => a.article.includes('4'));
  if (!art4 || !art4.content.includes('IPTU')) {
    throw new Error('Artigo 4º com menção a IPTU não encontrado nos dados recuperados');
  }
  console.log(`✓ Conteúdo do Artigo 4º verificado: "${art4.title}" - "${art4.content}"`);

  // =========================================================================
  // Teste 3: Exportação do Backup do Acervo (JSON estruturado com estatísticas)
  // =========================================================================
  console.log('\n--- [TESTE 3] Exportação de Backup do Acervo em JSON ---');

  const backupData = await CustomLegalKnowledgeService.exportCorpusBackup();
  console.log(`✓ Backup gerado: arquivo "${backupData.filename}" (${backupData.stats.sizeBytes} bytes)`);
  console.log(`✓ Estatísticas no payload: totalDocs=${backupData.stats.totalDocs}, totalArticles=${backupData.stats.totalArticles}`);

  const parsedBackup = JSON.parse(backupData.backupJson);
  if (parsedBackup.format !== 'kovax-legal-corpus-backup') {
    throw new Error(`Formato de backup inválido: ${parsedBackup.format}`);
  }
  if (parsedBackup.docs.length !== 1 || parsedBackup.articles.length !== 5) {
    throw new Error('Inconsistência de contagem no payload de backup');
  }

  // =========================================================================
  // Teste 4: Limpeza e Restauração / Importação do Backup
  // =========================================================================
  console.log('\n--- [TESTE 4] Limpeza total e Restauração via importCorpusBackup ---');

  await CustomLegalKnowledgeService.clearAllCustomLawsAsync();
  const docsAfterClear = await CustomLegalKnowledgeService.getCustomDocsAsync();
  const artsAfterClear = await CustomLegalKnowledgeService.getCustomArticlesAsync();

  console.log(`✓ Acervo limpo: docs=${docsAfterClear.length}, artigos=${artsAfterClear.length}`);
  if (docsAfterClear.length !== 0 || artsAfterClear.length !== 0) {
    throw new Error('Falha ao limpar acervo');
  }

  // Restaura usando o JSON exportado
  const restoreResult = await CustomLegalKnowledgeService.importCorpusBackup(backupData.backupJson, 'replace');
  console.log(`✓ Resultado da restauração: ${restoreResult.message}`);

  const docsRestored = await CustomLegalKnowledgeService.getCustomDocsAsync();
  const artsRestored = await CustomLegalKnowledgeService.getCustomArticlesAsync();

  console.log(`✓ Documentos após restauração: ${docsRestored.length}`);
  console.log(`✓ Artigos após restauração: ${artsRestored.length}`);

  if (docsRestored.length !== 1 || artsRestored.length !== 5) {
    throw new Error('Falha na integridade dos dados restaurados');
  }

  // =========================================================================
  // Teste 5: Busca BM25 sobre o acervo restaurado
  // =========================================================================
  console.log('\n--- [TESTE 5] Busca BM25 no Acervo Restaurado ---');

  const searchResults = await CustomLegalKnowledgeService.searchCustomLawsAsync('tributos municipais IPTU');
  console.log(`✓ Resultados da busca BM25: ${searchResults.length}`);
  if (searchResults.length === 0) {
    throw new Error('Busca BM25 não retornou artigos para query relevante');
  }

  const topMatch = searchResults[0];
  console.log(`✓ Artigo mais relevante encontrado: ${topMatch.article} (${topMatch.lawName})`);
  if (!topMatch.content.includes('tributos')) {
    throw new Error('Artigo mais relevante não corresponde ao critério de busca');
  }

  // =========================================================================
  // Teste 6: Filtro de Vigência (Normas revogadas vs vigentes)
  // =========================================================================
  console.log('\n--- [TESTE 6] Tratamento de Vigência e Normas Revogadas ---');

  // Adiciona uma norma revogada
  await CustomLegalKnowledgeService.addCustomLawDocumentAsync(
    'Código de Posturas Antigo de 1970 (REVOGADO)',
    'Artigo 1º - Fica revogado o antigo código de iluminação pública e tráfego de carroças.',
    'outros',
    'revogada'
  );

  const activeArticles = await CustomLegalKnowledgeService.getCustomArticlesAsync(false);
  const allArticlesWithRevoked = await CustomLegalKnowledgeService.getCustomArticlesAsync(true);

  console.log(`✓ Artigos vigentes (sem revogados): ${activeArticles.length}`);
  console.log(`✓ Total de artigos (incluindo revogados): ${allArticlesWithRevoked.length}`);

  if (activeArticles.length !== 5) {
    throw new Error(`Esperado 5 artigos vigentes, obtido ${activeArticles.length}`);
  }
  if (allArticlesWithRevoked.length !== 6) {
    throw new Error(`Esperado 6 artigos no total com revogados, obtido ${allArticlesWithRevoked.length}`);
  }

  console.log('\n🎉 TODOS OS TESTES DE PERSISTÊNCIA, INDEXEDDB E BACKUP PASSARAM COM SUCESSO (100% OK)!');
}

runTestSuite().catch(err => {
  console.error('\n❌ ERRO NA SUITE DE TESTES:', err);
  process.exit(1);
});
