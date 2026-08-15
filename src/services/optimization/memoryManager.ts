class MemoryManager {
  private activeBlobUrls = new Set<string>();
  private trackedBuffers = new Set<Uint8Array>();
  private isInitialized = false;

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Attach unload listeners to purge memory when closing tab
    window.addEventListener('beforeunload', () => {
      this.purgeAllMemory();
    });

    window.addEventListener('pagehide', () => {
      this.purgeAllMemory();
    });
  }

  public registerBuffer(buffer: Uint8Array): Uint8Array {
    this.trackedBuffers.add(buffer);
    return buffer;
  }

  public registerBlobUrl(url: string): string {
    if (url && url.startsWith('blob:')) {
      this.activeBlobUrls.add(url);
    }
    return url;
  }

  public createAndRegisterBlobUrl(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    this.activeBlobUrls.add(url);
    return url;
  }

  public revokeBlobUrl(url?: string) {
    if (!url) return;
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
      this.activeBlobUrls.delete(url);
    }
  }

  public purgeAllMemory() {
    let count = 0;
    this.activeBlobUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
        count++;
      } catch (err) {
        console.error('Erro ao revogar Blob URL:', err);
      }
    });
    this.activeBlobUrls.clear();

    let zeroedBytes = 0;
    this.trackedBuffers.forEach((buf) => {
      try {
        buf.fill(0);
        zeroedBytes += buf.byteLength;
      } catch {}
    });
    this.trackedBuffers.clear();

    console.log(`[MemoryManager] Auto-destruição concluída. ${count} Blobs revogados e ${zeroedBytes} bytes de RAM zerados.`);
  }

  public getActiveMemoryBlobCount(): number {
    return this.activeBlobUrls.size;
  }
}

export const memoryManager = new MemoryManager();

