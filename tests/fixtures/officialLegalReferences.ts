/**
 * =============================================================================
 * FIXTURES DE REFERÊNCIA JURÍDICA E HASHES INDEPENDENTES
 * =============================================================================
 * Hashes SHA-256 e metadados pré-calculados externamente contra a realidade
 * factual de publicações oficiais (DJe / DOU / LexML).
 *
 * FINALIDADE FORENSE:
 * Desacoplar os testes da suíte de auditoria jurídica de qualquer autocertificação
 * circular interna. Estes hashes NÃO são produzidos pelo código sob auditoria;
 * são constantes imutáveis de referência contra as quais o código é confrontado.
 * =============================================================================
 */

export interface OfficialReferenceFixture {
  id: string;
  authority: string;
  officialJournal: string;
  publicationDate: string;
  actNumber: string;
  exactUrl: string;
  canonicalText: string;
  /**
   * Hash SHA-256 FIPS 180-4 pré-calculado externamente sobre o texto canônico normalizado
   */
  independentCanonicalSha256: string;
  rawPayload: string;
  /**
   * Hash SHA-256 FIPS 180-4 pré-calculado externamente sobre o payload bruto da fonte
   */
  independentRawPayloadSha256: string;
}

/**
 * Fixture de Referência: STF — Súmula Vinculante 1
 * Publicação oficial: DJe nº 31/2007, p. 1 (Divulgação: 05/06/2007, Publicação: 06/06/2007)
 * Processo de Origem: PSV 1
 */
export const STF_SV1_REFERENCE: OfficialReferenceFixture = {
  id: 'stf-sv-1',
  authority: 'Supremo Tribunal Federal (Plenário)',
  officialJournal: 'DJe nº 31/2007, p. 1',
  publicationDate: '2007-06-06',
  actNumber: 'Súmula Vinculante 1',
  exactUrl: 'https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/801',
  canonicalText:
    'Ofende a garantia constitucional do ato jurídico perfeito a decisão que, sem ponderar as circunstâncias do caso concreto, desconsidera a validez e a eficácia de acordo constante de termo de adesão instituído pela Lei Complementar nº 110/2001.',
  independentCanonicalSha256:
    '6258df6579af040c039ab625f8cdfc329898c3ff9784b8b9e9a8a27b1b05a048',
  rawPayload: JSON.stringify({
    fonte_oficial: 'STF',
    tribunal: 'Supremo Tribunal Federal',
    veiculo: 'DJe nº 31/2007, p. 1',
    data_publicacao: '2007-06-06',
    processo: 'PSV 1',
    enunciado:
      'Ofende a garantia constitucional do ato jurídico perfeito a decisão que, sem ponderar as circunstâncias do caso concreto, desconsidera a validez e a eficácia de acordo constante de termo de adesão instituído pela Lei Complementar nº 110/2001.'
  }),
  independentRawPayloadSha256:
    '3bee07f58d4ade5601b0206a2d03d158e8c7962c74220ae3959b621973daa015'
};

/**
 * Fixture de Referência: STF — Súmula Vinculante 56
 * Publicação oficial: DJe nº 165/2016, p. 1 (Divulgação: 05/08/2016, Publicação: 08/08/2016)
 * Processo de Origem: PSV 112
 */
export const STF_SV56_REFERENCE: OfficialReferenceFixture = {
  id: 'stf-sv-56',
  authority: 'Supremo Tribunal Federal (Plenário)',
  officialJournal: 'DJe nº 165/2016, p. 1',
  publicationDate: '2016-08-08',
  actNumber: 'Súmula Vinculante 56',
  exactUrl: 'https://jurisprudencia.stf.jus.br/pages/search/seq-sumula/856',
  canonicalText:
    'A falta de estabelecimento penal adequado não autoriza a manutenção do condenado em regime prisional mais gravoso, devendo-se observar, nessa hipótese, os parâmetros fixados no RE 641.320/RS.',
  independentCanonicalSha256:
    '2e3619b9208284e026889f70ef5a633491f35cf34340cafcf04983999fcc921c',
  rawPayload: JSON.stringify({
    fonte_oficial: 'STF',
    tribunal: 'Supremo Tribunal Federal',
    veiculo: 'DJe nº 165/2016, p. 1',
    data_publicacao: '2016-08-08',
    processo: 'PSV 112',
    enunciado:
      'A falta de estabelecimento penal adequado não autoriza a manutenção do condenado em regime prisional mais gravoso, devendo-se observar, nessa hipótese, os parâmetros fixados no RE 641.320/RS.'
  }),
  independentRawPayloadSha256:
    '5ffb761692677b132e88f66c0dbeaf6ddca1bcd5a31c4bd8e35f7390778b90f3'
};

/**
 * Fixture de Referência: LGPD — Artigo 1º (Lei nº 13.709/2018)
 * Publicação oficial: DOU de 15/08/2018, Seção 1, p. 59
 */
export const LGPD_ART1_REFERENCE = {
  id: 'lgpd-art-1',
  authority: 'Presidência da República',
  officialJournal: 'DOU de 15/08/2018, Seção 1, p. 59',
  publicationDate: '2018-08-15',
  actNumber: 'Artigo 1º',
  exactUrl: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm',
  canonicalText:
    'Esta Lei dispõe sobre o tratamento de dados pessoais, inclusive nos meios digitais, por pessoa natural ou por pessoa jurídica de direito público ou privado, com o objetivo de proteger os direitos fundamentais de liberdade e de privacidade e o livre desenvolvimento da personalidade da pessoa natural.',
  independentCanonicalSha256:
    'f902f8a9bb701a2c0f9a6f42ce89f3c2317b4a1fbc9cbda02f8ae1263058111f'
};

/**
 * Fixture de Referência: Transição Normativa Real de Versão
 * Código Civil — Art. 406 (Taxa Legal de Juros)
 *
 * Versão 1: Redação original da Lei nº 10.406/2002 (DOU de 11/01/2002)
 * Versão 2: Redação conferida pela Lei nº 14.905/2024 (DOU de 01/07/2024, em vigor a partir de 30/08/2024)
 */
export const CC_ART406_VERSION_TRANSITION = {
  original: {
    text: 'Quando os juros moratórios não forem convencionados, ou o forem sem taxa estipulada, ou quando provierem de determinação da lei, serão fixados segundo a taxa que estiver em vigor para a mora do pagamento de impostos devidos à Fazenda Nacional.',
    independentSha256: '9f95fe98f998df8f324f59ecab185cd0e61d7667bc9c619a5d223e7a53a371bf',
    sourceUrl: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm',
    publicationDate: '2002-01-11'
  },
  updated: {
    text: 'Quando os juros moratórios não forem convencionados, ou o forem sem taxa estipulada, ou quando provierem de determinação da lei, serão fixados de acordo com a taxa legal.',
    independentSha256: 'ae48a4c579a589cbbf6afc655bf7b12fbc7bf55c68715db817b744bfcbff997e',
    modifyingAct: 'Lei nº 14.905/2024',
    effectiveDate: '2024-08-30',
    sourceUrl: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14905.htm'
  }
};
