/**
 * KovaxFiles Desktop — Core Backup & Restore Service
 * Criação, validação criptográfica (SHA-256), pré-visualização e restauração atômica de backups.
 */

import { storageAdapter, STORAGE_STORES, StorageStoreName } from '../../infrastructure/storage/storageAdapter';
import { cryptoAdapter } from '../../infrastructure/crypto/cryptoAdapter';
import { ValidationError, CryptoOperationError } from '../../shared/errors/kovaxErrors';

export const BACKUP_SCHEMA_VERSION = '1.0';
export const MAX_BACKUP_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB

export interface BackupPayload {
  schemaVersion: string;
  appVersion: string;
  createdAt: string;
  totalSizeBytes: number;
  checksumSha256: string;
  stores: Record<string, Array<{ key: string; value: unknown }>>;
  metadata: {
    totalItems: number;
    storesSummary: Record<string, number>;
    exportedBy: string;
  };
}

export interface BackupStoreSummary {
  storeName: string;
  itemCount: number;
  sampleKeys: string[];
}

export interface BackupPreviewResult {
  isValid: boolean;
  schemaVersion: string;
  appVersion: string;
  createdAt: string;
  totalSizeBytes: number;
  checksumMatches: boolean;
  calculatedChecksum: string;
  expectedChecksum: string;
  storeSummaries: BackupStoreSummary[];
  validationErrors: string[];
}

export class CoreBackupService {
  private static readonly BACKUP_STORES: StorageStoreName[] = [
    STORAGE_STORES.CUSTOM_LAWS,
    STORAGE_STORES.CHAT_SESSIONS,
    STORAGE_STORES.DOCUMENTS,
    STORAGE_STORES.AUDIT_LOGS
  ];

  /**
   * Gera um pacote de backup completo assinado com checksum SHA-256
   */
  static async createBackup(): Promise<{ jsonString: string; payload: BackupPayload }> {
    const storesData: Record<string, Array<{ key: string; value: unknown }>> = {};
    const storesSummary: Record<string, number> = {};
    let totalItems = 0;

    for (const storeName of this.BACKUP_STORES) {
      const entries = await storageAdapter.getAllEntries(storeName);
      storesData[storeName] = entries;
      storesSummary[storeName] = entries.length;
      totalItems += entries.length;
    }

    // Serialização determinística dos dados para cálculo de hash
    const dataToHash = JSON.stringify({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      stores: storesData
    });

    const checksumSha256 = await cryptoAdapter.computeSha256(dataToHash);
    const nowIso = new Date().toISOString();

    const partialPayload: Omit<BackupPayload, 'totalSizeBytes'> = {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appVersion: '1.0.0',
      createdAt: nowIso,
      checksumSha256,
      stores: storesData,
      metadata: {
        totalItems,
        storesSummary,
        exportedBy: 'KovaxFiles Desktop (100% Local)'
      }
    };

    const finalJson = JSON.stringify(partialPayload, null, 2);
    const totalSizeBytes = new TextEncoder().encode(finalJson).length;

    const payload: BackupPayload = {
      ...partialPayload,
      totalSizeBytes
    };

    return {
      jsonString: JSON.stringify(payload, null, 2),
      payload
    };
  }

  /**
   * Pré-visualiza o conteúdo do backup e valida integridade, schema, tamanho e checksum
   * SEM alterar qualquer dado no banco de dados.
   */
  static async previewBackup(rawBackup: string | Uint8Array): Promise<BackupPreviewResult> {
    const errors: string[] = [];
    let textContent = '';

    if (typeof rawBackup === 'string') {
      textContent = rawBackup;
    } else {
      textContent = new TextDecoder().decode(rawBackup);
    }

    const byteLength = new TextEncoder().encode(textContent).length;
    if (byteLength > MAX_BACKUP_SIZE_BYTES) {
      errors.push(`O arquivo de backup (${(byteLength / 1024 / 1024).toFixed(2)} MB) excede o limite máximo permitido de 200 MB.`);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(textContent);
    } catch (e: any) {
      errors.push(`Arquivo de backup não é um JSON válido: ${e.message}`);
      return {
        isValid: false,
        schemaVersion: 'desconhecida',
        appVersion: 'desconhecida',
        createdAt: 'desconhecida',
        totalSizeBytes: byteLength,
        checksumMatches: false,
        calculatedChecksum: '',
        expectedChecksum: '',
        storeSummaries: [],
        validationErrors: errors
      };
    }

    // Validação de Esquema
    if (!parsed || typeof parsed !== 'object') {
      errors.push('O conteúdo raiz do backup deve ser um objeto estruturado.');
    }

    if (parsed.schemaVersion !== BACKUP_SCHEMA_VERSION) {
      errors.push(`Versão do esquema incompatível: esperado "${BACKUP_SCHEMA_VERSION}", obtido "${parsed.schemaVersion}".`);
    }

    if (!parsed.checksumSha256 || typeof parsed.checksumSha256 !== 'string' || parsed.checksumSha256.length !== 64) {
      errors.push('O backup não contém um checksum SHA-256 válido de 64 caracteres.');
    }

    if (!parsed.stores || typeof parsed.stores !== 'object') {
      errors.push('Objeto "stores" de dados não encontrado no arquivo de backup.');
    }

    // Verificação Criptográfica do Checksum
    let checksumMatches = false;
    let calculatedChecksum = '';
    const expectedChecksum = parsed.checksumSha256 || '';

    if (parsed.stores) {
      try {
        const dataToHash = JSON.stringify({
          schemaVersion: parsed.schemaVersion,
          stores: parsed.stores
        });
        calculatedChecksum = await cryptoAdapter.computeSha256(dataToHash);
        checksumMatches = calculatedChecksum.toLowerCase() === expectedChecksum.toLowerCase();
        if (!checksumMatches) {
          errors.push(`Checksum SHA-256 divergente: os dados podem estar corrompidos ou sofreram adulteração.`);
        }
      } catch (err: any) {
        errors.push(`Falha no cálculo do hash do backup: ${err.message}`);
      }
    }

    // Montar Resumos de Stores
    const summaries: BackupStoreSummary[] = [];
    if (parsed.stores && typeof parsed.stores === 'object') {
      for (const [storeName, items] of Object.entries(parsed.stores)) {
        if (Array.isArray(items)) {
          summaries.push({
            storeName,
            itemCount: items.length,
            sampleKeys: items.slice(0, 5).map((it: any) => String(it?.key || 'item'))
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      schemaVersion: parsed.schemaVersion || 'desconhecida',
      appVersion: parsed.appVersion || 'desconhecida',
      createdAt: parsed.createdAt || 'desconhecida',
      totalSizeBytes: byteLength,
      checksumMatches,
      calculatedChecksum,
      expectedChecksum,
      storeSummaries: summaries,
      validationErrors: errors
    };
  }

  /**
   * Restaura o backup de forma atômica utilizando transação de gravação com rollback.
   * Se a validação prévia falhar, a operação é rejeitada antes de tocar no banco.
   */
  static async restoreBackup(
    rawBackup: string | Uint8Array,
    options: { clearBeforeRestore?: boolean } = {}
  ): Promise<{ success: boolean; restoredStores: string[]; totalRestoredItems: number }> {
    // 1. Pré-visualização e validação rígida
    const preview = await this.previewBackup(rawBackup);
    if (!preview.isValid) {
      throw new ValidationError(`Restauração de backup rejeitada por falha de integridade: ${preview.validationErrors.join('; ')}`);
    }

    let parsed: BackupPayload;
    if (typeof rawBackup === 'string') {
      parsed = JSON.parse(rawBackup);
    } else {
      parsed = JSON.parse(new TextDecoder().decode(rawBackup));
    }

    const targetStoreNames = Object.keys(parsed.stores).filter(s =>
      Object.values(STORAGE_STORES).includes(s as any)
    );

    if (targetStoreNames.length === 0) {
      throw new ValidationError('Nenhum store compatível encontrado no arquivo de backup para restauração.');
    }

    let totalRestoredItems = 0;

    // 2. Execução atômica gerenciada por transação
    await storageAdapter.runInTransaction(
      targetStoreNames,
      'readwrite',
      async (storesMap) => {
        for (const storeName of targetStoreNames) {
          const store = storesMap[storeName];
          if (!store) continue;

          if (options.clearBeforeRestore) {
            store.clear();
          }

          const items = parsed.stores[storeName] || [];
          for (const item of items) {
            store.put(item.value, item.key);
            totalRestoredItems++;
          }
        }
      }
    );

    return {
      success: true,
      restoredStores: targetStoreNames,
      totalRestoredItems
    };
  }
}
