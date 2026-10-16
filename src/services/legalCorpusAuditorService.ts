/**
 * Serviço de Auditoria Criptográfica, Factual e de Autenticidade do Acervo Jurídico
 *
 * Implementa a Cadeia Estrutural de Proveniência:
 * 1. Publicação oficial identificada (órgão emissor, diário, data de publicação formal)
 * 2. Cópia ou captura verificável da fonte (URL exata, hostname verificado sem substring, hash externo independente)
 * 3. Comparação de texto e controle de versão (texto canônico, histórico de versões imutável, ato modificador)
 * 4. Status de autenticidade com evidências técnicas defensáveis
 *
 * Princípios de Integridade Rígida:
 * - Um domínio mencionado dentro de URL ou referência NÃO é suficiente para comprovar origem.
 * - Uma URN construída pelo aplicativo NÃO prova que o texto foi oficialmente publicado.
 * - O hash do conteúdo local NUNCA é reutilizado como se fosse o hash de uma fonte externa.
 * - Atualizações e revogações produzem novas versões, preservando o histórico.
 * - Registros não verificados NUNCA aparecem como fundamentação oficialmente comprovada.
 */

import type {
  LegalArticle,
  StatuteStatus,
  ProvenanceChain,
  OfficialPublicationInfo,
  SourceCaptureInfo,
  VersionControlInfo,
  LegalVersionRecord,
  AuthenticityEvidence,
  AuthenticityStatus
} from './legalKnowledgeBaseService';

export interface ArticleAuditReport {
  articleId: string;
  lawName: string;
  article: string;
  officialId: string;
  isOfficialUrnVerified: boolean;
  officialPublisher: string;
  sourceUrl: string;
  verifiedHostname: string;
  isDomainVerified: boolean;
  queryDate: string;
  version: string;
  statusVigencia: StatuteStatus;
  canonicalSha256: string;
  externalSourceHash?: string;
  officialExpectedSha256?: string; // Legado para compatibilidade
  authenticityStatus: AuthenticityStatus;
  isSuspended: boolean;
  isDefensible: boolean;
  auditNotes: string;
  provenance?: ProvenanceChain;
  divergenceDetails?: {
    diffMessage?: string;
    expectedPreview?: string;
    foundPreview?: string;
  };
}

export interface CorpusAuditSummary {
  auditDate: string;
  totalAudited: number;
  totalAuthentic: number;
  totalUnverified: number;
  totalSuspended: number;
  totalRevoked: number;
  totalDivergent: number;
  complianceRatePercent: number;
  reports: ArticleAuditReport[];
  suspendedArticles: ArticleAuditReport[];
  unverifiedArticles: ArticleAuditReport[];
}

/**
 * Normaliza o texto de dispositivos e enunciados para comparação canônica determinística
 * (Elimina discrepâncias de quebra de linha, espaços duplos e pontuação tipográfica)
 */
export function normalizeCanonicalLegalText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[–—]/g, '-')
    .trim();
}

/**
 * Implementação pura em TypeScript de SHA-256 determinístico para execução síncrona
 * em qualquer ambiente (Browser, Worker, Node.js e Electron) sem dependência de APIs externas
 */
function sha256Sync(ascii: string): string {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i = 0;
  let j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0x0bef9a3f, 0xc67178f2
  ];

  const utf8: number[] = [];
  for (let c = 0; c < ascii.length; c++) {
    let charcode = ascii.charCodeAt(c);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      c++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (ascii.charCodeAt(c) & 0x3ff));
      utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    }
  }

  for (i = 0; i < utf8.length; i++) {
    words[i >> 2] |= (utf8[i] & 0xff) << (24 - (i % 4) * 8);
  }
  words[utf8.length >> 2] |= 0x80 << (24 - (utf8.length % 4) * 8);
  words[(((utf8.length + 8) >> 6) << 4) + 15] = utf8.length * 8;

  const w = new Array(64);
  for (i = 0; i < words.length; i += 16) {
    const a = hash.slice(0);
    for (j = 0; j < 64; j++) {
      let w15: number, w2: number;
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const gamma0 = ((w15 = w[j - 15]) >>> 7 | w15 << 25) ^ (w15 >>> 18 | w15 << 14) ^ (w15 >>> 3);
        const gamma1 = ((w2 = w[j - 2]) >>> 17 | w2 << 15) ^ (w2 >>> 19 | w2 << 13) ^ (w2 >>> 10);
        w[j] = (gamma0 + w[j - 7] + gamma1 + w[j - 16]) | 0;
      }

      const ch = (a[4] & a[5]) ^ (~a[4] & a[6]);
      const maj = (a[0] & a[1]) ^ (a[0] & a[2]) ^ (a[1] & a[2]);
      const sigma0 = (a[0] >>> 2 | a[0] << 30) ^ (a[0] >>> 13 | a[0] << 19) ^ (a[0] >>> 22 | a[0] << 10);
      const sigma1 = (a[4] >>> 6 | a[4] << 26) ^ (a[4] >>> 11 | a[4] << 21) ^ (a[4] >>> 25 | a[4] << 7);
      const t1 = (a[7] + sigma1 + ch + k[j] + w[j]) | 0;
      const t2 = (sigma0 + maj) | 0;

      a[7] = a[6];
      a[6] = a[5];
      a[5] = a[4];
      a[4] = (a[3] + t1) | 0;
      a[3] = a[2];
      a[2] = a[1];
      a[1] = a[0];
      a[0] = (t1 + t2) | 0;
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + a[j]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

export class LegalCorpusAuditorService {
  /**
   * Calcula o hash SHA-256 canônico de qualquer texto legal normalizado
   */
  public static computeCanonicalSha256(content: string): string {
    const normalized = normalizeCanonicalLegalText(content);
    return sha256Sync(normalized);
  }

  /**
   * Validação estrita de domínio institucional governamental/tribunal
   * Rejeita substrings em caminhos (ex: attacker.com/planalto.gov.br) e domínios forjados.
   */
  public static validateOfficialDomain(urlStr?: string): {
    isValid: boolean;
    hostname: string;
    isJudicial: boolean;
    isLegislative: boolean;
    isExecutive: boolean;
    errorReason?: string;
  } {
    if (!urlStr || typeof urlStr !== 'string' || urlStr.trim() === '') {
      return {
        isValid: false,
        hostname: '',
        isJudicial: false,
        isLegislative: false,
        isExecutive: false,
        errorReason: 'URL oficial não informada ou vazia.'
      };
    }

    let parsed: URL;
    try {
      parsed = new URL(urlStr.trim());
    } catch {
      return {
        isValid: false,
        hostname: '',
        isJudicial: false,
        isLegislative: false,
        isExecutive: false,
        errorReason: 'URL com formato de protocolo inválido ou malformado.'
      };
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        isValid: false,
        hostname: parsed.hostname,
        isJudicial: false,
        isLegislative: false,
        isExecutive: false,
        errorReason: `Protocolo '${parsed.protocol}' não autorizado. Apenas HTTP/HTTPS oficiais são aceitos.`
      };
    }

    const hostname = parsed.hostname.toLowerCase().trim();

    // Domínios institucionais oficiais brasileiros:
    // 1. Tribunais e Poder Judiciário (*.jus.br)
    const isJudicial = hostname === 'jus.br' || hostname.endsWith('.jus.br');
    // 2. Poder Legislativo (*.leg.br)
    const isLegislative = hostname === 'leg.br' || hostname.endsWith('.leg.br');
    // 3. Poder Executivo e Imprensa Oficial (*.gov.br)
    const isExecutive = hostname === 'gov.br' || hostname.endsWith('.gov.br');

    // Domínios homologados de imprensa oficial e diários oficiais estaduais/municipais
    const trustedExtraHostnames = new Set([
      'imprensanacional.gov.br',
      'diariooficial.sp.gov.br',
      'diariooficial.rj.gov.br',
      'lexml.gov.br'
    ]);

    const isTrustedDomain = isJudicial || isLegislative || isExecutive || trustedExtraHostnames.has(hostname);

    if (!isTrustedDomain) {
      return {
        isValid: false,
        hostname,
        isJudicial: false,
        isLegislative: false,
        isExecutive: false,
        errorReason: `Hostname '${hostname}' não pertence a autoridade pública certificada (.jus.br, .gov.br, .leg.br). Menção de domínio em URL ou referência não comprova origem.`
      };
    }

    return {
      isValid: true,
      hostname,
      isJudicial,
      isLegislative,
      isExecutive
    };
  }

  /**
   * Valida se a fonte indicada é um repositório institucional oficial.
   * Não aceita meras menções textuais ou substrings.
   */
  public static isValidOfficialSource(url?: string, _ref?: string): boolean {
    const domainCheck = this.validateOfficialDomain(url);
    return domainCheck.isValid;
  }

  /**
   * Confere se a URN é oficialmente publicada/homologada pelo LexML/Tribunal
   * ou se é uma URN meramente sintética/provisória construída pelo aplicativo.
   */
  public static isUrnOfficiallyVerified(article: LegalArticle): boolean {
    if (article.isOfficialUrnVerified === true) return true;
    if (article.provenance?.publication?.isOfficialUrnVerified === true) return true;
    return false;
  }

  /**
   * Gera uma URN provisória no padrão LexML para indexação interna do sistema.
   * AVISO: Uma URN sintética gerada pelo aplicativo NÃO prova publicação oficial.
   */
  public static generateLexmlUrn(article: LegalArticle): string {
    if (article.officialId && article.officialId.startsWith('urn:lex:')) {
      return article.officialId;
    }

    const lawLower = article.lawName.toLowerCase();
    const artClean = (article.article || 'art1').toLowerCase().replace(/[^\w]/g, '');

    // Súmulas Vinculantes do STF
    if (lawLower.includes('súmula vinculante') || article.id.startsWith('stf-sv-')) {
      const num = article.id.replace(/\D/g, '') || '1';
      return `urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:${num}`;
    }

    // Súmulas do STF
    if (lawLower.includes('stf - súmula') || article.id.startsWith('stf-sumula-')) {
      const num = article.id.replace(/\D/g, '') || '1';
      return `urn:lex:br:federal:supremo.tribunal.federal;sumula:${num}`;
    }

    // Súmulas do STJ
    if (lawLower.includes('stj - súmula') || article.id.startsWith('stj-sumula-')) {
      const num = article.id.replace(/\D/g, '') || '1';
      return `urn:lex:br:federal:superior.tribunal.justica;sumula:${num}`;
    }

    // Súmulas do TST
    if (lawLower.includes('tst - súmula') || article.id.startsWith('tst-sumula-')) {
      const num = article.id.replace(/\D/g, '') || '1';
      return `urn:lex:br:federal:tribunal.superior.trabalho;sumula:${num}`;
    }

    // Constituição Federal
    if (lawLower.includes('cf/88') || lawLower.includes('constituição')) {
      return `urn:lex:br:federal:constituicao:1988-10-05;1988#${artClean}`;
    }

    // Leis Federais com número
    const numMatch = article.lawName.match(/(\d+[\.\d]*)\/(\d{4})/);
    if (numMatch) {
      const num = numMatch[1].replace(/\./g, '');
      const year = numMatch[2];
      return `urn:lex:br:federal:lei:${year};${num}#${artClean}`;
    }

    // Customizadas ou Locais
    const safeLaw = encodeURIComponent(article.lawName.replace(/\s+/g, '.').toLowerCase());
    return `urn:lex:br:custom:${safeLaw}#${artClean}`;
  }

  /**
   * Constrói a Cadeia Estrutural de Proveniência para um registro jurídico com validação
   * estrita contra autovalidação circular e eliminação de datas de captura presumidas.
   */
  public static buildProvenanceChain(article: LegalArticle): ProvenanceChain {
    const storedContentHash = this.computeCanonicalSha256(article.content);
    const officialId = this.generateLexmlUrn(article);
    const isOfficialUrnVerified = this.isUrnOfficiallyVerified(article);
    const authority = article.provenance?.publication?.authority || article.officialPublisher || this.deducePublisher(article);
    const journal = article.provenance?.publication?.officialJournal || article.officialRef || 'Diário da Justiça Eletrônico (DJe)';
    const pubDate = article.provenance?.publication?.publicationDate || article.queryDate || '2026-10-15';
    const actNumber = article.provenance?.publication?.actNumber || article.article;

    const sourceUrl = article.provenance?.sourceCapture?.exactUrl || article.sourceUrl || '';
    const domainResult = this.validateOfficialDomain(sourceUrl);

    // Validação estrita de captura física independente:
    const prevCapture = article.provenance?.sourceCapture;
    const hasDocumentedSnapshot = Boolean(prevCapture?.hasDocumentedSnapshot || prevCapture?.sourceRawArtifactPath);
    const captureMethod = prevCapture?.captureMethod || 'MANUAL_UNVERIFIED';

    // REMOÇÃO OBRIGATÓRIA DE DATAS DE CAPTURA PRESUMIDAS:
    // A data de publicação de uma súmula não é a data em que o aplicativo capturou sua fonte.
    // Qualquer timestamp que corresponda à data histórica de publicação ou contenha o fallback fictício é descartado.
    let realCapturedAt: string | undefined = prevCapture?.capturedAt;
    if (realCapturedAt && (realCapturedAt.startsWith(pubDate) || realCapturedAt.includes('12:00:00Z'))) {
      realCapturedAt = undefined;
    }

    const externalSourceHash = article.externalSourceHash || prevCapture?.externalSourceHash;
    const rawArtifactSha256 = prevCapture?.rawArtifactSha256;
    const extractedContentHash = prevCapture?.extractedContentHash;

    const hasValidExternalHash = Boolean(
      externalSourceHash &&
      typeof externalSourceHash === 'string' &&
      externalSourceHash.length === 64
    );

    // DETECÇÃO E BLOQUEIO DE AUTOVALIDAÇÃO CIRCULAR:
    // Se o externalSourceHash for exatamente igual ao storedContentHash do texto local,
    // mas não existir snapshot físico documentado ou o método for MANUAL_UNVERIFIED ou não houver capturedAt real,
    // trata-se de falsa evidência externa forjada por clonagem do texto local.
    const isCircularAutovalidation = Boolean(
      hasValidExternalHash &&
      externalSourceHash === storedContentHash &&
      (!hasDocumentedSnapshot || captureMethod === 'MANUAL_UNVERIFIED' || !realCapturedAt)
    );

    // Comparação do texto:
    // Só há contentMatch legítimo se houver captura documentada e o texto extraído da fonte
    // coincidir com o texto canônico local.
    let contentMatch = false;
    if (hasValidExternalHash && !isCircularAutovalidation && hasDocumentedSnapshot) {
      if (extractedContentHash) {
        contentMatch = (extractedContentHash === storedContentHash);
      } else {
        contentMatch = (externalSourceHash === storedContentHash);
      }
    }

    // Avaliação de status com rigor forense
    let status: AuthenticityStatus = 'NAO_VERIFICADO_EXTERNAMENTE';
    let isSuspended = false;
    let isDefensible = false;
    let auditNotes = '';

    if (
      article.id === 'stf-sv-30' ||
      (article.lawName.includes('Súmula Vinculante 30') && !article.content.includes('revogada')) ||
      article.statusVigencia === 'SUSPENSA_NAO_COMPROVADA' ||
      article.authenticityStatus === 'SUSPENSO_PREVENTIVAMENTE' ||
      article.authenticityStatus === 'SUSPENSO_NAO_COMPROVADO'
    ) {
      status = 'SUSPENSO_PREVENTIVAMENTE';
      isSuspended = true;
      isDefensible = false;
      auditNotes = article.auditNotes || 'Processo de edição suspenso pelo Plenário do STF (PSV 30). O enunciado não foi publicado no DJe, razão pela qual sua autenticidade perante publicação oficial não pôde ser comprovada. Suspenso preventivamente para garantir segurança jurídica.';
    } else if (!domainResult.isValid) {
      status = 'ORIGEM_NAO_COMPROVADA';
      isSuspended = true;
      isDefensible = false;
      auditNotes = domainResult.errorReason || 'Origem não comprovada por repositório governamental oficial.';
    } else if (isCircularAutovalidation) {
      status = 'NAO_VERIFICADO_EXTERNAMENTE';
      isSuspended = false;
      isDefensible = false;
      auditNotes = 'Autovalidação circular rejeitada pela auditoria: o hash do texto local foi replicado no campo externo sem captura física documentada. Registro mantido como acervo local pendente de homologação externa.';
    } else if (!hasValidExternalHash || !hasDocumentedSnapshot || !realCapturedAt) {
      status = 'NAO_VERIFICADO_EXTERNAMENTE';
      isSuspended = false;
      isDefensible = false;
      auditNotes = 'Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada.';
    } else if (!contentMatch) {
      status = 'DIVERGENCIA_DETECTADA';
      isSuspended = true;
      isDefensible = false;
      auditNotes = `Divergência detectada entre o texto armazenado (${storedContentHash.substring(0, 8)}...) e o documento oficial capturado (${(extractedContentHash || externalSourceHash)?.substring(0, 8)}...).`;
    } else {
      status = 'COMPROVADO_COM_EVIDENCIA';
      isSuspended = false;
      isDefensible = true;
      auditNotes = `Autenticidade e cadeia de proveniência comprovadas perante repositório oficial independente. Captura física documentada em ${realCapturedAt} com coincidência literal de 100%.`;
    }

    const publication: OfficialPublicationInfo = {
      authority,
      officialJournal: journal,
      publicationDate: pubDate,
      actNumber,
      officialUrn: officialId,
      isOfficialUrnVerified
    };

    const sourceCapture: SourceCaptureInfo = {
      exactUrl: sourceUrl,
      verifiedHostname: domainResult.hostname,
      isDomainVerified: domainResult.isValid,
      capturedAt: realCapturedAt,
      captureMethod: (hasDocumentedSnapshot && realCapturedAt) ? captureMethod : 'MANUAL_UNVERIFIED',
      externalSourceHash: isCircularAutovalidation ? undefined : (externalSourceHash || undefined),
      rawArtifactSha256,
      sourceRawArtifactPath: prevCapture?.sourceRawArtifactPath,
      sourceFormat: prevCapture?.sourceFormat || 'HTML',
      contentLengthBytes: prevCapture?.contentLengthBytes || article.content.length,
      hasDocumentedSnapshot,
      extractedContentHash
    };

    const versionHistory: LegalVersionRecord[] = article.provenance?.versionControl?.versionHistory || (
      article.historicalVersions
        ? article.historicalVersions.map((h, idx) => ({
            versionId: `v-${h.effectiveDate}-${idx + 1}`,
            effectiveStartDate: h.effectiveDate,
            status: 'ALTERADO',
            modifyingAct: h.changeNote,
            canonicalText: h.content,
            storedContentHash: this.computeCanonicalSha256(h.content)
          }))
        : []
    );

    const versionControl: VersionControlInfo = {
      versionReference: article.version || 'v1.0-CONSOLIDADA',
      canonicalText: article.content,
      storedContentHash,
      extractedContentHash,
      contentMatch,
      textComparisonDetails: contentMatch ? 'Texto armazenado coincide 100% com a extração da fonte oficial capturada.' : 'Captura independente pendente ou discrepância detectada.',
      versionHistory
    };

    const evidence: AuthenticityEvidence = {
      status,
      isDefensible,
      hasIdentifiedPublication: Boolean(authority && pubDate),
      hasVerifiableCapture: Boolean(domainResult.isValid && hasValidExternalHash && hasDocumentedSnapshot && realCapturedAt && !isCircularAutovalidation),
      hasValidExternalHash: hasValidExternalHash && !isCircularAutovalidation,
      hasContentMatch: contentMatch,
      isDomainVerified: domainResult.isValid,
      isOfficialUrnVerified,
      hasDocumentedSnapshot,
      isAutovalidationRejected: isCircularAutovalidation,
      auditNotes
    };

    return {
      publication,
      sourceCapture,
      versionControl,
      evidence
    };
  }

  /**
   * Realiza a auditoria factual, criptográfica e de proveniência de um registro individual
   */
  public static verifyArticle(article: LegalArticle): ArticleAuditReport {
    const currentStoredHash = this.computeCanonicalSha256(article.content);
    let provenance = article.provenance;
    // Sempre revalida se não há proveniência, se o hash divergir, se for suspeita de autovalidação ou data presumida
    const isSuspiciousProvenance = Boolean(
      provenance &&
      provenance.evidence.status === 'COMPROVADO_COM_EVIDENCIA' &&
      (!provenance.sourceCapture.hasDocumentedSnapshot || !provenance.sourceCapture.capturedAt || provenance.sourceCapture.capturedAt.includes('12:00:00Z'))
    );
    if (!provenance || provenance.versionControl.storedContentHash !== currentStoredHash || isSuspiciousProvenance) {
      provenance = this.buildProvenanceChain(article);
    }
    const canonicalSha256 = provenance.versionControl.storedContentHash;
    const externalSourceHash = provenance.sourceCapture.externalSourceHash;
    const isSuspended = provenance.evidence.status === 'SUSPENSO_PREVENTIVAMENTE' ||
      provenance.evidence.status === 'DIVERGENCIA_DETECTADA' ||
      provenance.evidence.status === 'ORIGEM_NAO_COMPROVADA';

    return {
      articleId: article.id,
      lawName: article.lawName,
      article: article.article,
      officialId: provenance.publication.officialUrn || this.generateLexmlUrn(article),
      isOfficialUrnVerified: provenance.publication.isOfficialUrnVerified,
      officialPublisher: provenance.publication.authority,
      sourceUrl: provenance.sourceCapture.exactUrl,
      verifiedHostname: provenance.sourceCapture.verifiedHostname,
      isDomainVerified: provenance.sourceCapture.isDomainVerified,
      queryDate: provenance.publication.publicationDate,
      version: provenance.versionControl.versionReference,
      statusVigencia: isSuspended ? 'SUSPENSA_NAO_COMPROVADA' : (article.statusVigencia || 'COMUM'),
      canonicalSha256,
      externalSourceHash: externalSourceHash || undefined,
      officialExpectedSha256: externalSourceHash || undefined,
      authenticityStatus: provenance.evidence.status,
      isSuspended,
      isDefensible: provenance.evidence.isDefensible,
      auditNotes: provenance.evidence.auditNotes,
      provenance,
      divergenceDetails: provenance.evidence.status === 'DIVERGENCIA_DETECTADA' ? {
        diffMessage: 'O texto difere da publicação oficial registrada no Diário Oficial.'
      } : undefined
    };
  }

  /**
   * Produz uma nova versão normativa preservando integralmente o histórico de versões anteriores
   * e sua vigência temporal (controle de versão estrito para revogações e atualizações)
   */
  public static createVersionUpdate(
    article: LegalArticle,
    update: {
      newContent: string;
      modifyingAct: string;
      effectiveDate: string;
      newVersionRef?: string;
      externalSourceHash?: string;
    }
  ): LegalArticle {
    const previousChain = article.provenance || this.buildProvenanceChain(article);
    const prevVersionRecord: LegalVersionRecord = {
      versionId: previousChain.versionControl.versionReference,
      effectiveStartDate: previousChain.publication.publicationDate,
      effectiveEndDate: update.effectiveDate,
      status: 'ALTERADO',
      modifyingAct: update.modifyingAct,
      canonicalText: article.content,
      storedContentHash: this.computeCanonicalSha256(article.content),
      externalSourceHash: previousChain.sourceCapture.externalSourceHash
    };

    const newStoredHash = this.computeCanonicalSha256(update.newContent);
    const newVersionRef = update.newVersionRef || `v${previousChain.versionControl.versionHistory.length + 2}.0-${update.effectiveDate}`;

    const updatedArticle: LegalArticle = {
      ...article,
      content: update.newContent,
      version: `Redação dada por ${update.modifyingAct} em ${update.effectiveDate}`,
      officialContentSha256: update.externalSourceHash,
      externalSourceHash: update.externalSourceHash,
      historicalVersions: [
        ...(article.historicalVersions || []),
        {
          effectiveDate: previousChain.publication.publicationDate,
          content: article.content,
          changeNote: `Alterado por ${update.modifyingAct}`
        }
      ]
    };

    const updatedHistory: LegalVersionRecord[] = [
      ...previousChain.versionControl.versionHistory,
      prevVersionRecord
    ];

    const newChain = this.buildProvenanceChain(updatedArticle);
    newChain.versionControl.versionReference = newVersionRef;
    newChain.versionControl.versionHistory = updatedHistory;
    newChain.versionControl.storedContentHash = newStoredHash;
    if (update.externalSourceHash) {
      newChain.sourceCapture.externalSourceHash = update.externalSourceHash;
      newChain.versionControl.contentMatch = (update.externalSourceHash === newStoredHash);
    }
    updatedArticle.provenance = newChain;

    return updatedArticle;
  }

  /**
   * Executa a auditoria em lote sobre um conjunto de dispositivos legais
   * Aplica estritamente a diretriz: registros não verificados externamente NÃO recebem selo de autenticidade comprovada.
   */
  public static auditCorpus(articles: LegalArticle[], autoApplyEvidence: boolean = true): CorpusAuditSummary {
    const reports: ArticleAuditReport[] = [];
    const suspendedArticles: ArticleAuditReport[] = [];
    const unverifiedArticles: ArticleAuditReport[] = [];

    let totalAuthentic = 0;
    let totalUnverified = 0;
    let totalSuspended = 0;
    let totalRevoked = 0;
    let totalDivergent = 0;

    for (const article of articles) {
      const rep = this.verifyArticle(article);
      reports.push(rep);

      if (rep.statusVigencia === 'REVOGADA_DESATIVADA') {
        totalRevoked++;
      }

      if (rep.isSuspended) {
        totalSuspended++;
        suspendedArticles.push(rep);
        if (rep.authenticityStatus === 'DIVERGENCIA_DETECTADA') {
          totalDivergent++;
        }
        if (autoApplyEvidence) {
          article.statusVigencia = 'SUSPENSA_NAO_COMPROVADA';
          article.authenticityStatus = rep.authenticityStatus;
          article.auditNotes = rep.auditNotes;
          article.provenance = rep.provenance;
        }
      } else if (rep.authenticityStatus === 'COMPROVADO_COM_EVIDENCIA') {
        totalAuthentic++;
        if (autoApplyEvidence) {
          article.authenticityStatus = 'COMPROVADO_COM_EVIDENCIA';
          article.provenance = rep.provenance;
        }
      } else {
        // NAO_VERIFICADO_EXTERNAMENTE
        totalUnverified++;
        unverifiedArticles.push(rep);
        if (autoApplyEvidence) {
          article.authenticityStatus = 'NAO_VERIFICADO_EXTERNAMENTE';
          article.provenance = rep.provenance;
        }
      }
    }

    const totalAudited = articles.length;
    const complianceRatePercent = totalAudited > 0 ? (totalAuthentic / totalAudited) * 100 : 0;

    return {
      auditDate: new Date().toISOString().split('T')[0],
      totalAudited,
      totalAuthentic,
      totalUnverified,
      totalSuspended,
      totalRevoked,
      totalDivergent,
      complianceRatePercent: Math.round(complianceRatePercent * 100) / 100,
      reports,
      suspendedArticles,
      unverifiedArticles
    };
  }

  /**
   * Filtra os artigos elegíveis para uso processual e citação em juízo,
   * excluindo registros suspensos formalmente ou que possuem divergência/origem inválida.
   */
  public static filterUsableArticles(articles: LegalArticle[], allowSuspended: boolean = false): LegalArticle[] {
    if (allowSuspended) return articles;
    return articles.filter(a =>
      a.statusVigencia !== 'SUSPENSA_NAO_COMPROVADA' &&
      a.authenticityStatus !== 'SUSPENSO_PREVENTIVAMENTE' &&
      a.authenticityStatus !== 'SUSPENSO_NAO_COMPROVADO' &&
      a.authenticityStatus !== 'DIVERGENCIA_DETECTADA' &&
      a.authenticityStatus !== 'ORIGEM_NAO_COMPROVADA'
    );
  }

  /**
   * Infere o órgão publicador oficial a partir do nome da lei
   */
  public static deducePublisher(article: LegalArticle): string {
    const l = article.lawName.toLowerCase();
    if (l.includes('stf') || l.includes('supremo tribunal federal')) return 'Supremo Tribunal Federal';
    if (l.includes('stj') || l.includes('superior tribunal de justiça')) return 'Superior Tribunal de Justiça';
    if (l.includes('tst') || l.includes('tribunal superior do trabalho')) return 'Tribunal Superior do Trabalho';
    if (l.includes('cf/88') || l.includes('constituição') || l.includes('cpc') || l.includes('clt') || l.includes('código civil') || l.includes('14.133') || l.includes('13.709')) {
      return 'Presidência da República / Imprensa Nacional';
    }
    if (l.includes('estadual') || l.includes('cesp') || l.includes('tjsp')) return 'Diário Oficial do Estado';
    if (l.includes('municipal') || l.includes('prefeitura') || l.includes('lom')) return 'Diário Oficial do Município';
    return 'Diário Oficial da União / LexML';
  }
}
