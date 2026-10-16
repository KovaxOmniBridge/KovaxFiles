/**
 * KovaxFiles Desktop — Feature: Legal Search Controller
 * Desacopla a busca jurídica, filtros de jurisdição e auditoria de proveniência do componente visual.
 */

import { useState, useCallback } from 'react';
import { CoreLegalCorpusService, LegalArticle, ProvenanceChain } from '../../core/legal-corpus/legalCorpusCore';

export interface LegalSearchState {
  query: string;
  results: LegalArticle[];
  selectedArticle: LegalArticle | null;
  provenance: ProvenanceChain | null;
  isSearching: boolean;
  copiedCitation: string | null;
}

export function useLegalSearchController() {
  const [state, setState] = useState<LegalSearchState>({
    query: '',
    results: [],
    selectedArticle: null,
    provenance: null,
    isSearching: false,
    copiedCitation: null
  });

  const search = useCallback((query: string) => {
    setState(prev => ({ ...prev, query, isSearching: true }));
    try {
      const results = CoreLegalCorpusService.search(query);
      setState(prev => ({
        ...prev,
        results,
        isSearching: false
      }));
    } catch {
      setState(prev => ({ ...prev, results: [], isSearching: false }));
    }
  }, []);

  const selectArticle = useCallback((article: LegalArticle | null) => {
    if (!article) {
      setState(prev => ({ ...prev, selectedArticle: null, provenance: null }));
      return;
    }

    const audit = CoreLegalCorpusService.auditArticle(article);
    setState(prev => ({
      ...prev,
      selectedArticle: article,
      provenance: audit.data || article.provenance || null
    }));
  }, []);

  const copyDefensibleCitation = useCallback(async (article: LegalArticle) => {
    const citation = CoreLegalCorpusService.getDefensibleCitation(article);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(citation);
    }
    setState(prev => ({ ...prev, copiedCitation: article.id }));
    setTimeout(() => {
      setState(prev => ({ ...prev, copiedCitation: null }));
    }, 2000);
    return citation;
  }, []);

  return {
    state,
    search,
    selectArticle,
    copyDefensibleCitation
  };
}
