/**
 * KovaxFiles Desktop — Shared Validation Contracts & Rules
 * Regras de validação estritas para integridade de arquivos, CNJ, URLs e assinaturas de formato.
 */

import { ValidationError, SecurityViolationError } from '../errors/kovaxErrors';

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedExtensions?: string[];
  enforceMagicBytes?: boolean;
}

export const DEFAULT_MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

/**
 * Assinaturas mágicas de arquivos permitidos
 */
export const MAGIC_BYTES = {
  PDF: [0x25, 0x50, 0x44, 0x46, 0x2D], // %PDF-
  PNG: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  JPEG: [0xFF, 0xD8, 0xFF],
  TIFF_LE: [0x49, 0x49, 0x2A, 0x00],
  TIFF_BE: [0x4D, 0x4D, 0x00, 0x2A],
  ZIP: [0x50, 0x4B, 0x03, 0x04] // DOCX, XLSX, ODT
};

/**
 * Validação rigorosa de buffer binário contra tamanho e assinatura mágica
 */
export function validateFileBuffer(
  buffer: Uint8Array | ArrayBuffer,
  fileName: string,
  options: FileValidationOptions = {}
): { isValid: boolean; detectedType: string } {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const maxBytes = options.maxSizeBytes || DEFAULT_MAX_FILE_SIZE;

  if (bytes.length === 0) {
    throw new ValidationError(`O arquivo "${fileName}" está vazio (0 bytes).`);
  }

  if (bytes.length > maxBytes) {
    throw new ValidationError(
      `O arquivo "${fileName}" (${(bytes.length / (1024 * 1024)).toFixed(2)} MB) excede o limite máximo permitido de ${(maxBytes / (1024 * 1024)).toFixed(0)} MB.`
    );
  }

  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (options.allowedExtensions && options.allowedExtensions.length > 0) {
    const isAllowed = options.allowedExtensions.map(e => e.toLowerCase().replace(/^\./, '')).includes(ext);
    if (!isAllowed) {
      throw new ValidationError(
        `A extensão ".${ext}" do arquivo "${fileName}" não é permitida. Extensões válidas: ${options.allowedExtensions.join(', ')}`
      );
    }
  }

  // Verificação de assinatura mágica
  let detectedType = 'unknown';

  if (matchesMagic(bytes, MAGIC_BYTES.PDF)) {
    detectedType = 'pdf';
  } else if (matchesMagic(bytes, MAGIC_BYTES.PNG)) {
    detectedType = 'png';
  } else if (matchesMagic(bytes, MAGIC_BYTES.JPEG)) {
    detectedType = 'jpeg';
  } else if (matchesMagic(bytes, MAGIC_BYTES.TIFF_LE) || matchesMagic(bytes, MAGIC_BYTES.TIFF_BE)) {
    detectedType = 'tiff';
  } else if (matchesMagic(bytes, MAGIC_BYTES.ZIP)) {
    detectedType = 'zip/ooxml';
  }

  if (options.enforceMagicBytes && ext === 'pdf' && detectedType !== 'pdf') {
    throw new SecurityViolationError(
      `O arquivo "${fileName}" possui extensão .pdf, mas sua assinatura binária (Magic Bytes) não corresponde a um PDF válido.`
    );
  }

  return { isValid: true, detectedType };
}

function matchesMagic(bytes: Uint8Array, magic: number[]): boolean {
  if (bytes.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic[i]) return false;
  }
  return true;
}

/**
 * Validação do formato padrão CNJ (Resolução 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO
 */
export function validateCnjProcessNumber(processNumber: string): { isValid: boolean; normalized?: string; reason?: string } {
  const digits = processNumber.replace(/\D/g, '');
  if (digits.length !== 20) {
    return {
      isValid: false,
      reason: `Número do processo deve conter exatamente 20 dígitos numéricos (encontrados: ${digits.length}).`
    };
  }

  const normalized = `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;

  // Cálculo dos dígitos verificadores (Módulo 97 na base 100)
  const n = digits.slice(0, 7);
  const dd = digits.slice(7, 9);
  const aaaa = digits.slice(9, 13);
  const j = digits.slice(13, 14);
  const tr = digits.slice(14, 16);
  const oooo = digits.slice(16, 20);

  // Formato: NNNNNNN AAAA J TR OOOO 00
  const checkStr = `${n}${aaaa}${j}${tr}${oooo}00`;
  let remainder = 0;
  for (let i = 0; i < checkStr.length; i++) {
    remainder = (remainder * 10 + parseInt(checkStr[i], 10)) % 97;
  }
  const expectedDd = String(98 - remainder).padStart(2, '0');

  if (expectedDd !== dd) {
    return {
      isValid: false,
      reason: `Dígito verificador inválido: esperado "${expectedDd}", obtido "${dd}".`
    };
  }

  return { isValid: true, normalized };
}

/**
 * Validação rigorosa de domínio oficial contra ataques de substring e spoofing
 */
export function validateOfficialDomainUrl(urlStr: string): {
  isValid: boolean;
  isJudicial: boolean;
  isExecutive: boolean;
  isLegislative: boolean;
  hostname: string;
} {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { isValid: false, isJudicial: false, isExecutive: false, isLegislative: false, hostname: '' };
    }

    const host = parsed.hostname.toLowerCase();
    const isJudicial = host.endsWith('.jus.br');
    const isExecutive = host.endsWith('.gov.br');
    const isLegislative = host.endsWith('.leg.br');

    return {
      isValid: isJudicial || isExecutive || isLegislative,
      isJudicial,
      isExecutive,
      isLegislative,
      hostname: host
    };
  } catch {
    return { isValid: false, isJudicial: false, isExecutive: false, isLegislative: false, hostname: '' };
  }
}
