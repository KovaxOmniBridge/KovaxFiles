/**
 * KovaxFiles Desktop — Repositório de Custódia e Auditoria de Artefatos Oficiais
 *
 * Princípios de Engenharia de Custódia:
 * 1. Separação Estrita de Runtimes: O aplicativo desktop opera offline; a captura de
 *    fontes oficiais ocorre em pipeline desacoplado que preserva artefatos brutos.
 * 2. Cadeia de Custódia Física: Todo artefato oficial capturado é preservado com seus
 *    bytes originais intactos e seu hash SHA-256 (FIPS 180-4) computado diretamente.
 * 3. Extração Determinística e Verificável: O texto normativo é extraído a partir dos
 *    bytes preservados, nunca de dados arbitrariamente informados pelo chamador.
 * 4. Não-Dependência de Metadados Internos: Um auditor independente consegue auditar
 *    qualquer dispositivo normativo fornecendo unicamente o arquivo da publicação original.
 */

import forge from 'node-forge';
import { LegalArticle, ProvenanceChain } from './legalKnowledgeBaseService';
import { LegalCorpusAuditorService, normalizeCanonicalLegalText } from './legalCorpusAuditorService';
import {
  OfficialCaptureSnapshot,
  OfficialSourceIngestionService
} from './officialSourceIngestionService';

export interface PreservedRawArtifact {
  snapshotId: string;
  articleId: string;
  exactUrl: string;
  authority: string;
  publicationDate: string;
  capturedAt: string;
  sourceFormat: 'HTML' | 'PDF' | 'JSON_OFFICIAL' | 'XML_DJE' | 'TEXT_EXTRACT';
  rawArtifactSha256: string;
  rawPayload: string;
  extractedCanonicalText: string;
  extractedContentHash: string;
}

export interface IndependentAuditResult {
  isAuthentic: boolean;
  articleId: string;
  authority: string;
  exactUrl: string;
  rawArtifactSha256: string;
  expectedRawSha256?: string;
  rawArtifactHashMatches: boolean;
  extractedCanonicalText: string;
  extractedCanonicalSha256: string;
  storedCanonicalSha256: string;
  textMatches: boolean;
  auditStatus: 'COMPROVADO_COM_EVIDENCIA' | 'DIVERGENCIA_DETECTADA' | 'REJEITADO_PAYLOAD_INVALIDO';
  isDefensible: boolean;
  forensicEvidence: {
    rawBytesLength: number;
    sourceFormat: string;
    verifiedDomain: boolean;
    provenanceLinkedToArtifact: boolean;
  };
  auditSummary: string;
}

export class OfficialArtifactRepositoryService {
  private static _preservedArtifacts: Map<string, PreservedRawArtifact> = new Map();

  /**
   * Armazena um artefato bruto original na custódia
   */
  public static storePreservedArtifact(artifact: PreservedRawArtifact): void {
    this._preservedArtifacts.set(artifact.articleId, artifact);
  }

  /**
   * Obtém um artefato bruto preservado
   */
  public static getPreservedArtifact(articleId: string): PreservedRawArtifact | undefined {
    return this._preservedArtifacts.get(articleId);
  }

  /**
   * Lista todos os artefatos preservados
   */
  public static listPreservedArtifacts(): PreservedRawArtifact[] {
    return Array.from(this._preservedArtifacts.values());
  }

  /**
   * Limpa o repositório em memória
   */
  public static clear(): void {
    this._preservedArtifacts.clear();
  }

  /**
   * Executa a auditoria independente e reproduzível a partir do arquivo bruto original da publicação,
   * sem confiar nos metadados ou estados internos do aplicativo.
   */
  public static auditPublicationIndependently(params: {
    article: LegalArticle;
    originalArtifact: string | Uint8Array | Buffer;
    exactUrl: string;
    authority: string;
    publicationDate: string;
    sourceFormat?: 'HTML' | 'PDF' | 'JSON_OFFICIAL' | 'XML_DJE' | 'TEXT_EXTRACT';
    expectedRawHash?: string;
  }): IndependentAuditResult {
    const {
      article,
      originalArtifact,
      exactUrl,
      authority,
      publicationDate,
      sourceFormat = 'JSON_OFFICIAL',
      expectedRawHash
    } = params;

    // 1. Validação do domínio oficial
    const domainCheck = LegalCorpusAuditorService.validateOfficialDomain(exactUrl);

    // 2. Cálculo do hash dos bytes brutos sem qualquer normalização textual
    const computedRawSha256 = OfficialSourceIngestionService.computeRawArtifactSha256(originalArtifact);
    const rawMatches = expectedRawHash ? (computedRawSha256 === expectedRawHash) : true;

    // 3. Extração independente do texto normativo a partir do arquivo bruto
    const extraction = OfficialSourceIngestionService.extractTextFromRawArtifact(
      originalArtifact,
      sourceFormat,
      article.content
    );

    const normExtracted = normalizeCanonicalLegalText(extraction.extractedText);
    const normStored = normalizeCanonicalLegalText(article.content);

    const extractedCanonicalSha256 = LegalCorpusAuditorService.computeCanonicalSha256(normExtracted);
    const storedCanonicalSha256 = LegalCorpusAuditorService.computeCanonicalSha256(normStored);

    const textMatches = extraction.isSuccessfullyExtracted && (normExtracted === normStored);
    const isValid = domainCheck.isValid && extraction.isSuccessfullyExtracted && textMatches && rawMatches;

    let auditStatus: 'COMPROVADO_COM_EVIDENCIA' | 'DIVERGENCIA_DETECTADA' | 'REJEITADO_PAYLOAD_INVALIDO';
    let auditSummary: string;

    if (!domainCheck.isValid) {
      auditStatus = 'REJEITADO_PAYLOAD_INVALIDO';
      auditSummary = `Rejeitado: Domínio '${domainCheck.hostname}' não é uma fonte governamental/judiciária oficial.`;
    } else if (!extraction.isSuccessfullyExtracted) {
      auditStatus = 'REJEITADO_PAYLOAD_INVALIDO';
      auditSummary = `Rejeitado: O artefato bruto fornecido não contém texto normativo extraível válido (${extraction.extractionNotes}).`;
    } else if (!textMatches) {
      auditStatus = 'DIVERGENCIA_DETECTADA';
      auditSummary = `Divergência detectada: O texto extraído do artefato oficial difere do enunciado arquivado no acervo local.`;
    } else if (!rawMatches) {
      auditStatus = 'DIVERGENCIA_DETECTADA';
      auditSummary = `Divergência criptográfica: O hash SHA-256 do artefato (${computedRawSha256}) não confere com o esperado (${expectedRawHash}).`;
    } else {
      auditStatus = 'COMPROVADO_COM_EVIDENCIA';
      auditSummary = `Auditoria independente concluída com 100% de conformidade. Texto extraído diretamente da publicação oficial do ${authority}.`;
    }

    const rawLength = typeof originalArtifact === 'string'
      ? Buffer.byteLength(originalArtifact, 'utf8')
      : originalArtifact.length;

    return {
      isAuthentic: isValid,
      articleId: article.id,
      authority,
      exactUrl,
      rawArtifactSha256: computedRawSha256,
      expectedRawSha256: expectedRawHash,
      rawArtifactHashMatches: rawMatches,
      extractedCanonicalText: normExtracted,
      extractedCanonicalSha256,
      storedCanonicalSha256,
      textMatches,
      auditStatus,
      isDefensible: isValid,
      forensicEvidence: {
        rawBytesLength: rawLength,
        sourceFormat,
        verifiedDomain: domainCheck.isValid,
        provenanceLinkedToArtifact: extraction.isSuccessfullyExtracted
      },
      auditSummary
    };
  }
}
