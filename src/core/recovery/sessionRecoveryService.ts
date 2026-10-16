/**
 * KovaxFiles Desktop — Core Session Recovery Service
 * Preserva projetos, dados e opções de ferramentas em caso de fechamento inesperado
 * (crash ou encerramento abrupto da janela), permitindo restauração imediata do workspace.
 */

import { storageAdapter, STORAGE_STORES } from '../../infrastructure/storage/storageAdapter';
import { cryptoAdapter } from '../../infrastructure/crypto/cryptoAdapter';

export interface SessionRecoverySnapshot {
  sessionId: string;
  activeTool: string;
  savedAt: string;
  projectData: {
    documentName?: string;
    documentId?: string;
    rawText?: string;
    options?: Record<string, unknown>;
    selectedCategories?: string[];
  };
  checksumSha256: string;
}

export class SessionRecoveryService {
  private static readonly RECOVERY_KEY = 'latest_active_session_draft';

  /**
   * Grava um snapshot de recuperação do workspace ativo
   */
  static async saveDraft(
    activeTool: string,
    projectData: SessionRecoverySnapshot['projectData']
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      const contentToHash = JSON.stringify({ activeTool, projectData });
      const checksumSha256 = await cryptoAdapter.computeSha256(contentToHash);

      const snapshot: SessionRecoverySnapshot = {
        sessionId: `session_${Date.now().toString(36)}`,
        activeTool,
        savedAt: now,
        projectData,
        checksumSha256
      };

      await storageAdapter.setItem(STORAGE_STORES.SESSION_RECOVERY, this.RECOVERY_KEY, snapshot);
    } catch (err) {
      console.warn('[SessionRecoveryService] Falha ao gravar rascunho de recuperação:', err);
    }
  }

  /**
   * Verifica se existe uma sessão recuperável gravada
   */
  static async hasRecoverableSession(): Promise<boolean> {
    try {
      const snapshot = await storageAdapter.getItem<SessionRecoverySnapshot>(
        STORAGE_STORES.SESSION_RECOVERY,
        this.RECOVERY_KEY
      );
      return Boolean(snapshot && snapshot.projectData);
    } catch {
      return false;
    }
  }

  /**
   * Obtém a sessão recuperável validando a integridade dos dados
   */
  static async getRecoverableSession(): Promise<SessionRecoverySnapshot | null> {
    try {
      const snapshot = await storageAdapter.getItem<SessionRecoverySnapshot>(
        STORAGE_STORES.SESSION_RECOVERY,
        this.RECOVERY_KEY
      );
      if (!snapshot) return null;

      // Validação de integridade do rascunho
      const contentToHash = JSON.stringify({
        activeTool: snapshot.activeTool,
        projectData: snapshot.projectData
      });
      const check = await cryptoAdapter.computeSha256(contentToHash);
      if (check.toLowerCase() !== snapshot.checksumSha256.toLowerCase()) {
        console.warn('[SessionRecoveryService] Rascunho corrompido descartado.');
        await this.clearSession();
        return null;
      }

      return snapshot;
    } catch {
      return null;
    }
  }

  /**
   * Limpa a sessão recuperável após salvamento definitivo ou descarte pelo usuário
   */
  static async clearSession(): Promise<void> {
    try {
      await storageAdapter.removeItem(STORAGE_STORES.SESSION_RECOVERY, this.RECOVERY_KEY);
    } catch {}
  }
}
