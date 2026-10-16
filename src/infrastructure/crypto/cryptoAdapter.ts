/**
 * KovaxFiles Desktop — Decoupled Cryptography Infrastructure Adapter
 * Fornece operações criptográficas padronizadas (SHA-256, limpeza segura de buffers e UUID)
 * sem acoplamento a objetos específicos do navegador ou do Electron.
 */

import { CryptoOperationError } from '../../shared/errors/kovaxErrors';

export interface ICryptoAdapter {
  computeSha256(data: Uint8Array | string): Promise<string>;
  computeSha256Sync(data: Uint8Array | string): string;
  generateSecureRandomBytes(length: number): Uint8Array;
  secureWipeBuffer(buffer: Uint8Array): void;
  generateUuid(): string;
}

export class StandardCryptoAdapter implements ICryptoAdapter {
  /**
   * Calcula SHA-256 de forma assíncrona usando WebCrypto (crypto.subtle) ou fallback Node.js
   */
  async computeSha256(data: Uint8Array | string): Promise<string> {
    try {
      const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;

      // 1. Tentar WebCrypto API (padrão em navegadores e Workers modernos)
      if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
        const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', bytes as any);
        return Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      }

      // 2. Fallback síncrono puro (independente de runtime)
      return this.computeSha256Sync(data);
    } catch (err: any) {
      throw new CryptoOperationError(`Falha ao calcular digest SHA-256: ${err.message}`, 'ERR_SHA256_FAILED', {
        error: err
      });
    }
  }

  /**
   * Implementação pura e autossuficiente de SHA-256 em TypeScript.
   * Funciona em qualquer ambiente (Web, Electron Renderer, Node, Main Process, Web Worker).
   */
  computeSha256Sync(data: Uint8Array | string): string {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;

    function rightRotate(value: number, amount: number): number {
      return (value >>> amount) | (value << (32 - amount));
    }

    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const lengthProperty = 'length';
    let i = 0;
    let j = 0;
    let result = '';

    const words: number[] = [];
    const asciiBitLength = bytes[lengthProperty] * 8;

    const hash: number[] = [];
    const k: number[] = [];
    let primeCounter = 0;

    const isComposite: Record<number, number> = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }

    for (i = 0; i < bytes[lengthProperty]; i++) {
      words[i >> 2] |= bytes[i] << ((3 - (i % 4)) * 8);
    }

    words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
    words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

    for (let chunk = 0; chunk < words[lengthProperty]; chunk += 16) {
      const w: number[] = [];
      for (i = 0; i < 16; i++) {
        w[i] = words[chunk + i] || 0;
      }
      for (i = 16; i < 64; i++) {
        const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }

      let [a, b, c, d, e, f, g, h] = hash;

      for (i = 0; i < 64; i++) {
        const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + s1 + ch + k[i] + w[i]) | 0;
        const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (s0 + maj) | 0;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) | 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) | 0;
      }

      hash[0] = (hash[0] + a) | 0;
      hash[1] = (hash[1] + b) | 0;
      hash[2] = (hash[2] + c) | 0;
      hash[3] = (hash[3] + d) | 0;
      hash[4] = (hash[4] + e) | 0;
      hash[5] = (hash[5] + f) | 0;
      hash[6] = (hash[6] + g) | 0;
      hash[7] = (hash[7] + h) | 0;
    }

    for (i = 0; i < 8; i++) {
      for (j = 3; j >= 0; j--) {
        const b = (hash[i] >> (8 * j)) & 255;
        result += (b < 16 ? '0' : '') + b.toString(16);
      }
    }

    return result;
  }

  generateSecureRandomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return bytes;
  }

  /**
   * Sobrescreve buffers de memória com zeros para mitigar vazamentos de dados confidenciais
   */
  secureWipeBuffer(buffer: Uint8Array): void {
    if (buffer && buffer.length > 0) {
      buffer.fill(0);
    }
  }

  generateUuid(): string {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
    const bytes = this.generateSecureRandomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant RFC4122
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }
}

export const cryptoAdapter = new StandardCryptoAdapter();
