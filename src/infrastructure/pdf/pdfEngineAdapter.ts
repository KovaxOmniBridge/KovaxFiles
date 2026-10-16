/**
 * KovaxFiles Desktop — Decoupled PDF Infrastructure Adapter
 * Fornece operações de baixo nível de manipulação de PDF via pdf-lib,
 * sem acoplamento a estados de componentes React ou interfaces de usuário.
 */

import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { DocumentProcessingError, ValidationError } from '../../shared/errors/kovaxErrors';

export interface IPdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  producer?: string;
  creator?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount: number;
}

export interface IPdfEngineAdapter {
  loadDocument(bytes: Uint8Array): Promise<PDFDocument>;
  saveDocument(doc: PDFDocument): Promise<Uint8Array>;
  getPageCount(bytes: Uint8Array): Promise<number>;
  getMetadata(bytes: Uint8Array): Promise<IPdfMetadata>;
  splitPages(bytes: Uint8Array, pageRanges: number[][]): Promise<Uint8Array[]>;
  mergeDocuments(pdfList: Uint8Array[]): Promise<Uint8Array>;
}

export class StandardPdfEngineAdapter implements IPdfEngineAdapter {
  async loadDocument(bytes: Uint8Array): Promise<PDFDocument> {
    try {
      if (!bytes || bytes.length === 0) {
        throw new ValidationError('O buffer fornecido para carregar o PDF está vazio.');
      }
      return await PDFDocument.load(bytes, { ignoreEncryption: true });
    } catch (err: any) {
      if (err instanceof ValidationError) throw err;
      throw new DocumentProcessingError(`Falha ao decodificar estrutura do PDF: ${err.message}`, 'ERR_PDF_PARSE_FAILED', {
        error: err
      });
    }
  }

  async saveDocument(doc: PDFDocument): Promise<Uint8Array> {
    try {
      return await doc.save({ useObjectStreams: true });
    } catch (err: any) {
      throw new DocumentProcessingError(`Falha ao serializar documento PDF: ${err.message}`, 'ERR_PDF_SAVE_FAILED', {
        error: err
      });
    }
  }

  async getPageCount(bytes: Uint8Array): Promise<number> {
    const doc = await this.loadDocument(bytes);
    return doc.getPageCount();
  }

  async getMetadata(bytes: Uint8Array): Promise<IPdfMetadata> {
    const doc = await this.loadDocument(bytes);
    return {
      title: doc.getTitle(),
      author: doc.getAuthor(),
      subject: doc.getSubject(),
      keywords: doc.getKeywords()?.split(/[,;]/).map(k => k.trim()).filter(Boolean),
      producer: doc.getProducer(),
      creator: doc.getCreator(),
      creationDate: doc.getCreationDate(),
      modificationDate: doc.getModificationDate(),
      pageCount: doc.getPageCount()
    };
  }

  async splitPages(bytes: Uint8Array, pageRanges: number[][]): Promise<Uint8Array[]> {
    const sourceDoc = await this.loadDocument(bytes);
    const totalPages = sourceDoc.getPageCount();
    const results: Uint8Array[] = [];

    for (const range of pageRanges) {
      const validIndices = range
        .map(p => p - 1) // Converter 1-based para 0-based
        .filter(idx => idx >= 0 && idx < totalPages);

      if (validIndices.length === 0) continue;

      const subDoc = await PDFDocument.create();
      const copiedPages = await subDoc.copyPages(sourceDoc, validIndices);
      copiedPages.forEach(page => subDoc.addPage(page));
      const subBytes = await subDoc.save({ useObjectStreams: true });
      results.push(subBytes);
    }

    return results;
  }

  async mergeDocuments(pdfList: Uint8Array[]): Promise<Uint8Array> {
    if (pdfList.length === 0) {
      throw new ValidationError('A lista de PDFs para mesclagem está vazia.');
    }

    const mergedDoc = await PDFDocument.create();

    for (let i = 0; i < pdfList.length; i++) {
      const doc = await this.loadDocument(pdfList[i]);
      const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
      copiedPages.forEach(page => mergedDoc.addPage(page));
    }

    return await mergedDoc.save({ useObjectStreams: true });
  }
}

export const pdfEngineAdapter = new StandardPdfEngineAdapter();
