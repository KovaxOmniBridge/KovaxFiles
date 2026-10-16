/**
 * KovaxFiles Desktop — Core Document Factory & Lifecycle
 * Cria e valida documentos com identificador imutável, integridade verificada por SHA-256
 * e metadados estruturados de domínio.
 */

import { DocumentId, createDocumentId, DocumentMetadata, DocumentPayload } from '../../shared/contracts/document.types';
import { validateFileBuffer } from '../../shared/validation/validator';
import { cryptoAdapter } from '../../infrastructure/crypto/cryptoAdapter';
import { pdfEngineAdapter } from '../../infrastructure/pdf/pdfEngineAdapter';

export interface CreateDocumentInput {
  name: string;
  bytes: Uint8Array | ArrayBuffer;
  mimeType?: string;
  customMetadata?: Record<string, unknown>;
}

export class CoreDocumentFactory {
  /**
   * Cria um documento imutável com garantia de integridade criptográfica
   */
  static async createDocument(input: CreateDocumentInput): Promise<DocumentPayload> {
    const content = input.bytes instanceof Uint8Array ? input.bytes : new Uint8Array(input.bytes);

    // 1. Validação estrutural do buffer
    const { detectedType } = validateFileBuffer(content, input.name);

    // 2. Cálculo do hash SHA-256 da carga
    const sha256 = await cryptoAdapter.computeSha256(content);

    // 3. Obtenção do ID imutável baseado no hash
    const id: DocumentId = createDocumentId('doc', sha256);

    // 4. Se for PDF, inspecionar contagem de páginas
    let pageCount: number | undefined;
    if (detectedType === 'pdf') {
      try {
        pageCount = await pdfEngineAdapter.getPageCount(content);
      } catch {
        // Ignora erro de contagem para não impedir criação se for PDF complexo
      }
    }

    const now = new Date();
    const metadata: DocumentMetadata = Object.freeze({
      id,
      name: input.name,
      sizeBytes: content.length,
      mimeType: input.mimeType || (detectedType === 'pdf' ? 'application/pdf' : 'application/octet-stream'),
      sha256,
      createdAt: now,
      modifiedAt: now,
      pageCount,
      customMetadata: input.customMetadata ? Object.freeze({ ...input.customMetadata }) : undefined
    });

    return Object.freeze({
      metadata,
      content
    });
  }

  /**
   * Verifica se o conteúdo do documento não sofreu adulteração comparando com seu hash registrado
   */
  static async verifyIntegrity(payload: DocumentPayload): Promise<boolean> {
    const currentHash = await cryptoAdapter.computeSha256(payload.content);
    return currentHash.toLowerCase() === payload.metadata.sha256.toLowerCase();
  }
}
