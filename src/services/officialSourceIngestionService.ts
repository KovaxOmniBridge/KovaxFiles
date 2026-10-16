/**
 * Serviço de Ingestão e Custódia de Fontes Oficiais Independentes
 *
 * Princípio Fundamental:
 * - Apenas registros com artefatos oficiais brutos EFETIVAMENTE capturados,
 *   preservados em arquivo/memória com timestamp real de captura e cujo texto
 *   extraído coincida 100% com o texto armazenado podem receber COMPROVADO_COM_EVIDENCIA.
 * - Registros cadastrados no código sem captura documentada recebem NAO_VERIFICADO_EXTERNAMENTE.
 * - É terminantemente proibido reutilizar o hash do texto local como se fosse o hash da fonte externa.
 */

import { LegalArticle, ProvenanceChain } from './legalKnowledgeBaseService';
import { LegalCorpusAuditorService, normalizeCanonicalLegalText } from './legalCorpusAuditorService';

export interface OfficialCaptureSnapshot {
  snapshotId: string;
  articleId: string;
  authority: string;
  officialJournal: string;
  publicationDate: string;
  actNumber: string;
  exactUrl: string;
  capturedAt: string; // ISO 8601 exato da captura na rede/sistema (NÃO a data de publicação da norma)
  captureMethod: 'OFFICIAL_DJE_SNAPSHOT' | 'API_OFFICIAL_GATEWAY' | 'OFFICIAL_PORTAL_INGESTION';
  sourceFormat: 'HTML' | 'PDF' | 'JSON_OFFICIAL' | 'XML_DJE' | 'TEXT_EXTRACT';
  rawArtifactSha256: string; // SHA-256 dos bytes brutos recebidos da fonte oficial
  extractedCanonicalText: string;
  extractedContentHash: string; // SHA-256 do texto extraído normalizado
  contentLengthBytes: number;
  rawPayloadSnippet?: string;
  storagePath?: string;
}

export class OfficialSourceIngestionService {
  private static _snapshots: Map<string, OfficialCaptureSnapshot> = new Map();

  /**
   * Registra em memória/custódia um snapshot de captura oficial
   */
  public static registerSnapshot(snapshot: OfficialCaptureSnapshot): void {
    this._snapshots.set(snapshot.articleId, snapshot);
  }

  /**
   * Obtém snapshot registrado para um dispositivo legal
   */
  public static getSnapshot(articleId: string): OfficialCaptureSnapshot | undefined {
    return this._snapshots.get(articleId);
  }

  /**
   * Limpa os snapshots em memória
   */
  public static clearSnapshots(): void {
    this._snapshots.clear();
  }

  /**
   * Ingesta um artefato oficial bruto capturado de repositório governamental/tribunal,
   * calcula os hashes de forma independente e realiza a conferência literal contra o texto local.
   */
  public static ingestOfficialArtifact(params: {
    article: LegalArticle;
    rawPayload: string;
    extractedText: string;
    exactUrl: string;
    authority: string;
    officialJournal: string;
    publicationDate: string;
    actNumber?: string;
    capturedAt: string; // Timestamp real de captura
    captureMethod?: 'OFFICIAL_DJE_SNAPSHOT' | 'API_OFFICIAL_GATEWAY' | 'OFFICIAL_PORTAL_INGESTION';
    sourceFormat?: 'HTML' | 'PDF' | 'JSON_OFFICIAL' | 'XML_DJE' | 'TEXT_EXTRACT';
    storagePath?: string;
  }): LegalArticle {
    const {
      article,
      rawPayload,
      extractedText,
      exactUrl,
      authority,
      officialJournal,
      publicationDate,
      actNumber = article.article,
      capturedAt,
      captureMethod = 'OFFICIAL_DJE_SNAPSHOT',
      sourceFormat = 'HTML',
      storagePath
    } = params;

    // 1. Validação estrita do domínio institucional
    const domainCheck = LegalCorpusAuditorService.validateOfficialDomain(exactUrl);
    if (!domainCheck.isValid) {
      throw new Error(`Ingestão recusada: Domínio '${domainCheck.hostname}' não é uma fonte governamental/tribunal certificada.`);
    }

    // 2. Cálculo do Hash SHA-256 do payload bruto recebido da fonte externa
    // Este hash representa os bytes físicos do arquivo baixado da internet/DJe
    const rawArtifactSha256 = LegalCorpusAuditorService.computeCanonicalSha256(rawPayload);

    // 3. Cálculo do Hash SHA-256 do texto extraído e normalizado
    const normalizedExtracted = normalizeCanonicalLegalText(extractedText);
    const extractedContentHash = LegalCorpusAuditorService.computeCanonicalSha256(normalizedExtracted);

    // 4. Cálculo do Hash do texto armazenado localmente
    const localContentHash = LegalCorpusAuditorService.computeCanonicalSha256(article.content);

    // 5. Comparação literal de conteúdo
    const isMatch = (localContentHash === extractedContentHash);

    // 6. Registro do snapshot de custódia
    const snapshot: OfficialCaptureSnapshot = {
      snapshotId: `snap-${article.id}-${Date.now()}`,
      articleId: article.id,
      authority,
      officialJournal,
      publicationDate,
      actNumber,
      exactUrl,
      capturedAt,
      captureMethod,
      sourceFormat,
      rawArtifactSha256,
      extractedCanonicalText: normalizedExtracted,
      extractedContentHash,
      contentLengthBytes: rawPayload.length,
      storagePath: storagePath || `snapshots/${article.id}.json`
    };
    this.registerSnapshot(snapshot);

    // 7. Construção da cadeia de proveniência com evidência real
    const provenance: ProvenanceChain = {
      publication: {
        authority,
        officialJournal,
        publicationDate,
        actNumber,
        officialUrn: article.officialId || LegalCorpusAuditorService.generateLexmlUrn(article),
        isOfficialUrnVerified: article.isOfficialUrnVerified || false
      },
      sourceCapture: {
        exactUrl,
        verifiedHostname: domainCheck.hostname,
        isDomainVerified: true,
        capturedAt,
        captureMethod,
        externalSourceHash: rawArtifactSha256,
        rawArtifactSha256,
        sourceRawArtifactPath: snapshot.storagePath,
        sourceFormat,
        contentLengthBytes: rawPayload.length,
        hasDocumentedSnapshot: true,
        extractedContentHash
      },
      versionControl: {
        versionReference: article.version || 'v1.0-CONSOLIDADA',
        canonicalText: article.content,
        storedContentHash: localContentHash,
        extractedContentHash,
        contentMatch: isMatch,
        textComparisonDetails: isMatch
          ? 'Texto local coincide 100% com o enunciado extraído do artefato oficial capturado.'
          : 'Divergência detectada entre texto local e artefato oficial capturado.',
        versionHistory: article.provenance?.versionControl?.versionHistory || []
      },
      evidence: {
        status: isMatch ? 'COMPROVADO_COM_EVIDENCIA' : 'DIVERGENCIA_DETECTADA',
        isDefensible: isMatch,
        hasIdentifiedPublication: true,
        hasVerifiableCapture: true,
        hasValidExternalHash: true,
        hasContentMatch: isMatch,
        isDomainVerified: true,
        isOfficialUrnVerified: Boolean(article.isOfficialUrnVerified),
        hasDocumentedSnapshot: true,
        isAutovalidationRejected: false,
        auditNotes: isMatch
          ? `Autenticidade e cadeia de proveniência integralmente comprovadas perante repositório oficial do ${authority}. Captura física efetuada em ${capturedAt} com snapshot documentado.`
          : `Divergência detectada entre o texto do acervo local e a publicação oficial do ${authority}.`
      }
    };

    const ingestedArticle: LegalArticle = {
      ...article,
      sourceUrl: exactUrl,
      officialPublisher: authority,
      officialRef: officialJournal,
      queryDate: publicationDate,
      externalSourceHash: rawArtifactSha256,
      officialContentSha256: rawArtifactSha256,
      authenticityStatus: provenance.evidence.status,
      auditNotes: provenance.evidence.auditNotes,
      statusVigencia: isMatch ? (article.statusVigencia || 'COMUM') : 'SUSPENSA_NAO_COMPROVADA',
      provenance
    };

    return ingestedArticle;
  }
}
