/**
 * IndexedDbStorage - Motor de Armazenamento Assíncrono de Alta Capacidade em IndexedDB
 * Atualizado com suporte a migrações versionadas, transações atômicas e recuperação após falha.
 */

import { storageAdapter, STORAGE_STORES } from '../infrastructure/storage/storageAdapter';

export const STORES = STORAGE_STORES;
export type StoreName = typeof STORAGE_STORES[keyof typeof STORAGE_STORES];

export class IndexedDbStorage {
  /**
   * Obtém um item do banco de dados IndexedDB de forma assíncrona
   */
  static async getItem<T>(storeName: StoreName, key: string): Promise<T | null> {
    return storageAdapter.getItem<T>(storeName, key);
  }

  /**
   * Grava um item no banco de dados IndexedDB de forma assíncrona
   */
  static async setItem<T>(storeName: StoreName, key: string, value: T): Promise<boolean> {
    return storageAdapter.setItem<T>(storeName, key, value);
  }

  /**
   * Remove uma chave do IndexedDB
   */
  static async removeItem(storeName: StoreName, key: string): Promise<boolean> {
    return storageAdapter.removeItem(storeName, key);
  }

  /**
   * Limpa uma store inteira do IndexedDB
   */
  static async clearStore(storeName: StoreName): Promise<boolean> {
    return storageAdapter.clearStore(storeName);
  }

  /**
   * Obtém todas as chaves de um store
   */
  static async getAllKeys(storeName: StoreName): Promise<string[]> {
    return storageAdapter.getAllKeys(storeName);
  }

  /**
   * Obtém todos os registros de um store
   */
  static async getAllEntries<T>(storeName: StoreName): Promise<Array<{ key: string; value: T }>> {
    return storageAdapter.getAllEntries<T>(storeName);
  }

  /**
   * Executa operação atômica dentro de transação gerenciada
   */
  static async runInTransaction<T>(
    storeNames: StoreName[],
    mode: 'readonly' | 'readwrite',
    operation: (stores: Record<string, IDBObjectStore>) => Promise<T>
  ): Promise<T> {
    return storageAdapter.runInTransaction<T>(storeNames, mode, operation);
  }

  /**
   * Recupera o banco de dados em caso de falha ou corrupção
   */
  static async recoverDatabase(): Promise<boolean> {
    return storageAdapter.recoverDatabase();
  }
}
