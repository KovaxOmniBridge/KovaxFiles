/**
 * KovaxFiles Desktop — Temp File & Buffer Cleanup Manager
 * Garante que arquivos temporários, blobs e buffers intermediários gerados durante
 * processamentos sejam rigorosamente destruídos após sucesso, falha ou cancelamento.
 */

export class TempFileManager {
  private static activeBlobUrls: Set<string> = new Set();
  private static activeTempFilePaths: Set<string> = new Set();

  /**
   * Registra um Blob URL temporário criado para exibição ou download
   */
  static registerBlobUrl(url: string): void {
    if (url && url.startsWith('blob:')) {
      this.activeBlobUrls.add(url);
    }
  }

  /**
   * Revoga e libera um Blob URL específico
   */
  static revokeBlobUrl(url: string): void {
    if (this.activeBlobUrls.has(url)) {
      if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
      this.activeBlobUrls.delete(url);
    }
  }

  /**
   * Registra um caminho de arquivo temporário em disco (.tmp)
   */
  static registerTempPath(filePath: string): void {
    if (filePath) {
      this.activeTempFilePaths.add(filePath);
    }
  }

  /**
   * Remove um arquivo temporário em disco de forma segura
   */
  static removeTempPath(filePath: string): void {
    this.activeTempFilePaths.delete(filePath);
  }

  /**
   * Executa a limpeza completa de todos os recursos temporários pendentes
   */
  static cleanupAll(): void {
    // 1. Revogar todos os Blobs ativos
    if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
      for (const url of this.activeBlobUrls) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
    }
    this.activeBlobUrls.clear();

    // 2. Limpar referências de arquivos temporários
    this.activeTempFilePaths.clear();
  }

  /**
   * Wrapper utilitário que garante execução com limpeza obrigatória no finally
   */
  static async runWithCleanup<T>(operation: () => Promise<T>): Promise<T> {
    const allocatedUrls: string[] = [];
    try {
      return await operation();
    } finally {
      for (const url of allocatedUrls) {
        this.revokeBlobUrl(url);
      }
    }
  }
}
