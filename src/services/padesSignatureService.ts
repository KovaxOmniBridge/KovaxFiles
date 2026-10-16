import forge from 'node-forge';
import { PDFDocument, PDFName, PDFHexString, PDFString, rgb, StandardFonts } from 'pdf-lib';

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
  byteRangeCoversEntireFile: boolean;
  digestMatches: boolean;
  rsaSignatureValid: boolean;
  certValidTemporal: boolean;
  isCryptographicallyValid: boolean;
  status: 'VALIDA' | 'ADULTERADA' | 'EXPIRADA' | 'FORMATO_INVALIDO';
  statusDescription: string;
}

export interface PadesSignatureValidationResult {
  hasSignatures: boolean;
  signatureCount: number;
  allValid: boolean;
  signatures: PadesSingleSignatureValidation[];
  summaryText: string;
}

/**
 * PadesSignatureService: Componente próprio e autêntico de assinatura digital PAdES (ISO 32000 / ETSI TS 102 778)
 * e validação criptográfica offline com suporte a certificados digitais PKCS#12 (.pfx / .p12).
 */
export class PadesSignatureService {
  /**
   * Extrai e inspeciona chave privada, certificado e metadados de um arquivo PKCS#12 (.pfx / .p12)
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
    const binary = Buffer.from(bytes).toString('binary');

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
      // Tentar tipo alternativo de chave
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

    // Detecção de CPF/CNPJ brasileiro no CN ou atributos (Padrão ICP-Brasil: "NOME:12345678900")
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
      fingerprintSha256
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
   * utilizando chave privada X.509 e contêiner CMS / PKCS#7 destacado.
   */
  static async signPdf(
    pdfBuffer: ArrayBuffer | Uint8Array,
    p12Buffer: ArrayBuffer | Uint8Array,
    password: string,
    options?: PadesSignOptions
  ): Promise<Uint8Array> {
    const { certInfo, privateKey, certificate, caCertificates } = this.parseCertificate(p12Buffer, password);

    const rawPdf = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
    const doc = await PDFDocument.load(rawPdf, { ignoreEncryption: false });

    const totalPages = doc.getPageCount();
    if (totalPages === 0) {
      throw new Error('O documento PDF não possui páginas para assinar.');
    }

    // 1. Configurar aparência visual de assinatura se habilitada
    const visual = options?.visualAppearance;
    const targetPageIndex = visual?.pageNumber ? Math.max(0, Math.min(visual.pageNumber - 1, totalPages - 1)) : (totalPages - 1);
    const targetPage = doc.getPage(targetPageIndex);
    const { width: pageWidth, height: pageHeight } = targetPage.getSize();

    let widgetRect: [number, number, number, number] = [0, 0, 0, 0];
    if (visual && visual.enabled !== false) {
      const stampW = 260;
      const stampH = 65;
      let stampX = pageWidth - stampW - 20;
      let stampY = 20;

      if (visual.position === 'bottom-left') {
        stampX = 20;
        stampY = 20;
      } else if (visual.position === 'top-right') {
        stampX = pageWidth - stampW - 20;
        stampY = pageHeight - stampH - 20;
      } else if (visual.rect) {
        stampX = visual.rect[0];
        stampY = visual.rect[1];
      }

      widgetRect = [stampX, stampY, stampX + stampW, stampY + stampH];

      // Desenhar moldura visual da assinatura na página
      const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

      targetPage.drawRectangle({
        x: stampX,
        y: stampY,
        width: stampW,
        height: stampH,
        borderColor: rgb(0.12, 0.25, 0.45),
        borderWidth: 1.2,
        color: rgb(0.97, 0.98, 1.0)
      });

      targetPage.drawText('ASSINADO DIGITALMENTE (PADES / ICP)', {
        x: stampX + 8,
        y: stampY + stampH - 14,
        size: 7.5,
        font: fontBold,
        color: rgb(0.08, 0.2, 0.4)
      });

      const signerDisplay = certInfo.commonName.length > 38 ? certInfo.commonName.substring(0, 36) + '...' : certInfo.commonName;
      targetPage.drawText(`Titular: ${signerDisplay}`, {
        x: stampX + 8,
        y: stampY + stampH - 26,
        size: 7,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1)
      });

      const certExtra = certInfo.cpfCnpj ? certInfo.cpfCnpj : `Emissor: ${certInfo.issuer.substring(0, 32)}`;
      targetPage.drawText(certExtra, {
        x: stampX + 8,
        y: stampY + stampH - 37,
        size: 6.5,
        font: fontRegular,
        color: rgb(0.25, 0.25, 0.25)
      });

      const dateStr = new Date().toLocaleString('pt-BR');
      targetPage.drawText(`Data: ${dateStr} - PAdES-BES Verificável`, {
        x: stampX + 8,
        y: stampY + stampH - 48,
        size: 6,
        font: fontRegular,
        color: rgb(0.35, 0.35, 0.35)
      });

      const reasonDisplay = options?.reason ? `Motivo: ${options.reason.substring(0, 42)}` : 'Conformidade Legal nos termos da MP 2.200-2/2001';
      targetPage.drawText(reasonDisplay, {
        x: stampX + 8,
        y: stampY + 5,
        size: 5.5,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4)
      });
    }

    // 2. Montar Dicionário /Sig e AcroForm
    const SIGNATURE_LENGTH = 8192;
    const hexPlaceholder = '0'.repeat(SIGNATURE_LENGTH * 2);

    const sigDate = new Date();
    const pdfDateStr = 'D:' + sigDate.toISOString().replace(/[-:T]/g, '').slice(0, 14) + "Z";

    // Placeholder com tamanho exato para 4 números de 10 dígitos:
    // /ByteRange [ 1000000000 1000000000 1000000000 1000000000 ]
    const byteRangeArray = doc.context.obj([
      1000000000,
      1000000000,
      1000000000,
      1000000000
    ]);

    const sigDict = doc.context.obj({
      Type: 'Sig',
      Filter: 'Adobe.PPKLite',
      SubFilter: 'adbe.pkcs7.detached',
      ByteRange: byteRangeArray,
      Contents: PDFHexString.of(hexPlaceholder),
      Reason: PDFString.of(options?.reason || 'Assinatura Digital Qualificada PAdES-BES'),
      M: PDFString.of(pdfDateStr),
      Name: PDFString.of(certInfo.commonName)
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

    // Adicionar anotação na página
    const existingAnnots = targetPage.node.Annots();
    if (existingAnnots) {
      existingAnnots.push(widgetDictRef);
    } else {
      targetPage.node.set(PDFName.of('Annots'), doc.context.obj([widgetDictRef]));
    }

    // Registrar no AcroForm
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

    // Salvar bytes sem object streams para manter a tabela xref previsível
    const initialSavedBytes = Buffer.from(await doc.save({ useObjectStreams: false }));
    const pdfString = initialSavedBytes.toString('latin1');

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

    // Substituir ByteRange in-place preservando exatamente o mesmo comprimento
    const s0 = String(o1).padStart(10, '0');
    const s1 = String(l1).padStart(10, '0');
    const s2 = String(o2).padStart(10, '0');
    const s3 = String(l2).padStart(10, '0');

    const newByteRangeStr = byteRangeMatch[0].replace(
      /1000000000\s+1000000000\s+1000000000\s+1000000000/,
      `${s0} ${s1} ${s2} ${s3}`
    );

    initialSavedBytes.write(newByteRangeStr, byteRangeMatch.index!, 'latin1');

    // 4. Calcular o SHA-256 sobre os intervalos do ByteRange
    const chunk1 = initialSavedBytes.subarray(o1, o1 + l1);
    const chunk2 = initialSavedBytes.subarray(o2, o2 + l2);

    const combinedBytes = Buffer.concat([chunk1, chunk2]).toString('binary');

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

    // Inserir a assinatura em formato hexadecimal em /Contents <hex>
    const hexSignature = Buffer.from(p7Der, 'binary').toString('hex').padEnd(SIGNATURE_LENGTH * 2, '0');
    initialSavedBytes.write(hexSignature, hexStart + 1, 'latin1');

    return new Uint8Array(initialSavedBytes);
  }

  /**
   * Realiza a auditoria e validação criptográfica completa de todas as assinaturas digitais presentes em um PDF.
   */
  static verifyPdf(pdfBuffer: ArrayBuffer | Uint8Array): PadesSignatureValidationResult {
    const rawPdf = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
    const pdfBuf = Buffer.from(rawPdf);
    const pdfString = pdfBuf.toString('latin1');

    const byteRangeRegex = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;
    let match: RegExpExecArray | null;
    const signatures: PadesSingleSignatureValidation[] = [];
    let idx = 1;

    while ((match = byteRangeRegex.exec(pdfString)) !== null) {
      const o1 = parseInt(match[1], 10);
      const l1 = parseInt(match[2], 10);
      const o2 = parseInt(match[3], 10);
      const l2 = parseInt(match[4], 10);

      const byteRange: [number, number, number, number] = [o1, l1, o2, l2];
      const byteRangeCoversEntireFile = (o2 + l2) === pdfBuf.length;

      // Extrair contexto em torno do ByteRange para campos /Name, /Reason, /M, /SubFilter
      const windowStart = Math.max(0, match.index - 1500);
      const windowEnd = Math.min(pdfString.length, match.index + 2000);
      const contextStr = pdfString.substring(windowStart, windowEnd);

      const subFilterMatch = contextStr.match(/\/SubFilter\s*\/([a-zA-Z0-9._]+)/);
      const subFilter = subFilterMatch ? subFilterMatch[1] : 'adbe.pkcs7.detached';
      const reasonMatch = contextStr.match(/\/Reason\s*(?:\(([^)]+)\)|<([0-9a-fA-F]+)>)/);
      const reason = reasonMatch ? (reasonMatch[1] || reasonMatch[2]) : undefined;
      const dateMatch = contextStr.match(/\/M\s*\(([^)]+)\)/);
      const signDate = dateMatch ? dateMatch[1] : undefined;
      const nameMatch = contextStr.match(/\/Name\s*(?:\(([^)]+)\)|<([0-9a-fA-F]+)>)/);

      // 1. Extrair os bytes assinados
      let digestMatches = false;
      let rsaSignatureValid = false;
      let certValidTemporal = false;
      let signerName = nameMatch ? (nameMatch[1] || nameMatch[2]) : 'Signatário Não Identificado';
      let signerCpfCnpj: string | undefined;
      let issuer = 'Autoridade Certificadora Desconhecida';
      let serialNumber = '';
      let status: 'VALIDA' | 'ADULTERADA' | 'EXPIRADA' | 'FORMATO_INVALIDO' = 'FORMATO_INVALIDO';
      let statusDescription = '';

      if (o1 >= 0 && l1 > 0 && o2 > 0 && l2 > 0 && (o1 + l1) <= o2 && (o2 + l2) <= pdfBuf.length) {
        const chunk1 = pdfBuf.subarray(o1, o1 + l1);
        const chunk2 = pdfBuf.subarray(o2, o2 + l2);

        const calculatedDigestHex = forge.md.sha256.create()
          .update(chunk1.toString('binary'))
          .update(chunk2.toString('binary'))
          .digest()
          .toHex();

        // 2. Extrair o conteúdo hexadecimal de /Contents <...>
        const contentsPos = pdfString.indexOf('/Contents <', o1);
        if (contentsPos !== -1) {
          const hexStart = pdfString.indexOf('<', contentsPos);
          const hexEnd = pdfString.indexOf('>', hexStart);
          if (hexStart !== -1 && hexEnd > hexStart) {
            const hexContent = pdfString.substring(hexStart + 1, hexEnd).trim();
            try {
              const rawDer = Buffer.from(hexContent, 'hex').toString('binary');
              const asn1 = forge.asn1.fromDer(rawDer, { parseAllBytes: false } as any);
              const msg = forge.pkcs7.messageFromAsn1(asn1);

              const certs = (msg as any).certificates || [];
              const signerCert = certs.length > 0 ? certs[0] : null;

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

              // Extrair messageDigest e verificar RSA
              const rawCapture = (msg as any).rawCapture;
              if (rawCapture && rawCapture.authenticatedAttributes) {
                const attrs = rawCapture.authenticatedAttributes;
                const mdAttr = attrs.find((a: any) => forge.asn1.derToOid(a.value[0].value) === forge.pki.oids.messageDigest);
                if (mdAttr) {
                  const signedDigestHex = forge.util.bytesToHex(mdAttr.value[1].value[0].value);
                  digestMatches = (calculatedDigestHex.toLowerCase() === signedDigestHex.toLowerCase());
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
                    rsaSignatureValid = signerCert.publicKey.verify(md.digest().getBytes(), rawCapture.signature);
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
      }

      const isCryptographicallyValid = digestMatches && byteRangeCoversEntireFile && rsaSignatureValid;

      if (isCryptographicallyValid) {
        if (certValidTemporal) {
          status = 'VALIDA';
          statusDescription = 'Assinatura digital válida e autêntica. O documento está íntegro e não foi alterado desde a assinatura.';
        } else {
          status = 'EXPIRADA';
          statusDescription = 'Assinatura criptograficamente íntegra, porém o certificado digital expirou sua vigência temporal.';
        }
      } else if (!byteRangeCoversEntireFile || !digestMatches) {
        status = 'ADULTERADA';
        statusDescription = 'ALERTA DE ADULTERAÇÃO: O hash do documento não confere com a assinatura ou o arquivo sofreu alterações pós-assinatura.';
      } else {
        status = 'FORMATO_INVALIDO';
        statusDescription = statusDescription || 'Não foi possível validar matematicamente os atributos da assinatura.';
      }

      signatures.push({
        index: idx++,
        signerName,
        signerCpfCnpj,
        issuer,
        serialNumber,
        signDate,
        reason,
        subFilter,
        byteRange,
        byteRangeCoversEntireFile,
        digestMatches,
        rsaSignatureValid,
        certValidTemporal,
        isCryptographicallyValid,
        status,
        statusDescription
      });
    }

    const hasSignatures = signatures.length > 0;
    const allValid = hasSignatures && signatures.every(s => s.status === 'VALIDA');
    const summaryText = hasSignatures
      ? (allValid
          ? `O documento possui ${signatures.length} assinatura(s) digital(is) PAdES plenamente VÁLIDA(S) e ÍNTEGRA(S).`
          : `O documento possui assinaturas com ressalvas ou adulteração detectada. Verifique os laudos individuais.`)
      : 'Nenhuma assinatura digital PAdES / ICP-Brasil encontrada no documento.';

    return {
      hasSignatures,
      signatureCount: signatures.length,
      allValid,
      signatures,
      summaryText
    };
  }
}
