import { LegalArticle } from './legalKnowledgeBaseService';
import { IndexedDbStorage, STORES } from './indexedDbStorage';

export interface CustomLawDocument {
  id: string;
  name: string;
  category: 'municipal' | 'estadual' | 'regimento' | 'outros';
  statusVigencia?: 'em_vigor' | 'alterada' | 'revogada';
  uploadDate: string;
  articleCount: number;
  rawText?: string;
}

const STORAGE_KEY_ARTICLES = 'kovax_custom_legal_articles_v1';
const STORAGE_KEY_DOCS = 'kovax_custom_legal_docs_v1';

export class CustomLegalKnowledgeService {
  /**
   * Obtém todos os artigos customizados salvos no acervo local do navegador (filtra normas revogadas)
   */
  static getCustomArticles(): LegalArticle[] {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
      const data = localStorage.getItem(STORAGE_KEY_ARTICLES);
      const docs = this.getCustomDocs();
      const revogadosIds = new Set(docs.filter(d => d.statusVigencia === 'revogada').map(d => d.id));
      
      const articles: LegalArticle[] = data ? JSON.parse(data) : [];
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
   * Salva um novo documento de lei municipal/estadual/regimento e extrai os artigos automaticamente
   */
  static addCustomLawDocument(
    docName: string,
    rawText: string,
    category: 'municipal' | 'estadual' | 'regimento' | 'outros' = 'municipal',
    statusVigencia: 'em_vigor' | 'alterada' | 'revogada' = 'em_vigor'
  ): { doc: CustomLawDocument; addedArticlesCount: number } {
    const docId = 'custom-doc-' + Date.now().toString(36) + Math.random().toString(36).substring(7);
    const parsedArticles = this.parseTextToArticles(rawText, docId, docName, category, statusVigencia);

    const existingArticles = this.getCustomArticles();
    const updatedArticles = [...existingArticles, ...parsedArticles];

    const newDoc: CustomLawDocument = {
      id: docId,
      name: docName,
      category,
      statusVigencia,
      uploadDate: new Date().toLocaleDateString('pt-BR'),
      articleCount: parsedArticles.length
    };

    const existingDocs = this.getCustomDocs();
    const updatedDocs = [...existingDocs, newDoc];

    try {
      localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(updatedArticles));
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(updatedDocs));
    } catch (err) {
      console.warn('[CustomLegalKnowledgeService] localStorage excedido. Sincronizando com IndexedDB:', err);
    }

    // Sincronização no IndexedDB nativo de alta capacidade
    IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_ARTICLES, updatedArticles);
    IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_DOCS, updatedDocs);

    return { doc: newDoc, addedArticlesCount: parsedArticles.length };
  }

  /**
   * Adiciona um único artigo customizado ao acervo local do usuário
   */
  static addCustomArticle(articleData: {
    lawName: string;
    article: string;
    title: string;
    content: string;
    keywords: string[];
  }): LegalArticle {
    const newArt: LegalArticle = {
      id: 'custom-' + Date.now().toString(36) + Math.random().toString(36).substring(7),
      lawName: articleData.lawName,
      article: articleData.article,
      title: articleData.title,
      content: articleData.content,
      keywords: articleData.keywords,
      officialRef: `Acervo Local (${articleData.lawName})`
    };

    const existing = this.getCustomArticles();
    const updated = [...existing, newArt];

    try {
      localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(updated));
    } catch {
      // Ignora erro local
    }
    IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_ARTICLES, updated);

    return newArt;
  }

  /**
   * Remove um único artigo do acervo customizado por ID
   */
  static deleteCustomArticle(articleId: string): void {
    const existing = this.getCustomArticles().filter(a => a.id !== articleId);
    try {
      localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(existing));
    } catch {
      // Ignora erro local
    }
    IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_ARTICLES, existing);
  }

  /**
   * Exclui um documento e todos os seus artigos associados do acervo local
   */
  static removeCustomDoc(docId: string): void {
    const existingDocs = this.getCustomDocs().filter(d => d.id !== docId);
    const existingArticles = this.getCustomArticles().filter(a => !a.id.startsWith(docId));

    try {
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(existingDocs));
      localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(existingArticles));
    } catch (err) {
      console.error('[CustomLegalKnowledgeService] Erro ao remover documento customizado:', err);
    }

    IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_DOCS, existingDocs);
    IndexedDbStorage.setItem(STORES.CUSTOM_LAWS, STORAGE_KEY_ARTICLES, existingArticles);
  }

  /**
   * Reseta e limpa todo o acervo customizado do usuário
   */
  static clearAllCustomLaws(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_ARTICLES);
      localStorage.removeItem(STORAGE_KEY_DOCS);
    } catch {
      // Ignora erro local
    }
    IndexedDbStorage.clearStore(STORES.CUSTOM_LAWS);
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
