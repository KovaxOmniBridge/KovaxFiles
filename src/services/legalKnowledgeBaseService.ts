import { CustomLegalKnowledgeService } from './customLegalKnowledgeService';
import { MASSIVE_FEDERAL_STATUTES } from '../data/federalStatutesData';
import { JURISPRUDENCE_STATUTES } from '../data/jurisprudenceData';
import { STF_COMPLETE_TRADITIONAL_SUMULAS } from '../data/stfCompleteSumulasData';
import { STJ_COMPLETE_SUMULAS } from '../data/stjCompleteSumulasData';
import { TST_COMPLETE_SUMULAS_AND_OJS } from '../data/tstCompleteSumulasAndOjsData';
import { COMPLETE_CONSTITUTION_STATUTES } from '../data/constitutionData';
import { HISTORICAL_AND_REVOKED_STATUTES } from '../data/historicalAndRevokedStatutesData';
import { HISTORICAL_AND_REVOKED_MUNICIPAL_STATUTES } from '../data/historicalAndRevokedMunicipalData';
import { STATE_AND_MUNICIPAL_STATUTES } from '../data/stateAndMunicipalStatutesData';
import { CPC_COMPLETE_STATUTES } from '../data/cpcCompleteData';
import { CLT_COMPLETE_STATUTES } from '../data/cltCompleteData';
import { CC_COMPLETE_STATUTES } from '../data/ccCompleteData';
import { PENAL_COMPLETE_STATUTES } from '../data/penalCompleteData';
import { CTN_COMPLETE_STATUTES } from '../data/ctnCompleteData';
import { LICITACOES_COMPLETE_STATUTES } from '../data/licitacoesCompleteData';
import { LGPD_COMPLETE_STATUTES } from '../data/lgpdCompleteData';
import { CDC_COMPLETE_STATUTES } from '../data/cdcCompleteData';
import { LIA_COMPLETE_STATUTES } from '../data/liaCompleteData';
import { INQUILINATO_COMPLETE_STATUTES } from '../data/inquilinatoCompleteData';
import { PREVIDENCIARIO_COMPLETE_STATUTES } from '../data/previdenciarioCompleteData';
import { FALENCIAS_COMPLETE_STATUTES } from '../data/falenciasCompleteData';
import { ECA_COMPLETE_STATUTES } from '../data/ecaCompleteData';
import { CTB_COMPLETE_STATUTES } from '../data/ctbCompleteData';
import { OAB_COMPLETE_STATUTES } from '../data/oabCompleteData';
import { LEP_COMPLETE_STATUTES } from '../data/lepCompleteData';
import { LJE_COMPLETE_STATUTES } from '../data/ljeCompleteData';
import { MARIA_DA_PENHA_COMPLETE_STATUTES } from '../data/mariaDaPenhaCompleteData';
import { STATE_CONSTITUTIONS_STATUTES } from '../data/stateConstitutionsData';
import { CESP_COMPLETE_STATUTES } from '../data/cespCompleteData';
import { CERJ_COMPLETE_STATUTES } from '../data/cerjCompleteData';
import { CEMG_COMPLETE_STATUTES } from '../data/cemgCompleteData';
import { CERS_COMPLETE_STATUTES } from '../data/cersCompleteData';
import { CEPR_COMPLETE_STATUTES } from '../data/ceprCompleteData';
import { CESC_COMPLETE_STATUTES } from '../data/cescCompleteData';
import { CEBA_COMPLETE_STATUTES } from '../data/cebaCompleteData';
import { CEPE_COMPLETE_STATUTES } from '../data/cepeCompleteData';
import { CECE_COMPLETE_STATUTES } from '../data/ceceCompleteData';
import { CEGO_COMPLETE_STATUTES } from '../data/cegoCompleteData';
import { LODF_COMPLETE_STATUTES } from '../data/lodfCompleteData';
import { CEES_COMPLETE_STATUTES } from '../data/ceesCompleteData';
import { CEAM_COMPLETE_STATUTES } from '../data/ceamCompleteData';
import { CEPA_COMPLETE_STATUTES } from '../data/cepaCompleteData';
import { CEMT_COMPLETE_STATUTES } from '../data/cemtCompleteData';
import { CEMS_COMPLETE_STATUTES } from '../data/cemsCompleteData';
import { CEMA_COMPLETE_STATUTES } from '../data/cemaCompleteData';
import { CEPB_COMPLETE_STATUTES } from '../data/cepbCompleteData';
import { CERN_COMPLETE_STATUTES } from '../data/cernCompleteData';
import { CEAL_COMPLETE_STATUTES } from '../data/cealCompleteData';
import { CESE_COMPLETE_STATUTES } from '../data/ceseCompleteData';
import { CEPI_COMPLETE_STATUTES } from '../data/cepiCompleteData';
import { CERO_COMPLETE_STATUTES } from '../data/ceroCompleteData';
import { CEAC_COMPLETE_STATUTES } from '../data/ceacCompleteData';
import { CEAP_COMPLETE_STATUTES } from '../data/ceapCompleteData';
import { CERR_COMPLETE_STATUTES } from '../data/cerrCompleteData';
import { CETO_COMPLETE_STATUTES } from '../data/cetoCompleteData';
import { ESTATUTO_SP_COMPLETE_STATUTES } from '../data/estatutoSpCompleteData';
import { ESTATUTO_RJ_COMPLETE_STATUTES } from '../data/estatutoRjCompleteData';
import { ESTATUTO_MG_COMPLETE_STATUTES } from '../data/estatutoMgCompleteData';
import { ESTATUTO_RS_COMPLETE_STATUTES } from '../data/estatutoRsCompleteData';
import { ESTATUTO_PR_COMPLETE_STATUTES } from '../data/estatutoPrCompleteData';
import { ESTATUTO_SC_COMPLETE_STATUTES } from '../data/estatutoScCompleteData';
import { ESTATUTO_BA_COMPLETE_STATUTES } from '../data/estatutoBaCompleteData';
import { ESTATUTO_PE_COMPLETE_STATUTES } from '../data/estatutoPeCompleteData';
import { ESTATUTO_CE_COMPLETE_STATUTES } from '../data/estatutoCeCompleteData';
import { ESTATUTO_GO_COMPLETE_STATUTES } from '../data/estatutoGoCompleteData';
import { ESTATUTO_DF_COMPLETE_STATUTES } from '../data/estatutoDfCompleteData';
import { ESTATUTO_ES_COMPLETE_STATUTES } from '../data/estatutoEsCompleteData';
import { ESTATUTO_AM_COMPLETE_STATUTES } from '../data/estatutoAmCompleteData';
import { ESTATUTO_PA_COMPLETE_STATUTES } from '../data/estatutoPaCompleteData';
import { ESTATUTO_MT_COMPLETE_STATUTES } from '../data/estatutoMtCompleteData';
import { ESTATUTO_MS_COMPLETE_STATUTES } from '../data/estatutoMsCompleteData';
import { ESTATUTO_MA_COMPLETE_STATUTES } from '../data/estatutoMaCompleteData';
import { ESTATUTO_PB_COMPLETE_STATUTES } from '../data/estatutoPbCompleteData';
import { ESTATUTO_RN_COMPLETE_STATUTES } from '../data/estatutoRnCompleteData';
import { ESTATUTO_AL_COMPLETE_STATUTES } from '../data/estatutoAlCompleteData';
import { ESTATUTO_SE_COMPLETE_STATUTES } from '../data/estatutoSeCompleteData';
import { ESTATUTO_PI_COMPLETE_STATUTES } from '../data/estatutoPiCompleteData';
import { ESTATUTO_RO_COMPLETE_STATUTES } from '../data/estatutoRoCompleteData';
import { ESTATUTO_AC_COMPLETE_STATUTES } from '../data/estatutoAcCompleteData';
import { ESTATUTO_AP_COMPLETE_STATUTES } from '../data/estatutoApCompleteData';
import { ESTATUTO_RR_COMPLETE_STATUTES } from '../data/estatutoRrCompleteData';
import { ESTATUTO_TO_COMPLETE_STATUTES } from '../data/estatutoToCompleteData';
import { RITJSP_COMPLETE_STATUTES } from '../data/ritjspCompleteData';
import { RITJ_RJ_COMPLETE_STATUTES } from '../data/ritjRjCompleteData';
import { RITJ_MG_COMPLETE_STATUTES } from '../data/ritjMgCompleteData';
import { RITJ_RS_COMPLETE_STATUTES } from '../data/ritjRsCompleteData';
import { RITJ_PR_COMPLETE_STATUTES } from '../data/ritjPrCompleteData';
import { RITJ_SC_COMPLETE_STATUTES } from '../data/ritjScCompleteData';
import { RITJ_BA_COMPLETE_STATUTES } from '../data/ritjBaCompleteData';
import { RITJ_PE_COMPLETE_STATUTES } from '../data/ritjPeCompleteData';
import { RITJ_CE_COMPLETE_STATUTES } from '../data/ritjCeCompleteData';
import { RITJ_GO_COMPLETE_STATUTES } from '../data/ritjGoCompleteData';
import { RITJ_DF_COMPLETE_STATUTES } from '../data/ritjDfCompleteData';
import { RITJ_ES_COMPLETE_STATUTES } from '../data/ritjEsCompleteData';
import { RITJ_AM_COMPLETE_STATUTES } from '../data/ritjAmCompleteData';
import { RITJ_PA_COMPLETE_STATUTES } from '../data/ritjPaCompleteData';
import { RITJ_MT_COMPLETE_STATUTES } from '../data/ritjMtCompleteData';
import { RITJ_MS_COMPLETE_STATUTES } from '../data/ritjMsCompleteData';
import { RITJ_MA_COMPLETE_STATUTES } from '../data/ritjMaCompleteData';
import { RITJ_PB_COMPLETE_STATUTES } from '../data/ritjPbCompleteData';
import { RITJ_RN_COMPLETE_STATUTES } from '../data/ritjRnCompleteData';
import { RITJ_AL_COMPLETE_STATUTES } from '../data/ritjAlCompleteData';
import { RITJ_SE_COMPLETE_STATUTES } from '../data/ritjSeCompleteData';
import { RITJ_PI_COMPLETE_STATUTES } from '../data/ritjPiCompleteData';
import { RITJ_RO_COMPLETE_STATUTES } from '../data/ritjRoCompleteData';
import { RITJ_AC_COMPLETE_STATUTES } from '../data/ritjAcCompleteData';
import { RITJ_AP_COMPLETE_STATUTES } from '../data/ritjApCompleteData';
import { RITJ_RR_COMPLETE_STATUTES } from '../data/ritjRrCompleteData';
import { RITJ_TO_COMPLETE_STATUTES } from '../data/ritjToCompleteData';
import { TRIBUTARIO_SP_COMPLETE_STATUTES } from '../data/tributarioSpCompleteData';
import { TRIBUTARIO_RJ_COMPLETE_STATUTES } from '../data/tributarioRjCompleteData';
import { TRIBUTARIO_MG_COMPLETE_STATUTES } from '../data/tributarioMgCompleteData';
import { TRIBUTARIO_RS_COMPLETE_STATUTES } from '../data/tributarioRsCompleteData';
import { TRIBUTARIO_PR_COMPLETE_STATUTES } from '../data/tributarioPrCompleteData';
import { TRIBUTARIO_SC_COMPLETE_STATUTES } from '../data/tributarioScCompleteData';
import { TRIBUTARIO_BA_COMPLETE_STATUTES } from '../data/tributarioBaCompleteData';
import { TRIBUTARIO_PE_COMPLETE_STATUTES } from '../data/tributarioPeCompleteData';
import { TRIBUTARIO_CE_COMPLETE_STATUTES } from '../data/tributarioCeCompleteData';
import { TRIBUTARIO_GO_COMPLETE_STATUTES } from '../data/tributarioGoCompleteData';
import { TRIBUTARIO_DF_COMPLETE_STATUTES } from '../data/tributarioDfCompleteData';
import { TRIBUTARIO_ES_COMPLETE_STATUTES } from '../data/tributarioEsCompleteData';
import { TRIBUTARIO_AM_COMPLETE_STATUTES } from '../data/tributarioAmCompleteData';
import { TRIBUTARIO_PA_COMPLETE_STATUTES } from '../data/tributarioPaCompleteData';
import { TRIBUTARIO_MT_COMPLETE_STATUTES } from '../data/tributarioMtCompleteData';
import { TRIBUTARIO_MS_COMPLETE_STATUTES } from '../data/tributarioMsCompleteData';
import { TRIBUTARIO_MA_COMPLETE_STATUTES } from '../data/tributarioMaCompleteData';
import { TRIBUTARIO_PB_COMPLETE_STATUTES } from '../data/tributarioPbCompleteData';
import { TRIBUTARIO_RN_COMPLETE_STATUTES } from '../data/tributarioRnCompleteData';
import { TRIBUTARIO_AL_COMPLETE_STATUTES } from '../data/tributarioAlCompleteData';
import { TRIBUTARIO_SE_COMPLETE_STATUTES } from '../data/tributarioSeCompleteData';
import { TRIBUTARIO_PI_COMPLETE_STATUTES } from '../data/tributarioPiCompleteData';
import { TRIBUTARIO_RO_COMPLETE_STATUTES } from '../data/tributarioRoCompleteData';
import { TRIBUTARIO_AC_COMPLETE_STATUTES } from '../data/tributarioAcCompleteData';
import { TRIBUTARIO_AP_COMPLETE_STATUTES } from '../data/tributarioApCompleteData';
import { TRIBUTARIO_RR_COMPLETE_STATUTES } from '../data/tributarioRrCompleteData';
import { TRIBUTARIO_TO_COMPLETE_STATUTES } from '../data/tributarioToCompleteData';
import { LICITACOES_SP_COMPLETE_STATUTES } from '../data/licitacoesSpCompleteData';
import { LICITACOES_RJ_COMPLETE_STATUTES } from '../data/licitacoesRjCompleteData';
import { LICITACOES_MG_COMPLETE_STATUTES } from '../data/licitacoesMgCompleteData';
import { LICITACOES_RS_COMPLETE_STATUTES } from '../data/licitacoesRsCompleteData';
import { LICITACOES_PR_COMPLETE_STATUTES } from '../data/licitacoesPrCompleteData';
import { LICITACOES_SC_COMPLETE_STATUTES } from '../data/licitacoesScCompleteData';
import { LICITACOES_BA_COMPLETE_STATUTES } from '../data/licitacoesBaCompleteData';
import { LICITACOES_PE_COMPLETE_STATUTES } from '../data/licitacoesPeCompleteData';
import { LICITACOES_CE_COMPLETE_STATUTES } from '../data/licitacoesCeCompleteData';
import { LICITACOES_GO_COMPLETE_STATUTES } from '../data/licitacoesGoCompleteData';
import { LICITACOES_DF_COMPLETE_STATUTES } from '../data/licitacoesDfCompleteData';
import { LICITACOES_ES_COMPLETE_STATUTES } from '../data/licitacoesEsCompleteData';
import { LICITACOES_AM_COMPLETE_STATUTES } from '../data/licitacoesAmCompleteData';
import { LICITACOES_PA_COMPLETE_STATUTES } from '../data/licitacoesPaCompleteData';
import { LICITACOES_MT_COMPLETE_STATUTES } from '../data/licitacoesMtCompleteData';
import { LICITACOES_MS_COMPLETE_STATUTES } from '../data/licitacoesMsCompleteData';
import { LICITACOES_MA_COMPLETE_STATUTES } from '../data/licitacoesMaCompleteData';
import { LICITACOES_PB_COMPLETE_STATUTES } from '../data/licitacoesPbCompleteData';
import { LICITACOES_RN_COMPLETE_STATUTES } from '../data/licitacoesRnCompleteData';
import { LICITACOES_AL_COMPLETE_STATUTES } from '../data/licitacoesAlCompleteData';
import { LICITACOES_SE_COMPLETE_STATUTES } from '../data/licitacoesSeCompleteData';
import { LICITACOES_PI_COMPLETE_STATUTES } from '../data/licitacoesPiCompleteData';
import { LICITACOES_RO_COMPLETE_STATUTES } from '../data/licitacoesRoCompleteData';
import { LICITACOES_AC_COMPLETE_STATUTES } from '../data/licitacoesAcCompleteData';
import { LICITACOES_AP_COMPLETE_STATUTES } from '../data/licitacoesApCompleteData';
import { LICITACOES_RR_COMPLETE_STATUTES } from '../data/licitacoesRrCompleteData';
import { LICITACOES_TO_COMPLETE_STATUTES } from '../data/licitacoesToCompleteData';


// --- MUNICIPAL CAPITAIS DATASETS ---
import { CODIGO_OBRAS_DF_COMPLETE_STATUTES } from '../data/codigoObrasDfCompleteData';
import { POSTURAS_DF_COMPLETE_STATUTES } from '../data/posturasDfCompleteData';
import { LOM_SP_COMPLETE_STATUTES } from '../data/lomSpCompleteData';
import { LOM_RJ_COMPLETE_STATUTES } from '../data/lomRjCompleteData';
import { LOM_MG_COMPLETE_STATUTES } from '../data/lomMgCompleteData';
import { LOM_RS_COMPLETE_STATUTES } from '../data/lomRsCompleteData';
import { LOM_PR_COMPLETE_STATUTES } from '../data/lomPrCompleteData';
import { LOM_SC_COMPLETE_STATUTES } from '../data/lomScCompleteData';
import { LOM_BA_COMPLETE_STATUTES } from '../data/lomBaCompleteData';
import { LOM_PE_COMPLETE_STATUTES } from '../data/lomPeCompleteData';
import { LOM_CE_COMPLETE_STATUTES } from '../data/lomCeCompleteData';
import { LOM_GO_COMPLETE_STATUTES } from '../data/lomGoCompleteData';
import { LOM_ES_COMPLETE_STATUTES } from '../data/lomEsCompleteData';
import { LOM_AM_COMPLETE_STATUTES } from '../data/lomAmCompleteData';
import { LOM_PA_COMPLETE_STATUTES } from '../data/lomPaCompleteData';
import { LOM_MT_COMPLETE_STATUTES } from '../data/lomMtCompleteData';
import { LOM_MS_COMPLETE_STATUTES } from '../data/lomMsCompleteData';
import { LOM_MA_COMPLETE_STATUTES } from '../data/lomMaCompleteData';
import { LOM_PB_COMPLETE_STATUTES } from '../data/lomPbCompleteData';
import { LOM_RN_COMPLETE_STATUTES } from '../data/lomRnCompleteData';
import { LOM_AL_COMPLETE_STATUTES } from '../data/lomAlCompleteData';
import { LOM_SE_COMPLETE_STATUTES } from '../data/lomSeCompleteData';
import { LOM_PI_COMPLETE_STATUTES } from '../data/lomPiCompleteData';
import { LOM_RO_COMPLETE_STATUTES } from '../data/lomRoCompleteData';
import { LOM_AC_COMPLETE_STATUTES } from '../data/lomAcCompleteData';
import { LOM_AP_COMPLETE_STATUTES } from '../data/lomApCompleteData';
import { LOM_RR_COMPLETE_STATUTES } from '../data/lomRrCompleteData';
import { LOM_TO_COMPLETE_STATUTES } from '../data/lomToCompleteData';
import { TRIBUTARIO_SP_MUN_COMPLETE_STATUTES } from '../data/tributarioSpMunCompleteData';
import { TRIBUTARIO_RJ_MUN_COMPLETE_STATUTES } from '../data/tributarioRjMunCompleteData';
import { TRIBUTARIO_MG_MUN_COMPLETE_STATUTES } from '../data/tributarioMgMunCompleteData';
import { TRIBUTARIO_RS_MUN_COMPLETE_STATUTES } from '../data/tributarioRsMunCompleteData';
import { TRIBUTARIO_PR_MUN_COMPLETE_STATUTES } from '../data/tributarioPrMunCompleteData';
import { TRIBUTARIO_SC_MUN_COMPLETE_STATUTES } from '../data/tributarioScMunCompleteData';
import { TRIBUTARIO_BA_MUN_COMPLETE_STATUTES } from '../data/tributarioBaMunCompleteData';
import { TRIBUTARIO_PE_MUN_COMPLETE_STATUTES } from '../data/tributarioPeMunCompleteData';
import { TRIBUTARIO_CE_MUN_COMPLETE_STATUTES } from '../data/tributarioCeMunCompleteData';
import { TRIBUTARIO_GO_MUN_COMPLETE_STATUTES } from '../data/tributarioGoMunCompleteData';
import { TRIBUTARIO_ES_MUN_COMPLETE_STATUTES } from '../data/tributarioEsMunCompleteData';
import { TRIBUTARIO_AM_MUN_COMPLETE_STATUTES } from '../data/tributarioAmMunCompleteData';
import { TRIBUTARIO_PA_MUN_COMPLETE_STATUTES } from '../data/tributarioPaMunCompleteData';
import { TRIBUTARIO_MT_MUN_COMPLETE_STATUTES } from '../data/tributarioMtMunCompleteData';
import { TRIBUTARIO_MS_MUN_COMPLETE_STATUTES } from '../data/tributarioMsMunCompleteData';
import { TRIBUTARIO_MA_MUN_COMPLETE_STATUTES } from '../data/tributarioMaMunCompleteData';
import { TRIBUTARIO_PB_MUN_COMPLETE_STATUTES } from '../data/tributarioPbMunCompleteData';
import { TRIBUTARIO_RN_MUN_COMPLETE_STATUTES } from '../data/tributarioRnMunCompleteData';
import { TRIBUTARIO_AL_MUN_COMPLETE_STATUTES } from '../data/tributarioAlMunCompleteData';
import { TRIBUTARIO_SE_MUN_COMPLETE_STATUTES } from '../data/tributarioSeMunCompleteData';
import { TRIBUTARIO_PI_MUN_COMPLETE_STATUTES } from '../data/tributarioPiMunCompleteData';
import { TRIBUTARIO_RO_MUN_COMPLETE_STATUTES } from '../data/tributarioRoMunCompleteData';
import { TRIBUTARIO_AC_MUN_COMPLETE_STATUTES } from '../data/tributarioAcMunCompleteData';
import { TRIBUTARIO_AP_MUN_COMPLETE_STATUTES } from '../data/tributarioApMunCompleteData';
import { TRIBUTARIO_RR_MUN_COMPLETE_STATUTES } from '../data/tributarioRrMunCompleteData';
import { TRIBUTARIO_TO_MUN_COMPLETE_STATUTES } from '../data/tributarioToMunCompleteData';
import { TRIBUTARIO_DF_MUN_COMPLETE_STATUTES } from '../data/tributarioDfMunCompleteData';
import { ESTATUTO_SP_MUN_COMPLETE_STATUTES } from '../data/estatutoSpMunCompleteData';
import { ESTATUTO_RJ_MUN_COMPLETE_STATUTES } from '../data/estatutoRjMunCompleteData';
import { ESTATUTO_MG_MUN_COMPLETE_STATUTES } from '../data/estatutoMgMunCompleteData';
import { ESTATUTO_RS_MUN_COMPLETE_STATUTES } from '../data/estatutoRsMunCompleteData';
import { ESTATUTO_PR_MUN_COMPLETE_STATUTES } from '../data/estatutoPrMunCompleteData';
import { ESTATUTO_SC_MUN_COMPLETE_STATUTES } from '../data/estatutoScMunCompleteData';
import { ESTATUTO_BA_MUN_COMPLETE_STATUTES } from '../data/estatutoBaMunCompleteData';
import { ESTATUTO_PE_MUN_COMPLETE_STATUTES } from '../data/estatutoPeMunCompleteData';
import { ESTATUTO_CE_MUN_COMPLETE_STATUTES } from '../data/estatutoCeMunCompleteData';
import { ESTATUTO_GO_MUN_COMPLETE_STATUTES } from '../data/estatutoGoMunCompleteData';
import { ESTATUTO_ES_MUN_COMPLETE_STATUTES } from '../data/estatutoEsMunCompleteData';
import { ESTATUTO_AM_MUN_COMPLETE_STATUTES } from '../data/estatutoAmMunCompleteData';
import { ESTATUTO_PA_MUN_COMPLETE_STATUTES } from '../data/estatutoPaMunCompleteData';
import { ESTATUTO_MT_MUN_COMPLETE_STATUTES } from '../data/estatutoMtMunCompleteData';
import { ESTATUTO_MS_MUN_COMPLETE_STATUTES } from '../data/estatutoMsMunCompleteData';
import { ESTATUTO_MA_MUN_COMPLETE_STATUTES } from '../data/estatutoMaMunCompleteData';
import { ESTATUTO_PB_MUN_COMPLETE_STATUTES } from '../data/estatutoPbMunCompleteData';
import { ESTATUTO_RN_MUN_COMPLETE_STATUTES } from '../data/estatutoRnMunCompleteData';
import { ESTATUTO_AL_MUN_COMPLETE_STATUTES } from '../data/estatutoAlMunCompleteData';
import { ESTATUTO_SE_MUN_COMPLETE_STATUTES } from '../data/estatutoSeMunCompleteData';
import { ESTATUTO_PI_MUN_COMPLETE_STATUTES } from '../data/estatutoPiMunCompleteData';
import { ESTATUTO_RO_MUN_COMPLETE_STATUTES } from '../data/estatutoRoMunCompleteData';
import { ESTATUTO_AC_MUN_COMPLETE_STATUTES } from '../data/estatutoAcMunCompleteData';
import { ESTATUTO_AP_MUN_COMPLETE_STATUTES } from '../data/estatutoApMunCompleteData';
import { ESTATUTO_RR_MUN_COMPLETE_STATUTES } from '../data/estatutoRrMunCompleteData';
import { ESTATUTO_TO_MUN_COMPLETE_STATUTES } from '../data/estatutoToMunCompleteData';
import { ESTATUTO_DF_MUN_COMPLETE_STATUTES } from '../data/estatutoDfMunCompleteData';


// --- OBRAS E POSTURAS CAPITAIS DATASETS ---
import { CODIGO_OBRAS_SP_COMPLETE_STATUTES } from '../data/codigoObrasSpCompleteData';
import { CODIGO_OBRAS_RJ_COMPLETE_STATUTES } from '../data/codigoObrasRjCompleteData';
import { CODIGO_OBRAS_MG_COMPLETE_STATUTES } from '../data/codigoObrasMgCompleteData';
import { CODIGO_OBRAS_RS_COMPLETE_STATUTES } from '../data/codigoObrasRsCompleteData';
import { CODIGO_OBRAS_PR_COMPLETE_STATUTES } from '../data/codigoObrasPrCompleteData';
import { CODIGO_OBRAS_SC_COMPLETE_STATUTES } from '../data/codigoObrasScCompleteData';
import { CODIGO_OBRAS_BA_COMPLETE_STATUTES } from '../data/codigoObrasBaCompleteData';
import { CODIGO_OBRAS_PE_COMPLETE_STATUTES } from '../data/codigoObrasPeCompleteData';
import { CODIGO_OBRAS_CE_COMPLETE_STATUTES } from '../data/codigoObrasCeCompleteData';
import { CODIGO_OBRAS_GO_COMPLETE_STATUTES } from '../data/codigoObrasGoCompleteData';
import { CODIGO_OBRAS_ES_COMPLETE_STATUTES } from '../data/codigoObrasEsCompleteData';
import { CODIGO_OBRAS_AM_COMPLETE_STATUTES } from '../data/codigoObrasAmCompleteData';
import { CODIGO_OBRAS_PA_COMPLETE_STATUTES } from '../data/codigoObrasPaCompleteData';
import { CODIGO_OBRAS_MT_COMPLETE_STATUTES } from '../data/codigoObrasMtCompleteData';
import { CODIGO_OBRAS_MS_COMPLETE_STATUTES } from '../data/codigoObrasMsCompleteData';
import { CODIGO_OBRAS_MA_COMPLETE_STATUTES } from '../data/codigoObrasMaCompleteData';
import { CODIGO_OBRAS_PB_COMPLETE_STATUTES } from '../data/codigoObrasPbCompleteData';
import { CODIGO_OBRAS_RN_COMPLETE_STATUTES } from '../data/codigoObrasRnCompleteData';
import { CODIGO_OBRAS_AL_COMPLETE_STATUTES } from '../data/codigoObrasAlCompleteData';
import { CODIGO_OBRAS_SE_COMPLETE_STATUTES } from '../data/codigoObrasSeCompleteData';
import { CODIGO_OBRAS_PI_COMPLETE_STATUTES } from '../data/codigoObrasPiCompleteData';
import { CODIGO_OBRAS_RO_COMPLETE_STATUTES } from '../data/codigoObrasRoCompleteData';
import { CODIGO_OBRAS_AC_COMPLETE_STATUTES } from '../data/codigoObrasAcCompleteData';
import { CODIGO_OBRAS_AP_COMPLETE_STATUTES } from '../data/codigoObrasApCompleteData';
import { CODIGO_OBRAS_RR_COMPLETE_STATUTES } from '../data/codigoObrasRrCompleteData';
import { CODIGO_OBRAS_TO_COMPLETE_STATUTES } from '../data/codigoObrasToCompleteData';
import { POSTURAS_SP_COMPLETE_STATUTES } from '../data/posturasSpCompleteData';
import { POSTURAS_RJ_COMPLETE_STATUTES } from '../data/posturasRjCompleteData';
import { POSTURAS_MG_COMPLETE_STATUTES } from '../data/posturasMgCompleteData';
import { POSTURAS_RS_COMPLETE_STATUTES } from '../data/posturasRsCompleteData';
import { POSTURAS_PR_COMPLETE_STATUTES } from '../data/posturasPrCompleteData';
import { POSTURAS_SC_COMPLETE_STATUTES } from '../data/posturasScCompleteData';
import { POSTURAS_BA_COMPLETE_STATUTES } from '../data/posturasBaCompleteData';
import { POSTURAS_PE_COMPLETE_STATUTES } from '../data/posturasPeCompleteData';
import { POSTURAS_CE_COMPLETE_STATUTES } from '../data/posturasCeCompleteData';
import { POSTURAS_GO_COMPLETE_STATUTES } from '../data/posturasGoCompleteData';
import { POSTURAS_ES_COMPLETE_STATUTES } from '../data/posturasEsCompleteData';
import { POSTURAS_AM_COMPLETE_STATUTES } from '../data/posturasAmCompleteData';
import { POSTURAS_PA_COMPLETE_STATUTES } from '../data/posturasPaCompleteData';
import { POSTURAS_MT_COMPLETE_STATUTES } from '../data/posturasMtCompleteData';
import { POSTURAS_MS_COMPLETE_STATUTES } from '../data/posturasMsCompleteData';
import { POSTURAS_MA_COMPLETE_STATUTES } from '../data/posturasMaCompleteData';
import { POSTURAS_PB_COMPLETE_STATUTES } from '../data/posturasPbCompleteData';
import { POSTURAS_RN_COMPLETE_STATUTES } from '../data/posturasRnCompleteData';
import { POSTURAS_AL_COMPLETE_STATUTES } from '../data/posturasAlCompleteData';
import { POSTURAS_SE_COMPLETE_STATUTES } from '../data/posturasSeCompleteData';
import { POSTURAS_PI_COMPLETE_STATUTES } from '../data/posturasPiCompleteData';
import { POSTURAS_RO_COMPLETE_STATUTES } from '../data/posturasRoCompleteData';
import { POSTURAS_AC_COMPLETE_STATUTES } from '../data/posturasAcCompleteData';
import { POSTURAS_AP_COMPLETE_STATUTES } from '../data/posturasApCompleteData';
import { POSTURAS_RR_COMPLETE_STATUTES } from '../data/posturasRrCompleteData';
import { POSTURAS_TO_COMPLETE_STATUTES } from '../data/posturasToCompleteData';

export interface HistoricalVersion {
  effectiveDate: string;
  content: string;
  changeNote: string;
}

export interface JurisprudenceRef {
  type: 'SUMULA_STF' | 'SUMULA_STJ' | 'SUMULA_TST' | 'TEMA_REPETITIVO' | 'ACORDAO';
  code: string;
  title: string;
  summary: string;
  link?: string;
}

export type StatuteStatus = 'COMUM' | 'HISTORICA_OBSOLETA' | 'EM_DESUSO' | 'REVOGADA_DESATIVADA';
export type LawType = 'CONSTITUCIONAL' | 'FEDERAL' | 'ESTADUAL' | 'MUNICIPAL';

export interface LegalArticle {
  id: string;
  lawName: string;
  article: string;
  title: string;
  content: string;
  keywords: string[];
  sourceUrl?: string;
  officialRef?: string;
  statusVigencia?: StatuteStatus;
  lawType?: LawType;
  hierarchy?: {
    title?: string;
    chapter?: string;
    section?: string;
  };
  historicalVersions?: HistoricalVersion[];
  jurisprudenceRefs?: JurisprudenceRef[];
  incisosAndParagrafos?: {
    label: string;
    text: string;
  }[];
}

// Base de Dados Legislativa Local Estruturada para Pesquisa LexML / BM25
const LEGAL_KNOWLEDGE_BASE: LegalArticle[] = [
  // --- LGPD ---
  {
    id: 'lgpd-art1',
    lawName: 'LGPD (Lei 13.709/2018)',
    article: 'Artigo 1º',
    title: 'Objeto da Lei',
    content: 'Esta Lei dispõe sobre o tratamento de dados pessoais, inclusive nos meios digitais, por pessoa natural ou por pessoa jurídica de direito público ou privado, com o objetivo de proteger os direitos fundamentais de liberdade e de privacidade e o livre desenvolvimento da personalidade da pessoa natural.',
    keywords: ['lgpd', 'tratamento', 'dados pessoais', 'privacidade', 'objeto']
  },
  {
    id: 'lgpd-art5-i',
    lawName: 'LGPD (Lei 13.709/2018)',
    article: 'Artigo 5º, II',
    title: 'Dado Pessoal Sensível',
    content: 'Dado pessoal sensível: dado pessoal sobre origem racial ou étnica, convicção religiosa, opinião política, filiação a sindicato ou a organização de caráter religioso, filosófico ou político, dado referente à saúde ou à vida sexual, dado genético ou biométrico, quando vinculado a uma pessoa natural.',
    keywords: ['sensível', 'saúde', 'etnia', 'religião', 'biométrico', 'sindicato', 'lgpd']
  },
  {
    id: 'lgpd-art7',
    lawName: 'LGPD (Lei 13.709/2018)',
    article: 'Artigo 7º',
    title: 'Bases Legais para Tratamento de Dados Pessoais',
    content: 'O tratamento de dados pessoais somente poderá ser realizado nas seguintes hipóteses: I - mediante o consentimento do titular; II - para o cumprimento de obrigação legal ou regulatória pelo controlador; III - pela administração pública, para o tratamento e uso compartilhado de dados necessários à execução de políticas públicas; V - quando necessário para a execução de contrato; IX - quando necessário para atender aos interesses legítimos do controlador ou de terceiro (Legítimo Interesse).',
    keywords: ['base legal', 'consentimento', 'obrigação legal', 'legítimo interesse', 'execução de contrato', 'artigo 7']
  },
  {
    id: 'lgpd-art18',
    lawName: 'LGPD (Lei 13.709/2018)',
    article: 'Artigo 18',
    title: 'Direitos do Titular de Dados',
    content: 'O titular dos dados pessoais tem direito a obter do controlador, em relação aos dados do titular por ele tratados, a qualquer momento e mediante requisição: I - confirmação da existência de tratamento; II - acesso aos dados; III - correção de dados incompletos, inexatos ou desatualizados; IV - anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade.',
    keywords: ['direitos do titular', 'acesso', 'correção', 'anonimização', 'eliminação', 'artigo 18']
  },
  {
    id: 'lgpd-art19',
    lawName: 'LGPD (Lei 13.709/2018)',
    article: 'Artigo 19, II',
    title: 'Prazo para Atendimento dos Direitos do Titular',
    content: 'A confirmação de existência ou o acesso a dados pessoais serão providenciados, mediante requisição do titular: II - por meio de declaração clara e completa, que indique a origem dos dados, a inexistência de registro, a observância de critérios e a finalidade do tratamento, observados os segredos comercial e industrial, fornecida no prazo de até 15 (quinze) dias, contado da data do requerimento do titular.',
    keywords: ['prazo 15 dias', 'requerimento', 'declaração clara', 'atendimento titular', 'artigo 19', 'lgpd']
  },
  {
    id: 'lgpd-art52',
    lawName: 'LGPD (Lei 13.709/2018)',
    article: 'Artigo 52',
    title: 'Sanções Administrativas e Multa de até R$ 50 Milhões',
    content: 'Os agentes de tratamento de dados, em razão das infrações cometidas às normas previstas nesta Lei, ficam sujeitos às seguintes sanções administrativas aplicáveis pela ANPD: I - advertência; II - multa simples, de até 2% (dois por cento) do faturamento da pessoa jurídica de direito privado, grupo ou conglomerado no Brasil no seu último exercício, excluídos os tributos, limitada, no total, a R$ 50.000.000,00 (cinquenta milhões de reais) por infração; III - multa diária; IV - publicização da infração; V - bloqueio dos dados pessoais; VI - eliminação dos dados pessoais a que se refere a infração.',
    keywords: ['multa', 'sanções administrativas', '50 milhões', '2% do faturamento', 'anpd', 'penalidades', 'artigo 52', 'lgpd']
  },
  {
    id: 'lgpd-art65',
    lawName: 'LGPD (Lei 13.709/2018)',
    article: 'Artigo 65',
    title: 'Entrada em Vigor da LGPD e Vigência das Sanções',
    content: 'Esta Lei entra em vigor: I - dia 28 de dezembro de 2018, quanto aos arts. 55-A, 55-B, 55-C...; IA - dia 1º de agosto de 2021, quanto aos arts. 52, 53 e 54 (sanções administrativas); II - 24 (vinte e quatro) meses após a data de sua publicação, quanto aos demais artigos (setembro de 2020).',
    keywords: ['vigência', 'entrada em vigor', 'vacatio legis', 'publicação', 'artigo 65', 'lgpd']
  },

  // --- CPC ---
  {
    id: 'cpc-art219',
    lawName: 'CPC (Lei 13.105/2015)',
    article: 'Artigo 219',
    title: 'Contagem de Prazos Processuais',
    content: 'Na contagem de prazo em dias, estabelecido por lei ou pelo juiz, computar-se-ão somente os dias úteis. Parágrafo único. O disposto neste artigo aplica-se somente aos prazos processuais.',
    keywords: ['prazo', 'dias úteis', 'contagem', 'tempestividade', 'artigo 219', 'cpc']
  },
  {
    id: 'cpc-art300',
    lawName: 'CPC (Lei 13.105/2015)',
    article: 'Artigo 300',
    title: 'Tutela de Urgência',
    content: 'A tutela de urgência será concedida quando houver elementos que evidenciem a probabilidade do direito e o perigo de dano ou o risco ao resultado útil do processo.',
    keywords: ['tutela', 'liminar', 'urgência', 'probabilidade do direito', 'perigo de dano', 'artigo 300']
  },
  {
    id: 'cpc-art319',
    lawName: 'CPC (Lei 13.105/2015)',
    article: 'Artigo 319',
    title: 'Requisitos da Petição Inicial',
    content: 'A petição inicial indicará: I - o juízo a que é dirigida; II - os nomes, os prenomes, o estado civil, a existência de união estável, a profissão, o CPF ou o CNPJ, o endereço eletrônico, o domicílio e a residência do autor e do réu; III - os fatos e os fundamentos jurídicos do pedido; IV - o pedido com as suas especificações; V - o valor da causa.',
    keywords: ['petição inicial', 'requisitos', 'valor da causa', 'fatos', 'fundamentos', 'artigo 319']
  },

  // --- CLT ---
  {
    id: 'clt-art468',
    lawName: 'CLT (Decreto-Lei 5.452/1943)',
    article: 'Artigo 468',
    title: 'Alteração Contratual',
    content: 'Nos contratos individuais de trabalho só é lícita a alteração das respectivas condições por mútuo consentimento, e ainda assim desde que não resultem, direta ou indiretamente, prejuízos ao empregado, sob pena de nulidade da cláusula infringente desta garantia.',
    keywords: ['alteração', 'contrato de trabalho', 'prejuízo', 'consentimento', 'artigo 468', 'clt']
  },
  {
    id: 'clt-art477',
    lawName: 'CLT (Decreto-Lei 5.452/1943)',
    article: 'Artigo 477',
    title: 'Rescisão Contratual e Prazos de Pagamento',
    content: 'A entrega ao empregado de documentos que comprovem a comunicação da extinção do contrato aos órgãos competentes bem como o pagamento dos valores constantes do instrumento de rescisão deverão ser efetuados até dez dias contados do término do contrato.',
    keywords: ['rescisão', 'pagamento', 'prazo 10 dias', 'verbas rescisórias', 'artigo 477']
  },

  // --- LICITAÇÕES ---
  {
    id: 'lic-art74',
    lawName: 'Lei 14.133/2021 (Licitações)',
    article: 'Artigo 74',
    title: 'Inexigibilidade de Licitação',
    content: 'É inexigível a licitação quando inviável a competição, em especial nos casos de: I - aquisição de materiais, de equipamentos ou de gêneros que só possam ser fornecidos por produtor, empresa ou representante comercial exclusivo; III - contratação de serviços técnicos especializados de natureza predominantemente intelectual com profissionais ou empresas de notória especialização.',
    keywords: ['inexigibilidade', 'inviável competição', 'notória especialização', 'exclusivo', 'artigo 74']
  },
  {
    id: 'lic-art75',
    lawName: 'Lei 14.133/2021 (Licitações)',
    article: 'Artigo 75',
    title: 'Dispensa de Licitação por Valor',
    content: 'É dispensável a licitação: I - para obras e serviços de engenharia ou de serviços de manutenção de veículos automotores de valor inferior a R$ 100.000,00; II - para outros serviços e compras de valor inferior a R$ 50.000,00.',
    keywords: ['dispensa', 'valor', 'pequeno valor', 'compra direta', 'artigo 75']
  },

  // --- CONTRATOS & CC ---
  {
    id: 'cc-art421',
    lawName: 'Código Civil (Lei 10.406/2002)',
    article: 'Artigo 421',
    title: 'Função Social do Contrato',
    content: 'A liberdade contratual será exercida nos limites da função social do contrato. Parágrafo único. Nas relações contratuais privadas, prevalecerão o princípio da intervenção mínima e a revisão contratual como exceção.',
    keywords: ['contrato', 'função social', 'liberdade contratual', 'artigo 421', 'código civil']
  },
  {
    id: 'cdc-art51',
    lawName: 'CDC (Lei 8.078/1990)',
    article: 'Artigo 51',
    title: 'Cláusulas Abusivas Nulas de Pleno Direito',
    content: 'São nulas de pleno direito, entre outras, as cláusulas contratuais relativas ao fornecimento de produtos e serviços que: I - impossibilitem, exonerem ou atenuem a responsabilidade do fornecedor por vícios de qualquer natureza; IV - estabeleçam obrigações consideradas iníquas, abusivas, que coloquem o consumidor em desvantagem exagerada.',
    keywords: ['abusiva', 'nula', 'consumidor', 'desvantagem exagerada', 'artigo 51', 'cdc']
  },



  // --- DIREITO PENAL & DIGITAL ---
  {
    id: 'cp-art154a',
    lawName: 'Código Penal (Decreto-Lei 2.848/1940)',
    article: 'Artigo 154-A',
    title: 'Invasão de Dispositivo Informático',
    content: 'Invadir dispositivo informático de outrem, conectado ou não à rede de computadores, mediante violação indevida de mecanismo de segurança e com o fim de obter, adulterar ou destruir dados ou informações sem autorização expressa ou tácita do titular do dispositivo. Pena - reclusão, de 1 a 4 anos, e multa.',
    keywords: ['crime cibernético', 'invasão', 'dispositivo', 'hackear', 'vazamento', 'código penal', 'artigo 154']
  },
  {
    id: 'cp-art171',
    lawName: 'Código Penal (Decreto-Lei 2.848/1940)',
    article: 'Artigo 171',
    title: 'Estelionato e Fraude',
    content: 'Obter, para si ou para outrem, vantagem ilícita, em prejuízo alheio, induzindo ou mantendo alguém em erro, mediante meio fraudulento. Pena - reclusão, de 1 a 5 anos, e multa.',
    keywords: ['estelionato', 'fraude', 'vantagem ilícita', 'golpe', 'código penal', 'artigo 171']
  },

  // --- DIREITO TRIBUTÁRIO (CTN) ---
  {
    id: 'ctn-art111',
    lawName: 'Código Tributário Nacional (Lei 5.172/1966)',
    article: 'Artigo 111',
    title: 'Interpretação Literal em Matéria Tributária',
    content: 'Interpreta-se literalmente a legislação tributária que disponha sobre: I - suspensão ou exclusão do crédito tributário; II - outorga de isenção; III - dispensa do cumprimento de obrigações tributárias acessórias.',
    keywords: ['tributário', 'isenção', 'crédito tributário', 'ctn', 'interpretação literal', 'artigo 111']
  }
];

export type LegalDomainCategory = 
  | 'DIREITO_TRABALHISTA'
  | 'LICITACOES_ADMINISTRATIVO'
  | 'DIREITO_CIVIL_LOCACAO'
  | 'DIREITO_CONSUMIDOR_CDC'
  | 'DIREITO_DIGITAL_LGPD'
  | 'DIREITO_PROCESSUAL_CPC'
  | 'DIREITO_CONSTITUCIONAL'
  | 'GERAL';

const LEGAL_STOP_WORDS = new Set([
  'como', 'funciona', 'funcional', 'lei', 'leis', 'artigo', 'artigos', 'sobre', 'quais', 'quaisquer',
  'qual', 'que', 'para', 'por', 'com', 'uma', 'um', 'uns', 'umas', 'das', 'dos', 'nas', 'nos',
  'de', 'da', 'do', 'em', 'no', 'na', 'se', 'ou', 'e', 'a', 'o', 'as', 'os', 'me', 'nos',
  'saber', 'explique', 'resumo', 'direitos', 'direito', 'deve', 'devem', 'pode', 'podem', 'diga'
]);

export class LegalKnowledgeBaseService {
  private static _memoizedAllArticles: LegalArticle[] | null = null;
  private static _memoizedSTF: LegalArticle[] | null = null;
  private static _memoizedSTJ: LegalArticle[] | null = null;
  private static _memoizedTST: LegalArticle[] | null = null;
  private static _memoizedCore: LegalArticle[] | null = null;

  /**
   * Reseta os caches de memoização quando o acervo customizado for alterado
   */
  public static clearCache(): void {
    this._memoizedAllArticles = null;
    this._memoizedSTF = null;
    this._memoizedSTJ = null;
    this._memoizedTST = null;
    this._memoizedCore = null;
  }

  /**
   * Retorna isoladamente o acervo de Súmulas do STF (797: Súmulas Vinculantes + Tradicionais)
   */
  public static getSTFArticles(): LegalArticle[] {
    if (!this._memoizedSTF) {
      const svs = JURISPRUDENCE_STATUTES.filter(a => a.id.startsWith('stf-sv-'));
      this._memoizedSTF = [...svs, ...STF_COMPLETE_TRADITIONAL_SUMULAS];
    }
    return this._memoizedSTF;
  }

  /**
   * Retorna isoladamente o acervo de Súmulas do STJ (676: Súmulas 1 a 676)
   */
  public static getSTJArticles(): LegalArticle[] {
    if (!this._memoizedSTJ) {
      this._memoizedSTJ = STJ_COMPLETE_SUMULAS;
    }
    return this._memoizedSTJ;
  }

  /**
   * Retorna isoladamente o acervo do TST (1.286: Súmulas + OJs SDI-1/SDI-2/SDC/Pleno + PNs)
   */
  public static getTSTArticles(): LegalArticle[] {
    if (!this._memoizedTST) {
      this._memoizedTST = TST_COMPLETE_SUMULAS_AND_OJS;
    }
    return this._memoizedTST;
  }

  /**
   * Retorna isoladamente o acervo do CPC (1.072 artigos)
   */
  public static getCPCArticles(): LegalArticle[] {
    return CPC_COMPLETE_STATUTES;
  }

  /**
   * Retorna isoladamente o acervo da CLT (982 artigos)
   */
  public static getCLTArticles(): LegalArticle[] {
    return CLT_COMPLETE_STATUTES;
  }

  /**
   * Retorna isoladamente o acervo do Código Civil (2.081 artigos)
   */
  public static getCivilArticles(): LegalArticle[] {
    return CC_COMPLETE_STATUTES;
  }

  /**
   * Retorna isoladamente o acervo da Constituição Federal (CF/88)
   */
  public static getConstitutionArticles(): LegalArticle[] {
    return COMPLETE_CONSTITUTION_STATUTES;
  }

  /**
   * Retorna isoladamente o acervo do Código Penal e CPP (1.139 artigos)
   */
  public static getPenalArticles(): LegalArticle[] {
    return PENAL_COMPLETE_STATUTES;
  }

  /**
   * Retorna isoladamente o acervo do Código Tributário Nacional (CTN - 231 artigos)
   */
  public static getCTNArticles(): LegalArticle[] {
    return CTN_COMPLETE_STATUTES;
  }

  /**
   * Retorna isoladamente o acervo de Licitações (Lei 14.133, Lei 8.666, Lei 10.520 - 371 artigos)
   */
  public static getLicitacoesArticles(): LegalArticle[] {
    return LICITACOES_COMPLETE_STATUTES;
  }

  /**
   * Retorna isoladamente o acervo de LGPD & Proteção de Dados (Lei 13.709 e Marco Civil - 118 artigos)
   */
  public static getLGPDArticles(): LegalArticle[] {
    return LGPD_COMPLETE_STATUTES;
  }

  /**
   * Retorna isoladamente o acervo do Código de Defesa do Consumidor (CDC - Lei 8.078/1990 - 119 artigos)
   */
  public static getCDCArticles(): LegalArticle[] {
    return CDC_COMPLETE_STATUTES;
  }

  /**
   * Retorna isoladamente o acervo da Lei de Improbidade Administrativa (LIA - Lei 8.429/1992 - 26 artigos)
   */
  public static getLIAArticles(): LegalArticle[] {
    return LIA_COMPLETE_STATUTES;
  }

  /**
   * Retorna isoladamente o acervo da Lei do Inquilinato (Lei 8.245/1991 - 91 artigos)
   */
  public static getInquilinatoArticles(): LegalArticle[] {
    return INQUILINATO_COMPLETE_STATUTES;
  }

  /**
   * Retorna isoladamente o acervo de Direito Previdenciário & LOAS (Leis 8.213, 8.212 e 8.742 - 229 artigos)
   */
  public static getPrevidenciarioArticles(): LegalArticle[] {
    return PREVIDENCIARIO_COMPLETE_STATUTES;
  }

  /**
   * Retorna isoladamente o acervo da Lei de Falências e Recuperação Judicial (Lei 11.101/2005 - 219 artigos)
   */
  public static getFalenciasArticles(): LegalArticle[] {
    return FALENCIAS_COMPLETE_STATUTES;
  }

  /**
   * Retorna isoladamente o acervo do Estatuto da Criança e do Adolescente (ECA - Lei 8.069/1990 - 287 artigos)
   */
  public static getECAArticles(): LegalArticle[] {
    return ECA_COMPLETE_STATUTES;
  }

  /**
   * Retorna isoladamente o acervo do Código de Trânsito Brasileiro (CTB - Lei 9.503/1997 - 373 artigos)
   */
  public static getCTBArticles(): LegalArticle[] {
    return CTB_COMPLETE_STATUTES;
  }

  /**
   * Retorna isoladamente o acervo do Estatuto da OAB (Lei 8.906/1994 - 91 artigos)
   */
  public static getOABArticles(): LegalArticle[] {
    return OAB_COMPLETE_STATUTES;
  }

  /**
   * Retorna isoladamente o acervo da Lei de Execução Penal (LEP - Lei 7.210/1984 - 212 artigos)
   */
  public static getLEPArticles(): LegalArticle[] {
    return LEP_COMPLETE_STATUTES;
  }

  /**
   * Retorna isoladamente o acervo dos Juizados Especiais (LJE - Lei 9.099/95, Lei 10.259/01, Lei 12.153/09 - 197 artigos)
   */
  public static getLJEArticles(): LegalArticle[] {
    return LJE_COMPLETE_STATUTES;
  }

  /**
   * Retorna isoladamente o acervo da Lei Maria da Penha (Lei 11.340/2006 - 76 artigos)
   */
  public static getMariaDaPenhaArticles(): LegalArticle[] {
    return MARIA_DA_PENHA_COMPLETE_STATUTES;
  }

  /**
   * Retorna o acervo das Constituições Estaduais dos 26 Estados e Lei Orgânica do DF (27 UFs)
   */
  public static getStateConstitutionArticles(uf?: string): LegalArticle[] {
    if (uf && uf.toUpperCase() === 'SP') {
      return CESP_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'RJ') {
      return CERJ_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'MG') {
      return CEMG_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'RS') {
      return CERS_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'PR') {
      return CEPR_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'SC') {
      return CESC_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'BA') {
      return CEBA_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'PE') {
      return CEPE_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'CE') {
      return CECE_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'GO') {
      return CEGO_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'DF') {
      return LODF_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'ES') {
      return CEES_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'AM') {
      return CEAM_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'PA') {
      return CEPA_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'MT') {
      return CEMT_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'MS') {
      return CEMS_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'MA') {
      return CEMA_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'PB') {
      return CEPB_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'RN') {
      return CERN_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'AL') {
      return CEAL_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'SE') {
      return CESE_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'PI') {
      return CEPI_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'RO') {
      return CERO_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'AC') {
      return CEAC_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'AP') {
      return CEAP_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'RR') {
      return CERR_COMPLETE_STATUTES;
    }
    if (uf && uf.toUpperCase() === 'TO') {
      return CETO_COMPLETE_STATUTES;
    }
    if (!uf || uf.toUpperCase() === 'ALL') {
      return [...CESP_COMPLETE_STATUTES, ...CERJ_COMPLETE_STATUTES, ...CEMG_COMPLETE_STATUTES, ...CERS_COMPLETE_STATUTES, ...CEPR_COMPLETE_STATUTES, ...CESC_COMPLETE_STATUTES, ...CEBA_COMPLETE_STATUTES, ...CEPE_COMPLETE_STATUTES, ...CECE_COMPLETE_STATUTES, ...CEGO_COMPLETE_STATUTES, ...LODF_COMPLETE_STATUTES, ...CEES_COMPLETE_STATUTES, ...CEAM_COMPLETE_STATUTES, ...CEPA_COMPLETE_STATUTES, ...CEMT_COMPLETE_STATUTES, ...CEMS_COMPLETE_STATUTES, ...CEMA_COMPLETE_STATUTES, ...CEPB_COMPLETE_STATUTES, ...CERN_COMPLETE_STATUTES, ...CEAL_COMPLETE_STATUTES, ...CESE_COMPLETE_STATUTES, ...CEPI_COMPLETE_STATUTES, ...CERO_COMPLETE_STATUTES, ...CEAC_COMPLETE_STATUTES, ...CEAP_COMPLETE_STATUTES, ...CERR_COMPLETE_STATUTES, ...CETO_COMPLETE_STATUTES, ...STATE_CONSTITUTIONS_STATUTES];
    }
    const targetUf = uf.toUpperCase();
    return STATE_CONSTITUTIONS_STATUTES.filter(a => 
      a.id.includes(`const-est-${targetUf.toLowerCase()}-`) || 
      a.lawName.toUpperCase().includes(`(${targetUf}/`) ||
      a.keywords.includes(targetUf.toLowerCase())
    );
  }

  /**
   * Retorna o acervo dos Estatutos dos Servidores Públicos Civis Estaduais das 27 UFs
   */
  public static getEstatutoServidoresEstaduaisArticles(uf?: string): LegalArticle[] {
    if (uf && uf.toUpperCase() === 'SP') return ESTATUTO_SP_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RJ') return ESTATUTO_RJ_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'MG') return ESTATUTO_MG_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RS') return ESTATUTO_RS_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PR') return ESTATUTO_PR_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'SC') return ESTATUTO_SC_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'BA') return ESTATUTO_BA_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PE') return ESTATUTO_PE_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'CE') return ESTATUTO_CE_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'GO') return ESTATUTO_GO_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'DF') return ESTATUTO_DF_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'ES') return ESTATUTO_ES_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'AM') return ESTATUTO_AM_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PA') return ESTATUTO_PA_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'MT') return ESTATUTO_MT_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'MS') return ESTATUTO_MS_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'MA') return ESTATUTO_MA_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PB') return ESTATUTO_PB_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RN') return ESTATUTO_RN_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'AL') return ESTATUTO_AL_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'SE') return ESTATUTO_SE_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PI') return ESTATUTO_PI_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RO') return ESTATUTO_RO_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'AC') return ESTATUTO_AC_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'AP') return ESTATUTO_AP_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RR') return ESTATUTO_RR_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'TO') return ESTATUTO_TO_COMPLETE_STATUTES;

    if (!uf || uf.toUpperCase() === 'ALL') {
      return [
        ...ESTATUTO_SP_COMPLETE_STATUTES, ...ESTATUTO_RJ_COMPLETE_STATUTES, ...ESTATUTO_MG_COMPLETE_STATUTES,
        ...ESTATUTO_RS_COMPLETE_STATUTES, ...ESTATUTO_PR_COMPLETE_STATUTES, ...ESTATUTO_SC_COMPLETE_STATUTES,
        ...ESTATUTO_BA_COMPLETE_STATUTES, ...ESTATUTO_PE_COMPLETE_STATUTES, ...ESTATUTO_CE_COMPLETE_STATUTES,
        ...ESTATUTO_GO_COMPLETE_STATUTES, ...ESTATUTO_DF_COMPLETE_STATUTES, ...ESTATUTO_ES_COMPLETE_STATUTES,
        ...ESTATUTO_AM_COMPLETE_STATUTES, ...ESTATUTO_PA_COMPLETE_STATUTES, ...ESTATUTO_MT_COMPLETE_STATUTES,
        ...ESTATUTO_MS_COMPLETE_STATUTES, ...ESTATUTO_MA_COMPLETE_STATUTES, ...ESTATUTO_PB_COMPLETE_STATUTES,
        ...ESTATUTO_RN_COMPLETE_STATUTES, ...ESTATUTO_AL_COMPLETE_STATUTES, ...ESTATUTO_SE_COMPLETE_STATUTES,
        ...ESTATUTO_PI_COMPLETE_STATUTES, ...ESTATUTO_RO_COMPLETE_STATUTES, ...ESTATUTO_AC_COMPLETE_STATUTES,
        ...ESTATUTO_AP_COMPLETE_STATUTES, ...ESTATUTO_RR_COMPLETE_STATUTES, ...ESTATUTO_TO_COMPLETE_STATUTES
      ];
    }
    const targetUf = uf.toUpperCase();
    return STATE_AND_MUNICIPAL_STATUTES.filter(a => 
      a.id.includes(`estatuto-${targetUf.toLowerCase()}-`) || 
      a.lawName.toUpperCase().includes(`(${targetUf}/`) ||
      a.keywords.includes(targetUf.toLowerCase())
    );
  }

  /**
   * Retorna o acervo dos Regimentos Internos dos Tribunais de Justiça das 27 UFs
   */
  public static getRegimentoTJArticles(uf?: string): LegalArticle[] {
    if (uf && uf.toUpperCase() === 'SP') return RITJSP_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RJ') return RITJ_RJ_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'MG') return RITJ_MG_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RS') return RITJ_RS_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PR') return RITJ_PR_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'SC') return RITJ_SC_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'BA') return RITJ_BA_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PE') return RITJ_PE_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'CE') return RITJ_CE_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'GO') return RITJ_GO_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'DF') return RITJ_DF_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'ES') return RITJ_ES_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'AM') return RITJ_AM_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PA') return RITJ_PA_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'MT') return RITJ_MT_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'MS') return RITJ_MS_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'MA') return RITJ_MA_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PB') return RITJ_PB_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RN') return RITJ_RN_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'AL') return RITJ_AL_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'SE') return RITJ_SE_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PI') return RITJ_PI_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RO') return RITJ_RO_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'AC') return RITJ_AC_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'AP') return RITJ_AP_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RR') return RITJ_RR_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'TO') return RITJ_TO_COMPLETE_STATUTES;

    if (!uf || uf.toUpperCase() === 'ALL') {
      return [
        ...RITJSP_COMPLETE_STATUTES, ...RITJ_RJ_COMPLETE_STATUTES, ...RITJ_MG_COMPLETE_STATUTES,
        ...RITJ_RS_COMPLETE_STATUTES, ...RITJ_PR_COMPLETE_STATUTES, ...RITJ_SC_COMPLETE_STATUTES,
        ...RITJ_BA_COMPLETE_STATUTES, ...RITJ_PE_COMPLETE_STATUTES, ...RITJ_CE_COMPLETE_STATUTES,
        ...RITJ_GO_COMPLETE_STATUTES, ...RITJ_DF_COMPLETE_STATUTES, ...RITJ_ES_COMPLETE_STATUTES,
        ...RITJ_AM_COMPLETE_STATUTES, ...RITJ_PA_COMPLETE_STATUTES, ...RITJ_MT_COMPLETE_STATUTES,
        ...RITJ_MS_COMPLETE_STATUTES, ...RITJ_MA_COMPLETE_STATUTES, ...RITJ_PB_COMPLETE_STATUTES,
        ...RITJ_RN_COMPLETE_STATUTES, ...RITJ_AL_COMPLETE_STATUTES, ...RITJ_SE_COMPLETE_STATUTES,
        ...RITJ_PI_COMPLETE_STATUTES, ...RITJ_RO_COMPLETE_STATUTES, ...RITJ_AC_COMPLETE_STATUTES,
        ...RITJ_AP_COMPLETE_STATUTES, ...RITJ_RR_COMPLETE_STATUTES, ...RITJ_TO_COMPLETE_STATUTES
      ];
    }
    const targetUf = uf.toUpperCase();
    return STATE_AND_MUNICIPAL_STATUTES.filter(a => 
      a.id.includes(`ritj-${targetUf.toLowerCase()}-`) || 
      a.lawName.toUpperCase().includes(`TJ${targetUf}`) ||
      a.keywords.includes(targetUf.toLowerCase())
    );
  }

  /**
   * Retorna o acervo das Leis Tributárias (ICMS, IPVA, ITCMD, PAT) das 27 UFs
   */
  public static getTributarioEstadualArticles(uf?: string): LegalArticle[] {
    if (uf && uf.toUpperCase() === 'SP') return TRIBUTARIO_SP_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RJ') return TRIBUTARIO_RJ_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'MG') return TRIBUTARIO_MG_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RS') return TRIBUTARIO_RS_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PR') return TRIBUTARIO_PR_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'SC') return TRIBUTARIO_SC_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'BA') return TRIBUTARIO_BA_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PE') return TRIBUTARIO_PE_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'CE') return TRIBUTARIO_CE_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'GO') return TRIBUTARIO_GO_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'DF') return TRIBUTARIO_DF_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'ES') return TRIBUTARIO_ES_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'AM') return TRIBUTARIO_AM_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PA') return TRIBUTARIO_PA_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'MT') return TRIBUTARIO_MT_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'MS') return TRIBUTARIO_MS_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'MA') return TRIBUTARIO_MA_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PB') return TRIBUTARIO_PB_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RN') return TRIBUTARIO_RN_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'AL') return TRIBUTARIO_AL_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'SE') return TRIBUTARIO_SE_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PI') return TRIBUTARIO_PI_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RO') return TRIBUTARIO_RO_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'AC') return TRIBUTARIO_AC_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'AP') return TRIBUTARIO_AP_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RR') return TRIBUTARIO_RR_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'TO') return TRIBUTARIO_TO_COMPLETE_STATUTES;

    if (!uf || uf.toUpperCase() === 'ALL') {
      return [
        ...TRIBUTARIO_SP_COMPLETE_STATUTES, ...TRIBUTARIO_RJ_COMPLETE_STATUTES, ...TRIBUTARIO_MG_COMPLETE_STATUTES,
        ...TRIBUTARIO_RS_COMPLETE_STATUTES, ...TRIBUTARIO_PR_COMPLETE_STATUTES, ...TRIBUTARIO_SC_COMPLETE_STATUTES,
        ...TRIBUTARIO_BA_COMPLETE_STATUTES, ...TRIBUTARIO_PE_COMPLETE_STATUTES, ...TRIBUTARIO_CE_COMPLETE_STATUTES,
        ...TRIBUTARIO_GO_COMPLETE_STATUTES, ...TRIBUTARIO_DF_COMPLETE_STATUTES, ...TRIBUTARIO_ES_COMPLETE_STATUTES,
        ...TRIBUTARIO_AM_COMPLETE_STATUTES, ...TRIBUTARIO_PA_COMPLETE_STATUTES, ...TRIBUTARIO_MT_COMPLETE_STATUTES,
        ...TRIBUTARIO_MS_COMPLETE_STATUTES, ...TRIBUTARIO_MA_COMPLETE_STATUTES, ...TRIBUTARIO_PB_COMPLETE_STATUTES,
        ...TRIBUTARIO_RN_COMPLETE_STATUTES, ...TRIBUTARIO_AL_COMPLETE_STATUTES, ...TRIBUTARIO_SE_COMPLETE_STATUTES,
        ...TRIBUTARIO_PI_COMPLETE_STATUTES, ...TRIBUTARIO_RO_COMPLETE_STATUTES, ...TRIBUTARIO_AC_COMPLETE_STATUTES,
        ...TRIBUTARIO_AP_COMPLETE_STATUTES, ...TRIBUTARIO_RR_COMPLETE_STATUTES, ...TRIBUTARIO_TO_COMPLETE_STATUTES
      ];
    }
    const targetUf = uf.toUpperCase();
    return STATE_AND_MUNICIPAL_STATUTES.filter(a => 
      a.id.includes(`tributario-${targetUf.toLowerCase()}-`) || 
      a.lawName.toUpperCase().includes(`(${targetUf}/`) ||
      a.keywords.includes(targetUf.toLowerCase())
    );
  }

  /**
   * Retorna o acervo das Normas de Licitações e Compras Públicas Estaduais das 27 UFs
   */
  
  /**
   * Retorna o acervo da Lei Orgânica Municipal (LOM) das 27 Capitais do Brasil (incluindo LODF)
   */
  
  /**
   * Retorna o acervo do Código de Obras e Edificações das Capitais do Brasil
   */
  /**
   * Retorna o acervo do Código de Obras e Edificações das Capitais do Brasil
   */
  public static getCodigoObrasMunicipalArticles(uf?: string): LegalArticle[] {
    const historical = HISTORICAL_AND_REVOKED_MUNICIPAL_STATUTES.filter(a => a.id.includes('obras-'));
    if (uf && uf.toUpperCase() !== 'ALL') {
      const targetUf = uf.toUpperCase();
      const ufHist = historical.filter(a => a.id.includes(`-${targetUf.toLowerCase()}-`) || a.keywords.includes(targetUf.toLowerCase()));
      switch (targetUf) {
        case 'SP': return [...CODIGO_OBRAS_SP_COMPLETE_STATUTES, ...ufHist];
        case 'RJ': return [...CODIGO_OBRAS_RJ_COMPLETE_STATUTES, ...ufHist];
        case 'MG': return [...CODIGO_OBRAS_MG_COMPLETE_STATUTES, ...ufHist];
        case 'RS': return [...CODIGO_OBRAS_RS_COMPLETE_STATUTES, ...ufHist];
        case 'PR': return [...CODIGO_OBRAS_PR_COMPLETE_STATUTES, ...ufHist];
        case 'SC': return [...CODIGO_OBRAS_SC_COMPLETE_STATUTES, ...ufHist];
        case 'BA': return [...CODIGO_OBRAS_BA_COMPLETE_STATUTES, ...ufHist];
        case 'PE': return [...CODIGO_OBRAS_PE_COMPLETE_STATUTES, ...ufHist];
        case 'CE': return [...CODIGO_OBRAS_CE_COMPLETE_STATUTES, ...ufHist];
        case 'GO': return [...CODIGO_OBRAS_GO_COMPLETE_STATUTES, ...ufHist];
        case 'ES': return [...CODIGO_OBRAS_ES_COMPLETE_STATUTES, ...ufHist];
        case 'AM': return [...CODIGO_OBRAS_AM_COMPLETE_STATUTES, ...ufHist];
        case 'PA': return [...CODIGO_OBRAS_PA_COMPLETE_STATUTES, ...ufHist];
        case 'MT': return [...CODIGO_OBRAS_MT_COMPLETE_STATUTES, ...ufHist];
        case 'MS': return [...CODIGO_OBRAS_MS_COMPLETE_STATUTES, ...ufHist];
        case 'MA': return [...CODIGO_OBRAS_MA_COMPLETE_STATUTES, ...ufHist];
        case 'PB': return [...CODIGO_OBRAS_PB_COMPLETE_STATUTES, ...ufHist];
        case 'RN': return [...CODIGO_OBRAS_RN_COMPLETE_STATUTES, ...ufHist];
        case 'AL': return [...CODIGO_OBRAS_AL_COMPLETE_STATUTES, ...ufHist];
        case 'SE': return [...CODIGO_OBRAS_SE_COMPLETE_STATUTES, ...ufHist];
        case 'PI': return [...CODIGO_OBRAS_PI_COMPLETE_STATUTES, ...ufHist];
        case 'RO': return [...CODIGO_OBRAS_RO_COMPLETE_STATUTES, ...ufHist];
        case 'AC': return [...CODIGO_OBRAS_AC_COMPLETE_STATUTES, ...ufHist];
        case 'AP': return [...CODIGO_OBRAS_AP_COMPLETE_STATUTES, ...ufHist];
        case 'RR': return [...CODIGO_OBRAS_RR_COMPLETE_STATUTES, ...ufHist];
        case 'TO': return [...CODIGO_OBRAS_TO_COMPLETE_STATUTES, ...ufHist];
        case 'DF': return [...CODIGO_OBRAS_DF_COMPLETE_STATUTES, ...ufHist];
      }
    }
    return [
      ...CODIGO_OBRAS_SP_COMPLETE_STATUTES, ...CODIGO_OBRAS_RJ_COMPLETE_STATUTES, ...CODIGO_OBRAS_MG_COMPLETE_STATUTES, ...CODIGO_OBRAS_RS_COMPLETE_STATUTES, ...CODIGO_OBRAS_PR_COMPLETE_STATUTES, ...CODIGO_OBRAS_SC_COMPLETE_STATUTES, ...CODIGO_OBRAS_BA_COMPLETE_STATUTES, ...CODIGO_OBRAS_PE_COMPLETE_STATUTES, ...CODIGO_OBRAS_CE_COMPLETE_STATUTES, ...CODIGO_OBRAS_GO_COMPLETE_STATUTES, ...CODIGO_OBRAS_ES_COMPLETE_STATUTES, ...CODIGO_OBRAS_AM_COMPLETE_STATUTES, ...CODIGO_OBRAS_PA_COMPLETE_STATUTES, ...CODIGO_OBRAS_MT_COMPLETE_STATUTES, ...CODIGO_OBRAS_MS_COMPLETE_STATUTES, ...CODIGO_OBRAS_MA_COMPLETE_STATUTES, ...CODIGO_OBRAS_PB_COMPLETE_STATUTES, ...CODIGO_OBRAS_RN_COMPLETE_STATUTES, ...CODIGO_OBRAS_AL_COMPLETE_STATUTES, ...CODIGO_OBRAS_SE_COMPLETE_STATUTES, ...CODIGO_OBRAS_PI_COMPLETE_STATUTES, ...CODIGO_OBRAS_RO_COMPLETE_STATUTES, ...CODIGO_OBRAS_AC_COMPLETE_STATUTES, ...CODIGO_OBRAS_AP_COMPLETE_STATUTES, ...CODIGO_OBRAS_RR_COMPLETE_STATUTES, ...CODIGO_OBRAS_TO_COMPLETE_STATUTES, ...CODIGO_OBRAS_DF_COMPLETE_STATUTES,
      ...historical
    ];
  }

  /**
   * Retorna o acervo do Código de Posturas Urbanas das Capitais do Brasil
   */
  public static getCodigoPosturasMunicipalArticles(uf?: string): LegalArticle[] {
    const historical = HISTORICAL_AND_REVOKED_MUNICIPAL_STATUTES.filter(a => a.id.includes('posturas-'));
    if (uf && uf.toUpperCase() !== 'ALL') {
      const targetUf = uf.toUpperCase();
      const ufHist = historical.filter(a => a.id.includes(`-${targetUf.toLowerCase()}-`) || a.keywords.includes(targetUf.toLowerCase()));
      switch (targetUf) {
        case 'SP': return [...POSTURAS_SP_COMPLETE_STATUTES, ...ufHist];
        case 'RJ': return [...POSTURAS_RJ_COMPLETE_STATUTES, ...ufHist];
        case 'MG': return [...POSTURAS_MG_COMPLETE_STATUTES, ...ufHist];
        case 'RS': return [...POSTURAS_RS_COMPLETE_STATUTES, ...ufHist];
        case 'PR': return [...POSTURAS_PR_COMPLETE_STATUTES, ...ufHist];
        case 'SC': return [...POSTURAS_SC_COMPLETE_STATUTES, ...ufHist];
        case 'BA': return [...POSTURAS_BA_COMPLETE_STATUTES, ...ufHist];
        case 'PE': return [...POSTURAS_PE_COMPLETE_STATUTES, ...ufHist];
        case 'CE': return [...POSTURAS_CE_COMPLETE_STATUTES, ...ufHist];
        case 'GO': return [...POSTURAS_GO_COMPLETE_STATUTES, ...ufHist];
        case 'ES': return [...POSTURAS_ES_COMPLETE_STATUTES, ...ufHist];
        case 'AM': return [...POSTURAS_AM_COMPLETE_STATUTES, ...ufHist];
        case 'PA': return [...POSTURAS_PA_COMPLETE_STATUTES, ...ufHist];
        case 'MT': return [...POSTURAS_MT_COMPLETE_STATUTES, ...ufHist];
        case 'MS': return [...POSTURAS_MS_COMPLETE_STATUTES, ...ufHist];
        case 'MA': return [...POSTURAS_MA_COMPLETE_STATUTES, ...ufHist];
        case 'PB': return [...POSTURAS_PB_COMPLETE_STATUTES, ...ufHist];
        case 'RN': return [...POSTURAS_RN_COMPLETE_STATUTES, ...ufHist];
        case 'AL': return [...POSTURAS_AL_COMPLETE_STATUTES, ...ufHist];
        case 'SE': return [...POSTURAS_SE_COMPLETE_STATUTES, ...ufHist];
        case 'PI': return [...POSTURAS_PI_COMPLETE_STATUTES, ...ufHist];
        case 'RO': return [...POSTURAS_RO_COMPLETE_STATUTES, ...ufHist];
        case 'AC': return [...POSTURAS_AC_COMPLETE_STATUTES, ...ufHist];
        case 'AP': return [...POSTURAS_AP_COMPLETE_STATUTES, ...ufHist];
        case 'RR': return [...POSTURAS_RR_COMPLETE_STATUTES, ...ufHist];
        case 'TO': return [...POSTURAS_TO_COMPLETE_STATUTES, ...ufHist];
        case 'DF': return [...POSTURAS_DF_COMPLETE_STATUTES, ...ufHist];
      }
    }
    return [
      ...POSTURAS_SP_COMPLETE_STATUTES, ...POSTURAS_RJ_COMPLETE_STATUTES, ...POSTURAS_MG_COMPLETE_STATUTES, ...POSTURAS_RS_COMPLETE_STATUTES, ...POSTURAS_PR_COMPLETE_STATUTES, ...POSTURAS_SC_COMPLETE_STATUTES, ...POSTURAS_BA_COMPLETE_STATUTES, ...POSTURAS_PE_COMPLETE_STATUTES, ...POSTURAS_CE_COMPLETE_STATUTES, ...POSTURAS_GO_COMPLETE_STATUTES, ...POSTURAS_ES_COMPLETE_STATUTES, ...POSTURAS_AM_COMPLETE_STATUTES, ...POSTURAS_PA_COMPLETE_STATUTES, ...POSTURAS_MT_COMPLETE_STATUTES, ...POSTURAS_MS_COMPLETE_STATUTES, ...POSTURAS_MA_COMPLETE_STATUTES, ...POSTURAS_PB_COMPLETE_STATUTES, ...POSTURAS_RN_COMPLETE_STATUTES, ...POSTURAS_AL_COMPLETE_STATUTES, ...POSTURAS_SE_COMPLETE_STATUTES, ...POSTURAS_PI_COMPLETE_STATUTES, ...POSTURAS_RO_COMPLETE_STATUTES, ...POSTURAS_AC_COMPLETE_STATUTES, ...POSTURAS_AP_COMPLETE_STATUTES, ...POSTURAS_RR_COMPLETE_STATUTES, ...POSTURAS_TO_COMPLETE_STATUTES, ...POSTURAS_DF_COMPLETE_STATUTES,
      ...historical
    ];
  }

  public static getLeiOrganicaMunicipalArticles(uf?: string): LegalArticle[] {
    const historical = HISTORICAL_AND_REVOKED_MUNICIPAL_STATUTES.filter(a => a.id.includes('lom'));
    if (uf && uf.toUpperCase() !== 'ALL') {
      const targetUf = uf.toUpperCase();
      const ufHist = historical.filter(a => a.id.includes(`-${targetUf.toLowerCase()}-`) || a.keywords.includes(targetUf.toLowerCase()));
      switch (targetUf) {
        case 'SP': return [...LOM_SP_COMPLETE_STATUTES, ...ufHist];
        case 'RJ': return [...LOM_RJ_COMPLETE_STATUTES, ...ufHist];
        case 'MG': return [...LOM_MG_COMPLETE_STATUTES, ...ufHist];
        case 'RS': return [...LOM_RS_COMPLETE_STATUTES, ...ufHist];
        case 'PR': return [...LOM_PR_COMPLETE_STATUTES, ...ufHist];
        case 'SC': return [...LOM_SC_COMPLETE_STATUTES, ...ufHist];
        case 'BA': return [...LOM_BA_COMPLETE_STATUTES, ...ufHist];
        case 'PE': return [...LOM_PE_COMPLETE_STATUTES, ...ufHist];
        case 'CE': return [...LOM_CE_COMPLETE_STATUTES, ...ufHist];
        case 'GO': return [...LOM_GO_COMPLETE_STATUTES, ...ufHist];
        case 'ES': return [...LOM_ES_COMPLETE_STATUTES, ...ufHist];
        case 'AM': return [...LOM_AM_COMPLETE_STATUTES, ...ufHist];
        case 'PA': return [...LOM_PA_COMPLETE_STATUTES, ...ufHist];
        case 'MT': return [...LOM_MT_COMPLETE_STATUTES, ...ufHist];
        case 'MS': return [...LOM_MS_COMPLETE_STATUTES, ...ufHist];
        case 'MA': return [...LOM_MA_COMPLETE_STATUTES, ...ufHist];
        case 'PB': return [...LOM_PB_COMPLETE_STATUTES, ...ufHist];
        case 'RN': return [...LOM_RN_COMPLETE_STATUTES, ...ufHist];
        case 'AL': return [...LOM_AL_COMPLETE_STATUTES, ...ufHist];
        case 'SE': return [...LOM_SE_COMPLETE_STATUTES, ...ufHist];
        case 'PI': return [...LOM_PI_COMPLETE_STATUTES, ...ufHist];
        case 'RO': return [...LOM_RO_COMPLETE_STATUTES, ...ufHist];
        case 'AC': return [...LOM_AC_COMPLETE_STATUTES, ...ufHist];
        case 'AP': return [...LOM_AP_COMPLETE_STATUTES, ...ufHist];
        case 'RR': return [...LOM_RR_COMPLETE_STATUTES, ...ufHist];
        case 'TO': return [...LOM_TO_COMPLETE_STATUTES, ...ufHist];
        case 'DF': return [...LODF_COMPLETE_STATUTES, ...ufHist];
      }
    }
    return [
      ...LOM_SP_COMPLETE_STATUTES, ...LOM_RJ_COMPLETE_STATUTES, ...LOM_MG_COMPLETE_STATUTES, ...LOM_RS_COMPLETE_STATUTES, ...LOM_PR_COMPLETE_STATUTES, ...LOM_SC_COMPLETE_STATUTES, ...LOM_BA_COMPLETE_STATUTES, ...LOM_PE_COMPLETE_STATUTES, ...LOM_CE_COMPLETE_STATUTES, ...LOM_GO_COMPLETE_STATUTES, ...LOM_ES_COMPLETE_STATUTES, ...LOM_AM_COMPLETE_STATUTES, ...LOM_PA_COMPLETE_STATUTES, ...LOM_MT_COMPLETE_STATUTES, ...LOM_MS_COMPLETE_STATUTES, ...LOM_MA_COMPLETE_STATUTES, ...LOM_PB_COMPLETE_STATUTES, ...LOM_RN_COMPLETE_STATUTES, ...LOM_AL_COMPLETE_STATUTES, ...LOM_SE_COMPLETE_STATUTES, ...LOM_PI_COMPLETE_STATUTES, ...LOM_RO_COMPLETE_STATUTES, ...LOM_AC_COMPLETE_STATUTES, ...LOM_AP_COMPLETE_STATUTES, ...LOM_RR_COMPLETE_STATUTES, ...LOM_TO_COMPLETE_STATUTES, ...LODF_COMPLETE_STATUTES,
      ...historical
    ];
  }

  /**
   * Retorna o acervo do Código Tributário Municipal (CTM/ISS) das Capitais do Brasil
   */
  public static getTributarioMunicipalArticles(uf?: string): LegalArticle[] {
    const historical = HISTORICAL_AND_REVOKED_MUNICIPAL_STATUTES.filter(a => a.id.includes('tributario-mun'));
    if (uf && uf.toUpperCase() !== 'ALL') {
      const targetUf = uf.toUpperCase();
      const ufHist = historical.filter(a => a.id.includes(`-${targetUf.toLowerCase()}-`) || a.keywords.includes(targetUf.toLowerCase()));
      switch (targetUf) {
        case 'SP': return [...TRIBUTARIO_SP_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'RJ': return [...TRIBUTARIO_RJ_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'MG': return [...TRIBUTARIO_MG_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'RS': return [...TRIBUTARIO_RS_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'PR': return [...TRIBUTARIO_PR_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'SC': return [...TRIBUTARIO_SC_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'BA': return [...TRIBUTARIO_BA_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'PE': return [...TRIBUTARIO_PE_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'CE': return [...TRIBUTARIO_CE_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'GO': return [...TRIBUTARIO_GO_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'ES': return [...TRIBUTARIO_ES_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'AM': return [...TRIBUTARIO_AM_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'PA': return [...TRIBUTARIO_PA_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'MT': return [...TRIBUTARIO_MT_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'MS': return [...TRIBUTARIO_MS_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'MA': return [...TRIBUTARIO_MA_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'PB': return [...TRIBUTARIO_PB_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'RN': return [...TRIBUTARIO_RN_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'AL': return [...TRIBUTARIO_AL_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'SE': return [...TRIBUTARIO_SE_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'PI': return [...TRIBUTARIO_PI_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'RO': return [...TRIBUTARIO_RO_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'AC': return [...TRIBUTARIO_AC_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'AP': return [...TRIBUTARIO_AP_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'RR': return [...TRIBUTARIO_RR_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'TO': return [...TRIBUTARIO_TO_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'DF': return [...TRIBUTARIO_DF_MUN_COMPLETE_STATUTES, ...ufHist];
      }
    }
    return [
      ...TRIBUTARIO_SP_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_RJ_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_MG_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_RS_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_PR_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_SC_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_BA_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_PE_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_CE_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_GO_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_ES_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_AM_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_PA_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_MT_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_MS_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_MA_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_PB_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_RN_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_AL_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_SE_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_PI_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_RO_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_AC_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_AP_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_RR_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_TO_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_DF_MUN_COMPLETE_STATUTES,
      ...historical
    ];
  }

  /**
   * Retorna o acervo do Estatuto dos Servidores Municipais das Capitais do Brasil
   */
  public static getEstatutoServidoresMunicipaisArticles(uf?: string): LegalArticle[] {
    const historical = HISTORICAL_AND_REVOKED_MUNICIPAL_STATUTES.filter(a => a.id.includes('estatuto-mun'));
    if (uf && uf.toUpperCase() !== 'ALL') {
      const targetUf = uf.toUpperCase();
      const ufHist = historical.filter(a => a.id.includes(`-${targetUf.toLowerCase()}-`) || a.keywords.includes(targetUf.toLowerCase()));
      switch (targetUf) {
        case 'SP': return [...ESTATUTO_SP_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'RJ': return [...ESTATUTO_RJ_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'MG': return [...ESTATUTO_MG_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'RS': return [...ESTATUTO_RS_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'PR': return [...ESTATUTO_PR_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'SC': return [...ESTATUTO_SC_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'BA': return [...ESTATUTO_BA_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'PE': return [...ESTATUTO_PE_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'CE': return [...ESTATUTO_CE_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'GO': return [...ESTATUTO_GO_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'ES': return [...ESTATUTO_ES_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'AM': return [...ESTATUTO_AM_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'PA': return [...ESTATUTO_PA_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'MT': return [...ESTATUTO_MT_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'MS': return [...ESTATUTO_MS_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'MA': return [...ESTATUTO_MA_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'PB': return [...ESTATUTO_PB_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'RN': return [...ESTATUTO_RN_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'AL': return [...ESTATUTO_AL_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'SE': return [...ESTATUTO_SE_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'PI': return [...ESTATUTO_PI_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'RO': return [...ESTATUTO_RO_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'AC': return [...ESTATUTO_AC_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'AP': return [...ESTATUTO_AP_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'RR': return [...ESTATUTO_RR_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'TO': return [...ESTATUTO_TO_MUN_COMPLETE_STATUTES, ...ufHist];
        case 'DF': return [...ESTATUTO_DF_MUN_COMPLETE_STATUTES, ...ufHist];
      }
    }
    return [
      ...ESTATUTO_SP_MUN_COMPLETE_STATUTES, ...ESTATUTO_RJ_MUN_COMPLETE_STATUTES, ...ESTATUTO_MG_MUN_COMPLETE_STATUTES, ...ESTATUTO_RS_MUN_COMPLETE_STATUTES, ...ESTATUTO_PR_MUN_COMPLETE_STATUTES, ...ESTATUTO_SC_MUN_COMPLETE_STATUTES, ...ESTATUTO_BA_MUN_COMPLETE_STATUTES, ...ESTATUTO_PE_MUN_COMPLETE_STATUTES, ...ESTATUTO_CE_MUN_COMPLETE_STATUTES, ...ESTATUTO_GO_MUN_COMPLETE_STATUTES, ...ESTATUTO_ES_MUN_COMPLETE_STATUTES, ...ESTATUTO_AM_MUN_COMPLETE_STATUTES, ...ESTATUTO_PA_MUN_COMPLETE_STATUTES, ...ESTATUTO_MT_MUN_COMPLETE_STATUTES, ...ESTATUTO_MS_MUN_COMPLETE_STATUTES, ...ESTATUTO_MA_MUN_COMPLETE_STATUTES, ...ESTATUTO_PB_MUN_COMPLETE_STATUTES, ...ESTATUTO_RN_MUN_COMPLETE_STATUTES, ...ESTATUTO_AL_MUN_COMPLETE_STATUTES, ...ESTATUTO_SE_MUN_COMPLETE_STATUTES, ...ESTATUTO_PI_MUN_COMPLETE_STATUTES, ...ESTATUTO_RO_MUN_COMPLETE_STATUTES, ...ESTATUTO_AC_MUN_COMPLETE_STATUTES, ...ESTATUTO_AP_MUN_COMPLETE_STATUTES, ...ESTATUTO_RR_MUN_COMPLETE_STATUTES, ...ESTATUTO_TO_MUN_COMPLETE_STATUTES, ...ESTATUTO_DF_MUN_COMPLETE_STATUTES,
      ...historical
    ];
  }

  public static getLicitacoesEstaduaisArticles(uf?: string): LegalArticle[] {
    if (uf && uf.toUpperCase() === 'SP') return LICITACOES_SP_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RJ') return LICITACOES_RJ_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'MG') return LICITACOES_MG_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RS') return LICITACOES_RS_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PR') return LICITACOES_PR_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'SC') return LICITACOES_SC_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'BA') return LICITACOES_BA_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PE') return LICITACOES_PE_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'CE') return LICITACOES_CE_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'GO') return LICITACOES_GO_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'DF') return LICITACOES_DF_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'ES') return LICITACOES_ES_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'AM') return LICITACOES_AM_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PA') return LICITACOES_PA_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'MT') return LICITACOES_MT_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'MS') return LICITACOES_MS_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'MA') return LICITACOES_MA_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PB') return LICITACOES_PB_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RN') return LICITACOES_RN_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'AL') return LICITACOES_AL_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'SE') return LICITACOES_SE_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'PI') return LICITACOES_PI_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RO') return LICITACOES_RO_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'AC') return LICITACOES_AC_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'AP') return LICITACOES_AP_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'RR') return LICITACOES_RR_COMPLETE_STATUTES;
    if (uf && uf.toUpperCase() === 'TO') return LICITACOES_TO_COMPLETE_STATUTES;

    if (!uf || uf.toUpperCase() === 'ALL') {
      return [
        ...LICITACOES_SP_COMPLETE_STATUTES, ...LICITACOES_RJ_COMPLETE_STATUTES, ...LICITACOES_MG_COMPLETE_STATUTES,
        ...LICITACOES_RS_COMPLETE_STATUTES, ...LICITACOES_PR_COMPLETE_STATUTES, ...LICITACOES_SC_COMPLETE_STATUTES,
        ...LICITACOES_BA_COMPLETE_STATUTES, ...LICITACOES_PE_COMPLETE_STATUTES, ...LICITACOES_CE_COMPLETE_STATUTES,
        ...LICITACOES_GO_COMPLETE_STATUTES, ...LICITACOES_DF_COMPLETE_STATUTES, ...LICITACOES_ES_COMPLETE_STATUTES,
        ...LICITACOES_AM_COMPLETE_STATUTES, ...LICITACOES_PA_COMPLETE_STATUTES, ...LICITACOES_MT_COMPLETE_STATUTES,
        ...LICITACOES_MS_COMPLETE_STATUTES, ...LICITACOES_MA_COMPLETE_STATUTES, ...LICITACOES_PB_COMPLETE_STATUTES,
        ...LICITACOES_RN_COMPLETE_STATUTES, ...LICITACOES_AL_COMPLETE_STATUTES, ...LICITACOES_SE_COMPLETE_STATUTES,
        ...LICITACOES_PI_COMPLETE_STATUTES, ...LICITACOES_RO_COMPLETE_STATUTES, ...LICITACOES_AC_COMPLETE_STATUTES,
        ...LICITACOES_AP_COMPLETE_STATUTES, ...LICITACOES_RR_COMPLETE_STATUTES, ...LICITACOES_TO_COMPLETE_STATUTES
      ];
    }
    const targetUf = uf.toUpperCase();
    return STATE_AND_MUNICIPAL_STATUTES.filter(a => 
      a.id.includes(`licitacoes-${targetUf.toLowerCase()}-`) || 
      a.lawName.toUpperCase().includes(`(${targetUf}/`) ||
      a.keywords.includes(targetUf.toLowerCase())
    );
  }

  /**
   * Retorna os códigos e leis base (Constituição, Código Civil, CPC, CLT, Leis Federais, Estaduais e Municipais)
   */
  public static getCoreArticles(): LegalArticle[] {
    if (!this._memoizedCore) {
      const customArticles = CustomLegalKnowledgeService.getCustomArticles();
      this._memoizedCore = [
        ...LEGAL_KNOWLEDGE_BASE, 
        ...MASSIVE_FEDERAL_STATUTES, 
        ...CPC_COMPLETE_STATUTES,
        ...CLT_COMPLETE_STATUTES,
        ...CC_COMPLETE_STATUTES,
        ...PENAL_COMPLETE_STATUTES,
        ...CTN_COMPLETE_STATUTES,
        ...LICITACOES_COMPLETE_STATUTES,
        ...LGPD_COMPLETE_STATUTES,
        ...CDC_COMPLETE_STATUTES,
        ...LIA_COMPLETE_STATUTES,
        ...INQUILINATO_COMPLETE_STATUTES,
        ...PREVIDENCIARIO_COMPLETE_STATUTES,
        ...FALENCIAS_COMPLETE_STATUTES,
        ...ECA_COMPLETE_STATUTES,
        ...CTB_COMPLETE_STATUTES,
        ...OAB_COMPLETE_STATUTES,
        ...LEP_COMPLETE_STATUTES,
        ...LJE_COMPLETE_STATUTES,
        ...MARIA_DA_PENHA_COMPLETE_STATUTES,
        ...CESP_COMPLETE_STATUTES,
        ...CERJ_COMPLETE_STATUTES,
        ...CEMG_COMPLETE_STATUTES,
        ...CERS_COMPLETE_STATUTES,
        ...CEPR_COMPLETE_STATUTES,
        ...CESC_COMPLETE_STATUTES,
        ...CEBA_COMPLETE_STATUTES,
        ...CEPE_COMPLETE_STATUTES,
        ...CECE_COMPLETE_STATUTES,
        ...CEGO_COMPLETE_STATUTES,
        ...LODF_COMPLETE_STATUTES,
        ...CEES_COMPLETE_STATUTES,
        ...CEAM_COMPLETE_STATUTES,
        ...CEPA_COMPLETE_STATUTES,
        ...CEMT_COMPLETE_STATUTES,
        ...CEMS_COMPLETE_STATUTES,
        ...CEMA_COMPLETE_STATUTES,
        ...CEPB_COMPLETE_STATUTES,
        ...CERN_COMPLETE_STATUTES,
        ...CEAL_COMPLETE_STATUTES,
        ...CESE_COMPLETE_STATUTES,
        ...CEPI_COMPLETE_STATUTES,
        ...CERO_COMPLETE_STATUTES,
        ...CEAC_COMPLETE_STATUTES,
        ...CEAP_COMPLETE_STATUTES,
        ...CERR_COMPLETE_STATUTES,
        ...CETO_COMPLETE_STATUTES,
        ...ESTATUTO_SP_COMPLETE_STATUTES, ...ESTATUTO_RJ_COMPLETE_STATUTES, ...ESTATUTO_MG_COMPLETE_STATUTES,
        ...ESTATUTO_RS_COMPLETE_STATUTES, ...ESTATUTO_PR_COMPLETE_STATUTES, ...ESTATUTO_SC_COMPLETE_STATUTES,
        ...ESTATUTO_BA_COMPLETE_STATUTES, ...ESTATUTO_PE_COMPLETE_STATUTES, ...ESTATUTO_CE_COMPLETE_STATUTES,
        ...ESTATUTO_GO_COMPLETE_STATUTES, ...ESTATUTO_DF_COMPLETE_STATUTES, ...ESTATUTO_ES_COMPLETE_STATUTES,
        ...ESTATUTO_AM_COMPLETE_STATUTES, ...ESTATUTO_PA_COMPLETE_STATUTES, ...ESTATUTO_MT_COMPLETE_STATUTES,
        ...ESTATUTO_MS_COMPLETE_STATUTES, ...ESTATUTO_MA_COMPLETE_STATUTES, ...ESTATUTO_PB_COMPLETE_STATUTES,
        ...ESTATUTO_RN_COMPLETE_STATUTES, ...ESTATUTO_AL_COMPLETE_STATUTES, ...ESTATUTO_SE_COMPLETE_STATUTES,
        ...ESTATUTO_PI_COMPLETE_STATUTES, ...ESTATUTO_RO_COMPLETE_STATUTES, ...ESTATUTO_AC_COMPLETE_STATUTES,
        ...ESTATUTO_AP_COMPLETE_STATUTES, ...ESTATUTO_RR_COMPLETE_STATUTES, ...ESTATUTO_TO_COMPLETE_STATUTES,
        ...RITJSP_COMPLETE_STATUTES, ...RITJ_RJ_COMPLETE_STATUTES, ...RITJ_MG_COMPLETE_STATUTES,
        ...RITJ_RS_COMPLETE_STATUTES, ...RITJ_PR_COMPLETE_STATUTES, ...RITJ_SC_COMPLETE_STATUTES,
        ...RITJ_BA_COMPLETE_STATUTES, ...RITJ_PE_COMPLETE_STATUTES, ...RITJ_CE_COMPLETE_STATUTES,
        ...RITJ_GO_COMPLETE_STATUTES, ...RITJ_DF_COMPLETE_STATUTES, ...RITJ_ES_COMPLETE_STATUTES,
        ...RITJ_AM_COMPLETE_STATUTES, ...RITJ_PA_COMPLETE_STATUTES, ...RITJ_MT_COMPLETE_STATUTES,
        ...RITJ_MS_COMPLETE_STATUTES, ...RITJ_MA_COMPLETE_STATUTES, ...RITJ_PB_COMPLETE_STATUTES,
        ...RITJ_RN_COMPLETE_STATUTES, ...RITJ_AL_COMPLETE_STATUTES, ...RITJ_SE_COMPLETE_STATUTES,
        ...RITJ_PI_COMPLETE_STATUTES, ...RITJ_RO_COMPLETE_STATUTES, ...RITJ_AC_COMPLETE_STATUTES,
        ...RITJ_AP_COMPLETE_STATUTES, ...RITJ_RR_COMPLETE_STATUTES, ...RITJ_TO_COMPLETE_STATUTES,
        ...TRIBUTARIO_SP_COMPLETE_STATUTES, ...TRIBUTARIO_RJ_COMPLETE_STATUTES, ...TRIBUTARIO_MG_COMPLETE_STATUTES,
        ...TRIBUTARIO_RS_COMPLETE_STATUTES, ...TRIBUTARIO_PR_COMPLETE_STATUTES, ...TRIBUTARIO_SC_COMPLETE_STATUTES,
        ...TRIBUTARIO_BA_COMPLETE_STATUTES, ...TRIBUTARIO_PE_COMPLETE_STATUTES, ...TRIBUTARIO_CE_COMPLETE_STATUTES,
        ...TRIBUTARIO_GO_COMPLETE_STATUTES, ...TRIBUTARIO_DF_COMPLETE_STATUTES, ...TRIBUTARIO_ES_COMPLETE_STATUTES,
        ...TRIBUTARIO_AM_COMPLETE_STATUTES, ...TRIBUTARIO_PA_COMPLETE_STATUTES, ...TRIBUTARIO_MT_COMPLETE_STATUTES,
        ...TRIBUTARIO_MS_COMPLETE_STATUTES, ...TRIBUTARIO_MA_COMPLETE_STATUTES, ...TRIBUTARIO_PB_COMPLETE_STATUTES,
        ...TRIBUTARIO_RN_COMPLETE_STATUTES, ...TRIBUTARIO_AL_COMPLETE_STATUTES, ...TRIBUTARIO_SE_COMPLETE_STATUTES,
        ...TRIBUTARIO_PI_COMPLETE_STATUTES, ...TRIBUTARIO_RO_COMPLETE_STATUTES, ...TRIBUTARIO_AC_COMPLETE_STATUTES,
        ...TRIBUTARIO_AP_COMPLETE_STATUTES, ...TRIBUTARIO_RR_COMPLETE_STATUTES, ...TRIBUTARIO_TO_COMPLETE_STATUTES,
        ...LICITACOES_SP_COMPLETE_STATUTES, ...LICITACOES_RJ_COMPLETE_STATUTES, ...LICITACOES_MG_COMPLETE_STATUTES,
        ...LICITACOES_RS_COMPLETE_STATUTES, ...LICITACOES_PR_COMPLETE_STATUTES, ...LICITACOES_SC_COMPLETE_STATUTES,
        ...LICITACOES_BA_COMPLETE_STATUTES, ...LICITACOES_PE_COMPLETE_STATUTES, ...LICITACOES_CE_COMPLETE_STATUTES,
        ...LICITACOES_GO_COMPLETE_STATUTES, ...LICITACOES_DF_COMPLETE_STATUTES, ...LICITACOES_ES_COMPLETE_STATUTES,
        ...LICITACOES_AM_COMPLETE_STATUTES, ...LICITACOES_PA_COMPLETE_STATUTES, ...LICITACOES_MT_COMPLETE_STATUTES,
        ...LICITACOES_MS_COMPLETE_STATUTES, ...LICITACOES_MA_COMPLETE_STATUTES, ...LICITACOES_PB_COMPLETE_STATUTES,
        ...LICITACOES_RN_COMPLETE_STATUTES, ...LICITACOES_AL_COMPLETE_STATUTES, ...LICITACOES_SE_COMPLETE_STATUTES,
        ...LICITACOES_PI_COMPLETE_STATUTES, ...LICITACOES_RO_COMPLETE_STATUTES, ...LICITACOES_AC_COMPLETE_STATUTES,
        ...LICITACOES_AP_COMPLETE_STATUTES, ...LICITACOES_RR_COMPLETE_STATUTES, ...LICITACOES_TO_COMPLETE_STATUTES,
        ...LOM_SP_COMPLETE_STATUTES, ...LOM_RJ_COMPLETE_STATUTES, ...LOM_MG_COMPLETE_STATUTES, ...LOM_RS_COMPLETE_STATUTES, ...LOM_PR_COMPLETE_STATUTES, ...LOM_SC_COMPLETE_STATUTES, ...LOM_BA_COMPLETE_STATUTES, ...LOM_PE_COMPLETE_STATUTES, ...LOM_CE_COMPLETE_STATUTES, ...LOM_GO_COMPLETE_STATUTES, ...LOM_ES_COMPLETE_STATUTES, ...LOM_AM_COMPLETE_STATUTES, ...LOM_PA_COMPLETE_STATUTES, ...LOM_MT_COMPLETE_STATUTES, ...LOM_MS_COMPLETE_STATUTES, ...LOM_MA_COMPLETE_STATUTES, ...LOM_PB_COMPLETE_STATUTES, ...LOM_RN_COMPLETE_STATUTES, ...LOM_AL_COMPLETE_STATUTES, ...LOM_SE_COMPLETE_STATUTES, ...LOM_PI_COMPLETE_STATUTES, ...LOM_RO_COMPLETE_STATUTES, ...LOM_AC_COMPLETE_STATUTES, ...LOM_AP_COMPLETE_STATUTES, ...LOM_RR_COMPLETE_STATUTES, ...LOM_TO_COMPLETE_STATUTES,
        ...TRIBUTARIO_SP_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_RJ_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_MG_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_RS_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_PR_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_SC_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_BA_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_PE_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_CE_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_GO_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_ES_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_AM_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_PA_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_MT_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_MS_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_MA_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_PB_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_RN_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_AL_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_SE_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_PI_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_RO_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_AC_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_AP_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_RR_MUN_COMPLETE_STATUTES, ...TRIBUTARIO_TO_MUN_COMPLETE_STATUTES,
        ...ESTATUTO_SP_MUN_COMPLETE_STATUTES, ...ESTATUTO_RJ_MUN_COMPLETE_STATUTES, ...ESTATUTO_MG_MUN_COMPLETE_STATUTES, ...ESTATUTO_RS_MUN_COMPLETE_STATUTES, ...ESTATUTO_PR_MUN_COMPLETE_STATUTES, ...ESTATUTO_SC_MUN_COMPLETE_STATUTES, ...ESTATUTO_BA_MUN_COMPLETE_STATUTES, ...ESTATUTO_PE_MUN_COMPLETE_STATUTES, ...ESTATUTO_CE_MUN_COMPLETE_STATUTES, ...ESTATUTO_GO_MUN_COMPLETE_STATUTES, ...ESTATUTO_ES_MUN_COMPLETE_STATUTES, ...ESTATUTO_AM_MUN_COMPLETE_STATUTES, ...ESTATUTO_PA_MUN_COMPLETE_STATUTES, ...ESTATUTO_MT_MUN_COMPLETE_STATUTES, ...ESTATUTO_MS_MUN_COMPLETE_STATUTES, ...ESTATUTO_MA_MUN_COMPLETE_STATUTES, ...ESTATUTO_PB_MUN_COMPLETE_STATUTES, ...ESTATUTO_RN_MUN_COMPLETE_STATUTES, ...ESTATUTO_AL_MUN_COMPLETE_STATUTES, ...ESTATUTO_SE_MUN_COMPLETE_STATUTES, ...ESTATUTO_PI_MUN_COMPLETE_STATUTES, ...ESTATUTO_RO_MUN_COMPLETE_STATUTES, ...ESTATUTO_AC_MUN_COMPLETE_STATUTES, ...ESTATUTO_AP_MUN_COMPLETE_STATUTES, ...ESTATUTO_RR_MUN_COMPLETE_STATUTES, ...ESTATUTO_TO_MUN_COMPLETE_STATUTES,
        ...this.getCodigoObrasMunicipalArticles('ALL'),
        ...this.getCodigoPosturasMunicipalArticles('ALL'),
        ...STATE_CONSTITUTIONS_STATUTES,
        ...COMPLETE_CONSTITUTION_STATUTES, 
        ...HISTORICAL_AND_REVOKED_STATUTES, 
        ...HISTORICAL_AND_REVOKED_MUNICIPAL_STATUTES, 
        ...STATE_AND_MUNICIPAL_STATUTES, 
        ...customArticles
      ];
    }
    return this._memoizedCore;
  }

  /**
   * Retorna todos os artigos da base legislativa com memoização lazy para evitar recalculamento de arrays em buscas
   */
  static getAllArticles(): LegalArticle[] {
    if (!this._memoizedAllArticles) {
      this._memoizedAllArticles = [
        ...this.getCoreArticles(),
        ...this.getSTFArticles(),
        ...this.getSTJArticles(),
        ...this.getTSTArticles()
      ];
    }
    return this._memoizedAllArticles;
  }

  /**
   * Identifica o domínio jurídico regente da consulta via metadados de palavras-chave
   */
  public static detectQueryCategory(query: string, documentText: string = ''): LegalDomainCategory {
    const q = `${query} ${documentText}`.toLowerCase();

    if (/(trabalh|clt|demis|demitid|empregad|insalubr|periculos|rescis|prescrição bienal)/.test(q)) {
      return 'DIREITO_TRABALHISTA';
    }
    if (/(licitaç|14\.133|pregão|edital|impugna|certame|prefeitura|órgão público|dispensa|inexigib|improbidade)/.test(q)) {
      return 'LICITACOES_ADMINISTRATIVO';
    }
    if (/(inquilin|locaç|locador|locatári|alugue|reajuste|igpm|ipca|preferência|vender o imóvel|8\.245)/.test(q)) {
      return 'DIREITO_CIVIL_LOCACAO';
    }
    if (/(consumidor|cdc|8\.078|arrependi|compras online|devolver|devolução|fornecedor)/.test(q)) {
      return 'DIREITO_CONSUMIDOR_CDC';
    }
    if (/(lgpd|13\.709|dados pessoais|sensív|vazamento|anpd|dpo|incidente|titular)/.test(q)) {
      return 'DIREITO_DIGITAL_LGPD';
    }
    if (/(cpc|13\.105|processo civil|petição inicial|tempestiv|tutela|agravo|recurso)/.test(q)) {
      return 'DIREITO_PROCESSUAL_CPC';
    }
    if (/(constituiç|cf\/88|artigo 5|direitos fundamentais|limpe)/.test(q)) {
      return 'DIREITO_CONSTITUCIONAL';
    }

    return 'GERAL';
  }

  /**
   * Realiza busca estatística avançada com algoritmo BM25 e Ancoragem por Metadados de Categorização por Domínio
   */
  public static searchAllLaws(query: string, documentText: string = '', maxResults: number = 5): LegalArticle[] {
    const allArticles = this.getAllArticles();
    const detectedCategory = this.detectQueryCategory(query, documentText);
    
    console.log(`🏷️ [Ancoragem RAG Oficial] Domínio Detectado: ${detectedCategory}`);

    const combinedQuery = `${query} ${documentText}`.toLowerCase().replace(/[^\w\sáéíóúâêîôûãõç]/g, ' ');

    // 1. Consulta pontual para um Artigo Específico por Número (ex: "artigo 37", "artigo 1º", "art. 144", "artigo 225 da constituição")
    const singleArtMatch = combinedQuery.match(/(?:artigo|art\.?)\s*(\d+)/i);
    const rangeMatch = combinedQuery.match(/artigos?\s+(\d+)\s*(?:a|ao|até|-)\s*(\d+)/i);

    if (detectedCategory === 'DIREITO_CONSTITUCIONAL' && singleArtMatch && !rangeMatch && !/(primeiros|vários|varios|quais\s+são\s+os\s+primeiros)/i.test(combinedQuery)) {
      const targetNum = parseInt(singleArtMatch[1], 10);
      if (!isNaN(targetNum) && targetNum >= 1 && targetNum <= 250) {
        const constArticles = allArticles.filter(a => a.lawName.includes('CF/88') || a.lawName.includes('Constituição'));
        const targetArt = constArticles.find(a => {
          const num = parseInt(a.article.replace(/\D/g, ''), 10);
          return num === targetNum;
        });
        if (targetArt) {
          return [targetArt];
        }
      }
    }

    // 2. Consulta por Faixa/Intervalo de Artigos da Constituição (ex: "artigos 1 a 25", "artigos 10 ao 20", "artigos 1 até 15")
    if (detectedCategory === 'DIREITO_CONSTITUCIONAL' && rangeMatch) {
      const startNum = parseInt(rangeMatch[1], 10);
      const endNum = parseInt(rangeMatch[2], 10);
      if (!isNaN(startNum) && !isNaN(endNum) && startNum <= endNum) {
        const constArticles = allArticles.filter(a => a.lawName.includes('CF/88') || a.lawName.includes('Constituição'));
        const rangeArticles = constArticles.filter(a => {
          const num = parseInt(a.article.replace(/\D/g, ''), 10);
          return num >= startNum && num <= endNum;
        });
        if (rangeArticles.length > 0) {
          return rangeArticles;
        }
      }
    }

    // 3. Consulta plural para Sequências Iniciais de Artigos da Constituição (ex: "5 primeiros artigos", "quais os primeiros artigos")
    if (detectedCategory === 'DIREITO_CONSTITUCIONAL' && /(primeiros|artigos\s+1\b)/i.test(combinedQuery)) {
      const constArticles = allArticles.filter(a => a.lawName.includes('CF/88') || a.lawName.includes('Constituição'));
      const limit = Math.max(maxResults, 5);
      const sequential = constArticles.slice(0, limit);
      if (sequential.length > 0) {
        return sequential;
      }
    }

    // Permite termos curtos incluindo números de artigos (ex: "1", "2", "3", "4", "5", "5º")
    const rawTerms = Array.from(new Set(combinedQuery.split(/\s+/).filter(w => w.length > 2 || /^\d+º?$/.test(w))));
    const queryTerms = rawTerms.filter(w => !LEGAL_STOP_WORDS.has(w));

    if (queryTerms.length === 0 && detectedCategory === 'GERAL') {
      return [];
    }

    const searchTerms = queryTerms.length > 0 ? queryTerms : rawTerms;

    // Parâmetros BM25
    const k1 = 1.5;
    const b = 0.75;
    const N = allArticles.length;
    
    // Comprimento médio dos documentos
    const docLengths = allArticles.map(a => a.content.length);
    const avgdl = docLengths.reduce((acc, len) => acc + len, 0) / N || 1;

    // Frequência de Documentos (DF) para cálculo de IDF
    const dfMap: Record<string, number> = {};
    searchTerms.forEach(term => {
      let count = 0;
      allArticles.forEach(art => {
        if (art.content.toLowerCase().includes(term) || art.title.toLowerCase().includes(term)) {
          count++;
        }
      });
      dfMap[term] = count;
    });

    const scoredArticles = allArticles.map((article, idx) => {
      let bm25Score = 0;
      const lowerContent = `${article.lawName} ${article.title} ${article.content}`.toLowerCase();
      const docLen = docLengths[idx];

      searchTerms.forEach(term => {
        const df = dfMap[term] || 0;
        if (df === 0) return;

        // IDF Suavizado
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        
        // Frequência do termo no artigo (TF)
        const tf = (lowerContent.match(new RegExp(term, 'gi')) || []).length;
        if (tf === 0) return;

        const termScore = idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgdl))));
        bm25Score += termScore;
      });

      // Bônus para Palavras-Chave de Domínio Exato
      article.keywords.forEach(kw => {
        if (combinedQuery.includes(kw.toLowerCase())) {
          bm25Score += 4.0;
        }
      });

      // BÔNUS MASSIVO DE CATEGORIZAÇÃO (+12.0): Prioriza a legislação regente do domínio correto
      const lawUpper = article.lawName.toUpperCase();
      if (detectedCategory === 'DIREITO_TRABALHISTA' && (lawUpper.includes('CLT') || lawUpper.includes('TRABALH'))) {
        bm25Score += 12.0;
      } else if (detectedCategory === 'LICITACOES_ADMINISTRATIVO' && (lawUpper.includes('14.133') || lawUpper.includes('LICITAÇ') || lawUpper.includes('IMPROBIDADE'))) {
        bm25Score += 12.0;
      } else if (detectedCategory === 'DIREITO_CIVIL_LOCACAO' && (lawUpper.includes('INQUILINATO') || lawUpper.includes('8.245') || lawUpper.includes('CÓDIGO CIVIL'))) {
        bm25Score += 12.0;
      } else if (detectedCategory === 'DIREITO_CONSUMIDOR_CDC' && lawUpper.includes('CDC')) {
        bm25Score += 12.0;
      } else if (detectedCategory === 'DIREITO_DIGITAL_LGPD' && lawUpper.includes('LGPD')) {
        bm25Score += 12.0;
      } else if (detectedCategory === 'DIREITO_PROCESSUAL_CPC' && lawUpper.includes('CPC')) {
        bm25Score += 12.0;
      } else if (detectedCategory === 'DIREITO_CONSTITUCIONAL' && (lawUpper.includes('CONSTITUIÇÃO') || lawUpper.includes('CF/88') || lawUpper.includes('CF88'))) {
        bm25Score += 12.0;
      }

      return { article, score: bm25Score };
    });

    const minScoreThreshold = (detectedCategory !== 'GERAL') ? 1.0 : 2.5;

    return scoredArticles
      .filter(item => item.score >= minScoreThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(item => item.article);
  }

  /**
   * Realiza busca semântica/por palavras-chave na base de leis filtrando pelo perfil ativo e acervo local
   */
  static searchRelevantLaws(query: string, documentText: string = '', profileId: string): LegalArticle[] {
    const results = this.searchAllLaws(query, documentText, 8);

    const reRanked = results.map(article => {
      let score = 1.0;
      if (profileId === 'lgpd' && article.lawName.includes('LGPD')) score += 5;
      if (profileId === 'cpc' && article.lawName.includes('CPC')) score += 5;
      if (profileId === 'clt' && article.lawName.includes('CLT')) score += 5;
      if (profileId === 'licitacoes' && (article.lawName.includes('14.133') || article.lawName.toLowerCase().includes('municipal'))) score += 5;
      if (profileId === 'contratos' && (article.lawName.includes('Civil') || article.lawName.includes('CDC'))) score += 5;
      return { article, score };
    });

    return reRanked
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(r => r.article);
  }

  /**
   * Formata uma citação legal profissional para inclusão em petições ou pareceres ABNT/PJe
   */
  public static formatCitation(article: LegalArticle, style: 'PETICAO_ABNT' | 'ABNT_DIRETA' | 'RESUMO_LEGAL' = 'PETICAO_ABNT'): string {
    switch (style) {
      case 'PETICAO_ABNT':
        return `Conforme dispõe o ${article.article} da ${article.lawName} (${article.title}):\n\n"${article.content}"\n(Fonte: ${article.officialRef || article.lawName})`;
      case 'ABNT_DIRETA':
        return `"${article.content}" (${article.lawName}, ${article.article}).`;
      case 'RESUMO_LEGAL':
        return `📌 ${article.lawName} - ${article.article} (${article.title})\nDispositivo: ${article.content}`;
      default:
        return `${article.lawName} - ${article.article}: ${article.content}`;
    }
  }

  /**
   * Análise automática de um documento anexado para recomendar leis e jurisprudências aplicáveis
   */
  public static analyzeDocumentForLaws(documentText: string): {
    category: LegalDomainCategory;
    categoryLabel: string;
    recommendedArticles: LegalArticle[];
    jurisprudence: LegalArticle[];
    diagnosticNotes: string[];
  } {
    const category = this.detectQueryCategory('', documentText);
    const categoryLabels: Record<LegalDomainCategory, string> = {
      DIREITO_TRABALHISTA: 'Direito do Trabalho & Relações Empregatícias',
      LICITACOES_ADMINISTRATIVO: 'Licitações & Contratações Públicas (Lei 14.133/21)',
      DIREITO_CIVIL_LOCACAO: 'Direito Civil & Contratos de Locação',
      DIREITO_CONSUMIDOR_CDC: 'Direito do Consumidor & Relações de Consumo',
      DIREITO_DIGITAL_LGPD: 'Privacidade, Proteção de Dados (LGPD) & Direito Digital',
      DIREITO_PROCESSUAL_CPC: 'Direito Processual Civil & Prática nos Tribunais',
      DIREITO_CONSTITUCIONAL: 'Direito Constitucional & Garantias Fundamentais',
      GERAL: 'Direito Geral / Multidisciplinar'
    };

    // Recupera artigos mais relevantes
    const recommendedArticles = this.searchAllLaws('relevante', documentText, 8);
    const jurisprudence = JURISPRUDENCE_STATUTES.filter(j => {
      const lowerDoc = documentText.toLowerCase();
      return j.keywords.some(kw => lowerDoc.includes(kw.toLowerCase()));
    }).slice(0, 4);

    const diagnosticNotes: string[] = [];
    if (documentText.length < 50) {
      diagnosticNotes.push('⚠️ Documento muito curto para diagnóstico detalhado. Cole um trecho maior.');
    } else {
      diagnosticNotes.push(`✅ Domínio jurídico principal identificado: ${categoryLabels[category]}`);
      diagnosticNotes.push(`📊 ${recommendedArticles.length} dispositivo(s) legal(is) de alta aderência localizado(s).`);
      if (jurisprudence.length > 0) {
        diagnosticNotes.push(`⚖️ ${jurisprudence.length} súmula(s) / precedente(s) tribunal(is) aplicável(is).`);
      }
    }

    return {
      category,
      categoryLabel: categoryLabels[category],
      recommendedArticles,
      jurisprudence,
      diagnosticNotes
    };
  }

  /**
   * Retorna artigos agrupados por nome da lei
   */
  public static getArticlesByLawName(lawFilter: string): LegalArticle[] {
    const all = this.getAllArticles();
    if (!lawFilter || lawFilter === 'ALL') return all;
    return all.filter(a => a.lawName.toUpperCase().includes(lawFilter.toUpperCase()));
  }
}


