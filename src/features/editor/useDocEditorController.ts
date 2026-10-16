/**
 * KovaxFiles Desktop — Feature: Document Editor Controller
 * Desacopla ciclo de vida de documento, ID imutável, integridade SHA-256 e gravação segura.
 */

import { useState, useCallback } from 'react';
import { CoreDocumentFactory } from '../../core/documents/documentFactory';
import { DocumentPayload, DocumentId } from '../../shared/contracts/document.types';
import { fileSystemAdapter } from '../../infrastructure/filesystem/fileSystemAdapter';
import { OperationStatus } from '../../shared/contracts/operation.types';

export interface EditorDocumentState {
  currentDocument: DocumentPayload | null;
  status: OperationStatus;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
}

export function useDocEditorController() {
  const [state, setState] = useState<EditorDocumentState>({
    currentDocument: null,
    status: 'pending',
    isDirty: false,
    isSaving: false,
    lastSavedAt: null
  });

  const loadDocument = useCallback(async (name: string, bytes: Uint8Array | ArrayBuffer) => {
    setState(prev => ({ ...prev, status: 'processing' }));
    try {
      const docPayload = await CoreDocumentFactory.createDocument({
        name,
        bytes
      });

      setState({
        currentDocument: docPayload,
        status: 'completed',
        isDirty: false,
        isSaving: false,
        lastSavedAt: new Date()
      });

      return docPayload;
    } catch (err) {
      setState(prev => ({ ...prev, status: 'failed' }));
      throw err;
    }
  }, []);

  const saveDocument = useCallback(async (defaultName: string, updatedBytes?: Uint8Array) => {
    if (!state.currentDocument && !updatedBytes) {
      throw new Error('Nenhum documento ativo para salvar.');
    }

    setState(prev => ({ ...prev, isSaving: true }));
    const bytesToSave = updatedBytes || state.currentDocument!.content;

    try {
      const saveResult = await fileSystemAdapter.saveExportedFile(defaultName, bytesToSave);
      if (saveResult.success) {
        // Re-gerar payload imutável com novo hash SHA-256
        const updatedPayload = await CoreDocumentFactory.createDocument({
          name: defaultName,
          bytes: bytesToSave
        });

        setState(prev => ({
          ...prev,
          currentDocument: updatedPayload,
          isDirty: false,
          isSaving: false,
          lastSavedAt: new Date()
        }));
      } else {
        setState(prev => ({ ...prev, isSaving: false }));
      }
      return saveResult;
    } catch (err) {
      setState(prev => ({ ...prev, isSaving: false }));
      throw err;
    }
  }, [state.currentDocument]);

  return {
    state,
    loadDocument,
    saveDocument
  };
}
