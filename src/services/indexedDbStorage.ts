/**
 * IndexedDbStorage - Motor de Armazenamento Assíncrono de Alta Capacidade em IndexedDB
 * Substitui as limitações de 5MB do localStorage por banco de dados chave-valor nativo do navegador.
 */

const DB_NAME = 'KovaxFilesApp_DB';
const DB_VERSION = 1;

export const STORES = {
  CHAT_SESSIONS: 'chat_sessions',
  CUSTOM_LAWS: 'custom_laws',
  FILE_CACHE: 'file_cache'
} as const;

export type StoreName = typeof STORES[keyof typeof STORES];

export class IndexedDbStorage {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB não suportado neste ambiente.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        Object.values(STORES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        });
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Obtém um item do banco de dados IndexedDB de forma assíncrona
   */
  static async getItem<T>(storeName: StoreName, key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);

        req.onsuccess = () => resolve(req.result !== undefined ? (req.result as T) : null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn(`[IndexedDbStorage] Erro ao ler ${storeName}:${key}:`, err);
      return null;
    }
  }

  /**
   * Grava um item no banco de dados IndexedDB de forma assíncrona
   */
  static async setItem<T>(storeName: StoreName, key: string, value: T): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(value, key);

        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`[IndexedDbStorage] Erro ao gravar ${storeName}:${key}:`, err);
      return false;
    }
  }

  /**
   * Remove uma chave do IndexedDB
   */
  static async removeItem(storeName: StoreName, key: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);

        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`[IndexedDbStorage] Erro ao remover ${storeName}:${key}:`, err);
      return false;
    }
  }

  /**
   * Limpa uma store inteira do IndexedDB
   */
  static async clearStore(storeName: StoreName): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();

        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`[IndexedDbStorage] Erro ao limpar store ${storeName}:`, err);
      return false;
    }
  }
}
