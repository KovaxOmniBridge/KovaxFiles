import { LegalArticle } from '../services/legalKnowledgeBaseService';

/**
 * Acervo Legislativo Histórico, Obsoleto, Em Desuso e Revogado/Desativado
 * Permite a consulta histórica para análise de direito intertemporal, pesquisa acadêmica e pareceres de transição.
 */
export const HISTORICAL_AND_REVOKED_STATUTES: LegalArticle[] = [
  // ==========================================
  // --- LEI 8.666/1993 (LEI DE LICITAÇÕES ANTIGA - REVOGADA / DESATIVADA) ---
  // ==========================================
  {
    id: 'rev-lic8666-art1',
    lawName: 'Lei nº 8.666/1993 [REVOGADA]',
    article: 'Artigo 1º',
    title: 'Objeto da Antiga Lei de Licitações (Substituída pela Lei 14.133/2021)',
    content: 'Esta lei estabelece normas gerais sobre licitações e contratos administrativos pertinentes a obras, serviços, inclusive de publicidade, compras, alienações e locações no âmbito dos Poderes da União, dos Estados, do Distrito Federal e dos Municípios.',
    keywords: ['licitação antiga', '8666', '8.666', 'obras e serviços', 'revogada'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l8666cons.htm',
    statusVigencia: 'REVOGADA_DESATIVADA',
    officialRef: 'Lei nº 8.666/1993 (Revogada expressamente pela Lei nº 14.133/2021)'
  },
  {
    id: 'rev-lic8666-art24',
    lawName: 'Lei nº 8.666/1993 [REVOGADA]',
    article: 'Artigo 24',
    title: 'Hipóteses de Dispensa de Licitação (Redação Antiga)',
    content: 'É dispensável a licitação: I - para obras e serviços de engenharia de valor até 10% (dez por cento) do limite previsto na alínea "a" do inciso I do artigo 23 desta lei; II - para outros serviços e compras de valor até 10% (dez por cento) do limite previsto na alínea "a" do inciso II do artigo 23 desta lei.',
    keywords: ['dispensa antiga', '8666', 'pequeno valor', 'dispensável', 'revogada'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l8666cons.htm',
    statusVigencia: 'REVOGADA_DESATIVADA',
    officialRef: 'Lei nº 8.666/1993 (Substituída pelo Art. 75 da Lei 14.133/2021)'
  },
  {
    id: 'rev-lic8666-art25',
    lawName: 'Lei nº 8.666/1993 [REVOGADA]',
    article: 'Artigo 25',
    title: 'Inexigibilidade de Licitação por Natureza Singular (Redação Antiga)',
    content: 'É inexigível a licitação quando houver inviabilidade de competição, em especial: I - para aquisição de materiais, equipamentos, ou gêneros que só possam ser fornecidos por produtor, empresa ou representante comercial exclusivo; II - para a contratação de serviços técnicos enumerados no art. 13 desta Lei, de natureza singular, com profissionais ou empresas de notória especialização.',
    keywords: ['inexigibilidade antiga', '8666', 'natureza singular', 'notória especialização', 'revogada'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l8666cons.htm',
    statusVigencia: 'REVOGADA_DESATIVADA',
    officialRef: 'Lei nº 8.666/1993 (Substituída pelo Art. 74 da Lei 14.133/2021)'
  },
  {
    id: 'rev-lic8666-art89',
    lawName: 'Lei nº 8.666/1993 [REVOGADA]',
    article: 'Artigo 89',
    title: 'Crime de Dispensa ou Inexigibilidade Indevida de Licitação (Antigo Art. 89)',
    content: 'Dispensar ou inexigir licitação fora das hipóteses previstas em lei, ou deixar de observar as formalidades pertinentes à dispensa ou à inexigibilidade: Pena - detenção, de 3 (três) a 5 (cinco) anos, e multa.',
    keywords: ['crime de licitação', 'artigo 89', '8666', 'dispensa indevida', 'revogada'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l8666cons.htm',
    statusVigencia: 'REVOGADA_DESATIVADA',
    officialRef: 'Lei nº 8.666/1993 (Revogada e Migrada para o Art. 337-E do Código Penal pela Lei 14.133/2021)'
  },

  // ==========================================
  // --- CPC DE 1973 (LEI 5.869/1973 - REVOGADO / DESATIVADO) ---
  // ==========================================
  {
    id: 'rev-cpc73-art273',
    lawName: 'Código de Processo Civil de 1973 [REVOGADO]',
    article: 'Artigo 273',
    title: 'Antecipação dos Efeitos da Tutela (CPC/1973)',
    content: 'O juiz poderá, a requerimento da parte, antecipar, total ou parcialmente, os efeitos da tutela pretendida no pedido inicial, desde que, existindo prova inequívoca, se convença da verossimilhança da alegação e: I - haja fundado receio de dano irreparável ou de difícil reparação; ou II - fique caracterizado o abuso de direito de defesa ou o manifesto propósito protelatório do réu.',
    keywords: ['antecipação de tutela', 'cpc 1973', 'cpc73', 'prova inequívoca', 'verossimilhança', 'revogado'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l5869impressao.htm',
    statusVigencia: 'REVOGADA_DESATIVADA',
    officialRef: 'Lei nº 5.869/1973 (Substituído pelos Arts. 294 a 311 do CPC/2015)'
  },
  {
    id: 'rev-cpc73-art282',
    lawName: 'Código de Processo Civil de 1973 [REVOGADO]',
    article: 'Artigo 282',
    title: 'Requisitos da Petição Inicial no CPC/1973',
    content: 'A petição inicial indicará: I - o juiz ou tribunal, a que é dirigida; II - os nomes, prenomes, estado civil, profissão, domicílio e residência do autor e do réu; III - o fato e os fundamentos jurídicos do pedido; IV - o pedido, com as suas especificações; V - o valor da causa.',
    keywords: ['petição inicial antiga', 'cpc 1973', 'cpc73', 'artigo 282', 'revogado'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l5869impressao.htm',
    statusVigencia: 'REVOGADA_DESATIVADA',
    officialRef: 'Lei nº 5.869/1973 (Substituído pelo Art. 319 do CPC/2015)'
  },
  {
    id: 'rev-cpc73-art522',
    lawName: 'Código de Processo Civil de 1973 [REVOGADO]',
    article: 'Artigo 522',
    title: 'Agravo Retido e Agravo de Instrumento (CPC/1973)',
    content: 'Das decisões interlocutórias caberá agravo, no prazo de 10 (dez) dias, na forma retida, salvo quando se tratar de decisão suscetível de causar à parte lesão grave e de difícil reparação, bem como nos casos de inadmissão da apelação e nos relativos aos efeitos em que a apelação é recebida, quando será admitida a sua interposição por instrumento.',
    keywords: ['agravo retido', 'agravo de instrumento antigo', 'cpc 1973', 'prazo 10 dias', 'revogado'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l5869impressao.htm',
    statusVigencia: 'REVOGADA_DESATIVADA',
    officialRef: 'Lei nº 5.869/1973 (Extinção do Agravo Retido no CPC/2015)'
  },

  // ==========================================
  // --- CÓDIGO CIVIL DE 1916 (LEI 3.071/1916 - HISTÓRICO / OBSOLETO) ---
  // ==========================================
  {
    id: 'obs-cc1916-art159',
    lawName: 'Código Civil de 1916 (Lei 3.071/1916) [HISTÓRICO]',
    article: 'Artigo 159',
    title: 'Responsabilidade Civil e Dever de Reparar o Dano (Código Beviláqua 1916)',
    content: 'Aquele que, por ação ou omissão voluntária, negligência, ou imprudência, violar direito, ou causar prejuízo a outrem, fica obrigado a reparar o dano.',
    keywords: ['código civil 1916', 'cc 1916', 'ato ilícito antigo', 'clóvis beviláqua', 'obsoleto'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l3071.htm',
    statusVigencia: 'HISTORICA_OBSOLETA',
    officialRef: 'Lei nº 3.071/1916 (Substituído pelo Art. 186 do Código Civil de 2002)'
  },
  {
    id: 'obs-cc1916-art1059',
    lawName: 'Código Civil de 1916 (Lei 3.071/1916) [HISTÓRICO]',
    article: 'Artigo 1.059',
    title: 'Perdas e Danos e Lucros Cessantes (Código Beviláqua 1916)',
    content: 'Salvo as exceções previstas neste Código, as perdas e danos devidas ao credor abrangem, além do que ele efetivamente perdeu, o que razoavelmente deixou de lucrar.',
    keywords: ['perdas e danos', 'lucros cessantes', 'cc 1916', 'código civil 1916', 'obsoleto'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l3071.htm',
    statusVigencia: 'HISTORICA_OBSOLETA',
    officialRef: 'Lei nº 3.071/1916 (Substituído pelo Art. 402 do Código Civil de 2002)'
  },

  // ==========================================
  // --- LEI DE IMPRENSA (LEI 5.250/1967 - REVOGADA / STF ADPF 130) ---
  // ==========================================
  {
    id: 'rev-imprensa-art1',
    lawName: 'Lei de Imprensa (Lei 5.250/1967) [NÃO RECEPCIONADA]',
    article: 'Artigo 1º',
    title: 'Regulação da Liberdade de Manifestação do Pensamento e Imprensa (Lei 5.250/67)',
    content: 'É livre a manifestação do pensamento e a procura, o recebimento e a difusão de informações ou ideias, por qualquer meio, e sem dependência de censura, respondendo cada um, nos termos da lei, pelos abusos que cometer.',
    keywords: ['lei de imprensa', '5250', 'adpf 130', 'liberdade de imprensa', 'revogada'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l5250.htm',
    statusVigencia: 'REVOGADA_DESATIVADA',
    officialRef: 'Lei nº 5.250/1967 (Declarada Não Recepcionada pelo STF no julgamento da ADPF 130)'
  },

  // ==========================================
  // --- LEI DE SEGURANÇA NACIONAL (LEI 7.170/1983 - REVOGADA) ---
  // ==========================================
  {
    id: 'rev-lsn-art1',
    lawName: 'Lei de Segurança Nacional (Lei 7.170/1983) [REVOGADA]',
    article: 'Artigo 1º',
    title: 'Crimes contra a Segurança Nacional e a Ordem Política e Social',
    content: 'Esta Lei define os crimes que lesam ou expõem a perigo de lesão: I - a integridade territorial e a soberania nacional; II - o regime representativo e democrático, a Federação e o Estado de Direito; III - a pessoa dos chefes dos Poderes da União.',
    keywords: ['segurança nacional', 'lsn', '7170', 'ordem política', 'revogada'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l7170.htm',
    statusVigencia: 'REVOGADA_DESATIVADA',
    officialRef: 'Lei nº 7.170/1983 (Revogada expressamente pela Lei nº 14.197/2021)'
  },

  // ==========================================
  // --- CLT REDAÇÃO ANTERIOR À REFORMA TRABALHISTA (EM DESUSO / OBSOLETA) ---
  // ==========================================
  {
    id: 'obs-clt-art58-antigo',
    lawName: 'CLT (Decreto-Lei 5.452/1943) [REDAÇÃO ANTERIOR A 2017]',
    article: 'Artigo 58, § 2º (Horas In Itinere Antigas)',
    title: 'Horas In Itinere na CLT (Revogado pela Reforma Trabalhista de 2017)',
    content: 'O tempo despendido pelo empregado até o local de trabalho e para o seu retorno, por qualquer meio de transporte, não será computado na jornada de trabalho, salvo quando, tratando-se de local de difícil acesso ou não servido por transporte público, o empregador fornecer a condução.',
    keywords: ['horas in itinere', 'condução', 'reforma trabalhista', 'clt antiga', 'em desuso', 'obsoleto'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm',
    statusVigencia: 'EM_DESUSO',
    officialRef: 'Redação anterior ao Art. 58 da CLT (Modificado pela Lei nº 13.467/2017)'
  }
];
