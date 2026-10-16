import forge from 'node-forge';
import { PDFDocument, PDFName, PDFHexString, PDFString, rgb, StandardFonts } from 'pdf-lib';

// =============================================================================
// TIPOS E MODELAGEM DE CONFIANÇA JURÍDICA E INTEGRIDADE TÉCNICA
// =============================================================================

export type TechnicalIntegrityStatus = 'INTEGRO' | 'ADULTERADO' | 'FORMATO_CORROMPIDO';

export type CertificateTrustStatus =
  | 'RECONHECIDO_ICP_BRASIL'                   // Cadeia criptograficamente validada até AC Raiz confiável
  | 'INDICIOS_DE_ICP_BRASIL_CADEIA_NAO_VALIDADA' // Atributos/OIDs nominais compatíveis com ICP-Brasil, sem validação da cadeia
  | 'AUTOASSINADO'                             // Certificado autoassinado (raiz própria não reconhecida)
  | 'CONFIANCA_NAO_VERIFICADA'                 // AC privada/corporativa desconhecida
  | 'CADEIA_INCOMPLETA';                       // Falta certificado intermediário

export type RevocationStatus =
  | 'OFFLINE_NAO_VERIFICADO'      // Operação offline segura (não pôde consultar LCR/OCSP em tempo real)
  | 'NAO_DECLARADO'               // Certificado sem URLs de CRL/OCSP
  | 'REVOGADO'                    // Confirmado revogado
  | 'VALIDO';                     // Confirmado não revogado

export type TimestampType =
  | 'HORARIO_DECLARADO_LOCAL'     // Hora informada pelo computador do signatário (não auditável)
  | 'CARIMBO_DO_TEMPO_RFC3161';   // Token RFC 3161 emitido por ACT credenciada

export type LegalSignatureType =
  | 'QUALIFICADA_ICP_BRASIL'   // Emitida por Autoridade Certificadora credenciada na ICP-Brasil com cadeia raiz validada (MP 2.200-2/2001 e Lei 14.063/2020)
  | 'AVANCADA_NAO_ICP'         // Criptografia assimétrica válida, emitida por AC corporativa/privada ou com cadeia não validada (Lei 14.063/2020)
  | 'INVALIDA';                // Assinatura com adulteração de bytes ou quebra matemática

export interface CertificateChainNode {
  subject: string;
  issuer: string;
  serialNumber: string;
  notBefore: Date;
  notAfter: Date;
  isSelfSigned: boolean;
  isIcpBrasil: boolean;
  hasIcpBrasilClues?: boolean;
  fingerprintSha256: string;
}

export interface Pkcs12CertificateInfo {
  commonName: string;
  organization: string;
  country: string;
  cpfCnpj?: string;
  issuer: string;
  serialNumber: string;
  notBefore: Date;
  notAfter: Date;
  isValidTemporal: boolean;
  fingerprintSha256: string;
  // Campos de Confiança Jurídica e Distinção de Integridade Técnica
  isSelfSigned: boolean;
  isIcpBrasil: boolean;
  hasIcpBrasilClues?: boolean;
  trustStatus: CertificateTrustStatus;
  legalSignatureType: LegalSignatureType;
  hasLegalPresumption: boolean;
  legalClassificationText: string;
  legalBasis: string;
  juridicalWarning?: string;
  hasCrlOrOcspDeclared: boolean;
}

export interface PadesVisualAppearanceOptions {
  enabled: boolean;
  pageNumber?: number; // 1-indexed, default: última página
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'custom';
  rect?: [number, number, number, number]; // [x, y, width, height]
  customText?: string;
}

export interface PadesSignOptions {
  reason?: string;
  location?: string;
  contactInfo?: string;
  visualAppearance?: PadesVisualAppearanceOptions;
}

export interface PadesSingleSignatureValidation {
  index: number;
  fieldName?: string;
  signerName: string;
  signerCpfCnpj?: string;
  issuer: string;
  serialNumber: string;
  signDate?: string;
  reason?: string;
  location?: string;
  subFilter: string;
  byteRange: [number, number, number, number];

  // 1. Integridade Técnica dos Bytes e Revisões Incrementais
  byteRangeCoversEntireFile: boolean;
  byteRangeCoversRevision: boolean;
  revisionIndex: number;
  totalRevisions: number;
  revisionBytes: number;
  isIncrementalRevision: boolean;
  digestMatches: boolean;
  rsaSignatureValid: boolean;
  technicalIntegrity: TechnicalIntegrityStatus;
  isCryptographicallyValid: boolean;
  status: 'VALIDA' | 'ADULTERADA' | 'EXPIRADA' | 'FORMATO_INVALIDO';
  statusDescription: string;

  // 2. Confiança do Certificado e Cadeia
  trustStatus: CertificateTrustStatus;
  isSelfSigned: boolean;
  isIcpBrasil: boolean;
  hasLegalPresumption: boolean;
  legalSignatureType: LegalSignatureType;
  legalClassificationText: string;
  legalBasis: string;
  juridicalWarning?: string;
  certificateChain: CertificateChainNode[];
  chainValidationDescription: string;

  // 3. Tempo e Carimbo
  timestampType: TimestampType;
  hasTrustedTimestamp: boolean;
  declaredSigningTime?: string;
  trustedTimestampTime?: string;
  trustedTimestampIssuer?: string;
  certValidTemporal: boolean;
  certValidAtSigningTime: boolean;
  timeValidationDescription: string;

  // 4. Revogação
  revocationStatus: RevocationStatus;
  revocationDescription: string;

  // 5. Interoperabilidade VALIDAR do ITI
  validarItiUrl: string;
  interoperabilitySummary: string;
}

export interface PadesSignatureValidationResult {
  hasSignatures: boolean;
  signatureCount: number;
  allValid: boolean;
  signatures: PadesSingleSignatureValidation[];
  summaryText: string;
  technicalSummaryText: string;
  legalSummaryText: string;
  trustSummaryText: string;
  revocationSummaryText: string;
  incrementalRevisionsSummaryText: string;
  validarItiGuidance: string;
}

// =============================================================================
// UTILITÁRIOS PUROS DE BYTES (COMPATÍVEIS COM NAVEGADOR / ELECTRON SEM BUFFER)
// =============================================================================

function uint8ArrayToLatin1(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.length;
  const CHUNK_SIZE = 8192;
  for (let i = 0; i < len; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return binary;
}

function latin1ToUint8Array(latin1: string): Uint8Array {
  const len = latin1.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = latin1.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function uint8ArrayToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

// =============================================================================
// SERVIÇO PADES DE ASSINATURA E VALIDAÇÃO DE CONFIANÇA
// =============================================================================

export class PadesSignatureService {
  /**
   * Detecta se um certificado apresenta atributos autodeclarados (OIDs 2.16.76.1.*, nomes de emissor
   * como "ICP-Brasil", "AC Certisign", etc.) compatíveis com a Infraestrutura de Chaves Públicas Brasileira.
   *
   * IMPORTANTE: Esta detecção indica apenas INDÍCIOS NOMINAIS declarados pelo emissor no próprio certificado.
   * Não comprova cadeia criptográfica confiável nem ancoragem em Autoridade Certificadora Raiz credenciada,
   * pois tais campos podem ser reproduzidos por certificados autoassinados ou forjados.
   * Sob nenhuma hipótese atribui presunção legal qualificada sem ancoragem em AC Raiz confiável.
   */
  static detectIcpBrasilChain(
    issuer: string,
    subject: string,
    cert?: forge.pki.Certificate | null
  ): { hasIcpBrasilClues: boolean; isIcpBrasil: boolean; identifiedIssuer?: string; matchedOid?: string } {
    let fullIssuer = issuer || '';
    let fullSubject = subject || '';

    if (cert) {
      if (cert.issuer && Array.isArray((cert.issuer as any).attributes)) {
        fullIssuer += ' ' + (cert.issuer as any).attributes.map((a: any) => `${a.name || a.shortName}=${a.value}`).join('; ');
      }
      if (cert.subject && Array.isArray((cert.subject as any).attributes)) {
        fullSubject += ' ' + (cert.subject as any).attributes.map((a: any) => `${a.name || a.shortName}=${a.value}`).join('; ');
      }

      if (cert.extensions) {
        for (const ext of cert.extensions) {
          if (ext.id && ext.id.startsWith('2.16.76.1.')) {
            return { hasIcpBrasilClues: true, isIcpBrasil: true, identifiedIssuer: issuer, matchedOid: ext.id };
          }
        }
      }
    }

    const normIssuer = fullIssuer.toLowerCase().replace(/autoridade\s+certificadora/g, 'ac');
    const normSubject = fullSubject.toLowerCase().replace(/autoridade\s+certificadora/g, 'ac');

    if (
      normIssuer.includes('icp-brasil') ||
      normIssuer.includes('ac raiz brasileira') ||
      normSubject.includes('icp-brasil')
    ) {
      return { hasIcpBrasilClues: true, isIcpBrasil: true, identifiedIssuer: issuer };
    }

    const icpCas = [
      'ac certisign', 'ac serasa', 'ac soluti', 'ac oab', 'ac valid', 'ac serpro',
      'ac imprensa oficial', 'ac notarial', 'ac caixa', 'ac digitalsign', 'ac safeweb',
      'ac prodemge', 'ac prodesp', 'ac jus', 'ac defensoria', 'ac casa da moeda',
      'ac presidencia', 'ac mpt', 'ac mpf', 'ac sincor', 'ac syngular', 'ac videovr',
      'ac cdl', 'ac fenacon', 'ac fiesp', 'ac sinoreg'
    ];

    for (const ca of icpCas) {
      if (normIssuer.includes(ca)) {
        return { hasIcpBrasilClues: true, isIcpBrasil: true, identifiedIssuer: issuer };
      }
    }

    return { hasIcpBrasilClues: false, isIcpBrasil: false };
  }

  /**
   * Extrai e inspeciona chave privada, certificado e metadados de um arquivo PKCS#12 (.pfx / .p12)
   * Executa puramente com TypedArrays, sem depender do Node.js Buffer.
   */
  static parseCertificate(
    p12Buffer: ArrayBuffer | Uint8Array,
    password: string
  ): {
    certInfo: Pkcs12CertificateInfo;
    privateKey: forge.pki.rsa.PrivateKey;
    certificate: forge.pki.Certificate;
    caCertificates: forge.pki.Certificate[];
  } {
    const bytes = p12Buffer instanceof Uint8Array ? p12Buffer : new Uint8Array(p12Buffer);
    const binary = uint8ArrayToLatin1(bytes);

    let p12Asn1: forge.asn1.Asn1;
    try {
      p12Asn1 = forge.asn1.fromDer(binary);
    } catch {
      throw new Error('O arquivo fornecido não é um certificado digital PKCS#12 (.pfx ou .p12) válido.');
    }

    let p12: forge.pkcs12.Pkcs12Pfx;
    try {
      p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
    } catch (err: any) {
      throw new Error(`Senha incorreta do certificado digital ou arquivo criptografado com algoritmo incompatível: ${err?.message || String(err)}`);
    }

    // Extrair chave privada
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    const key = keyBag ? (keyBag.key as forge.pki.rsa.PrivateKey) : null;

    if (!key) {
      const altKeyBags = p12.getBags({ bagType: forge.pki.oids.keyBag });
      const altKey = altKeyBags[forge.pki.oids.keyBag]?.[0]?.key as forge.pki.rsa.PrivateKey;
      if (!altKey) {
        throw new Error('Nenhuma chave privada RSA encontrada dentro do certificado PKCS#12 fornecido.');
      }
    }
    const privateKey = (key || (p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0]?.key)) as forge.pki.rsa.PrivateKey;

    // Extrair certificados
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
    if (certBags.length === 0) {
      throw new Error('Nenhum certificado X.509 localizado dentro do pacote PKCS#12.');
    }

    const allCerts = certBags.map(b => b.cert!).filter(Boolean);
    const mainCert = allCerts[0];
    const caCerts = allCerts.slice(1);

    const cn = mainCert.subject.getField('CN')?.value as string || 'Titular Desconhecido';
    const o = mainCert.subject.getField('O')?.value as string || '';
    const c = mainCert.subject.getField('C')?.value as string || 'BR';
    const issuerCn = mainCert.issuer.getField('CN')?.value as string || 'Autoridade Certificadora';

    // Detecção de CPF/CNPJ brasileiro no CN
    let cpfCnpj: string | undefined;
    const cpfMatch = cn.match(/:(\d{11})$/);
    const cnpjMatch = cn.match(/:(\d{14})$/);
    if (cpfMatch) {
      const d = cpfMatch[1];
      cpfCnpj = `CPF: ${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
    } else if (cnpjMatch) {
      const d = cnpjMatch[1];
      cpfCnpj = `CNPJ: ${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
    }

    const notBefore = mainCert.validity.notBefore;
    const notAfter = mainCert.validity.notAfter;
    const now = new Date();
    const isValidTemporal = now >= notBefore && now <= notAfter;

    // Fingerprint SHA-256 do certificado
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(mainCert)).getBytes();
    const fpMd = forge.md.sha256.create().update(certDer);
    const fingerprintSha256 = fpMd.digest().toHex();

    // Verificação de autoassinatura
    let isSelfSigned = (cn === issuerCn);
    try {
      if (mainCert.verify(mainCert)) {
        isSelfSigned = true;
      }
    } catch {}

    // Avaliação de Confiança Jurídica (ICP-Brasil vs Avançada Lei 14.063/2020)
    // REQUISITO FORENSE CRÍTICO: Atributos declarados no certificado (OIDs 2.16.76.1.* ou nomes de ACs)
    // constituem meros indícios nominais. Sem validação criptográfica completa até uma Autoridade
    // Certificadora Raiz confiável, a aplicação NÃO deve atribuir 'RECONHECIDO_ICP_BRASIL',
    // 'QUALIFICADA_ICP_BRASIL' ou presunção legal absoluta.
    const icpCheck = PadesSignatureService.detectIcpBrasilChain(issuerCn, cn, mainCert);
    const hasIcpBrasilClues = (icpCheck.hasIcpBrasilClues || icpCheck.isIcpBrasil) && !isSelfSigned;

    let trustStatus: CertificateTrustStatus = 'CONFIANCA_NAO_VERIFICADA';
    if (isSelfSigned) {
      trustStatus = 'AUTOASSINADO';
    } else if (hasIcpBrasilClues) {
      // Classificação forense estrita: indícios declarados presentes, mas sem cadeia raiz validada
      trustStatus = 'INDICIOS_DE_ICP_BRASIL_CADEIA_NAO_VALIDADA';
    } else {
      trustStatus = 'CONFIANCA_NAO_VERIFICADA';
    }

    // Sem validação até raiz confiável da ICP-Brasil, a classificação legal é Avançada (Lei 14.063/2020)
    const legalSignatureType: LegalSignatureType = 'AVANCADA_NAO_ICP';
    const hasLegalPresumption = false;
    const isIcpBrasil = false; // Cadeia não validada na raiz oficial

    const legalClassificationText = hasIcpBrasilClues
      ? 'Assinatura com Indícios de ICP-Brasil (Cadeia Não Validada)'
      : (isSelfSigned ? 'Assinatura Avançada (Autoassinada - Raiz Própria)' : 'Assinatura Eletrônica Avançada (Não-ICP-Brasil)');

    const legalBasis = hasIcpBrasilClues
      ? 'Art. 10, § 2º da Medida Provisória nº 2.200-2/2001 e Art. 4º, II da Lei nº 14.063/2020 (Validade qualificada requer conferência no VALIDAR do ITI)'
      : (isSelfSigned
          ? 'Art. 10, § 2º da Medida Provisória nº 2.200-2/2001 e Art. 4º, II da Lei nº 14.063/2020'
          : 'Art. 10, § 2º da Medida Provisória nº 2.200-2/2001 e Art. 4º, II da Lei nº 14.063/2020');

    let juridicalWarning: string | undefined;
    if (isSelfSigned) {
      juridicalWarning = 'Atenção jurídica: Integridade criptográfica confirmada; confiança do certificado não verificada. O certificado utilizado é autoassinado. A criptografia funciona matematicamente, mas não possui vínculo com Autoridade Certificadora credenciada nem presunção legal de veracidade perante a ICP-Brasil apenas porque a matemática confere.';
    } else if (hasIcpBrasilClues) {
      juridicalWarning = 'Aviso de Confiança Jurídica: O certificado apresenta atributos declarados compatíveis com o padrão ICP-Brasil (OIDs ou nomes de emissores), mas a cadeia criptográfica NÃO foi validada contra uma Autoridade Certificadora Raiz confiável. A assinatura confere integridade técnica (ISO 32000), mas a presunção legal qualificada (art. 10, § 1º da MP 2.200-2/2001) não pode ser presumida sem validação no serviço VALIDAR do ITI (https://validar.iti.gov.br).';
    } else {
      juridicalWarning = 'Aviso de Confiança Jurídica: Integridade criptográfica confirmada; confiança do certificado não verificada. Este certificado proporciona integridade técnica criptográfica (padrão ISO 32000), mas não integra a cadeia oficial da ICP-Brasil. Conforme a Lei 14.063/2020, sua eficácia depende de prévia aceitação entre as partes, não possuindo presunção legal absoluta para peticionamento em tribunais que exijam assinatura qualificada (Lei 11.419/2006).';
    }

    const hasCrlOrOcspDeclared = !!(
      (mainCert as any).getExtension?.('cRLDistributionPoints') ||
      (mainCert as any).getExtension?.('authorityInfoAccess')
    );

    const certInfo: Pkcs12CertificateInfo = {
      commonName: cn,
      organization: o,
      country: c,
      cpfCnpj,
      issuer: issuerCn,
      serialNumber: mainCert.serialNumber,
      notBefore,
      notAfter,
      isValidTemporal,
      fingerprintSha256,
      isSelfSigned,
      isIcpBrasil,
      hasIcpBrasilClues,
      trustStatus,
      legalSignatureType,
      hasLegalPresumption,
      legalClassificationText,
      legalBasis,
      juridicalWarning,
      hasCrlOrOcspDeclared
    };

    return {
      certInfo,
      privateKey,
      certificate: mainCert,
      caCertificates: caCerts
    };
  }

  /**
   * Assina digitalmente um arquivo PDF nos padrões ISO 32000-1 / ETSI PAdES-BES
   * com contêiner CMS / PKCS#7 destacado.
   * Totalmente compatível com navegador e Electron (usa apenas TypedArrays).
   */
  static async signPdf(
    pdfBuffer: ArrayBuffer | Uint8Array,
    p12Buffer: ArrayBuffer | Uint8Array,
    password: string,
    options?: PadesSignOptions
  ): Promise<Uint8Array> {
    const rawPdfBytes = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
    const { certificate, privateKey, caCertificates, certInfo } = this.parseCertificate(p12Buffer, password);

    // Se o documento já contiver assinaturas digitais, assinar incrementalmente (ISO 32000-1 § 7.5.6)
    // para preservar os bytes e a validade jurídica das assinaturas precedentes.
    const pdfStringCheck = uint8ArrayToLatin1(rawPdfBytes);
    const hasExistingSignatures = /\/ByteRange\s*\[/.test(pdfStringCheck);
    if (hasExistingSignatures) {
      return this.signPdfIncremental(rawPdfBytes, certificate, privateKey, caCertificates, certInfo, options);
    }

    const doc = await PDFDocument.load(rawPdfBytes, { ignoreEncryption: true });
    const pageCount = doc.getPageCount();
    if (pageCount === 0) {
      throw new Error('O documento PDF fornecido não possui páginas válidas para assinatura.');
    }

    // 1. Configurar estampa visual se solicitada
    const visual = options?.visualAppearance;
    const targetPageIndex = visual?.pageNumber ? Math.max(0, Math.min(pageCount - 1, visual.pageNumber - 1)) : pageCount - 1;
    const targetPage = doc.getPage(targetPageIndex);
    const { width: pWidth } = targetPage.getSize();

    let widgetRect: [number, number, number, number] = [0, 0, 0, 0];
    if (visual?.enabled) {
      const stampW = 200;
      const stampH = 45;
      const margin = 25;

      if (visual.rect) {
        widgetRect = visual.rect;
      } else if (visual.position === 'bottom-left') {
        widgetRect = [margin, margin, stampW, stampH];
      } else if (visual.position === 'top-right') {
        widgetRect = [pWidth - stampW - margin, targetPage.getHeight() - stampH - margin, stampW, stampH];
      } else {
        widgetRect = [pWidth - stampW - margin, margin, stampW, stampH];
      }

      const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

      targetPage.drawRectangle({
        x: widgetRect[0],
        y: widgetRect[1],
        width: widgetRect[2],
        height: widgetRect[3],
        color: rgb(0.96, 0.98, 1),
        borderColor: rgb(0.2, 0.45, 0.8),
        borderWidth: 1,
        opacity: 0.92
      });

      const certLabel = certInfo.trustStatus === 'RECONHECIDO_ICP_BRASIL'
        ? 'ASSINADO DIGITALMENTE (ICP-BRASIL)'
        : (certInfo.trustStatus === 'INDICIOS_DE_ICP_BRASIL_CADEIA_NAO_VALIDADA'
            ? 'ASSINADO DIGITALMENTE (PAdES - INDÍCIOS ICP)'
            : 'ASSINADO DIGITALMENTE (PAdES)');
      targetPage.drawText(certLabel, {
        x: widgetRect[0] + 8,
        y: widgetRect[1] + 32,
        size: 7,
        font: fontBold,
        color: rgb(0.1, 0.3, 0.7)
      });

      targetPage.drawText(certInfo.commonName.substring(0, 36), {
        x: widgetRect[0] + 8,
        y: widgetRect[1] + 21,
        size: 8,
        font: fontBold,
        color: rgb(0.1, 0.15, 0.25)
      });

      const dateStr = new Date().toLocaleString('pt-BR');
      const infoLine = `${certInfo.cpfCnpj ? certInfo.cpfCnpj + ' • ' : ''}Data: ${dateStr}`;
      targetPage.drawText(infoLine, {
        x: widgetRect[0] + 8,
        y: widgetRect[1] + 10,
        size: 6.5,
        font: fontRegular,
        color: rgb(0.3, 0.35, 0.45)
      });
    }

    // 2. Criar dicionário de assinatura PDF
    const SIGNATURE_LENGTH = 11264;
    const placeholderContents = PDFHexString.of('0'.repeat(SIGNATURE_LENGTH * 2));
    const placeholderByteRange = [
      1000000000, 1000000000, 1000000000, 1000000000
    ];

    const sigDate = new Date();
    const sigDict = doc.context.obj({
      Type: 'Sig',
      Filter: 'Adobe.PPKLite',
      SubFilter: 'adbe.pkcs7.detached',
      ByteRange: placeholderByteRange,
      Contents: placeholderContents,
      Reason: PDFString.of(options?.reason || 'Assinatura Digital de Documento Processual'),
      M: PDFString.fromDate(sigDate)
    });

    if (options?.location) {
      sigDict.set(PDFName.of('Location'), PDFString.of(options.location));
    }
    if (options?.contactInfo) {
      sigDict.set(PDFName.of('ContactInfo'), PDFString.of(options.contactInfo));
    }

    const sigDictRef = doc.context.register(sigDict);
    const sigFieldName = `Signature_PAdES_${Date.now()}`;
    const widgetDict = doc.context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      FT: 'Sig',
      Rect: widgetRect,
      V: sigDictRef,
      T: PDFString.of(sigFieldName),
      F: 4,
      P: targetPage.ref
    });
    const widgetDictRef = doc.context.register(widgetDict);

    const existingAnnots = targetPage.node.Annots();
    if (existingAnnots) {
      existingAnnots.push(widgetDictRef);
    } else {
      targetPage.node.set(PDFName.of('Annots'), doc.context.obj([widgetDictRef]));
    }

    let acroForm = doc.catalog.get(PDFName.of('AcroForm')) as any;
    if (!acroForm) {
      const newAcroForm = doc.context.obj({
        Fields: [widgetDictRef],
        SigFlags: 3
      });
      doc.catalog.set(PDFName.of('AcroForm'), doc.context.register(newAcroForm));
    } else {
      const acroFormDict = doc.context.lookup(acroForm) as any;
      if (acroFormDict && acroFormDict.get) {
        const fields = acroFormDict.get(PDFName.of('Fields'));
        if (fields && fields.push) {
          fields.push(widgetDictRef);
        } else {
          acroFormDict.set(PDFName.of('Fields'), doc.context.obj([widgetDictRef]));
        }
        acroFormDict.set(PDFName.of('SigFlags'), doc.context.obj(3));
      }
    }

    const savedRaw = await doc.save({ useObjectStreams: false });
    const initialSavedBytes = new Uint8Array(savedRaw);
    const pdfString = uint8ArrayToLatin1(initialSavedBytes);

    // 3. Localizar posições do ByteRange e Contents
    const byteRangeRegex = /\/ByteRange\s*\[\s*1000000000\s+1000000000\s+1000000000\s+1000000000\s*\]/;
    const byteRangeMatch = pdfString.match(byteRangeRegex);
    if (!byteRangeMatch) {
      throw new Error('Falha interna ao mapear intervalo /ByteRange no PDF.');
    }

    const contentsTagPos = pdfString.indexOf('/Contents <', byteRangeMatch.index);
    if (contentsTagPos === -1) {
      throw new Error('Falha interna ao localizar tag /Contents da assinatura.');
    }
    const hexStart = pdfString.indexOf('<', contentsTagPos);
    const hexEnd = pdfString.indexOf('>', hexStart);

    const o1 = 0;
    const l1 = hexStart;
    const o2 = hexEnd + 1;
    const l2 = initialSavedBytes.length - o2;

    const s0 = String(o1).padStart(10, '0');
    const s1 = String(l1).padStart(10, '0');
    const s2 = String(o2).padStart(10, '0');
    const s3 = String(l2).padStart(10, '0');

    const newByteRangeStr = byteRangeMatch[0].replace(
      /1000000000\s+1000000000\s+1000000000\s+1000000000/,
      `${s0} ${s1} ${s2} ${s3}`
    );

    for (let i = 0; i < newByteRangeStr.length; i++) {
      initialSavedBytes[byteRangeMatch.index! + i] = newByteRangeStr.charCodeAt(i) & 0xff;
    }

    // 4. Calcular o SHA-256 sobre os intervalos do ByteRange
    const chunk1 = initialSavedBytes.subarray(o1, o1 + l1);
    const chunk2 = initialSavedBytes.subarray(o2, o2 + l2);
    const combinedBytes = uint8ArrayToLatin1(chunk1) + uint8ArrayToLatin1(chunk2);

    // 5. Criar PKCS#7 SignedData destacado com suporte aos certificados e assinatura RSA
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(combinedBytes);
    p7.addCertificate(certificate);
    for (const caCert of caCertificates) {
      p7.addCertificate(caCert);
    }

    p7.addSigner({
      key: privateKey,
      certificate,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        {
          type: forge.pki.oids.contentType,
          value: forge.pki.oids.data
        },
        {
          type: forge.pki.oids.messageDigest
        },
        {
          type: forge.pki.oids.signingTime,
          value: sigDate as any
        }
      ]
    });

    p7.sign({ detached: true });
    const p7Der = forge.asn1.toDer(p7.toAsn1()).getBytes();

    if (p7Der.length > SIGNATURE_LENGTH) {
      throw new Error(`A assinatura digital PKCS#7 gerada (${p7Der.length} bytes) excede a reserva de memória (${SIGNATURE_LENGTH} bytes).`);
    }

    const hexSignature = forge.util.bytesToHex(p7Der).padEnd(SIGNATURE_LENGTH * 2, '0');
    for (let i = 0; i < hexSignature.length; i++) {
      initialSavedBytes[hexStart + 1 + i] = hexSignature.charCodeAt(i) & 0xff;
    }

    return initialSavedBytes;
  }

  /**
   * Aplica uma assinatura digital incremental conforme ISO 32000-1 § 7.5.6 sobre um documento que já contém
   * assinaturas anteriores. Preserva os bytes e o ByteRange originais inalterados, anexando os novos objetos
   * e estendendo a cobertura de integridade técnica para a nova revisão incremental.
   */
  private static signPdfIncremental(
    originalBytes: Uint8Array,
    certificate: forge.pki.Certificate,
    privateKey: forge.pki.rsa.PrivateKey,
    caCertificates: forge.pki.Certificate[],
    certInfo: Pkcs12CertificateInfo,
    options?: PadesSignOptions
  ): Uint8Array {
    const originalStr = uint8ArrayToLatin1(originalBytes);
    const startXrefPos = originalStr.lastIndexOf('startxref');
    if (startXrefPos === -1) {
      throw new Error('PDF malformado: tag startxref não localizada para assinatura incremental.');
    }
    const sxMatch = originalStr.substring(startXrefPos).match(/startxref\s+(\d+)/);
    const prevXref = sxMatch ? parseInt(sxMatch[1], 10) : 0;

    const trailerChunk = originalStr.substring(Math.max(0, startXrefPos - 2000), startXrefPos);
    const sizeMatch = trailerChunk.match(/\/Size\s+(\d+)/);
    const maxObjNum = sizeMatch ? parseInt(sizeMatch[1], 10) : 25;

    const rootMatch = trailerChunk.match(/\/Root\s+(\d+)\s+(\d+)\s+R/);
    const rootObjNum = rootMatch ? parseInt(rootMatch[1], 10) : 2;
    const rootGenNum = rootMatch ? parseInt(rootMatch[2], 10) : 0;

    // Encontrar AcroForm no objeto Root
    const rootObjRegex = new RegExp(`\\b${rootObjNum}\\s+${rootGenNum}\\s+obj[\\s\\S]*?endobj`);
    const rootObjMatch = originalStr.match(rootObjRegex);
    const rootContent = rootObjMatch ? rootObjMatch[0] : '';
    const acroFormRefMatch = rootContent.match(/\/AcroForm\s+(\d+)\s+(\d+)\s+R/);
    const acroFormObjNum = acroFormRefMatch ? parseInt(acroFormRefMatch[1], 10) : 0;

    let existingFieldRefs = '';
    if (acroFormObjNum > 0) {
      const afRegex = new RegExp(`\\b${acroFormObjNum}\\s+\\d+\\s+obj[\\s\\S]*?endobj`);
      const afMatch = originalStr.match(afRegex);
      if (afMatch) {
        const fieldsMatch = afMatch[0].match(/\/Fields\s*\[([^\]]*)\]/);
        if (fieldsMatch) {
          existingFieldRefs = fieldsMatch[1].trim();
        }
      }
    }

    // Identificar a primeira página para associar o widget de anotação
    const pageMatch = originalStr.match(/\b(\d+)\s+0\s+obj[\s\S]*?\/Type\s*\/Page\b/);
    const pageObjNum = pageMatch ? parseInt(pageMatch[1], 10) : 4;

    const sigObjNum = maxObjNum;
    const widgetObjNum = maxObjNum + 1;
    const newAcroFormObjNum = acroFormObjNum || (maxObjNum + 2);
    const nextMaxObjNum = (acroFormObjNum ? maxObjNum + 2 : maxObjNum + 3);

    const sigFieldName = `Signature_PAdES_${Date.now()}`;
    const sigDate = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const pdfDateStr = `D:${sigDate.getUTCFullYear()}${pad(sigDate.getUTCMonth() + 1)}${pad(sigDate.getUTCDate())}${pad(sigDate.getUTCHours())}${pad(sigDate.getUTCMinutes())}${pad(sigDate.getUTCSeconds())}Z`;

    const SIGNATURE_LENGTH = 11264;
    const placeholderContents = '0'.repeat(SIGNATURE_LENGTH * 2);
    const placeholderByteRange = '/ByteRange [ 1000000000 1000000000 1000000000 1000000000 ]';

    let appendStr = '\n';
    const newObjOffsets: { num: number; offset: number }[] = [];

    // 1. Objeto Sig
    const sigObjOffset = originalBytes.length + appendStr.length;
    newObjOffsets.push({ num: sigObjNum, offset: sigObjOffset });
    appendStr += `${sigObjNum} 0 obj\n`;
    appendStr += `<<\n`;
    appendStr += `/Type /Sig\n`;
    appendStr += `/Filter /Adobe.PPKLite\n`;
    appendStr += `/SubFilter /adbe.pkcs7.detached\n`;
    appendStr += `${placeholderByteRange}\n`;
    appendStr += `/Contents <${placeholderContents}>\n`;
    appendStr += `/Reason (${options?.reason || 'Assinatura Digital de Documento Processual'})\n`;
    appendStr += `/M (${pdfDateStr})\n`;
    if (options?.location) {
      appendStr += `/Location (${options.location})\n`;
    }
    appendStr += `>>\nendobj\n\n`;

    // 2. Objeto Widget Annot
    const widgetObjOffset = originalBytes.length + appendStr.length;
    newObjOffsets.push({ num: widgetObjNum, offset: widgetObjOffset });
    appendStr += `${widgetObjNum} 0 obj\n`;
    appendStr += `<<\n`;
    appendStr += `/Type /Annot\n`;
    appendStr += `/Subtype /Widget\n`;
    appendStr += `/FT /Sig\n`;
    appendStr += `/Rect [ 25 80 200 45 ]\n`;
    appendStr += `/V ${sigObjNum} 0 R\n`;
    appendStr += `/T (${sigFieldName})\n`;
    appendStr += `/F 4\n`;
    appendStr += `/P ${pageObjNum} 0 R\n`;
    appendStr += `>>\nendobj\n\n`;

    // 3. Objeto AcroForm
    const acroObjOffset = originalBytes.length + appendStr.length;
    newObjOffsets.push({ num: newAcroFormObjNum, offset: acroObjOffset });
    const allFields = existingFieldRefs ? `${existingFieldRefs} ${widgetObjNum} 0 R` : `${widgetObjNum} 0 R`;
    appendStr += `${newAcroFormObjNum} 0 obj\n`;
    appendStr += `<<\n`;
    appendStr += `/Fields [ ${allFields} ]\n`;
    appendStr += `/SigFlags 3\n`;
    appendStr += `>>\nendobj\n\n`;

    // 4. Objeto Page atualizado (para vincular anotação nos leitores PDF)
    const pageObjRegex = new RegExp(`\\b${pageObjNum}\\s+0\\s+obj([\\s\\S]*?)endobj`);
    const pageMatchFull = originalStr.match(pageObjRegex);
    if (pageMatchFull) {
      let pContent = pageMatchFull[1].trim();
      if (pContent.startsWith('<<') && pContent.endsWith('>>')) {
        pContent = pContent.substring(2, pContent.length - 2).trim();
      }
      if (pContent.includes('/Annots')) {
        pContent = pContent.replace(/\/Annots\s*\[([^\]]*)\]/, (_m, g1) => `/Annots [ ${g1.trim()} ${widgetObjNum} 0 R ]`);
      } else {
        pContent += `\n/Annots [ ${widgetObjNum} 0 R ]`;
      }
      const pageObjOffset = originalBytes.length + appendStr.length;
      newObjOffsets.push({ num: pageObjNum, offset: pageObjOffset });
      appendStr += `${pageObjNum} 0 obj\n<<\n${pContent}\n>>\nendobj\n\n`;
    }

    // 5. XRef incremental
    const newXrefOffset = originalBytes.length + appendStr.length;
    appendStr += `xref\n`;
    newObjOffsets.sort((a, b) => a.num - b.num);
    for (const o of newObjOffsets) {
      appendStr += `${o.num} 1\n`;
      appendStr += `${String(o.offset).padStart(10, '0')} 00000 n \n`;
    }

    // 6. Trailer incremental
    appendStr += `trailer\n`;
    appendStr += `<<\n`;
    appendStr += `/Size ${nextMaxObjNum}\n`;
    appendStr += `/Root ${rootObjNum} ${rootGenNum} R\n`;
    if (prevXref > 0) {
      appendStr += `/Prev ${prevXref}\n`;
    }
    appendStr += `>>\n`;
    appendStr += `startxref\n`;
    appendStr += `${newXrefOffset}\n`;
    appendStr += `%%EOF\n`;

    const totalLength = originalBytes.length + appendStr.length;
    const fullBytes = new Uint8Array(totalLength);
    fullBytes.set(originalBytes, 0);
    for (let i = 0; i < appendStr.length; i++) {
      fullBytes[originalBytes.length + i] = appendStr.charCodeAt(i) & 0xff;
    }

    const fullStr = uint8ArrayToLatin1(fullBytes);
    const brIndex = fullStr.lastIndexOf(placeholderByteRange);
    const contentsTagPos = fullStr.indexOf('/Contents <', brIndex);
    const hexStart = fullStr.indexOf('<', contentsTagPos);
    const hexEnd = fullStr.indexOf('>', hexStart);

    const o1 = 0;
    const l1 = hexStart;
    const o2 = hexEnd + 1;
    const l2 = totalLength - o2;

    const s0 = String(o1).padStart(10, '0');
    const s1 = String(l1).padStart(10, '0');
    const s2 = String(o2).padStart(10, '0');
    const s3 = String(l2).padStart(10, '0');

    const newBrStr = `/ByteRange [ ${s0} ${s1} ${s2} ${s3} ]`;
    for (let i = 0; i < newBrStr.length; i++) {
      fullBytes[brIndex + i] = newBrStr.charCodeAt(i) & 0xff;
    }

    const chunk1 = fullBytes.subarray(o1, o1 + l1);
    const chunk2 = fullBytes.subarray(o2, o2 + l2);
    const combinedBytes = uint8ArrayToLatin1(chunk1) + uint8ArrayToLatin1(chunk2);

    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(combinedBytes);
    p7.addCertificate(certificate);
    for (const ca of caCertificates) {
      p7.addCertificate(ca);
    }
    p7.addSigner({
      key: privateKey,
      certificate,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
        { type: forge.pki.oids.messageDigest },
        { type: forge.pki.oids.signingTime, value: sigDate as any }
      ]
    });

    p7.sign({ detached: true });
    const p7Der = forge.asn1.toDer(p7.toAsn1()).getBytes();
    const hexSignature = forge.util.bytesToHex(p7Der).padEnd(SIGNATURE_LENGTH * 2, '0');
    for (let i = 0; i < hexSignature.length; i++) {
      fullBytes[hexStart + 1 + i] = hexSignature.charCodeAt(i) & 0xff;
    }

    return fullBytes;
  }

  /**
   * Realiza a auditoria forense e validação de confiança completa de todas as assinaturas PAdES presentes em um PDF.
   * Suporta múltiplas assinaturas, revisões incrementais, distinção entre horário declarado e carimbo do tempo,
   * avaliação de cadeia de certificados e conformidade com o serviço VALIDAR do ITI.
   */
  static verifyPdf(pdfBuffer: ArrayBuffer | Uint8Array): PadesSignatureValidationResult {
    const rawPdf = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
    const pdfString = uint8ArrayToLatin1(rawPdf);

    const byteRangeRegex = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;
    const allMatches: RegExpExecArray[] = [];
    let m: RegExpExecArray | null;
    while ((m = byteRangeRegex.exec(pdfString)) !== null) {
      allMatches.push(m);
    }

    const signatures: PadesSingleSignatureValidation[] = [];
    const totalRevisions = allMatches.length;

    for (let i = 0; i < allMatches.length; i++) {
      const match = allMatches[i];
      const o1 = parseInt(match[1], 10);
      const l1 = parseInt(match[2], 10);
      const o2 = parseInt(match[3], 10);
      const l2 = parseInt(match[4], 10);

      const byteRange: [number, number, number, number] = [o1, l1, o2, l2];
      const revisionBytes = o2 + l2;
      const byteRangeCoversEntireFile = (revisionBytes === rawPdf.length);
      const isIncrementalRevision = (revisionBytes < rawPdf.length);
      const byteRangeCoversRevision = (o1 === 0 && o2 > o1 + l1 && revisionBytes <= rawPdf.length);

      // Contexto em torno da assinatura (incluindo o bloco /Contents de ~22KB)
      const windowStart = Math.max(0, match.index - 2000);
      const windowEnd = Math.min(pdfString.length, match.index + 35000);
      const contextStr = pdfString.substring(windowStart, windowEnd);

      const subFilterMatch = contextStr.match(/\/SubFilter\s*\/([a-zA-Z0-9._]+)/);
      const subFilter = subFilterMatch ? subFilterMatch[1] : 'adbe.pkcs7.detached';
      const reasonMatch = contextStr.match(/\/Reason\s*(?:\(([^)]+)\)|<([0-9a-fA-F]+)>)/);
      const reason = reasonMatch ? (reasonMatch[1] || reasonMatch[2]) : undefined;
      const locationMatch = contextStr.match(/\/Location\s*(?:\(([^)]+)\)|<([0-9a-fA-F]+)>)/);
      const location = locationMatch ? (locationMatch[1] || locationMatch[2]) : undefined;
      const dateMatch = contextStr.match(/\/M\s*\(([^)]+)\)/);
      let declaredSigningTime: string | undefined = dateMatch ? dateMatch[1] : undefined;
      const nameMatch = contextStr.match(/\/Name\s*(?:\(([^)]+)\)|<([0-9a-fA-F]+)>)/);

      let digestMatches = false;
      let rsaSignatureValid = false;
      let certValidTemporal = false;
      let certValidAtSigningTime = false;
      let signerName = nameMatch ? (nameMatch[1] || nameMatch[2]) : 'Signatário Não Identificado';
      let signerCpfCnpj: string | undefined;
      let issuer = 'Autoridade Certificadora Desconhecida';
      let serialNumber = '';
      let signerCert: forge.pki.Certificate | null = null;
      let certChainNodes: CertificateChainNode[] = [];
      let hasTrustedTimestamp = false;
      let timestampType: TimestampType = 'HORARIO_DECLARADO_LOCAL';
      let trustedTimestampTime: string | undefined;
      let trustedTimestampIssuer: string | undefined;
      let statusDescription = '';

      if (o1 >= 0 && l1 > 0 && o2 > 0 && l2 > 0 && (o1 + l1) <= o2 && revisionBytes <= rawPdf.length) {
        const chunk1 = rawPdf.subarray(o1, o1 + l1);
        const chunk2 = rawPdf.subarray(o2, o2 + l2);

        const calculatedDigestHex = forge.md.sha256.create()
          .update(uint8ArrayToLatin1(chunk1))
          .update(uint8ArrayToLatin1(chunk2))
          .digest()
          .toHex();

        let hexContent = '';
        if (pdfString[l1] === '<' && pdfString[o2 - 1] === '>') {
          hexContent = pdfString.substring(l1 + 1, o2 - 1).trim();
        } else {
          const contentsPos = pdfString.indexOf('/Contents <', match.index);
          if (contentsPos !== -1) {
            const hexStart = pdfString.indexOf('<', contentsPos);
            const hexEnd = pdfString.indexOf('>', hexStart);
            if (hexStart !== -1 && hexEnd > hexStart) {
              hexContent = pdfString.substring(hexStart + 1, hexEnd).trim();
            }
          }
        }

        if (hexContent.length > 0) {
            try {
              const rawDer = forge.util.hexToBytes(hexContent);
              const asn1 = forge.asn1.fromDer(rawDer, { parseAllBytes: false } as any);
              const msg = forge.pkcs7.messageFromAsn1(asn1);

              const certs: forge.pki.Certificate[] = (msg as any).certificates || [];
              signerCert = certs.length > 0 ? certs[0] : null;

              if (signerCert) {
                signerName = signerCert.subject.getField('CN')?.value as string || signerName;
                issuer = signerCert.issuer.getField('CN')?.value as string || issuer;
                serialNumber = signerCert.serialNumber;

                const cpfMatch = signerName.match(/:(\d{11})$/);
                const cnpjMatch = signerName.match(/:(\d{14})$/);
                if (cpfMatch) {
                  const d = cpfMatch[1];
                  signerCpfCnpj = `CPF: ${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
                } else if (cnpjMatch) {
                  const d = cnpjMatch[1];
                  signerCpfCnpj = `CNPJ: ${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
                }

                const now = new Date();
                certValidTemporal = (now >= signerCert.validity.notBefore && now <= signerCert.validity.notAfter);
              }

              // Montar nós da cadeia de certificação
              for (const c of certs) {
                const cSub = c.subject.getField('CN')?.value as string || 'Desconhecido';
                const cIss = c.issuer.getField('CN')?.value as string || 'Desconhecido';
                const isSelf = cSub === cIss;
                const nodeCheck = PadesSignatureService.detectIcpBrasilChain(cIss, cSub, c);
                const hasNodeClues = nodeCheck.hasIcpBrasilClues || nodeCheck.isIcpBrasil;
                const cDer = forge.asn1.toDer(forge.pki.certificateToAsn1(c)).getBytes();
                const fp = forge.md.sha256.create().update(cDer).digest().toHex();

                certChainNodes.push({
                  subject: cSub,
                  issuer: cIss,
                  serialNumber: c.serialNumber,
                  notBefore: c.validity.notBefore,
                  notAfter: c.validity.notAfter,
                  isSelfSigned: isSelf,
                  isIcpBrasil: false, // Cadeia não validada na raiz oficial
                  hasIcpBrasilClues: hasNodeClues,
                  fingerprintSha256: fp
                });
              }

              // Extrair messageDigest e verificar RSA
              const rawCapture = (msg as any).rawCapture;
              if (rawCapture && rawCapture.authenticatedAttributes) {
                const attrs = rawCapture.authenticatedAttributes;
                const mdAttr = attrs.find((a: any) => forge.asn1.derToOid(a.value[0].value) === forge.pki.oids.messageDigest);
                if (mdAttr) {
                  const signedDigestHex = forge.util.bytesToHex(mdAttr.value[1].value[0].value);
                  digestMatches = (calculatedDigestHex.toLowerCase() === signedDigestHex.toLowerCase());
                }

                // Verificar data de assinatura nos atributos assinados (ASN.1 signingTime)
                const timeAttr = attrs.find((a: any) => forge.asn1.derToOid(a.value[0].value) === forge.pki.oids.signingTime);
                if (timeAttr) {
                  try {
                    const timeNode = timeAttr.value[1].value[0];
                    let parsedSigDate: Date | null = null;
                    if (timeNode.type === forge.asn1.Type.UTCTIME) {
                      parsedSigDate = forge.asn1.utcTimeToDate(timeNode.value);
                    } else if (timeNode.type === forge.asn1.Type.GENERALIZEDTIME) {
                      parsedSigDate = forge.asn1.generalizedTimeToDate(timeNode.value);
                    } else {
                      parsedSigDate = new Date(timeNode.value);
                    }

                    if (parsedSigDate && !isNaN(parsedSigDate.getTime())) {
                      if (signerCert) {
                        certValidAtSigningTime = (parsedSigDate >= signerCert.validity.notBefore && parsedSigDate <= signerCert.validity.notAfter);
                      }
                      if (!declaredSigningTime) {
                        declaredSigningTime = parsedSigDate.toLocaleString('pt-BR');
                      }
                    } else {
                      certValidAtSigningTime = certValidTemporal;
                    }
                  } catch {
                    certValidAtSigningTime = certValidTemporal;
                  }
                } else {
                  certValidAtSigningTime = certValidTemporal;
                }

                // Inspecionar atributos não-autenticados para Carimbo do Tempo (RFC 3161)
                const unauthAttrs = rawCapture.unauthenticatedAttributes || (msg as any).unauthenticatedAttributes || [];
                const tsAttr = unauthAttrs.find((a: any) => {
                  try {
                    return forge.asn1.derToOid(a.value[0].value) === '1.2.840.113549.1.9.16.2.14';
                  } catch {
                    return false;
                  }
                });

                if (tsAttr) {
                  hasTrustedTimestamp = true;
                  timestampType = 'CARIMBO_DO_TEMPO_RFC3161';
                  trustedTimestampIssuer = 'Autoridade de Carimbo do Tempo (ACT)';
                }

                // Validar assinatura RSA da chave pública sobre os atributos autenticados
                if (signerCert && rawCapture.signature) {
                  try {
                    const authAttrsAsn1 = forge.asn1.create(
                      forge.asn1.Class.UNIVERSAL,
                      forge.asn1.Type.SET,
                      true,
                      rawCapture.authenticatedAttributes
                    );
                    const authAttrsDer = forge.asn1.toDer(authAttrsAsn1).getBytes();
                    const md = forge.md.sha256.create().update(authAttrsDer);
                    rsaSignatureValid = (signerCert.publicKey as forge.pki.rsa.PublicKey).verify(md.digest().getBytes(), rawCapture.signature);
                  } catch {
                    rsaSignatureValid = false;
                  }
                }
              }
            } catch (err: any) {
              statusDescription = `Falha ao interpretar contêiner PKCS#7: ${err?.message || String(err)}`;
            }
          }
        }

      // 1. Integridade Técnica
      const isCryptographicallyValid = digestMatches && byteRangeCoversRevision && rsaSignatureValid;
      let technicalIntegrity: TechnicalIntegrityStatus = 'FORMATO_CORROMPIDO';
      let status: 'VALIDA' | 'ADULTERADA' | 'EXPIRADA' | 'FORMATO_INVALIDO' = 'FORMATO_INVALIDO';

      if (isCryptographicallyValid) {
        technicalIntegrity = 'INTEGRO';
        if (certValidTemporal) {
          status = 'VALIDA';
          statusDescription = isIncrementalRevision
            ? `Assinatura digital íntegra protegendo a Revisão ${i + 1} de ${totalRevisions} (bytes 0 até ${revisionBytes}).`
            : 'Assinatura digital válida e íntegra protegendo o documento completo.';
        } else {
          status = 'EXPIRADA';
          statusDescription = 'Assinatura criptograficamente íntegra, porém o certificado digital expirou sua vigência temporal.';
        }
      } else if (!byteRangeCoversRevision || !digestMatches) {
        technicalIntegrity = 'ADULTERADO';
        status = 'ADULTERADA';
        statusDescription = 'ALERTA DE ADULTERAÇÃO: O hash do documento não confere com a assinatura ou os bytes foram alterados.';
      } else {
        technicalIntegrity = 'FORMATO_CORROMPIDO';
        status = 'FORMATO_INVALIDO';
        statusDescription = statusDescription || 'Não foi possível validar matematicamente os atributos da assinatura.';
      }

      // 2. Confiança do Certificado
      let isSelfSigned = (signerName === issuer);
      if (signerCert) {
        try {
          if (signerCert.verify(signerCert)) {
            isSelfSigned = true;
          }
        } catch {}
      }

      const icpCheck = PadesSignatureService.detectIcpBrasilChain(issuer, signerName, signerCert);
      const hasIcpBrasilClues = (icpCheck.hasIcpBrasilClues || icpCheck.isIcpBrasil) && !isSelfSigned;

      let trustStatus: CertificateTrustStatus = 'CONFIANCA_NAO_VERIFICADA';
      let legalSignatureType: LegalSignatureType = 'INVALIDA';
      let hasLegalPresumption = false;
      let isIcpBrasil = false; // Cadeia não validada na raiz confiável
      let legalClassificationText = 'Assinatura Inválida / Adulterada';
      let legalBasis = 'Sem eficácia jurídica probatória (violação de integridade técnica)';
      let juridicalWarning: string | undefined;
      let chainValidationDescription = '';

      if (isCryptographicallyValid) {
        if (isSelfSigned) {
          trustStatus = 'AUTOASSINADO';
          legalSignatureType = 'AVANCADA_NAO_ICP';
          hasLegalPresumption = false;
          legalClassificationText = 'Assinatura Avançada (Autoassinada - Raiz Própria)';
          legalBasis = 'Art. 10, § 2º da Medida Provisória nº 2.200-2/2001 e Art. 4º, II da Lei nº 14.063/2020';
          chainValidationDescription = 'Certificado autoassinado. Integridade criptográfica confirmada; confiança do certificado não verificada (não possui vínculo com autoridades certificadoras credenciadas na ICP-Brasil).';
          juridicalWarning = 'Atenção jurídica: Integridade criptográfica confirmada; confiança do certificado não verificada. O certificado é autoassinado e não possui presunção legal de veracidade perante a ICP-Brasil ou tribunais apenas porque a matemática confere.';
        } else if (hasIcpBrasilClues) {
          trustStatus = 'INDICIOS_DE_ICP_BRASIL_CADEIA_NAO_VALIDADA';
          legalSignatureType = 'AVANCADA_NAO_ICP';
          hasLegalPresumption = false;
          legalClassificationText = 'Assinatura com Indícios de ICP-Brasil (Cadeia Não Validada)';
          legalBasis = 'Art. 10, § 2º da Medida Provisória nº 2.200-2/2001 e Art. 4º, II da Lei nº 14.063/2020 (Validade qualificada requer conferência no VALIDAR do ITI)';
          chainValidationDescription = 'Certificado com indícios declarados de ICP-Brasil (campos nominais/OIDs), porém a cadeia NÃO foi criptograficamente validada até uma AC Raiz confiável. A presunção legal qualificada não pode ser atribuída apenas com base em campos autodeclarados; requer conferência no VALIDAR do ITI.';
          juridicalWarning = 'Aviso de Confiança Jurídica: O certificado apresenta atributos declarados compatíveis com o padrão ICP-Brasil (OIDs ou nomes de emissores), mas a cadeia criptográfica NÃO foi validada contra uma AC Raiz confiável. A assinatura confere integridade técnica (ISO 32000), mas a presunção legal qualificada (art. 10, § 1º da MP 2.200-2/2001) não pode ser presumida sem validação no serviço VALIDAR do ITI (https://validar.iti.gov.br).';
        } else {
          trustStatus = 'CONFIANCA_NAO_VERIFICADA';
          legalSignatureType = 'AVANCADA_NAO_ICP';
          hasLegalPresumption = false;
          legalClassificationText = 'Assinatura Eletrônica Avançada (Não-ICP-Brasil)';
          legalBasis = 'Art. 10, § 2º da Medida Provisória nº 2.200-2/2001 e Art. 4º, II da Lei nº 14.063/2020';
          chainValidationDescription = 'Integridade criptográfica confirmada; confiança do certificado não verificada (não pertence à cadeia oficial ICP-Brasil).';
          juridicalWarning = 'Atenção jurídica: Integridade criptográfica confirmada; confiança do certificado não verificada. O documento possui integridade técnica criptográfica comprovada (bytes inalterados e RSA válido), porém o certificado digital não pertence à cadeia oficial ICP-Brasil. Conforme a Lei 14.063/2020 e Lei 11.419/2006, sua eficácia depende da aceitação prévia entre as partes, não possuindo presunção legal absoluta em tribunais.';
        }
      } else {
        trustStatus = 'CONFIANCA_NAO_VERIFICADA';
        legalSignatureType = 'INVALIDA';
        hasLegalPresumption = false;
        legalClassificationText = 'Assinatura Inválida / Adulterada';
        legalBasis = 'Sem eficácia jurídica';
        chainValidationDescription = 'Cadeia desconsiderada devido à falha de integridade técnica dos bytes.';
        juridicalWarning = 'ALERTA DE SEGURANÇA: Integridade técnica violada. O arquivo sofreu alterações após a assinatura ou o hash criptográfico foi corrompido.';
      }

      // 3. Tempo e Carimbo
      const timeValidationDescription = hasTrustedTimestamp
        ? 'Carimbo do Tempo oficial (RFC 3161) detectado e associado à assinatura.'
        : 'Horário local declarado pelo signatário (relógio do dispositivo). Não possui Carimbo do Tempo (Timestamp RFC 3161) emitido por Autoridade de Carimbo do Tempo (ACT).';

      // 4. Revogação
      const revocationStatus: RevocationStatus = 'OFFLINE_NAO_VERIFICADO';
      const revocationDescription = 'OFFLINE: A verificação de revogação online (CRL/OCSP) não pôde ser realizada offline. O status de revogação deve ser consultado online junto à Autoridade Certificadora ou no serviço VALIDAR do ITI (https://validar.iti.gov.br).';

      // 5. Interoperabilidade VALIDAR
      const validarItiUrl = 'https://validar.iti.gov.br';
      const interoperabilitySummary = 'Em conformidade com o padrão PAdES (ISO 32000-1) e auditável no serviço VALIDAR do ITI (https://validar.iti.gov.br).';

      signatures.push({
        index: i + 1,
        signerName,
        signerCpfCnpj,
        issuer,
        serialNumber,
        signDate: declaredSigningTime,
        reason,
        location,
        subFilter,
        byteRange,
        byteRangeCoversEntireFile,
        byteRangeCoversRevision,
        revisionIndex: i + 1,
        totalRevisions,
        revisionBytes,
        isIncrementalRevision,
        digestMatches,
        rsaSignatureValid,
        technicalIntegrity,
        isCryptographicallyValid,
        status,
        statusDescription,
        trustStatus,
        isSelfSigned,
        isIcpBrasil,
        hasLegalPresumption,
        legalSignatureType,
        legalClassificationText,
        legalBasis,
        juridicalWarning,
        certificateChain: certChainNodes,
        chainValidationDescription,
        timestampType,
        hasTrustedTimestamp,
        declaredSigningTime,
        trustedTimestampTime,
        trustedTimestampIssuer,
        certValidTemporal,
        certValidAtSigningTime,
        timeValidationDescription,
        revocationStatus,
        revocationDescription,
        validarItiUrl,
        interoperabilitySummary
      });
    }

    const hasSignatures = signatures.length > 0;
    const allValid = hasSignatures && signatures.every(s => s.status === 'VALIDA');

    const technicalSummaryText = hasSignatures
      ? (allValid
          ? `Integridade Técnica: ${signatures.length} assinatura(s) com bytes inalterados e correspondência matemática SHA-256/RSA íntegra.`
          : `Integridade Técnica: Falha ou adulteração detectada em uma ou mais assinaturas.`)
      : 'Nenhuma assinatura digital PAdES encontrada no documento.';

    const icpVerifiedCount = signatures.filter(s => s.trustStatus === 'RECONHECIDO_ICP_BRASIL' && s.status === 'VALIDA').length;
    const icpCluesCount = signatures.filter(s => s.trustStatus === 'INDICIOS_DE_ICP_BRASIL_CADEIA_NAO_VALIDADA' && s.status === 'VALIDA').length;
    const selfSignedCount = signatures.filter(s => s.trustStatus === 'AUTOASSINADO' && s.status === 'VALIDA').length;
    const advancedCount = signatures.filter(s => s.trustStatus === 'CONFIANCA_NAO_VERIFICADA' && s.status === 'VALIDA').length;

    let trustSummaryText = 'Nenhuma assinatura inspecionada.';
    let legalSummaryText = 'Sem eficácia jurídica.';

    if (hasSignatures) {
      if (allValid) {
        if (icpVerifiedCount > 0 && icpCluesCount === 0 && advancedCount === 0 && selfSignedCount === 0) {
          trustSummaryText = 'Confiança: Certificado(s) da cadeia oficial ICP-Brasil com âncora de raiz validada.';
          legalSummaryText = 'Validade Jurídica: Assinatura(s) Eletrônica(s) Qualificada(s) ICP-Brasil com presunção legal de veracidade (MP 2.200-2/2001, art. 10, § 1º).';
        } else if (icpCluesCount > 0 && icpVerifiedCount === 0 && advancedCount === 0 && selfSignedCount === 0) {
          trustSummaryText = `Confiança: ${icpCluesCount} certificado(s) com indícios de ICP-Brasil (cadeia não validada contra AC Raiz confiável).`;
          legalSummaryText = 'Validade Jurídica: Assinatura Eletrônica Avançada (Lei 14.063/2020). Presunção de Qualificada ICP-Brasil depende de validação no VALIDAR do ITI.';
        } else if (selfSignedCount > 0 && icpVerifiedCount === 0 && icpCluesCount === 0 && advancedCount === 0) {
          trustSummaryText = 'Confiança: Certificado autoassinado (raiz própria não reconhecida; confiança não verificada).';
          legalSummaryText = 'Validade Jurídica: Integridade criptográfica confirmada; confiança do certificado não verificada (não possui presunção legal em tribunais).';
        } else if (advancedCount > 0 && icpVerifiedCount === 0 && icpCluesCount === 0 && selfSignedCount === 0) {
          trustSummaryText = `Confiança: ${advancedCount} certificado(s) com AC não verificada (Avançada não-ICP).`;
          legalSummaryText = 'Validade Jurídica: Assinatura Eletrônica Avançada (Lei 14.063/2020, art. 4º, II). Requer aceitação prévia entre as partes.';
        } else {
          const parts: string[] = [];
          if (icpVerifiedCount > 0) parts.push(`${icpVerifiedCount} ICP Validada`);
          if (icpCluesCount > 0) parts.push(`${icpCluesCount} Indício(s) ICP`);
          if (advancedCount > 0) parts.push(`${advancedCount} Avançada(s) não-ICP`);
          if (selfSignedCount > 0) parts.push(`${selfSignedCount} Autoassinada(s)`);
          trustSummaryText = `Confiança: ${parts.join(', ')}.`;
          legalSummaryText = 'Validade Jurídica: Assinatura(s) Eletrônica(s) Avançada(s) (Lei 14.063/2020). Requer aceitação entre as partes ou validação no VALIDAR do ITI.';
        }
      } else {
        trustSummaryText = 'Confiança: Comprometida por falha ou adulteração de integridade.';
        legalSummaryText = 'Validade Jurídica: Documento com assinaturas adulteradas ou inválidas, desprovido de eficácia jurídica.';
      }
    }

    const revocationSummaryText = 'Revogação: Não verificada em modo offline (consulte a AC ou o serviço VALIDAR do ITI).';
    const incrementalRevisionsSummaryText = totalRevisions > 1
      ? `Revisões Incrementais: Documento possui ${totalRevisions} assinatura(s) em ${totalRevisions} revisão(ões) incremental(is) sucessiva(s).`
      : 'Revisões: Assinatura única protegendo o documento.';

    const validarItiGuidance = 'Para homologação oficial de conformidade e verificação online de revogação LCR/OCSP pelo Governo Federal, submeta este arquivo ao serviço VALIDAR do ITI: https://validar.iti.gov.br';

    const summaryText = hasSignatures
      ? (allValid
          ? `O documento possui ${signatures.length} assinatura(s) digital(is) PAdES com integridade criptográfica e resumo (/ByteRange) verificados. ${legalSummaryText}`
          : `O documento possui assinaturas com ressalvas ou adulteração detectada. Verifique os laudos individuais.`)
      : 'Nenhuma assinatura digital PAdES / ICP-Brasil encontrada no documento.';

    return {
      hasSignatures,
      signatureCount: signatures.length,
      allValid,
      signatures,
      summaryText,
      technicalSummaryText,
      legalSummaryText,
      trustSummaryText,
      revocationSummaryText,
      incrementalRevisionsSummaryText,
      validarItiGuidance
    };
  }
}
