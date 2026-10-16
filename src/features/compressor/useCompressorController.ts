/**
 * KovaxFiles Desktop — Feature: PDF Compressor Controller
 * Desacopla o gerenciamento de estado e ciclo de vida de compressão do componente visual.
 */

import { useState, useCallback, useRef } from 'react';
import {
  CoreCompressionService,
  CompressDocumentInput,
  CompressDocumentOutput,
  CompressionProfile
} from '../../core/compression/compressionService';
import {
  OperationStatus,
  OperationProgress,
  CancellationTokenSource,
  BatchOperationResult
} from '../../shared/contracts/operation.types';

export interface CompressorState {
  status: OperationStatus;
  progress: OperationProgress | null;
  batchResult: BatchOperationResult<CompressDocumentInput, CompressDocumentOutput> | null;
  profile: CompressionProfile;
  isProcessing: boolean;
}

export function useCompressorController() {
  const [state, setState] = useState<CompressorState>({
    status: 'pending',
    progress: null,
    batchResult: null,
    profile: 'balanced',
    isProcessing: false
  });

  const cancelSourceRef = useRef<CancellationTokenSource | null>(null);

  const setProfile = useCallback((profile: CompressionProfile) => {
    setState(prev => ({ ...prev, profile }));
  }, []);

  const cancelOperation = useCallback(() => {
    if (cancelSourceRef.current) {
      cancelSourceRef.current.cancel('Operação de compressão cancelada pelo usuário.');
    }
  }, []);

  const executeBatch = useCallback(async (items: CompressDocumentInput[]) => {
    const cancelSource = new CancellationTokenSource();
    cancelSourceRef.current = cancelSource;

    setState(prev => ({
      ...prev,
      status: 'processing',
      isProcessing: true,
      batchResult: null,
      progress: {
        stage: 'Iniciando lote de compressão',
        current: 0,
        total: items.length,
        percentage: 0
      }
    }));

    try {
      const result = await CoreCompressionService.compressBatch(
        items,
        (progress) => {
          setState(prev => ({ ...prev, progress }));
        },
        cancelSource.token
      );

      setState(prev => ({
        ...prev,
        status: result.status,
        batchResult: result,
        isProcessing: false
      }));

      return result;
    } catch (err: any) {
      const isCancelled = cancelSource.isCancelled;
      setState(prev => ({
        ...prev,
        status: isCancelled ? 'canceled' : 'failed',
        isProcessing: false
      }));
      throw err;
    } finally {
      cancelSourceRef.current = null;
    }
  }, []);

  return {
    state,
    setProfile,
    executeBatch,
    cancelOperation
  };
}
