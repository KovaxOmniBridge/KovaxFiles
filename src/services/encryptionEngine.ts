import { encryptPDF, EncryptPDFOptions, AlreadyEncryptedError } from '@pdfsmaller/pdf-encrypt';
import { decryptPDF, isEncrypted } from '@pdfsmaller/pdf-decrypt';
import { PDFDocument } from 'pdf-lib';

export interface PdfEncryptionOptions {
  userPassword?: string;
  ownerPassword?: string;
  algorithm?: 'AES-256' | 'RC4';
  allowPrinting?: boolean;
  allowModifying?: boolean;
  allowCopying?: boolean;
  allowAnnotating?: boolean;
  allowFillingForms?: boolean;
}

export interface EncryptionResult {
  fileName: string;
  data: Uint8Array;
  mode: 'pdf_password' | 'vault_aes256';
  sha256Hash: string;
}

/**
 * Obtém a interface Crypto nativa em qualquer ambiente (Browser, Electron Renderer ou Node.js)
 */
function getCrypto(): Crypto {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  throw new Error('API Web Crypto não disponível no ambiente de execução.');
}

export class EncryptionEngine {
  /**
   * Criptografa um PDF aplicando proteção por senha real em conformidade com o padrão ISO 32000 (AES-256 ou RC4).
   * 
   * IMPORTANTE: A biblioteca pdf-lib não oferece suporte nativo a criptografia de PDFs.
   * Este método utiliza o motor especializado de criptografia padrão PDF (@pdfsmaller/pdf-encrypt),
   * garantindo que o documento seja de fato protegido criptograficamente com AES-256 (V=5, R=6)
   * e que leitores oficiais (Adobe Acrobat, Foxit, Navegadores Web, Tribunais) exijam a senha para abertura.
   * 
   * @throws Error se nenhuma senha for informada ou se o documento já estiver criptografado
   */
  static async encryptPdf(
    pdfBuffer: ArrayBuffer | Uint8Array,
    options: PdfEncryptionOptions
  ): Promise<Uint8Array> {
    const rawBytes = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);

    const userPassword = (options.userPassword ?? '').trim();
    const ownerPassword = (options.ownerPassword ?? '').trim();

    if (!userPassword && !ownerPassword) {
      throw new Error('Para proteger o PDF, forneça ao menos uma Senha de Abertura (Leitura) ou Senha de Proprietário.');
    }

    // Verificar se o documento já possui criptografia pré-existente
    const currentStatus = await isEncrypted(rawBytes);
    if (currentStatus.encrypted) {
      throw new Error('O documento já está criptografado por senha. Remova a proteção anterior antes de aplicar uma nova senha.');
    }

    const effectiveUserPassword = userPassword;
    const effectiveOwnerPassword = ownerPassword || userPassword;

    try {
      const encryptedBytes = await encryptPDF(rawBytes, effectiveUserPassword, {
        ownerPassword: effectiveOwnerPassword !== effectiveUserPassword ? effectiveOwnerPassword : effectiveUserPassword,
        algorithm: options.algorithm || 'AES-256',
        allowPrinting: options.allowPrinting ?? true,
        allowModifying: options.allowModifying ?? false,
        allowCopying: options.allowCopying ?? false,
        allowAnnotating: options.allowAnnotating ?? false,
        allowFillingForms: options.allowFillingForms ?? options.allowAnnotating ?? false,
      });

      // Validação pós-criptografia obrigatória (garantia de integridade contra bypass silencioso)
      const verifyStatus = await isEncrypted(encryptedBytes);
      if (!verifyStatus.encrypted) {
        throw new Error('Falha crítica de segurança: o documento final não foi devidamente criptografado.');
      }

      return encryptedBytes;
    } catch (err: any) {
      if (err instanceof AlreadyEncryptedError) {
        throw new Error('O documento PDF já possui criptografia ativa.');
      }
      throw new Error(`Falha ao criptografar PDF com senha: ${err?.message || String(err)}`);
    }
  }

  /**
   * Descriptografa um PDF protegido por senha (remove a proteção por senha tornando-o aberto)
   */
  static async decryptPdf(
    pdfBuffer: ArrayBuffer | Uint8Array,
    password: string
  ): Promise<Uint8Array> {
    const rawBytes = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);

    if (!password) {
      throw new Error('Digite a senha para remover a proteção do documento PDF.');
    }

    const currentStatus = await isEncrypted(rawBytes);
    if (!currentStatus.encrypted) {
      // Documento já não possui senha, retorna cópia íntegra
      return rawBytes;
    }

    try {
      const decryptedBytes = await decryptPDF(rawBytes, password);
      return decryptedBytes;
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('incorrect') || msg.includes('Senha')) {
        throw new Error('Senha incorreta para abrir este documento PDF.');
      }
      throw new Error(`Falha ao remover a proteção por senha do PDF: ${msg}`);
    }
  }

  /**
   * Verifica se um PDF está protegido por criptografia e identifica o algoritmo utilizado
   */
  static async isPdfEncrypted(
    pdfBuffer: ArrayBuffer | Uint8Array
  ): Promise<{
    encrypted: boolean;
    algorithm?: 'AES-256' | 'RC4';
    version?: number;
    revision?: number;
    keyLength?: number;
  }> {
    const rawBytes = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
    return await isEncrypted(rawBytes);
  }

  /**
   * Criptografia forte AES-GCM 256 bits com PBKDF2 para qualquer tipo de arquivo (PDF, DOCX, TXT, etc.)
   */
  static async encryptFileAesGcm(
    fileBuffer: ArrayBuffer | Uint8Array,
    password: string
  ): Promise<Uint8Array> {
    if (!password) {
      throw new Error('Digite uma senha forte para criptografar o arquivo no Cofre AES-256.');
    }

    const crypto = getCrypto();
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const rawBuffer = fileBuffer instanceof Uint8Array ? fileBuffer.buffer : fileBuffer;
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      rawBuffer as ArrayBuffer
    );

    const magic = enc.encode('KVX1');
    const result = new Uint8Array(magic.length + salt.length + iv.length + ciphertext.byteLength);
    result.set(magic, 0);
    result.set(salt, magic.length);
    result.set(iv, magic.length + salt.length);
    result.set(new Uint8Array(ciphertext), magic.length + salt.length + iv.length);

    return result;
  }

  /**
   * Descriptografa um arquivo criptografado com AES-GCM 256 bits (Cofre Forte)
   */
  static async decryptFileAesGcm(
    encryptedBuffer: ArrayBuffer | Uint8Array,
    password: string
  ): Promise<Uint8Array> {
    if (!password) {
      throw new Error('Digite a senha de desbloqueio do Cofre AES-256.');
    }

    const bytes = new Uint8Array(encryptedBuffer);
    const enc = new TextEncoder();
    const dec = new TextDecoder();

    if (bytes.length < 32) {
      throw new Error('Arquivo corrompido ou formato de cofre inválido.');
    }

    const magic = dec.decode(bytes.slice(0, 4));
    if (magic !== 'KVX1') {
      throw new Error('O arquivo selecionado não possui a assinatura de criptografia Kovax AES-256 válida.');
    }

    const salt = bytes.slice(4, 20);
    const iv = bytes.slice(20, 32);
    const ciphertext = bytes.slice(32);

    const crypto = getCrypto();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext.buffer as ArrayBuffer
      );
      return new Uint8Array(decrypted);
    } catch {
      throw new Error('Senha de descriptografia incorreta ou dados corrompidos.');
    }
  }

  /**
   * Gera o hash SHA-256 de um buffer para auditoria de integridade
   */
  static async computeSha256(buffer: ArrayBuffer | Uint8Array): Promise<string> {
    const crypto = getCrypto();
    const rawBuffer = buffer instanceof Uint8Array ? buffer.buffer : buffer;
    const hashBuffer = await crypto.subtle.digest('SHA-256', rawBuffer as ArrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
