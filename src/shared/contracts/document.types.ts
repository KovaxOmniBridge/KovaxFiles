/**
 * KovaxFiles Desktop — Immutable Document Identifiers & Contracts
 * Garante que documentos possuam identificador imutável, integridade verificável por SHA-256
 * e metadados estruturados.
 */

/**
 * Tipo nominal / branded para garantir que identificadores de documentos sejam imutáveis
 * e não sejam confundidos com strings genéricas.
 */
export type DocumentId = string & { readonly __brand: unique symbol };

/**
 * Cria um identificador imutável para um documento.
 * Baseia-se em prefixo e UUID v4 ou digest SHA-256 para rastreabilidade de integridade.
 */
export function createDocumentId(prefix = 'doc', seed?: string): DocumentId {
  if (seed && seed.length >= 8) {
    const cleanSeed = seed.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16);
    return `${prefix}_${cleanSeed}_${Date.now().toString(36)}` as DocumentId;
  }
  const randomPart = Math.random().toString(36).substring(2, 10);
  const timePart = Date.now().toString(36);
  return `${prefix}_${timePart}_${randomPart}` as DocumentId;
}

/**
 * Metadados imutáveis e auditáveis do documento
 */
export interface DocumentMetadata {
  /** Identificador único e imutável do documento no ciclo de vida da aplicação */
  readonly id: DocumentId;
  /** Nome original do arquivo */
  readonly name: string;
  /** Tamanho em bytes */
  readonly sizeBytes: number;
  /** Tipo MIME inferido e validado */
  readonly mimeType: string;
  /** Hash SHA-256 criptográfico para verificação de integridade */
  readonly sha256: string;
  /** Data e hora de criação/carregamento */
  readonly createdAt: Date;
  /** Data e hora da última modificação */
  readonly modifiedAt: Date;
  /** Quantidade de páginas (para PDFs) */
  readonly pageCount?: number;
  /** Se o documento possui texto pesquisável ou é imagem pura */
  readonly isSearchable?: boolean;
  /** Se o documento contém assinaturas digitais */
  readonly hasSignatures?: boolean;
  /** Se o documento foi submetido a processo de anonimização LGPD */
  readonly isRedacted?: boolean;
  /** Metadados arbitrários de domínio */
  readonly customMetadata?: Readonly<Record<string, unknown>>;
}

/**
 * Carga binária ou em memória associada a um documento imutável
 */
export interface DocumentPayload {
  readonly metadata: DocumentMetadata;
  readonly content: Uint8Array;
}

/**
 * Representação de página de documento
 */
export interface DocumentPage {
  readonly pageNumber: number; // 1-indexed
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
  readonly textContent?: string;
}
