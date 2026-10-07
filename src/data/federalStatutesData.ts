import { LegalArticle } from '../services/legalKnowledgeBaseService';

export const MASSIVE_FEDERAL_STATUTES: LegalArticle[] = [
  // ==========================================
  // --- CÓDIGO DE PROCESSO CIVIL (CPC / Lei 13.105/2015) ---
  // ==========================================
  {
    id: 'cpc-art15',
    lawName: 'CPC (Lei 13.105/2015)',
    article: 'Artigo 15',
    title: 'Aplicação Subsidária e Supletiva do CPC',
    content: 'Na ausência de normas que regulem processos eleitorais, trabalhistas ou administrativos, as disposições deste Código lhes serão aplicadas subsidiária e supletivamente.',
    keywords: ['subsidiária', 'supletiva', 'processo administrativo', 'trabalhista', 'cpc', 'artigo 15'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm'
  },
  {
    id: 'cpc-art85',
    lawName: 'CPC (Lei 13.105/2015)',
    article: 'Artigo 85',
    title: 'Honorários Advocatícios Sucumbenciais',
    content: 'A sentença condenará o vencido a pagar honorários ao advogado do vencedor. § 2º Os honorários serão fixados entre o mínimo de dez e o máximo de vinte por cento sobre o valor da condenação, do proveito econômico obtido ou, não sendo possível mensurá-lo, sobre o valor atualizado da causa.',
    keywords: ['honorários', 'sucumbência', 'advogado', 'condenação', 'cpc', 'artigo 85'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm'
  },
  {
    id: 'cpc-art98',
    lawName: 'CPC (Lei 13.105/2015)',
    article: 'Artigo 98',
    title: 'Gratuidade da Justiça',
    content: 'A pessoa natural ou jurídica, brasileira ou estrangeira, com insuficiência de recursos para pagar as custas, as despesas processuais e os honorários advocatícios tem direito à gratuidade da justiça, na forma da lei.',
    keywords: ['gratuidade', 'justiça gratuita', 'custas', 'insuficiência de recursos', 'cpc', 'artigo 98'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm'
  },
  {
    id: 'cpc-art319-full',
    lawName: 'CPC (Lei 13.105/2015)',
    article: 'Artigo 319',
    title: 'Requisitos Essenciais da Petição Inicial',
    content: 'A petição inicial indicará: I - o juízo a que é dirigida; II - os nomes, os prenomes, o estado civil, a existência de união estável, a profissão, o CPF ou o CNPJ, o endereço eletrônico, o domicílio e a residência do autor e do réu; III - os fatos e os fundamentos jurídicos do pedido; IV - o pedido com as suas especificações; V - o valor da causa; VI - as provas com que o autor pretende demonstrar a verdade dos fatos alegados; VII - a opção do autor pela realização ou não da audiência de conciliação ou de mediação.',
    keywords: ['petição inicial', 'requisitos', 'valor da causa', 'fatos e fundamentos', 'qualificação', 'cpc', 'artigo 319'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm',
    hierarchy: {
      title: 'Parte Especial - Livro I: Do Processo de Conhecimento',
      chapter: 'Capítulo I - Da Petição Inicial',
      section: 'Seção I - Dos Requisitos da Petição Inicial'
    },
    historicalVersions: [
      {
        effectiveDate: '1973-01-11 (CPC/1973 - Art. 282)',
        content: 'A petição inicial indicará: I - o juiz ou tribunal, a que é dirigida; II - os nomes, prenomes, estado civil, profissão, domicílio e residência do autor e do réu; III - o fato e os fundamentos jurídicos do pedido; IV - o pedido, com as suas especificações; V - o valor da causa.',
        changeNote: 'Inclusão da exigência do CPF/CNPJ e do endereço eletrônico (e-mail) com o CPC/2015.'
      }
    ],
    jurisprudenceRefs: [
      {
        type: 'TEMA_REPETITIVO',
        code: 'STJ - Tema Repetitivo 1.082',
        title: 'Qualificação das Partes e Acesso a Dados no PJe',
        summary: 'É dever das serventias e das partes fornecer os dados cadastrais disponíveis para qualificação da petição inicial.',
        link: 'https://www.stj.jus.br/'
      }
    ]
  },
  {
    id: 'cpc-art489',
    lawName: 'CPC (Lei 13.105/2015)',
    article: 'Artigo 489',
    title: 'Elementos Essenciais e Fundamentação da Sentença',
    content: 'São elementos essenciais da sentença: I - o relatório; II - os fundamentos, em que o juiz analisará as questões de fato e de direito; III - o dispositivo. § 1º Não se considera fundamentada qualquer decisão judicial, seja ela interlocutória, sentença ou acórdão, que: I - se limitar à indicação, à reprodução ou à paráfrase de ato normativo, sem explicar sua relação com a causa ou a questão decidida; IV - não enfrentar todos os argumentos deduzidos no processo capazes de em tese infirmar a conclusão adotada pelo julgador.',
    keywords: ['sentença', 'fundamentação', 'nulidade', 'elementos essenciais', 'relatório', 'dispositivo', 'cpc', 'artigo 489'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm'
  },
  {
    id: 'cpc-art1015',
    lawName: 'CPC (Lei 13.105/2015)',
    article: 'Artigo 1.015',
    title: 'Cabimento do Agravo de Instrumento',
    content: 'Cabe agravo de instrumento contra as decisões interlocutórias que versarem sobre: I - tutelas provisórias; II - mérito do processo; III - rejeição da alegação de convenção de arbitragem; IV - incidente de desconsideração da personalidade jurídica; V - rejeição do pedido de gratuidade da justiça ou acolhimento do pedido de sua revogação; XI - redistribuição do ônus da prova nos termos do art. 373, § 1º; XIII - outros casos expressamente referidos em lei.',
    keywords: ['agravo de instrumento', 'recurso', 'tutela provisória', 'decisão interlocutória', 'cpc', 'artigo 1015'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm',
    jurisprudenceRefs: [
      {
        type: 'TEMA_REPETITIVO',
        code: 'STJ - Tema 988 (Taxatividade Mitigada)',
        title: 'Taxatividade Mitigada do Rol do Art. 1.015 do CPC',
        summary: 'O rol do art. 1.015 do CPC é de taxatividade mitigada, admitindo-se a interposição de agravo de instrumento quando verificada a urgência decorrente da inutilidade do julgamento da questão na apelação.',
        link: 'https://www.stj.jus.br/'
      }
    ]
  },

  // ==========================================
  // --- NOVA LEI DE LICITAÇÕES (Lei 14.133/2021) ---
  // ==========================================
  {
    id: 'lic-art5',
    lawName: 'Lei 14.133/2021 (Licitações)',
    article: 'Artigo 5º',
    title: 'Princípios das Contratações Públicas',
    content: 'Na aplicação desta Lei, serão observados os princípios da legalidade, da impessoalidade, da moralidade, da publicidade, da eficiência, do interesse público, da probidade administrativa, da transparência, da eficácia, da segregação de funções, da motivação, da vinculação ao edital, do julgamento objetivo, da segurança jurídica, da razoabilidade, da proporcionalidade, da celeridade, da economicidade e do desenvolvimento nacional sustentável.',
    keywords: ['licitação', 'princípios', 'transparência', 'vinculação ao edital', 'segregação de funções', 'economicidade', 'lei 14133'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'
  },
  {
    id: 'lic-art18',
    lawName: 'Lei 14.133/2021 (Licitações)',
    article: 'Artigo 18',
    title: 'Fase Preparatória da Licitação e ETP',
    content: 'A fase preparatória do processo licitatório é caracterizada pelo planejamento e deve compatibilizar-se com o plano de contratações anual de que trata o inciso VII do caput do art. 12 desta Lei, devendo observar o seguinte: I - a descrição da necessidade da contratação fundamentada em estudo técnico preliminar (ETP) que caracterize o interesse público envolvido.',
    keywords: ['etp', 'estudo técnico preliminar', 'fase preparatória', 'planejamento', 'licitação', 'lei 14133', 'artigo 18'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'
  },
  {
    id: 'lic-art28',
    lawName: 'Lei 14.133/2021 (Licitações)',
    article: 'Artigo 28',
    title: 'Modalidades de Licitação',
    content: 'São modalidades de licitação: I - pregão; II - concorrência; III - concurso; IV - leilão; V - diálogo competitivo. § 1º Os procedimentos observarão as fases de preparatória, divulgação do edital de licitação, apresentação de propostas e lances, julgamento, habilitação, recursal e homologação.',
    keywords: ['modalidades', 'pregão', 'concorrência', 'diálogo competitivo', 'leilão', 'concurso', 'lei 14133', 'artigo 28'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'
  },
  {
    id: 'lic-art74-full',
    lawName: 'Lei 14.133/2021 (Licitações)',
    article: 'Artigo 74',
    title: 'Hipóteses de Inexigibilidade de Licitação',
    content: 'É inexigível a licitação quando inviável a competição, em especial nos casos de: I - aquisição de materiais, de equipamentos ou de gêneros que só possam ser fornecidos por produtor, empresa ou representante comercial exclusivo; II - contratação de profissional do setor artístico, diretamente ou por meio de empresário exclusivo; III - contratação de serviços técnicos especializados de natureza predominantemente intelectual com profissionais ou empresas de notória especialização.',
    keywords: ['inexigibilidade', 'inviável competição', 'produtor exclusivo', 'notória especialização', 'licitação', 'artigo 74'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm',
    hierarchy: {
      title: 'Título II - Das Contratações Públicas',
      chapter: 'Capítulo VIII - Da Contratação Direta',
      section: 'Seção II - Da Inexigibilidade de Licitação'
    },
    historicalVersions: [
      {
        effectiveDate: '1993-06-21 (Lei nº 8.666/1993 - Art. 25)',
        content: 'É inexigível a licitação quando houver inviabilidade de competição, em especial: I - para aquisição de materiais, equipamentos, ou gêneros que só possam ser fornecidos por produtor, empresa ou representante comercial exclusivo; II - para a contratação de serviços técnicos enumerados no art. 13 desta Lei, de natureza singular, com profissionais ou empresas de notória especialização.',
        changeNote: 'Substituição do requisito de "natureza singular" por "serviços técnicos especializados de natureza predominantemente intelectual" na Nova Lei 14.133/2021.'
      }
    ]
  },
  {
    id: 'lic-art75-full',
    lawName: 'Lei 14.133/2021 (Licitações)',
    article: 'Artigo 75',
    title: 'Hipóteses de Dispensa de Licitação por Valor e Situação',
    content: 'É dispensável a licitação: I - para obras e serviços de engenharia ou de serviços de manutenção de veículos automotores de valor inferior a R$ 100.000,00; II - para outros serviços e compras de valor inferior a R$ 50.000,00; VIII - nos casos de emergência ou de calamidade pública, quando caracterizada urgência de atendimento de situação que possa ocasionar prejuízo ou comprometer a continuidade dos serviços públicos.',
    keywords: ['dispensa', 'valor', 'pequeno valor', 'emergência', 'calamidade', 'compra direta', 'artigo 75', 'lei 14133'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'
  },
  {
    id: 'lic-art155',
    lawName: 'Lei 14.133/2021 (Licitações)',
    article: 'Artigo 155',
    title: 'Infrações Administrativas e Sanções',
    content: 'O licitante ou o contratado será responsabilizado administrativamente pelas seguintes infrações: I - dar causa à inexecução parcial do contrato; II - dar causa à inexecução total do contrato; IV - ensejar o retardamento da execução ou da entrega do objeto da licitação sem motivo justificado. Serão aplicadas as seguintes sanções: I - advertência; II - multa; III - impedimento de licitar e contratar; IV - declaração de inidoneidade para licitar ou contratar.',
    keywords: ['sanções', 'multa', 'inidoneidade', 'impedimento de licitar', 'inexecução contratual', 'artigo 155', 'lei 14133'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm'
  },

  // ==========================================
  // --- CLT & REFORMA TRABALHISTA ---
  // ==========================================
  {
    id: 'clt-art2',
    lawName: 'CLT (Decreto-Lei 5.452/1943)',
    article: 'Artigo 2º',
    title: 'Conceito de Empregador',
    content: 'Considera-se empregador a empresa, individual ou coletiva, que, assumindo os riscos da atividade econômica, admite, assalaria e dirige a prestação pessoal de serviço. § 2º Sempre que uma ou mais empresas, tendo, embora, cada uma delas, personalidade jurídica própria, estiverem sob a direção, controle ou administração de outra, ou filiadas, constituirão grupo econômico, sendo responsáveis solidariamente pelas obrigações decorrentes da relação de emprego.',
    keywords: ['empregador', 'grupo econômico', 'responsabilidade solidária', 'risco da atividade', 'clt', 'artigo 2'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm'
  },
  {
    id: 'clt-art3',
    lawName: 'CLT (Decreto-Lei 5.452/1943)',
    article: 'Artigo 3º',
    title: 'Conceito de Empregado e Requisitos da Relação de Emprego',
    content: 'Considera-se empregado toda pessoa física que prestar serviços de natureza não eventual a empregador, sob a dependência deste e mediante salário. Parágrafo único. Não haverá distinções relativas à espécie de emprego e à condição de trabalhador, nem entre o trabalho intelectual, técnico e manual.',
    keywords: ['empregado', 'pessoalidade', 'habitualidade', 'subordinação', 'salário', 'vínculo empregatício', 'clt', 'artigo 3'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm'
  },
  {
    id: 'clt-art11',
    lawName: 'CLT (Decreto-Lei 5.452/1943)',
    article: 'Artigo 11',
    title: 'Prescrição Trabalhista (Bienal e Quinquenal)',
    content: 'A pretensão quanto a créditos resultantes das relações de trabalho prescreve em cinco anos para os trabalhadores urbanos e rurais, até o limite de dois anos após a extinção do contrato de trabalho.',
    keywords: ['prescrição', 'bienal', 'quinquenal', 'prazo prescreve', 'créditos trabalhistas', 'clt', 'artigo 11'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm'
  },
  {
    id: 'clt-art59',
    lawName: 'CLT (Decreto-Lei 5.452/1943)',
    article: 'Artigo 59',
    title: 'Duração Normal do Trabalho e Horas Extraordinárias',
    content: 'A duração diária do trabalho poderá ser acrescida de horas suplementares, em número não excedente de duas, por acordo individual, convenção coletiva ou acordo coletivo de trabalho. § 1º A remuneração da hora extraordinária será, pelo menos, 50% (cinquenta por cento) superior à da hora normal.',
    keywords: ['horas extras', 'jornada de trabalho', 'adicional 50%', 'acordo individual', 'banco de horas', 'clt', 'artigo 59'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm'
  },
  {
    id: 'cpc-art335',
    lawName: 'CPC (Lei 13.105/2015)',
    article: 'Artigo 335',
    title: 'Prazo e Termo Inicial para Apresentar Contestação',
    content: 'O réu poderá oferecer contestação, por petição, no prazo de 15 (quinze) dias, cujo termo inicial será a data: I - da audiência de conciliação ou de mediação, ou da última sessão de conciliação, quando qualquer parte não comparecer ou comparecendo não houver acordo; II - do protocolo do pedido de cancelamento da audiência de conciliação ou de mediação apresentado pelo réu.',
    keywords: ['contestação', 'prazo de contestação', '15 dias úteis', 'termo inicial', 'conciliação', 'cpc', 'artigo 335']
  },
  {
    id: 'tst-sumula32',
    lawName: 'Súmula nº 32 do TST',
    article: 'Súmula 32',
    title: 'Presunção de Abandono de Emprego',
    content: 'Presume-se o abandono de emprego se o trabalhador não retornar ao serviço no prazo de 30 (trinta) dias após a cessação do benefício previdenciário ou ausentar-se injustificadamente por mais de 30 (trinta) dias consecutivos.',
    keywords: ['abandono de emprego', '30 dias', 'justa causa', 'ausência injustificada', 'tst', 'súmula 32']
  },
  {
    id: 'clt-art482',
    lawName: 'CLT (Decreto-Lei 5.452/1943)',
    article: 'Artigo 482, "i"',
    title: 'Justa Causa para Rescisão Contratual pelo Empregador - Abandono de Emprego',
    content: 'Constituem justa causa para rescisão do contrato de trabalho pelo empregador: i) abandono de emprego (caracterizado após ausência injustificada superior a 30 dias consecutivos segundo a Súmula 32 do TST).',
    keywords: ['justa causa', 'abandono de emprego', '30 dias', 'clt', 'artigo 482']
  },

  // ==========================================
  // --- CÓDIGO CIVIL (Lei 10.406/2002) ---
  // ==========================================
  {
    id: 'cc-art186',
    lawName: 'Código Civil (Lei 10.406/2002)',
    article: 'Artigo 186',
    title: 'Ato Ilícito e Dever de Indenizar',
    content: 'Aquele que, por ação ou omissão voluntária, negligência ou imprudência, violar direito e causar dano a outrem, ainda que exclusivamente moral, comete ato ilícito.',
    keywords: ['ato ilícito', 'dano moral', 'dano material', 'negligência', 'imprudência', 'código civil', 'artigo 186'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm'
  },
  {
    id: 'cc-art422',
    lawName: 'Código Civil (Lei 10.406/2002)',
    article: 'Artigo 422',
    title: 'Princípio da Boa-Fé Objetiva nos Contratos',
    content: 'Os contratantes são obrigados a guardar, assim na conclusão do contrato, como em sua execução, os princípios de probidade e boa-fé.',
    keywords: ['boa-fé', 'boa-fé objetiva', 'probidade', 'execução do contrato', 'código civil', 'artigo 422'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm'
  },
  {
    id: 'cc-art478',
    lawName: 'Código Civil (Lei 10.406/2002)',
    article: 'Artigo 478',
    title: 'Resolução Contratual por Onerosidade Excessiva',
    content: 'Nos contratos de execução continuada ou diferida, se a prestação de uma das partes se tornar excessivamente onerosa, com extrema vantagem para a outra, em virtude de acontecimentos extraordinários e imprevisíveis, poderá o devedor pedir a resolução do contrato.',
    keywords: ['onerosidade excessiva', 'revisão contratual', 'teoria da imprevisão', 'acontecimento extraordinário', 'código civil', 'artigo 478'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm'
  },
  {
    id: 'cc-art927',
    lawName: 'Código Civil (Lei 10.406/2002)',
    article: 'Artigo 927',
    title: 'Obrigação de Reparar o Dano (Responsabilidade Objetiva e Subjetiva)',
    content: 'Aquele que, por ato ilícito (arts. 186 e 187), causar dano a outrem, fica obrigado a repará-lo. Parágrafo único. Haverá obrigação de reparar o dano, independentemente de culpa, nos casos especificados em lei, ou quando a atividade normalmente desenvolvida pelo autor do dano implicar, por sua natureza, risco para os direitos de outrem.',
    keywords: ['responsabilidade civil', 'reparação de dano', 'responsabilidade objetiva', 'risco da atividade', 'código civil', 'artigo 927'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm'
  },

  // ==========================================
  // --- CÓDIGO DE DEFESA DO CONSUMIDOR (Lei 8.078/1990) ---
  // ==========================================
  {
    id: 'cdc-art6',
    lawName: 'CDC (Lei 8.078/1990)',
    article: 'Artigo 6º',
    title: 'Direitos Básicos do Consumidor e Inversão do Ônus da Prova',
    content: 'São direitos básicos do consumidor: III - a informação adequada e clara sobre os diferentes produtos e serviços; VI - a efetiva prevenção e reparação de danos patrimoniais e morais; VIII - a facilitação da defesa de seus direitos, inclusive com a inversão do ônus da prova, a seu favor, no processo civil, quando, a critério do juiz, for verossímil a alegação ou quando for ele hipossuficiente.',
    keywords: ['direitos do consumidor', 'inversão do ônus da prova', 'hipossuficiência', 'reparação de danos', 'cdc', 'artigo 6'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm'
  },
  {
    id: 'cdc-art14',
    lawName: 'CDC (Lei 8.078/1990)',
    article: 'Artigo 14',
    title: 'Responsabilidade Objetiva pelo Fato do Serviço',
    content: 'O fornecedor de serviços responde, independentemente da existência de culpa, pela reparação dos danos causados aos consumidores por defeitos relativos à prestação dos serviços, bem como por informações insuficientes ou inadequadas sobre sua fruição e riscos.',
    keywords: ['responsabilidade objetiva', 'defeito no serviço', 'falha na prestação', 'fornecedor', 'cdc', 'artigo 14'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm'
  },

  // ==========================================
  // --- LEI DE IMPROBIDADE ADMINISTRATIVA (Lei 8.429/1992 com alteração da Lei 14.230/2021) ---
  // ==========================================
  {
    id: 'lia-art9',
    lawName: 'Lei de Improbidade Administrativa (Lei 8.429/1992)',
    article: 'Artigo 9º',
    title: 'Atos de Improbidade que Importam Enriquecimento Ilícito',
    content: 'Constitui ato de improbidade administrativa importando em enriquecimento ilícito auferir, mediante a prática de ato doloso, qualquer tipo de vantagem patrimonial indevida em razão do exercício de cargo, mandato, função, emprego ou atividade nas entidades referidas no art. 1º desta Lei.',
    keywords: ['improbidade', 'enriquecimento ilícito', 'vantagem indevida', 'dolo', 'servidor público', 'lei 8429', 'artigo 9'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l8429.htm'
  },
  {
    id: 'lia-art10',
    lawName: 'Lei de Improbidade Administrativa (Lei 8.429/1992)',
    article: 'Artigo 10',
    title: 'Atos de Improbidade que Causam Lesão ao Erário',
    content: 'Constitui ato de improbidade administrativa que causa lesão ao erário qualquer ação ou omissão dolosa, que enseje, efetiva e comprovadamente, perda patrimonial, desvio, apropriação, malbaratamento ou dilapidação dos bens ou haveres das entidades referidas no art. 1º desta Lei.',
    keywords: ['lesão ao erário', 'perda patrimonial', 'desvio de recursos', 'danos ao patrimônio público', 'improbidade', 'artigo 10'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l8429.htm'
  },

  // ==========================================
  // --- LEI DE ACESSO À INFORMAÇÃO (LAI / Lei 12.527/2011) ---
  // ==========================================
  {
    id: 'lai-art10',
    lawName: 'Lei de Acesso à Informação (Lei 12.527/2011)',
    article: 'Artigo 10',
    title: 'Pedido de Acesso a Informações Públicas',
    content: 'Qualquer interessado poderá apresentar pedido de acesso a informações aos órgãos e entidades referidos no art. 1º desta Lei, por qualquer meio legítimo, devendo o pedido conter a identificação do requerente e a especificação da informação requerida. § 3º São vedadas quaisquer exigências relativas aos motivos determinantes da solicitação de informação de interesse público.',
    keywords: ['acesso à informação', 'transparência', 'pedido de informação', 'órgão público', 'lai', 'artigo 10'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm'
  },

  // ==========================================
  // --- MARCO CIVIL DA INTERNET (Lei 12.965/2014) ---
  // ==========================================
  {
    id: 'mci-art19',
    lawName: 'Marco Civil da Internet (Lei 12.965/2014)',
    article: 'Artigo 19',
    title: 'Responsabilidade de Provedores por Conteúdo de Terceiros',
    content: 'Com o intuito de assegurar a liberdade de expressão e impedir a censura, o provedor de aplicações de internet somente poderá ser responsabilizado civilmente por danos decorrentes de conteúdo gerado por terceiros se, após ordem judicial específica, não tomar as providências para, no âmbito e nos limites técnicos do seu serviço e dentro do prazo assinalado, tornar indisponível o conteúdo apontado como infringente, ressalvadas as disposições em contrário.',
    keywords: ['marco civil', 'provedor de aplicação', 'ordem judicial', 'remoção de conteúdo', 'liberdade de expressão', 'artigo 19'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm'
  },

  // ==========================================
  // --- LEI DO INQUILINATO (Lei 8.245/1991) ---
  // ==========================================
  {
    id: 'inq-art18',
    lawName: 'Lei do Inquilinato (Lei 8.245/1991)',
    article: 'Artigo 18',
    title: 'Fixação e Ajuste do Aluguel por Mútuo Acordo',
    content: 'É lícito às partes fixar, de comum acordo, novo valor para o aluguel, bem como inserir ou modificar cláusula de reajuste. Parágrafo único. É nula a cláusula ou imposição unilateral que altere o índice de reajuste contratual sem a concordância expressa do locatário.',
    keywords: ['inquilinato', 'reajuste', 'índice', 'locação', 'aditivo', 'mútuo acordo', 'artigo 18']
  },
  {
    id: 'inq-art27',
    lawName: 'Lei do Inquilinato (Lei 8.245/1991)',
    article: 'Artigo 27',
    title: 'Direito de Preferência do Inquilino na Alienação do Imóvel',
    content: 'No caso de venda, promessa de venda, cessão ou promessa de cessão de direitos ou dação em pagamento, o locatário tem preferência para adquirir o imóvel locado, em igualdade de condições com terceiros, devendo o locador dar-lhe conhecimento do negócio mediante notificação judicial, extrajudicial ou outro meio de ciência inquestionável. Parágrafo único. O direito de preferência caducará se não manifestada de maneira inequívoca a aceitação integral da proposta no prazo de 30 (trinta) dias.',
    keywords: ['preferência', 'direito de preferência', 'inquilino', 'venda do imóvel', 'prazo 30 dias', 'artigo 27']
  },

  // ==========================================
  // --- NOVOS DISPOSITIVOS DA LEI DE LICITAÇÕES (Lei 14.133/2021) ---
  // ==========================================
  {
    id: 'lic-art55',
    lawName: 'Lei 14.133/2021 (Licitações)',
    article: 'Artigo 55',
    title: 'Prazos Mínimos para Apresentação de Propostas e Divulgação do Edital',
    content: 'O prazo mínimo para apresentação de propostas e lances, contados a partir da data de divulgação do edital de licitação, será de: I - para aquisição de bens: a) 8 (oito) dias úteis, quando adotados os critérios de julgamento de menor preço ou de maior desconto; b) 15 (quinze) dias úteis, nas hipóteses não abrangidas pela alínea "a".',
    keywords: ['edital', 'prazo de publicação', 'pregão', 'bens comuns', '8 dias úteis', 'artigo 55']
  },
  {
    id: 'lic-art156-full',
    lawName: 'Lei 14.133/2021 (Licitações)',
    article: 'Artigo 156, § 3º',
    title: 'Limites Percentuais da Sanção de Multa Contratual',
    content: 'A sanção de multa, aplicada após regular processo administrativo, não poderá ser inferior a 0,5% (cinco décimos por cento) nem superior a 30% (trinta por cento) do valor do contrato licitado ou celebrado por dispensa/inexigibilidade.',
    keywords: ['multa', 'limite máximo de multa', '30%', 'sanção administrativa', 'artigo 156']
  },
  {
    id: 'lic-art157',
    lawName: 'Lei 14.133/2021 (Licitações)',
    article: 'Artigo 157',
    title: 'Prazo de Defesa Prévia na Aplicação de Sanções Administrativas',
    content: 'Na aplicação das sanções previstas nos incisos I, II e III do caput do art. 156 desta Lei (advertência, multa e impedimento de licitar), será facultada a defesa do interessado no prazo de 15 (quinze) dias úteis, contado da data de sua intimação.',
    keywords: ['defesa prévia', 'prazo de defesa', '15 dias úteis', 'intimação', 'sanção', 'artigo 157']
  },
  {
    id: 'lic-art164',
    lawName: 'Lei 14.133/2021 (Licitações)',
    article: 'Artigo 164',
    title: 'Prazo de Impugnação ao Edital de Licitação',
    content: 'Qualquer pessoa é parte legítima para impugnar edital de licitação por irregularidade na aplicação desta Lei ou para solicitar esclarecimento sobre os seus termos, devendo protocolar o pedido até 3 (três) dias úteis antes da data de abertura do certame.',
    keywords: ['impugnação', 'impugnar edital', '3 dias úteis', 'abertura do certame', 'artigo 164']
  },

  // ==========================================
  // --- ADICIONAIS TRABALHISTAS (CLT) ---
  // ==========================================
  {
    id: 'clt-art193-p2',
    lawName: 'CLT (Decreto-Lei 5.452/1943)',
    article: 'Artigo 193, § 2º',
    title: 'Vedação à Cumulação dos Adicionais de Insalubridade e Periculosidade',
    content: 'O trabalho em condições de periculosidade assegura ao empregado um adicional de 30% (trinta por cento) sobre o salário sem os acréscimos resultantes de gratificações, prêmios ou participações nos lucros da empresa. § 2º O empregado poderá optar pelo adicional de insalubridade que porventura lhe seja devido, sendo vedada a cumulação de ambos os adicionais na mesma folha de pagamento.',
    keywords: ['insalubridade', 'periculosidade', 'cumulação', 'vedada a cumulação', 'adicional 30%', 'opcao', 'artigo 193']
  },

  // ==========================================
  // --- CDC DIREITO DE ARREPENDIMENTO ---
  // ==========================================
  {
    id: 'cdc-art49',
    lawName: 'CDC (Lei 8.078/1990)',
    article: 'Artigo 49',
    title: 'Direito de Arrependimento em Compras Fora do Estabelecimento',
    content: 'O consumidor pode desistir do contrato, no prazo de 7 dias a contar de sua assinatura ou do ato de recebimento do produto ou serviço, sempre que a contratação de fornecimento de produtos e serviços ocorrer fora do estabelecimento comercial, especialmente por telefone ou a domicílio (e internet). Parágrafo único. Se o consumidor exercitar o direito de arrependimento, os valores eventualmente pagos, a qualquer título, durante o prazo de reflexão, serão devolvidos, de imediato, monetariamente atualizados.',
    keywords: ['arrependimento', '7 dias', 'compras online', 'internet', 'devolução', 'artigo 49']
  },

  // ==========================================
  // --- LGPD COMUNICAÇÃO DE INCIDENTES ---
  // ==========================================
  {
    id: 'lgpd-art48',
    lawName: 'LGPD (Lei 13.709/2018)',
    article: 'Artigo 48',
    title: 'Comunicação de Incidentes de Segurança à ANPD e Titulares',
    content: 'O controlador deverá comunicar à autoridade nacional e ao titular a ocorrência de incidente de segurança que possa acarretar risco ou dano relevante aos titulares. § 1º A comunicação será feita em prazo razoável, conforme definido pela autoridade nacional, e deverá mencionar a descrição da natureza dos dados pessoais afetados, as medidas de mitigação e os riscos envolvidos.',
    keywords: ['incidente', 'vazamento', 'anpd', 'comunicação', 'risco relevante', 'artigo 48']
  },

  // ==========================================
  // --- CÓDIGO DE PROCESSO PENAL (CPP / Decreto-Lei 3.689/1941) ---
  // ==========================================
  {
    id: 'cpp-art5',
    lawName: 'Código de Processo Penal (Decreto-Lei 3.689/1941)',
    article: 'Artigo 5º',
    title: 'Formas de Instauração do Inquérito Policial',
    content: 'Nos crimes de ação pública o inquérito policial será iniciado: I - de ofício; II - mediante requisição da autoridade judiciária ou do Ministério Público, ou a requerimento do ofendido ou de quem tiver qualidade para representá-lo.',
    keywords: ['inquérito policial', 'instauração', 'ministério público', 'ação pública', 'cpp', 'artigo 5'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/decreto-lei/del3689.htm'
  },
  {
    id: 'cpp-art283',
    lawName: 'Código de Processo Penal (Decreto-Lei 3.689/1941)',
    article: 'Artigo 283',
    title: 'Ninguém Poderá ser Preso Senão em Flagrante ou por Ordem Escrita',
    content: 'Ninguém poderá ser preso senão em flagrante delito ou por ordem escrita e fundamentada da autoridade judiciária competente, em decorrência de prisão cautelar ou em virtude de condenação criminal transitada em julgado.',
    keywords: ['prisão', 'flagrante', 'ordem judicial', 'trânsito em julgado', 'liberdade', 'cpp', 'artigo 283'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/decreto-lei/del3689.htm'
  },
  {
    id: 'cpp-art312',
    lawName: 'Código de Processo Penal (Decreto-Lei 3.689/1941)',
    article: 'Artigo 312',
    title: 'Requisitos da Prisão Preventiva',
    content: 'A prisão preventiva poderá ser decretada como garantia da ordem pública, da ordem econômica, por conveniência da instrução criminal ou para assegurar a aplicação da lei penal, quando houver prova da existência do crime e indício suficiente de autoria e de perigo gerado pelo estado de liberdade do imputado.',
    keywords: ['prisão preventiva', 'ordem pública', 'instrução criminal', 'garantia da lei penal', 'cpp', 'artigo 312'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/decreto-lei/del3689.htm'
  },
  {
    id: 'cpp-art315',
    lawName: 'Código de Processo Penal (Decreto-Lei 3.689/1941)',
    article: 'Artigo 315',
    title: 'Dever de Fundamentação Concreta das Decisões de Prisão',
    content: 'A decisão que decretar, substituir ou denegar a prisão preventiva será sempre motivada e fundamentada. § 2º Não se considera fundamentada qualquer decisão judicial, seja ela interlocutória, sentença ou acórdão, que: I - se limitar à indicação, à reprodução ou à paráfrase de ato normativo, sem explicar sua relação com a causa ou a questão decidida.',
    keywords: ['fundamentação', 'motivação', 'nulidade da prisão', 'paráfrase', 'cpp', 'artigo 315'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/decreto-lei/del3689.htm'
  },
  {
    id: 'cpp-art395',
    lawName: 'Código de Processo Penal (Decreto-Lei 3.689/1941)',
    article: 'Artigo 395',
    title: 'Hipóteses de Rejeição da Denúncia ou Queixa-Crime',
    content: 'A denúncia ou queixa será rejeitada quando: I - for manifestamente inépcia; II - faltar pressuposto processual ou condição para o exercício da ação penal; ou III - faltar justa causa para o exercício da ação penal.',
    keywords: ['denúncia', 'queixa-crime', 'inépcia', 'justa causa', 'rejeição', 'cpp', 'artigo 395'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/decreto-lei/del3689.htm'
  },

  // ==========================================
  // --- LEI DE IMPROBIDADE ADMINISTRATIVA (LIA / Lei 8.429/1992 - Atualizada pela Lei 14.230/2021) ---
  // ==========================================
  {
    id: 'lia-art1-full',
    lawName: 'Lei de Improbidade Administrativa (Lei 8.429/1992)',
    article: 'Artigo 1º, § 1º',
    title: 'Exigência de Dolo Específico para Caracterização de Improbidade',
    content: 'Consideram-se atos de improbidade administrativa as condutas tipificadas nos arts. 9º, 10 e 11 desta Lei, ressalvados os tipos previstos em leis especiais. § 1º Consideram-se atos de improbidade administrativa as condutas dolosas praticadas pelos agentes públicos. § 2º Considera-se dolo a vontade livre e consciente de alcançar o resultado ilícito tipificado nos arts. 9º, 10 e 11 desta Lei, não bastando a voluntariedade do agente.',
    keywords: ['improbidade', 'dolo específico', 'conduta dolosa', 'resultado ilícito', 'lei 8429', 'artigo 1'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l8429.htm',
    historicalVersions: [
      {
        effectiveDate: '1992-06-02 (Redação Original)',
        content: 'Os atos de improbidade praticados por qualquer agente público ensejarão as sanções desta lei...',
        changeNote: 'A Lei nº 14.230/2021 extinguiu a modalidade culposa da improbidade administrativa, exigindo dolo comprovado.'
      }
    ]
  },
  {
    id: 'lia-art9-full',
    lawName: 'Lei de Improbidade Administrativa (Lei 8.429/1992)',
    article: 'Artigo 9º',
    title: 'Atos de Improbidade que Importam Enriquecimento Ilícito',
    content: 'Constitui ato de improbidade administrativa importando em enriquecimento ilícito auferir, mediante a prática de ato doloso, qualquer tipo de vantagem patrimonial indevida em razão do exercício de cargo, mandato, função, emprego ou atividade nas entidades referidas no art. 1º desta Lei.',
    keywords: ['enriquecimento ilícito', 'propina', 'vantagem patrimonial', 'cargo público', 'improbidade', 'artigo 9'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l8429.htm'
  },
  {
    id: 'lia-art17',
    lawName: 'Lei de Improbidade Administrativa (Lei 8.429/1992)',
    article: 'Artigo 17',
    title: 'Legitimidade Exclusiva do Ministério Público na Ação de Improbidade',
    content: 'A ação para a aplicação das sanções de que trata esta Lei será proposta pelo Ministério Público e seguirá o procedimento comum previsto na Lei nº 13.105, de 16 de março de 2015 (Código de Processo Civil).',
    keywords: ['legitimidade', 'ministério público', 'ação de improbidade', 'cpc', 'improbidade', 'artigo 17'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l8429.htm'
  },

  // ==========================================
  // --- LEI DE FALÊNCIAS E RECUPERAÇÃO (Lei 11.101/2005) ---
  // ==========================================
  {
    id: 'lf-art6',
    lawName: 'Lei de Falências e Recuperação (Lei 11.101/2005)',
    article: 'Artigo 6º',
    title: 'Suspensão de Ações e Execuções no Deferimento do Processamento (Stay Period)',
    content: 'O deferimento do processamento da recuperação judicial implica: I - suspensão do curso da prescrição das obrigações do devedor sujeitas à recuperação judicial; II - suspensão de todas as ações e execuções contra o devedor, inclusive as dos credores particulares do sócio solidário, relativas a créditos sujeitos à recuperação judicial. § 4º O prazo de suspensão de 180 (cento e oitenta) dias poderá ser prorrogado por igual período, uma única vez, em caráter excepcional.',
    keywords: ['stay period', 'suspensão de execuções', '180 dias', 'recuperação judicial', 'falência', 'artigo 6'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2004-2006/2005/lei/l11101.htm'
  },
  {
    id: 'lf-art47',
    lawName: 'Lei de Falências e Recuperação (Lei 11.101/2005)',
    article: 'Artigo 47',
    title: 'Objetivo da Recuperação Judicial de Empresas',
    content: 'A recuperação judicial tem por objetivo viabilizar a superação da situação de crise econômico-financeira do devedor, a fim de permitir a manutenção da fonte produtora, do emprego dos trabalhadores e dos interesses dos credores, promovendo, assim, a preservação da empresa, sua função social e o estímulo à atividade econômica.',
    keywords: ['preservação da empresa', 'função social', 'manutenção de empregos', 'recuperação judicial', 'crise financeira', 'artigo 47'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2004-2006/2005/lei/l11101.htm'
  },
  {
    id: 'lf-art94',
    lawName: 'Lei de Falências e Recuperação (Lei 11.101/2005)',
    article: 'Artigo 94',
    title: 'Hipóteses de Decretação da Falência do Devedor',
    content: 'Será decretada a falência do devedor que: I - sem relevante razão de direito, não paga, no vencimento, obrigação líquida materializada em título ou títulos executivos protestados cuja soma ultrapasse o equivalente a 40 (quarenta) salários-mínimos na data do pedido de falência.',
    keywords: ['falência', 'protesto', '40 salários mínimos', 'título executivo', 'vencimento', 'artigo 94'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2004-2006/2005/lei/l11101.htm'
  },

  // ==========================================
  // --- LEI DE ACESSO À INFORMAÇÃO (LAI / Lei 12.527/2011) ---
  // ==========================================
  // ==========================================
  // --- LEI DO MANDADO DE SEGURANÇA (Lei 12.016/2009) ---
  // ==========================================
  {
    id: 'ms-art1',
    lawName: 'Lei do Mandado de Segurança (Lei 12.016/2009)',
    article: 'Artigo 1º',
    title: 'Proteção a Direito Líquido e Certo Não Amparado por Habeas Corpus',
    content: 'Conceder-se-á mandado de segurança para proteger direito líquido e certo, não amparado por habeas corpus ou habeas data, sempre que, ilegalmente ou com abuso de poder, qualquer pessoa física ou jurídica sofrer violação ou houver justo receio de sofrê-la por parte de autoridade pública ou agente de pessoa jurídica no exercício de atribuições do Poder Público.',
    keywords: ['mandado de segurança', 'direito líquido e certo', 'abuso de poder', 'autoridade pública', 'liminar', 'artigo 1'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l12016.htm'
  },
  {
    id: 'ms-art7-iii',
    lawName: 'Lei do Mandado de Segurança (Lei 12.016/2009)',
    article: 'Artigo 7º, III',
    title: 'Concessão de Medida Liminar em Mandado de Segurança',
    content: 'Ao despachar a inicial, o juiz ordenará: III - que se suspenda o ato que deu motivo ao pedido, quando houver fundamento relevante e do ato impugnado puder resultar a ineficácia da medida, caso seja finalmente deferida, sendo facultado exigir do impetrante caução, fiança ou depósito.',
    keywords: ['liminar', 'suspensão do ato', 'fundamento relevante', 'ineficácia da medida', 'mandado de segurança', 'artigo 7'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l12016.htm'
  },
  {
    id: 'ms-art23',
    lawName: 'Lei do Mandado de Segurança (Lei 12.016/2009)',
    article: 'Artigo 23',
    title: 'Prazo Decadencial de 120 Dias para Impetração do MS',
    content: 'O direito de requerer mandado de segurança extinguir-se-á decorridos 120 (cento e vinte) dias, contados da ciência, pelo interessado, do ato impugnado.',
    keywords: ['prazo decadencial', '120 dias', 'impetração', 'ciência do ato', 'mandado de segurança', 'artigo 23'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l12016.htm'
  },

  // ==========================================
  // --- ESTATUTO DA ADVOCACIA E DA OAB (Lei 8.906/1994) ---
  // ==========================================
  {
    id: 'oab-art7',
    lawName: 'Estatuto da OAB (Lei 8.906/1994)',
    article: 'Artigo 7º',
    title: 'Direitos e Prerrogativas Fundamentais do Advogado',
    content: 'São direitos do advogado: I - exercer, com liberdade, a profissão em todo o território nacional; II - a inviolabilidade de seu escritório ou local de trabalho, bem como de seus instrumentos de trabalho, de sua correspondência escrita, eletrônica, telefônica e telemática, desde que relativas ao exercício da advocacia; III - comunicar-se com seus clientes, pessoal e reservadamente, mesmo sem procuração, quando estes se acharem presos, detidos ou recolhidos em estabelecimentos civis ou militares.',
    keywords: ['prerrogativas', 'advogado', 'inviolabilidade', 'escritório', 'sigilo profissional', 'oab', 'artigo 7'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l8906.htm'
  },

  // ==========================================
  // --- CÓDIGO TRIBUTÁRIO NACIONAL (CTN / Lei 5.172/1966) ---
  // ==========================================
  {
    id: 'ctn-art150',
    lawName: 'Código Tributário Nacional (Lei 5.172/1966)',
    article: 'Artigo 150 (CF/88)',
    title: 'Limitações Constitucionais ao Poder de Tributar',
    content: 'Sem prejuízo de outras garantias asseguradas ao contribuinte, é vedado à União, aos Estados, ao Distrito Federal e aos Municípios: I - exigir ou aumentar tributo sem lei que o estabeleça (Legalidade); II - instituir tratamento desigual entre contribuintes que se encontrem em situação equivalente; III - cobrar tributos: a) em relação a fatos geradores ocorridos antes do início da vigência da lei que os houver instituído ou aumentado (Irretroatividade); b) no mesmo exercício financeiro em que haja sido publicada a lei que os instituiu ou aumentou (Anterioridade).',
    keywords: ['tributário', 'legalidade tributária', 'anterioridade', 'irretroatividade', 'vedação ao confisco', 'ctn', 'artigo 150'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm'
  },
  {
    id: 'ctn-art174',
    lawName: 'Código Tributário Nacional (Lei 5.172/1966)',
    article: 'Artigo 174',
    title: 'Prescrição da Ação para Cobrança do Crédito Tributário',
    content: 'A ação para a cobrança do crédito tributário prescreve em 5 (cinco) anos, contados da data da sua constituição definitiva. Parágrafo único. A prescrição se interrompe: I - pelo despacho do juiz que ordenar a citação em execução fiscal; II - pelo protesto judicial; III - por qualquer ato judicial que constitua em mora o devedor.',
    keywords: ['prescrição tributária', '5 anos', 'execução fiscal', 'constituição definitiva', 'ctn', 'artigo 174'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm'
  },

  // ==========================================
  // --- ESTATUTO DA CRIANÇA E DO ADOLESCENTE (ECA / Lei 8.069/1990) ---
  // ==========================================
  {
    id: 'eca-art4',
    lawName: 'Estatuto da Criança e do Adolescente (Lei 8.069/1990)',
    article: 'Artigo 4º',
    title: 'Dever da Família, Sociedade e Estado na Garantia de Direitos',
    content: 'É dever da família, da comunidade, da sociedade em geral e do poder público assegurar, com absoluta prioridade, a efetivação dos direitos referentes à vida, à saúde, à alimentação, à educação, ao esporte, ao lazer, à profissionalização, à cultura, à dignidade, ao respeito, à liberdade e à convivência familiar e comunitária.',
    keywords: ['eca', 'absoluta prioridade', 'criança', 'adolescente', 'família', 'poder público', 'artigo 4'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l8069.htm'
  },
  {
    id: 'eca-art18',
    lawName: 'Estatuto da Criança e do Adolescente (Lei 8.069/1990)',
    article: 'Artigo 18',
    title: 'Dever de Zelo e Proteção Contra Tratamento Desumano',
    content: 'É dever de todos velar pela dignidade da criança e do adolescente, pondo-os a salvo de qualquer tratamento desumano, violento, aterrorizante, vexatório ou constrangedor.',
    keywords: ['dignidade', 'proteção infantil', 'tratamento vexatório', 'eca', 'artigo 18'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l8069.htm'
  },

  // ==========================================
  // --- CÓDIGO DE TRÂNSITO BRASILEIRO (CTB / Lei 9.503/1997) ---
  // ==========================================
  {
    id: 'ctb-art165',
    lawName: 'Código de Trânsito Brasileiro (Lei 9.503/1997)',
    article: 'Artigo 165',
    title: 'Dirigir sob a Influência de Álcool ou Substância Psicoativa',
    content: 'Dirigir sob a influência de álcool ou de qualquer outra substância psicoativa que determine dependência: Infração - gravíssima; Penalidade - multa (dez vezes) e suspensão do direito de dirigir por 12 (doze) meses. Medida administrativa - recolhimento do documento de habilitação e retenção do veículo.',
    keywords: ['trânsito', 'lei seca', 'embriaguez', 'multa gravíssima', 'suspensão cnh', 'ctb', 'artigo 165'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l9503.htm'
  },
  {
    id: 'ctb-art306',
    lawName: 'Código de Trânsito Brasileiro (Lei 9.503/1997)',
    article: 'Artigo 306',
    title: 'Crime de Condução de Veículo em Estado de Embriaguez',
    content: 'Conduzir veículo automotor com capacidade psicomotora alterada em razão da influência de álcool ou de outra substância psicoativa que determine dependência: Penas - detenção, de seis meses a três anos, multa e suspensão ou proibição de se obter a permissão ou a habilitação para dirigir veículo automotor.',
    keywords: ['crime de trânsito', 'bafômetro', 'embriaguez ao volante', 'detenção', 'ctb', 'artigo 306'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l9503.htm'
  },

  // ==========================================
  // --- DIREITO PREVIDENCIÁRIO & LOAS (Lei 8.213/1991 e Lei 8.742/1993) ---
  // ==========================================
  {
    id: 'prev-art42',
    lawName: 'Lei de Benefícios da Previdência Social (Lei 8.213/1991)',
    article: 'Artigo 42',
    title: 'Aposentadoria por Incapacidade Permanente (Invalidez)',
    content: 'A aposentadoria por incapacidade permanente, uma vez cumprida, quando for o caso, a carência exigida, será devida ao segurado que, estando ou não em gozo de auxílio por incapacidade temporária, for considerado incapaz e insuscetível de reabilitação para o exercício de atividade que lhe garanta a subsistência, e ser-lhe-á paga enquanto permanecer nesta condição.',
    keywords: ['previdenciário', 'invalidez', 'incapacidade permanente', 'inss', 'aposentadoria', 'artigo 42'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l8213cons.htm'
  },
  {
    id: 'loas-art20',
    lawName: 'Lei Orgânica da Assistência Social (LOAS / Lei 8.742/1993)',
    article: 'Artigo 20',
    title: 'Benefício de Prestação Continuada (BPC / LOAS)',
    content: 'O benefício de prestação continuada é a garantia de um salário-mínimo mensal à pessoa com deficiência e ao idoso com 65 (sessenta e cinco) anos ou mais que comprovem não possuir meios de prover a própria manutenção nem de tê-la provida por sua família.',
    keywords: ['bpc', 'loas', 'benefício assistencial', 'idoso', 'pesssoa com deficiência', 'baixa renda', 'artigo 20'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l8742.htm'
  },

  // ==========================================
  // --- LEI MARIA DA PENHA (Lei 11.340/2006) ---
  // ==========================================
  {
    id: 'mp-art7',
    lawName: 'Lei Maria da Penha (Lei 11.340/2006)',
    article: 'Artigo 7º',
    title: 'Formas de Violência Doméstica e Familiar contra a Mulher',
    content: 'São formas de violência doméstica e familiar contra a mulher, entre outras: I - a violência física; II - a violência psicológica; III - a violência sexual; IV - a violência patrimonial; V - a violência moral.',
    keywords: ['maria da penha', 'violência doméstica', 'violência psicológica', 'medidas protetivas', 'mulher', 'artigo 7'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm'
  },
  {
    id: 'mp-art22',
    lawName: 'Lei Maria da Penha (Lei 11.340/2006)',
    article: 'Artigo 22',
    title: 'Medidas Protetivas de Urgência Obrigando o Agressor',
    content: 'Constatada a prática de violência doméstica e familiar contra a mulher, nos termos desta Lei, o juiz poderá aplicar, de imediato, ao agressor, em conjunto ou separadamente, as seguintes medidas protetivas de urgência: I - suspensão da posse ou restrição do porte de armas; II - afastamento do lar, domicílio ou local de convivência com a ofendida; III - proibição de aproximação da ofendida, de seus familiares e das testemunhas.',
    keywords: ['medidas protetivas', 'afastamento do lar', 'urgência', 'agressor', 'maria da penha', 'artigo 22'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm'
  },

  // ==========================================
  // --- LEI DE JUIZADOS ESPECIAIS (LJE / Lei 9.099/1995) ---
  // ==========================================
  {
    id: 'lje-art3',
    lawName: 'Lei de Juizados Especiais Cíveis e Criminais (Lei 9.099/1995)',
    article: 'Artigo 3º',
    title: 'Competência dos Juizados Especiais Cíveis (Até 40 Salários Mínimos)',
    content: 'O Juizado Especial Cível tem competência para conciliação, processo e julgamento das causas cíveis de menor complexidade, assim consideradas: I - as causas cujo valor não exceda a quarenta vezes o salário mínimo; II - as enumeradas no art. 275, inciso II, do Código de Processo Civil; III - a ação de despejo para uso próprio; IV - as ações possessórias sobre bens imóveis de valor não excedente ao fixado no inciso I deste artigo.',
    keywords: ['juizado especial', 'jec', '40 salários mínimos', 'causas cíveis', 'conciliação', 'artigo 3'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l9099.htm'
  },

  // ==========================================
  // --- LEI DE EXECUÇÃO PENAL (LEP / Lei 7.210/1984) ---
  // ==========================================
  {
    id: 'lep-art112',
    lawName: 'Lei de Execução Penal (Lei 7.210/1984)',
    article: 'Artigo 112',
    title: 'Requisitos para Progressão de Regime Prisional',
    content: 'A pena privativa de liberdade será executada em forma progressiva com a transferência para regime menos rigoroso, a ser determinada pelo juiz, quando o preso tiver cumprido ao menos: I - 16% da pena, se o apenado for primário e o crime tiver sido praticado sem violência à pessoa ou grave ameaça; II - 20% da pena, se o apenado for reincidente em crime praticado sem violência à pessoa ou grave ameaça; III - 25% da pena, se o apenado for primário em crime com violência à pessoa ou grave ameaça; (...) VI - 50% da pena, se o apenado for condenado pela prática de crime hediondo ou equiparado, com resultado morte, se for primário.',
    keywords: ['progressão de regime', 'execução penal', 'lep', 'reincidente', 'primário', 'hediondo', 'artigo 112'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/leis/l7210.htm'
  },

  // ==========================================
  // --- LEI DE DROGAS (Lei 11.343/2006) ---
  // ==========================================
  {
    id: 'drogas-art28',
    lawName: 'Lei de Drogas (Lei 11.343/2006)',
    article: 'Artigo 28',
    title: 'Porte de Drogas para Consumo Pessoal',
    content: 'Quem adquirir, guardar, tiver em depósito, transportar ou trouxer consigo, para consumo pessoal, drogas sem autorização ou em desacordo com determinação legal ou regulamentar será submetido às seguintes penas: I - advertência sobre os efeitos das drogas; II - prestação de serviços à comunidade; III - medida educativa de comparecimento a programa ou curso educativo.',
    keywords: ['consumo pessoal', 'porte de drogas', 'advertência', 'medida educativa', 'artigo 28'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11343.htm'
  },
  {
    id: 'drogas-art33',
    lawName: 'Lei de Drogas (Lei 11.343/2006)',
    article: 'Artigo 33',
    title: 'Tráfico Ilícito de Entorpecentes',
    content: 'Importar, exportar, remeter, preparar, produzir, fabricar, adquirir, vender, expor à venda, oferecer, ter em depósito, transportar, trazer consigo, guardar, prescrever, ministrar, entregar a consumo ou fornecer drogas, ainda que gratuitamente, sem autorização ou em desacordo com determinação legal ou regulamentar: Penas - reclusão de 5 (cinco) a 15 (quinze) anos e pagamento de 500 (quinhentos) a 1.500 (mil e quinhentos) dias-multa.',
    keywords: ['tráfico de drogas', 'reclusão', 'entorpecentes', 'venda de drogas', 'artigo 33'],
    sourceUrl: 'http://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11343.htm'
  }
];

