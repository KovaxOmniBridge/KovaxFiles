/**
 * KovaxFiles Desktop — Feature: Court Filing Controller
 * Desacopla regras de seleção de tribunais, limites de MB e plano de particionamento.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  CoreCourtFilingService,
  CourtSystemConfig,
  FilingPreparationPlan,
  CourtFilingPiece,
  CourtFilingOptions
} from '../../core/court-filing/courtFilingService';
import { OperationStatus, OperationProgress } from '../../shared/contracts/operation.types';

export interface CourtFilingState {
  status: OperationStatus;
  selectedCourtId: string;
  plan: FilingPreparationPlan | null;
  progress: OperationProgress | null;
  isPreparing: boolean;
}

export function useCourtFilingController(initialCourtId = 'pje_geral') {
  const [state, setState] = useState<CourtFilingState>({
    status: 'pending',
    selectedCourtId: initialCourtId,
    plan: null,
    progress: null,
    isPreparing: false
  });

  const supportedCourts = useMemo(() => CoreCourtFilingService.getSupportedCourts(), []);

  const selectedCourtConfig = useMemo(() => {
    return CoreCourtFilingService.getCourtConfig(state.selectedCourtId);
  }, [state.selectedCourtId]);

  const selectCourt = useCallback((courtId: string) => {
    setState(prev => ({ ...prev, selectedCourtId: courtId, plan: null }));
  }, []);

  const prepareFiling = useCallback(async (
    pieces: CourtFilingPiece[],
    options: CourtFilingOptions
  ) => {
    setState(prev => ({
      ...prev,
      status: 'processing',
      isPreparing: true,
      progress: {
        stage: 'Iniciando fracionamento conforme limites do tribunal',
        current: 10,
        total: 100,
        percentage: 10
      }
    }));

    const result = await CoreCourtFilingService.prepareFiling(
      pieces,
      options,
      (progress) => setState(prev => ({ ...prev, progress }))
    );

    if (result.isSuccess && result.data) {
      setState(prev => ({
        ...prev,
        status: 'completed',
        isPreparing: false,
        plan: result.data!
      }));
      return result.data;
    } else {
      setState(prev => ({
        ...prev,
        status: result.status,
        isPreparing: false
      }));
      throw result.error || new Error('Falha ao gerar plano de peticionamento.');
    }
  }, []);

  return {
    state,
    supportedCourts,
    selectedCourtConfig,
    selectCourt,
    prepareFiling
  };
}
