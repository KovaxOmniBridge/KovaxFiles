import React, { useState, useRef, useEffect } from 'react';
import {
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  FileText,
  Download,
  Printer,
  FileUp,
  Sparkles,
  ShieldCheck,
  Check,
  Scale,
  Building2,
  Quote,
  PenTool,
  Copy,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Search,
  BookOpen,
  FolderTree,
  LayoutGrid,
  FileCheck,
  FileCode,
  Sparkle,
  FileSpreadsheet,
  Briefcase,
  KeyRound,
  FileSignature,
  Eye,
  Gavel,
  ArrowUp,
  ArrowDown,
  Filter,
  History,
  Award,
  SlidersHorizontal,
  FileEdit,
  RefreshCw,
  FileDown,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  QrCode,
  BookOpenCheck,
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface VersionSnapshot {
  id: string;
  timestamp: string;
  title: string;
  wordCount: number;
  content: string;
}

interface LegalArticleRef {
  law: string;
  article: string;
  summary: string;
  text: string;
}

const QUICK_VADE_MECUM: LegalArticleRef[] = [
  {
    law: 'CF/88',
    article: 'Art. 5º, XXXV',
    summary: 'Princípio da Inafastabilidade da Jurisdição',
    text: 'A lei não mecerá da apreciação do Poder Judiciário lesão ou ameaça a direito.'
  },
  {
    law: 'CF/88',
    article: 'Art. 5º, LV',
    summary: 'Princípio do Contraditório e Ampla Defesa',
    text: 'Aos litigantes, em processo judicial ou administrativo, e aos acusados em geral são assegurados o contraditório e ampla defesa, com os meios e recursos a ela inerentes.'
  },
  {
    law: 'CPC/15',
    article: 'Art. 300',
    summary: 'Requisitos da Tutela de Urgência (Liminar)',
    text: 'A tutela de urgência será concedida quando houver elementos que evidenciem a probabilidade do direito e o perigo de dano ou o risco ao resultado útil do processo.'
  },
  {
    law: 'CPC/15',
    article: 'Art. 319',
    summary: 'Requisitos da Petição Inicial',
    text: 'A petição inicial indicará: I - o juízo a que é dirigida; II - os nomes, os prenomes, o estado civil, a profissão, o CPF ou CNPJ, o endereço eletrônico, o domicílio e a residência do autor e do réu...'
  },
  {
    law: 'CPC/15',
    article: 'Art. 330',
    summary: 'Indeferimento e Inépcia da Petição Inicial',
    text: 'A petição inicial será indeferida quando: I - for inepta; II - a parte for manifestamente ilegítima; III - o autor carecer de interesse processual.'
  },
  {
    law: 'CC/02',
    article: 'Art. 186',
    summary: 'Ato Ilícito e Dever de Indenizar',
    text: 'Aquele que, por ação ou omissão voluntária, negligência ou imprudência, violar direito e causar dano a outrem, ainda que exclusivamente moral, comete ato ilícito.'
  },
  {
    law: 'CC/02',
    article: 'Art. 927',
    summary: 'Obrigação de Reparar o Dano',
    text: 'Aquele que, por ato ilícito (arts. 186 e 187), causar dano a outrem, fica obrigado a repará-lo.'
  },
  {
    law: 'CLT',
    article: 'Art. 467',
    summary: 'Multa das Verbas Rescisórias Incontroversas',
    text: 'Em caso de rescisão do contrato de trabalho, havendo controvérsia sobre o montante das verbas rescisórias, o empregador é obrigado a pagar ao trabalhador, à data do comparecimento à Justiça do Trabalho, a parte incontroversa dessas verbas, sob pena de pagá-las acrescidas de cinquenta por cento.'
  },
  {
    law: 'CDC',
    article: 'Art. 6º, VIII',
    summary: 'Inversão do Ônus da Prova no Direito do Consumidor',
    text: 'São direitos básicos do consumidor: VIII - a facilitação da defesa de seus direitos, inclusive com a inversão do ônus da prova, a seu favor, no processo civil, quando, a critério do juiz, for verossímil a alegação ou quando for ele hipossuficiente...'
  },
  {
    law: 'CDC',
    article: 'Art. 14',
    summary: 'Responsabilidade Objetiva do Fornecedor de Serviços',
    text: 'O fornecedor de serviços responde, independentemente da existência de culpa, pela reparação dos danos causados aos consumidores por defeitos relativos à prestação dos serviços...'
  }
];

interface LegalTemplate {
  id: string;
  title: string;
  category: 'Contratos' | 'Petições & Recursos' | 'Gestão Pública & Prefeituras';
  description: string;
  icon?: string;
  content: string;
}

interface BuildingBlock {
  id: string;
  title: string;
  documentType: 'Geral' | 'Petição Inicial' | 'Procuração & Contrato' | 'Parecer & Prefeitura' | 'Contestação & Defesa';
  description: string;
  content: string;
  badge?: string;
  isCustom?: boolean;
}

const LEGAL_TEMPLATES: LegalTemplate[] = [
  // CONTRATOS
  {
    id: 'contrato_honorarios',
    title: 'Contrato de Honorários Advocatícios (Pro Labore + Quota Litis)',
    category: 'Contratos',
    description: 'Modelo completo com cláusulas de pro labore, percentual de êxito (quota litis), sucumbência e LGPD.',
    content: `<h1 style="text-align: center; font-size: 14pt; font-family: 'Times New Roman', serif; font-weight: bold; margin-bottom: 24pt;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS E HONORÁRIOS</h1>

<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;"><strong>CONTRATANTE:</strong> <strong>[NOME COMPLETO DO CLIENTE]</strong>, [nacionalidade], [estado civil], [profissão], portador(a) da Cédula de Identidade RG nº [NÚMERO] e inscrito(a) no CPF/MF sob o nº [NÚMERO], residente e domiciliado(a) na [ENDEREÇO COMPLETO].</p>

<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;"><strong>CONTRATADO(S):</strong> <strong>[NOME DO ADVOGADO OU SOCIEDADE DE ADVOGADOS]</strong>, inscrito(a) na OAB/[UF] sob o nº [NÚMERO], com escritório profissional estabelecido na [ENDEREÇO COMPLETO DO ESCRITÓRIO].</p>

<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">As partes acima qualificadas têm, entre si, justo e contratado o seguinte:</p>

<h3 style="font-size: 11pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">CLÁUSULA PRIMEIRA - DO OBJETO</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">O CONTRATADO obriga-se, em cumprimento ao mandato judicial que lhe foi outorgado, a prestar serviços profissionais na defesa dos interesses do CONTRATANTE na ação de [NOME DA AÇÃO OU MEDIDA JUDICIAL], a ser proposta em face de [NOME DA PARTE ADVERSA].</p>

<h3 style="font-size: 11pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">CLÁUSULA SEGUNDA - DOS HONORÁRIOS CONTRATUAIS</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">Pelos serviços contratados, o CONTRATANTE pagará ao CONTRATADO os seguintes valores:</p>
<ul style="margin-left: 2cm; margin-bottom: 12pt; line-height: 1.5;">
  <li><strong>a) Pro Labore:</strong> A quantia fixa de R$ [VALOR] ([VALOR POR EXTENSO]), paga no ato da assinatura deste instrumento ou em [NÚMERO] parcelas mensais de R$ [VALOR];</li>
  <li><strong>b) Quota Litis (Êxito):</strong> O percentual de [PERCENTUAL, EX: 20%] ([POR EXTENSO]) sobre o proveito econômico bruto auferido ao final da demanda.</li>
</ul>

<h3 style="font-size: 11pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">CLÁUSULA TERCEIRA - DOS HONORÁRIOS SUCUMBENCIAIS</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">Os honorários sucumbenciais eventualmente fixados pela Justiça pertencerão exclusivamente ao CONTRATADO, sem qualquer dedução sobre a verba honorária contratual ora pactuada, consoante dispõe o Artigo 23 da Lei nº 8.906/94.</p>

<h3 style="font-size: 11pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">CLÁUSULA QUARTA - DA PROTEÇÃO DE DADOS (LGPD)</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">O CONTRATANTE autoriza expressamente a coleta e o tratamento dos seus dados pessoais e dados pessoais sensíveis pelo CONTRATADO exclusivamente para o patrocínio da causa e instrução processual, nos termos da Lei nº 13.709/2018.</p>

<p style="text-align: center; margin-top: 36pt; line-height: 1.5;">[CIDADE/UF], [DIA] de [MÊS] de [ANO].</p>

<p style="text-align: center; margin-top: 36pt; line-height: 1.5;">________________________________________<br><strong>CONTRATANTE: [NOME DO CLIENTE]</strong></p>

<p style="text-align: center; margin-top: 36pt; line-height: 1.5;">________________________________________<br><strong>CONTRATADO: [NOME DO ADVOGADO] - OAB/[UF] nº [NÚMERO]</strong></p>`
  },
  {
    id: 'contrato_locacao',
    title: 'Contrato de Locação Residencial (Com Caução e Fiador)',
    category: 'Contratos',
    description: 'Minuta completa para locação imobiliária com reajuste IPCA/IGP-M, regras de conservação e garantia.',
    content: `<h1 style="text-align: center; font-size: 14pt; font-family: 'Times New Roman', serif; font-weight: bold; margin-bottom: 24pt;">CONTRATO DE LOCAÇÃO DE IMÓVEL RESIDENCIAL</h1>

<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;"><strong>LOCADOR:</strong> <strong>[NOME DO LOCADOR]</strong>, brasileiro(a), [estado civil], portador(a) do RG nº [NÚMERO] e inscrito(a) no CPF nº [NÚMERO], residente e domiciliado(a) na [ENDEREÇO].</p>

<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;"><strong>LOCATÁRIO:</strong> <strong>[NOME DO LOCATÁRIO]</strong>, brasileiro(a), [estado civil], portador(a) do RG nº [NÚMERO] e inscrito(a) no CPF nº [NÚMERO], residente e domiciliado(a) na [ENDEREÇO].</p>

<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">As partes ajustam o presente Contrato de Locação Residencial, regido pela Lei nº 8.245/91, mediante as cláusulas seguintes:</p>

<h3 style="font-size: 11pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">CLÁUSULA 1ª - DO IMÓVEL</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">O objeto da presente locação é o imóvel residencial situado na [ENDEREÇO COMPLETO DO IMÓVEL, CEP], em perfeitas condições de habitabilidade e conservação.</p>

<h3 style="font-size: 11pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">CLÁUSULA 2ª - DO PRAZO E DO ALUGUEL</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">A locação vigora pelo prazo de 30 (trinta) meses, iniciando-se em [DATA INÍCIO] e findando-se em [DATA FIM]. O aluguel mensal é de R$ [VALOR] ([VALOR POR EXTENSO]), vencível no dia [DIA] de cada mês, reajustado anualmente pelo índice IPCA/IBGE.</p>

<h3 style="font-size: 11pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">CLÁUSULA 3ª - DA GARANTIA LOCATÍCIA (CAUÇÃO)</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">A título de garantia locatícia, o LOCATÁRIO deposita no ato da assinatura a quantia equivalente a 3 (três) meses de aluguel, no valor total de R$ [VALOR CAUÇÃO], a ser devolvida ao término do contrato devidamente corrigida.</p>

<p style="text-align: center; margin-top: 36pt; line-height: 1.5;">[CIDADE/UF], [DIA] de [MÊS] de [ANO].</p>

<p style="text-align: center; margin-top: 36pt; line-height: 1.5;">________________________________________<br><strong>LOCADOR: [NOME DO LOCADOR]</strong></p>

<p style="text-align: center; margin-top: 36pt; line-height: 1.5;">________________________________________<br><strong>LOCATÁRIO: [NOME DO LOCATÁRIO]</strong></p>`
  },
  {
    id: 'contrato_nda',
    title: 'Acordo de Confidencialidade e Não Divulgação (NDA)',
    category: 'Contratos',
    description: 'Termo de sigilo corporativo para proteção de segredos de negócio, propriedade intelectual e LGPD.',
    content: `<h1 style="text-align: center; font-size: 14pt; font-family: 'Times New Roman', serif; font-weight: bold; margin-bottom: 24pt;">ACORDO DE CONFIDENCIALIDADE E NÃO DIVULGAÇÃO (NDA)</h1>

<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">Pelo presente instrumento, de um lado <strong>[NOME DA EMPRESA A]</strong>, inscrita no CNPJ sob o nº [CNPJ], e de outro lado <strong>[NOME DA EMPRESA B]</strong>, inscrita no CNPJ sob o nº [CNPJ], doravante denominadas conjuntamente como PARTES:</p>

<h3 style="font-size: 11pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">CLÁUSULA 1ª - DO OBJETO E DAS INFORMAÇÕES CONFIDENCIAIS</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">O presente Acordo tem por objetivo preservar o sigilo absoluto de todas as Informações Confidenciais, dados técnicos, estratégias comerciais, código-fonte e algoritmos trocados entre as PARTES em virtude da parceria/projeto [NOME DO PROJETO].</p>

<h3 style="font-size: 11pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">CLÁUSULA 2ª - DA OBRIGAÇÃO DE SIGILO E PENALIDADE</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">A PARTE receptora obriga-se a não revelar, divulgar ou repassar a terceiros qualquer Informação Confidencial recebida. A violação deste dever sujeitará a parte infratora ao pagamento de multa penal compensatória no valor de R$ [VALOR MULTA], sem prejuízo das perdas e danos apurados.</p>

<p style="text-align: center; margin-top: 36pt; line-height: 1.5;">[CIDADE/UF], [DIA] de [MÊS] de [ANO].</p>

<p style="text-align: center; margin-top: 36pt; line-height: 1.5;">________________________________________<br><strong>PARTE REVELADORA</strong></p>
<p style="text-align: center; margin-top: 36pt; line-height: 1.5;">________________________________________<br><strong>PARTE RECEPTORA</strong></p>`
  },

  // PETIÇÕES & RECURSOS
  {
    id: 'peticao_inicial',
    title: 'Petição Inicial Cível (Padrão PJe/e-SAJ)',
    category: 'Petições & Recursos',
    description: 'Estrutura completa com qualificação, dos fatos, do direito e pedidos com citação recuada.',
    content: `<h1 style="text-align: center; font-size: 14pt; font-family: 'Times New Roman', serif; font-weight: bold; margin-bottom: 24pt;">EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE [CIDADE/UF]</h1>

<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;"><strong>[NOME DO AUTOR]</strong>, brasileiro(a), [estado civil], [profissão], portador(a) da Cédula de Identidade RG nº [NÚMERO] e inscrito(a) no CPF/MF sob o nº [NÚMERO], residente e domiciliado(a) na [ENDEREÇO COMPLETO], por seu advogado infra-assinado, vem, respeitosamente, à presença de Vossa Excelência, propor a presente</p>

<h2 style="text-align: center; font-size: 13pt; font-weight: bold; margin-top: 18pt; margin-bottom: 18pt;">AÇÃO DECLARATÓRIA C/C PEDIDO DE TUTELA DE URGÊNCIA</h2>

<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">em face de <strong>[NOME DO RÉU]</strong>, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº [NÚMERO], com sede na [ENDEREÇO COMPLETO], pelos fatos e fundamentos jurídicos a seguir expostos:</p>

<h3 style="font-size: 12pt; font-weight: bold; margin-top: 16pt; margin-bottom: 8pt;">I. DOS FATOS</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">O Autor firmou com a Ré contrato de prestação de serviços no dia [DATA]. Ocorre que, inobservando os deveres anexos da boa-fé objetiva e os preceitos fundamentais da legislação vigente...</p>

<h3 style="font-size: 12pt; font-weight: bold; margin-top: 16pt; margin-bottom: 8pt;">II. DO DIREITO E DA JURISPRUDÊNCIA</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">Conforme preconiza a jurisprudência pacificada dos Tribunais Superiores, a conduta perpetrada enseja reparação integral, nos seguintes termos:</p>

<blockquote style="margin-left: 4cm; font-size: 10pt; line-height: 1.2; text-align: justify; font-style: italic; margin-top: 12pt; margin-bottom: 12pt; border-left: 2px solid #cbd5e1; padding-left: 8px;">
"ADMINISTRATIVO E PROCESSUAL CIVIL. VIOLAÇÃO AO PRINCÍPIO DA LEGALIDADE. DEVER DE INDENIZAR CONFIGURADO. A inobservância das normas de regência atrai a responsabilidade civil objetiva da administração/prestadora, sendo devida a reparação dos danos suportados pelo cidadão." (STJ - AgInt no AREsp: 1823941, Relator: Min. Silva, Data de Julgamento: 2024).
</blockquote>

<h3 style="font-size: 12pt; font-weight: bold; margin-top: 16pt; margin-bottom: 8pt;">III. DOS PEDIDOS</h3>
<p style="text-indent: 2cm; margin-bottom: 8pt; text-align: justify; line-height: 1.5;">Ante o exposto, requer a Vossa Excelência:</p>
<ol style="margin-left: 2cm; margin-bottom: 12pt; line-height: 1.5;">
  <li style="margin-bottom: 6pt;">A concessão do benefício da Justiça Gratuita, por ser o Autor hipossuficiente na forma da lei;</li>
  <li style="margin-bottom: 6pt;">A citação da Ré para, querendo, apresentar contestação no prazo legal;</li>
  <li style="margin-bottom: 6pt;">A procedência total dos pedidos formulados na presente ação.</li>
</ol>

<p style="text-indent: 2cm; margin-bottom: 24pt; text-align: justify; line-height: 1.5;">Dá-se à causa o valor de R$ [VALOR, EX: 50.000,00] ([VALOR POR EXTENSO]).</p>

<p style="text-align: center; margin-top: 24pt; margin-bottom: 24pt; line-height: 1.5;">Nestes termos,<br>Pede e espera deferimento.</p>

<p style="text-align: center; margin-top: 36pt; line-height: 1.5;">[CIDADE/UF], [DIA] de [MÊS] de [ANO].</p>

<p style="text-align: center; margin-top: 36pt; line-height: 1.5;"><strong>________________________________________<br>[NOME DO ADVOGADO(A)]</strong><br>OAB/[UF] nº [NÚMERO]</p>`
  },
  {
    id: 'contestacao_civel',
    title: 'Contestação Cível com Preliminares e Reconvenção',
    category: 'Petições & Recursos',
    description: 'Resposta do réu contendo preliminares de mérito (inépcia/prescrição), defesa direta e reconvenção.',
    content: `<h1 style="text-align: center; font-size: 14pt; font-family: 'Times New Roman', serif; font-weight: bold; margin-bottom: 24pt;">EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE [CIDADE/UF]</h1>

<p style="text-align: right; font-weight: bold; margin-bottom: 18pt;">Processo nº [NÚMERO DO PROCESSO]</p>

<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;"><strong>[NOME DO RÉU]</strong>, já qualificado nos autos da Ação de [NOME DA AÇÃO] que lhe move <strong>[NOME DO AUTOR]</strong>, vem, por seu advogado, apresentar</p>

<h2 style="text-align: center; font-size: 13pt; font-weight: bold; margin-top: 18pt; margin-bottom: 18pt;">CONTESTAÇÃO C/C RECONVENÇÃO</h2>

<h3 style="font-size: 12pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">I. PRELIMINARMENTE - DA INÉPCIA DA INICIAL</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">Cumpre consignar que a exordial é manifestamente inepta (Art. 330, §1º do CPC), visto que os fatos narrados não guardam nexo causal com a conclusão formulada pelo Autor...</p>

<h3 style="font-size: 12pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">II. NO MÉRITO</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">No mérito, os pedidos vestibulares improcedem em sua totalidade. As obrigações assumidas pelo Réu foram rigorosamente adimplidas conforme comprovantes em anexo...</p>

<h3 style="font-size: 12pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">III. DA RECONVENÇÃO (ART. 343 DO CPC)</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">Com fulcro no Artigo 343 do CPC, propõe o Réu/Rereconvinte a presente Reconvenção em face do Autor/Reconvindo, para que este seja condenado ao pagamento de R$ [VALOR DO CRÉDITO DO RÉU]...</p>

<p style="text-align: center; margin-top: 24pt; line-height: 1.5;">Nestes termos,<br>Pede e espera deferimento.</p>

<p style="text-align: center; margin-top: 36pt; line-height: 1.5;">[CIDADE/UF], [DATA].</p>

<p style="text-align: center; margin-top: 36pt; line-height: 1.5;"><strong>________________________________________<br>[NOME DO ADVOGADO(A)]</strong><br>OAB/[UF] nº [NÚMERO]</p>`
  },
  {
    id: 'mandado_seguranca',
    title: 'Mandado de Segurança com Pedido Liminar',
    category: 'Petições & Recursos',
    description: 'Remédio constitucional contra ato ilegal de autoridade pública com demonstração de direito líquido e certo.',
    content: `<h1 style="text-align: center; font-size: 14pt; font-family: 'Times New Roman', serif; font-weight: bold; margin-bottom: 24pt;">EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA DA FAZENDA PÚBLICA DA COMARCA DE [CIDADE/UF]</h1>

<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;"><strong>[NOME DO IMPETRANTE]</strong>, [qualificação completa], vem, perante Vossa Excelência, impetrar o presente</p>

<h2 style="text-align: center; font-size: 13pt; font-weight: bold; margin-top: 18pt; margin-bottom: 18pt;">MANDADO DE SEGURANÇA (COM PEDIDO LIMINAR)</h2>

<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">apontando como Autoridade Coatora o <strong>[CARGO DA AUTORIDADE COATORA, EX: SENHOR SECRETÁRIO MUNICIPAL DE SAÚDE]</strong>, vinculado ao [NOME DO ÓRGÃO OU MUNICÍPIO], consoante razões a seguir:</p>

<h3 style="font-size: 12pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">1. DO DIREITO LÍQUIDO E CERTO</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">O Impetrante é possuidor de direito líquido e certo, comprovado de plano por prova documental pré-constituída, tendo a Autoridade Coatora violado o preceito do Artigo 5º, LXIX da Constituição Federal ao negar o fornecimento de...</p>

<h3 style="font-size: 12pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">2. DA CONCESSÃO DA MEDIDA LIMINAR</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">Estão presentes a fumaça do bom direito e o perigo da demora, justificando a imediata concessão de ordem liminar para determinar que a Autoridade Coatora abstenha-se de...</p>

<p style="text-align: center; margin-top: 24pt; line-height: 1.5;">Nestes termos,<br>Pede deferimento.</p>

<p style="text-align: center; margin-top: 36pt; line-height: 1.5;">[CIDADE/UF], [DATA].</p>

<p style="text-align: center; margin-top: 36pt; line-height: 1.5;"><strong>________________________________________<br>[ADVOGADO(A)] - OAB/[UF] nº [NÚMERO]</strong></p>`
  },

  // GESTÃO PÚBLICA & PREFEITURAS
  {
    id: 'parecer_juridico',
    title: 'Parecer Jurídico de Licitação / Gestão Pública',
    category: 'Gestão Pública & Prefeituras',
    description: 'Estrutura técnica para procuradorias municipais com ementa, relatório, fundamentação e conclusão.',
    content: `<h1 style="text-align: center; font-size: 14pt; font-family: 'Times New Roman', serif; font-weight: bold; margin-bottom: 18pt;">PROCURADORIA GERAL DO MUNICÍPIO DE [NOME DO MUNICÍPIO]</h1>

<h2 style="text-align: center; font-size: 12pt; font-weight: bold; margin-bottom: 24pt;">PARECER JURÍDICO Nº [NÚMERO]/[ANO]</h2>

<div style="margin-left: 4cm; font-size: 10pt; line-height: 1.3; text-align: justify; background-color: #f8fafc; padding: 10px; border-left: 3px solid #0284c7; margin-bottom: 18pt;">
<strong>EMENTA:</strong> DIREITO ADMINISTRATIVO. LICITAÇÕES E CONTRATOS. LEI Nº 14.133/2021. CONTRATAÇÃO DIRETA POR INEXIGIBILIDADE. NOTÓRIA ESPECIAÇÃO. POSSIBILIDADE PREENCHIDOS OS REQUISITOS LEGAIS. PELA APROVAÇÃO CONDICIONADA.
</div>

<h3 style="font-size: 11pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">1. RELATÓRIO</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">Vêm a esta Procuradoria Geral os autos do Processo Administrativo nº [NÚMERO], instaurado pela Secretaria Municipal de [NOME DA SECRETARIA], objetivando a análise da legalidade da contratação direta...</p>

<h3 style="font-size: 11pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">2. FUNDAMENTAÇÃO JURÍDICA</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">A Nova Lei de Licitações (Lei nº 14.133/2021) estabelece em seu Artigo 74 os casos em que a licitação é inexigível quando inviável a competição...</p>

<h3 style="font-size: 11pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">3. CONCLUSÃO</h3>
<p style="text-indent: 2cm; margin-bottom: 18pt; text-align: justify; line-height: 1.5;">Ante o exposto, opina esta Procuradoria pela <strong>VIABILIDADE JURÍDICA</strong> do prosseguimento do feito, desde que atendidas as recomendações constantes do item 2 deste parecer.</p>

<p style="text-align: center; margin-top: 24pt; line-height: 1.5;">É o parecer, s.m.j.</p>

<p style="text-align: center; margin-top: 36pt; line-height: 1.5;">[CIDADE/UF], [DIA] de [MÊS] de [ANO].</p>

<p style="text-align: center; margin-top: 36pt; line-height: 1.5;">________________________________________<br><strong>[NOME DO PROCURADOR MUNICIPAL]</strong><br>Procurador do Município - OAB/[UF] nº [NÚMERO]</p>`
  },
  {
    id: 'termo_referencia',
    title: 'Termo de Referência de Licitação (Lei 14.133/2021)',
    category: 'Gestão Pública & Prefeituras',
    description: 'Documento técnico para contratação de bens e serviços com justificativa, requisitos e prazos.',
    content: `<h1 style="text-align: center; font-size: 14pt; font-family: 'Times New Roman', serif; font-weight: bold; margin-bottom: 18pt;">PREFEITURA MUNICIPAL DE [NOME DA CIDADE]</h1>
<h2 style="text-align: center; font-size: 12pt; font-weight: bold; margin-bottom: 24pt;">TERMO DE REFERÊNCIA (LEI Nº 14.133/2021)</h2>

<h3 style="font-size: 11pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">1. DO OBJETO</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">Aquisição de [DESCRIÇÃO DO OBJETO OU BENS], para atender às necessidades da Secretaria Municipal de [NOME DA SECRETARIA], conforme especificações constantes da tabela abaixo:</p>

<h3 style="font-size: 11pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">2. DA JUSTIFICATIVA DA NECESSIDADE DA CONTRATAÇÃO</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">A contratação justifica-se pela imperiosa necessidade de assegurar a continuidade dos serviços públicos essenciais de prestados aos cidadãos do município...</p>

<h3 style="font-size: 11pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">3. DA ESTIMATIVA DO VALOR E RECURSOS ORÇAMENTÁRIOS</h3>
<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">O valor total estimado para a contratação é de R$ [VALOR ESTIMADO], calculado com base em pesquisa de preços de mercado, correndo a despesa à conta da Dotação Orçamentária nº [NÚMERO DA DOTAÇÃO].</p>

<p style="text-align: center; margin-top: 36pt; line-height: 1.5;">[CIDADE/UF], [DATA].</p>
<p style="text-align: center; margin-top: 36pt; line-height: 1.5;">________________________________________<br><strong>RESPONSÁVEL PELA ELABORAÇÃO</strong></p>`
  },
  {
    id: 'oficio_municipal',
    title: 'Ofício Municipal / Requerimento Administrativo',
    category: 'Gestão Pública & Prefeituras',
    description: 'Comunicação oficial entre órgãos públicos ou pedido formal administrativo.',
    content: `<h1 style="text-align: center; font-size: 13pt; font-family: 'Times New Roman', serif; font-weight: bold; margin-bottom: 18pt;">OFÍCIO Nº [NÚMERO]/[ANO] - [NOME DO ÓRGÃO/SECRETARIA]</h1>

<p style="text-align: right; margin-bottom: 24pt;">[CIDADE/UF], [DIA] de [MÊS] de [ANO].</p>

<p style="margin-bottom: 18pt; line-height: 1.5;">Ao(A) Senhor(a):<br><strong>[NOME DO DESTINATÁRIO]</strong><br>[CARGO DO DESTINATÁRIO]<br>[ENDEREÇO/ÓRGÃO]</p>

<p style="margin-bottom: 18pt; font-weight: bold;">Assunto: [SÍNTESE DO ASSUNTO DO OFÍCIO]</p>

<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">Cumprimentando-o(a) cordialmente, vimos por meio deste solicitar a Vossa Senhoria as providências necessárias para [NARRATIVA E SOLICITAÇÃO COMPLETA].</p>

<p style="text-indent: 2cm; margin-bottom: 24pt; text-align: justify; line-height: 1.5;">Certos de contar com a vossa valiosa atenção e presteza, renovamos os protestos de estima e consideração.</p>

<p style="text-align: center; margin-top: 36pt; line-height: 1.5;">Atenciosamente,</p>

<p style="text-align: center; margin-top: 36pt; line-height: 1.5;">________________________________________<br><strong>[NOME DO REMETENTE]</strong><br>[CARGO DO REMETENTE]</p>`
  }
];

const DEFAULT_BUILDING_BLOCKS: BuildingBlock[] = [
  // Petição Inicial
  {
    id: 'blk_cabecalho_civel',
    title: 'Endereçamento Vara Cível Estadual',
    documentType: 'Petição Inicial',
    description: 'Cabeçalho padrão dirigido ao Juiz de Direito da Comarca.',
    badge: 'Cabeçalho',
    content: `<h1 style="text-align: center; font-size: 14pt; font-family: 'Times New Roman', serif; font-weight: bold; margin-bottom: 24pt;">EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE [CIDADE/UF]</h1><p><br></p>`
  },
  {
    id: 'blk_cabecalho_trf',
    title: 'Endereçamento Vara Federal (TRF)',
    documentType: 'Petição Inicial',
    description: 'Cabeçalho dirigido à Justiça Federal / Subseção Judiciária.',
    badge: 'Federal',
    content: `<h1 style="text-align: center; font-size: 14pt; font-family: 'Times New Roman', serif; font-weight: bold; margin-bottom: 24pt;">EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) FEDERAL DA ___ VARA FEDERAL DA SUBSEÇÃO JUDICIÁRIA DE [CIDADE/UF]</h1><p><br></p>`
  },
  {
    id: 'blk_qualif_pf',
    title: 'Qualificação Completa Pessoa Física',
    documentType: 'Petição Inicial',
    description: 'Qualificação padrão com RG, CPF, endereço e e-mail.',
    badge: 'Partes',
    content: `<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;"><strong>[NOME COMPLETO]</strong>, brasileiro(a), [estado civil], [profissão], portador(a) da Cédula de Identidade RG nº [NÚMERO] e inscrito(a) no CPF/MF sob o nº [NÚMERO], residente e domiciliado(a) na [ENDEREÇO COMPLETO, CEP], e-mail: [ENDEREÇO DE E-MAIL], por seu advogado infra-assinado...</p>`
  },
  {
    id: 'blk_justica_gratuita',
    title: 'Cláusula de Justiça Gratuita (Art. 98 CPC)',
    documentType: 'Petição Inicial',
    description: 'Requerimento de gratuidade de justiça com base no CPC e CF/88.',
    badge: 'Gratuidade',
    content: `<h3 style="font-size: 12pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">DA CONCESSÃO DA JUSTIÇA GRATUITA</h3><p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">Requer o Autor a concessão dos benefícios da Justiça Gratuita, nos termos do Artigo 98 e seguintes do Código de Processo Civil e do Artigo 5º, LXXIV da Constituição Federal, por não possuir condições financeiras de arcar com as custas e despesas processuais sem prejuízo do próprio sustento e de sua família.</p>`
  },
  {
    id: 'blk_tutela_urgencia',
    title: 'Tutela de Urgência Antecipada (Art. 300 CPC)',
    documentType: 'Petição Inicial',
    description: 'Pedido liminar com perigo da demora e probabilidade do direito.',
    badge: 'Liminar',
    content: `<h3 style="font-size: 12pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">DA TUTELA DE URGÊNCIA (ART. 300 DO CPC)</h3><p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">Presentes os requisitos legais do Artigo 300 do CPC, quais sejam, a <strong>probabilidade do direito (<em>fumus boni iuris</em>)</strong> evidenciada pelos documentos acostados aos autos, e o <strong>perigo de dano ou risco ao resultado útil do processo (<em>periculum in mora</em>)</strong>, imperiosa se faz a concessão da medida liminar para...</p>`
  },
  {
    id: 'blk_citacao_abnt',
    title: 'Bloco de Citação Doutrinária / Jurisprudencial ABNT 4cm',
    documentType: 'Geral',
    description: 'Transcrição formatada com recuo de 4cm e borda de destaque.',
    badge: 'ABNT',
    content: `<blockquote style="margin-left: 4cm; font-size: 10pt; line-height: 1.2; text-align: justify; font-style: italic; margin-top: 12pt; margin-bottom: 12pt; border-left: 2px solid #cbd5e1; padding-left: 8px;">"TRANSCREVA AQUI A JURISPRUDÊNCIA DO STJ/STF OU A CITAÇÃO DOUTRINÁRIA (Recuo de 4cm conforme norma ABNT NBR 10520)."</blockquote><p><br></p>`
  },

  // Procuração & Contrato
  {
    id: 'blk_clausula_lgpd',
    title: 'Cláusula Específica LGPD (Lei 13.709/2018)',
    documentType: 'Procuração & Contrato',
    description: 'Autorização expressa para tratamento de dados pessoais no patrocínio da causa.',
    badge: 'LGPD',
    content: `<h3 style="font-size: 11pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">CLÁUSULA DE PROTEÇÃO DE DADOS (LGPD)</h3><p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">Em observância à Lei Geral de Proteção de Dados (Lei nº 13.709/2018), o(a) CONTRATANTE/OUTORGANTE autoriza expressamente o tratamento e compartilhamento de seus dados pessoais e dados sensíveis estritamente para os fins de cumprimento do objeto deste contrato e instrução de processos judiciais e administrativos.</p>`
  },
  {
    id: 'blk_honorarios_sucumbenciais',
    title: 'Cláusula de Honorários Sucumbenciais',
    documentType: 'Procuração & Contrato',
    description: 'Autonomia dos honorários fixados pela Justiça em relação aos contratuais.',
    badge: 'Honorários',
    content: `<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">Os honorários de sucumbência eventualmente fixados em condenação judicial pertencerão exclusivamente ao(s) CONTRATADO(S), sem qualquer abatimento sobre a remuneração contratual pactuada, na forma do Artigo 23 da Lei nº 8.906/94 (Estatuto da OAB).</p>`
  },

  // Parecer & Prefeitura
  {
    id: 'blk_ementa_parecer',
    title: 'Ementa de Parecer Jurídico Municipal',
    documentType: 'Parecer & Prefeitura',
    description: 'Caixa de destaque para resumo do objeto parecerado.',
    badge: 'Prefeitura',
    content: `<div style="margin-left: 4cm; font-size: 10pt; line-height: 1.3; text-align: justify; background-color: #f8fafc; padding: 12px; border-left: 4px solid #0284c7; margin-bottom: 16pt;"><strong>EMENTA:</strong> DIREITO ADMINISTRATIVO. LICITAÇÕES. ANÁLISE DE MINUTA DE EDITAL. PREGÃO ELETRÔNICO. REGULARIDADE FORMAL. PELA APROVAÇÃO DAS CLÁUSULAS CONTRATUAIS.</div><p><br></p>`
  },
  {
    id: 'blk_fecho_procuradoria',
    title: 'Fecho Técnico de Parecer Procuradoria',
    documentType: 'Parecer & Prefeitura',
    description: 'Fecho formal para procuradores públicos.',
    badge: 'Fecho',
    content: `<p style="text-align: center; margin-top: 24pt; line-height: 1.5;">É o parecer, salvo melhor juízo (s.m.j.).</p><p style="text-align: center; margin-top: 36pt; line-height: 1.5;">[CIDADE/UF], [DATA].</p><p style="text-align: center; margin-top: 36pt; line-height: 1.5;">________________________________________<br><strong>[NOME DO PROCURADOR MUNICIPAL]</strong><br>Procurador do Município - OAB/[UF] nº [NÚMERO]</p>`
  },

  // Contestação & Defesa
  {
    id: 'blk_preliminar_inepcia',
    title: 'Preliminar de Inépcia da Petição Inicial',
    documentType: 'Contestação & Defesa',
    description: 'Arguição de defeito formal nos termos do Art. 330, § 1º do CPC.',
    badge: 'Preliminar',
    content: `<h3 style="font-size: 12pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">PRELIMINARMENTE: DA INÉPTIA DA PETIÇÃO INICIAL (ART. 330 DO CPC)</h3><p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">Preceitua o Artigo 330, § 1º do Código de Processo Civil que a petição inicial será considerada inepta quando lhe faltar pedido ou causa de pedir, ou quando dos fatos não decorrer logicamente a conclusão. No caso em tela...</p>`
  },
  {
    id: 'blk_fecho_advocacia',
    title: 'Fecho Padrão e Assinatura de Advogado',
    documentType: 'Geral',
    description: 'Encerramento formal para petições e manifestações.',
    badge: 'Fecho',
    content: `<p style="text-align: center; margin-top: 24pt; margin-bottom: 12pt; line-height: 1.5;">Nestes termos,<br>Pede e espera deferimento.</p><p style="text-align: center; margin-top: 24pt;">[CIDADE/UF], ${new Date().toLocaleDateString('pt-BR')}.</p><p style="text-align: center; margin-top: 36pt;">________________________________________<br><strong>[NOME DO ADVOGADO(A)]</strong><br>OAB/[UF] nº [NÚMERO]</p>`
  }
];

interface EnhancedOutlineItem {
  id: string;
  text: string;
  tag: string;
  level: number;
  category: 'titulo' | 'clausula' | 'artigo' | 'fatos' | 'direito' | 'pedidos' | 'secao';
  wordCount: number;
  hasChildren: boolean;
}

export const DocEditor: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [docTitle, setDocTitle] = useState<string>('Petição_Inicial_Minuta.docx');
  const [fontFamily, setFontFamily] = useState<string>('Times New Roman');
  const [fontSize, setFontSize] = useState<string>('12pt');
  const [lineSpacing, setLineSpacing] = useState<string>('1.5');
  const [wordCount, setWordCount] = useState<number>(0);
  const [charCount, setCharCount] = useState<number>(0);
  const [showTemplatesModal, setShowTemplatesModal] = useState<boolean>(false);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>('Todos');
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<string>('Salvo na memória local');

  // Left Building Blocks & Structure Panel State
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [sidebarTab, setSidebarTab] = useState<'blocks' | 'outline' | 'vars'>('blocks');
  const [selectedDocType, setSelectedDocType] = useState<string>('Todos');
  const [searchBlockQuery, setSearchBlockQuery] = useState<string>('');
  const [customBlocks, setCustomBlocks] = useState<BuildingBlock[]>([]);
  const [showAddCustomModal, setShowAddCustomModal] = useState<boolean>(false);
  const [newBlockTitle, setNewBlockTitle] = useState<string>('');
  const [newBlockCategory, setNewBlockCategory] = useState<BuildingBlock['documentType']>('Geral');

  // Enhanced Structure Panel State
  const [headingsOutline, setHeadingsOutline] = useState<EnhancedOutlineItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [collapsedHeadingIds, setCollapsedHeadingIds] = useState<string[]>([]);
  const [outlineSearchQuery, setOutlineSearchQuery] = useState<string>('');
  const [outlineFilterCategory, setOutlineFilterCategory] = useState<string>('todos');

  // Smart Placeholders / Variables State
  const [detectedPlaceholders, setDetectedPlaceholders] = useState<string[]>([]);
  const [placeholderValues, setPlaceholderValues] = useState<{ [key: string]: string }>({});

  // ABNT Compliance Modal State
  const [showAbntModal, setShowAbntModal] = useState<boolean>(false);

  // Version History State
  const [versionHistory, setVersionHistory] = useState<VersionSnapshot[]>([]);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState<boolean>(false);

  // PDF Export Options State
  const [pdfIncludePageNumbers, setPdfIncludePageNumbers] = useState<boolean>(true);
  const [pdfIncludeHeaderLine, setPdfIncludeHeaderLine] = useState<boolean>(true);

  // Voice Dictation & Speech State
  const [isDictating, setIsDictating] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Vade Mecum Modal State
  const [showVadeMecumModal, setShowVadeMecumModal] = useState<boolean>(false);
  const [vadeSearchQuery, setVadeSearchQuery] = useState<string>('');
  const [vadeLawFilter, setVadeLawFilter] = useState<string>('TODAS');

  // Qualification Generator State
  const [showQualificationModal, setShowQualificationModal] = useState<boolean>(false);
  const [courtJurisdiction, setCourtJurisdiction] = useState<string>('EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA 1ª VARA CÍVEL DA COMARCA DE SÃO PAULO/SP');
  const [authorName, setAuthorName] = useState<string>('JOÃO DA SILVA');
  const [authorCpf, setAuthorCpf] = useState<string>('000.000.000-00');
  const [authorAddress, setAuthorAddress] = useState<string>('Rua das Flores, nº 123, São Paulo/SP');
  const [defendantName, setDefendantName] = useState<string>('EMPRESA EXEMPLO LTDA.');
  const [defendantCnpj, setDefendantCnpj] = useState<string>('00.000.000/0001-00');
  const [actionTitle, setActionTitle] = useState<string>('AÇÃO DECLARATÓRIA DE INEXISTÊNCIA DE DÉBITO C/C DANOS MORAIS');

  // Legal Risk Checklist State
  const [showRiskModal, setShowRiskModal] = useState<boolean>(false);

  // QR Code Proof Stamp State
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [qrProofTitle, setQrProofTitle] = useState<string>('Vídeo de Prova Documental');
  const [qrProofUrl, setQrProofUrl] = useState<string>('https://pje.jus.br/');

  // Dictation & Voice Handlers
  const toggleDictation = () => {
    if (isDictating) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsDictating(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Navegador não suporta a API de Reconhecimento de Voz. Recomendado Google Chrome ou Edge.');
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
        if (transcript && editorRef.current) {
          executeCommand('insertHTML', `<span>${transcript}</span>`);
        }
      };

      recognition.onerror = () => setIsDictating(false);
      recognition.onend = () => setIsDictating(false);

      try {
        recognition.start();
        recognitionRef.current = recognition;
        setIsDictating(true);
      } catch (e) {
        setIsDictating(false);
      }
    }
  };

  const toggleSpeechRead = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      if (!editorRef.current) return;
      const text = window.getSelection()?.toString() || editorRef.current.innerText;
      if (!text || !text.trim()) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Vade Mecum Citation Helper
  const handleInsertArticleCitation = (art: LegalArticleRef) => {
    if (!editorRef.current) return;
    const citationHtml = `
      <blockquote style="margin-left: 4cm; font-size: 10pt; line-height: 1.0; font-family: 'Times New Roman', serif; text-align: justify; margin-top: 12pt; margin-bottom: 12pt; color: #1e293b; font-style: italic;">
        “${art.article} - ${art.text}” (${art.law})
      </blockquote>
      <p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;"><br></p>
    `;
    executeCommand('insertHTML', citationHtml);
    setShowVadeMecumModal(false);
  };

  // Qualification Generator Helper
  const handleGenerateQualification = () => {
    if (!editorRef.current) return;
    const html = `
      <p style="text-align: justify; margin-bottom: 24pt; font-weight: bold; font-family: 'Times New Roman', serif; line-height: 1.5;">${courtJurisdiction.toUpperCase()}</p>
      
      <p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;"><strong>${authorName.toUpperCase()}</strong>, brasileiro(a), inscrito(a) no CPF/MF sob o nº ${authorCpf}, residente e domiciliado(a) na ${authorAddress}, por seu advogado que esta subscreve, vem, respeitosamente, à presença de Vossa Excelência, propor a presente:</p>
      
      <h1 style="text-align: center; font-size: 13pt; font-family: 'Times New Roman', serif; font-weight: bold; margin-top: 18pt; margin-bottom: 18pt;">${actionTitle.toUpperCase()}</h1>
      
      <p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">em face de <strong>${defendantName.toUpperCase()}</strong>, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº ${defendantCnpj}, pelas razões de fato e de direito a seguir expostas:</p>
      
      <h2 style="font-size: 12pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">I - DOS FATOS</h2>
      <p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">Descreva aqui os fatos que motivaram a propositura desta ação...</p>
      
      <h2 style="font-size: 12pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">II - DO DIREITO</h2>
      <p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">Descreva aqui a fundamentação jurídica do pedido...</p>
      
      <h2 style="font-size: 12pt; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">III - DOS PEDIDOS E REQUERIMENTOS</h2>
      <p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">Diante do exposto, requer a Vossa Excelência a citação do Réu e o julgamento de procedência dos pedidos.</p>
    `;
    editorRef.current.innerHTML = html;
    updateMetrics();
    setShowQualificationModal(false);
  };

  // QR Code Proof Stamp Helper
  const handleInsertQrCodeStamp = () => {
    if (!qrProofUrl.trim() || !editorRef.current) return;
    const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrProofUrl)}`;
    const qrCardHtml = `
      <div style="border: 1px solid #cbd5e1; padding: 14px; border-radius: 8px; margin: 16px 0; display: flex; align-items: center; gap: 16px; background-color: #f8fafc;" contenteditable="false">
        <img src="${qrImageSrc}" alt="QR Code da Prova" style="width: 90px; height: 90px; border-radius: 4px; border: 1px solid #e2e8f0;" />
        <div style="flex: 1;">
          <p style="font-weight: bold; margin: 0; font-size: 11pt; color: #0f172a; font-family: 'Times New Roman', serif;">📌 PROVA DIGITAL E MÍDIA ANEXA - ${qrProofTitle}</p>
          <p style="margin: 4px 0 0 0; font-size: 9.5pt; color: #475569; font-family: 'Times New Roman', serif;">Acesse o conteúdo em áudio/vídeo apontando a câmera do smartphone para o QR Code ao lado ou clique no link abaixo:</p>
          <a href="${qrProofUrl}" target="_blank" style="font-size: 9.5pt; color: #2563eb; text-decoration: underline; font-family: 'Times New Roman', serif; word-break: break-all;">${qrProofUrl}</a>
        </div>
      </div>
      <p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;"><br></p>
    `;
    executeCommand('insertHTML', qrCardHtml);
    setShowQrModal(false);
  };

  // Calculate Risk & Completion Score
  const calculateLegalScore = () => {
    if (!editorRef.current) return { score: 0, items: [] };
    const text = (editorRef.current.innerText || '').toUpperCase();

    const items = [
      { name: 'Qualificação das Partes (CPF/CNPJ)', ok: text.includes('CPF') || text.includes('CNPJ') || text.includes('RESIDENTE'), weight: 15 },
      { name: 'Indicação do Juízo ou Foro', ok: text.includes('EXCELENTÍSSIMO') || text.includes('JUIZ') || text.includes('VARA') || text.includes('FORO'), weight: 15 },
      { name: 'Dos Fatos', ok: text.includes('FATOS') || text.includes('FATO'), weight: 15 },
      { name: 'Do Direito / Fundamentação Jurídica', ok: text.includes('DIREITO') || text.includes('ART') || text.includes('LEI'), weight: 20 },
      { name: 'Dos Pedidos e Requerimentos', ok: text.includes('PEDIDO') || text.includes('REQUER'), weight: 15 },
      { name: 'Proteção de Dados / LGPD', ok: text.includes('LGPD') || text.includes('13.709') || text.includes('DADOS PESSOAIS'), weight: 10 },
      { name: 'Fecho e Assinatura com OAB', ok: text.includes('OAB') || text.includes('ADVOGADO') || text.includes('DEFERIMENTO'), weight: 10 }
    ];

    const score = items.reduce((acc, item) => acc + (item.ok ? item.weight : 0), 0);
    return { score, items };
  };

  // Load Saved Custom Blocks & History from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kovax_custom_blocks');
      if (saved) {
        setCustomBlocks(JSON.parse(saved));
      }
      const savedHistory = localStorage.getItem('kovax_doc_history');
      if (savedHistory) {
        setVersionHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error('Erro ao carregar dados salvos:', e);
    }
  }, []);

  const saveCustomBlocksToStorage = (updated: BuildingBlock[]) => {
    setCustomBlocks(updated);
    try {
      localStorage.setItem('kovax_custom_blocks', JSON.stringify(updated));
    } catch (e) {
      console.error('Erro ao salvar bloco:', e);
    }
  };

  // Initial Content Load
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML.trim() === '') {
      editorRef.current.innerHTML = LEGAL_TEMPLATES[0].content;
      updateMetrics();
    }
  }, []);

  const updateMetrics = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(words);
      setCharCount(text.length);
      setLastSaved(`Atualizado às ${new Date().toLocaleTimeString('pt-BR')}`);
      extractOutline();
      extractPlaceholders();
    }
  };

  const extractPlaceholders = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const matches = Array.from(text.matchAll(/\[([A-Z0-9_\s/ÁÉÍÓÚÂÊÔÃÕÇ-]{2,40})\]/g));
    const uniqueKeys = Array.from(new Set(matches.map(m => m[1])));
    setDetectedPlaceholders(uniqueKeys);
  };

  const handleApplyPlaceholder = (key: string) => {
    if (!editorRef.current) return;
    const val = placeholderValues[key];
    if (!val || !val.trim()) return;

    let html = editorRef.current.innerHTML;
    const regex = new RegExp(`\\[${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
    html = html.replace(regex, `<strong>${val.trim()}</strong>`);
    editorRef.current.innerHTML = html;

    setPlaceholderValues(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    updateMetrics();
  };

  const handleApplyAllPlaceholders = () => {
    if (!editorRef.current) return;
    let html = editorRef.current.innerHTML;
    let count = 0;

    Object.entries(placeholderValues).forEach(([key, val]) => {
      if (val && val.trim()) {
        const regex = new RegExp(`\\[${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
        html = html.replace(regex, `<strong>${val.trim()}</strong>`);
        count++;
      }
    });

    if (count > 0) {
      editorRef.current.innerHTML = html;
      setPlaceholderValues({});
      updateMetrics();
    }
  };

  const handleExportDOCX = () => {
    if (!editorRef.current) return;
    const htmlContent = editorRef.current.innerHTML;
    
    const docxTemplate = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${docTitle}</title>
  <style>
    @page WordSection1 {
      size: 595.3pt 841.9pt;
      margin: 70.85pt 85.05pt 70.85pt 85.05pt;
      mso-header-margin: 35.4pt;
      mso-footer-margin: 35.4pt;
      mso-paper-source: 0;
    }
    div.WordSection1 { page: WordSection1; }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.5;
      text-align: justify;
      color: #000000;
    }
    p {
      text-indent: 2cm;
      margin-bottom: 12pt;
      text-align: justify;
      line-height: 1.5;
    }
    h1, h2, h3 {
      font-family: 'Times New Roman', serif;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="WordSection1">
    ${htmlContent}
  </div>
</body>
</html>`;

    const blob = new Blob(['\ufeff', docxTemplate], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = docTitle.replace(/\.[^/.]+$/, '') + '.docx';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyAbntFormatting = () => {
    if (!editorRef.current) return;
    setFontFamily('Times New Roman');
    setFontSize('12pt');
    setLineSpacing('1.5');

    const paragraphs = editorRef.current.querySelectorAll('p');
    paragraphs.forEach(p => {
      const el = p as HTMLElement;
      el.style.fontFamily = "'Times New Roman', serif";
      el.style.fontSize = '12pt';
      el.style.lineHeight = '1.5';
      el.style.textAlign = 'justify';
      el.style.textIndent = '2cm';
      el.style.marginBottom = '12pt';
    });

    const headings = editorRef.current.querySelectorAll('h1, h2, h3');
    headings.forEach(h => {
      const el = h as HTMLElement;
      el.style.fontFamily = "'Times New Roman', serif";
      el.style.fontWeight = 'bold';
    });

    updateMetrics();
    setShowAbntModal(false);
  };

  const handleSaveSnapshot = () => {
    if (!editorRef.current) return;
    const snap: VersionSnapshot = {
      id: `snap_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      title: docTitle,
      wordCount,
      content: editorRef.current.innerHTML
    };
    const updated = [snap, ...versionHistory].slice(0, 15);
    setVersionHistory(updated);
    try {
      localStorage.setItem('kovax_doc_history', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleRestoreSnapshot = (snap: VersionSnapshot) => {
    if (editorRef.current && window.confirm(`Restaurar a versão salva às ${snap.timestamp}?`)) {
      editorRef.current.innerHTML = snap.content;
      updateMetrics();
      setShowVersionHistoryModal(false);
    }
  };

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    updateMetrics();
  };

  const applyFontFamily = (family: string) => {
    setFontFamily(family);
    executeCommand('fontName', family);
  };

  const applyFontSize = (size: string) => {
    setFontSize(size);
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const span = document.createElement('span');
      span.style.fontSize = size;
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        range.surroundContents(span);
      }
    }
    updateMetrics();
  };

  const applyLineSpacing = (spacing: string) => {
    setLineSpacing(spacing);
    if (editorRef.current) {
      editorRef.current.style.lineHeight = spacing;
    }
  };

  const insertBuildingBlock = (block: BuildingBlock) => {
    executeCommand('insertHTML', block.content);
  };

  const handleCreateCustomBlock = () => {
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString() : '';

    if (!newBlockTitle.trim()) return;

    const contentToSave = selectedText.trim()
      ? `<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">${selectedText.replace(/\n/g, '<br>')}</p>`
      : `<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">${newBlockTitle}: Digite seu texto personalizado aqui.</p>`;

    const newBlock: BuildingBlock = {
      id: `custom_${Date.now()}`,
      title: newBlockTitle,
      documentType: newBlockCategory,
      description: 'Bloco personalizado salvo pelo usuário',
      content: contentToSave,
      badge: 'Personalizado',
      isCustom: true
    };

    const updated = [newBlock, ...customBlocks];
    saveCustomBlocksToStorage(updated);
    setNewBlockTitle('');
    setShowAddCustomModal(false);
  };

  const handleDeleteCustomBlock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customBlocks.filter(b => b.id !== id);
    saveCustomBlocksToStorage(updated);
  };

  const extractOutline = () => {
    if (!editorRef.current) return;
    const candidateNodes = Array.from(editorRef.current.querySelectorAll('h1, h2, h3, h4, p, div'));
    const outlineItems: EnhancedOutlineItem[] = [];
    let secCounter = 0;

    candidateNodes.forEach((el) => {
      const rawText = el.textContent?.trim() || '';
      if (!rawText || rawText.length < 3) return;

      const tagName = el.tagName.toUpperCase();
      let level = 0;
      let category: EnhancedOutlineItem['category'] = 'secao';
      let tagLabel = tagName;

      if (tagName === 'H1') {
        level = 1;
        category = 'titulo';
        tagLabel = 'H1';
      } else if (tagName === 'H2') {
        level = 2;
        category = 'secao';
        tagLabel = 'H2';
      } else if (tagName === 'H3') {
        level = 3;
        category = 'secao';
        tagLabel = 'H3';
      } else {
        const upper = rawText.toUpperCase();
        if (upper.startsWith('CLÁUSULA') || upper.startsWith('CLAUSULA')) {
          level = 2;
          category = 'clausula';
          tagLabel = 'Cláusula';
        } else if (upper.startsWith('ARTIGO') || upper.startsWith('ART.')) {
          level = 3;
          category = 'artigo';
          tagLabel = 'Artigo';
        } else if (upper.includes('DOS FATOS') || upper.includes('DO FATO')) {
          level = 2;
          category = 'fatos';
          tagLabel = 'Dos Fatos';
        } else if (upper.includes('DO DIREITO') || upper.includes('PRELIMINAR')) {
          level = 2;
          category = 'direito';
          tagLabel = 'Do Direito';
        } else if (upper.includes('DOS PEDIDOS') || upper.includes('DOS REQUERIMENTOS')) {
          level = 2;
          category = 'pedidos';
          tagLabel = 'Dos Pedidos';
        }
      }

      if (level > 0) {
        if (!el.id) {
          el.id = `heading-sec-${secCounter++}`;
        }

        let secWords = 0;
        let curr = el.nextSibling;
        while (curr) {
          if (curr.nodeType === Node.ELEMENT_NODE) {
            const currTag = (curr as Element).tagName.toUpperCase();
            const currText = ((curr as Element).textContent || '').trim().toUpperCase();
            if (['H1', 'H2', 'H3'].includes(currTag) ||
                currText.startsWith('CLÁUSULA') ||
                currText.includes('DOS FATOS') ||
                currText.includes('DO DIREITO') ||
                currText.includes('DOS PEDIDOS')) {
              break;
            }
          }
          const text = (curr.textContent || '').trim();
          if (text) {
            secWords += text.split(/\s+/).filter(Boolean).length;
          }
          curr = curr.nextSibling;
        }

        const cleanDisplay = rawText.length > 45 ? rawText.substring(0, 45) + '...' : rawText;

        outlineItems.push({
          id: el.id,
          text: cleanDisplay,
          tag: tagLabel,
          level,
          category,
          wordCount: secWords,
          hasChildren: false
        });
      }
    });

    for (let i = 0; i < outlineItems.length; i++) {
      if (i < outlineItems.length - 1 && outlineItems[i + 1].level > outlineItems[i].level) {
        outlineItems[i].hasChildren = true;
      }
    }

    setHeadingsOutline(outlineItems);
  };

  // ScrollSync Listener
  useEffect(() => {
    const handleScrollOrKey = () => {
      if (!editorRef.current) return;
      const headingElements = Array.from(editorRef.current.querySelectorAll('[id^="heading-sec-"]'));
      if (headingElements.length === 0) return;

      const editorRect = editorRef.current.getBoundingClientRect();
      let currentActiveId: string | null = null;

      for (const h of headingElements) {
        const rect = h.getBoundingClientRect();
        if (rect.top <= editorRect.top + 160) {
          currentActiveId = h.id;
        } else {
          break;
        }
      }

      if (currentActiveId && currentActiveId !== activeHeadingId) {
        setActiveHeadingId(currentActiveId);
      }
    };

    const ed = editorRef.current;
    if (ed) {
      ed.addEventListener('keyup', handleScrollOrKey);
      ed.addEventListener('click', handleScrollOrKey);
      const parent = ed.parentElement;
      if (parent) parent.addEventListener('scroll', handleScrollOrKey);
    }

    return () => {
      if (ed) {
        ed.removeEventListener('keyup', handleScrollOrKey);
        ed.removeEventListener('click', handleScrollOrKey);
        const parent = ed.parentElement;
        if (parent) parent.removeEventListener('scroll', handleScrollOrKey);
      }
    };
  }, [headingsOutline, activeHeadingId]);

  const getSectionNodeRange = (el: Element, level: number): Node[] => {
    const nodes: Node[] = [el];
    let curr = el.nextSibling;
    while (curr) {
      if (curr.nodeType === Node.ELEMENT_NODE) {
        const elem = curr as Element;
        const tag = elem.tagName.toUpperCase();
        const text = (elem.textContent || '').trim().toUpperCase();

        let currLevel = 99;
        if (tag === 'H1') currLevel = 1;
        else if (tag === 'H2') currLevel = 2;
        else if (tag === 'H3') currLevel = 3;
        else if (text.startsWith('CLÁUSULA') || text.includes('DOS FATOS') || text.includes('DO DIREITO') || text.includes('DOS PEDIDOS')) {
          currLevel = 2;
        }

        if (currLevel <= level) break;
      }
      nodes.push(curr);
      curr = curr.nextSibling;
    }
    return nodes;
  };

  const handleMoveSection = (id: string, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editorRef.current) return;
    const itemIndex = headingsOutline.findIndex(h => h.id === id);
    if (itemIndex === -1) return;

    const currentItem = headingsOutline[itemIndex];
    const targetEl = editorRef.current.querySelector(`#${id}`);
    if (!targetEl) return;

    if (direction === 'up' && itemIndex > 0) {
      const prevItem = headingsOutline[itemIndex - 1];
      const prevEl = editorRef.current.querySelector(`#${prevItem.id}`);
      if (prevEl) {
        const currentNodes = getSectionNodeRange(targetEl, currentItem.level);
        currentNodes.forEach(node => {
          prevEl.parentNode?.insertBefore(node, prevEl);
        });
        updateMetrics();
      }
    } else if (direction === 'down' && itemIndex < headingsOutline.length - 1) {
      const nextItem = headingsOutline[itemIndex + 1];
      const nextEl = editorRef.current.querySelector(`#${nextItem.id}`);
      if (nextEl) {
        const nextNodes = getSectionNodeRange(nextEl, nextItem.level);
        const lastNextNode = nextNodes[nextNodes.length - 1];
        if (lastNextNode) {
          const currentNodes = getSectionNodeRange(targetEl, currentItem.level);
          const refNode = lastNextNode.nextSibling;
          currentNodes.forEach(node => {
            if (refNode) {
              lastNextNode.parentNode?.insertBefore(node, refNode);
            } else {
              lastNextNode.parentNode?.appendChild(node);
            }
          });
          updateMetrics();
        }
      }
    }
  };

  const handleDuplicateSection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editorRef.current) return;
    const item = headingsOutline.find(h => h.id === id);
    const targetEl = editorRef.current.querySelector(`#${id}`);
    if (!targetEl || !item) return;

    const nodes = getSectionNodeRange(targetEl, item.level);
    const container = document.createElement('div');
    nodes.forEach(n => container.appendChild(n.cloneNode(true)));

    container.querySelectorAll('[id]').forEach((child, idx) => {
      child.id = `heading-sec-dup-${Date.now()}-${idx}`;
    });

    const lastNode = nodes[nodes.length - 1];
    const parent = lastNode.parentNode;
    if (parent) {
      const nextRef = lastNode.nextSibling;
      Array.from(container.childNodes).forEach(cn => {
        if (nextRef) {
          parent.insertBefore(cn, nextRef);
        } else {
          parent.appendChild(cn);
        }
      });
      updateMetrics();
    }
  };

  const handleDeleteSection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editorRef.current) return;
    const item = headingsOutline.find(h => h.id === id);
    const targetEl = editorRef.current.querySelector(`#${id}`);
    if (!targetEl || !item) return;

    if (window.confirm(`Excluir a seção "${item.text}" e todo o seu conteúdo?`)) {
      const nodes = getSectionNodeRange(targetEl, item.level);
      nodes.forEach(node => node.parentNode?.removeChild(node));
      updateMetrics();
    }
  };

  const scrollToHeading = (id: string) => {
    if (!editorRef.current) return;
    const target = editorRef.current.querySelector(`#${id}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('bg-blue-100/60', 'transition-all', 'duration-500');
      setTimeout(() => {
        target.classList.remove('bg-blue-100/60');
      }, 1200);
      setActiveHeadingId(id);
    }
  };

  const toggleCollapseHeading = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedHeadingIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const allBlocks = [...customBlocks, ...DEFAULT_BUILDING_BLOCKS];
  const filteredBlocks = allBlocks.filter((blk) => {
    const matchesType = selectedDocType === 'Todos' || blk.documentType === selectedDocType;
    const matchesSearch =
      blk.title.toLowerCase().includes(searchBlockQuery.toLowerCase()) ||
      blk.description.toLowerCase().includes(searchBlockQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Filter Templates in Modal
  const filteredTemplates = LEGAL_TEMPLATES.filter((tmpl) => {
    const matchesCat = templateCategoryFilter === 'Todos' || tmpl.category === templateCategoryFilter;
    const matchesSearch =
      tmpl.title.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
      tmpl.description.toLowerCase().includes(templateSearchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const loadTemplate = (template: LegalTemplate) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = template.content;
      setDocTitle(`${template.title.replace(/[^a-zA-Z0-9_]/g, '_')}.docx`);
      updateMetrics();
      setShowTemplatesModal(false);
    }
  };

  const handleExportTXT = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = docTitle.replace(/\.[^/.]+$/, '') + '.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportHTML = () => {
    if (!editorRef.current) return;
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${docTitle}</title><style>body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.5; color: #000; }</style></head><body>${editorRef.current.innerHTML}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = docTitle.replace(/\.[^/.]+$/, '') + '.html';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!editorRef.current) return;
    setIsExporting(true);

    try {
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([595.28, 841.89]);
      const { width, height } = page.getSize();
      const margin = 50;

      const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const rawText = editorRef.current.innerText || '';
      const lines = rawText.split('\n');

      let yPos = height - margin;
      const fontSizePt = 11;
      const lineHeightPt = 16;

      for (const line of lines) {
        if (yPos < margin + lineHeightPt) {
          page = pdfDoc.addPage([595.28, 841.89]);
          yPos = height - margin;
        }

        const maxCharsPerLine = 75;
        if (line.length > maxCharsPerLine) {
          const chunks = line.match(new RegExp('.{1,' + maxCharsPerLine + '}', 'g')) || [line];
          for (const chunk of chunks) {
            if (yPos < margin + lineHeightPt) {
              page = pdfDoc.addPage([595.28, 841.89]);
              yPos = height - margin;
            }
            page.drawText(chunk, {
              x: margin,
              y: yPos,
              size: fontSizePt,
              font: font,
              color: rgb(0.1, 0.1, 0.1)
            });
            yPos -= lineHeightPt;
          }
        } else {
          page.drawText(line, {
            x: margin,
            y: yPos,
            size: fontSizePt,
            font: font,
            color: rgb(0.1, 0.1, 0.1)
          });
          yPos -= lineHeightPt;
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = docTitle.replace(/\.[^/.]+$/, '') + '_Exportado.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyText = () => {
    if (!editorRef.current) return;
    navigator.clipboard.writeText(editorRef.current.innerText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (editorRef.current) {
        if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
          editorRef.current.innerHTML = content;
        } else {
          const formatted = content
            .split('\n\n')
            .map(p => `<p style="text-indent: 2cm; margin-bottom: 12pt; text-align: justify; line-height: 1.5;">${p.replace(/\n/g, '<br>')}</p>`)
            .join('');
          editorRef.current.innerHTML = formatted;
        }
        setDocTitle(file.name);
        updateMetrics();
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Top Document Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-xl border transition-all ${
              isSidebarOpen
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Alternar Painel de Blocos e Estrutura"
          >
            <Layers className="w-4 h-4" />
          </button>

          <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-100 hover:bg-slate-800/60 focus:bg-slate-800 px-2 py-1 rounded-lg border border-transparent focus:border-blue-500/50 outline-none transition-all w-64 md:w-80 truncate"
            />
            <div className="flex items-center gap-2 text-[11px] text-slate-400 px-2 mt-0.5">
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <ShieldCheck className="w-3 h-3" /> 100% Offline (LGPD)
              </span>
              <span>•</span>
              <span className="text-slate-400">{lastSaved}</span>
            </div>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setShowVadeMecumModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 text-xs font-medium transition-all"
            title="Vade Mecum & Citações de Artigos"
          >
            <BookOpenCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Vade Mecum</span>
          </button>

          <button
            onClick={() => setShowQualificationModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-medium transition-all"
            title="Gerador de Endereçamento e Qualificação"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Endereçamento</span>
          </button>

          <button
            onClick={toggleDictation}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              isDictating
                ? 'bg-rose-600/30 text-rose-300 border-rose-500/60 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Ditado por Voz (Speech-to-Text)"
          >
            {isDictating ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-slate-400" />}
            <span>{isDictating ? 'Ouvindo...' : 'Ditar'}</span>
          </button>

          <button
            onClick={toggleSpeechRead}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              isSpeaking
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/60 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Leitura em Voz Alta (Text-to-Speech)"
          >
            {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-indigo-400" /> : <Volume2 className="w-3.5 h-3.5 text-slate-400" />}
            <span>{isSpeaking ? 'Parar Áudio' : 'Ouvir Texto'}</span>
          </button>

          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-medium transition-all"
            title="Estampar QR Code de Provas Digitais"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-400" />
            <span>QR Provas</span>
          </button>

          <button
            onClick={() => setShowRiskModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-medium transition-all"
            title="Checklist de Risco Jurídico (Score)"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
            <span>Checklist Risco</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-0.5 hidden sm:block"></div>

          <button
            onClick={() => setShowTemplatesModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/15 text-blue-400 hover:bg-blue-600/25 border border-blue-500/30 text-xs font-medium transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Modelos</span>
          </button>

          <button
            onClick={() => setShowAbntModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-medium transition-all"
            title="Validador ABNT e e-SAJ"
          >
            <Award className="w-3.5 h-3.5 text-purple-400" />
            <span>Regras ABNT</span>
          </button>

          <button
            onClick={() => { handleSaveSnapshot(); setShowVersionHistoryModal(true); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all"
            title="Histórico de Revisões"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>Histórico</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer border border-slate-700 transition-all">
            <FileUp className="w-3.5 h-3.5 text-slate-400" />
            <span>Abrir</span>
            <input type="file" accept=".txt,.html,.htm,.md" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-0.5 hidden sm:block"></div>

          <button
            onClick={handleExportDOCX}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-semibold transition-all"
            title="Baixar Arquivo Microsoft Word (.docx)"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>DOCX</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/30 transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? '...' : 'PDF'}</span>
          </button>
        </div>
      </div>

      {/* Google Docs Style Ribbon Toolbar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-3 py-2 flex items-center gap-1 flex-wrap text-xs text-slate-300 select-none overflow-x-auto">
        <div className="flex items-center gap-0.5 pr-2 border-r border-slate-800">
          <button
            onClick={() => executeCommand('undo')}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={() => executeCommand('redo')}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Refazer (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>

        <div className="pr-2 border-r border-slate-800">
          <select
            value={fontFamily}
            onChange={(e) => applyFontFamily(e.target.value)}
            className="bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="Times New Roman">Times New Roman (Padrão Petições)</option>
            <option value="Arial">Arial (Padrão ABNT)</option>
            <option value="Calibri">Calibri</option>
            <option value="Georgia">Georgia</option>
            <option value="Courier New">Courier New (Monospaçada)</option>
          </select>
        </div>

        <div className="pr-2 border-r border-slate-800">
          <select
            value={fontSize}
            onChange={(e) => applyFontSize(e.target.value)}
            className="bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="10pt">10pt (Citações ABNT)</option>
            <option value="11pt">11pt (Padrão e-SAJ)</option>
            <option value="12pt">12pt (Padrão Jurídico)</option>
            <option value="14pt">14pt (Títulos / Cabeçalhos)</option>
            <option value="16pt">16pt (Títulos Principais)</option>
          </select>
        </div>

        <div className="pr-2 border-r border-slate-800 flex items-center gap-1">
          <span className="text-[10px] text-slate-400">Espaço:</span>
          <select
            value={lineSpacing}
            onChange={(e) => applyLineSpacing(e.target.value)}
            className="bg-slate-800 text-slate-200 text-xs px-1.5 py-1 rounded border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="1.0">1.0 (Simples)</option>
            <option value="1.2">1.2 (Compacto)</option>
            <option value="1.5">1.5 (Padrão Tribunais)</option>
            <option value="2.0">2.0 (Duplo)</option>
          </select>
        </div>

        <div className="flex items-center gap-0.5 pr-2 border-r border-slate-800">
          <button
            onClick={() => executeCommand('bold')}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 font-bold hover:text-white"
            title="Negrito (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => executeCommand('italic')}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 italic hover:text-white"
            title="Itálico (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => executeCommand('underline')}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 underline hover:text-white"
            title="Sublinhado (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            onClick={() => executeCommand('strikeThrough')}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 line-through hover:text-white"
            title="Tachado"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-0.5 pr-2 border-r border-slate-800">
          <button
            onClick={() => executeCommand('justifyLeft')}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Alinhar à Esquerda"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => executeCommand('justifyCenter')}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Centralizar"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => executeCommand('justifyRight')}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Alinhar à Direita"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => executeCommand('justifyFull')}
            className="p-1.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30"
            title="Justificar (Padrão Petições)"
          >
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => executeCommand('insertUnorderedList')}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Lista com Marcadores"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => executeCommand('insertOrderedList')}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Lista Numerada"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Workspace: Left Building Blocks Sidebar + Centered Canvas */}
      <div className="flex-1 flex overflow-hidden bg-slate-950">
        {/* Left Side Panel: Organized Building Blocks & Outline */}
        {isSidebarOpen && (
          <aside className="w-80 bg-slate-900/95 border-r border-slate-800 flex flex-col shrink-0 overflow-hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full overflow-x-auto">
                <button
                  onClick={() => setSidebarTab('blocks')}
                  className={`flex-1 py-1.5 px-2 text-[11px] font-medium rounded-lg transition-all flex items-center justify-center gap-1 shrink-0 ${
                    sidebarTab === 'blocks'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Blocos</span>
                </button>
                <button
                  onClick={() => setSidebarTab('outline')}
                  className={`flex-1 py-1.5 px-2 text-[11px] font-medium rounded-lg transition-all flex items-center justify-center gap-1 shrink-0 ${
                    sidebarTab === 'outline'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FolderTree className="w-3.5 h-3.5" />
                  <span>Estrutura ({headingsOutline.length})</span>
                </button>
                <button
                  onClick={() => setSidebarTab('vars')}
                  className={`flex-1 py-1.5 px-2 text-[11px] font-medium rounded-lg transition-all flex items-center justify-center gap-1 shrink-0 ${
                    sidebarTab === 'vars'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Variáveis ({detectedPlaceholders.length})</span>
                </button>
              </div>
            </div>

            {sidebarTab === 'blocks' ? (
              <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Pesquisar bloco ou cláusula..."
                      value={searchBlockQuery}
                      onChange={(e) => setSearchBlockQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => setShowAddCustomModal(true)}
                    className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 text-xs flex items-center justify-center"
                    title="Criar Bloco Personalizado"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
                    Filtrar por Tipo de Documento:
                  </label>
                  <select
                    value={selectedDocType}
                    onChange={(e) => setSelectedDocType(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Todos">Todos os Tipos</option>
                    <option value="Petição Inicial">⚖️ Petições Iniciais</option>
                    <option value="Procuração & Contrato">📜 Procurações & Contratos</option>
                    <option value="Parecer & Prefeitura">🏛️ Pareceres & Prefeitura</option>
                    <option value="Contestação & Defesa">📋 Contestações & Defesas</option>
                    <option value="Geral">📄 Cláusulas Gerais</option>
                  </select>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {filteredBlocks.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Nenhum bloco encontrado para os filtros selecionados.
                    </div>
                  ) : (
                    filteredBlocks.map((blk) => (
                      <div
                        key={blk.id}
                        onClick={() => insertBuildingBlock(blk)}
                        className="p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 cursor-pointer transition-all group relative"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-semibold text-xs text-slate-200 group-hover:text-blue-400 transition-colors">
                            {blk.title}
                          </span>
                          {blk.badge && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              blk.isCustom
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}>
                              {blk.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          {blk.description}
                        </p>

                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                          <span className="text-slate-400">{blk.documentType}</span>
                          <span className="text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            <Plus className="w-3 h-3" /> Inserir
                          </span>
                        </div>

                        {blk.isCustom && (
                          <button
                            onClick={(e) => handleDeleteCustomBlock(blk.id, e)}
                            className="absolute top-2 right-2 p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded"
                            title="Excluir Bloco Personalizado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : sidebarTab === 'outline' ? (
              <div className="flex-1 flex flex-col overflow-hidden p-3 gap-2.5">
                {/* Search & Filter Toolbar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Filtrar tópicos ou seções..."
                      value={outlineSearchQuery}
                      onChange={(e) => setOutlineSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={outlineFilterCategory}
                    onChange={(e) => setOutlineFilterCategory(e.target.value)}
                    className="bg-slate-950 text-slate-200 text-xs px-2 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                    title="Filtrar tipo de seção"
                  >
                    <option value="todos">Todos</option>
                    <option value="clausulas">📜 Cláusulas/Artigos</option>
                    <option value="peticoes">⚖️ Petições (Fatos/Pedidos)</option>
                    <option value="titulos">🏷️ Títulos Principais</option>
                  </select>
                </div>

                {/* Summary & Collapse All Controls */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 py-1 bg-slate-950/60 rounded-lg border border-slate-800/60">
                  <span className="font-medium text-slate-300">
                    {headingsOutline.length} {headingsOutline.length === 1 ? 'seção' : 'seções'} detectadas
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCollapsedHeadingIds([])}
                      className="hover:text-blue-400 transition-colors text-[10px]"
                      title="Expandir todas as seções"
                    >
                      Expandir Tudo
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => setCollapsedHeadingIds(headingsOutline.filter(h => h.hasChildren).map(h => h.id))}
                      className="hover:text-blue-400 transition-colors text-[10px]"
                      title="Recolher todas as seções filhas"
                    >
                      Recolher
                    </button>
                  </div>
                </div>

                {/* Outline List / Tree View */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {headingsOutline.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-xl">
                      <FolderTree className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                      <p className="font-medium text-slate-400">Nenhum título ou cláusula detectada.</p>
                      <p className="text-[11px]">Use formatações de Título (H1, H2, H3) ou digite palavras-chave como <strong>CLÁUSULA</strong>, <strong>DOS FATOS</strong> ou <strong>DO DIREITO</strong>.</p>
                    </div>
                  ) : (
                    headingsOutline
                      .filter(item => {
                        const matchesQuery = item.text.toLowerCase().includes(outlineSearchQuery.toLowerCase()) ||
                                             item.tag.toLowerCase().includes(outlineSearchQuery.toLowerCase());
                        const matchesCategory =
                          outlineFilterCategory === 'todos' ||
                          (outlineFilterCategory === 'clausulas' && (item.category === 'clausula' || item.category === 'artigo')) ||
                          (outlineFilterCategory === 'peticoes' && (item.category === 'fatos' || item.category === 'direito' || item.category === 'pedidos')) ||
                          (outlineFilterCategory === 'titulos' && (item.level === 1 || item.category === 'titulo'));
                        return matchesQuery && matchesCategory;
                      })
                      .map((item) => {
                        const isActive = activeHeadingId === item.id;
                        const isCollapsed = collapsedHeadingIds.includes(item.id);
                        const indentClass = item.level === 1 ? 'ml-0' : item.level === 2 ? 'ml-3' : 'ml-6';

                        return (
                          <div
                            key={item.id}
                            className={`group relative rounded-xl border transition-all duration-200 ${indentClass} ${
                              isActive
                                ? 'bg-blue-600/15 border-blue-500/60 shadow-lg shadow-blue-900/20 text-blue-100 ring-1 ring-blue-500/40'
                                : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800/70 hover:border-slate-700/80 text-slate-300'
                            }`}
                          >
                            <div className="p-2.5 flex items-center justify-between gap-2 cursor-pointer" onClick={() => scrollToHeading(item.id)}>
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {item.hasChildren ? (
                                  <button
                                    onClick={(e) => toggleCollapseHeading(item.id, e)}
                                    className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                                  >
                                    {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                ) : (
                                  <span className="w-3.5 h-3.5 inline-block" />
                                )}

                                {/* Category Badge */}
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 shrink-0 ${
                                  item.category === 'clausula'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : item.category === 'artigo'
                                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                                    : item.category === 'fatos'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : item.category === 'direito'
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                    : item.category === 'pedidos'
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                    : item.level === 1
                                    ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                                    : item.level === 2
                                    ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}>
                                  {item.category === 'clausula' && <ShieldCheck className="w-2.5 h-2.5" />}
                                  {item.category === 'artigo' && <BookOpen className="w-2.5 h-2.5" />}
                                  {item.category === 'fatos' && <Quote className="w-2.5 h-2.5" />}
                                  {item.category === 'direito' && <Scale className="w-2.5 h-2.5" />}
                                  {item.category === 'pedidos' && <FileCheck className="w-2.5 h-2.5" />}
                                  {item.tag}
                                </span>

                                <span className={`text-xs truncate font-medium ${isActive ? 'text-blue-300 font-semibold' : 'text-slate-200'}`}>
                                  {item.text}
                                </span>
                              </div>

                              {/* Section Stats & Actions Bar */}
                              <div className="flex items-center gap-1 shrink-0">
                                {item.wordCount > 0 && (
                                  <span className="text-[9px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 group-hover:hidden">
                                    {item.wordCount} pal.
                                  </span>
                                )}

                                {/* Hover Quick Action Buttons */}
                                <div className="hidden group-hover:flex items-center gap-0.5 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
                                  <button
                                    onClick={(e) => handleMoveSection(item.id, 'up', e)}
                                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                                    title="Mover Seção para Cima"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => handleMoveSection(item.id, 'down', e)}
                                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                                    title="Mover Seção para Baixo"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDuplicateSection(item.id, e)}
                                    className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                                    title="Duplicar Seção Inteira"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteSection(item.id, e)}
                                    className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                                    title="Excluir Seção Inteira"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
                <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-3 text-xs text-blue-200 leading-relaxed">
                  <p className="font-semibold text-blue-300 flex items-center gap-1.5 mb-1">
                    <KeyRound className="w-4 h-4 text-blue-400" /> Preenchimento Automático
                  </p>
                  <p className="text-[11px] text-blue-300/80">
                    Preencha os valores para substituir todas as marcações <code>[CAMPO]</code> no texto.
                  </p>
                </div>

                {detectedPlaceholders.length > 0 && (
                  <button
                    onClick={handleApplyAllPlaceholders}
                    className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" /> Substituir Todos Preenchidos
                  </button>
                )}

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {detectedPlaceholders.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-xl">
                      <KeyRound className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                      <p className="font-medium text-slate-400">Nenhuma variável detectada.</p>
                      <p className="text-[11px]">
                        Insira palavras entre colchetes no editor, como <strong>[NOME DO CLIENTE]</strong>, <strong>[CPF]</strong> ou <strong>[VALOR]</strong>.
                      </p>
                    </div>
                  ) : (
                    detectedPlaceholders.map((key) => (
                      <div key={key} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                        <label className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          [{key}]
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder={`Digite o valor para ${key}...`}
                            value={placeholderValues[key] || ''}
                            onChange={(e) => setPlaceholderValues(prev => ({ ...prev, [key]: e.target.value }))}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => handleApplyPlaceholder(key)}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors"
                            title="Substituir no texto"
                          >
                            Inserir
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Main Canvas Viewport (Google Docs Paper Canvas) */}
        <div className="flex-1 bg-slate-950 overflow-y-auto p-4 md:p-8 flex justify-center items-start">
          <div className="w-full max-w-[816px] min-h-[1056px] bg-white text-slate-900 shadow-2xl rounded-sm p-8 md:p-12 relative border border-slate-300 focus:outline-none transition-all">
            <div
              ref={editorRef}
              contentEditable
              onInput={updateMetrics}
              onKeyUp={updateMetrics}
              className="w-full min-h-[950px] outline-none text-slate-900 leading-relaxed selection:bg-blue-200"
              style={{
                fontFamily: fontFamily,
                fontSize: fontSize,
                lineHeight: lineSpacing,
                textAlign: 'justify'
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer Metrics & Status Bar */}
      <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-400 select-none">
        <div className="flex items-center gap-4">
          <div>
            <span className="font-semibold text-slate-200">{wordCount}</span> palavras
          </div>
          <div>
            <span className="font-semibold text-slate-200">{charCount}</span> caracteres
          </div>
          <div className="hidden sm:block text-slate-500">|</div>
          <div className="hidden sm:flex items-center gap-1.5 text-blue-400">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Formatação ABNT / PJe Pronta</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportHTML}
            className="hover:text-slate-200 text-slate-400 text-[11px] transition-colors"
          >
            Baixar HTML
          </button>
          <span>•</span>
          <button
            onClick={handleExportTXT}
            className="hover:text-slate-200 text-slate-400 text-[11px] transition-colors"
          >
            Baixar TXT
          </button>
        </div>
      </div>

      {/* Create Custom Building Block Modal */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-semibold text-slate-100 text-base">Salvar Bloco Personalizado</h3>
              <button
                onClick={() => setShowAddCustomModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">
                  Título do Bloco / Cláusula:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Minuta de Acordo Trabalhista"
                  value={newBlockTitle}
                  onChange={(e) => setNewBlockTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">
                  Tipo de Documento:
                </label>
                <select
                  value={newBlockCategory}
                  onChange={(e) => setNewBlockCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="Petição Inicial">Petição Inicial</option>
                  <option value="Procuração & Contrato">Procuração & Contrato</option>
                  <option value="Parecer & Prefeitura">Parecer & Prefeitura</option>
                  <option value="Contestação & Defesa">Contestação & Defesa</option>
                  <option value="Geral">Geral</option>
                </select>
              </div>

              <p className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                💡 <strong>Dica:</strong> Se você tiver selecionado qualquer trecho de texto no editor, esse trecho será salvo como conteúdo deste bloco!
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowAddCustomModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCustomBlock}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-900/30"
              >
                Salvar Bloco
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Legal Templates Selection Modal */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100 text-base">Biblioteca de Modelos de Documentos</h3>
                  <p className="text-xs text-slate-400">Selecione minutas completas de contratos, petições e atos administrativos</p>
                </div>
              </div>
              <button
                onClick={() => setShowTemplatesModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar modelo por nome, cláusula ou tipo..."
                    value={templateSearchQuery}
                    onChange={(e) => setTemplateSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {['Todos', 'Contratos', 'Petições & Recursos', 'Gestão Pública & Prefeituras'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setTemplateCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                      templateCategoryFilter === cat
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {cat === 'Contratos' && '📜 '}
                    {cat === 'Petições & Recursos' && '⚖️ '}
                    {cat === 'Gestão Pública & Prefeituras' && '🏛️ '}
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Templates List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto pr-1 flex-1">
              {filteredTemplates.length === 0 ? (
                <div className="col-span-2 p-8 text-center text-xs text-slate-500">
                  Nenhum modelo encontrado para a busca selecionada.
                </div>
              ) : (
                filteredTemplates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => loadTemplate(tmpl)}
                    className="p-4 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 cursor-pointer transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-slate-200 text-xs group-hover:text-blue-400 transition-colors leading-snug">
                          {tmpl.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                        {tmpl.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[10px]">
                      <span className="font-medium text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {tmpl.category}
                      </span>
                      <span className="text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Carregar Modelo →
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 mt-4 flex justify-end">
              <button
                onClick={() => setShowTemplatesModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABNT & e-SAJ Compliance Modal */}
      {showAbntModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-purple-400">
                <Award className="w-5 h-5" />
                <h3 className="font-semibold text-slate-100 text-base">Validador ABNT e e-SAJ / PJe</h3>
              </div>
              <button onClick={() => setShowAbntModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Fonte Tipográfica:</span>
                  <span className="text-emerald-400 font-bold">{fontFamily === 'Times New Roman' || fontFamily === 'Arial' ? `✓ Válida (${fontFamily})` : `⚠️ Atual: ${fontFamily}`}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Tamanho da Fonte:</span>
                  <span className="text-emerald-400 font-bold">{fontSize === '12pt' ? '✓ Válido (12pt)' : `⚠️ Atual: ${fontSize}`}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Espaçamento Entrelinhas:</span>
                  <span className="text-emerald-400 font-bold">{lineSpacing === '1.5' ? '✓ Válido (1.5)' : `⚠️ Atual: ${lineSpacing}`}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Recuo de Parágrafos:</span>
                  <span className="text-emerald-400 font-bold">✓ 2,0 cm na primeira linha</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Ajusta automaticamente a tipografia, alinhamento justificado e margens conforme as regras do e-SAJ, PJe e ABNT.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button onClick={() => setShowAbntModal(false)} className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">
                Cancelar
              </button>
              <button onClick={handleApplyAbntFormatting} className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-900/30">
                Aplicar Formatação ABNT Automática
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <History className="w-5 h-5" />
                <h3 className="font-semibold text-slate-100 text-base">Histórico de Versões do Documento</h3>
              </div>
              <button onClick={() => setShowVersionHistoryModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {versionHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Nenhuma versão salva anteriormente. Clique em "Salvar Snapshot Agora" para criar um ponto de restauração.
                </div>
              ) : (
                versionHistory.map((snap) => (
                  <div key={snap.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-blue-500/50 transition-all flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 text-xs">{snap.timestamp}</span>
                        <span className="text-[10px] text-slate-400">({snap.wordCount} palavras)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">{snap.title}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestoreSnapshot(snap)}
                        className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-medium transition-colors"
                      >
                        Restaurar Versão
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <button
                onClick={handleSaveSnapshot}
                className="px-3.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold"
              >
                + Salvar Snapshot Agora
              </button>
              <button onClick={() => setShowVersionHistoryModal(false)} className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vade Mecum Citation Modal */}
      {showVadeMecumModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2 text-teal-400">
                <BookOpenCheck className="w-5 h-5" />
                <h3 className="font-semibold text-slate-100 text-base">Vade Mecum & Citações Diretas</h3>
              </div>
              <button onClick={() => setShowVadeMecumModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar artigo, assunto ou código (Ex: Art. 300, CDC, Tutela)..."
                  value={vadeSearchQuery}
                  onChange={(e) => setVadeSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
              <select
                value={vadeLawFilter}
                onChange={(e) => setVadeLawFilter(e.target.value)}
                className="bg-slate-950 text-slate-200 text-xs px-3 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="TODAS">Todas as Leis</option>
                <option value="CF/88">CF/88</option>
                <option value="CPC/15">CPC/15</option>
                <option value="CC/02">CC/02</option>
                <option value="CLT">CLT</option>
                <option value="CDC">CDC</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {QUICK_VADE_MECUM
                .filter(art => {
                  const matchesSearch = art.article.toLowerCase().includes(vadeSearchQuery.toLowerCase()) ||
                                       art.summary.toLowerCase().includes(vadeSearchQuery.toLowerCase()) ||
                                       art.text.toLowerCase().includes(vadeSearchQuery.toLowerCase());
                  const matchesLaw = vadeLawFilter === 'TODAS' || art.law === vadeLawFilter;
                  return matchesSearch && matchesLaw;
                })
                .map((art, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-teal-500/50 transition-all space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
                          {art.law} - {art.article}
                        </span>
                        <h4 className="font-semibold text-slate-200 text-xs mt-1">{art.summary}</h4>
                      </div>
                      <button
                        onClick={() => handleInsertArticleCitation(art)}
                        className="px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" /> Inserir Citação ABNT
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                      “{art.text}”
                    </p>
                  </div>
                ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button onClick={() => setShowVadeMecumModal(false)} className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Qualification Generator Modal */}
      {showQualificationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-blue-400">
                <UserCheck className="w-5 h-5" />
                <h3 className="font-semibold text-slate-100 text-base">Gerador de Endereçamento e Qualificação</h3>
              </div>
              <button onClick={() => setShowQualificationModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Endereçamento ao Juízo:</label>
                <input
                  type="text"
                  value={courtJurisdiction}
                  onChange={(e) => setCourtJurisdiction(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">Nome do Autor:</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">CPF do Autor:</label>
                  <input
                    type="text"
                    value={authorCpf}
                    onChange={(e) => setAuthorCpf(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Endereço Completo do Autor:</label>
                <input
                  type="text"
                  value={authorAddress}
                  onChange={(e) => setAuthorAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">Nome do Réu:</label>
                  <input
                    type="text"
                    value={defendantName}
                    onChange={(e) => setDefendantName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">CNPJ / CPF do Réu:</label>
                  <input
                    type="text"
                    value={defendantCnpj}
                    onChange={(e) => setDefendantCnpj(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Título da Ação:</label>
                <input
                  type="text"
                  value={actionTitle}
                  onChange={(e) => setActionTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button onClick={() => setShowQualificationModal(false)} className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">
                Cancelar
              </button>
              <button onClick={handleGenerateQualification} className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-900/30">
                Gerar Estrutura de Petição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Proof Stamp Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400">
                <QrCode className="w-5 h-5" />
                <h3 className="font-semibold text-slate-100 text-base">Estampar QR Code de Provas</h3>
              </div>
              <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Título / Identificação da Mídia:</label>
                <input
                  type="text"
                  placeholder="Ex: Áudio do WhatsApp / Depoimento"
                  value={qrProofTitle}
                  onChange={(e) => setQrProofTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">Link / URL da Prova no Google Drive / PJe:</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={qrProofUrl}
                  onChange={(e) => setQrProofUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-[11px] text-amber-300">
                💡 O QR Code gerado será embutido diretamente no corpo do documento com um card visual de destaque para juízes e peritos escanearem.
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button onClick={() => setShowQrModal(false)} className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">
                Cancelar
              </button>
              <button onClick={handleInsertQrCodeStamp} className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-900/30">
                Estampar QR Code no Texto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legal Risk & Completion Score Modal */}
      {showRiskModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            {(() => {
              const { score, items } = calculateLegalScore();
              return (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <ShieldAlert className="w-5 h-5" />
                      <h3 className="font-semibold text-slate-100 text-base">Checklist de Risco Jurídico</h3>
                    </div>
                    <button onClick={() => setShowRiskModal(false)} className="text-slate-400 hover:text-white">✕</button>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-2">
                    <span className="text-xs text-slate-400 font-medium">Score de Completude do Documento</span>
                    <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                      {score}%
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${score}%` }}></div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                        <span className="text-slate-300 font-medium">{item.name}</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${item.ok ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                          {item.ok ? `✓ Presente (+${item.weight}%)` : `⚠️ Ausente`}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button onClick={() => setShowRiskModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold">
                      Fechar
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocEditor;
