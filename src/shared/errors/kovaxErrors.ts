/**
 * KovaxFiles Desktop — Domain Error Hierarchy & Categorization
 * Centraliza e categoriza erros operacionais, de validação, segurança, criptografia e I/O.
 */

export type ErrorCategory =
  | 'VALIDATION'          // Entrada malformada, parâmetros fora dos limites
  | 'SECURITY'            // Violações de sandbox, path traversal, injection
  | 'CRYPTO'              // Falha em assinatura digital, certificado inválido, hash divergente
  | 'IO'                  // Falha de leitura/escrita, arquivo bloqueado, sem permissão
  | 'CANCELLATION'        // Abortado voluntariamente pelo usuário
  | 'DOCUMENT_PROCESSING' // Erro interno do pdf-lib, tesseract, conversão
  | 'NETWORK'             // Falha de requisição (quando aplicável)
  | 'UNKNOWN';            // Erro não tratado

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';

export interface ErrorDetails {
  [key: string]: unknown;
}

/**
 * Classe base para todos os erros tipados do ecossistema KovaxFiles
 */
export class KovaxError extends Error {
  readonly code: string;
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly details?: ErrorDetails;
  readonly isOperational: boolean;
  readonly timestamp: Date;

  constructor(options: {
    code: string;
    message: string;
    category: ErrorCategory;
    severity?: ErrorSeverity;
    details?: ErrorDetails;
    isOperational?: boolean;
    cause?: unknown;
  }) {
    super(options.message);
    this.name = 'KovaxError';
    this.code = options.code;
    this.category = options.category;
    this.severity = options.severity || 'error';
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
    this.timestamp = new Date();

    if (options.cause) {
      (this as any).cause = options.cause;
    }

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      details: this.details,
      isOperational: this.isOperational,
      timestamp: this.timestamp.toISOString()
    };
  }
}

/**
 * Erro de validação de parâmetros ou dados de entrada
 */
export class ValidationError extends KovaxError {
  constructor(message: string, details?: ErrorDetails) {
    super({
      code: 'ERR_VALIDATION',
      message,
      category: 'VALIDATION',
      severity: 'error',
      details,
      isOperational: true
    });
    this.name = 'ValidationError';
  }
}

/**
 * Erro de segurança (tentativas de escape de diretório, injeção de script, violação de sandbox)
 */
export class SecurityViolationError extends KovaxError {
  constructor(message: string, details?: ErrorDetails) {
    super({
      code: 'ERR_SECURITY_VIOLATION',
      message,
      category: 'SECURITY',
      severity: 'fatal',
      details,
      isOperational: true
    });
    this.name = 'SecurityViolationError';
  }
}

/**
 * Erro criptográfico (certificados vencidos, assinaturas inválidas, divergência de hash)
 */
export class CryptoOperationError extends KovaxError {
  constructor(message: string, code = 'ERR_CRYPTO', details?: ErrorDetails) {
    super({
      code,
      message,
      category: 'CRYPTO',
      severity: 'error',
      details,
      isOperational: true
    });
    this.name = 'CryptoOperationError';
  }
}

/**
 * Erro de I/O de arquivos e armazenamento
 */
export class FileSystemError extends KovaxError {
  constructor(message: string, code = 'ERR_FS_IO', details?: ErrorDetails) {
    super({
      code,
      message,
      category: 'IO',
      severity: 'error',
      details,
      isOperational: true
    });
    this.name = 'FileSystemError';
  }
}

/**
 * Erro de processamento de documentos (PDF malformado, OCR falho, compressão com parâmetros inválidos)
 */
export class DocumentProcessingError extends KovaxError {
  constructor(message: string, code = 'ERR_DOC_PROCESSING', details?: ErrorDetails) {
    super({
      code,
      message,
      category: 'DOCUMENT_PROCESSING',
      severity: 'error',
      details,
      isOperational: true
    });
    this.name = 'DocumentProcessingError';
  }
}

/**
 * Erro específico para cancelamento de operação
 */
export class OperationCancelledError extends KovaxError {
  constructor(reason = 'Operação cancelada pelo usuário.', details?: ErrorDetails) {
    super({
      code: 'ERR_OPERATION_CANCELLED',
      message: reason,
      category: 'CANCELLATION',
      severity: 'info',
      details,
      isOperational: true
    });
    this.name = 'OperationCancelledError';
  }
}

/**
 * Erro para processamento em lote parcial ou falho
 */
export class BatchProcessingError extends KovaxError {
  readonly succeededCount: number;
  readonly failedCount: number;
  readonly totalCount: number;

  constructor(options: {
    message: string;
    succeededCount: number;
    failedCount: number;
    totalCount: number;
    details?: ErrorDetails;
  }) {
    super({
      code: 'ERR_BATCH_PROCESSING_FAILED',
      message: options.message,
      category: 'DOCUMENT_PROCESSING',
      severity: options.succeededCount > 0 ? 'warning' : 'error',
      details: {
        ...options.details,
        succeededCount: options.succeededCount,
        failedCount: options.failedCount,
        totalCount: options.totalCount
      },
      isOperational: true
    });
    this.name = 'BatchProcessingError';
    this.succeededCount = options.succeededCount;
    this.failedCount = options.failedCount;
    this.totalCount = options.totalCount;
  }
}

/**
 * Helper para garantir que qualquer erro capturado seja convertido em KovaxError
 */
export function ensureKovaxError(error: unknown, fallbackCategory: ErrorCategory = 'UNKNOWN'): KovaxError {
  if (error instanceof KovaxError) {
    return error;
  }

  if (error instanceof Error) {
    if (error.name === 'OperationCancelledException' || error.message.includes('cancelad')) {
      return new OperationCancelledError(error.message);
    }
    return new KovaxError({
      code: 'ERR_UNEXPECTED',
      message: error.message,
      category: fallbackCategory,
      details: { originalName: error.name, stack: error.stack },
      cause: error
    });
  }

  return new KovaxError({
    code: 'ERR_UNKNOWN_PRIMITIVE',
    message: typeof error === 'string' ? error : 'Erro desconhecido capturado no sistema.',
    category: fallbackCategory,
    details: { rawValue: String(error) }
  });
}
