/**
 * CATÁLOGO UNIFICADO DE PRESETS DE TRIBUNAIS E SISTEMAS JUDICIAIS
 * 
 * Centraliza e sincroniza os parâmetros técnicos, limites em Megabytes,
 * escopos territoriais/jurisdicionais, versões normativas e referências regulatórias
 * utilizados pelo Compressor de PDFs e pelo Assistente de Preparação de Protocolo.
 * 
 * ⚠️ AVISO REGULATÓRIO:
 * Os limites de tamanho e resolução aqui consolidados representam os parâmetros
 * vigentes nas normas e resoluções dos respectivos órgãos. Eles NÃO constituem
 * regras universais imutáveis, podendo variar por edital da comarca, portaria local
 * ou capacidade momentânea do portal do tribunal.
 */

export interface UnifiedCourtPreset {
  /** Identificador único do preset */
  id: string;
  /** Nome descritivo completo */
  name: string;
  /** Rótulo resumido para badges e botões */
  shortLabel: string;
  /** Nome do sistema informatizado (PJe, e-SAJ, e-Proc, Projudi, etc.) */
  systemName: string;
  /** Escopo de aplicação territorial/jurisdicional */
  courtScope: string;
  /** Limite máximo em Megabytes */
  maxSizeMB: number;
  /** Limite máximo em Bytes exatos */
  maxVolumeSizeBytes: number;
  /** Versão ou data da norma reguladora */
  versionOrDate: string;
  /** Dispositivo normativo de referência (lei, resolução, provimento) */
  normativeReference: string;
  /** Link para o portal ou norma oficial, quando disponível */
  referenceUrl?: string;
  /** Descrição técnica da finalidade do preset */
  description: string;
  /** Orientações práticas e advertências ao operador */
  notes: string;
  /** Portal alvo de protocolo */
  targetPortal: string;
  /** Resolução gráfica recomendada em DPI */
  recommendedResolutionDpi?: number;
  /** Declaração explícita de regra contextual não-universal */
  isUniversalRule: false;
}

export const UNIFIED_COURT_PRESETS: UnifiedCourtPreset[] = [
  {
    id: 'pje_strict_3mb',
    name: 'PJe Nacional - Cível / Família (Cota Rígida 3 MB)',
    shortLabel: 'PJe 3 MB',
    systemName: 'PJe Nacional',
    courtScope: 'Varas Cíveis, Família e Fazenda Pública em Tribunais com PJe em cota de 3 MB',
    maxSizeMB: 3,
    maxVolumeSizeBytes: 3 * 1024 * 1024,
    versionOrDate: 'Resolução CNJ nº 185/2013',
    normativeReference: 'Resolução CNJ nº 185/2013, art. 13 (Parâmetro originário de transmissão por arquivo)',
    description: 'Limite estrito de 3 MB por arquivo individual adotado em comarcas com infraestrutura legada.',
    notes: 'Atenção: Muitas secretarias estaduais mantêm o limite rígido de 3 MB. Se a comarca admitir 10 MB, utilize o preset PJe 10 MB.',
    targetPortal: 'PJe Nacional (TJ / TRF)',
    recommendedResolutionDpi: 150,
    isUniversalRule: false
  },
  {
    id: 'pje_10mb',
    name: 'PJe - Justiça do Trabalho / TRT e CSJT (10 MB)',
    shortLabel: 'PJe TRT (10 MB)',
    systemName: 'PJe-JT',
    courtScope: 'Tribunais Regionais do Trabalho (TRT 1ª a 24ª Região) e Conselho Superior da Justiça do Trabalho',
    maxSizeMB: 10,
    maxVolumeSizeBytes: 10 * 1024 * 1024,
    versionOrDate: 'Resolução CSJT nº 185/2017',
    normativeReference: 'Resolução CSJT nº 185/2017, art. 11, § 1º; Instrução Normativa TST nº 30/2007',
    description: 'Limite padrão de 10 MB por peça ou anexo para tramitação processual na Justiça do Trabalho.',
    notes: 'Laudos periciais e documentos contábeis volumosos devem ser fracionados em volumes de até 10 MB numerados sequencialmente.',
    targetPortal: 'TRT / CSJT',
    recommendedResolutionDpi: 200,
    isUniversalRule: false
  },
  {
    id: 'tjsp_esaj_10mb',
    name: 'TJSP - Portal e-SAJ Peça / Anexo Individual (10 MB)',
    shortLabel: 'TJSP Individual (10 MB)',
    systemName: 'e-SAJ',
    courtScope: 'Tribunal de Justiça de São Paulo (Peticionamento Eletrônico 1º e 2º Graus)',
    maxSizeMB: 10,
    maxVolumeSizeBytes: 10 * 1024 * 1024,
    versionOrDate: 'Provimento CSM nº 2.651/2022',
    normativeReference: 'Provimento CSM nº 2.651/2022; Comunicado Conjunto TJSP nº 373/2023',
    description: 'Limite padrão de 10 MB por arquivo individual no envio de petições e anexos no e-SAJ TJSP.',
    notes: 'Peças com mais de 10 MB devem ser fracionadas em partes (Parte 1, Parte 2) sequenciais.',
    targetPortal: 'e-SAJ TJSP',
    recommendedResolutionDpi: 200,
    isUniversalRule: false
  },
  {
    id: 'tjsp_esaj_30mb',
    name: 'TJSP - Portal e-SAJ Cota Global de Anexos (30 MB)',
    shortLabel: 'TJSP Global (30 MB)',
    systemName: 'e-SAJ',
    courtScope: 'Tribunal de Justiça de São Paulo (Soma de Anexos por Protocolo)',
    maxSizeMB: 30,
    maxVolumeSizeBytes: 30 * 1024 * 1024,
    versionOrDate: 'Provimento CG nº 21/2022',
    normativeReference: 'Provimento CG nº 21/2022 e Portaria TJSP nº 9.600/2018',
    description: 'Cota limite global acumulada de até 30 MB para o conjunto de documentos de uma mesma juntada no TJSP.',
    notes: 'Caso o somatório de todos os volumes exceda 30 MB, recomenda-se distribuir em petições intermediárias sucessivas.',
    targetPortal: 'e-SAJ TJSP',
    recommendedResolutionDpi: 200,
    isUniversalRule: false
  },
  {
    id: 'trf_eproc_5mb',
    name: 'Justiça Federal / TRF - e-Proc Cota Rígida / JEF (5 MB)',
    shortLabel: 'e-Proc JEF (5 MB)',
    systemName: 'e-Proc',
    courtScope: 'Juizados Especiais Federais e Seções Judiciárias com limitação de banda',
    maxSizeMB: 5,
    maxVolumeSizeBytes: 5 * 1024 * 1024,
    versionOrDate: 'Resolução TRF4 nº 17/2010; Resolução TRF3 nº 23/2019',
    normativeReference: 'Resolução Presidência TRF4 nº 17/2010; Provimento CJF nº 03/2018',
    description: 'Limite estrito de 5 MB por volume para Juizados Especiais Federais e turmas recursais.',
    notes: 'Recomendado para recursos inominados e cumprimentos de sentença previdenciários nos JEFs.',
    targetPortal: 'TRF / e-Proc',
    recommendedResolutionDpi: 150,
    isUniversalRule: false
  },
  {
    id: 'trf_eproc_20mb',
    name: 'Justiça Federal / TRF - e-Proc Varas Federais (20 MB)',
    shortLabel: 'e-Proc Federal (20 MB)',
    systemName: 'e-Proc',
    courtScope: 'Tribunais Regionais Federais (TRF1 a TRF6 - Varas Federais e Tribunais Regionais)',
    maxSizeMB: 20,
    maxVolumeSizeBytes: 20 * 1024 * 1024,
    versionOrDate: 'Resolução Conjunta TRF4/TRF2 nº 02/2021',
    normativeReference: 'Resolução Conjunta TRF4/TRF2 nº 02/2021 e Resolução TRF3 nº 55/2022',
    description: 'Limite ampliado de 20 MB por documento/volume para ações ordinárias e execuções fiscais federais.',
    notes: 'Válido para a plataforma e-Proc nos tribunais federais já migrados.',
    targetPortal: 'TRF / e-Proc',
    recommendedResolutionDpi: 200,
    isUniversalRule: false
  },
  {
    id: 'projudi_5mb',
    name: 'Projudi Estadual (TJPR, TJBA, TJGO) (5 MB)',
    shortLabel: 'Projudi (5 MB)',
    systemName: 'Projudi',
    courtScope: 'Tribunais Estaduais que operam o Projudi (Paraná, Bahia, Goiás, etc.)',
    maxSizeMB: 5,
    maxVolumeSizeBytes: 5 * 1024 * 1024,
    versionOrDate: 'Instrução Normativa TJPR nº 01/2018',
    normativeReference: 'Instrução Normativa TJPR nº 01/2018 e Resolução TJBA nº 14/2016',
    description: 'Limite de 5 MB por documento exigido pela arquitetura Projudi.',
    notes: 'O sistema Projudi rejeita arquivos com mais de 5.242.880 bytes com erro genérico de upload.',
    targetPortal: 'Projudi Estadual',
    recommendedResolutionDpi: 150,
    isUniversalRule: false
  },
  {
    id: 'stj_20mb',
    name: 'STJ - Superior Tribunal de Justiça (20 MB)',
    shortLabel: 'STJ (20 MB)',
    systemName: 'STJ Eletrônico',
    courtScope: 'Superior Tribunal de Justiça (Peticionamento Recursal e Peças em Geral)',
    maxSizeMB: 20,
    maxVolumeSizeBytes: 20 * 1024 * 1024,
    versionOrDate: 'Resolução STJ/GP nº 10/2015',
    normativeReference: 'Resolução STJ/GP nº 10 de 06/10/2015, art. 7º',
    description: 'Limite de 20 MB por arquivo para peças e anexos direcionados ao STJ.',
    notes: 'Para autos originários volumosos, recomenda-se dividir em volumes de até 20 MB numerados sequencialmente.',
    targetPortal: 'STJ Eletrônico',
    recommendedResolutionDpi: 200,
    isUniversalRule: false
  },
  {
    id: 'stf_10mb',
    name: 'STF - Supremo Tribunal Federal (10 MB)',
    shortLabel: 'STF (10 MB)',
    systemName: 'STF Digital',
    courtScope: 'Supremo Tribunal Federal (Peticionamento Eletrônico e Recursos Extraordinários)',
    maxSizeMB: 10,
    maxVolumeSizeBytes: 10 * 1024 * 1024,
    versionOrDate: 'Resolução STF nº 693/2020',
    normativeReference: 'Resolução STF nº 693/2020 e Portaria GDG nº 107/2021',
    description: 'Limite padrão de 10 MB por arquivo no portal de peticionamento eletrônico do STF.',
    notes: 'O sistema realiza checagem rígida de OCR pesquisável e rejeita arquivos escaneados ilegíveis.',
    targetPortal: 'STF Digital',
    recommendedResolutionDpi: 200,
    isUniversalRule: false
  },
  {
    id: 'stj_stf_50mb',
    name: 'Tribunais Superiores - Cota Especial Expandida (STJ / STF) (50 MB)',
    shortLabel: 'Superiores (50 MB)',
    systemName: 'STJ / STF Especial',
    courtScope: 'Instâncias Superiores em processos com autorização de cota estendida',
    maxSizeMB: 50,
    maxVolumeSizeBytes: 50 * 1024 * 1024,
    versionOrDate: 'Atos Normativos Conjuntos STF/STJ',
    normativeReference: 'Resolução STF nº 693/2020 c/c Portarias de TI do STJ',
    description: 'Capacidade ampliada de até 50 MB por volume para autos complexos e inquéritos especiais.',
    notes: 'Utilize esta opção apenas se o sistema do tribunal autorizar expressamente arquivos de até 50 MB.',
    targetPortal: 'Tribunais Superiores',
    recommendedResolutionDpi: 200,
    isUniversalRule: false
  },
  {
    id: 'prefeitura_15mb',
    name: 'Prefeituras e Processos Administrativos / SEI (15 MB)',
    shortLabel: 'Administrativo (15 MB)',
    systemName: 'Sistemas Municipais / SEI',
    courtScope: 'Prefeituras Municipais, Secretarias de Finanças, Procuradorias e Autarquias',
    maxSizeMB: 15,
    maxVolumeSizeBytes: 15 * 1024 * 1024,
    versionOrDate: 'Padrão SEI / Decretos Municipais',
    normativeReference: 'Manual do Usuário Externo SEI e Portarias Locais de Processo Eletrônico',
    description: 'Limite de 15 MB recomendado para uploads em sistemas SEI e portais de prefeituras.',
    notes: 'Compatível com impugnações administrativas, licitações e defesas prévias municipais.',
    targetPortal: 'Sistemas Municipais',
    recommendedResolutionDpi: 200,
    isUniversalRule: false
  },
  {
    id: 'custom',
    name: 'Limite Personalizado / Conforme Despacho',
    shortLabel: 'Customizado',
    systemName: 'Personalizado',
    courtScope: 'Definido livremente pelo operador conforme intimação judicial ou edital local',
    maxSizeMB: 15,
    maxVolumeSizeBytes: 15 * 1024 * 1024,
    versionOrDate: 'Determinação Judicial / Edital Específico',
    normativeReference: 'Despacho do Juízo da Causa / Edital do Processo',
    description: 'Permite ao operador ajustar o limite exato em Megabytes conforme a regra específica do processo.',
    notes: 'Consulte a secretaria da vara ou cartório se tiver dúvidas sobre a cota de envio do processo.',
    targetPortal: 'Arquivamento Interno / Outros',
    recommendedResolutionDpi: 200,
    isUniversalRule: false
  }
];

/** Mapa de equivalência de IDs legados para compatibilidade reversa */
const LEGACY_ID_MAP: Record<string, string> = {
  'pje': 'pje_strict_3mb',
  'pje-jt': 'pje_10mb',
  'tjsp': 'tjsp_esaj_10mb',
  'trf': 'trf_eproc_5mb',
  'stf': 'stf_10mb',
  'stj': 'stj_20mb',
  'projudi': 'projudi_5mb',
  'prefeitura': 'prefeitura_15mb',
  'pje_strict_5mb': 'trf_eproc_5mb'
};

/**
 * Busca preset unificado por ID canônico ou ID legado
 */
export function getUnifiedCourtPreset(id: string): UnifiedCourtPreset | undefined {
  const canonicalId = LEGACY_ID_MAP[id] || id;
  return UNIFIED_COURT_PRESETS.find(p => p.id === canonicalId);
}

/**
 * Retorna o preset padrão recomendado (PJe 10 MB)
 */
export function getDefaultCourtPreset(): UnifiedCourtPreset {
  return UNIFIED_COURT_PRESETS.find(p => p.id === 'pje_10mb') || UNIFIED_COURT_PRESETS[0];
}
