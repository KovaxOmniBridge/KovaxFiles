/**
 * LOCAL VECTOR STORE & HYBRID RAG SEARCH (IndexedDB)
 * 100% Client-Side, 0% Upload, Air-Gapped Semantic Storage.
 */

export interface DocumentChunk {
  id: string;
  docId: string;
  pageNumber: number;
  text: string;
  vector: number[];
  termFreq: Record<string, number>;
}

export interface StoredDocumentMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  chunkCount: number;
  indexedAt: number;
}

export interface VectorSearchResult {
  pageNumber: number;
  text: string;
  relevanceScore: number; // 0 to 100%
}

const DB_NAME = 'ManipuladorVectorDB';
const DB_VERSION = 1;
const DOCS_STORE = 'documents';
const CHUNKS_STORE = 'chunks';

const STOP_WORDS = new Set([
  'de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais',
  'as', 'dos', 'como', 'mas', 'ao', 'ele', 'das', 'à', 'seu', 'sua', 'ou', 'quando', 'muito', 'nos', 'já', 'eu', 'também',
  'só', 'pelo', 'pela', 'até', 'isso', 'ela', 'entre', 'depois', 'sem', 'mesmo', 'aos', 'seus', 'quem', 'nas', 'me', 'esse',
  'eles', 'você', 'essa', 'num', 'nem', 'suas', 'meu', 'às', 'minha', 'numa', 'cujo', 'cuja', 'qual', 'quais', 'the', 'and',
  'is', 'in', 'it', 'you', 'that', 'was', 'for', 'on', 'are', 'with', 'as', 'at', 'be', 'this', 'have', 'from', 'or', 'by'
]);

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste ambiente.'));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (evt) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DOCS_STORE)) {
        db.createObjectStore(DOCS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
        const chunkStore = db.createObjectStore(CHUNKS_STORE, { keyPath: 'id' });
        chunkStore.createIndex('docId', 'docId', { unique: false });
        chunkStore.createIndex('pageNumber', 'pageNumber', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Tokeniza o texto em palavras limpas sem stop words.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos para indexação uniforme
    .replace(/[^\w\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Gera um vetor de características numéricas (hash vector 64D) a partir dos n-grams/tokens do texto.
 */
function computeFeatureVector(tokens: string[], dimensions = 64): number[] {
  const vector = new Array(dimensions).fill(0);
  if (tokens.length === 0) return vector;

  tokens.forEach((token) => {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vector[idx] += 1;
  });

  // Normalização L2
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] /= magnitude;
    }
  }

  return vector;
}

/**
 * Calcula a similaridade de cosseno entre dois vetores.
 */
function cosineSimilarity(vA: number[], vB: number[]): number {
  if (vA.length !== vB.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vA.length; i++) {
    dotProduct += vA[i] * vB[i];
  }
  return dotProduct;
}

/**
 * Calcula a frequência de termos (TF) de um conjunto de tokens.
 */
function computeTermFreq(tokens: string[]): Record<string, number> {
  const tf: Record<string, number> = {};
  const total = tokens.length || 1;
  tokens.forEach((t) => {
    tf[t] = (tf[t] || 0) + 1 / total;
  });
  return tf;
}

export const localVectorStore = {
  /**
   * Verifica se o documento já está totalmente indexado no IndexedDB local.
   */
  async getDocumentMetadata(docId: string): Promise<StoredDocumentMetadata | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(DOCS_STORE, 'readonly');
        const req = tx.objectStore(DOCS_STORE).get(docId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  /**
   * Divide e indexa o texto de um documento de 500+ páginas no IndexedDB local com vetores semânticos.
   */
  async indexDocument(
    docId: string,
    fileName: string,
    fileSize: number,
    pageTexts: { page: number; text: string }[],
    onProgress?: (percent: number, status: string) => void
  ): Promise<StoredDocumentMetadata> {
    const db = await openDB();
    const chunks: DocumentChunk[] = [];
    let chunkIdCounter = 0;

    const chunkSize = 600; // Tamanho ideal de janela para RAG em parágrafo
    const chunkOverlap = 100;

    const totalPages = pageTexts.length;

    pageTexts.forEach(({ page, text }, pIdx) => {
      if (onProgress && pIdx % 10 === 0) {
        const percent = Math.round(((pIdx + 1) / totalPages) * 100);
        onProgress(percent, `Indexando vetores semânticos: página ${pIdx + 1} de ${totalPages}...`);
      }

      const pageClean = text.trim();
      if (!pageClean) return;

      if (pageClean.length <= chunkSize) {
        const tokens = tokenize(pageClean);
        chunks.push({
          id: `${docId}_c${chunkIdCounter++}`,
          docId,
          pageNumber: page,
          text: pageClean,
          vector: computeFeatureVector(tokens),
          termFreq: computeTermFreq(tokens),
        });
      } else {
        for (let i = 0; i < pageClean.length; i += chunkSize - chunkOverlap) {
          const chunkText = pageClean.substring(i, i + chunkSize);
          if (chunkText.trim().length > 30) {
            const tokens = tokenize(chunkText);
            chunks.push({
              id: `${docId}_c${chunkIdCounter++}`,
              docId,
              pageNumber: page,
              text: chunkText.trim(),
              vector: computeFeatureVector(tokens),
              termFreq: computeTermFreq(tokens),
            });
          }
        }
      }
    });

    // Salva chunks e metadata em transação IndexedDB
    return new Promise((resolve, reject) => {
      const tx = db.transaction([DOCS_STORE, CHUNKS_STORE], 'readwrite');
      const docsStore = tx.objectStore(DOCS_STORE);
      const chunksStore = tx.objectStore(CHUNKS_STORE);

      const metadata: StoredDocumentMetadata = {
        id: docId,
        fileName,
        fileSize,
        pageCount: totalPages,
        chunkCount: chunks.length,
        indexedAt: Date.now(),
      };

      docsStore.put(metadata);

      chunks.forEach((chunk) => {
        chunksStore.put(chunk);
      });

      tx.oncomplete = () => {
        onProgress?.(100, `Indexação vetorial concluída! ${chunks.length} fragmentos salvos no IndexedDB local.`);
        resolve(metadata);
      };
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Executa busca semântica híbrida (Hybrid Vector RAG) no IndexedDB local.
   */
  async searchVectorChunks(
    docId: string,
    query: string,
    topK = 4
  ): Promise<VectorSearchResult[]> {
    const db = await openDB();
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const queryVector = computeFeatureVector(queryTokens);

    return new Promise((resolve) => {
      const tx = db.transaction(CHUNKS_STORE, 'readonly');
      const index = tx.objectStore(CHUNKS_STORE).index('docId');
      const req = index.getAll(docId);

      req.onsuccess = () => {
        const chunks: DocumentChunk[] = req.result || [];
        if (chunks.length === 0) {
          resolve([]);
          return;
        }

        const scoredResults = chunks.map((chunk) => {
          // 1. Cosine similarity do vetor de n-grams
          const cosSim = cosineSimilarity(queryVector, chunk.vector);

          // 2. Exact match de termos de busca no texto
          let termMatchCount = 0;
          queryTokens.forEach((qt) => {
            if (chunk.termFreq[qt]) {
              termMatchCount += chunk.termFreq[qt];
            }
          });

          // 3. Pontuação de relevância combinada (0.0 - 1.0)
          const hybridScore = cosSim * 0.65 + Math.min(1, termMatchCount * 5) * 0.35;
          const scorePercent = Math.min(99, Math.round(hybridScore * 100));

          return {
            pageNumber: chunk.pageNumber,
            text: chunk.text,
            relevanceScore: scorePercent,
          };
        });

        // Ordenar por maior relevância e filtrar únicos por página/snippet
        scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

        const filteredTop: VectorSearchResult[] = [];
        const seenPages = new Set<number>();

        for (const res of scoredResults) {
          if (res.relevanceScore < 20 && filteredTop.length >= 1) break;
          filteredTop.push(res);
          seenPages.add(res.pageNumber);
          if (filteredTop.length >= topK) break;
        }

        resolve(filteredTop);
      };

      req.onerror = () => resolve([]);
    });
  },

  /**
   * Remove o índice vetorial de um documento.
   */
  async clearDocumentIndex(docId: string): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction([DOCS_STORE, CHUNKS_STORE], 'readwrite');
      tx.objectStore(DOCS_STORE).delete(docId);

      const chunksStore = tx.objectStore(CHUNKS_STORE);
      const index = chunksStore.index('docId');
      const req = index.getAllKeys(docId);

      req.onsuccess = () => {
        const keys = req.result || [];
        keys.forEach((k) => chunksStore.delete(k));
      };
    } catch (err) {
      console.error('Erro ao limpar índice vetorial:', err);
    }
  },
};
