import type { LegalArticle } from './legalKnowledgeBaseService';
import { IndexedDbStorage, STORES } from './indexedDbStorage';
import { LegalCorpusAuditorService } from './legalCorpusAuditorService';

export interface CustomLawDocument {
  id: string;
  name: string;
  category: 'municipal' | 'estadual' | 'regimento' | 'outros';
  statusVigencia?: 'em_vigor' | 'alterada' | 'revogada';
  uploadDate: string;
  articleCount: number;
  rawText?: string;
  metadata?: {
    municipality?: string;
    stateUF?: string;
    lawNumber?: string;
    year?: string;
    revocationNotes?: string;
    officialUrl?: string;
  };
}

export interface LegalCorpusBackupPayload {
  format: 'kovax-legal-corpus-backup';
  version: number;
  exportedAt: string;
  source: string;
  stats: {
    totalDocs: number;
    totalArticles: number;
    categories: Record<string, number>;
    statusCounts: Record<string, number>;
  };
  docs: CustomLawDocument[];
  articles: LegalArticle[];
  checksum?: string;
}

const STORAGE_KEY_ARTICLES = 'kovax_custom_legal_articles_v1';
const STORAGE_KEY_DOCS = 'kovax_custom_legal_docs_v1';

export class CustomLegalKnowledgeService {
  private static cachedArticles: LegalArticle[] | null = null;
  private static cachedDocs: CustomLawDocument[] | null = null;
  private static initPromise: Promise<void> | null = null;

  /**
   * Sincronização inicial consistente com IndexedDB.
   * Carrega documentos e dispositivos persistidos em alta capacidade e faz migração de dados antigos do localStorage.
   */
  static async syncWithIndexedDb(forceReload: boolean = false): Promise<{ docs: CustomLawDocument[]; articles: LegalArticle[] }> {
    if (this.initPromise && !forceReload) {
      await this.initPromise;
      return { docs: this.cachedDocs || [], articles: this.cachedArticles || [] };
    }

    this.initPromise = (async () => {
      try {
        // 1. Tenta carregar do IndexedDB primeiro (armazenamento persistente de alta capacidade)
        let idbDocs = await IndexedDbStorage.getItem<CustomLawDocument[]>(STORES.CUSTOM_LAWS, STORAGE_KEY_DOCS);
        let idbArticles = await IndexedDbStorage.getItem<LegalArticle[]>(STORES.CUSTOM_LAWS, STORAGE_KEY_ARTICLES);

        // 2. Se o IndexedDB estiver vazio, verifica se há dados remanescentes no localStorage para migração
        if ((!idbDocs || idbDocs.length === 0) && typeof localStorage !== 'undefined') {
          const lsDocs = localStorage.getItem(STORAGE_KEY_DOCS);
          if (lsDocs) {
            try {
              const parsed = JSON.parse(lsDocs);
              if (Array.isArray(parsed) && parsed.length > 0) {
                idbDocs = parsed;
                await IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_DOCS, parsed);
              }
            } catch (e) {
              console.warn('[CustomLegalKnowledgeService] Erro ao migrar docs do localStorage:', e);
            }
          }
        }

        if ((!idbArticles || idbArticles.length === 0) && typeof localStorage !== 'undefined') {
          const lsArticles = localStorage.getItem(STORAGE_KEY_ARTICLES);
          if (lsArticles) {
            try {
              const parsed = JSON.parse(lsArticles);
              if (Array.isArray(parsed) && parsed.length > 0) {
                idbArticles = parsed;
                await IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_ARTICLES, parsed);
              }
            } catch (e) {
              console.warn('[CustomLegalKnowledgeService] Erro ao migrar artigos do localStorage:', e);
            }
          }
        }

        this.cachedDocs = idbDocs || [];
        this.cachedArticles = idbArticles || [];

        // 3. Tenta manter o localStorage em sincronia caso caiba dentro do limite (5MB)
        this.trySyncLocalStorage(this.cachedDocs, this.cachedArticles);
      } catch (err) {
        console.error('[CustomLegalKnowledgeService] Falha na sincronização com IndexedDB:', err);
        if (typeof localStorage !== 'undefined') {
          try {
            const lsDocs = localStorage.getItem(STORAGE_KEY_DOCS);
            this.cachedDocs = lsDocs ? JSON.parse(lsDocs) : [];
            const lsArts = localStorage.getItem(STORAGE_KEY_ARTICLES);
            this.cachedArticles = lsArts ? JSON.parse(lsArts) : [];
          } catch {
            this.cachedDocs = [];
            this.cachedArticles = [];
          }
        } else {
          this.cachedDocs = [];
          this.cachedArticles = [];
        }
      }
    })();

    await this.initPromise;
    return { docs: this.cachedDocs || [], articles: this.cachedArticles || [] };
  }

  /**
   * Tenta sincronizar o cache local síncrono (localStorage) protegendo contra QuotaExceededError
   */
  private static trySyncLocalStorage(docs: CustomLawDocument[], articles: LegalArticle[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(docs));
      localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(articles));
    } catch {
      // Ignora erro de cota excedida, pois o IndexedDB é a fonte soberana da verdade
    }
  }

  /**
   * Notifica outros módulos de que o acervo foi atualizado
   */
  private static notifyCacheInvalidation(): void {
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('kovax:custom-laws-changed'));
      } catch {
        // Ignora em ambientes sem DOM
      }
    }
  }

  /**
   * Leitura assíncrona consistente do IndexedDB para todos os artigos cadastrados
   */
  static async getCustomArticlesAsync(includeRevoked: boolean = false): Promise<LegalArticle[]> {
    await this.syncWithIndexedDb();
    const docs = this.cachedDocs || [];
    const articles = this.cachedArticles || [];

    if (includeRevoked) {
      return [...articles];
    }

    const revogadosIds = new Set(docs.filter(d => d.statusVigencia === 'revogada').map(d => d.id));
    return articles.filter(a => !Array.from(revogadosIds).some(revId => a.id.startsWith(revId)));
  }

  /**
   * Leitura assíncrona consistente do IndexedDB para documentos
   */
  static async getCustomDocsAsync(): Promise<CustomLawDocument[]> {
    await this.syncWithIndexedDb();
    return this.cachedDocs ? [...this.cachedDocs] : [];
  }

  /**
   * Obtém todos os artigos customizados salvos no acervo local (com fallback de cache e sincronização em background)
   */
  static getCustomArticles(includeRevoked: boolean = false): LegalArticle[] {
    if (this.cachedArticles !== null) {
      const docs = this.cachedDocs || [];
      if (includeRevoked) return [...this.cachedArticles];
      const revogadosIds = new Set(docs.filter(d => d.statusVigencia === 'revogada').map(d => d.id));
      return this.cachedArticles.filter(a => !Array.from(revogadosIds).some(revId => a.id.startsWith(revId)));
    }

    // Inicia sincronização com IndexedDB em background
    this.syncWithIndexedDb().catch(err => console.warn('[CustomLegalKnowledgeService] Sync background error:', err));

    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
      const data = localStorage.getItem(STORAGE_KEY_ARTICLES);
      const docs = this.getCustomDocs();
      const articles: LegalArticle[] = data ? JSON.parse(data) : [];
      if (includeRevoked) return articles;
      const revogadosIds = new Set(docs.filter(d => d.statusVigencia === 'revogada').map(d => d.id));
      return articles.filter(a => !Array.from(revogadosIds).some(revId => a.id.startsWith(revId)));
    } catch (err) {
      console.error('[CustomLegalKnowledgeService] Erro ao carregar artigos customizados:', err);
      return [];
    }
  }

  /**
   * Obtém a lista de documentos (leis/regimentos) cadastrados no acervo local
   */
  static getCustomDocs(): CustomLawDocument[] {
    if (this.cachedDocs !== null) {
      return [...this.cachedDocs];
    }

    // Inicia sincronização com IndexedDB em background
    this.syncWithIndexedDb().catch(err => console.warn('[CustomLegalKnowledgeService] Sync background error:', err));

    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
      const data = localStorage.getItem(STORAGE_KEY_DOCS);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.error('[CustomLegalKnowledgeService] Erro ao carregar documentos customizados:', err);
      return [];
    }
  }

  /**
   * Salva um novo documento de lei municipal/estadual/regimento e extrai os artigos automaticamente (Assíncrono)
   */
  static async addCustomLawDocumentAsync(
    docName: string,
    rawText: string,
    category: 'municipal' | 'estadual' | 'regimento' | 'outros' = 'municipal',
    statusVigencia: 'em_vigor' | 'alterada' | 'revogada' = 'em_vigor'
  ): Promise<{ doc: CustomLawDocument; addedArticlesCount: number }> {
    await this.syncWithIndexedDb();

    const docId = 'custom-doc-' + Date.now().toString(36) + Math.random().toString(36).substring(7);
    const parsedArticles = this.parseTextToArticles(rawText, docId, docName, category, statusVigencia);

    const existingArticles = this.cachedArticles || [];
    const updatedArticles = [...existingArticles, ...parsedArticles];

    const newDoc: CustomLawDocument = {
      id: docId,
      name: docName,
      category,
      statusVigencia,
      uploadDate: new Date().toLocaleDateString('pt-BR'),
      articleCount: parsedArticles.length,
      rawText: rawText.length > 500000 ? rawText.substring(0, 500000) : rawText
    };

    const existingDocs = this.cachedDocs || [];
    const updatedDocs = [...existingDocs, newDoc];

    this.cachedDocs = updatedDocs;
    this.cachedArticles = updatedArticles;

    // Gravação soberana e assíncrona no IndexedDB
    await IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_DOCS, updatedDocs);
    await IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_ARTICLES, updatedArticles);

    // Tenta gravar espelho no localStorage
    this.trySyncLocalStorage(updatedDocs, updatedArticles);

    this.notifyCacheInvalidation();

    return { doc: newDoc, addedArticlesCount: parsedArticles.length };
  }

  /**
   * Salva um novo documento de lei (compatibilidade síncrona com fallback em IndexedDB)
   */
  static addCustomLawDocument(
    docName: string,
    rawText: string,
    category: 'municipal' | 'estadual' | 'regimento' | 'outros' = 'municipal',
    statusVigencia: 'em_vigor' | 'alterada' | 'revogada' = 'em_vigor'
  ): { doc: CustomLawDocument; addedArticlesCount: number } {
    const docId = 'custom-doc-' + Date.now().toString(36) + Math.random().toString(36).substring(7);
    const parsedArticles = this.parseTextToArticles(rawText, docId, docName, category, statusVigencia);

    const existingArticles = this.cachedArticles !== null ? this.cachedArticles : this.getCustomArticles(true);
    const updatedArticles = [...existingArticles, ...parsedArticles];

    const newDoc: CustomLawDocument = {
      id: docId,
      name: docName,
      category,
      statusVigencia,
      uploadDate: new Date().toLocaleDateString('pt-BR'),
      articleCount: parsedArticles.length,
      rawText: rawText.length > 500000 ? rawText.substring(0, 500000) : rawText
    };

    const existingDocs = this.cachedDocs !== null ? this.cachedDocs : this.getCustomDocs();
    const updatedDocs = [...existingDocs, newDoc];

    this.cachedDocs = updatedDocs;
    this.cachedArticles = updatedArticles;

    this.trySyncLocalStorage(updatedDocs, updatedArticles);

    // Persistência assíncrona garantida no IndexedDB
    IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_DOCS, updatedDocs);
    IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_ARTICLES, updatedArticles);

    this.notifyCacheInvalidation();

    return { doc: newDoc, addedArticlesCount: parsedArticles.length };
  }

  /**
   * Adiciona um único artigo customizado ao acervo local do usuário (Assíncrono)
   */
  static async addCustomArticleAsync(articleData: {
    lawName: string;
    article: string;
    title: string;
    content: string;
    keywords: string[];
    officialRef?: string;
    sourceUrl?: string;
    officialId?: string;
    version?: string;
  }): Promise<LegalArticle> {
    await this.syncWithIndexedDb();

    const newArt: LegalArticle = {
      id: 'custom-' + Date.now().toString(36) + Math.random().toString(36).substring(7),
      lawName: articleData.lawName,
      article: articleData.article,
      title: articleData.title,
      content: articleData.content,
      keywords: articleData.keywords,
      officialRef: articleData.officialRef || `Acervo Local (${articleData.lawName})`,
      sourceUrl: articleData.sourceUrl,
      officialId: articleData.officialId,
      version: articleData.version || 'Edição Local',
      queryDate: new Date().toISOString().split('T')[0],
      historicalVersions: [
        {
          effectiveDate: new Date().toISOString().split('T')[0],
          content: articleData.content,
          changeNote: 'Inclusão inicial no acervo local'
        }
      ]
    };

    // Auditoria automatizada de publicação e autenticidade
    const auditReport = LegalCorpusAuditorService.verifyArticle(newArt);
    newArt.officialId = auditReport.officialId;
    newArt.officialContentSha256 = auditReport.externalSourceHash;
    newArt.externalSourceHash = auditReport.externalSourceHash;
    newArt.officialPublisher = auditReport.officialPublisher;
    newArt.authenticityStatus = auditReport.authenticityStatus;
    newArt.auditNotes = auditReport.auditNotes;
    newArt.statusVigencia = auditReport.statusVigencia;

    const existing = this.cachedArticles || [];
    const updated = [...existing, newArt];

    this.cachedArticles = updated;
    await IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_ARTICLES, updated);
    this.trySyncLocalStorage(this.cachedDocs || [], updated);

    this.notifyCacheInvalidation();

    return newArt;
  }

  /**
   * Adiciona um único artigo customizado (compatibilidade síncrona)
   */
  static addCustomArticle(articleData: {
    lawName: string;
    article: string;
    title: string;
    content: string;
    keywords: string[];
    officialRef?: string;
    sourceUrl?: string;
    officialId?: string;
    version?: string;
  }): LegalArticle {
    const newArt: LegalArticle = {
      id: 'custom-' + Date.now().toString(36) + Math.random().toString(36).substring(7),
      lawName: articleData.lawName,
      article: articleData.article,
      title: articleData.title,
      content: articleData.content,
      keywords: articleData.keywords,
      officialRef: articleData.officialRef || `Acervo Local (${articleData.lawName})`,
      sourceUrl: articleData.sourceUrl,
      officialId: articleData.officialId,
      version: articleData.version || 'Edição Local',
      queryDate: new Date().toISOString().split('T')[0],
      historicalVersions: [
        {
          effectiveDate: new Date().toISOString().split('T')[0],
          content: articleData.content,
          changeNote: 'Inclusão inicial no acervo local'
        }
      ]
    };

    // Auditoria automatizada de publicação e autenticidade
    const auditReport = LegalCorpusAuditorService.verifyArticle(newArt);
    newArt.officialId = auditReport.officialId;
    newArt.officialContentSha256 = auditReport.externalSourceHash;
    newArt.externalSourceHash = auditReport.externalSourceHash;
    newArt.officialPublisher = auditReport.officialPublisher;
    newArt.authenticityStatus = auditReport.authenticityStatus;
    newArt.auditNotes = auditReport.auditNotes;
    newArt.statusVigencia = auditReport.statusVigencia;

    const existing = this.cachedArticles !== null ? this.cachedArticles : this.getCustomArticles(true);
    const updated = [...existing, newArt];

    this.cachedArticles = updated;
    this.trySyncLocalStorage(this.cachedDocs || [], updated);
    IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_ARTICLES, updated);

    this.notifyCacheInvalidation();

    return newArt;
  }

  /**
   * Remove um único artigo do acervo customizado por ID
   */
  static async deleteCustomArticleAsync(articleId: string): Promise<void> {
    await this.syncWithIndexedDb();
    const existing = (this.cachedArticles || []).filter(a => a.id !== articleId);
    this.cachedArticles = existing;
    await IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_ARTICLES, existing);
    this.trySyncLocalStorage(this.cachedDocs || [], existing);
    this.notifyCacheInvalidation();
  }

  /**
   * Remove um único artigo do acervo customizado por ID (síncrono)
   */
  static deleteCustomArticle(articleId: string): void {
    const existing = (this.cachedArticles !== null ? this.cachedArticles : this.getCustomArticles(true)).filter(a => a.id !== articleId);
    this.cachedArticles = existing;
    this.trySyncLocalStorage(this.cachedDocs || [], existing);
    IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_ARTICLES, existing);
    this.notifyCacheInvalidation();
  }

  /**
   * Exclui um documento e todos os seus artigos associados do acervo local (Assíncrono)
   */
  static async removeCustomDocAsync(docId: string): Promise<void> {
    await this.syncWithIndexedDb();
    const existingDocs = (this.cachedDocs || []).filter(d => d.id !== docId);
    const existingArticles = (this.cachedArticles || []).filter(a => !a.id.startsWith(docId));

    this.cachedDocs = existingDocs;
    this.cachedArticles = existingArticles;

    await IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_DOCS, existingDocs);
    await IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_ARTICLES, existingArticles);
    this.trySyncLocalStorage(existingDocs, existingArticles);

    this.notifyCacheInvalidation();
  }

  /**
   * Exclui um documento e todos os seus artigos associados do acervo local (Síncrono)
   */
  static removeCustomDoc(docId: string): void {
    const existingDocs = (this.cachedDocs !== null ? this.cachedDocs : this.getCustomDocs()).filter(d => d.id !== docId);
    const existingArticles = (this.cachedArticles !== null ? this.cachedArticles : this.getCustomArticles(true)).filter(a => !a.id.startsWith(docId));

    this.cachedDocs = existingDocs;
    this.cachedArticles = existingArticles;

    this.trySyncLocalStorage(existingDocs, existingArticles);
    IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_DOCS, existingDocs);
    IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_ARTICLES, existingArticles);

    this.notifyCacheInvalidation();
  }

  /**
   * Reseta e limpa todo o acervo customizado do usuário (Assíncrono)
   */
  static async clearAllCustomLawsAsync(): Promise<void> {
    this.cachedDocs = [];
    this.cachedArticles = [];

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY_ARTICLES);
        localStorage.removeItem(STORAGE_KEY_DOCS);
      } catch {
        // Ignora
      }
    }

    await IndexedDbStorage.clearStore(STORES.CUSTOM_LAWS);
    this.notifyCacheInvalidation();
  }

  /**
   * Reseta e limpa todo o acervo customizado do usuário (Síncrono)
   */
  static clearAllCustomLaws(): void {
    this.cachedDocs = [];
    this.cachedArticles = [];

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY_ARTICLES);
        localStorage.removeItem(STORAGE_KEY_DOCS);
      } catch {
        // Ignora
      }
    }

    IndexedDbStorage.clearStore(STORES.CUSTOM_LAWS);
    this.notifyCacheInvalidation();
  }

  /**
   * Realiza busca nos artigos de leis municipais e regimentos customizados utilizando o algoritmo BM25
   */
  static searchCustomLaws(query: string, documentText: string = ''): LegalArticle[] {
    const customArticles = this.getCustomArticles();
    if (customArticles.length === 0) return [];

    const combinedQuery = `${query} ${documentText}`.toLowerCase().replace(/[^\w\sáéíóúâêîôûãõç]/g, ' ');
    const terms = Array.from(new Set(combinedQuery.split(/\s+/).filter(w => w.length > 2)));

    if (terms.length === 0) return customArticles.slice(0, 5);

    const k1 = 1.5;
    const b = 0.75;
    const N = customArticles.length;
    const avgdl = customArticles.reduce((acc, a) => acc + a.content.length, 0) / N || 1;

    const scored = customArticles.map(article => {
      let bm25Score = 0;
      const lowerContent = `${article.lawName} ${article.title} ${article.content}`.toLowerCase();
      const docLen = article.content.length;

      terms.forEach(term => {
        const df = customArticles.filter(a => a.content.toLowerCase().includes(term) || a.title.toLowerCase().includes(term)).length;
        if (df === 0) return;

        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        const tf = (lowerContent.match(new RegExp(term, 'gi')) || []).length;
        if (tf === 0) return;

        bm25Score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgdl))));
      });

      article.keywords.forEach(kw => {
        if (combinedQuery.includes(kw.toLowerCase())) bm25Score += 3.5;
      });

      return { article, score: bm25Score };
    });

    return scored
      .filter(item => item.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.article);
  }

  /**
   * Busca assíncrona com hidratação garantida do IndexedDB
   */
  static async searchCustomLawsAsync(query: string, documentText: string = ''): Promise<LegalArticle[]> {
    await this.syncWithIndexedDb();
    return this.searchCustomLaws(query, documentText);
  }

  // =========================================================================
  // BACKUP, EXPORTAÇÃO E IMPORTAÇÃO DO ACERVO PESSOAL
  // =========================================================================

  /**
   * Exporta todo o acervo personalizado em formato JSON padronizado com estatísticas e integridade
   */
  static async exportCorpusBackup(): Promise<{
    backupJson: string;
    filename: string;
    stats: {
      totalDocs: number;
      totalArticles: number;
      sizeBytes: number;
    };
  }> {
    await this.syncWithIndexedDb();

    const docs = this.cachedDocs || [];
    const articles = this.cachedArticles || [];

    const categoriesCount: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    docs.forEach(d => {
      categoriesCount[d.category] = (categoriesCount[d.category] || 0) + 1;
      const st = d.statusVigencia || 'em_vigor';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    const payload: LegalCorpusBackupPayload = {
      format: 'kovax-legal-corpus-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      source: 'KovaxFilesApp Legal Knowledge Engine',
      stats: {
        totalDocs: docs.length,
        totalArticles: articles.length,
        categories: categoriesCount,
        statusCounts: statusCounts
      },
      docs,
      articles
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `kovax_acervo_juridico_backup_${dateStr}.json`;

    let sizeBytes = 0;
    try {
      sizeBytes = new Blob([jsonString]).size;
    } catch {
      sizeBytes = jsonString.length;
    }

    return {
      backupJson: jsonString,
      filename,
      stats: {
        totalDocs: docs.length,
        totalArticles: articles.length,
        sizeBytes
      }
    };
  }

  /**
   * Dispara o download automático do backup no navegador
   */
  static async downloadCorpusBackup(): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const { backupJson, filename } = await this.exportCorpusBackup();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Importa e restaura o acervo jurídico a partir de um backup em JSON
   * Suporta modo 'merge' (acrescenta e unifica) ou 'replace' (substitui todo o acervo).
   */
  static async importCorpusBackup(
    backupData: string | object,
    mode: 'merge' | 'replace' = 'merge'
  ): Promise<{
    success: boolean;
    importedDocs: number;
    importedArticles: number;
    message: string;
  }> {
    await this.syncWithIndexedDb();

    let parsed: any;
    if (typeof backupData === 'string') {
      try {
        parsed = JSON.parse(backupData);
      } catch (e: any) {
        return {
          success: false,
          importedDocs: 0,
          importedArticles: 0,
          message: `Arquivo de backup inválido: JSON corrompido (${e.message}).`
        };
      }
    } else {
      parsed = backupData;
    }

    if (!parsed || (parsed.format !== 'kovax-legal-corpus-backup' && !Array.isArray(parsed.docs) && !Array.isArray(parsed.articles))) {
      return {
        success: false,
        importedDocs: 0,
        importedArticles: 0,
        message: 'Estrutura inválida. O arquivo precisa ser um backup gerado pelo KovaxFilesApp.'
      };
    }

    const incomingDocs: CustomLawDocument[] = Array.isArray(parsed.docs) ? parsed.docs : [];
    const incomingArticles: LegalArticle[] = Array.isArray(parsed.articles) ? parsed.articles : [];

    let finalDocs: CustomLawDocument[] = [];
    let finalArticles: LegalArticle[] = [];

    if (mode === 'replace') {
      finalDocs = incomingDocs;
      finalArticles = incomingArticles;
    } else {
      // Modo Merge: Previne duplicatas de ID
      const existingDocs = this.cachedDocs || [];
      const existingArticles = this.cachedArticles || [];

      const docMap = new Map<string, CustomLawDocument>();
      existingDocs.forEach(d => docMap.set(d.id, d));
      incomingDocs.forEach(d => docMap.set(d.id, d));
      finalDocs = Array.from(docMap.values());

      const artMap = new Map<string, LegalArticle>();
      existingArticles.forEach(a => artMap.set(a.id, a));
      incomingArticles.forEach(a => artMap.set(a.id, a));
      finalArticles = Array.from(artMap.values());
    }

    this.cachedDocs = finalDocs;
    this.cachedArticles = finalArticles;

    // Gravação segura no IndexedDB
    await IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_DOCS, finalDocs);
    await IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_ARTICLES, finalArticles);

    // Espelho no localStorage se couber
    this.trySyncLocalStorage(finalDocs, finalArticles);

    this.notifyCacheInvalidation();

    return {
      success: true,
      importedDocs: incomingDocs.length,
      importedArticles: incomingArticles.length,
      message: `Restauração concluída com sucesso! ${incomingDocs.length} norma(s) e ${incomingArticles.length} dispositivo(s) integrados ao acervo.`
    };
  }

  /**
   * Parser inteligente que divide um texto bruto de lei municipal/regimento em artigos
   */
  private static parseTextToArticles(
    text: string,
    docId: string,
    lawName: string,
    category: string,
    statusVigencia: 'em_vigor' | 'alterada' | 'revogada' = 'em_vigor'
  ): LegalArticle[] {
    const articles: LegalArticle[] = [];
    const articleRegex = /(?:Art(?:igo|\.)?\s*(\d+[\wº\-]*))/gi;
    const matches: { index: number; articleNum: string }[] = [];
    
    let match: RegExpExecArray | null;
    while ((match = articleRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        articleNum: `Artigo ${match[1]}`
      });
    }

    if (matches.length === 0) {
      const chunks = text.match(/.{1,600}(\s|$)/gs) || [text];
      chunks.forEach((chunk, idx) => {
        if (chunk.trim().length > 30) {
          articles.push({
            id: `${docId}-chunk-${idx + 1}`,
            lawName: `${lawName} [${category.toUpperCase()}]`,
            article: `Seção ${idx + 1}`,
            title: `Trecho ${idx + 1} - ${lawName}`,
            content: chunk.trim(),
            keywords: this.extractKeywords(chunk),
            officialRef: `Acervo Local (${lawName})`
          });
        }
      });
      return articles;
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const nextIndex = i + 1 < matches.length ? matches[i + 1].index : text.length;
      const rawContent = text.substring(current.index, nextIndex).trim();

      if (rawContent.length > 20) {
        const lines = rawContent.split('\n');
        const firstLine = lines[0].replace(articleRegex, '').replace(/^[\s\-–:]+/, '').trim();
        const title = firstLine.length > 5 && firstLine.length < 80 ? firstLine : `Dispositivo de ${lawName}`;

        articles.push({
          id: `${docId}-art-${i + 1}`,
          lawName: `${lawName} [${category.toUpperCase()}]`,
          article: current.articleNum,
          title,
          content: rawContent.length > 1500 ? rawContent.substring(0, 1500) + '...' : rawContent,
          keywords: this.extractKeywords(rawContent),
          officialRef: `Acervo Local (${lawName})`
        });
      }
    }

    // Realiza auditoria determinística e cálculo de hashes SHA-256 e URNs LexML para todos os dispositivos
    LegalCorpusAuditorService.auditCorpus(articles, true);
    return articles;
  }

  private static extractKeywords(text: string): string[] {
    const clean = text.toLowerCase().replace(/[^\w\sáéíóúâêîôûãõç]/g, ' ');
    const words = clean.split(/\s+/).filter(w => w.length > 4);
    const frequencyMap: Record<string, number> = {};
    for (const w of words) {
      frequencyMap[w] = (frequencyMap[w] || 0) + 1;
    }
    return Object.keys(frequencyMap)
      .sort((a, b) => frequencyMap[b] - frequencyMap[a])
      .slice(0, 8);
  }
}
