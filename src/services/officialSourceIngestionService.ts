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

import forge from 'node-forge';
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
  rawArtifactSha256: string; // SHA-256 dos bytes brutos recebidos da fonte oficial (sem normalização)
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
   * Calcula o hash SHA-256 (FIPS 180-4) estritamente sobre os bytes originais do artefato bruto,
   * sem qualquer normalização textual ou alteração de encoding.
   */
  public static computeRawArtifactSha256(rawPayload: string | Uint8Array | Buffer): string {
    return LegalCorpusAuditorService.computeRawArtifactSha256(rawPayload);
  }

  /**
   * Extrai o texto normativo diretamente do artefato oficial bruto preservado,
   * comprovando que o texto tem origem factual na fonte e não foi forjado pelo chamador.
   */
  public static extractTextFromRawArtifact(
    rawPayload: string | Uint8Array | Buffer,
    sourceFormat: 'HTML' | 'PDF' | 'JSON_OFFICIAL' | 'XML_DJE' | 'TEXT_EXTRACT' = 'HTML',
    expectedSnippet?: string
  ): {
    extractedText: string;
    isSuccessfullyExtracted: boolean;
    extractionNotes: string;
  } {
    const rawStr = typeof rawPayload === 'string'
      ? rawPayload
      : (rawPayload instanceof Uint8Array || Buffer.isBuffer(rawPayload))
        ? new TextDecoder('utf-8').decode(rawPayload)
        : String(rawPayload);

    if (!rawStr || rawStr.trim() === '') {
      return {
        extractedText: '',
        isSuccessfullyExtracted: false,
        extractionNotes: 'Artefato bruto vazio: impossível extrair conteúdo normativo.'
      };
    }

    if (sourceFormat === 'JSON_OFFICIAL') {
      try {
        const parsed = JSON.parse(rawStr);
        const candidate = parsed.enunciado || parsed.texto || parsed.conteudo ||
          parsed.dispositivo || parsed.ementa || parsed.content || parsed.text ||
          parsed.artigo;
        if (typeof candidate === 'string' && candidate.trim() !== '') {
          return {
            extractedText: candidate.trim(),
            isSuccessfullyExtracted: true,
            extractionNotes: 'Texto normativo extraído de campo estruturado JSON_OFFICIAL.'
          };
        }
        if (parsed.items && Array.isArray(parsed.items) && parsed.items[0]) {
          const item = parsed.items[0];
          const text = item.enunciado || item.texto || item.conteudo;
          if (typeof text === 'string' && text.trim() !== '') {
            return {
              extractedText: text.trim(),
              isSuccessfullyExtracted: true,
              extractionNotes: 'Texto extraído do primeiro item de array JSON_OFFICIAL.'
            };
          }
        }
        return {
          extractedText: '',
          isSuccessfullyExtracted: false,
          extractionNotes: 'JSON válido, porém não contém nenhum campo normativo oficial reconhecido (enunciado, texto, conteudo, dispositivo).'
        };
      } catch (err: any) {
        return {
          extractedText: '',
          isSuccessfullyExtracted: false,
          extractionNotes: `Falha ao interpretar artefato como JSON_OFFICIAL: ${err?.message || err}`
        };
      }
    }

    if (sourceFormat === 'XML_DJE') {
      const match = rawStr.match(/<(?:enunciado|texto|dispositivo|artigo|ementa)[^>]*>([\s\S]*?)<\/(?:enunciado|texto|dispositivo|artigo|ementa)>/i);
      if (match && match[1] && match[1].trim() !== '') {
        return {
          extractedText: match[1].trim(),
          isSuccessfullyExtracted: true,
          extractionNotes: 'Texto normativo extraído de tag XML oficial do DJe.'
        };
      }
      return {
        extractedText: '',
        isSuccessfullyExtracted: false,
        extractionNotes: 'Estrutura XML_DJE não contém tag normativa identificada.'
      };
    }

    if (sourceFormat === 'HTML') {
      if (expectedSnippet && expectedSnippet.trim() !== '') {
        const normExpected = normalizeCanonicalLegalText(expectedSnippet);
        const textInHtml = normalizeCanonicalLegalText(
          rawStr
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
        );
        if (textInHtml.includes(normExpected)) {
          return {
            extractedText: normExpected,
            isSuccessfullyExtracted: true,
            extractionNotes: 'Texto normativo localizado e extraído integralmente do documento HTML oficial.'
          };
        }
      }
      const withoutScripts = rawStr
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
      const clean = withoutScripts.replace(/<[^>]+>/g, ' ').trim();
      return {
        extractedText: clean,
        isSuccessfullyExtracted: clean.length > 0,
        extractionNotes: clean.length > 0 ? 'Texto extraído do HTML oficial.' : 'HTML vazio após sanitização.'
      };
    }

    if (sourceFormat === 'TEXT_EXTRACT') {
      if (expectedSnippet && expectedSnippet.trim() !== '') {
        const normExpected = normalizeCanonicalLegalText(expectedSnippet);
        const normRaw = normalizeCanonicalLegalText(rawStr);
        if (normRaw.includes(normExpected)) {
          return {
            extractedText: normExpected,
            isSuccessfullyExtracted: true,
            extractionNotes: 'Texto normativo comprovadamente contido no extrato textual preservado.'
          };
        }
      }
      return {
        extractedText: rawStr.trim(),
        isSuccessfullyExtracted: true,
        extractionNotes: 'Texto extraído do documento textual.'
      };
    }

    return {
      extractedText: rawStr.trim(),
      isSuccessfullyExtracted: rawStr.trim().length > 0,
      extractionNotes: 'Extração padrão de texto bruto.'
    };
  }

  /**
   * Ingesta um artefato oficial bruto capturado de repositório governamental/tribunal,
   * calcula o hash SHA-256 diretamente dos bytes brutos (sem normalização) e realiza
   * extração e conferência factual contra o acervo local.
   */
  public static ingestOfficialArtifact(params: {
    article: LegalArticle;
    rawPayload: string | Uint8Array | Buffer;
    extractedText?: string;
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

    // 2. Cálculo do Hash SHA-256 do payload bruto diretamente sobre os bytes originais (sem normalização textual)
    const rawArtifactSha256 = this.computeRawArtifactSha256(rawPayload);

    // 3. Extração independente do texto diretamente do artefato bruto preservado
    const extraction = this.extractTextFromRawArtifact(rawPayload, sourceFormat, article.content);

    // 4. Verificação de correspondência e comprovação de proveniência do texto
    // Se o chamador forneceu extractedText, verificar se ele coincide com o extraído de rawPayload
    let hasProvenOrigin = extraction.isSuccessfullyExtracted;
    let effectiveExtractedText = extraction.extractedText;

    if (extractedText && extractedText.trim() !== '') {
      const normProvided = normalizeCanonicalLegalText(extractedText);
      const normFromRaw = normalizeCanonicalLegalText(extraction.extractedText);

      // O texto alegado pelo chamador DEVE estar comprovadamente contido no payload bruto!
      const rawTextForSearch = normalizeCanonicalLegalText(
        typeof rawPayload === 'string'
          ? rawPayload
          : (rawPayload instanceof Uint8Array || Buffer.isBuffer(rawPayload))
            ? new TextDecoder('utf-8').decode(rawPayload)
            : String(rawPayload)
      );
      const isContainedInRaw = rawTextForSearch.includes(normProvided);

      if (normProvided !== normFromRaw && !isContainedInRaw) {
        // Payload arbitrário detectado! O texto alegado não provém do rawPayload.
        hasProvenOrigin = false;
        effectiveExtractedText = extraction.extractedText || normProvided;
      } else {
        effectiveExtractedText = normProvided;
      }
    }

    const normalizedExtracted = normalizeCanonicalLegalText(effectiveExtractedText);
    const extractedContentHash = LegalCorpusAuditorService.computeCanonicalSha256(normalizedExtracted);

    // 5. Cálculo do Hash do texto armazenado localmente
    const localContentHash = LegalCorpusAuditorService.computeCanonicalSha256(article.content);

    // 6. Comparação literal de conteúdo:
    // Só há match se a proveniência do artefato for comprovada E os hashes de conteúdo coincidirem!
    const isMatch = Boolean(hasProvenOrigin && (localContentHash === extractedContentHash));

    const rawPayloadLength = typeof rawPayload === 'string'
      ? Buffer.byteLength(rawPayload, 'utf8')
      : rawPayload.length;

    // 7. Registro do snapshot de custódia
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
      contentLengthBytes: rawPayloadLength,
      storagePath: storagePath || `snapshots/${article.id}.json`
    };
    this.registerSnapshot(snapshot);

    // 8. Construção da cadeia de proveniência com evidência real
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
        contentLengthBytes: rawPayloadLength,
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
          ? 'Texto local coincide 100% com o enunciado extraído diretamente do artefato oficial capturado.'
          : (!hasProvenOrigin
            ? 'Divergência crítica: O payload bruto fornecido não contém nem comprova o enunciado normativo alegado.'
            : 'Divergência detectada entre texto local e artefato oficial capturado.'),
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
        auditNotes: !hasProvenOrigin
          ? `Ingestão rejeitada: O payload bruto fornecido não contém nem comprova o enunciado normativo alegado perante o ${authority}. O texto informado pelo chamador não pôde ser extraído do artefato oficial.`
          : (isMatch
            ? `Autenticidade e cadeia de proveniência integralmente comprovadas perante repositório oficial do ${authority}. Captura física efetuada em ${capturedAt} com snapshot documentado.`
            : `Divergência detectada entre o texto do acervo local e a publicação oficial do ${authority}.`)
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
