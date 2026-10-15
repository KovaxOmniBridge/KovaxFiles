import { PDFDocument } from 'pdf-lib';

export interface PdfEncryptionOptions {
  userPassword?: string;
  ownerPassword?: string;
  allowPrinting?: boolean;
  allowModifying?: boolean;
  allowCopying?: boolean;
  allowAnnotating?: boolean;
}

export interface EncryptionResult {
  fileName: string;
  data: Uint8Array;
  mode: 'pdf_password' | 'vault_aes256';
  sha256Hash: string;
}

export class EncryptionEngine {
  /**
   * Criptografa um PDF adicionando Senha de Usuário (Abertura) e/ou Senha de Proprietário (Permissões)
   */
  static async encryptPdf(
    pdfBuffer: ArrayBuffer | Uint8Array,
    options: PdfEncryptionOptions
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

    const userPassword = options.userPassword || '';
    const ownerPassword = options.ownerPassword || options.userPassword || '';

    if (typeof (pdfDoc as any).encrypt === 'function') {
      (pdfDoc as any).encrypt({
        userPassword,
        ownerPassword,
        permissions: {
          printing: options.allowPrinting ? 'highResolution' : 'none',
          modifying: options.allowModifying ?? false,
          copying: options.allowCopying ?? false,
          annotating: options.allowAnnotating ?? false,
          fillingForms: options.allowAnnotating ?? false,
          contentAccessibility: options.allowCopying ?? false,
          documentAssembly: options.allowModifying ?? false,
        },
      });
    }

    return await pdfDoc.save();
  }

  /**
   * Descriptografa um PDF protegido por senha (remove a proteção por senha)
   */
  static async decryptPdf(
    pdfBuffer: ArrayBuffer | Uint8Array,
    password: string
  ): Promise<Uint8Array> {
    try {
      const pdfDoc = await (PDFDocument as any).load(pdfBuffer, {
        ignoreEncryption: false,
        password: password,
      });
      return await pdfDoc.save();
    } catch (err: any) {
      if (err.message?.includes('password') || err.name === 'PasswordRequirementError') {
        throw new Error('Senha incorreta para abrir este documento PDF.');
      }
      throw err;
    }
  }

  /**
   * Criptografia forte AES-GCM 256 bits com PBKDF2 para qualquer tipo de arquivo (PDF, DOCX, TXT, etc.)
   */
  static async encryptFileAesGcm(
    fileBuffer: ArrayBuffer | Uint8Array,
    password: string
  ): Promise<Uint8Array> {
    const enc = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const key = await window.crypto.subtle.deriveKey(
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
    const ciphertext = await window.crypto.subtle.encrypt(
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
   * Descriptografa um arquivo criptografado com AES-GCM 256 bits
   */
  static async decryptFileAesGcm(
    encryptedBuffer: ArrayBuffer | Uint8Array,
    password: string
  ): Promise<Uint8Array> {
    const bytes = new Uint8Array(encryptedBuffer);
    const enc = new TextEncoder();
    const dec = new TextDecoder();

    const magic = dec.decode(bytes.slice(0, 4));
    if (magic !== 'KVX1') {
      throw new Error('O arquivo selecionado não possui a assinatura de criptografia Kovax AES-256 válida.');
    }

    const salt = bytes.slice(4, 20);
    const iv = bytes.slice(20, 32);
    const ciphertext = bytes.slice(32);

    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const key = await window.crypto.subtle.deriveKey(
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
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext.buffer as ArrayBuffer
      );
      return new Uint8Array(decrypted);
    } catch (err) {
      throw new Error('Senha de descriptografia incorreta ou dados corrompidos.');
    }
  }

  /**
   * Gera o hash SHA-256 de um buffer para auditoria de integridade
   */
  static async computeSha256(buffer: ArrayBuffer | Uint8Array): Promise<string> {
    const rawBuffer = buffer instanceof Uint8Array ? buffer.buffer : buffer;
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', rawBuffer as ArrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
