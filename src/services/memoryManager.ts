/**
 * MemoryManager - Utilitário de Limpeza e Gerenciamento de Memória do Navegador
 * Gerencia e revoga Object URLs (URL.createObjectURL) e limpa referências para evitar leaks de memória RAM.
 */

export class MemoryManager {
  private static registeredUrls = new Set<string>();

  /**
   * Cria e registra uma URL de objeto temporária para limpeza posterior
   */
  public static createTrackedObjectUrl(blob: Blob): string {
    if (typeof window === 'undefined' || !URL.createObjectURL) {
      return '';
    }
    const url = URL.createObjectURL(blob);
    this.registeredUrls.add(url);
    return url;
  }

  /**
   * Revoga uma URL específica e limpa do registro
   */
  public static revokeUrl(url: string | null | undefined): void {
    if (!url || typeof window === 'undefined' || !URL.revokeObjectURL) return;
    try {
      URL.revokeObjectURL(url);
      this.registeredUrls.delete(url);
    } catch {
      // Ignora erro se a URL já tiver sido revogada
    }
  }

  /**
   * Revoga todas as URLs rastreadas criadas na sessão atual
   */
  public static revokeAllTrackedUrls(): void {
    if (typeof window === 'undefined' || !URL.revokeObjectURL) return;
    this.registeredUrls.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    this.registeredUrls.clear();
  }
}
