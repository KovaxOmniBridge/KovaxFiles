import { LegalArticle } from '../services/legalKnowledgeBaseService';

/**
 * Acervo Integral de Súmulas Vinculantes do Supremo Tribunal Federal (1 a 62)
 *
 * Princípios de Custódia e Auditoria Factual:
 * 1. Publicação oficial identificada (Plenário do STF, DJe, processo PSV)
 * 2. Cópia ou captura verificável da fonte:
 *    - Registros sem captura física documentada e arquivada são rotulados como 'NAO_VERIFICADO_EXTERNAMENTE'.
 *    - O hash do conteúdo local NUNCA é copiado para o campo de fonte externa.
 *    - Datas de captura presumidas foram integralmente removidas (a data de publicação não é a data de captura).
 * 3. Súmula Vinculante 30: mantida sob 'SUSPENSO_PREVENTIVAMENTE' por suspensão formal no STF (PSV 30).
 * 4. Apenas processos de ingestão com snapshot oficial bruto comprovam autenticidade ('COMPROVADO_COM_EVIDENCIA').
 */
export const JURISPRUDENCE_STATUTES: LegalArticle[] = [
  {
    "id": "stf-sv-1",
    "lawName": "STF - Súmula Vinculante 1",
    "article": "Súmula Vinculante 1",
    "title": "Eficácia de Acordo de Adesão do FGTS (LC 110/2001) e Coisa Julgada",
    "content": "Ofende a garantia constitucional do ato jurídico perfeito a decisão que, sem ponderar as circunstâncias do caso concreto, desconsidera a validez e a eficácia de acordo constante de termo de adesão instituído pela Lei Complementar nº 110/2001.",
    "keywords": [
      "fgts",
      "termo de adesão",
      "lei complementar 110/2001",
      "coisa julgada",
      "ato jurídico perfeito",
      "stf",
      "súmula vinculante 1"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/801",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 31/2007, p. 1",
    "queryDate": "2007-06-06",
    "version": "Publicação Oficial Consolidada no DJe nº 31/2007, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2007;1",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 31/2007, p. 1",
        "publicationDate": "2007-06-06",
        "actNumber": "Súmula Vinculante 1",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2007;1",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/801",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 242,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 31/2007, p. 1",
        "canonicalText": "Ofende a garantia constitucional do ato jurídico perfeito a decisão que, sem ponderar as circunstâncias do caso concreto, desconsidera a validez e a eficácia de acordo constante de termo de adesão instituído pela Lei Complementar nº 110/2001.",
        "storedContentHash": "6258df6579af040c039ab625f8cdfc329898c3ff9784b8b9e9a8a27b1b05a048",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-2",
    "lawName": "STF - Súmula Vinculante 2",
    "article": "Súmula Vinculante 2",
    "title": "Inconstitucionalidade de Normas Estaduais sobre Consórcios, Sorteios e Loterias",
    "content": "É inconstitucional a lei ou ato normativo estadual ou distrital que disponha sobre sistemas de consórcios e sorteios, inclusive bingos e loterias.",
    "keywords": [
      "consórcios",
      "sorteios",
      "bingos",
      "loterias",
      "competência privativa",
      "inconstitucionalidade",
      "stf",
      "súmula vinculante 2"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/802",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 31/2007, p. 1",
    "queryDate": "2007-06-06",
    "version": "Publicação Oficial Consolidada no DJe nº 31/2007, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2007;2",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 31/2007, p. 1",
        "publicationDate": "2007-06-06",
        "actNumber": "Súmula Vinculante 2",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2007;2",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/802",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 146,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 31/2007, p. 1",
        "canonicalText": "É inconstitucional a lei ou ato normativo estadual ou distrital que disponha sobre sistemas de consórcios e sorteios, inclusive bingos e loterias.",
        "storedContentHash": "ce2dee51e4fd3ba37f4eefe4a699b9ded567f464803a227a9020e219f6f0d338",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-3",
    "lawName": "STF - Súmula Vinculante 3",
    "article": "Súmula Vinculante 3",
    "title": "Contraditório e Ampla Defesa no Tribunal de Contas da União (TCU)",
    "content": "Nos processos perante o Tribunal de Contas da União (TCU) asseguram-se o contraditório e a ampla defesa quando da decisão puder resultar anulação ou revogação de ato administrativo que beneficie o interessado, excetuada a apreciação da legalidade do ato de concessão inicial de aposentadoria, reforma e pensão.",
    "keywords": [
      "tcu",
      "tribunal de contas da união",
      "contraditório",
      "ampla defesa",
      "aposentadoria",
      "pensão",
      "stf",
      "súmula vinculante 3"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/803",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 31/2007, p. 1",
    "queryDate": "2007-06-06",
    "version": "Publicação Oficial Consolidada no DJe nº 31/2007, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2007;3",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 31/2007, p. 1",
        "publicationDate": "2007-06-06",
        "actNumber": "Súmula Vinculante 3",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2007;3",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/803",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 310,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 31/2007, p. 1",
        "canonicalText": "Nos processos perante o Tribunal de Contas da União (TCU) asseguram-se o contraditório e a ampla defesa quando da decisão puder resultar anulação ou revogação de ato administrativo que beneficie o interessado, excetuada a apreciação da legalidade do ato de concessão inicial de aposentadoria, reforma e pensão.",
        "storedContentHash": "8f4ccbfa8b70f4d151e7ca5903ac80a1f646fc49e78927d10bc186c32c8e6c67",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-4",
    "lawName": "STF - Súmula Vinculante 4",
    "article": "Súmula Vinculante 4",
    "title": "Vedação ao Salário Mínimo como Indexador de Vantagem de Servidor ou Empregado",
    "content": "Salvo nos casos previstos na Constituição, o salário mínimo não pode ser usado como indexador de base de cálculo de vantagem de servidor público ou de empregado, nem ser substituído por decisão judicial.",
    "keywords": [
      "salário mínimo",
      "indexador",
      "base de cálculo",
      "vantagem",
      "servidor público",
      "stf",
      "súmula vinculante 4"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/804",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 83/2008, p. 1",
    "queryDate": "2008-05-09",
    "version": "Publicação Oficial Consolidada no DJe nº 83/2008, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;4",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 83/2008, p. 1",
        "publicationDate": "2008-05-09",
        "actNumber": "Súmula Vinculante 4",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;4",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/804",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 203,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 83/2008, p. 1",
        "canonicalText": "Salvo nos casos previstos na Constituição, o salário mínimo não pode ser usado como indexador de base de cálculo de vantagem de servidor público ou de empregado, nem ser substituído por decisão judicial.",
        "storedContentHash": "c7805ec45645290c7e9a989f9d76d1c972315f757af2f1620d2f753502d71b3b",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-5",
    "lawName": "STF - Súmula Vinculante 5",
    "article": "Súmula Vinculante 5",
    "title": "Desnecessidade de Defesa Técnica por Advogado em Processo Administrativo Disciplinar (PAD)",
    "content": "A falta de defesa técnica por advogado no processo administrativo disciplinar não ofende a Constituição.",
    "keywords": [
      "pad",
      "processo administrativo disciplinar",
      "advogado",
      "defesa técnica",
      "ampla defesa",
      "stf",
      "súmula vinculante 5"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/805",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 88/2008, p. 1",
    "queryDate": "2008-05-16",
    "version": "Publicação Oficial Consolidada no DJe nº 88/2008, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;5",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 88/2008, p. 1",
        "publicationDate": "2008-05-16",
        "actNumber": "Súmula Vinculante 5",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;5",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/805",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 104,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 88/2008, p. 1",
        "canonicalText": "A falta de defesa técnica por advogado no processo administrativo disciplinar não ofende a Constituição.",
        "storedContentHash": "7cb6ebd36d56f4100da7c7178529754cc1454102a47851febd595693bddc6023",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-6",
    "lawName": "STF - Súmula Vinculante 6",
    "article": "Súmula Vinculante 6",
    "title": "Constitucionalidade de Remuneração Inferior ao Salário Mínimo para Serviço Militar Inicial",
    "content": "Não viola a Constituição o estabelecimento de remuneração inferior ao salário mínimo para as praças prestadoras de serviço militar inicial.",
    "keywords": [
      "serviço militar inicial",
      "praças",
      "salário mínimo",
      "forças armadas",
      "remuneração militar",
      "stf",
      "súmula vinculante 6"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/806",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 88/2008, p. 1",
    "queryDate": "2008-05-16",
    "version": "Publicação Oficial Consolidada no DJe nº 88/2008, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;6",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 88/2008, p. 1",
        "publicationDate": "2008-05-16",
        "actNumber": "Súmula Vinculante 6",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;6",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/806",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 139,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 88/2008, p. 1",
        "canonicalText": "Não viola a Constituição o estabelecimento de remuneração inferior ao salário mínimo para as praças prestadoras de serviço militar inicial.",
        "storedContentHash": "acdce98aae85fa08132df522f1a0f91f34a51647a41b9332c08d62143f4a8f78",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-7",
    "lawName": "STF - Súmula Vinculante 7",
    "article": "Súmula Vinculante 7",
    "title": "Eficácia Limitada do Artigo 192, § 3º da CF/88 (Juros Reais a 12% ao Ano)",
    "content": "A norma do § 3º do artigo 192 da Constituição, revogada pela Emenda Constitucional nº 40/2003, que limitava a taxa de juros reais a 12% ao ano, tinha sua aplicação condicionada à edição de lei complementar.",
    "keywords": [
      "juros reais",
      "12% ao ano",
      "artigo 192",
      "ec 40/2003",
      "lei complementar",
      "stf",
      "súmula vinculante 7"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/807",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 112/2008, p. 1",
    "queryDate": "2008-06-20",
    "version": "Publicação Oficial Consolidada no DJe nº 112/2008, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;7",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 112/2008, p. 1",
        "publicationDate": "2008-06-20",
        "actNumber": "Súmula Vinculante 7",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;7",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/807",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 206,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 112/2008, p. 1",
        "canonicalText": "A norma do § 3º do artigo 192 da Constituição, revogada pela Emenda Constitucional nº 40/2003, que limitava a taxa de juros reais a 12% ao ano, tinha sua aplicação condicionada à edição de lei complementar.",
        "storedContentHash": "9fbcf195b274d9fceb0f640248f88d6f439cf67ee2bc810325f0df6f3767ed32",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-8",
    "lawName": "STF - Súmula Vinculante 8",
    "article": "Súmula Vinculante 8",
    "title": "Inconstitucionalidade de Prescrição e Decadência Tributária Fixadas por Lei Ordinária",
    "content": "São inconstitucionais o parágrafo único do artigo 5º do Decreto-Lei nº 1.569/1977 e os artigos 45 e 46 da Lei nº 8.212/1991, que tratam de prescrição e decadência de crédito tributário.",
    "keywords": [
      "prescrição tributária",
      "decadência tributária",
      "inconstitucionalidade",
      "crédito tributário",
      "lei 8212",
      "stf",
      "súmula vinculante 8"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/808",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 112/2008, p. 1",
    "queryDate": "2008-06-20",
    "version": "Publicação Oficial Consolidada no DJe nº 112/2008, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;8",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 112/2008, p. 1",
        "publicationDate": "2008-06-20",
        "actNumber": "Súmula Vinculante 8",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;8",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/808",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 185,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 112/2008, p. 1",
        "canonicalText": "São inconstitucionais o parágrafo único do artigo 5º do Decreto-Lei nº 1.569/1977 e os artigos 45 e 46 da Lei nº 8.212/1991, que tratam de prescrição e decadência de crédito tributário.",
        "storedContentHash": "500cda2f3f74cc201a4f49069194b39f13252acb1f6db873ee9eaf89601b9133",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-9",
    "lawName": "STF - Súmula Vinculante 9",
    "article": "Súmula Vinculante 9",
    "title": "Recepção Constitucional da Perda de Dias Remidos por Falta Grave (Art. 127 da LEP)",
    "content": "O disposto no artigo 127 da Lei nº 7.210/1984 (Lei de Execução Penal) foi recebido pela ordem constitucional vigente, e não se lhe aplica o limite temporal previsto no caput do artigo 58.",
    "keywords": [
      "remissão de pena",
      "lep",
      "falta grave",
      "artigo 127",
      "execução penal",
      "stf",
      "súmula vinculante 9"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/809",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 112/2008, p. 1",
    "queryDate": "2008-06-20",
    "version": "Publicação Oficial Consolidada no DJe nº 112/2008, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;9",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 112/2008, p. 1",
        "publicationDate": "2008-06-20",
        "actNumber": "Súmula Vinculante 9",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;9",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/809",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 187,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 112/2008, p. 1",
        "canonicalText": "O disposto no artigo 127 da Lei nº 7.210/1984 (Lei de Execução Penal) foi recebido pela ordem constitucional vigente, e não se lhe aplica o limite temporal previsto no caput do artigo 58.",
        "storedContentHash": "64aea6808ba35d52e3fdbcd3bb13e68d7a768b87abcdf5cceec230a16b22e2e1",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-10",
    "lawName": "STF - Súmula Vinculante 10",
    "article": "Súmula Vinculante 10",
    "title": "Cláusula de Reserva de Plenário (Art. 97 da CF) por Órgãos Fracionários de Tribunais",
    "content": "Viola a cláusula de reserva de plenário (CF, artigo 97) a decisão de órgão fracionário de Tribunal que embora não declare expressamente a inconstitucionalidade de lei ou ato normativo do poder público, afasta sua incidência, no todo ou em parte.",
    "keywords": [
      "reserva de plenário",
      "artigo 97",
      "inconstitucionalidade",
      "órgão fracionário",
      "afastamento de lei",
      "stf",
      "súmula vinculante 10"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/810",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 117/2008, p. 1",
    "queryDate": "2008-06-27",
    "version": "Publicação Oficial Consolidada no DJe nº 117/2008, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;10",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 117/2008, p. 1",
        "publicationDate": "2008-06-27",
        "actNumber": "Súmula Vinculante 10",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;10",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/810",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 245,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 117/2008, p. 1",
        "canonicalText": "Viola a cláusula de reserva de plenário (CF, artigo 97) a decisão de órgão fracionário de Tribunal que embora não declare expressamente a inconstitucionalidade de lei ou ato normativo do poder público, afasta sua incidência, no todo ou em parte.",
        "storedContentHash": "ef8e2c1febe98a6eec150ed3ebdbfcf3667570ab37f680ed167c46e2e75616bb",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-11",
    "lawName": "STF - Súmula Vinculante 11",
    "article": "Súmula Vinculante 11",
    "title": "Requisitos de Excepcionalidade e Justificativa por Escrito para Uso de Algemas",
    "content": "Só é lícito o uso de algemas em casos de resistência e de fundado receio de fuga ou de perigo à integridade física própria ou alheia, por parte do preso ou de terceiros, justificada a excepcionalidade por escrito, sob pena de responsabilidade disciplinar, civil e penal do agente ou da autoridade e de nulidade da prisão ou do ato processual a que se refere, sem prejuízo da responsabilidade civil do Estado.",
    "keywords": [
      "algemas",
      "uso de algemas",
      "nulidade da prisão",
      "justificativa por escrito",
      "responsabilidade do estado",
      "stf",
      "súmula vinculante 11"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/811",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 152/2008, p. 1",
    "queryDate": "2008-08-15",
    "version": "Publicação Oficial Consolidada no DJe nº 152/2008, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;11",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 152/2008, p. 1",
        "publicationDate": "2008-08-15",
        "actNumber": "Súmula Vinculante 11",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;11",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/811",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 408,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 152/2008, p. 1",
        "canonicalText": "Só é lícito o uso de algemas em casos de resistência e de fundado receio de fuga ou de perigo à integridade física própria ou alheia, por parte do preso ou de terceiros, justificada a excepcionalidade por escrito, sob pena de responsabilidade disciplinar, civil e penal do agente ou da autoridade e de nulidade da prisão ou do ato processual a que se refere, sem prejuízo da responsabilidade civil do Estado.",
        "storedContentHash": "fb50bb253cd8de8e88eaf3f6ed674d030de8a0a2c3e809d944a50c6d61f276e2",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-12",
    "lawName": "STF - Súmula Vinculante 12",
    "article": "Súmula Vinculante 12",
    "title": "Inconstitucionalidade de Cobrança de Taxa de Matrícula em Universidades Públicas",
    "content": "A cobrança de taxa de matrícula nas universidades públicas viola o disposto no art. 206, IV, da Constituição Federal.",
    "keywords": [
      "taxa de matrícula",
      "universidade pública",
      "ensino público gratuito",
      "artigo 206",
      "stf",
      "súmula vinculante 12"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/812",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 152/2008, p. 1",
    "queryDate": "2008-08-15",
    "version": "Publicação Oficial Consolidada no DJe nº 152/2008, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;12",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 152/2008, p. 1",
        "publicationDate": "2008-08-15",
        "actNumber": "Súmula Vinculante 12",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;12",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/812",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 117,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 152/2008, p. 1",
        "canonicalText": "A cobrança de taxa de matrícula nas universidades públicas viola o disposto no art. 206, IV, da Constituição Federal.",
        "storedContentHash": "fc9f8af029499b50b69743ecb56ea8cfcf5aadf04e020b6c517089b4f90a7fe1",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-13",
    "lawName": "STF - Súmula Vinculante 13",
    "article": "Súmula Vinculante 13",
    "title": "Vedação ao Nepotismo nos Poderes da União, Estados, DF e Municípios",
    "content": "A nomeação de cônjuge, companheiro ou parente em linha reta, colateral ou por afinidade, até o terceiro grau, inclusive, da autoridade nomeante ou de servidor da mesma pessoa jurídica investido em cargo de direção, chefia ou assessoramento, para o exercício de cargo em comissão ou de confiança ou, ainda, de função gratificada na administração pública direta e indireta em qualquer dos Poderes da União, dos Estados, do Distrito Federal e dos Municípios, compreendido o ajuste mediante designações recíprocas, viola a Constituição Federal.",
    "keywords": [
      "nepotismo",
      "cargo em comissão",
      "parentes",
      "terceiro grau",
      "administração pública",
      "súmula vinculante 13"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/813",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 162/2008, p. 1",
    "queryDate": "2008-08-29",
    "version": "Publicação Oficial Consolidada no DJe nº 162/2008, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;13",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 162/2008, p. 1",
        "publicationDate": "2008-08-29",
        "actNumber": "Súmula Vinculante 13",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;13",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/813",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 540,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 162/2008, p. 1",
        "canonicalText": "A nomeação de cônjuge, companheiro ou parente em linha reta, colateral ou por afinidade, até o terceiro grau, inclusive, da autoridade nomeante ou de servidor da mesma pessoa jurídica investido em cargo de direção, chefia ou assessoramento, para o exercício de cargo em comissão ou de confiança ou, ainda, de função gratificada na administração pública direta e indireta em qualquer dos Poderes da União, dos Estados, do Distrito Federal e dos Municípios, compreendido o ajuste mediante designações recíprocas, viola a Constituição Federal.",
        "storedContentHash": "513c03a865d85fd0c8102e93ce3356588b5a431146562778f8828649aee5873a",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-14",
    "lawName": "STF - Súmula Vinculante 14",
    "article": "Súmula Vinculante 14",
    "title": "Direito de Acesso Amplo do Defensor a Elementos de Prova em Inquérito Policial",
    "content": "É direito do defensor, no interesse do representado, ter acesso amplo aos elementos de prova que, já documentados em procedimento investigatório realizado por órgão com competência de polícia judiciária, digam respeito ao exercício do direito de defesa.",
    "keywords": [
      "acesso aos autos",
      "defensor",
      "advogado",
      "inquérito policial",
      "investigação",
      "ampla defesa",
      "stf",
      "súmula vinculante 14"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/814",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 214/2008, p. 1",
    "queryDate": "2008-11-14",
    "version": "Publicação Oficial Consolidada no DJe nº 214/2008, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;14",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 214/2008, p. 1",
        "publicationDate": "2008-11-14",
        "actNumber": "Súmula Vinculante 14",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2008;14",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/814",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 253,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 214/2008, p. 1",
        "canonicalText": "É direito do defensor, no interesse do representado, ter acesso amplo aos elementos de prova que, já documentados em procedimento investigatório realizado por órgão com competência de polícia judiciária, digam respeito ao exercício do direito de defesa.",
        "storedContentHash": "a11feb8bcc88ddaa9457cb4fdbf6ea08ae0a263890cfd1ce3d1ae9e6714e194f",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-15",
    "lawName": "STF - Súmula Vinculante 15",
    "article": "Súmula Vinculante 15",
    "title": "Base de Incidência de Gratificações e Vantagens e Abono para Atingir Salário Mínimo",
    "content": "O cálculo de gratificações e outras vantagens do servidor público não incide sobre o abono utilizado para se atingir o salário mínimo.",
    "keywords": [
      "gratificação",
      "abono salarial",
      "salário mínimo",
      "servidor público",
      "base de cálculo",
      "stf",
      "súmula vinculante 15"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/815",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 121/2009, p. 1",
    "queryDate": "2009-07-01",
    "version": "Publicação Oficial Consolidada no DJe nº 121/2009, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;15",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 121/2009, p. 1",
        "publicationDate": "2009-07-01",
        "actNumber": "Súmula Vinculante 15",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;15",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/815",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 134,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 121/2009, p. 1",
        "canonicalText": "O cálculo de gratificações e outras vantagens do servidor público não incide sobre o abono utilizado para se atingir o salário mínimo.",
        "storedContentHash": "7c3192899ca237ec020deb4887719c027ba4ae95c25465ea893a31fefd92b50d",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-16",
    "lawName": "STF - Súmula Vinculante 16",
    "article": "Súmula Vinculante 16",
    "title": "Remuneração Total de Servidor Público para Fins de Adequação ao Salário Mínimo",
    "content": "Os artigos 7º, IV, e 39, § 3º (redação da EC 19/98), da Constituição, referem-se ao total da remuneração percebida pelo servidor público.",
    "keywords": [
      "remuneração total",
      "salário mínimo",
      "servidor público",
      "vencimento básico",
      "stf",
      "súmula vinculante 16"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/816",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 121/2009, p. 1",
    "queryDate": "2009-07-01",
    "version": "Publicação Oficial Consolidada no DJe nº 121/2009, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;16",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 121/2009, p. 1",
        "publicationDate": "2009-07-01",
        "actNumber": "Súmula Vinculante 16",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;16",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/816",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 137,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 121/2009, p. 1",
        "canonicalText": "Os artigos 7º, IV, e 39, § 3º (redação da EC 19/98), da Constituição, referem-se ao total da remuneração percebida pelo servidor público.",
        "storedContentHash": "617f2f6b905253f9854e083cbf330c09df43209f6fd8e41de673988cee0c11da",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-17",
    "lawName": "STF - Súmula Vinculante 17",
    "article": "Súmula Vinculante 17",
    "title": "Não Incidência de Juros de Mora em Precatórios Pagos no Prazo Constitucional",
    "content": "Durante o período previsto no parágrafo 1º do artigo 100 da Constituição, não incidem juros de mora sobre os precatórios que nele sejam pagos.",
    "keywords": [
      "precatório",
      "juros de mora",
      "artigo 100",
      "período constitucional",
      "stf",
      "súmula vinculante 17"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/817",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 210/2009, p. 1",
    "queryDate": "2009-11-10",
    "version": "Publicação Oficial Consolidada no DJe nº 210/2009, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;17",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 210/2009, p. 1",
        "publicationDate": "2009-11-10",
        "actNumber": "Súmula Vinculante 17",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;17",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/817",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 142,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 210/2009, p. 1",
        "canonicalText": "Durante o período previsto no parágrafo 1º do artigo 100 da Constituição, não incidem juros de mora sobre os precatórios que nele sejam pagos.",
        "storedContentHash": "1cc0ed2c2394ca0775be0c70e868756761f80067c35016380a98df315e1b8501",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-18",
    "lawName": "STF - Súmula Vinculante 18",
    "article": "Súmula Vinculante 18",
    "title": "Dissolução de Vínculo Conjugal no Mandato e Inelegibilidade Reflexa",
    "content": "A dissolução da sociedade ou do vínculo conjugal, no curso do mandato, não afasta a inelegibilidade prevista no § 7º do artigo 14 da Constituição Federal.",
    "keywords": [
      "inelegibilidade reflexa",
      "divórcio",
      "vínculo conjugal",
      "mandato eletivo",
      "artigo 14",
      "stf",
      "súmula vinculante 18"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/818",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 210/2009, p. 1",
    "queryDate": "2009-11-10",
    "version": "Publicação Oficial Consolidada no DJe nº 210/2009, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;18",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 210/2009, p. 1",
        "publicationDate": "2009-11-10",
        "actNumber": "Súmula Vinculante 18",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;18",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/818",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 154,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 210/2009, p. 1",
        "canonicalText": "A dissolução da sociedade ou do vínculo conjugal, no curso do mandato, não afasta a inelegibilidade prevista no § 7º do artigo 14 da Constituição Federal.",
        "storedContentHash": "741f71fa9ff188d0404dec6dbac07b3f75cb6a9bf10f0e961f018581da5b6bf3",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-19",
    "lawName": "STF - Súmula Vinculante 19",
    "article": "Súmula Vinculante 19",
    "title": "Constitucionalidade da Taxa de Coleta, Remoção e Destinação de Lixo e Resíduos",
    "content": "A taxa cobrada exclusivamente em razão dos serviços públicos de coleta, remoção e tratamento ou destinação de lixo ou resíduos provenientes de imóveis, não viola o artigo 145, II, da Constituição Federal.",
    "keywords": [
      "taxa de lixo",
      "coleta de lixo",
      "serviço público",
      "especificidade e divisibilidade",
      "stf",
      "súmula vinculante 19"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/819",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 210/2009, p. 1",
    "queryDate": "2009-11-10",
    "version": "Publicação Oficial Consolidada no DJe nº 210/2009, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;19",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 210/2009, p. 1",
        "publicationDate": "2009-11-10",
        "actNumber": "Súmula Vinculante 19",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;19",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/819",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 204,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 210/2009, p. 1",
        "canonicalText": "A taxa cobrada exclusivamente em razão dos serviços públicos de coleta, remoção e tratamento ou destinação de lixo ou resíduos provenientes de imóveis, não viola o artigo 145, II, da Constituição Federal.",
        "storedContentHash": "035f3df4cdef11d16fe24e347e1568a00caa900fdffa05d39a3b9ee90910b9ae",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-20",
    "lawName": "STF - Súmula Vinculante 20",
    "article": "Súmula Vinculante 20",
    "title": "Extensão da Gratificação de Desempenho (GDATA) aos Servidores Inativos",
    "content": "A Gratificação de Desempenho de Atividade Técnico-Administrativa - GDATA, instituída pela Lei nº 10.404/2002, deve ser deferida aos inativos nos valores correspondentes a 37,5 (trinta e sete vírgula cinco) pontos no período de fevereiro a maio de 2002 e, nos termos do artigo 5º, parágrafo único, da Lei nº 10.404/2002, no período de junho de 2002 até a conclusão dos efeitos do último ciclo de avaliação a que se refere o artigo 1º da Medida Provisória no 198/2004, a partir da qual passa a ser de 60 (sessenta) pontos.",
    "keywords": [
      "gdata",
      "gratificação de desempenho",
      "servidor inativo",
      "paridade",
      "stf",
      "súmula vinculante 20"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/820",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 210/2009, p. 1",
    "queryDate": "2009-11-10",
    "version": "Publicação Oficial Consolidada no DJe nº 210/2009, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;20",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 210/2009, p. 1",
        "publicationDate": "2009-11-10",
        "actNumber": "Súmula Vinculante 20",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;20",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/820",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 520,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 210/2009, p. 1",
        "canonicalText": "A Gratificação de Desempenho de Atividade Técnico-Administrativa - GDATA, instituída pela Lei nº 10.404/2002, deve ser deferida aos inativos nos valores correspondentes a 37,5 (trinta e sete vírgula cinco) pontos no período de fevereiro a maio de 2002 e, nos termos do artigo 5º, parágrafo único, da Lei nº 10.404/2002, no período de junho de 2002 até a conclusão dos efeitos do último ciclo de avaliação a que se refere o artigo 1º da Medida Provisória no 198/2004, a partir da qual passa a ser de 60 (sessenta) pontos.",
        "storedContentHash": "0998a4f4dde273065de5bb63c1378d3205a9cee14d0d891f6c4053290aa757c2",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-21",
    "lawName": "STF - Súmula Vinculante 21",
    "article": "Súmula Vinculante 21",
    "title": "Inconstitucionalidade de Depósito ou Arrolamento Prévio para Recurso Administrativo",
    "content": "É inconstitucional a exigência de depósito ou arrolamento prévios de dinheiro ou bens para admissibilidade de recurso administrativo.",
    "keywords": [
      "depósito prévio",
      "arrolamento de bens",
      "recurso administrativo",
      "ampla defesa",
      "stf",
      "súmula vinculante 21"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/821",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 210/2009, p. 1",
    "queryDate": "2009-11-10",
    "version": "Publicação Oficial Consolidada no DJe nº 210/2009, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;21",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 210/2009, p. 1",
        "publicationDate": "2009-11-10",
        "actNumber": "Súmula Vinculante 21",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;21",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/821",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 133,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 210/2009, p. 1",
        "canonicalText": "É inconstitucional a exigência de depósito ou arrolamento prévios de dinheiro ou bens para admissibilidade de recurso administrativo.",
        "storedContentHash": "ddb5b0e605330836fd2b6183e7481969c8bb5251ff94170b2d92135301792727",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-22",
    "lawName": "STF - Súmula Vinculante 22",
    "article": "Súmula Vinculante 22",
    "title": "Competência da Justiça do Trabalho para Ações de Indenização por Acidente de Trabalho",
    "content": "A Justiça do Trabalho é competente para processar e julgar as ações de indenização por danos morais e patrimoniais decorrentes de acidente de trabalho propostas por empregado contra empregador, inclusive aquelas que ainda não possuíam sentença de mérito em primeiro grau quando da promulgação da Emenda Constitucional nº 45/04.",
    "keywords": [
      "acidente de trabalho",
      "justiça do trabalho",
      "indenização",
      "dano moral",
      "competência",
      "stf",
      "súmula vinculante 22"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/822",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 232/2009, p. 1",
    "queryDate": "2009-12-11",
    "version": "Publicação Oficial Consolidada no DJe nº 232/2009, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;22",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 232/2009, p. 1",
        "publicationDate": "2009-12-11",
        "actNumber": "Súmula Vinculante 22",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;22",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/822",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 327,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 232/2009, p. 1",
        "canonicalText": "A Justiça do Trabalho é competente para processar e julgar as ações de indenização por danos morais e patrimoniais decorrentes de acidente de trabalho propostas por empregado contra empregador, inclusive aquelas que ainda não possuíam sentença de mérito em primeiro grau quando da promulgação da Emenda Constitucional nº 45/04.",
        "storedContentHash": "6612a58f5a06982efa2ddef671f029272460db5410434b058ff0556100d41f3d",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-23",
    "lawName": "STF - Súmula Vinculante 23",
    "article": "Súmula Vinculante 23",
    "title": "Competência da Justiça do Trabalho para Ações Possessórias em Greve da Iniciativa Privada",
    "content": "A Justiça do Trabalho é competente para processar e julgar ação possessória ajuizada em decorrência do exercício do direito de greve pelos trabalhadores da iniciativa privada.",
    "keywords": [
      "ação possessória",
      "direito de greve",
      "justiça do trabalho",
      "competência",
      "stf",
      "súmula vinculante 23"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/823",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 232/2009, p. 1",
    "queryDate": "2009-12-11",
    "version": "Publicação Oficial Consolidada no DJe nº 232/2009, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;23",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 232/2009, p. 1",
        "publicationDate": "2009-12-11",
        "actNumber": "Súmula Vinculante 23",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;23",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/823",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 175,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 232/2009, p. 1",
        "canonicalText": "A Justiça do Trabalho é competente para processar e julgar ação possessória ajuizada em decorrência do exercício do direito de greve pelos trabalhadores da iniciativa privada.",
        "storedContentHash": "dd9def97f7070b05514d90b598b29c06424ff450a8e6075e649e9a3d86aa9440",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-24",
    "lawName": "STF - Súmula Vinculante 24",
    "article": "Súmula Vinculante 24",
    "title": "Necessidade de Lançamento Definitivo para Crime Material contra a Ordem Tributária",
    "content": "Não se tipifica crime material contra a ordem tributária, previsto no art. 1º, incisos I a IV, da Lei nº 8.137/90, antes do lançamento definitivo do tributo.",
    "keywords": [
      "crime tributário",
      "lançamento definitivo",
      "lei 8137",
      "condição objetiva de punibilidade",
      "stf",
      "súmula vinculante 24"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/824",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 237/2009, p. 1",
    "queryDate": "2009-12-18",
    "version": "Publicação Oficial Consolidada no DJe nº 237/2009, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;24",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 237/2009, p. 1",
        "publicationDate": "2009-12-18",
        "actNumber": "Súmula Vinculante 24",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;24",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/824",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 157,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 237/2009, p. 1",
        "canonicalText": "Não se tipifica crime material contra a ordem tributária, previsto no art. 1º, incisos I a IV, da Lei nº 8.137/90, antes do lançamento definitivo do tributo.",
        "storedContentHash": "9226c25614d05924b3a04f00b0838187e04a415f3153d70f1b3e8cb848eeea53",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-25",
    "lawName": "STF - Súmula Vinculante 25",
    "article": "Súmula Vinculante 25",
    "title": "Ilicitude da Prisão Civil de Depositário Infiel em Qualquer Modalidade",
    "content": "É ilícita a prisão civil de depositário infiel, qualquer que seja a modalidade do depósito.",
    "keywords": [
      "depositário infiel",
      "prisão civil",
      "pacto de san jose",
      "direitos humanos",
      "stf",
      "súmula vinculante 25"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/825",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 241/2009, p. 1",
    "queryDate": "2009-12-23",
    "version": "Publicação Oficial Consolidada no DJe nº 241/2009, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;25",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 241/2009, p. 1",
        "publicationDate": "2009-12-23",
        "actNumber": "Súmula Vinculante 25",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;25",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/825",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 91,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 241/2009, p. 1",
        "canonicalText": "É ilícita a prisão civil de depositário infiel, qualquer que seja a modalidade do depósito.",
        "storedContentHash": "4cca238c5cc2983bfd9506cd6d197cb31b0de7a1629900ed177a696064f5be32",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-26",
    "lawName": "STF - Súmula Vinculante 26",
    "article": "Súmula Vinculante 26",
    "title": "Progressão de Regime em Crime Hediondo e Realização de Exame Criminológico",
    "content": "Para efeito de progressão de regime no cumprimento de pena por crime hediondo, ou equiparado, o juízo da execução observará a inconstitucionalidade do art. 2º da Lei n. 8.072, de 25 de julho de 1990, sem prejuízo de avaliar se o condenado preenche, ou não, os requisitos objetivos e subjetivos do benefício, podendo determinar, para tal fim, de modo fundamentado, a realização de exame criminológico.",
    "keywords": [
      "crime hediondo",
      "progressão de regime",
      "exame criminológico",
      "lei 8072",
      "execução penal",
      "stf",
      "súmula vinculante 26"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/826",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 241/2009, p. 1",
    "queryDate": "2009-12-23",
    "version": "Publicação Oficial Consolidada no DJe nº 241/2009, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;26",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 241/2009, p. 1",
        "publicationDate": "2009-12-23",
        "actNumber": "Súmula Vinculante 26",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;26",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/826",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 400,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 241/2009, p. 1",
        "canonicalText": "Para efeito de progressão de regime no cumprimento de pena por crime hediondo, ou equiparado, o juízo da execução observará a inconstitucionalidade do art. 2º da Lei n. 8.072, de 25 de julho de 1990, sem prejuízo de avaliar se o condenado preenche, ou não, os requisitos objetivos e subjetivos do benefício, podendo determinar, para tal fim, de modo fundamentado, a realização de exame criminológico.",
        "storedContentHash": "c21c87ff0a5bf426fb4ed5afc45fe09be3f080a26645571fc0a46960d67040e1",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-27",
    "lawName": "STF - Súmula Vinculante 27",
    "article": "Súmula Vinculante 27",
    "title": "Competência da Justiça Estadual para Causas entre Consumidor e Concessionária de Telefonia",
    "content": "Compete à Justiça estadual julgar causas entre consumidor e concessionária de serviço público de telefonia, quando a Agência Nacional de Telecomunicações (ANATEL) não seja litisconsorte passiva necessária, assistente, nem opoente.",
    "keywords": [
      "telefonia",
      "concessionária",
      "consumidor",
      "justiça estadual",
      "anatel",
      "stf",
      "súmula vinculante 27"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/827",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 241/2009, p. 1",
    "queryDate": "2009-12-23",
    "version": "Publicação Oficial Consolidada no DJe nº 241/2009, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;27",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 241/2009, p. 1",
        "publicationDate": "2009-12-23",
        "actNumber": "Súmula Vinculante 27",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2009;27",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/827",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 230,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 241/2009, p. 1",
        "canonicalText": "Compete à Justiça estadual julgar causas entre consumidor e concessionária de serviço público de telefonia, quando a Agência Nacional de Telecomunicações (ANATEL) não seja litisconsorte passiva necessária, assistente, nem opoente.",
        "storedContentHash": "28ed36019e2e7fb8e86675ab3c8742dbff639438208ec206ef06a79aca72bb04",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-28",
    "lawName": "STF - Súmula Vinculante 28",
    "article": "Súmula Vinculante 28",
    "title": "Inconstitucionalidade de Depósito Prévio para Discussão Judicial de Crédito Tributário",
    "content": "É inconstitucional a exigência de depósito prévio como requisito de admissibilidade de ação judicial na qual se pretenda discutir a exigibilidade de crédito tributário.",
    "keywords": [
      "crédito tributário",
      "depósito prévio",
      "admissibilidade de ação judicial",
      "inconstitucionalidade",
      "stf",
      "súmula vinculante 28"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/828",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 30/2010, p. 1",
    "queryDate": "2010-02-19",
    "version": "Publicação Oficial Consolidada no DJe nº 30/2010, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2010;28",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 30/2010, p. 1",
        "publicationDate": "2010-02-19",
        "actNumber": "Súmula Vinculante 28",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2010;28",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/828",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 168,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 30/2010, p. 1",
        "canonicalText": "É inconstitucional a exigência de depósito prévio como requisito de admissibilidade de ação judicial na qual se pretenda discutir a exigibilidade de crédito tributário.",
        "storedContentHash": "e5117b2f3fab1f553c42c17a0b6b7f3aa9738e7cb8c3524c1bebb66ea869b66f",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-29",
    "lawName": "STF - Súmula Vinculante 29",
    "article": "Súmula Vinculante 29",
    "title": "Constitucionalidade de Elemento de Base de Cálculo de Imposto na Composição de Taxa",
    "content": "É constitucional a adoção, no cálculo do valor de taxa, de um ou mais elementos da base de cálculo própria de determinado imposto, desde que não haja integral identidade entre uma base e outra.",
    "keywords": [
      "taxa",
      "base de cálculo",
      "imposto",
      "identidade parcial",
      "constitucionalidade",
      "stf",
      "súmula vinculante 29"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/829",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 30/2010, p. 1",
    "queryDate": "2010-02-19",
    "version": "Publicação Oficial Consolidada no DJe nº 30/2010, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2010;29",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 30/2010, p. 1",
        "publicationDate": "2010-02-19",
        "actNumber": "Súmula Vinculante 29",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2010;29",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/829",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 193,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 30/2010, p. 1",
        "canonicalText": "É constitucional a adoção, no cálculo do valor de taxa, de um ou mais elementos da base de cálculo própria de determinado imposto, desde que não haja integral identidade entre uma base e outra.",
        "storedContentHash": "2bb4dc4500bd0d34e94a76071ff5bf0315f8ad8a16b2d67c991b662b62296f89",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-30",
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2010;30",
    "lawName": "STF - Súmula Vinculante 30",
    "article": "Súmula Vinculante 30",
    "title": "Inconstitucionalidade de Retenção de Parcela de ICMS Pertencente aos Municípios (Não Publicada)",
    "content": "É inconstitucional lei estadual que, a título de incentivo fiscal, retém parcela do Imposto sobre Circulação de Mercadorias e Serviços (ICMS) pertencente aos municípios.",
    "keywords": [
      "icms",
      "incentivo fiscal",
      "retenção",
      "repartição de receitas",
      "municípios",
      "stf",
      "súmula vinculante 30"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "SUSPENSA_NAO_COMPROVADA",
    "officialRef": "DJe nº 235/2010 (Suspenso pelo Plenário)",
    "revocationNotice": "Publicação formal suspensa pelo STF (não publicada no DJe).",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/830",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "queryDate": "2010-12-10",
    "version": "Enunciado com publicação suspensa pelo STF",
    "authenticityStatus": "SUSPENSO_PREVENTIVAMENTE",
    "auditNotes": "Processo de edição formalmente suspenso pelo STF (PSV 30 - DJe 235/2010). O enunciado não foi publicado no DJe, razão pela qual sua autenticidade perante publicação oficial não pôde ser comprovada. Suspenso preventivamente para evitar citação como súmula válida.",
    "historicalVersions": [
      {
        "effectiveDate": "2010-12-16",
        "content": "É inconstitucional lei estadual que, a título de incentivo fiscal, retém parcela do Imposto sobre Circulação de Mercadorias e Serviços (ICMS) pertencente aos municípios.",
        "changeNote": "Publicação formal suspensa pelo Plenário do STF no PSV 30."
      }
    ],
    "isOfficialUrnVerified": false,
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 235/2010 (Suspenso pelo Plenário)",
        "publicationDate": "2010-12-10",
        "actNumber": "Súmula Vinculante 30",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2010;30",
        "isOfficialUrnVerified": false
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/830",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 169,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Enunciado com publicação suspensa pelo STF",
        "canonicalText": "É inconstitucional lei estadual que, a título de incentivo fiscal, retém parcela do Imposto sobre Circulação de Mercadorias e Serviços (ICMS) pertencente aos municípios.",
        "storedContentHash": "575d8b9d3845c8690021a262a22081ea3a482243a9ec6d957a246009d9a41390",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": [
          {
            "versionId": "v-2010-12-16-1",
            "effectiveStartDate": "2010-12-16",
            "status": "ALTERADO",
            "modifyingAct": "Publicação formal suspensa pelo Plenário do STF no PSV 30.",
            "canonicalText": "É inconstitucional lei estadual que, a título de incentivo fiscal, retém parcela do Imposto sobre Circulação de Mercadorias e Serviços (ICMS) pertencente aos municípios.",
            "storedContentHash": "d96eac57bcb89bc62ffc8ffc7a151708667ac7431fc837b00fb53bd73f1541b6"
          }
        ]
      },
      "evidence": {
        "status": "SUSPENSO_PREVENTIVAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": false,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Processo de edição formalmente suspenso pelo STF (PSV 30 - DJe 235/2010). O enunciado não foi publicado no DJe, razão pela qual sua autenticidade perante publicação oficial não pôde ser comprovada. Suspenso preventivamente para evitar citação como súmula válida."
      }
    }
  },
  {
    "id": "stf-sv-31",
    "lawName": "STF - Súmula Vinculante 31",
    "article": "Súmula Vinculante 31",
    "title": "Inconstitucionalidade da Incidência de ISS sobre Locação de Bens Móveis",
    "content": "É inconstitucional a incidência do Imposto sobre Serviços de Qualquer Natureza (ISS) sobre operações de locação de bens móveis.",
    "keywords": [
      "iss",
      "locação de bens móveis",
      "serviço",
      "não incidência",
      "stf",
      "súmula vinculante 31"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/831",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 30/2010, p. 1",
    "queryDate": "2010-02-19",
    "version": "Publicação Oficial Consolidada no DJe nº 30/2010, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2010;31",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 30/2010, p. 1",
        "publicationDate": "2010-02-19",
        "actNumber": "Súmula Vinculante 31",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2010;31",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/831",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 127,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 30/2010, p. 1",
        "canonicalText": "É inconstitucional a incidência do Imposto sobre Serviços de Qualquer Natureza (ISS) sobre operações de locação de bens móveis.",
        "storedContentHash": "88426d2d123027a722372335af7e5cfa2385ce57b177915ad719a70ebe21a2e0",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-32",
    "lawName": "STF - Súmula Vinculante 32",
    "article": "Súmula Vinculante 32",
    "title": "Não Incidência de ICMS sobre Alienação de Salvados de Sinistro por Seguradoras",
    "content": "O ICMS não incide sobre alienação de salvados de sinistro pelas seguradoras.",
    "keywords": [
      "icms",
      "salvados de sinistro",
      "seguradoras",
      "não incidência",
      "stf",
      "súmula vinculante 32"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/832",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 40/2010, p. 1",
    "queryDate": "2010-03-05",
    "version": "Publicação Oficial Consolidada no DJe nº 40/2010, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2010;32",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 40/2010, p. 1",
        "publicationDate": "2010-03-05",
        "actNumber": "Súmula Vinculante 32",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2010;32",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/832",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 76,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 40/2010, p. 1",
        "canonicalText": "O ICMS não incide sobre alienação de salvados de sinistro pelas seguradoras.",
        "storedContentHash": "c2766b8359ac977b322e442ca5cf0c7f8cb638c0048d9e08de2a44d95077244a",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-33",
    "lawName": "STF - Súmula Vinculante 33",
    "article": "Súmula Vinculante 33",
    "title": "Aplicação das Regras do RGPS para Aposentadoria Especial de Servidor Público",
    "content": "Aplicam-se ao servidor público, no que couber, as regras do regime geral da previdência social sobre aposentadoria especial de que trata o artigo 40, § 4º, inciso III da Constituição Federal, até a edição de lei complementar específica.",
    "keywords": [
      "aposentadoria especial",
      "servidor público",
      "rgps",
      "insalubridade",
      "stf",
      "súmula vinculante 33"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/833",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 77/2014, p. 1",
    "queryDate": "2014-04-24",
    "version": "Publicação Oficial Consolidada no DJe nº 77/2014, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2014;33",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 77/2014, p. 1",
        "publicationDate": "2014-04-24",
        "actNumber": "Súmula Vinculante 33",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2014;33",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/833",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 236,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 77/2014, p. 1",
        "canonicalText": "Aplicam-se ao servidor público, no que couber, as regras do regime geral da previdência social sobre aposentadoria especial de que trata o artigo 40, § 4º, inciso III da Constituição Federal, até a edição de lei complementar específica.",
        "storedContentHash": "9e7e1fa8b3b82c387b5513252182497705908354a61a578fc3e141c85677b23c",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-34",
    "lawName": "STF - Súmula Vinculante 34",
    "article": "Súmula Vinculante 34",
    "title": "Extensão da GDASST aos Servidores Inativos com Paridade Constitucional",
    "content": "A Gratificação de Desempenho de Atividade de Seguridade Social e do Trabalho – GDASST, instituída pela Lei 10.483/2002, deve ser estendida aos inativos no valor correspondente a 60 (sessenta) pontos, desde o advento da Medida Provisória 198/2004, convertida na Lei 10.971/2004, quando tais inativos façam jus à paridade constitucional (EC 20/1998, 41/2003 e 47/2005).",
    "keywords": [
      "gdasst",
      "servidor inativo",
      "paridade",
      "seguridade social",
      "stf",
      "súmula vinculante 34"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/834",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 46/2015, p. 1",
    "queryDate": "2015-03-10",
    "version": "Publicação Oficial Consolidada no DJe nº 46/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;34",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 46/2015, p. 1",
        "publicationDate": "2015-03-10",
        "actNumber": "Súmula Vinculante 34",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;34",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/834",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 367,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 46/2015, p. 1",
        "canonicalText": "A Gratificação de Desempenho de Atividade de Seguridade Social e do Trabalho – GDASST, instituída pela Lei 10.483/2002, deve ser estendida aos inativos no valor correspondente a 60 (sessenta) pontos, desde o advento da Medida Provisória 198/2004, convertida na Lei 10.971/2004, quando tais inativos façam jus à paridade constitucional (EC 20/1998, 41/2003 e 47/2005).",
        "storedContentHash": "bbb3ab5c7e96062a6a3dee880bff4543136bead1ed8914a18770f19f44bd1db3",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-35",
    "lawName": "STF - Súmula Vinculante 35",
    "article": "Súmula Vinculante 35",
    "title": "Transação Penal (Art. 76 da Lei 9.099/1995) e Ausência de Coisa Julgada Material",
    "content": "A homologação da transação penal prevista no artigo 76 da Lei 9.099/1995 não faz coisa julgada material e, descumpridas suas cláusulas, retoma-se a situação anterior, possibilitando-se ao Ministério Público a continuidade da persecução penal mediante oferecimento de denúncia ou requisição de inquérito policial.",
    "keywords": [
      "transação penal",
      "lei 9099",
      "coisa julgada material",
      "ação penal",
      "stf",
      "súmula vinculante 35"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/835",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 46/2015, p. 1",
    "queryDate": "2015-03-10",
    "version": "Publicação Oficial Consolidada no DJe nº 46/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;35",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 46/2015, p. 1",
        "publicationDate": "2015-03-10",
        "actNumber": "Súmula Vinculante 35",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;35",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/835",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 312,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 46/2015, p. 1",
        "canonicalText": "A homologação da transação penal prevista no artigo 76 da Lei 9.099/1995 não faz coisa julgada material e, descumpridas suas cláusulas, retoma-se a situação anterior, possibilitando-se ao Ministério Público a continuidade da persecução penal mediante oferecimento de denúncia ou requisição de inquérito policial.",
        "storedContentHash": "a2212bba3c2579599dae058abdf4c66bb9fede11e55da56007c6f2c3ee5b45f5",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-36",
    "lawName": "STF - Súmula Vinculante 36",
    "article": "Súmula Vinculante 36",
    "title": "Competência da Justiça Federal para Crimes de Falsificação de Documentos Marítimos (CIR/CHA)",
    "content": "Compete à Justiça Federal comum processar e julgar civil denunciado pelos crimes de falsificação e de uso de documento falso quando se tratar de falsificação da Caderneta de Inscrição e Registro (CIR) ou de Carteira de Habilitação de Amador (CHA), ainda que expedidas pela Marinha do Brasil.",
    "keywords": [
      "justiça federal",
      "marinha",
      "falsificação de documento",
      "cir",
      "cha",
      "stf",
      "súmula vinculante 36"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/836",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 46/2015, p. 1",
    "queryDate": "2015-03-10",
    "version": "Publicação Oficial Consolidada no DJe nº 46/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;36",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 46/2015, p. 1",
        "publicationDate": "2015-03-10",
        "actNumber": "Súmula Vinculante 36",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;36",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/836",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 291,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 46/2015, p. 1",
        "canonicalText": "Compete à Justiça Federal comum processar e julgar civil denunciado pelos crimes de falsificação e de uso de documento falso quando se tratar de falsificação da Caderneta de Inscrição e Registro (CIR) ou de Carteira de Habilitação de Amador (CHA), ainda que expedidas pela Marinha do Brasil.",
        "storedContentHash": "6c1920b73a3630e681b3c3c406f17a9ddf61c8aa3abc3754be436b8b86a440f2",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-37",
    "lawName": "STF - Súmula Vinculante 37",
    "article": "Súmula Vinculante 37",
    "title": "Vedação ao Poder Judiciário de Aumentar Vencimentos sob Fundamento de Isonomia",
    "content": "Não cabe ao Poder Judiciário, que não tem função legislativa, aumentar vencimentos de servidores públicos sob o fundamento de isonomia.",
    "keywords": [
      "isonomia",
      "aumento de vencimentos",
      "poder judiciário",
      "função legislativa",
      "stf",
      "súmula vinculante 37"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/837",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 46/2015, p. 1",
    "queryDate": "2015-03-10",
    "version": "Publicação Oficial Consolidada no DJe nº 46/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;37",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 46/2015, p. 1",
        "publicationDate": "2015-03-10",
        "actNumber": "Súmula Vinculante 37",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;37",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/837",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 135,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 46/2015, p. 1",
        "canonicalText": "Não cabe ao Poder Judiciário, que não tem função legislativa, aumentar vencimentos de servidores públicos sob o fundamento de isonomia.",
        "storedContentHash": "e60176383543d1a86228c5665ef3ad4d75f42283e26d8c8b3f5d8496d723d392",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-38",
    "lawName": "STF - Súmula Vinculante 38",
    "article": "Súmula Vinculante 38",
    "title": "Competência do Município para Fixar Horário de Funcionamento de Estabelecimento Comercial",
    "content": "É competente o Município para fixar o horário de funcionamento de estabelecimento comercial.",
    "keywords": [
      "estabelecimento comercial",
      "horário de funcionamento",
      "município",
      "interesse local",
      "stf",
      "súmula vinculante 38"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/838",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 46/2015, p. 1",
    "queryDate": "2015-03-10",
    "version": "Publicação Oficial Consolidada no DJe nº 46/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;38",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 46/2015, p. 1",
        "publicationDate": "2015-03-10",
        "actNumber": "Súmula Vinculante 38",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;38",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/838",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 92,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 46/2015, p. 1",
        "canonicalText": "É competente o Município para fixar o horário de funcionamento de estabelecimento comercial.",
        "storedContentHash": "e3916c19f25b5d7512584b81a02f20293c5ef24fe2e31fee4d5b470bcec96b13",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-39",
    "lawName": "STF - Súmula Vinculante 39",
    "article": "Súmula Vinculante 39",
    "title": "Competência Privativa da União para Legislar sobre Vencimentos da PM, PC e CBM do DF",
    "content": "Compete privativamente à União legislar sobre vencimentos dos membros das polícias civil e militar e do corpo de bombeiros militar do Distrito Federal.",
    "keywords": [
      "polícia civil",
      "polícia militar",
      "bombeiros",
      "distrito federal",
      "competência da união",
      "stf",
      "súmula vinculante 39"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/839",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 46/2015, p. 1",
    "queryDate": "2015-03-10",
    "version": "Publicação Oficial Consolidada no DJe nº 46/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;39",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 46/2015, p. 1",
        "publicationDate": "2015-03-10",
        "actNumber": "Súmula Vinculante 39",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;39",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/839",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 151,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 46/2015, p. 1",
        "canonicalText": "Compete privativamente à União legislar sobre vencimentos dos membros das polícias civil e militar e do corpo de bombeiros militar do Distrito Federal.",
        "storedContentHash": "9da35ec9ed896ca55cbc7e79c58fb51a420a30cff4170d234af0065f6bbc4427",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-40",
    "lawName": "STF - Súmula Vinculante 40",
    "article": "Súmula Vinculante 40",
    "title": "Exigibilidade da Contribuição Confederativa Apenas de Servidores/Trabalhadores Filiados",
    "content": "A contribuição confederativa de que trata o art. 8º, IV, da Constituição Federal, só é exigível dos filiados ao sindicato respectivo.",
    "keywords": [
      "contribuição confederativa",
      "sindicato",
      "filiação",
      "artigo 8º",
      "stf",
      "súmula vinculante 40"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/840",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 58/2015, p. 1",
    "queryDate": "2015-03-26",
    "version": "Publicação Oficial Consolidada no DJe nº 58/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;40",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 58/2015, p. 1",
        "publicationDate": "2015-03-26",
        "actNumber": "Súmula Vinculante 40",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;40",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/840",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 133,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 58/2015, p. 1",
        "canonicalText": "A contribuição confederativa de que trata o art. 8º, IV, da Constituição Federal, só é exigível dos filiados ao sindicato respectivo.",
        "storedContentHash": "cce112e3e8be81c22edbcee4b7c9be5d3b0a66f1f9cb1893221c904a04719a16",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-41",
    "lawName": "STF - Súmula Vinculante 41",
    "article": "Súmula Vinculante 41",
    "title": "Impossibilidade de Remuneração do Serviço de Iluminação Pública por Taxa",
    "content": "O serviço de iluminação pública não pode ser remunerado mediante taxa.",
    "keywords": [
      "iluminação pública",
      "taxa",
      "impossibilidade",
      "cosip",
      "stf",
      "súmula vinculante 41"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/841",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 58/2015, p. 1",
    "queryDate": "2015-03-26",
    "version": "Publicação Oficial Consolidada no DJe nº 58/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;41",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 58/2015, p. 1",
        "publicationDate": "2015-03-26",
        "actNumber": "Súmula Vinculante 41",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;41",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/841",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 70,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 58/2015, p. 1",
        "canonicalText": "O serviço de iluminação pública não pode ser remunerado mediante taxa.",
        "storedContentHash": "b83cedff6c61f7fc031a86b27e30fba31926a05bd525ad650fa622b02e37fd2a",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-42",
    "lawName": "STF - Súmula Vinculante 42",
    "article": "Súmula Vinculante 42",
    "title": "Inconstitucionalidade de Vinculação de Reajuste Estadual/Municipal a Índices Federais",
    "content": "É inconstitucional a vinculação do reajuste de vencimentos de servidores estaduais ou municipais a índices federais de correção monetária.",
    "keywords": [
      "reajuste de servidores",
      "índices federais",
      "vinculação",
      "inconstitucionalidade",
      "stf",
      "súmula vinculante 42"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/842",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 58/2015, p. 1",
    "queryDate": "2015-03-26",
    "version": "Publicação Oficial Consolidada no DJe nº 58/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;42",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 58/2015, p. 1",
        "publicationDate": "2015-03-26",
        "actNumber": "Súmula Vinculante 42",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;42",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/842",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 138,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 58/2015, p. 1",
        "canonicalText": "É inconstitucional a vinculação do reajuste de vencimentos de servidores estaduais ou municipais a índices federais de correção monetária.",
        "storedContentHash": "5227611ba2f848ff6cd30548444a11e2fd68d168e400cfd54f9aa273123c75a1",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-43",
    "lawName": "STF - Súmula Vinculante 43",
    "article": "Súmula Vinculante 43",
    "title": "Inconstitucionalidade de Provimento Derivado em Cargo que Não Integra Carreira Originária",
    "content": "É inconstitucional toda modalidade de provimento que propicie ao servidor investir-se, sem prévia aprovação em concurso público destinado ao seu provimento, em cargo que não integra a carreira na qual anteriormente investido.",
    "keywords": [
      "concurso público",
      "provimento derivado",
      "transposição",
      "carreira",
      "stf",
      "súmula vinculante 43"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/843",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 67/2015, p. 1",
    "queryDate": "2015-04-13",
    "version": "Publicação Oficial Consolidada no DJe nº 67/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;43",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 67/2015, p. 1",
        "publicationDate": "2015-04-13",
        "actNumber": "Súmula Vinculante 43",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;43",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/843",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 225,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 67/2015, p. 1",
        "canonicalText": "É inconstitucional toda modalidade de provimento que propicie ao servidor investir-se, sem prévia aprovação em concurso público destinado ao seu provimento, em cargo que não integra a carreira na qual anteriormente investido.",
        "storedContentHash": "c4b565cd4d0eecd9f6cf87bcf9dfa335418af62f894ae1d67f7d43edb0c701fc",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-44",
    "lawName": "STF - Súmula Vinculante 44",
    "article": "Súmula Vinculante 44",
    "title": "Exigência de Previsão em Lei Formal para Exame Psicotécnico em Concurso Público",
    "content": "Só por lei se pode sujeitar a exame psicotécnico a habilitação de candidato a cargo público.",
    "keywords": [
      "exame psicotécnico",
      "concurso público",
      "previsão em lei",
      "critérios objetivos",
      "stf",
      "súmula vinculante 44"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/844",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 67/2015, p. 1",
    "queryDate": "2015-04-13",
    "version": "Publicação Oficial Consolidada no DJe nº 67/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;44",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 67/2015, p. 1",
        "publicationDate": "2015-04-13",
        "actNumber": "Súmula Vinculante 44",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;44",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/844",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 92,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 67/2015, p. 1",
        "canonicalText": "Só por lei se pode sujeitar a exame psicotécnico a habilitação de candidato a cargo público.",
        "storedContentHash": "a8091720f44e7f367308e7526c4fc39132e8f6dfda1a3caa96031213935d3ae8",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-45",
    "lawName": "STF - Súmula Vinculante 45",
    "article": "Súmula Vinculante 45",
    "title": "Prevalência da Competência do Tribunal do Júri sobre Foro por Prerrogativa Estadual",
    "content": "A competência constitucional do Tribunal do Júri prevalece sobre o foro por prerrogativa de função estabelecido exclusivamente pela constituição estadual.",
    "keywords": [
      "tribunal do júri",
      "foro por prerrogativa de função",
      "constituição estadual",
      "prevalência",
      "stf",
      "súmula vinculante 45"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/845",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 67/2015, p. 1",
    "queryDate": "2015-04-13",
    "version": "Publicação Oficial Consolidada no DJe nº 67/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;45",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 67/2015, p. 1",
        "publicationDate": "2015-04-13",
        "actNumber": "Súmula Vinculante 45",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;45",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/845",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 154,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 67/2015, p. 1",
        "canonicalText": "A competência constitucional do Tribunal do Júri prevalece sobre o foro por prerrogativa de função estabelecido exclusivamente pela constituição estadual.",
        "storedContentHash": "224c368d14ba425cb856f6bf623991ac0863612c794610508b0e9e17d711b2c4",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-46",
    "lawName": "STF - Súmula Vinculante 46",
    "article": "Súmula Vinculante 46",
    "title": "Competência Privativa da União para Legislar sobre Crimes de Responsabilidade",
    "content": "A definição dos crimes de responsabilidade e o estabelecimento das respectivas normas de processo e julgamento são da competência legislativa privativa da União.",
    "keywords": [
      "crime de responsabilidade",
      "processo e julgamento",
      "competência privativa da união",
      "stf",
      "súmula vinculante 46"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/846",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 67/2015, p. 1",
    "queryDate": "2015-04-13",
    "version": "Publicação Oficial Consolidada no DJe nº 67/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;46",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 67/2015, p. 1",
        "publicationDate": "2015-04-13",
        "actNumber": "Súmula Vinculante 46",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;46",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/846",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 161,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 67/2015, p. 1",
        "canonicalText": "A definição dos crimes de responsabilidade e o estabelecimento das respectivas normas de processo e julgamento são da competência legislativa privativa da União.",
        "storedContentHash": "bbf12f47ef9057e16324f1fe08f031a20f8608c2747f6849fb5ead1608d84f0b",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-47",
    "lawName": "STF - Súmula Vinculante 47",
    "article": "Súmula Vinculante 47",
    "title": "Natureza Alimentar dos Honorários Advocatícios e Preferência no Pagamento de RPV/Precatório",
    "content": "Os honorários advocatícios incluídos na condenação ou destacados do montante principal devido ao credor consubstanciam verba de natureza alimentar cuja satisfação ocorrerá com a expedição de precatório ou requisição de pequeno valor, observada ordem especial restrita aos créditos dessa natureza.",
    "keywords": [
      "honorários advocatícios",
      "natureza alimentar",
      "precatório",
      "rpv",
      "preferência",
      "stf",
      "súmula vinculante 47"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/847",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 124/2015, p. 1",
    "queryDate": "2015-06-26",
    "version": "Publicação Oficial Consolidada no DJe nº 124/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;47",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 124/2015, p. 1",
        "publicationDate": "2015-06-26",
        "actNumber": "Súmula Vinculante 47",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;47",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/847",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 296,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 124/2015, p. 1",
        "canonicalText": "Os honorários advocatícios incluídos na condenação ou destacados do montante principal devido ao credor consubstanciam verba de natureza alimentar cuja satisfação ocorrerá com a expedição de precatório ou requisição de pequeno valor, observada ordem especial restrita aos créditos dessa natureza.",
        "storedContentHash": "85ea260f69c8ff3a54685738eb70b1b1c9c1f25f763859b9d10d662443b7c6a5",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-48",
    "lawName": "STF - Súmula Vinculante 48",
    "article": "Súmula Vinculante 48",
    "title": "Legitimidade da Cobrança de ICMS no Desembaraço Aduaneiro de Mercadoria Importada",
    "content": "Na entrada de mercadoria importada do exterior, é legítima a cobrança do ICMS por ocasião do desembaraço aduaneiro.",
    "keywords": [
      "icms",
      "importação",
      "desembaraço aduaneiro",
      "fato gerador",
      "stf",
      "súmula vinculante 48"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/848",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 124/2015, p. 1",
    "queryDate": "2015-06-26",
    "version": "Publicação Oficial Consolidada no DJe nº 124/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;48",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 124/2015, p. 1",
        "publicationDate": "2015-06-26",
        "actNumber": "Súmula Vinculante 48",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;48",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/848",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 115,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 124/2015, p. 1",
        "canonicalText": "Na entrada de mercadoria importada do exterior, é legítima a cobrança do ICMS por ocasião do desembaraço aduaneiro.",
        "storedContentHash": "6cbd10bd8e2f1bc2637b3d10528b1b016aa265ecfbb7d587a6e67d127c670541",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-49",
    "lawName": "STF - Súmula Vinculante 49",
    "article": "Súmula Vinculante 49",
    "title": "Inconstitucionalidade de Limitação Municipal de Distância entre Estabelecimentos do Mesmo Ramo",
    "content": "Ofende o princípio da livre concorrência lei municipal que impede a instalação de estabelecimentos comerciais do mesmo ramo em determinada área.",
    "keywords": [
      "livre concorrência",
      "distância entre estabelecimentos",
      "lei municipal",
      "farmácias",
      "postos",
      "stf",
      "súmula vinculante 49"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/849",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 124/2015, p. 1",
    "queryDate": "2015-06-26",
    "version": "Publicação Oficial Consolidada no DJe nº 124/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;49",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 124/2015, p. 1",
        "publicationDate": "2015-06-26",
        "actNumber": "Súmula Vinculante 49",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;49",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/849",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 144,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 124/2015, p. 1",
        "canonicalText": "Ofende o princípio da livre concorrência lei municipal que impede a instalação de estabelecimentos comerciais do mesmo ramo em determinada área.",
        "storedContentHash": "b5a1865b2837b3c3f133b28031802d39d2e04386eb2d5e23740990e334d1c574",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-50",
    "lawName": "STF - Súmula Vinculante 50",
    "article": "Súmula Vinculante 50",
    "title": "Não Sujeição de Alteração de Prazo de Recolhimento Tributário ao Princípio da Anterioridade",
    "content": "Norma legal que altera o prazo de recolhimento de obrigação tributária não se sujeita ao princípio da anterioridade.",
    "keywords": [
      "anterioridade tributária",
      "prazo de recolhimento",
      "obrigação tributária",
      "stf",
      "súmula vinculante 50"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/850",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 124/2015, p. 1",
    "queryDate": "2015-06-26",
    "version": "Publicação Oficial Consolidada no DJe nº 124/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;50",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 124/2015, p. 1",
        "publicationDate": "2015-06-26",
        "actNumber": "Súmula Vinculante 50",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;50",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/850",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 116,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 124/2015, p. 1",
        "canonicalText": "Norma legal que altera o prazo de recolhimento de obrigação tributária não se sujeita ao princípio da anterioridade.",
        "storedContentHash": "4e82c698f725e9dfe36e751aa91119df5e51e88cedfa6601bd10a5fecbf19c75",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-51",
    "lawName": "STF - Súmula Vinculante 51",
    "article": "Súmula Vinculante 51",
    "title": "Extensão do Reajuste de 28,86% das Leis 8.622/93 e 8.627/93 aos Servidores Civis",
    "content": "O reajuste de 28,86%, concedido aos servidores militares pelas Leis 8622/1993 e 8627/1993, estende-se aos servidores civis do poder executivo, observadas as eventuais compensações decorrentes dos reajustes diferenciados concedidos pelos mesmos diplomas legais.",
    "keywords": [
      "reajuste 28,86%",
      "militares",
      "servidores civis",
      "compensação",
      "stf",
      "súmula vinculante 51"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/851",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 124/2015, p. 1",
    "queryDate": "2015-06-26",
    "version": "Publicação Oficial Consolidada no DJe nº 124/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;51",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 124/2015, p. 1",
        "publicationDate": "2015-06-26",
        "actNumber": "Súmula Vinculante 51",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;51",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/851",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 260,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 124/2015, p. 1",
        "canonicalText": "O reajuste de 28,86%, concedido aos servidores militares pelas Leis 8622/1993 e 8627/1993, estende-se aos servidores civis do poder executivo, observadas as eventuais compensações decorrentes dos reajustes diferenciados concedidos pelos mesmos diplomas legais.",
        "storedContentHash": "5bf081ea02a8d6d9707cb1e39aaf28a491e7e39882b119b94da50b1c58204f05",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-52",
    "lawName": "STF - Súmula Vinculante 52",
    "article": "Súmula Vinculante 52",
    "title": "Imunidade Tributária de IPTU sobre Imóvel Alugado de Entidade sem Fins Lucrativos",
    "content": "Ainda quando alugado a terceiros, permanece imune ao Imposto sobre a Propriedade Predial e Territorial Urbana (IPTU) o imóvel pertencente a qualquer das entidades referidas pelo art. 150, VI, “c”, da Constituição Federal, desde que o valor dos aluguéis seja aplicado nas atividades para as quais tais entidades foram constituídas.",
    "keywords": [
      "iptu",
      "imunidade recíproca",
      "imóvel alugado",
      "entidade sem fins lucrativos",
      "stf",
      "súmula vinculante 52"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/852",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 124/2015, p. 1",
    "queryDate": "2015-06-26",
    "version": "Publicação Oficial Consolidada no DJe nº 124/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;52",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 124/2015, p. 1",
        "publicationDate": "2015-06-26",
        "actNumber": "Súmula Vinculante 52",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;52",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/852",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 330,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 124/2015, p. 1",
        "canonicalText": "Ainda quando alugado a terceiros, permanece imune ao Imposto sobre a Propriedade Predial e Territorial Urbana (IPTU) o imóvel pertencente a qualquer das entidades referidas pelo art. 150, VI, “c”, da Constituição Federal, desde que o valor dos aluguéis seja aplicado nas atividades para as quais tais entidades foram constituídas.",
        "storedContentHash": "21db59f40966dd1aeab0de9c112ba0cf4b326aacfd9f2abd5b4670dec57d6de3",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-53",
    "lawName": "STF - Súmula Vinculante 53",
    "article": "Súmula Vinculante 53",
    "title": "Competência da Justiça do Trabalho para Executar de Ofício Contribuições Previdenciárias",
    "content": "A competência da Justiça do Trabalho prevista no art. 114, VIII, da Constituição Federal alcança a execução de ofício das contribuições previdenciárias relativas ao objeto da condenação constante das sentenças que proferir e acordos por ela homologados.",
    "keywords": [
      "justiça do trabalho",
      "contribuições previdenciárias",
      "execução de ofício",
      "competência",
      "stf",
      "súmula vinculante 53"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/853",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 124/2015, p. 1",
    "queryDate": "2015-06-26",
    "version": "Publicação Oficial Consolidada no DJe nº 124/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;53",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 124/2015, p. 1",
        "publicationDate": "2015-06-26",
        "actNumber": "Súmula Vinculante 53",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;53",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/853",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 253,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 124/2015, p. 1",
        "canonicalText": "A competência da Justiça do Trabalho prevista no art. 114, VIII, da Constituição Federal alcança a execução de ofício das contribuições previdenciárias relativas ao objeto da condenação constante das sentenças que proferir e acordos por ela homologados.",
        "storedContentHash": "f7f227e5687b9882dc9bed9a13f9787e82645e339c5259113d60f1573523c494",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-54",
    "lawName": "STF - Súmula Vinculante 54",
    "article": "Súmula Vinculante 54",
    "title": "Constitucionalidade da Reeditação de Medida Provisória Anterior à EC 32/2001",
    "content": "A medida provisória não apreciada pelo congresso nacional podia, até a Emenda Constitucional 32/2001, ser reeditada dentro do seu prazo de eficácia de trinta dias, mantidos os efeitos de lei desde a primeira edição.",
    "keywords": [
      "medida provisória",
      "reeditação",
      "prazo de trinta dias",
      "ec 32/2001",
      "stf",
      "súmula vinculante 54"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/854",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 124/2015, p. 1",
    "queryDate": "2015-06-26",
    "version": "Publicação Oficial Consolidada no DJe nº 124/2015, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;54",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 124/2015, p. 1",
        "publicationDate": "2015-06-26",
        "actNumber": "Súmula Vinculante 54",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2015;54",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/854",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 215,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 124/2015, p. 1",
        "canonicalText": "A medida provisória não apreciada pelo congresso nacional podia, até a Emenda Constitucional 32/2001, ser reeditada dentro do seu prazo de eficácia de trinta dias, mantidos os efeitos de lei desde a primeira edição.",
        "storedContentHash": "e0a367dc0cf794c8895899ab343876bb600ec05a4a216e277950ff5cc941bfc1",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-55",
    "lawName": "STF - Súmula Vinculante 55",
    "article": "Súmula Vinculante 55",
    "title": "Inaplicabilidade de Auxílio-Alimentação a Servidores Públicos Inativos",
    "content": "O direito ao auxílio-alimentação não se estende aos servidores inativos.",
    "keywords": [
      "auxílio-alimentação",
      "servidores inativos",
      "aposentados",
      "não extensão",
      "stf",
      "súmula vinculante 55"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/855",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 178/2016, p. 1",
    "queryDate": "2016-08-25",
    "version": "Publicação Oficial Consolidada no DJe nº 178/2016, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2016;55",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 178/2016, p. 1",
        "publicationDate": "2016-08-25",
        "actNumber": "Súmula Vinculante 55",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2016;55",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/855",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 72,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 178/2016, p. 1",
        "canonicalText": "O direito ao auxílio-alimentação não se estende aos servidores inativos.",
        "storedContentHash": "310a6a7676f135a7be121fd8a08894b7f119763ef6038dba6c499041bf6c788d",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-56",
    "lawName": "STF - Súmula Vinculante 56",
    "article": "Súmula Vinculante 56",
    "title": "Déficit de Estabelecimento Penal e Vedação a Regime Prisional Mais Gravoso",
    "content": "A falta de estabelecimento penal adequado não autoriza a manutenção do condenado em regime prisional mais gravoso, devendo-se observar, nessa hipótese, os parâmetros fixados no RE 641.320/RS.",
    "keywords": [
      "regime prisional",
      "falta de vaga",
      "regime mais gravoso",
      "re 641320",
      "direitos humanos",
      "stf",
      "súmula vinculante 56"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/856",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 165/2016, p. 1",
    "queryDate": "2016-08-08",
    "version": "Publicação Oficial Consolidada no DJe nº 165/2016, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2016;56",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 165/2016, p. 1",
        "publicationDate": "2016-08-08",
        "actNumber": "Súmula Vinculante 56",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2016;56",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/856",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 191,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 165/2016, p. 1",
        "canonicalText": "A falta de estabelecimento penal adequado não autoriza a manutenção do condenado em regime prisional mais gravoso, devendo-se observar, nessa hipótese, os parâmetros fixados no RE 641.320/RS.",
        "storedContentHash": "2e3619b9208284e026889f70ef5a633491f35cf34340cafcf04983999fcc921c",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-57",
    "lawName": "STF - Súmula Vinculante 57",
    "article": "Súmula Vinculante 57",
    "title": "Imunidade Tributária de Livros Eletrônicos (E-books) e Dispositivos de Leitura (E-readers)",
    "content": "A imunidade tributária constante do art. 150, VI, d, da CF/88 aplica-se à importação e comercialização, no mercado interno, do livro eletrônico (ebook) e dos suportes exclusivamente utilizados para fixá-los, como leitores de livros eletrônicos (e-readers), ainda que possuam funcionalidades acessórias.",
    "keywords": [
      "imunidade tributária",
      "livros eletrônicos",
      "e-books",
      "e-readers",
      "kindle",
      "stf",
      "súmula vinculante 57"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/857",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 281/2020, p. 1",
    "queryDate": "2020-11-27",
    "version": "Publicação Oficial Consolidada no DJe nº 281/2020, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2020;57",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 281/2020, p. 1",
        "publicationDate": "2020-11-27",
        "actNumber": "Súmula Vinculante 57",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2020;57",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/857",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 302,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 281/2020, p. 1",
        "canonicalText": "A imunidade tributária constante do art. 150, VI, d, da CF/88 aplica-se à importação e comercialização, no mercado interno, do livro eletrônico (ebook) e dos suportes exclusivamente utilizados para fixá-los, como leitores de livros eletrônicos (e-readers), ainda que possuam funcionalidades acessórias.",
        "storedContentHash": "976e4c15681538f89efb50aa04a35429a030774329e49e0dd4ce3986de42f5e1",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-58",
    "lawName": "STF - Súmula Vinculante 58",
    "article": "Súmula Vinculante 58",
    "title": "Inexistência de Direito a Crédito Presumido de IPI sobre Insumos Isentos ou Alíquota Zero",
    "content": "Inexiste direito a crédito presumido de IPI relativamente à entrada de insumos isentos, sujeitos à alíquota zero ou não tributáveis, o que não contraria o princípio da não cumulatividade.",
    "keywords": [
      "ipi",
      "crédito presumido",
      "insumos isentos",
      "alíquota zero",
      "não cumulatividade",
      "stf",
      "súmula vinculante 58"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/858",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 256/2020, p. 1",
    "queryDate": "2020-10-23",
    "version": "Publicação Oficial Consolidada no DJe nº 256/2020, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2020;58",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 256/2020, p. 1",
        "publicationDate": "2020-10-23",
        "actNumber": "Súmula Vinculante 58",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2020;58",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/858",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 187,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 256/2020, p. 1",
        "canonicalText": "Inexiste direito a crédito presumido de IPI relativamente à entrada de insumos isentos, sujeitos à alíquota zero ou não tributáveis, o que não contraria o princípio da não cumulatividade.",
        "storedContentHash": "e055b29b8c943e53a96abcb1e78fc5afac49ba79a46d40fe5203fe9b5192106b",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-59",
    "lawName": "STF - Súmula Vinculante 59",
    "article": "Súmula Vinculante 59",
    "title": "Fixação Obrigatória de Regime Aberto e Substituição de Pena no Tráfico Privilegiado",
    "content": "É impositiva a fixação do regime aberto e a substituição da pena privativa de liberdade por restritiva de direitos quando reconhecida a figura do tráfico privilegiado (art. 33, § 4º, da Lei 11.343/06) e ausentes vetores negativos na primeira fase da dosimetria (art. 59 do CP) , observados os requisitos do art. 33, § 2º, alínea c e do art. 44, ambos do Código Penal.",
    "keywords": [
      "tráfico privilegiado",
      "regime aberto",
      "substituição de pena",
      "lei de drogas",
      "stf",
      "súmula vinculante 59"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/859",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 279/2023, p. 1",
    "queryDate": "2023-12-19",
    "version": "Publicação Oficial Consolidada no DJe nº 279/2023, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2023;59",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 279/2023, p. 1",
        "publicationDate": "2023-12-19",
        "actNumber": "Súmula Vinculante 59",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2023;59",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/859",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 367,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 279/2023, p. 1",
        "canonicalText": "É impositiva a fixação do regime aberto e a substituição da pena privativa de liberdade por restritiva de direitos quando reconhecida a figura do tráfico privilegiado (art. 33, § 4º, da Lei 11.343/06) e ausentes vetores negativos na primeira fase da dosimetria (art. 59 do CP) , observados os requisitos do art. 33, § 2º, alínea c e do art. 44, ambos do Código Penal.",
        "storedContentHash": "92e4b7ad6ec5fa73188f9524b8d235275871db7bdd2b46e324d40379982ef141",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-60",
    "lawName": "STF - Súmula Vinculante 60",
    "article": "Súmula Vinculante 60",
    "title": "Fluxos Interfederativos Obrigatórios para Fornecimento Judicial de Fármacos pelo SUS (Tema 1.234)",
    "content": "O pedido e a análise administrativos de fármacos na rede pública de saúde, a judicialização do caso, bem ainda seus desdobramentos (administrativos e jurisdicionais), devem observar os termos dos 3 (três) acordos interfederativos (e seus fluxos) homologados pelo Supremo Tribunal Federal, em governança judicial colaborativa, no tema 1.234 da sistemática da repercussão geral RE 1.366.243 .",
    "keywords": [
      "fármacos",
      "medicamentos",
      "sus",
      "tema 1234",
      "acordos interfederativos",
      "saúde pública",
      "stf",
      "súmula vinculante 60"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/860",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 206/2024, p. 1",
    "queryDate": "2024-09-30",
    "version": "Publicação Oficial Consolidada no DJe nº 206/2024, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2024;60",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 206/2024, p. 1",
        "publicationDate": "2024-09-30",
        "actNumber": "Súmula Vinculante 60",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2024;60",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/860",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 390,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 206/2024, p. 1",
        "canonicalText": "O pedido e a análise administrativos de fármacos na rede pública de saúde, a judicialização do caso, bem ainda seus desdobramentos (administrativos e jurisdicionais), devem observar os termos dos 3 (três) acordos interfederativos (e seus fluxos) homologados pelo Supremo Tribunal Federal, em governança judicial colaborativa, no tema 1.234 da sistemática da repercussão geral RE 1.366.243 .",
        "storedContentHash": "682a9f727639424ddee2a5bbde4437893a9072db2949f52f0631648d80a60830",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-61",
    "lawName": "STF - Súmula Vinculante 61",
    "article": "Súmula Vinculante 61",
    "title": "Requisitos para Fornecimento Judicial de Medicamentos Registrados na ANVISA não Padronizados (Tema 6)",
    "content": "A concessão judicial de medicamento registrado na ANVISA, mas não incorporado às listas de dispensação do Sistema Único de Saúde, deve observar as teses firmadas no julgamento do Tema 6 da Repercussão Geral (RE 566.471).",
    "keywords": [
      "medicamento anvisa",
      "não incorporado ao sus",
      "tema 6",
      "repercussão geral",
      "saúde pública",
      "stf",
      "súmula vinculante 61"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/861",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 206/2024, p. 1",
    "queryDate": "2024-09-30",
    "version": "Publicação Oficial Consolidada no DJe nº 206/2024, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2024;61",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 206/2024, p. 1",
        "publicationDate": "2024-09-30",
        "actNumber": "Súmula Vinculante 61",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2024;61",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/861",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 220,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 206/2024, p. 1",
        "canonicalText": "A concessão judicial de medicamento registrado na ANVISA, mas não incorporado às listas de dispensação do Sistema Único de Saúde, deve observar as teses firmadas no julgamento do Tema 6 da Repercussão Geral (RE 566.471).",
        "storedContentHash": "7d6ed67f661e24ea3f08b8980c4f0fb3a160d261784550fafbabe4e50a76aa72",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  },
  {
    "id": "stf-sv-62",
    "lawName": "STF - Súmula Vinculante 62",
    "article": "Súmula Vinculante 62",
    "title": "Legitimidade da Revogação da Isenção da Cofins do Art. 6º, II da LC 70/91 pela Lei 9.430/96",
    "content": "É legítima a revogação da isenção estabelecida no art. 6º, II, da Lei Complementar 70/1991 pelo art. 56 da Lei 9.430/1996, dado que a LC 70/1991 é apenas formalmente complementar, mas materialmente ordinária com relação aos dispositivos concernentes à contribuição social por ela instituída.",
    "keywords": [
      "cofins",
      "lei complementar 70/91",
      "lei 9430/96",
      "revogação de isenção",
      "sociedades civis",
      "stf",
      "súmula vinculante 62"
    ],
    "lawType": "CONSTITUCIONAL",
    "statusVigencia": "COMUM",
    "sourceUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/862",
    "officialPublisher": "Supremo Tribunal Federal (Plenário)",
    "officialRef": "DJe nº 206/2024, p. 1",
    "queryDate": "2024-09-30",
    "version": "Publicação Oficial Consolidada no DJe nº 206/2024, p. 1",
    "isOfficialUrnVerified": true,
    "officialId": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2024;62",
    "authenticityStatus": "NAO_VERIFICADO_EXTERNAMENTE",
    "auditNotes": "Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.",
    "provenance": {
      "publication": {
        "authority": "Supremo Tribunal Federal (Plenário)",
        "officialJournal": "DJe nº 206/2024, p. 1",
        "publicationDate": "2024-09-30",
        "actNumber": "Súmula Vinculante 62",
        "officialUrn": "urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:2024;62",
        "isOfficialUrnVerified": true
      },
      "sourceCapture": {
        "exactUrl": "https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/862",
        "verifiedHostname": "jurisprudencia.stf.jus.br",
        "isDomainVerified": true,
        "captureMethod": "MANUAL_UNVERIFIED",
        "sourceFormat": "HTML",
        "contentLengthBytes": 291,
        "hasDocumentedSnapshot": false
      },
      "versionControl": {
        "versionReference": "Publicação Oficial Consolidada no DJe nº 206/2024, p. 1",
        "canonicalText": "É legítima a revogação da isenção estabelecida no art. 6º, II, da Lei Complementar 70/1991 pelo art. 56 da Lei 9.430/1996, dado que a LC 70/1991 é apenas formalmente complementar, mas materialmente ordinária com relação aos dispositivos concernentes à contribuição social por ela instituída.",
        "storedContentHash": "6b3b29f6333575dc46f4695a71ebe230b3188391335fbeb7757d06db83237185",
        "contentMatch": false,
        "textComparisonDetails": "Captura independente pendente ou discrepância detectada.",
        "versionHistory": []
      },
      "evidence": {
        "status": "NAO_VERIFICADO_EXTERNAMENTE",
        "isDefensible": false,
        "hasIdentifiedPublication": true,
        "hasVerifiableCapture": false,
        "hasValidExternalHash": false,
        "hasContentMatch": false,
        "isDomainVerified": true,
        "isOfficialUrnVerified": true,
        "hasDocumentedSnapshot": false,
        "isAutovalidationRejected": false,
        "auditNotes": "Registro do acervo local sem captura física independente documentada da publicação oficial. O hash do texto local não é aceito como comprovação de fonte externa. Não admitido como fundamentação oficialmente comprovada."
      }
    }
  }
];
