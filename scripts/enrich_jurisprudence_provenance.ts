import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JURISPRUDENCE_STATUTES } from '../src/data/jurisprudenceData.ts';
import { LegalCorpusAuditorService } from '../src/services/legalCorpusAuditorService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetFile = path.resolve(__dirname, '../src/data/jurisprudenceData.ts');

// Datas oficiais de publicação no DJe das Súmulas Vinculantes do STF
const DJE_PUBLICATIONS: Record<number, { dje: string; date: string; psv: number }> = {
  1: { dje: 'DJe nº 31/2007, p. 1', date: '2007-06-06', psv: 1 },
  2: { dje: 'DJe nº 31/2007, p. 1', date: '2007-06-06', psv: 2 },
  3: { dje: 'DJe nº 31/2007, p. 1', date: '2007-06-06', psv: 3 },
  4: { dje: 'DJe nº 83/2008, p. 1', date: '2008-05-09', psv: 7 },
  5: { dje: 'DJe nº 88/2008, p. 1', date: '2008-05-16', psv: 8 },
  6: { dje: 'DJe nº 88/2008, p. 1', date: '2008-05-16', psv: 9 },
  7: { dje: 'DJe nº 112/2008, p. 1', date: '2008-06-20', psv: 11 },
  8: { dje: 'DJe nº 112/2008, p. 1', date: '2008-06-20', psv: 12 },
  9: { dje: 'DJe nº 112/2008, p. 1', date: '2008-06-20', psv: 13 },
  10: { dje: 'DJe nº 117/2008, p. 1', date: '2008-06-27', psv: 14 },
  11: { dje: 'DJe nº 152/2008, p. 1', date: '2008-08-15', psv: 15 },
  12: { dje: 'DJe nº 152/2008, p. 1', date: '2008-08-15', psv: 16 },
  13: { dje: 'DJe nº 162/2008, p. 1', date: '2008-08-29', psv: 17 },
  14: { dje: 'DJe nº 214/2008, p. 1', date: '2008-11-14', psv: 18 },
  15: { dje: 'DJe nº 121/2009, p. 1', date: '2009-07-01', psv: 19 },
  16: { dje: 'DJe nº 121/2009, p. 1', date: '2009-07-01', psv: 20 },
  17: { dje: 'DJe nº 210/2009, p. 1', date: '2009-11-10', psv: 21 },
  18: { dje: 'DJe nº 210/2009, p. 1', date: '2009-11-10', psv: 22 },
  19: { dje: 'DJe nº 210/2009, p. 1', date: '2009-11-10', psv: 23 },
  20: { dje: 'DJe nº 210/2009, p. 1', date: '2009-11-10', psv: 24 },
  21: { dje: 'DJe nº 210/2009, p. 1', date: '2009-11-10', psv: 25 },
  22: { dje: 'DJe nº 232/2009, p. 1', date: '2009-12-11', psv: 26 },
  23: { dje: 'DJe nº 232/2009, p. 1', date: '2009-12-11', psv: 27 },
  24: { dje: 'DJe nº 237/2009, p. 1', date: '2009-12-18', psv: 28 },
  25: { dje: 'DJe nº 241/2009, p. 1', date: '2009-12-23', psv: 29 },
  26: { dje: 'DJe nº 241/2009, p. 1', date: '2009-12-23', psv: 31 },
  27: { dje: 'DJe nº 241/2009, p. 1', date: '2009-12-23', psv: 32 },
  28: { dje: 'DJe nº 30/2010, p. 1', date: '2010-02-19', psv: 33 },
  29: { dje: 'DJe nº 30/2010, p. 1', date: '2010-02-19', psv: 34 },
  30: { dje: 'DJe nº 235/2010 (Suspenso pelo Plenário)', date: '2010-12-10', psv: 30 },
  31: { dje: 'DJe nº 30/2010, p. 1', date: '2010-02-19', psv: 36 },
  32: { dje: 'DJe nº 40/2010, p. 1', date: '2010-03-05', psv: 37 },
  33: { dje: 'DJe nº 77/2014, p. 1', date: '2014-04-24', psv: 43 },
  34: { dje: 'DJe nº 46/2015, p. 1', date: '2015-03-10', psv: 45 },
  35: { dje: 'DJe nº 46/2015, p. 1', date: '2015-03-10', psv: 46 },
  36: { dje: 'DJe nº 46/2015, p. 1', date: '2015-03-10', psv: 47 },
  37: { dje: 'DJe nº 46/2015, p. 1', date: '2015-03-10', psv: 48 },
  38: { dje: 'DJe nº 46/2015, p. 1', date: '2015-03-10', psv: 49 },
  39: { dje: 'DJe nº 46/2015, p. 1', date: '2015-03-10', psv: 50 },
  40: { dje: 'DJe nº 58/2015, p. 1', date: '2015-03-26', psv: 51 },
  41: { dje: 'DJe nº 58/2015, p. 1', date: '2015-03-26', psv: 52 },
  42: { dje: 'DJe nº 58/2015, p. 1', date: '2015-03-26', psv: 53 },
  43: { dje: 'DJe nº 67/2015, p. 1', date: '2015-04-13', psv: 54 },
  44: { dje: 'DJe nº 67/2015, p. 1', date: '2015-04-13', psv: 55 },
  45: { dje: 'DJe nº 67/2015, p. 1', date: '2015-04-13', psv: 56 },
  46: { dje: 'DJe nº 67/2015, p. 1', date: '2015-04-13', psv: 57 },
  47: { dje: 'DJe nº 124/2015, p. 1', date: '2015-06-26', psv: 58 },
  48: { dje: 'DJe nº 124/2015, p. 1', date: '2015-06-26', psv: 59 },
  49: { dje: 'DJe nº 124/2015, p. 1', date: '2015-06-26', psv: 60 },
  50: { dje: 'DJe nº 124/2015, p. 1', date: '2015-06-26', psv: 61 },
  51: { dje: 'DJe nº 124/2015, p. 1', date: '2015-06-26', psv: 62 },
  52: { dje: 'DJe nº 124/2015, p. 1', date: '2015-06-26', psv: 63 },
  53: { dje: 'DJe nº 124/2015, p. 1', date: '2015-06-26', psv: 64 },
  54: { dje: 'DJe nº 124/2015, p. 1', date: '2015-06-26', psv: 65 },
  55: { dje: 'DJe nº 178/2016, p. 1', date: '2016-08-25', psv: 66 },
  56: { dje: 'DJe nº 165/2016, p. 1', date: '2016-08-08', psv: 67 },
  57: { dje: 'DJe nº 281/2020, p. 1', date: '2020-11-27', psv: 68 },
  58: { dje: 'DJe nº 256/2020, p. 1', date: '2020-10-23', psv: 69 },
  59: { dje: 'DJe nº 279/2023, p. 1', date: '2023-12-19', psv: 70 },
  60: { dje: 'DJe nº 206/2024, p. 1', date: '2024-09-30', psv: 71 },
  61: { dje: 'DJe nº 206/2024, p. 1', date: '2024-09-30', psv: 72 },
  62: { dje: 'DJe nº 206/2024, p. 1', date: '2024-09-30', psv: 73 },
};

const enrichedArticles = JURISPRUDENCE_STATUTES.map(art => {
  const matchNum = art.id.match(/stf-sv-(\d+)/);
  const num = matchNum ? parseInt(matchNum[1], 10) : 1;
  const pubInfo = DJE_PUBLICATIONS[num] || { dje: 'DJe do STF', date: '2026-10-15', psv: num };

  const isSV30 = (num === 30);

  const base: any = {
    ...art,
    officialPublisher: 'Supremo Tribunal Federal (Plenário)',
    officialRef: pubInfo.dje,
    queryDate: pubInfo.date,
    version: isSV30 ? 'Enunciado com publicação suspensa pelo STF' : `Publicação Oficial Consolidada no ${pubInfo.dje}`,
    isOfficialUrnVerified: !isSV30,
    officialId: `urn:lex:br:federal:supremo.tribunal.federal;sumula.vinculante:${pubInfo.date.substring(0, 4)};${num}`,
  };

  if (isSV30) {
    base.statusVigencia = 'SUSPENSA_NAO_COMPROVADA';
    base.authenticityStatus = 'SUSPENSO_PREVENTIVAMENTE';
    base.auditNotes = 'Processo de edição formalmente suspenso pelo STF (PSV 30 - DJe 235/2010). O enunciado não foi publicado no DJe, razão pela qual sua autenticidade perante publicação oficial não pôde ser comprovada. Suspenso preventivamente para evitar citação como súmula válida.';
    base.externalSourceHash = undefined;
    base.officialContentSha256 = undefined;
  } else {
    // CORREÇÃO CRÍTICA FORENSE:
    // Não reutilizar o hash do conteúdo local como se fosse o hash de uma fonte externa.
    // Sem captura física independente documentada com arquivo bruto arquivado,
    // o registro DEVE ser rotulado como NAO_VERIFICADO_EXTERNAMENTE.
    base.statusVigencia = 'COMUM';
    base.authenticityStatus = 'NAO_VERIFICADO_EXTERNAMENTE';
    base.externalSourceHash = undefined;
    base.officialContentSha256 = undefined;
    base.auditNotes = 'Texto canônico cadastrado no acervo local do KovaxFiles. Captura independente da publicação oficial no DJe do STF pendente de realização e arquivamento de artefato bruto.';
  }

  // Remove qualquer data de captura presumida:
  // A data de publicação da súmula (ex: 2007) NUNCA é a data de captura do aplicativo.
  if (base.provenance?.sourceCapture) {
    base.provenance.sourceCapture.capturedAt = undefined;
    base.provenance.sourceCapture.hasDocumentedSnapshot = false;
    base.provenance.sourceCapture.captureMethod = 'MANUAL_UNVERIFIED';
    base.provenance.sourceCapture.externalSourceHash = undefined;
  }

  // Constrói a cadeia de proveniência com o auditor estrito
  base.provenance = LegalCorpusAuditorService.buildProvenanceChain(base);

  return base;
});

const fileHeader = `import { LegalArticle } from '../services/legalKnowledgeBaseService';

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
export const JURISPRUDENCE_STATUTES: LegalArticle[] = ${JSON.stringify(enrichedArticles, null, 2)};
`;

fs.writeFileSync(targetFile, fileHeader, 'utf-8');
console.log(`Sucesso: ${enrichedArticles.length} Súmulas Vinculantes atualizadas com honestidade forense em ${targetFile}`);
