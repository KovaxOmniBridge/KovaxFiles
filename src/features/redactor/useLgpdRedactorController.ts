/**
 * KovaxFiles Desktop — Feature: LGPD Redactor Controller
 * Desacopla o gerenciamento de regras de anonimização, detecção de padrões
 * e aprovação humana de tarjamento do componente visual.
 */

import { useState, useCallback, useRef } from 'react';
import { CoreRedactionEngine, RedactionMatch } from '../../core/redaction/redactionCore';
import {
  OperationStatus,
  OperationProgress,
  CancellationTokenSource
} from '../../shared/contracts/operation.types';

export interface RedactorState {
  status: OperationStatus;
  progress: OperationProgress | null;
  detectedMatches: RedactionMatch[];
  selectedMatchIds: Set<string>;
  isScanning: boolean;
}

export function useLgpdRedactorController() {
  const [state, setState] = useState<RedactorState>({
    status: 'pending',
    progress: null,
    detectedMatches: [],
    selectedMatchIds: new Set(),
    isScanning: false
  });

  const cancelSourceRef = useRef<CancellationTokenSource | null>(null);

  const toggleMatchSelection = useCallback((matchId: string) => {
    setState(prev => {
      const nextSet = new Set(prev.selectedMatchIds);
      if (nextSet.has(matchId)) {
        nextSet.delete(matchId);
      } else {
        nextSet.add(matchId);
      }
      return { ...prev, selectedMatchIds: nextSet };
    });
  }, []);

  const selectAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedMatchIds: new Set(prev.detectedMatches.map(m => m.id))
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedMatchIds: new Set()
    }));
  }, []);

  const scanText = useCallback((text: string) => {
    const cancelSource = new CancellationTokenSource();
    cancelSourceRef.current = cancelSource;

    setState(prev => ({
      ...prev,
      status: 'processing',
      isScanning: true,
      progress: {
        stage: 'Executando varredura determinística LGPD',
        current: 50,
        total: 100,
        percentage: 50
      }
    }));

    try {
      const matches = CoreRedactionEngine.scanText(text, undefined, cancelSource.token);
      const allIds = new Set(matches.map(m => m.id));

      setState(prev => ({
        ...prev,
        status: 'completed',
        isScanning: false,
        detectedMatches: matches,
        selectedMatchIds: allIds,
        progress: {
          stage: 'Varredura concluída',
          current: 100,
          total: 100,
          percentage: 100,
          message: `${matches.length} ocorrências identificadas para revisão.`
        }
      }));

      return matches;
    } catch (err) {
      setState(prev => ({
        ...prev,
        status: cancelSource.isCancelled ? 'canceled' : 'failed',
        isScanning: false
      }));
      throw err;
    } finally {
      cancelSourceRef.current = null;
    }
  }, []);

  const cancelScan = useCallback(() => {
    if (cancelSourceRef.current) {
      cancelSourceRef.current.cancel('Varredura cancelada.');
    }
  }, []);

  return {
    state,
    toggleMatchSelection,
    selectAll,
    clearSelection,
    scanText,
    cancelScan
  };
}
