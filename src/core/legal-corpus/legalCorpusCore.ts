/**
 * KovaxFiles Desktop — Core Legal Corpus & Provenance Architecture
 * Centraliza a busca, auditoria criptográfica, cadeia de proveniência (4 etapas)
 * e controle de versão temporal do acervo normativo e jurisprudencial.
 */

export * from '../../services/legalKnowledgeBaseService';
export * from '../../services/legalCorpusAuditorService';

import {
  LegalKnowledgeBaseService,
  LegalArticle,
  ProvenanceChain
} from '../../services/legalKnowledgeBaseService';
import {
  LegalCorpusAuditorService
} from '../../services/legalCorpusAuditorService';
import { OperationResult } from '../../shared/contracts/operation.types';
import { ensureKovaxError } from '../../shared/errors/kovaxErrors';

export class CoreLegalCorpusService {
  /**
   * Executa busca de dispositivos legais e jurisprudenciais com enriquecimento de proveniência
   */
  static search(query: string, options?: { sphere?: string; jurisdiction?: string }): LegalArticle[] {
    const rawResults = LegalKnowledgeBaseService.searchAllLaws(query, '', 30);
    return rawResults.map(art => {
      // Assegurar que todo dispositivo retorne com proveniência estruturada
      if (!art.provenance) {
        art.provenance = LegalCorpusAuditorService.buildProvenanceChain(art);
      }
      return art;
    });
  }

  /**
   * Audita a integridade e proveniência de um artigo ou enunciado específico
   */
  static auditArticle(article: LegalArticle): OperationResult<ProvenanceChain> {
    try {
      const auditResult = LegalCorpusAuditorService.verifyArticle(article);
      return {
        status: 'completed',
        isSuccess: !auditResult.isSuspended,
        data: auditResult.provenance,
        durationMs: 0
      };
    } catch (err) {
      return {
        status: 'failed',
        isSuccess: false,
        error: ensureKovaxError(err, 'VALIDATION'),
        durationMs: 0
      };
    }
  }

  /**
   * Cria nova versão imutável de dispositivo preservando o histórico e vigência temporal
   */
  static updateVersion(
    currentArticle: LegalArticle,
    newContent: string,
    modifyingAct: string,
    effectiveDate: string
  ): LegalArticle {
    return LegalCorpusAuditorService.createVersionUpdate(currentArticle, {
      newContent,
      modifyingAct,
      effectiveDate
    });
  }

  /**
   * Formata citação jurídica tecnicamente defensável em juízo
   */
  static getDefensibleCitation(article: LegalArticle): string {
    return LegalKnowledgeBaseService.formatCitation(article);
  }

  /**
   * Valida autoridade de domínio da URL oficial
   */
  static validateOfficialDomain(url: string) {
    return LegalCorpusAuditorService.validateOfficialDomain(url);
  }

  /**
   * Constrói cadeia de proveniência
   */
  static buildProvenanceChain(article: LegalArticle): ProvenanceChain {
    return LegalCorpusAuditorService.buildProvenanceChain(article);
  }
}
