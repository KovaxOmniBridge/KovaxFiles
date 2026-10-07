import React, { useState, useMemo, useEffect } from 'react';
import { 
  Scale, 
  Search, 
  BookOpen, 
  Copy, 
  Check, 
  Download, 
  Filter, 
  FileText, 
  ExternalLink, 
  Layers, 
  Bookmark, 
  FileCheck,
  ChevronRight,
  RefreshCw,
  Info,
  Building2,
  ShieldCheck,
  Briefcase,
  GitCompare,
  History,
  Sparkles,
  Trash2,
  Plus,
  FolderTree,
  FileCode,
  Share2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X,
  FileUp,
  ShieldAlert,
  Bot,
  Lock,
  Eye,
  Columns,
  Archive,
  AlertTriangle,
  Settings,
  Globe,
  MapPin,
  Landmark,
  Building,
  Save
} from 'lucide-react';
import { 
  LegalKnowledgeBaseService, 
  LegalArticle, 
  HistoricalVersion, 
  JurisprudenceRef,
  StatuteStatus,
  LawType
} from '../../services/legalKnowledgeBaseService';
import { CustomLegalKnowledgeService } from '../../services/customLegalKnowledgeService';
import { UserLegalPreferencesService, UserLegalPreferences } from '../../services/userLegalPreferencesService';
import { MunicipalitiesService } from '../../services/municipalitiesService';
import { DocxExporterService } from '../../services/docxExporterService';
import { JURISPRUDENCE_STATUTES } from '../../data/jurisprudenceData';

type LawScopeFilter = 
  | 'ALL' 
  // Constitucional
  | 'CF88' 
  | 'SUMULAS_STF'
  | 'SUMULAS_STJ'
  | 'SUMULAS_TST'
  | 'SUMULAS'
  // Federal
  | 'CPC' 
  | 'CLT' 
  | 'CIVIL' 
  | 'PENAL' 
  | 'CTN'
  | 'LICITACOES' 
  | 'LGPD' 
  | 'CDC' 
  | 'IMPROBIDADE'
  | 'INQUILINATO'
  | 'PREVIDENCIARIO'
  | 'FALENCIAS'
  | 'ECA'
  | 'CTB'
  | 'OAB'
  | 'LEP'
  | 'LJE'
  | 'MARIA_DA_PENHA'
  // Estadual
  | 'CESP'
  | 'ESTATUTO_ESTADUAL'
  | 'REGIMENTO_TJ'
  | 'TRIBUTARIO_ESTADUAL'
  | 'LICITACOES_ESTADUAL'
  // Municipal
  | 'LOM'
  | 'CODIGO_OBRAS'
  | 'POSTURAS'
  | 'TRIBUTARIO_MUNICIPAL'
  | 'ESTATUTO_MUNICIPAL'
  // Custom
  | 'CUSTOM';

type MainTab = 'search' | 'tree' | 'jurisprudence' | 'caseAnalysis' | 'citations' | 'custom';
type OperatingPillar = 'P1_DETERMINISTIC' | 'P2_AI_ASSISTED';
type VigenciaStatusFilter = 'ALL' | 'COMUM' | 'HISTORICA_OBSOLETA' | 'EM_DESUSO' | 'REVOGADA_DESATIVADA';
type EsferaTypeFilter = 'ALL' | LawType;

const UF_LIST = [
  'SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'PE', 'CE', 'GO', 
  'DF', 'ES', 'AM', 'PA', 'MT', 'MS', 'MA', 'PB', 'RN', 'AL', 
  'SE', 'PI', 'RO', 'AC', 'AP', 'RR', 'TO'
];

const SUGGESTED_MUNICIPALITIES = [
  'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre',
  'Salvador', 'Recife', 'Fortaleza', 'Brasília', 'Goiânia', 'Manaus', 'Belém',
  'Campinas', 'Santos', 'Guarulhos', 'Ribeirão Preto', 'São José dos Campos',
  'Sorocaba', 'Niterói', 'Uberlândia', 'Florianópolis'
];

interface QuickConceptChip {
  id: string;
  label: string;
  query: string;
  icon: string;
  badge: string;
}

const QUICK_CONCEPTS: QuickConceptChip[] = [
  { id: 'lgpd-vazamento', label: '🛡️ Vazamento de Dados', query: 'vazamento de dados sensíveis segurança', icon: 'ShieldCheck', badge: 'LGPD' },
  { id: 'cpc-peticao', label: '⚖️ Requisitos Petição Inicial', query: 'petição inicial requisitos essenciais valor da causa', icon: 'Scale', badge: 'CPC' },
  { id: 'lic-inexig', label: '🏛️ Inexigibilidade de Licitação', query: 'inexigibilidade inviável competição notória especialização', icon: 'Building2', badge: 'Lei 14.133' },
  { id: 'clt-justa-causa', label: '💼 Justa Causa & Abandono', query: 'justa causa abandono de emprego 30 dias', icon: 'Briefcase', badge: 'CLT' },
  { id: 'cpc-honorarios', label: '💰 Honorários & Custas', query: 'honorários advocatícios sucumbência gratuidade justiça', icon: 'FileText', badge: 'CPC' },
  { id: 'cc-aluguel', label: '🏠 Função Social do Contrato', query: 'função social do contrato cláusulas abusivas', icon: 'BookOpen', badge: 'Código Civil' },
  { id: 'stf-algemas', label: '🚔 Uso de Algemas', query: 'uso de algemas excepcionalidade nulidade', icon: 'AlertCircle', badge: 'STF' },
  { id: 'lic-8666-revogada', label: '🔴 Lei 8.666/93 (Revogada)', query: '8666 dispensa inexigibilidade', icon: 'Archive', badge: 'Revogada' },
];

export const LexmlSearchTool: React.FC = () => {
  // Carregar Preferências Salvas do Usuário no Início
  const [userPrefs, setUserPrefs] = useState<UserLegalPreferences>(() => UserLegalPreferencesService.getPreferences());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const [operatingPillar, setOperatingPillar] = useState<OperatingPillar>('P1_DETERMINISTIC');
  const [activeTab, setActiveTab] = useState<MainTab>('search');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Filtros Avançados (Scope, Vigência, Esfera, UF e Município com Salvamento Automático)
  const [scopeFilter, setScopeFilter] = useState<LawScopeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<VigenciaStatusFilter>(userPrefs.defaultStatusFilter || 'ALL');
  const [esferaFilter, setEsferaFilter] = useState<EsferaTypeFilter>(userPrefs.defaultLawType || 'ALL');
  
  // Estado UF e Município Ativos
  const [selectedStateUF, setSelectedStateUF] = useState<string>(userPrefs.savedStateUF || 'SP');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>(userPrefs.savedMunicipality || '');

  // Controle de Cópia e Seleção
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedArticleIds, setSelectedArticleIds] = useState<Set<string>>(new Set());

  // Modo de Exibição (Limpo Vigente vs Diff Histórico)
  const [diffViewArticles, setDiffViewArticles] = useState<Set<string>>(new Set());

  // Modal de Auditoria Lado a Lado (Side-by-Side)
  const [auditingArticle, setAuditingArticle] = useState<LegalArticle | null>(null);

  // Modal de Detalhes Completos do Dispositivo Legal (Exibição e Cópia em Partes)
  const [viewingDetailArticle, setViewingDetailArticle] = useState<LegalArticle | null>(null);

  // Estado da Pesquisa Contextual ("Análise por Caso")
  const [caseDocumentText, setCaseDocumentText] = useState<string>('');
  const [caseAnalysisResult, setCaseAnalysisResult] = useState<ReturnType<typeof LegalKnowledgeBaseService.analyzeDocumentForLaws> | null>(null);

  // Estado do Gerenciador de Leis Customizadas
  const [customLawName, setCustomLawName] = useState('');
  const [customArticleNum, setCustomArticleNum] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [customKeywords, setCustomKeywords] = useState('');
  const [customArticlesList, setCustomArticlesList] = useState<LegalArticle[]>(() => CustomLegalKnowledgeService.getCustomArticles());

  // Estado da Árvore Normativa
  const [selectedTreeLaw, setSelectedTreeLaw] = useState<string>('CF/88');

  // Estado das Configurações do Jurista / Município de Atuação
  const [prefMunicipality, setPrefMunicipality] = useState(userPrefs.savedMunicipality || '');
  const [prefStateUF, setPrefStateUF] = useState(userPrefs.savedStateUF || '');
  const [prefDefaultEsfera, setPrefDefaultEsfera] = useState<EsferaTypeFilter>(userPrefs.defaultLawType || 'ALL');
  const [prefDefaultStatus, setPrefDefaultStatus] = useState<VigenciaStatusFilter>(userPrefs.defaultStatusFilter || 'ALL');

  // Estado da Guia de Jurisprudência (Separado por Tribunal e Busca Instantânea)
  const [jurisprudenceTribunal, setJurisprudenceTribunal] = useState<'ALL' | 'STF' | 'STJ' | 'TST'>('ALL');
  const [jurisprudenceQuery, setJurisprudenceQuery] = useState<string>('');
  const [jurisprudenceDisplayCount, setJurisprudenceDisplayCount] = useState<number>(30);

  // Paginação e Desempenho Visual da Busca Principal (Previne travamento do navegador ao carregar 2.000+ artigos)
  const [searchDisplayCount, setSearchDisplayCount] = useState<number>(30);
  const [treeDisplayCount, setTreeDisplayCount] = useState<number>(30);

  // Carregar todos os artigos
  const allArticles = useMemo(() => {
    return LegalKnowledgeBaseService.getAllArticles();
  }, [customArticlesList]);

  // Exibir notificação rápida
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Resetar paginação visual quando os filtros forem alterados
  useEffect(() => {
    setSearchDisplayCount(30);
  }, [searchQuery, scopeFilter, statusFilter, esferaFilter, selectedStateUF, selectedMunicipality]);

  useEffect(() => {
    setTreeDisplayCount(30);
  }, [selectedTreeLaw]);

  // Obtém a lista de escopos categorizados de acordo com a Esfera selecionada
  const activeCategorizedScopes = useMemo(() => {
    switch (esferaFilter) {
      case 'CONSTITUCIONAL':
        return [
          { id: 'ALL' as LawScopeFilter, label: '🌐 Todos Constitucionais' },
          { id: 'CF88' as LawScopeFilter, label: '📜 CF/88 (Constituição)' },
          { id: 'SUMULAS_STF' as LawScopeFilter, label: '🏛️ Súmulas STF (797)' },
          { id: 'SUMULAS_STJ' as LawScopeFilter, label: '⚖️ Súmulas STJ (676)' },
          { id: 'SUMULAS_TST' as LawScopeFilter, label: '💼 Súmulas & OJs TST (1.286)' },
          { id: 'CUSTOM' as LawScopeFilter, label: '📁 Customizado' }
        ];
      case 'FEDERAL':
        return [
          { id: 'ALL' as LawScopeFilter, label: '🌐 Todos Federais' },
          { id: 'CPC' as LawScopeFilter, label: '⚖️ CPC (Proc. Civil)' },
          { id: 'CLT' as LawScopeFilter, label: '💼 CLT (Trabalhista)' },
          { id: 'CIVIL' as LawScopeFilter, label: '📘 Cód. Civil' },
          { id: 'PENAL' as LawScopeFilter, label: '📕 Cód. Penal / CPP' },
          { id: 'CTN' as LawScopeFilter, label: '💰 CTN (Tributário)' },
          { id: 'LICITACOES' as LawScopeFilter, label: '🏛️ Licitações (14.133 / 8.666)' },
          { id: 'LGPD' as LawScopeFilter, label: '🛡️ LGPD (Proteção Dados)' },
          { id: 'CDC' as LawScopeFilter, label: '🛒 CDC (Consumidor)' },
          { id: 'IMPROBIDADE' as LawScopeFilter, label: '⚖️ LIA (Improbidade)' },
          { id: 'INQUILINATO' as LawScopeFilter, label: '🏠 Inquilinato / Locações' },
          { id: 'PREVIDENCIARIO' as LawScopeFilter, label: '👵 Previdenciário & LOAS' },
          { id: 'FALENCIAS' as LawScopeFilter, label: '🏢 Falências & Rec. Judicial' },
          { id: 'ECA' as LawScopeFilter, label: '👶 ECA (Infância & Juventude)' },
          { id: 'CTB' as LawScopeFilter, label: '🚗 CTB (Trânsito)' },
          { id: 'OAB' as LawScopeFilter, label: '💼 Estatuto OAB' },
          { id: 'LEP' as LawScopeFilter, label: '👮 LEP (Execução Penal)' },
          { id: 'LJE' as LawScopeFilter, label: '⚖️ LJE (Juizados Especiais)' },
          { id: 'MARIA_DA_PENHA' as LawScopeFilter, label: '🌸 Maria da Penha' },
          { id: 'SUMULAS_STF' as LawScopeFilter, label: '🏛️ Súmulas STF (797)' },
          { id: 'SUMULAS_STJ' as LawScopeFilter, label: '⚖️ Súmulas STJ (676)' },
          { id: 'SUMULAS_TST' as LawScopeFilter, label: '💼 Súmulas & OJs TST (1.286)' },
          { id: 'CUSTOM' as LawScopeFilter, label: '📁 Customizado' }
        ];
      case 'ESTADUAL':
        return [
          { id: 'ALL' as LawScopeFilter, label: '🌐 Todos Estaduais' },
          { id: 'CESP' as LawScopeFilter, label: '📜 Constituição Estadual' },
          { id: 'ESTATUTO_ESTADUAL' as LawScopeFilter, label: '👤 Estatuto Servidores Estaduais' },
          { id: 'REGIMENTO_TJ' as LawScopeFilter, label: '🏛️ Regimento Interno TJ' },
          { id: 'TRIBUTARIO_ESTADUAL' as LawScopeFilter, label: '💰 Código Tributário / ICMS' },
          { id: 'LICITACOES_ESTADUAL' as LawScopeFilter, label: '📋 Normas Compras Estaduais' },
          { id: 'CUSTOM' as LawScopeFilter, label: '📁 Acervo Local Estadual' }
        ];
      case 'MUNICIPAL':
        return [
          { id: 'ALL' as LawScopeFilter, label: '🌐 Todos Municipais' },
          { id: 'LOM' as LawScopeFilter, label: '🏛️ Lei Orgânica Municipal (LOM)' },
          { id: 'CODIGO_OBRAS' as LawScopeFilter, label: '🏗️ Código de Obras & Edificações' },
          { id: 'POSTURAS' as LawScopeFilter, label: '🏙️ Código de Posturas Urbanas' },
          { id: 'TRIBUTARIO_MUNICIPAL' as LawScopeFilter, label: '💰 Código Tributário / ISS' },
          { id: 'ESTATUTO_MUNICIPAL' as LawScopeFilter, label: '👤 Estatuto Servidores Municipais' },
          { id: 'CUSTOM' as LawScopeFilter, label: '📁 Acervo Local Municipal' }
        ];
      default:
        // 'ALL'
        return [
          { id: 'ALL' as LawScopeFilter, label: '🌐 Todos os Escopos' },
          { id: 'CF88' as LawScopeFilter, label: '📜 CF/88' },
          { id: 'CPC' as LawScopeFilter, label: '⚖️ CPC' },
          { id: 'CLT' as LawScopeFilter, label: '💼 CLT' },
          { id: 'CIVIL' as LawScopeFilter, label: '📘 Cód. Civil' },
          { id: 'PENAL' as LawScopeFilter, label: '📕 Cód. Penal' },
          { id: 'LICITACOES' as LawScopeFilter, label: '🏛️ Licitações' },
          { id: 'LGPD' as LawScopeFilter, label: '🛡️ LGPD' },
          { id: 'CDC' as LawScopeFilter, label: '🛒 CDC' },
          { id: 'SUMULAS_STF' as LawScopeFilter, label: '🏛️ Súmulas STF' },
          { id: 'SUMULAS_STJ' as LawScopeFilter, label: '⚖️ Súmulas STJ' },
          { id: 'SUMULAS_TST' as LawScopeFilter, label: '💼 Súmulas & OJs TST' },
          { id: 'LOM' as LawScopeFilter, label: '🏛️ LOM' },
          { id: 'CODIGO_OBRAS' as LawScopeFilter, label: '🏗️ Cód. Obras' },
          { id: 'CUSTOM' as LawScopeFilter, label: '📁 Customizado' }
        ];
    }
  }, [esferaFilter]);

  // Atualização e Salvamento Automático da Esfera (Constitucional, Federal, Estadual, Municipal)
  const handleEsferaFilterChange = (newEsfera: EsferaTypeFilter) => {
    setEsferaFilter(newEsfera);
    setScopeFilter('ALL'); // Reset do escopo para garantir sincronia com a esfera
    const updated = UserLegalPreferencesService.savePreferences({
      defaultLawType: newEsfera,
      savedStateUF: selectedStateUF.toUpperCase(),
      savedMunicipality: selectedMunicipality
    });
    setUserPrefs(updated);
    if (newEsfera === 'ESTADUAL') {
      showToast(`Esfera Estadual selecionada (${selectedStateUF.toUpperCase()}). Filtro salvo!`);
    } else if (newEsfera === 'MUNICIPAL') {
      showToast(`Esfera Municipal selecionada (${selectedMunicipality || 'Geral'} - ${selectedStateUF.toUpperCase()}). Filtro salvo!`);
    } else {
      showToast(`Filtro de Esfera (${newEsfera}) salvo como preferência!`);
    }
  };

  // Atualização e Salvamento Automático do Status de Vigência
  const handleStatusFilterChange = (newStatus: VigenciaStatusFilter) => {
    setStatusFilter(newStatus);
    const updated = UserLegalPreferencesService.savePreferences({
      defaultStatusFilter: newStatus,
      defaultLawType: esferaFilter,
      savedStateUF: selectedStateUF.toUpperCase(),
      savedMunicipality: selectedMunicipality
    });
    setUserPrefs(updated);
  };

  // Atualização e Salvamento Automático do Estado (UF)
  const handleStateChange = (uf: string) => {
    const upperUf = uf.toUpperCase();
    setSelectedStateUF(upperUf);
    const updated = UserLegalPreferencesService.savePreferences({
      savedStateUF: upperUf,
      savedMunicipality: selectedMunicipality,
      defaultLawType: esferaFilter
    });
    setUserPrefs(updated);
    showToast(`Estado (${upperUf}) selecionado e salvo como preferência ativa!`);
  };

  // Atualização e Salvamento Automático do Município
  const handleMunicipalityChange = (city: string) => {
    setSelectedMunicipality(city);
    const updated = UserLegalPreferencesService.savePreferences({
      savedMunicipality: city,
      savedStateUF: selectedStateUF.toUpperCase(),
      defaultLawType: esferaFilter
    });
    setUserPrefs(updated);
  };

  // Salvar Preferências de Forma Permanente via Formulário de Configuração
  const handleSaveUserPreferences = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = UserLegalPreferencesService.savePreferences({
      savedMunicipality: prefMunicipality.trim(),
      savedStateUF: prefStateUF.trim().toUpperCase(),
      defaultLawType: prefDefaultEsfera,
      defaultStatusFilter: prefDefaultStatus
    });
    setUserPrefs(updated);
    setSelectedMunicipality(prefMunicipality.trim());
    setSelectedStateUF(prefStateUF.trim().toUpperCase());
    setEsferaFilter(prefDefaultEsfera);
    setStatusFilter(prefDefaultStatus);
    setIsSettingsOpen(false);
    showToast(`Preferências salvas! Município: ${updated.savedMunicipality || 'Geral'}`);
  };

  // Acervo de Jurisprudência Filtrado por Tribunal (STF, STJ, TST) e Busca Inteligente
  const activeJurisprudenceList = useMemo(() => {
    let list: LegalArticle[] = [];
    if (jurisprudenceTribunal === 'STF') {
      list = LegalKnowledgeBaseService.getSTFArticles();
    } else if (jurisprudenceTribunal === 'STJ') {
      list = LegalKnowledgeBaseService.getSTJArticles();
    } else if (jurisprudenceTribunal === 'TST') {
      list = LegalKnowledgeBaseService.getTSTArticles();
    } else {
      list = [
        ...LegalKnowledgeBaseService.getSTFArticles(),
        ...LegalKnowledgeBaseService.getSTJArticles(),
        ...LegalKnowledgeBaseService.getTSTArticles()
      ];
    }

    if (jurisprudenceQuery.trim()) {
      const q = jurisprudenceQuery.toLowerCase().trim();
      list = list.filter(item => {
        const fullText = (item.lawName + ' ' + item.article + ' ' + item.title + ' ' + item.content + ' ' + (item.keywords || []).join(' ')).toLowerCase();
        return fullText.includes(q);
      });
    }

    return list;
  }, [jurisprudenceTribunal, jurisprudenceQuery]);

  // Filtrar resultados de busca por Busca Híbrida + Escopo + Vigência + Esfera + UF / Município
  const searchResults = useMemo(() => {
    let results: LegalArticle[] = [];

    // Carregamento Inteligente baseado no Escopo Solicitado para Evitar Sobrecarga de Memória
    if (scopeFilter === 'CPC') {
      results = LegalKnowledgeBaseService.getCPCArticles();
    } else if (scopeFilter === 'CLT') {
      results = LegalKnowledgeBaseService.getCLTArticles();
    } else if (scopeFilter === 'CIVIL') {
      results = LegalKnowledgeBaseService.getCivilArticles();
    } else if (scopeFilter === 'PENAL') {
      results = LegalKnowledgeBaseService.getPenalArticles();
    } else if (scopeFilter === 'CTN') {
      results = LegalKnowledgeBaseService.getCTNArticles();
    } else if (scopeFilter === 'LICITACOES') {
      results = LegalKnowledgeBaseService.getLicitacoesArticles();
    } else if (scopeFilter === 'LGPD') {
      results = LegalKnowledgeBaseService.getLGPDArticles();
    } else if (scopeFilter === 'CDC') {
      results = LegalKnowledgeBaseService.getCDCArticles();
    } else if (scopeFilter === 'IMPROBIDADE') {
      results = LegalKnowledgeBaseService.getLIAArticles();
    } else if (scopeFilter === 'INQUILINATO') {
      results = LegalKnowledgeBaseService.getInquilinatoArticles();
    } else if (scopeFilter === 'PREVIDENCIARIO') {
      results = LegalKnowledgeBaseService.getPrevidenciarioArticles();
    } else if (scopeFilter === 'FALENCIAS') {
      results = LegalKnowledgeBaseService.getFalenciasArticles();
    } else if (scopeFilter === 'ECA') {
      results = LegalKnowledgeBaseService.getECAArticles();
    } else if (scopeFilter === 'CTB') {
      results = LegalKnowledgeBaseService.getCTBArticles();
    } else if (scopeFilter === 'OAB') {
      results = LegalKnowledgeBaseService.getOABArticles();
    } else if (scopeFilter === 'LEP') {
      results = LegalKnowledgeBaseService.getLEPArticles();
    } else if (scopeFilter === 'LJE') {
      results = LegalKnowledgeBaseService.getLJEArticles();
    } else if (scopeFilter === 'MARIA_DA_PENHA') {
      results = LegalKnowledgeBaseService.getMariaDaPenhaArticles();
    } else if (scopeFilter === 'CESP') {
      results = LegalKnowledgeBaseService.getStateConstitutionArticles(selectedStateUF);
    } else if (scopeFilter === 'ESTATUTO_ESTADUAL') {
      results = LegalKnowledgeBaseService.getEstatutoServidoresEstaduaisArticles(selectedStateUF);
    } else if (scopeFilter === 'REGIMENTO_TJ') {
      results = LegalKnowledgeBaseService.getRegimentoTJArticles(selectedStateUF);
    } else if (scopeFilter === 'TRIBUTARIO_ESTADUAL') {
      results = LegalKnowledgeBaseService.getTributarioEstadualArticles(selectedStateUF);
    } else if (scopeFilter === 'LICITACOES_ESTADUAL') {
      results = LegalKnowledgeBaseService.getLicitacoesEstaduaisArticles(selectedStateUF);
    } else if (scopeFilter === 'LOM') {
      results = LegalKnowledgeBaseService.getLeiOrganicaMunicipalArticles(selectedStateUF);
    } else if (scopeFilter === 'CODIGO_OBRAS') {
      results = LegalKnowledgeBaseService.getCodigoObrasMunicipalArticles(selectedStateUF);
    } else if (scopeFilter === 'POSTURAS') {
      results = LegalKnowledgeBaseService.getCodigoPosturasMunicipalArticles(selectedStateUF);
    } else if (scopeFilter === 'TRIBUTARIO_MUNICIPAL') {
      results = LegalKnowledgeBaseService.getTributarioMunicipalArticles(selectedStateUF);
    } else if (scopeFilter === 'ESTATUTO_MUNICIPAL') {
      results = LegalKnowledgeBaseService.getEstatutoServidoresMunicipaisArticles(selectedStateUF);
    } else if (esferaFilter === 'MUNICIPAL' && scopeFilter === 'ALL') {
      results = [
        ...LegalKnowledgeBaseService.getLeiOrganicaMunicipalArticles(selectedStateUF),
        ...LegalKnowledgeBaseService.getTributarioMunicipalArticles(selectedStateUF),
        ...LegalKnowledgeBaseService.getEstatutoServidoresMunicipaisArticles(selectedStateUF),
        ...LegalKnowledgeBaseService.getCodigoObrasMunicipalArticles(selectedStateUF),
        ...LegalKnowledgeBaseService.getCodigoPosturasMunicipalArticles(selectedStateUF)
      ];
    } else if (esferaFilter === 'ESTADUAL' && scopeFilter === 'ALL') {
      results = [
        ...LegalKnowledgeBaseService.getStateConstitutionArticles(selectedStateUF),
        ...LegalKnowledgeBaseService.getEstatutoServidoresEstaduaisArticles(selectedStateUF),
        ...LegalKnowledgeBaseService.getRegimentoTJArticles(selectedStateUF),
        ...LegalKnowledgeBaseService.getTributarioEstadualArticles(selectedStateUF),
        ...LegalKnowledgeBaseService.getLicitacoesEstaduaisArticles(selectedStateUF)
      ];
    } else if (scopeFilter === 'CF88') {
      results = LegalKnowledgeBaseService.getConstitutionArticles();
    } else if (scopeFilter === 'SUMULAS_STF') {
      results = LegalKnowledgeBaseService.getSTFArticles();
    } else if (scopeFilter === 'SUMULAS_STJ') {
      results = LegalKnowledgeBaseService.getSTJArticles();
    } else if (scopeFilter === 'SUMULAS_TST') {
      results = LegalKnowledgeBaseService.getTSTArticles();
    } else if (scopeFilter === 'SUMULAS') {
      results = [
        ...LegalKnowledgeBaseService.getSTFArticles(),
        ...LegalKnowledgeBaseService.getSTJArticles(),
        ...LegalKnowledgeBaseService.getTSTArticles()
      ];
    } else if (scopeFilter === 'CUSTOM') {
      results = customArticlesList;
    } else {
      results = LegalKnowledgeBaseService.getCoreArticles();
    }

    // Se houver busca por texto, filtrar no subconjunto selecionado com busca por palavras-chave
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      results = results.filter(a => {
        const text = (a.lawName + ' ' + a.article + ' ' + a.title + ' ' + a.content + ' ' + (a.keywords || []).join(' ')).toLowerCase();
        return text.includes(q);
      });
    } else if (scopeFilter === 'ALL' && statusFilter === 'ALL' && esferaFilter === 'ALL') {
      // Destaques iniciais leves
      results = results.filter(a => 
        a.article === 'Artigo 1º' || 
        a.article === 'Artigo 5º' || 
        a.article === 'Artigo 37' || 
        a.article === 'Artigo 219' || 
        a.article === 'Artigo 74' ||
        a.article === 'Artigo 18' ||
        a.lawType === 'MUNICIPAL' ||
        a.lawType === 'ESTADUAL' ||
        a.id.startsWith('rev-') ||
        a.id.startsWith('stf-sv-')
      ).slice(0, 15);
    }

    // 1. Filtro por Escopo da Lei se não for acervo total de súmula
    if (scopeFilter !== 'ALL' && !['CPC', 'CLT', 'CIVIL', 'CF88', 'CESP', 'SUMULAS_STF', 'SUMULAS_STJ', 'SUMULAS_TST', 'SUMULAS', 'CUSTOM'].includes(scopeFilter)) {
      results = results.filter(a => {
        const law = (a.lawName + ' ' + (a.officialRef || '') + ' ' + a.title + ' ' + a.content).toUpperCase();
        const kw = (a.keywords || []).map(k => k.toLowerCase());

        switch (scopeFilter) {
          case 'PENAL':
            return law.includes('PENAL') || law.includes('2.848') || law.includes('3.689');
          case 'CTN':
            return law.includes('CTN') || law.includes('5.172') || law.includes('TRIBUTÁRIO');
          case 'LICITACOES':
            return law.includes('14.133') || law.includes('8.666') || law.includes('LICITAÇ');
          case 'LGPD':
            return law.includes('LGPD') || law.includes('13.709');
          case 'CDC':
            return law.includes('CDC') || law.includes('8.078');
          case 'IMPROBIDADE':
            return law.includes('14.230') || law.includes('8.429') || law.includes('IMPROBIDADE');
          case 'INQUILINATO':
            return law.includes('INQUILINATO') || law.includes('8.245') || law.includes('LOCAÇÃO');
          case 'PREVIDENCIARIO':
            return law.includes('PREVIDÊNCIA') || law.includes('8.213') || law.includes('LOAS') || law.includes('8.742') || law.includes('INSS');
          case 'FALENCIAS':
            return law.includes('FALÊNCIAS') || law.includes('11.101') || law.includes('RECUPERAÇÃO');
          case 'ECA':
            return law.includes('ECA') || law.includes('8.069') || law.includes('CRIANÇA');
          case 'CTB':
            return law.includes('CTB') || law.includes('9.503') || law.includes('TRÂNSITO');
          case 'OAB':
            return law.includes('OAB') || law.includes('8.906') || law.includes('ADVOCACIA');
          case 'LEP':
            return law.includes('LEP') || law.includes('7.210') || law.includes('EXECUÇÃO PENAL');
          case 'LJE':
            return law.includes('LJE') || law.includes('9.099') || law.includes('JUIZADOS ESPECIAIS');
          case 'MARIA_DA_PENHA':
            return law.includes('MARIA DA PENHA') || law.includes('11.340');
          case 'CESP':
            return law.includes('CONSTITUIÇÃO') || law.includes('LEI ORGÂNICA') || a.id.startsWith('const-est-') || a.id.startsWith('lodf-');
          case 'ESTATUTO_ESTADUAL':
            return law.includes('ESTATUTO') || law.includes('REGIME JURÍDICO') || law.includes('RJU') || a.id.startsWith('estatuto-');
          case 'REGIMENTO_TJ':
            return law.includes('REGIMENTO') || law.includes('RITJ') || a.id.startsWith('ritj-');
          case 'TRIBUTARIO_ESTADUAL':
            return law.includes('ICMS') || law.includes('IPVA') || law.includes('ITCMD') || law.includes('TRIBUTÁRIO') || a.id.startsWith('tributario-');
          case 'LICITACOES_ESTADUAL':
            return (law.includes('ESTADUAL') && law.includes('LICITAÇ')) || a.id.startsWith('licitacoes-');
          case 'LOM':
            return law.includes('LOM') || law.includes('LEI ORGÂNICA') || a.id.includes('lom');
          case 'CODIGO_OBRAS':
            return law.includes('OBRAS') || law.includes('EDIFICAÇÕES') || law.includes('16.642') || a.id.includes('obras');
          case 'POSTURAS':
            return law.includes('POSTURAS') || law.includes('URBANA') || a.id.includes('posturas');
          case 'TRIBUTARIO_MUNICIPAL':
            return law.includes('ISS') || law.includes('CTM') || law.includes('TRIBUTÁR') || a.id.includes('tributario-mun');
          case 'ESTATUTO_MUNICIPAL':
            return law.includes('ESTATUTO') || law.includes('RJU') || law.includes('SERVIDO') || a.id.includes('estatuto-mun');
          default:
            return true;
        }
      });
    }

    // 2. Filtro por Status de Vigência (Comum vs Obsoleta vs Revogada)
    if (statusFilter !== 'ALL') {
      results = results.filter(a => {
        const status = a.statusVigencia || 'COMUM';
        return status === statusFilter;
      });
    }

    // 3. Filtro por Esfera Legislativa (Constitucional, Federal, Estadual, Municipal)
    if (esferaFilter !== 'ALL' && !['SUMULAS_STF', 'SUMULAS_STJ', 'SUMULAS_TST', 'SUMULAS'].includes(scopeFilter)) {
      results = results.filter(a => {
        const isLodf = a.id.startsWith('lodf-') || a.lawName.includes('LODF');
        const inferredEsfera = isLodf && (esferaFilter === 'MUNICIPAL' || esferaFilter === 'ESTADUAL') ? esferaFilter : (a.lawType || (
          a.lawName.includes('CF/88') || a.lawName.includes('Constituição Federal') || a.lawName.includes('STF') || a.id.startsWith('stf-') ? 'CONSTITUCIONAL' :
          a.lawName.toLowerCase().includes('municipal') || a.lawName.toLowerCase().includes('prefeitura') || a.lawName.includes('LOM') ? 'MUNICIPAL' :
          a.lawName.toLowerCase().includes('estadual') || a.lawName.includes('CESP') || a.lawName.includes('TJSP') ? 'ESTADUAL' : 'FEDERAL'
        ));

        if (inferredEsfera !== esferaFilter) return false;

        // Se for estadual e tiver UF selecionada
        if (esferaFilter === 'ESTADUAL' && selectedStateUF) {
          const lowerId = a.id.toLowerCase();
          const ufLower = selectedStateUF.toLowerCase();

          // Se for artigo de constituição estadual específica, validar se pertence à UF selecionada
          if (lowerId.startsWith('cesp-') && ufLower !== 'sp') return false;
          if (lowerId.startsWith('cerj-') && ufLower !== 'rj') return false;
          if (lowerId.startsWith('cemg-') && ufLower !== 'mg') return false;
          if (lowerId.startsWith('cers-') && ufLower !== 'rs') return false;
          if (lowerId.startsWith('cepr-') && ufLower !== 'pr') return false;
          if (lowerId.startsWith('cesc-') && ufLower !== 'sc') return false;
          if (lowerId.startsWith('ceba-') && ufLower !== 'ba') return false;
          if (lowerId.startsWith('cepe-') && ufLower !== 'pe') return false;
          if (lowerId.startsWith('cece-') && ufLower !== 'ce') return false;
          if (lowerId.startsWith('cego-') && ufLower !== 'go') return false;
          if (lowerId.startsWith('lodf-') && ufLower !== 'df') return false;
          if (lowerId.startsWith('cees-') && ufLower !== 'es') return false;
          if (lowerId.startsWith('ceam-') && ufLower !== 'am') return false;
          if (lowerId.startsWith('cepa-') && ufLower !== 'pa') return false;
          if (lowerId.startsWith('cemt-') && ufLower !== 'mt') return false;
          if (lowerId.startsWith('cems-') && ufLower !== 'ms') return false;
          if (lowerId.startsWith('cema-') && ufLower !== 'ma') return false;
          if (lowerId.startsWith('cepb-') && ufLower !== 'pb') return false;
          if (lowerId.startsWith('cern-') && ufLower !== 'rn') return false;
          if (lowerId.startsWith('ceal-') && ufLower !== 'al') return false;
          if (lowerId.startsWith('cese-') && ufLower !== 'se') return false;
          if (lowerId.startsWith('cepi-') && ufLower !== 'pi') return false;
          if (lowerId.startsWith('cero-') && ufLower !== 'ro') return false;
          if (lowerId.startsWith('ceac-') && ufLower !== 'ac') return false;
          if (lowerId.startsWith('ceap-') && ufLower !== 'ap') return false;
          if (lowerId.startsWith('cerr-') && ufLower !== 'rr') return false;
          if (lowerId.startsWith('ceto-') && ufLower !== 'to') return false;
          if (lowerId.startsWith('estatuto-') && !lowerId.startsWith('estatuto-mun-') && !lowerId.startsWith(`estatuto-${ufLower}-`)) return false;
          if (lowerId.startsWith('ritj-') && !lowerId.startsWith(`ritj-${ufLower}-`)) return false;
          if (lowerId.startsWith('tributario-') && !lowerId.startsWith('tributario-mun-') && !lowerId.startsWith(`tributario-${ufLower}-`)) return false;
          if (lowerId.startsWith('licitacoes-') && !lowerId.startsWith(`licitacoes-${ufLower}-`)) return false;
          if (lowerId.startsWith('const-est-') && !lowerId.startsWith(`const-est-${ufLower}-`)) return false;

          const lowerLaw = `${a.lawName} ${a.officialRef || ''} ${a.keywords.join(' ')}`.toLowerCase();
          return lowerLaw.includes(ufLower) || lowerLaw.includes(`(${ufLower}/`) || lowerLaw.includes(`-${ufLower}`) || lowerLaw.includes('estadual');
        }

        // Se for esfera MUNICIPAL
        if (esferaFilter === 'MUNICIPAL') {
          const lowerId = a.id.toLowerCase();
          const ufLower = (selectedStateUF || 'SP').toLowerCase();

          // 1. Filtragem rigorosa por UF (impede vazamento de leis municipais de outros estados)
          const municipalPrefixes = ['lom', 'tributario-mun', 'estatuto-mun', 'obras', 'posturas', 'mun'];
          const cleanId = lowerId.replace(/^(obs|rev|desuso)-/, '');
          const matchedPrefix = municipalPrefixes.find(p => cleanId.startsWith(`${p}-`));

          if (matchedPrefix && !cleanId.startsWith(`${matchedPrefix}-${ufLower}-`)) {
            return false;
          }

          // Se for DF (Brasília), inclui LODF
          if (ufLower === 'df') {
            if (lowerId.startsWith('lodf-')) return true;
          } else {
            if (lowerId.startsWith('lodf-')) return false;
          }

          // 2. Filtragem por Município selecionado/digitado
          if (selectedMunicipality.trim()) {
            const cityLower = selectedMunicipality.trim().toLowerCase();
            const lowerLaw = `${a.lawName} ${a.officialRef || ''} ${a.title} ${a.content} ${a.keywords.join(' ')}`.toLowerCase();
            
            // Se o ID tem o prefixo da UF selecionada (ex: lom-sp-art-1, obras-sp-art-1, obs-lom-sp-art10), pertence à Capital/UF selecionada
            if (matchedPrefix && cleanId.startsWith(`${matchedPrefix}-${ufLower}-`)) {
              return true;
            }

            return lowerLaw.includes(cityLower) || a.id.startsWith('custom-');
          }

          return true;
        }

        return true;
      });
    }

    return results;
  }, [searchQuery, scopeFilter, statusFilter, esferaFilter, selectedStateUF, selectedMunicipality, customArticlesList]);

  // Subconjunto paginado visível no DOM para performance ultra-rápida (60 FPS)
  const visibleSearchResults = useMemo(() => {
    return searchResults.slice(0, searchDisplayCount);
  }, [searchResults, searchDisplayCount]);

  const selectedArticlesList = useMemo(() => {
    return allArticles.filter(a => selectedArticleIds.has(a.id));
  }, [allArticles, selectedArticleIds]);

  const toggleArticleSelection = (id: string) => {
    setSelectedArticleIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDiffView = (id: string) => {
    setDiffViewArticles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyCitation = (art: LegalArticle, formatStyle: 'PETICAO_ABNT' | 'ABNT_DIRETA' | 'RESUMO_LEGAL' = 'PETICAO_ABNT') => {
    const formatted = LegalKnowledgeBaseService.formatCitation(art, formatStyle);
    navigator.clipboard.writeText(formatted);
    setCopiedId(art.id);
    showToast(`Citação oficial do ${art.article} copiada! (Texto 100% Factual)`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRunCaseAnalysis = () => {
    if (!caseDocumentText.trim()) return;
    const result = LegalKnowledgeBaseService.analyzeDocumentForLaws(caseDocumentText);
    setCaseAnalysisResult(result);
    showToast(`Diagnóstico concluído: Domínio ${result.categoryLabel}`);
  };

  const handleAddCustomArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLawName.trim() || !customArticleNum.trim() || !customContent.trim()) {
      showToast('Preencha os campos obrigatórios da lei customizada.');
      return;
    }

    const newArt = CustomLegalKnowledgeService.addCustomArticle({
      lawName: customLawName.trim(),
      article: customArticleNum.trim(),
      title: customTitle.trim() || 'Dispositivo Legal Interno / Municipal',
      content: customContent.trim(),
      keywords: customKeywords.split(',').map(k => k.trim()).filter(Boolean)
    });

    setCustomArticlesList(CustomLegalKnowledgeService.getCustomArticles());
    setCustomLawName('');
    setCustomArticleNum('');
    setCustomTitle('');
    setCustomContent('');
    setCustomKeywords('');
    showToast(`Nova norma "${newArt.article}" adicionada ao acervo customizado!`);
  };

  const handleDeleteCustomArticle = (id: string) => {
    CustomLegalKnowledgeService.deleteCustomArticle(id);
    setCustomArticlesList(CustomLegalKnowledgeService.getCustomArticles());
    showToast('Norma customizada removida do acervo.');
  };

  const handleExportCitationsDocx = () => {
    if (selectedArticlesList.length === 0) {
      showToast('Selecione ao menos um artigo para exportar.');
      return;
    }

    const bodyContent = selectedArticlesList.map(a => {
      const citation = LegalKnowledgeBaseService.formatCitation(a, 'PETICAO_ABNT');
      return `## ${a.lawName} - ${a.article}: ${a.title}\n\n${citation}\n\n---`;
    }).join('\n\n');

    DocxExporterService.exportToDocx({
      title: 'Compêndio de Legislação e Fundamentação Jurídica - Kovax Engine',
      authorName: 'Plataforma KovaxFilesApp',
      roleTitle: 'Consultoria e Engenharia Jurídica',
      profileBadge: 'Kovax Legal Engine',
      content: `# Compêndio de Fundamentação Legislativa (100% Factual)\n\nEste relatório reúne as normas legais selecionadas para instrução processual com ancoragem oficial no Planalto.\n\n${bodyContent}`
    });

    showToast('Relatório em formato Word (.docx) exportado com sucesso!');
  };

  // Helper para renderizar badge de vigência
  const renderStatusBadge = (status?: StatuteStatus) => {
    const s = status || 'COMUM';
    switch (s) {
      case 'COMUM':
        return (
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold rounded-md flex items-center space-x-1">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
            <span>Em Vigor</span>
          </span>
        );
      case 'HISTORICA_OBSOLETA':
        return (
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold rounded-md flex items-center space-x-1">
            <Archive className="w-3 h-3 text-amber-400" />
            <span>Histórica / Obsoleta</span>
          </span>
        );
      case 'EM_DESUSO':
        return (
          <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[10px] font-bold rounded-md flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3 text-orange-400" />
            <span>Em Desuso</span>
          </span>
        );
      case 'REVOGADA_DESATIVADA':
        return (
          <span className="px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold rounded-md flex items-center space-x-1">
            <X className="w-3 h-3 text-red-400" />
            <span>Revogada / Desativada</span>
          </span>
        );
    }
  };

  // Helper para renderizar badge de Esfera Legislativa
  const renderEsferaBadge = (art: LegalArticle) => {
    const esfera = art.lawType || (
      art.lawName.includes('CF/88') || art.lawName.includes('Constituição Federal') ? 'CONSTITUCIONAL' :
      art.lawName.toLowerCase().includes('municipal') || art.lawName.toLowerCase().includes('prefeitura') || art.lawName.includes('LOM') ? 'MUNICIPAL' :
      art.lawName.toLowerCase().includes('estadual') || art.lawName.includes('CESP') || art.lawName.includes('TJSP') ? 'ESTADUAL' : 'FEDERAL'
    );

    switch (esfera) {
      case 'CONSTITUCIONAL':
        return (
          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold rounded-md flex items-center space-x-1">
            <Landmark className="w-3 h-3 text-purple-400" />
            <span>Constitucional</span>
          </span>
        );
      case 'FEDERAL':
        return (
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold rounded-md flex items-center space-x-1">
            <Globe className="w-3 h-3 text-blue-400" />
            <span>Federal</span>
          </span>
        );
      case 'ESTADUAL':
        return (
          <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-bold rounded-md flex items-center space-x-1">
            <Building className="w-3 h-3 text-sky-400" />
            <span>Estadual</span>
          </span>
        );
      case 'MUNICIPAL':
        return (
          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold rounded-md flex items-center space-x-1">
            <Building2 className="w-3 h-3 text-indigo-400" />
            <span>Municipal</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* TOAST FLOATING NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center space-x-2 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-2xl animate-fade-in border border-indigo-400">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* HEADER PRINCIPAL E SELETOR DOS DOIS PILARES */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400 shadow-inner">
              <Scale className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-300 via-sky-200 to-white bg-clip-text text-transparent">
                  Kovax Smart Legal Engine
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 rounded-full">
                  LexSmart v4.0 Auto-Saved
                </span>
                {selectedMunicipality && (
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-600/30 border border-indigo-500/50 text-indigo-200 rounded-full flex items-center space-x-1 animate-pulse">
                    <MapPin className="w-3 h-3 text-indigo-400" />
                    <span>{selectedMunicipality} ({selectedStateUF})</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pesquisa Inteligente por Esferas com Salvamento Automático do Estado e Município de Atuação
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* BOTÃO DE CONFIGURAÇÕES DE PREFERÊNCIA DO MUNICÍPIO */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl transition-colors flex items-center space-x-2 text-xs font-semibold"
              title="Configurar Município de Atuação e Preferências Salvas"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Minhas Preferências</span>
            </button>

            {/* SELETOR DE PILAR OPERACIONAL */}
            <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  setOperatingPillar('P1_DETERMINISTIC');
                  showToast('Ativado Pilar 1: Motor Determinístico Factual (100% Fonte Oficial / Zero IA)');
                }}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  operatingPillar === 'P1_DETERMINISTIC'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Pilar 1: 100% Factual</span>
              </button>

              <button
                onClick={() => {
                  setOperatingPillar('P2_AI_ASSISTED');
                  showToast('Ativado Pilar 2: Rascunho com IA (Revisão Humana Obrigatória)');
                }}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  operatingPillar === 'P2_AI_ASSISTED'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>Pilar 2: IA Assistida</span>
              </button>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO DAS ABAS PRINCIPAIS */}
        <div className="flex items-center space-x-1 border-b border-slate-800 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap ${
              activeTab === 'search'
                ? 'bg-slate-950 text-indigo-400 border-t-2 border-indigo-500 shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Busca Factual & Híbrida</span>
          </button>

          <button
            onClick={() => setActiveTab('tree')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap ${
              activeTab === 'tree'
                ? 'bg-slate-950 text-indigo-400 border-t-2 border-indigo-500 shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Árvore Normativa</span>
          </button>

          <button
            onClick={() => setActiveTab('jurisprudence')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap ${
              activeTab === 'jurisprudence'
                ? 'bg-slate-950 text-indigo-400 border-t-2 border-indigo-500 shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Súmulas & Precedentes</span>
          </button>

          <button
            onClick={() => setActiveTab('caseAnalysis')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap ${
              activeTab === 'caseAnalysis'
                ? 'bg-slate-950 text-indigo-400 border-t-2 border-indigo-500 shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Análise por Caso (Anexo)</span>
          </button>

          <button
            onClick={() => setActiveTab('citations')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap relative ${
              activeTab === 'citations'
                ? 'bg-slate-950 text-indigo-400 border-t-2 border-indigo-500 shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Minhas Citações ({selectedArticleIds.size})</span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap ${
              activeTab === 'custom'
                ? 'bg-slate-950 text-indigo-400 border-t-2 border-indigo-500 shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Acervo Próprio ({customArticlesList.length})</span>
          </button>
        </div>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950 scrollbar-thin">
        {/* ABA 1: BUSCA SEMÂNTICA & HÍBRIDA */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* CONCEITOS RÁPIDOS (CHIPS) */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Consultas Conceituais Frequentes (Atalhos RÁPIDOS)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_CONCEPTS.map(chip => (
                  <button
                    key={chip.id}
                    onClick={() => {
                      setSearchQuery(chip.query);
                      setScopeFilter('ALL');
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-xs font-medium text-slate-300 hover:text-indigo-300 transition-all flex items-center space-x-2 shadow-sm"
                  >
                    <span>{chip.label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded-full">
                      {chip.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* INPUT DE PESQUISA & FILTROS DE ESCOPO, ESFERA E VIGÊNCIA */}
            <div className="space-y-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    selectedMunicipality
                      ? `Pesquise no acervo do município (${selectedMunicipality} - ${selectedStateUF}), artigos ou leis...`
                      : "Pesquise por artigo (ex: 'Artigo 319' ou 'Art 5'), intenção jurídica ou número da lei..."
                  }
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl pl-11 pr-10 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* FILTRO 1: ESFERA / TIPO DE LEI (CONSTITUCIONAL, FEDERAL, ESTADUAL, MUNICIPAL) */}
              <div className="space-y-2 pt-1 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-sky-300">
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    <span>Filtro por Esfera Legislativa / Tipo de Lei:</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'ALL', label: '🌐 Todas as Esferas' },
                    { id: 'CONSTITUCIONAL', label: '📜 Constitucional' },
                    { id: 'FEDERAL', label: '🏛️ Federal' },
                    { id: 'ESTADUAL', label: '🗺️ Estadual' },
                    { id: 'MUNICIPAL', label: '🏙️ Municipal' },
                  ].map((esf) => (
                    <button
                      key={esf.id}
                      onClick={() => handleEsferaFilterChange(esf.id as EsferaTypeFilter)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        esferaFilter === esf.id
                          ? 'bg-sky-600 text-white shadow-md ring-2 ring-sky-400/50'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {esf.label}
                    </button>
                  ))}
                </div>

                {/* PAINEL DINÂMICO DO FILTRO ESTADUAL (COM SALVAMENTO AUTOMÁTICO DO ESTADO UF) */}
                {esferaFilter === 'ESTADUAL' && (
                  <div className="mt-2 p-3 bg-sky-950/30 border border-sky-500/30 rounded-xl flex flex-wrap items-center gap-3 text-xs animate-fade-in">
                    <span className="font-bold text-sky-300 flex items-center space-x-1.5">
                      <Building className="w-4 h-4 text-sky-400" />
                      <span>Selecione o Estado (UF):</span>
                    </span>
                    <select
                      value={selectedStateUF}
                      onChange={(e) => handleStateChange(e.target.value)}
                      className="bg-slate-950 border border-sky-500/40 rounded-lg px-3 py-1.5 text-sky-200 font-bold text-xs focus:outline-none focus:border-sky-400 cursor-pointer"
                    >
                      {UF_LIST.map(uf => (
                        <option key={uf} value={uf}>{uf} — Estado</option>
                      ))}
                    </select>
                    <span className="text-[11px] text-slate-400 italic">
                      💾 Estado selecionado é salvo automaticamente como preferência ativa.
                    </span>
                  </div>
                )}

                {/* PAINEL DINÂMICO DO FILTRO MUNICIPAL (COM SALVAMENTO AUTOMÁTICO DO MUNICÍPIO) */}
                {esferaFilter === 'MUNICIPAL' && (
                  <div className="mt-2 p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex flex-wrap items-center gap-4 text-xs animate-fade-in">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-indigo-300 flex items-center space-x-1">
                        <Building2 className="w-4 h-4 text-indigo-400" />
                        <span>UF:</span>
                      </span>
                      <select
                        value={selectedStateUF}
                        onChange={(e) => handleStateChange(e.target.value)}
                        className="bg-slate-950 border border-indigo-500/40 rounded-lg px-2.5 py-1.5 text-indigo-200 font-bold text-xs focus:outline-none cursor-pointer"
                      >
                        {UF_LIST.map(uf => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-1 items-center space-x-2 min-w-[280px]">
                      <span className="font-bold text-indigo-300 flex items-center space-x-1 whitespace-nowrap">
                        <MapPin className="w-4 h-4 text-indigo-400" />
                        <span>Município ({selectedStateUF}):</span>
                      </span>

                      {/* Dropdown com todos os municípios da UF selecionada */}
                      <select
                        value={selectedMunicipality}
                        onChange={(e) => handleMunicipalityChange(e.target.value)}
                        className="bg-slate-950 border border-indigo-500/40 rounded-lg px-3 py-1.5 text-indigo-200 text-xs focus:outline-none focus:border-indigo-400 shadow-inner max-w-[200px]"
                      >
                        <option value="">Selecione ou Digite...</option>
                        {MunicipalitiesService.getMunicipalitiesByState(selectedStateUF).map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>

                      {/* Campo para digitação com busca e autocompletar */}
                      <input
                        type="text"
                        list="official-municipalities-list"
                        value={selectedMunicipality}
                        onChange={(e) => handleMunicipalityChange(e.target.value)}
                        placeholder="ou digite o município..."
                        className="flex-1 bg-slate-950 border border-indigo-500/40 rounded-lg px-3 py-1.5 text-indigo-200 text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-400 shadow-inner"
                      />
                      <datalist id="official-municipalities-list">
                        {MunicipalitiesService.getMunicipalitiesByState(selectedStateUF).map(city => (
                          <option key={city} value={city} />
                        ))}
                      </datalist>
                    </div>

                    <span className="text-[11px] text-indigo-300/80 italic font-semibold flex items-center space-x-1">
                      <Save className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Salvo automaticamente!</span>
                    </span>
                  </div>
                )}
              </div>

              {/* FILTRO 2: STATUS DE VIGÊNCIA E HISTÓRIA */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center space-x-2 text-xs font-bold text-indigo-300">
                  <Archive className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Filtro por Status de Vigência:</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'ALL', label: '⚪ Todas as Leis Já Criadas' },
                    { id: 'COMUM', label: '🟢 Leis em Vigor / Comuns' },
                    { id: 'HISTORICA_OBSOLETA', label: '🟡 Históricas & Obsoletas' },
                    { id: 'EM_DESUSO', label: '🟠 Leis em Desuso' },
                    { id: 'REVOGADA_DESATIVADA', label: '🔴 Revogadas & Desativadas' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => handleStatusFilterChange(st.id as VigenciaStatusFilter)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        statusFilter === st.id
                          ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* FILTROS DE ESCOPO DA LEI (CATEGORIZADOS DINAMICAMENTE POR ESFERA) */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
                <span className="text-xs text-slate-400 font-medium mr-1 flex items-center space-x-1">
                  <Filter className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Escopo ({esferaFilter === 'ALL' ? 'Geral' : esferaFilter}):</span>
                </span>

                {activeCategorizedScopes.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setScopeFilter(filter.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      scopeFilter === filter.id
                        ? 'bg-indigo-600 text-white font-semibold shadow-md ring-1 ring-indigo-400/40'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* LISTA DE CARTÕES DE ARTIGOS */}
            <div className="space-y-4">
              {searchResults.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
                  <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                  <h3 className="text-base font-bold text-slate-200">Nenhum dispositivo legal encontrado para estes filtros</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Tente alterar a esfera (ex: selecionar "Todas as Esferas") ou resetar os filtros aplicados.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setScopeFilter('ALL');
                      setStatusFilter('ALL');
                      setEsferaFilter('ALL');
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    Resetar Todos os Filtros
                  </button>
                </div>
              ) : (
                <>
                  {visibleSearchResults.map(art => {
                    const isSelected = selectedArticleIds.has(art.id);
                    const isDiffMode = diffViewArticles.has(art.id);
                    const hasHistory = art.historicalVersions && art.historicalVersions.length > 0;
                    const hasJurisprudence = art.jurisprudenceRefs && art.jurisprudenceRefs.length > 0;

                    return (
                      <div
                        key={art.id}
                        className={`bg-slate-900 rounded-xl border transition-all p-5 shadow-lg space-y-4 ${
                          isSelected 
                            ? 'border-indigo-500 bg-indigo-950/20 shadow-indigo-500/10' 
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* HEADER DO CARTÃO COM BADGES DE ESFERA E VIGÊNCIA */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                          <div className="space-y-1">
                            {art.hierarchy && (
                              <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                                <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
                                <span>{art.hierarchy.title}</span>
                                {art.hierarchy.chapter && <span>&gt; {art.hierarchy.chapter}</span>}
                              </div>
                            )}

                            <div 
                              onClick={() => setViewingDetailArticle(art)}
                              className="flex flex-wrap items-center gap-2 cursor-pointer group"
                              title="Clique para ver todas as informações completas e copiar em partes"
                            >
                              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 font-bold text-xs rounded-md border border-indigo-500/30 group-hover:border-indigo-400">
                                {art.lawName}
                              </span>
                              {renderEsferaBadge(art)}
                              {renderStatusBadge(art.statusVigencia)}
                              <h3 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors flex items-center space-x-1">
                                <span>{art.article}</span>
                                <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                              </h3>
                              <span className="text-xs text-slate-400 font-medium">({art.title})</span>
                            </div>
                          </div>

                          {/* CONTROLES DO CARTÃO */}
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => setViewingDetailArticle(art)}
                              className="px-2.5 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/40 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5"
                              title="Ver todas as informações detalhadas e copiar em partes"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Ver Detalhes</span>
                            </button>

                            <button
                              onClick={() => setAuditingArticle(art)}
                              className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5"
                              title="Abrir Painel Lado a Lado para Auditoria e Verificação"
                            >
                              <Columns className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Auditar</span>
                            </button>

                            {hasHistory && (
                              <button
                                onClick={() => toggleDiffView(art.id)}
                                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center space-x-1.5 ${
                                  isDiffMode
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                                }`}
                              >
                                <GitCompare className="w-3.5 h-3.5" />
                                <span>{isDiffMode ? 'Ver Limpo' : 'Ver Diff'}</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleCopyCitation(art, 'PETICAO_ABNT')}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 border border-slate-700"
                              title="Copiar citação oficial no formato Petição PJe / ABNT"
                            >
                              {copiedId === art.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span>Copiar Citação</span>
                            </button>

                            <button
                              onClick={() => toggleArticleSelection(art.id)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                isSelected
                                  ? 'bg-indigo-600 border-indigo-500 text-white'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                              }`}
                              title={isSelected ? 'Remover dos favoritos' : 'Adicionar ao compêndio'}
                            >
                              <Bookmark className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* CORPO DO ARTIGO COM SELEÇÃO DE TEXTO HABILITADA */}
                        {isDiffMode && hasHistory ? (
                          <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 space-y-3">
                            <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                              <History className="w-4 h-4" />
                              <span>Matriz de Temporalidade e Alteração Legislativa</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-lg space-y-1">
                                <span className="font-semibold text-red-400">
                                  ❌ Redação Anterior ({art.historicalVersions![0].effectiveDate}):
                                </span>
                                <p className="text-red-200/80 leading-relaxed font-mono select-text cursor-text selection:bg-red-600 selection:text-white">
                                  {art.historicalVersions![0].content}
                                </p>
                                <span className="block text-[10px] text-red-400/70 italic mt-1">
                                  Nota: {art.historicalVersions![0].changeNote}
                                </span>
                              </div>

                              <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg space-y-1">
                                <span className="font-semibold text-emerald-400">
                                  ✅ Redação Vigente Atual:
                                </span>
                                <p className="text-emerald-200/90 leading-relaxed font-mono select-text cursor-text selection:bg-emerald-600 selection:text-white">
                                  {art.content}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div 
                            onClick={() => setViewingDetailArticle(art)}
                            className="text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 font-mono select-text cursor-text selection:bg-indigo-600 selection:text-white hover:border-slate-700 transition-colors"
                            title="Selecione qualquer trecho com o mouse para copiar em partes, ou clique para expandir detalhes"
                          >
                            "{art.content}"
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {searchResults.length > searchDisplayCount && (
                    <div className="pt-6 pb-2 text-center space-y-2">
                      <button
                        onClick={() => setSearchDisplayCount(prev => prev + 30)}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xl transition-all flex items-center justify-center space-x-2 mx-auto border border-indigo-400 hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Carregar Mais Dispositivos Legais (+30 artigos)</span>
                      </button>
                      <p className="text-xs text-slate-400 font-medium">
                        Exibindo <span className="text-indigo-300 font-bold">{Math.min(searchDisplayCount, searchResults.length)}</span> de <span className="text-slate-200 font-bold">{searchResults.length}</span> artigos localizados
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* OUTRAS ABAS (ÁRVORE, JURISPRUDÊNCIA, ANÁLISE DE CASO, CITAÇÕES, CUSTOM) */}
        {activeTab === 'tree' && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                <FolderTree className="w-4 h-4 text-indigo-400" />
                <span>Navegador Estruturado por Estatuto Legal</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {['CF/88', 'CPC', 'CLT', 'LGPD', 'Lei 14.133/2021', 'CDC', 'Código Civil', 'Lei 8.666/1993'].map(law => (
                  <button
                    key={law}
                    onClick={() => setSelectedTreeLaw(law)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedTreeLaw === law
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {law}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              let treeSource: LegalArticle[] = [];
              if (selectedTreeLaw === 'CPC') treeSource = LegalKnowledgeBaseService.getCPCArticles();
              else if (selectedTreeLaw === 'CLT') treeSource = LegalKnowledgeBaseService.getCLTArticles();
              else if (selectedTreeLaw === 'Código Civil') treeSource = LegalKnowledgeBaseService.getCivilArticles();
              else if (selectedTreeLaw === 'CF/88') treeSource = LegalKnowledgeBaseService.getConstitutionArticles();
              else treeSource = allArticles.filter(a => a.lawName.includes(selectedTreeLaw));

              const visibleTreeArticles = treeSource.slice(0, treeDisplayCount);

              return (
                <div className="space-y-3">
                  {visibleTreeArticles.map(art => (
                    <div key={art.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-indigo-300 text-sm">{art.article}</span>
                          {renderEsferaBadge(art)}
                          {renderStatusBadge(art.statusVigencia)}
                          <span className="text-xs text-slate-400">({art.title})</span>
                        </div>
                        <button
                          onClick={() => handleCopyCitation(art, 'PETICAO_ABNT')}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-indigo-600 text-xs text-slate-200 hover:text-white rounded-lg transition-colors flex items-center space-x-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copiar Citação</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
                        "{art.content}"
                      </p>
                    </div>
                  ))}

                  {treeSource.length > treeDisplayCount && (
                    <div className="pt-4 text-center space-y-2">
                      <button
                        onClick={() => setTreeDisplayCount(prev => prev + 30)}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xl transition-all flex items-center justify-center space-x-2 mx-auto border border-indigo-400 hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Carregar Mais Dispositivos Legais (+30 artigos)</span>
                      </button>
                      <p className="text-xs text-slate-400 font-medium">
                        Exibindo <span className="text-indigo-300 font-bold">{Math.min(treeDisplayCount, treeSource.length)}</span> de <span className="text-slate-200 font-bold">{treeSource.length}</span> artigos do {selectedTreeLaw}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'jurisprudence' && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  <span>Acervo Unificado de Jurisprudência (STF, STJ e TST)</span>
                </h3>
                <span className="text-xs text-indigo-300 font-bold bg-indigo-950/70 px-3 py-1 rounded-lg border border-indigo-500/30">
                  📊 {activeJurisprudenceList.length} enunciados localizados
                </span>
              </div>

              {/* SELEÇÃO EXPLICITA DE TRIBUNAL (STF, STJ, TST E TODAS) */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold mr-1">Filtrar por Tribunal:</span>
                {[
                  { id: 'ALL', label: '🌐 Todas as Súmulas (2.759)' },
                  { id: 'STF', label: '🏛️ STF (797 Súmulas)' },
                  { id: 'STJ', label: '⚖️ STJ (676 Súmulas)' },
                  { id: 'TST', label: '💼 TST (1.286 Súmulas & OJs)' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setJurisprudenceTribunal(t.id as any);
                      setJurisprudenceDisplayCount(30);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      jurisprudenceTribunal === t.id
                        ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* BARRA DE PESQUISA DENTRO DA JURISPRUDÊNCIA */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={jurisprudenceQuery}
                  onChange={(e) => {
                    setJurisprudenceQuery(e.target.value);
                    setJurisprudenceDisplayCount(30);
                  }}
                  placeholder="Pesquise por número da súmula (ex: 'Súmula 331', 'Súmula Vinculante 11', 'OJ 191') ou termo..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                />
                {jurisprudenceQuery && (
                  <button
                    onClick={() => setJurisprudenceQuery('')}
                    className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {activeJurisprudenceList.slice(0, jurisprudenceDisplayCount).map(st => (
                <div key={st.id} className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-3 shadow-md hover:border-slate-700 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-md border border-amber-500/30">
                        {st.lawName}
                      </span>
                      {renderStatusBadge(st.statusVigencia)}
                      <h4 className="text-sm font-bold text-slate-100">{st.title}</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setViewingDetailArticle(st)}
                        className="px-2.5 py-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Detalhes</span>
                      </button>
                      <button
                        onClick={() => handleCopyCitation(st, 'PETICAO_ABNT')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 text-xs text-slate-200 hover:text-white font-medium rounded-lg transition-colors flex items-center space-x-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Citação</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-mono bg-slate-950 p-4 rounded-xl border border-slate-800 select-text cursor-text">
                    "{st.content}"
                  </p>
                </div>
              ))}
            </div>

            {activeJurisprudenceList.length > jurisprudenceDisplayCount && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setJurisprudenceDisplayCount(prev => prev + 50)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  Carregar Mais Enunciados (+50 de {activeJurisprudenceList.length - jurisprudenceDisplayCount} restantes)
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'caseAnalysis' && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
                <Sparkles className="w-5 h-5" />
                <h3>Diagnóstico Jurídico Contextual & Sugestão de Fundamentação</h3>
              </div>

              <textarea
                value={caseDocumentText}
                onChange={(e) => setCaseDocumentText(e.target.value)}
                rows={7}
                placeholder="Cole aqui o trecho do contrato, petição ou edital para obter o enquadramento legislativo instantâneo..."
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl p-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner font-mono"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleRunCaseAnalysis}
                  disabled={!caseDocumentText.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Executar Diagnóstico Jurídico Instantâneo</span>
                </button>
              </div>
            </div>

            {caseAnalysisResult && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-indigo-950/40 p-4 rounded-xl border border-indigo-500/40 space-y-2">
                  <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                    Domínio Detectado:
                  </span>
                  <h4 className="text-base font-bold text-white">
                    {caseAnalysisResult.categoryLabel}
                  </h4>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Dispositivos de Lei Recomendados para Citação
                  </h4>
                  {caseAnalysisResult.recommendedArticles.map(art => (
                    <div key={art.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-indigo-300 text-xs">
                            {art.lawName} - {art.article}
                          </span>
                          {renderEsferaBadge(art)}
                          {renderStatusBadge(art.statusVigencia)}
                        </div>
                        <button
                          onClick={() => handleCopyCitation(art, 'PETICAO_ABNT')}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-indigo-600 text-xs text-slate-200 hover:text-white rounded-lg transition-colors flex items-center space-x-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
                        "{art.content}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'citations' && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <Bookmark className="w-5 h-5 text-indigo-400" />
                  <span>Compêndio de Citações Selecionadas ({selectedArticlesList.length})</span>
                </h3>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedArticleIds(new Set())}
                  disabled={selectedArticlesList.length === 0}
                  className="px-3 py-2 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-slate-400 text-xs font-semibold rounded-xl border border-slate-800 transition-colors"
                >
                  Limpar Seleção
                </button>

                <button
                  onClick={handleExportCitationsDocx}
                  disabled={selectedArticlesList.length === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar Relatório Word (.docx)</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {selectedArticlesList.map(art => (
                <div key={art.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-indigo-300 text-xs">
                        {art.lawName} - {art.article} ({art.title})
                      </span>
                      {renderEsferaBadge(art)}
                      {renderStatusBadge(art.statusVigencia)}
                    </div>
                    <button
                      onClick={() => toggleArticleSelection(art.id)}
                      className="text-red-400 hover:text-red-300 text-xs font-medium flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  </div>
                  <div className="text-xs text-slate-200 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
                    {LegalKnowledgeBaseService.formatCitation(art, 'PETICAO_ABNT')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'custom' && (
          <div className="space-y-6">
            <form onSubmit={handleAddCustomArticle} className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm border-b border-slate-800 pb-3">
                <Building2 className="w-5 h-5" />
                <h3>Cadastrar Norma Local, Estadual ou Regimento Interno</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nome da Norma / Lei *</label>
                  <input
                    type="text"
                    required
                    value={customLawName}
                    onChange={e => setCustomLawName(e.target.value)}
                    placeholder="ex: Lei Municipal nº 4.500/2022"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Dispositivo / Artigo *</label>
                  <input
                    type="text"
                    required
                    value={customArticleNum}
                    onChange={e => setCustomArticleNum(e.target.value)}
                    placeholder="ex: Artigo 14, § 2º"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Título / Ementa</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    placeholder="ex: Licença de Funcionamento"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Conteúdo Integral *</label>
                <textarea
                  required
                  rows={3}
                  value={customContent}
                  onChange={e => setCustomContent(e.target.value)}
                  placeholder="Cole aqui o texto oficial..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 font-mono"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Indexar no Acervo Local</span>
                </button>
              </div>
            </form>

            <div className="space-y-4">
              {customArticlesList.map(art => (
                <div key={art.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-300 text-xs">
                      {art.lawName} - {art.article} ({art.title})
                    </span>
                    <button
                      onClick={() => handleDeleteCustomArticle(art.id)}
                      className="text-red-400 hover:text-red-300 text-xs font-medium flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-200 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
                    "{art.content}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DRAWER / MODAL DE CONFIGURAÇÃO DE PREFERÊNCIAS DO JURISTA & MUNICÍPIO */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-fade-in">
          <form onSubmit={handleSaveUserPreferences} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden space-y-5 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Preferências do Jurista & Município</h3>
                  <p className="text-xs text-slate-400">Configure o padrão inicial que será mantido a cada uso</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">
                    🏙️ Município Principal de Atuação:
                  </label>
                  <input
                    type="text"
                    value={prefMunicipality}
                    onChange={e => setPrefMunicipality(e.target.value)}
                    placeholder="ex: São Paulo, Campinas, Curitiba"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    🗺️ UF Estado:
                  </label>
                  <select
                    value={prefStateUF}
                    onChange={e => setPrefStateUF(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-bold"
                  >
                    {UF_LIST.map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  🌐 Esfera Legislativa Padrão ao Abrir:
                </label>
                <select
                  value={prefDefaultEsfera}
                  onChange={e => setPrefDefaultEsfera(e.target.value as EsferaTypeFilter)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">🌐 Todas as Esferas</option>
                  <option value="CONSTITUCIONAL">📜 Constitucional</option>
                  <option value="FEDERAL">🏛️ Federal</option>
                  <option value="ESTADUAL">🗺️ Estadual</option>
                  <option value="MUNICIPAL">🏙️ Municipal</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  🟢 Status de Vigência Padrão:
                </label>
                <select
                  value={prefDefaultStatus}
                  onChange={e => setPrefDefaultStatus(e.target.value as VigenciaStatusFilter)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">⚪ Todas as Leis Já Criadas</option>
                  <option value="COMUM">🟢 Leis em Vigor / Comuns</option>
                  <option value="HISTORICA_OBSOLETA">🟡 Históricas & Obsoletas</option>
                  <option value="EM_DESUSO">🟠 Leis em Desuso</option>
                  <option value="REVOGADA_DESATIVADA">🔴 Revogadas & Desativadas</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 text-xs font-semibold rounded-xl border border-slate-800"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Como Minhas Preferências Padrão</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DE AUDITORIA LADO A LADO */}
      {auditingArticle && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl">
                  <Columns className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Painel de Verificação Lado a Lado</span>
                    {renderEsferaBadge(auditingArticle)}
                    {renderStatusBadge(auditingArticle.statusVigencia)}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {auditingArticle.lawName} — {auditingArticle.article}: {auditingArticle.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAuditingArticle(null)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6 overflow-y-auto bg-slate-950">
              <div className="bg-slate-900 p-5 rounded-xl border border-emerald-500/40 space-y-3 flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>FONTE OFICIAL FACTUAL (PLANALTO)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                    RISCO ZERO
                  </span>
                </div>

                <div className="flex-1 font-mono text-xs text-emerald-100/90 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-y-auto">
                  "{auditingArticle.content}"
                </div>

                <button
                  onClick={() => handleCopyCitation(auditingArticle, 'PETICAO_ABNT')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copiar Apenas Texto Factual da Lei</span>
                </button>
              </div>

              <div className="bg-slate-900 p-5 rounded-xl border border-amber-500/40 space-y-3 flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-amber-400">
                    <Bot className="w-4 h-4" />
                    <span>RASCUNHO COM ASSISTÊNCIA DE IA</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                    REQUER REVISÃO
                  </span>
                </div>

                <div className="flex-1 text-xs text-amber-100/90 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-y-auto space-y-2">
                  <p className="font-semibold text-amber-300">
                    📌 Rascunho de Tese Jurídica para Petição:
                  </p>
                  <p className="italic font-mono">
                    "Conforme estabelecido no {auditingArticle.article} da {auditingArticle.lawName}, a norma busca resguardar os direitos previstos em sua ementa ({auditingArticle.title}), devendo a parte adversa observar as exigências formais ali descritas."
                  </p>
                </div>

                <button
                  onClick={() => {
                    const textWithDisclaimer = `RASCUNHO SUGERIDO:\nConforme o ${auditingArticle.article} da ${auditingArticle.lawName} (${auditingArticle.title})...\n\n⚠️ [Aviso de Responsabilidade]: Rascunho gerado por assistência algorítmica e auditado pelo profissional responsável em ${new Date().toLocaleDateString('pt-BR')}.`;
                    navigator.clipboard.writeText(textWithDisclaimer);
                    showToast('Rascunho copiado com termo de revisão humana!');
                  }}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copiar Rascunho com Disclaimer de Revisão</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXIBIÇÃO INTEGRAL E CÓPIA EM PARTES DO DISPOSITIVO LEGAL */}
      {viewingDetailArticle && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* HEADER DO MODAL */}
            <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-950 flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 font-bold text-xs rounded-md border border-indigo-500/30">
                    {viewingDetailArticle.lawName}
                  </span>
                  {renderEsferaBadge(viewingDetailArticle)}
                  {renderStatusBadge(viewingDetailArticle.statusVigencia)}
                  {viewingDetailArticle.officialRef && (
                    <span className="text-xs text-slate-400 font-medium">
                      Ref: {viewingDetailArticle.officialRef}
                    </span>
                  )}
                </div>
                <h2 className="text-lg md:text-xl font-bold text-white flex items-center space-x-2">
                  <span>{viewingDetailArticle.article}</span>
                  <span className="text-slate-400 font-normal text-sm md:text-base">— {viewingDetailArticle.title}</span>
                </h2>
                {viewingDetailArticle.hierarchy && (
                  <div className="flex items-center space-x-2 text-xs text-indigo-400">
                    <FolderTree className="w-3.5 h-3.5" />
                    <span>{viewingDetailArticle.hierarchy.title}</span>
                    {viewingDetailArticle.hierarchy.chapter && <span>&gt; {viewingDetailArticle.hierarchy.chapter}</span>}
                    {viewingDetailArticle.hierarchy.section && <span>&gt; {viewingDetailArticle.hierarchy.section}</span>}
                  </div>
                )}
              </div>

              <button
                onClick={() => setViewingDetailArticle(null)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CORPO DE CONTEÚDO INTEGRAL COM SELEÇÃO DE TEXTO LIVRE */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950 space-y-6 scrollbar-thin">
              {/* DICA DE SELEÇÃO E CÓPIA EM PARTES */}
              <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex items-center justify-between text-xs text-indigo-300">
                <span className="flex items-center space-x-2">
                  <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span>💡 <b>Copiar em Partes:</b> Selecione qualquer trecho, inciso ou palavra com o cursor do mouse e pressione <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-[10px]">Ctrl+C</kbd>.</span>
                </span>
              </div>

              {/* TEXTO INTEGRAL FACTUAL DO DISPOSITIVO */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Redação Oficial Consolidada (Texto Factual Planalto / LexML):</span>
                </label>
                <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 font-mono text-sm text-slate-100 leading-relaxed select-text cursor-text selection:bg-indigo-600 selection:text-white shadow-inner">
                  {viewingDetailArticle.content}
                </div>
              </div>

              {/* METADADOS E HISTÓRICO DE ALTERAÇÃO LEGISLATIVA */}
              {viewingDetailArticle.historicalVersions && viewingDetailArticle.historicalVersions.length > 0 && (
                <div className="space-y-3 p-4 bg-slate-900/80 rounded-xl border border-amber-500/30">
                  <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                    <History className="w-4 h-4" />
                    <span>Histórico de Redações Anteriores / Matriz de Migração:</span>
                  </div>
                  {viewingDetailArticle.historicalVersions.map((hist, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
                      <span className="font-semibold text-amber-300">Redação de {hist.effectiveDate}:</span>
                      <p className="text-slate-300 font-mono select-text cursor-text selection:bg-amber-600 selection:text-white">{hist.content}</p>
                      <span className="text-[10px] text-slate-400 italic">Nota: {hist.changeNote}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* SÚMULAS E JURISPRUDÊNCIA ASSOCIADA */}
              {viewingDetailArticle.jurisprudenceRefs && viewingDetailArticle.jurisprudenceRefs.length > 0 && (
                <div className="space-y-3 p-4 bg-slate-900/80 rounded-xl border border-purple-500/30">
                  <div className="flex items-center space-x-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
                    <Layers className="w-4 h-4" />
                    <span>Jurisprudência e Súmulas Correlatas:</span>
                  </div>
                  {viewingDetailArticle.jurisprudenceRefs.map((juri, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
                      <span className="font-semibold text-purple-300">{juri.type} — {juri.code}: {juri.title}</span>
                      <p className="text-slate-300 font-mono select-text cursor-text">{juri.summary}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* FONTE E LINK OFICIAL DO PLANALTO */}
              {viewingDetailArticle.sourceUrl && (
                <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-400">
                  <span className="flex items-center space-x-1.5">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <span>Fonte Oficial de Validação: Planalto / LexML Governamental</span>
                  </span>
                  <a
                    href={viewingDetailArticle.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 font-semibold"
                  >
                    <span>Abrir no Planalto</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* FOOTER DE AÇÕES RÁPIDAS DE CÓPIA COMPLETA */}
            <div className="p-4 md:p-5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleCopyCitation(viewingDetailArticle, 'PETICAO_ABNT')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center space-x-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copiar Citação Completa (Petição / ABNT)</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(viewingDetailArticle.content);
                    showToast('Texto bruto do artigo copiado!');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>Copiar Apenas Conteúdo do Artigo</span>
                </button>

                <button
                  onClick={() => {
                    const withHeader = `${viewingDetailArticle.lawName} - ${viewingDetailArticle.article}: ${viewingDetailArticle.title}\n\n"${viewingDetailArticle.content}"\n\nFonte: Portal do Planalto / LexML`;
                    navigator.clipboard.writeText(withHeader);
                    showToast('Dispositivo com ementa e fonte copiado!');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center space-x-2"
                >
                  <Bookmark className="w-4 h-4 text-emerald-400" />
                  <span>Copiar com Ementa & Fonte</span>
                </button>
              </div>

              <button
                onClick={() => setViewingDetailArticle(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold rounded-xl border border-slate-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
