import { LegalArticle } from '../services/legalKnowledgeBaseService';

/**
 * Acervo de Legislação Estadual, Municipal e Regimentos Internos dos Tribunais Estaduais (TJ/TRF)
 */
export const STATE_AND_MUNICIPAL_STATUTES: LegalArticle[] = [
  // ==========================================
  // --- LEGISLAÇÃO ESTADUAL (SÃO PAULO & OUTROS ESTADOS) ---
  // ==========================================
  {
    id: 'est-sp-art111',
    lawName: 'Constituição do Estado de São Paulo (CESP/1989)',
    article: 'Artigo 111',
    title: 'Princípios da Administração Pública Estadual e Municipal em SP',
    content: 'A administração pública direta, indireta ou fundacional, de qualquer dos Poderes do Estado, obedecerá aos princípios de legalidade, impessoalidade, moralidade, publicidade, razoabilidade, finalidade, motivação, interesse público e eficiência.',
    keywords: ['constituição estadual', 'sp', 'são paulo', 'princípios', 'motivação', 'artigo 111'],
    sourceUrl: 'https://www.al.sp.gov.br/norma/139556',
    lawType: 'ESTADUAL',
    statusVigencia: 'COMUM'
  },
  {
    id: 'est-sp-art241',
    lawName: 'Estatuto dos Servidores de SP (Lei Estadual 10.261/1968)',
    article: 'Artigo 241',
    title: 'Deveres Fundamentais dos Funcionários Públicos Estaduais',
    content: 'São deveres do funcionário: I - ser assíduo e pontual; II - cumprir as ordens superiores, representando quando forem manifestamente ilegais; III - desempenhar com zelo e presteza os trabalhos de que for encarregado; IV - guardar sigilo sobre os assuntos da repartição.',
    keywords: ['estatuto dos servidores', 'são paulo', 'servidor estadual', 'deveres', 'artigo 241'],
    sourceUrl: 'https://www.al.sp.gov.br/norma/35222',
    lawType: 'ESTADUAL',
    statusVigencia: 'COMUM'
  },
  {
    id: 'est-tjsp-art252',
    lawName: 'Regimento Interno do TJSP',
    article: 'Artigo 252',
    title: 'Manutenção da Sentença por Remissão aos seus Próprios Fundamentos (TJSP)',
    content: 'Nos recursos em geral, o relator poderá limitar-se a ratificar os fundamentos da decisão recorrida, quando, suficientemente motivada, houver de mantê-la, apreciando as razões recursais expendidas nos autos.',
    keywords: ['tjsp', 'regimento interno', 'remissão', 'ratificação da sentença', 'artigo 252'],
    sourceUrl: 'https://www.tjsp.jus.br/',
    lawType: 'ESTADUAL',
    statusVigencia: 'COMUM'
  },

  // ==========================================
  // --- LEGISLAÇÃO MUNICIPAL (PREFEITURAS & LEIS ORGÂNICAS) ---
  // ==========================================
  {
    id: 'mun-sp-art14',
    lawName: 'Lei Orgânica do Município de São Paulo (LOM-SP)',
    article: 'Artigo 14',
    title: 'Autonomia e Competências Exclusivas do Município',
    content: 'Cabe ao Município prover a tudo quanto respeite ao seu interesse local e ao bem-estar de sua população, cabendo-lhe, privativamente, dentre outras, as seguintes atribuições: I - legislar sobre assuntos de interesse local; II - suplementar a legislação federal e a estadual no que couber; III - instituir e arrecadar os tributos de sua competência.',
    keywords: ['lei orgânica municipal', 'interesse local', 'prefeitura', 'competência municipal', 'artigo 14'],
    sourceUrl: 'https://www.saopaulo.sp.leg.br/',
    lawType: 'MUNICIPAL',
    statusVigencia: 'COMUM'
  },
  {
    id: 'mun-sp-art15',
    lawName: 'Código de Obras de São Paulo (Lei Municipal 16.642/2017)',
    article: 'Artigo 15',
    title: 'Emissão de Alvará de Aprovação e Execução de Obras',
    content: 'Nenhuma obra, edificação, reforma ou demolição poderá ser iniciada sem a prévia obtenção do Alvará de Aprovação e Execução expedido pela Prefeitura Municipal, devendo ser acompanhada por Profissional Habilitado responsável pelo projeto e execução.',
    keywords: ['código de obras', 'alvará', 'prefeitura', 'edificação', 'licença de obras', 'artigo 15'],
    sourceUrl: 'https://legislacao.prefeitura.sp.gov.br/',
    lawType: 'MUNICIPAL',
    statusVigencia: 'COMUM'
  },
  {
    id: 'mun-sp-art178',
    lawName: 'Estatuto dos Servidores Municipais de SP (Lei Municipal 8.989/1979)',
    article: 'Artigo 178',
    title: 'Deveres Funcionais dos Servidores Públicos Municipais',
    content: 'São deveres do funcionário municipal: I - assiduidade e pontualidade; II - lealdade às instituições a que servir; III - observância das normas legais e regulamentares; IV - atendimento expedito às requisições para a defesa da Fazenda Municipal.',
    keywords: ['servidor municipal', 'estatuto municipal', 'prefeitura', 'fazenda municipal', 'artigo 178'],
    sourceUrl: 'https://legislacao.prefeitura.sp.gov.br/',
    lawType: 'MUNICIPAL',
    statusVigencia: 'COMUM'
  }
];
