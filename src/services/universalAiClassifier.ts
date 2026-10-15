import { PageTextData, PdfTextExtractor } from './pdfTextExtractor';
import { DetectedRedactionItem, RedactionCategoryOptions } from './aiRedactionService';

export type DetectionRigorLevel = 'essential' | 'broad' | 'maximum';
export type AiRigorLevel = DetectionRigorLevel;

export type LegalRegimeType = 'DIREITO_PUBLICO' | 'DIREITO_PRIVADO' | 'MISTO';

export interface LegalRegimeAnalysis {
  regime: LegalRegimeType;
  confidence: number;
  reasoning: string;
  blockedLaws: string[];
}

export class UniversalAiClassifier {
  /**
   * Set estático case-insensitive de termos institucionais, legais, procedimentais e de negócios a ignorar.
   */
  private static readonly WHITELIST_SET = new Set<string>([
    // Legislação, Normas e Códigos
    'constituicao', 'constituicao federal', 'codigo civil', 'codigo de processo civil',
    'codigo penal', 'clt', 'marco civil', 'marco civil da internet', 'lei geral de protecao de dados',
    'lgpd', 'conselho regional de medicina', 'crm', 'codigo internacional de doencas', 'cid',
    'cid-10', 'cid-11', 'prefeitura municipal', 'tribunal de justica', 'ministerio publico',
    'estado de sao paulo', 'estado do rio de janeiro', 'governo do estado', 'governo estadual',
    'secretaria de seguranca', 'seguranca publica', 'poder judiciario', 'poder executivo',
    'poder legislativo', 'superior tribunal de justica', 'supremo tribunal federal',
    'justica do trabalho', 'justica federal', 'conselho nacional de justica', 'cnj',
    'orgao publico', 'diario oficial', 'imprensa oficial', 'procuradoria geral',
    'defensoria publica', 'ordem dos advogados', 'sociedade de advogados', 'foro central',
    'comarca da capital', 'vara civel', 'vara da familia', 'vara criminal', 'juiz de direito',
    'desembargador', 'ministro', 'republica federativa', 'uniao federal', 'fazenda publica', 'receita federal',

    // Termos Procedimentais, Peças e Conceitos Jurídicos Fundamentais (Prevenção de Hiper-Tarjamento)
    'peticao inicial', 'acao cominatoria', 'pedido de antecipacao dos efeitos da tutela',
    'antecipacao dos efeitos', 'efeitos da tutela', 'tutela de urgencia', 'tutela provisoria',
    'sintese dos fatos', 'dignidade da pessoa humana', 'merito', 'vossa excelencia',
    'apelacao', 'recurso especial', 'recurso extraordinario', 'direitos fundamentais',
    'contestacao', 'replica', 'agravo de instrumento', 'embargos de declaracao',
    'jurisprudencia', 'sumula', 'repercussao geral', 'dano moral', 'dano material',
    'processo eletronico', 'segredo de justica', 'acao civil publica', 'acao popular',
    'habeas corpus', 'mandado de seguranca', 'ordem cronologica', 'laudo pericial',
    'parecer tecnico', 'relatorio medico', 'termo de audiencia', 'transito em julgado',

    // Expressões do Latim Jurídico e Doutrina
    'data venia', 'fumus boni iuris', 'periculum in mora', 'ex tunc', 'ex nunc',
    'ipsis litteris', 'sine qua non', 'erga omnes', 'inter partes', 'sub judice'
  ]);

  public static stripAccents(str: string): string {
    return str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
  }

  /**
   * Classifica o escopo material de um documento em Regime Jurídico Macro:
   * - DIREITO_PUBLICO: Convênios, editais, licitações, termos de cooperação pública, portarias, contratos administrativos.
   * - DIREITO_PRIVADO: Contratos de prestação de serviços civis/empresariais, e-commerce, locação, consumo.
   * - MISTO: Parcerias público-privadas (PPP) ou estatais em regime concorrencial.
   */
  public static detectLegalRegime(text: string): LegalRegimeAnalysis {
    if (!text || text.trim().length === 0) {
      return {
        regime: 'MISTO',
        confidence: 0.5,
        reasoning: 'Texto omisso ou não fornecido. Escopo neutro padrão.',
        blockedLaws: []
      };
    }

    const normText = this.stripAccents(text).toLowerCase();

    // Palavras-chave indicativas de Direito Público e Gestão Administrativa
    const publicKeywords = [
      'convenio', 'termo de convenio', 'prefeitura', 'municipio', 'estado de', 'uniao federal',
      'secretaria municipal', 'secretaria de saude', 'secretaria de educacao', 'edital',
      'licitacao', 'lei 14.133', 'lei 8.666', 'chamamento publico', 'termo de colaboracao',
      'termo de fomento', 'administracao publica', 'fazenda publica', 'autarquia', 'fundacao publica',
      'improbidade administrativa', 'diario oficial', 'termo de rescisao de convenio'
    ];

    // Palavras-chave indicativas de Direito Privado e Relação de Consumo
    const privateKeywords = [
      'codigo de defesa do consumidor', 'cdc', 'consumidor', 'fornecedor', 'e-commerce',
      'compra e venda', 'locacao', 'locatario', 'locador', 'sociedade limitada', 'ltda',
      's.a.', 'contrato de prestacao de servicos entre particulares', 'nota fiscal de venda ao consumidor'
    ];

    let publicScore = 0;
    let privateScore = 0;

    for (const kw of publicKeywords) {
      if (normText.includes(kw)) publicScore += 2;
    }

    for (const kw of privateKeywords) {
      if (normText.includes(kw)) privateScore += 2;
    }

    if (publicScore > privateScore && publicScore >= 2) {
      return {
        regime: 'DIREITO_PUBLICO',
        confidence: 0.95,
        reasoning: 'Documento regido pelo Direito Público (convênio, edital ou contratação administrativa). Proibido aplicar CDC ou Código Penal sem indício explícito de fraude orçamentária.',
        blockedLaws: ['CDC (Lei 8.078/1990)', 'Código Penal (sem indício de fraude orçamentária)']
      };
    }

    if (privateScore > publicScore && privateScore >= 2) {
      return {
        regime: 'DIREITO_PRIVADO',
        confidence: 0.95,
        reasoning: 'Documento regido pelo Direito Privado ou Relação de Consumo. Proibido aplicar Nova Lei de Licitações.',
        blockedLaws: ['Nova Lei de Licitações (Lei 14.133/2021)']
      };
    }

    return {
      regime: 'MISTO',
      confidence: 0.8,
      reasoning: 'Documento com interseção de normas de Direito Público e Privado.',
      blockedLaws: []
    };
  }

  /**
   * Verifica se o termo pertence à Whitelist por consulta Set estática O(1)
   */
  public static isWhitelistedTerm(phrase: string): boolean {
    if (!phrase || phrase.trim().length < 3) return true;
    const norm = this.stripAccents(phrase).toLowerCase().trim();

    if (this.WHITELIST_SET.has(norm)) return true;
    return Array.from(this.WHITELIST_SET).some(item => norm.includes(item) || item.includes(norm));
  }

  /**
   * Verifica se o termo é um nome profissional de Advogado/Procurador.
   * Varre geometricamente o Eixo Y aplicando um raio vertical de tolerância de até 45px
   * acima e abaixo de registros OAB ("OAB/[A-Z]{2}" ou "OAB nº").
   */
  public static isAttorneyOabName(phrase: string, pageData: PageTextData): boolean {
    if (!phrase) return false;
    const normPhrase = this.stripAccents(phrase).toLowerCase().trim();

    if (normPhrase.includes('oab') || normPhrase.includes('advogad') || normPhrase.includes('procurador')) {
      return true;
    }

    const oabYPositions: number[] = [];
    const oabRegex = /\bOAB(?:\/[A-Z]{2})?\s*(?:nº?|n°)?\s*\d+/gi;

    for (const item of pageData.items) {
      if (oabRegex.test(item.text)) {
        oabYPositions.push(item.y);
      }
    }

    if (oabYPositions.length === 0) {
      try {
        const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const oabTextRegex = new RegExp(`${escapedPhrase}[^\\n]{0,90}(?:OAB|Advogado|Advogada)`, 'gi');
        if (oabTextRegex.test(pageData.fullText)) return true;
      } catch {}
      return false;
    }

    const candidateRects = PdfTextExtractor.findTextRectangles(pageData, phrase);
    if (candidateRects.length === 0) return false;

    for (const rect of candidateRects) {
      const candidateY = rect.y;
      const isNearOabVertical = oabYPositions.some(oabY => Math.abs(candidateY - oabY) <= 45.0);
      if (isNearOabVertical) {
        return true;
      }
    }

    return false;
  }

  /**
   * Classifica e identifica qualquer dado sensível em documentos inéditos com limite estrito de confiança de 0.85.
   */
  static classifyPageTokens(
    page: PageTextData,
    categories: RedactionCategoryOptions,
    rigorLevel: AiRigorLevel = 'broad'
  ): DetectedRedactionItem[] {
    if (!page.items || page.items.length === 0) return [];

    const detected: DetectedRedactionItem[] = [];
    const rawText = page.fullText;

    if (categories.names) {
      const namePrefixes = [
        'PACIENTE', 'MENOR', 'MAE', 'RESPONSAVEL', 'SRA', 'SR', 'DRA', 'DR',
        'MEDICO', 'MEDICA', 'TITULAR', 'BENEFICIARIO', 'CLIENTE', 'REU', 'AUTOR',
        'TESTEMUNHA', 'ARRENDADOR', 'ARRENDATARIO', 'OUTORGANTE', 'OUTORGADO',
        'COMPRADOR', 'VENDEDOR', 'PROPRIETARIO', 'MORADOR', 'CONTRIBUINTE',
        'REQUERENTE', 'REQUERIDO'
      ];

      const nameRegex = new RegExp(`(?:${namePrefixes.join('|')})(?:\\s*\\/\\s*\\w+)*\\s*:?\\s*(?:Sra\\.|Sr\\.|Dra\\.|Dr\\.)?\\s*([A-ZÀ-Úa-zà-ú]+(?:\\s+(?:de|da|do|dos|das|e|DE|DA|DO|DOS|DAS|E)\\s+)?(?:[A-ZÀ-Úa-zà-ú]+\\s*){1,4})`, 'gi');
      const nameMatches = rawText.matchAll(nameRegex);
      for (const m of nameMatches) {
        if (m[1] && m[1].length > 3) {
          const foundName = m[1].trim();
          if (!namePrefixes.includes(foundName.toUpperCase())) {
            this.addDetectedPhrase(page, foundName, 'Nome de Pessoa', 'Nome Próprio Identificado (LGPD Art. 5º)', 0.98, detected);
          }
        }
      }

      const capitalizedFullNameRegex = /\b([A-ZÀ-Úa-zà-ú]{2,}\s+(?:(?:de|da|do|dos|das|e|DE|DA|DO|DOS|DAS|E)\s+)?(?:[A-ZÀ-Úa-zà-ú]{2,}\s*){1,3})\b/g;
      const fullMatches = rawText.matchAll(capitalizedFullNameRegex);
      for (const fm of fullMatches) {
        const foundName = fm[1].trim();
        if (foundName.length > 5) {
          this.addDetectedPhrase(page, foundName, 'Nome de Pessoa', 'Identificado como Nome Próprio de Cidadão (Varredura Algorítmica LGPD)', 0.88, detected);
        }
      }

      const doctorRegex = /(?:Medico Responsavel|Médico Responsável|Médico|Médica|Dra?\.)\s*:?\s*(Dra?\.\s*[A-ZÀ-Úa-zà-ú]+(?:\s+(?:de|da|do|dos|das|e|DE|DA|DO|DOS|DAS|E)\s+)?[A-ZÀ-Úa-zà-ú]+(?:\s*-\s*CRM\S*\s*[\d\.\/-]+)?)/gi;
      for (const m of rawText.matchAll(doctorRegex)) {
        if (m[1] && m[1].length > 4) {
          this.addDetectedPhrase(page, m[1].trim(), 'Nome de Pessoa', 'Médico Responsável / CRM', 0.98, detected);
        }
      }

      const judicialPartyRegex = /(?:Réu|Reu|RÉU|Autor|AUTOR|Requerente|REQUERENTE|Requerido|REQUERIDO|Executado|EXECUTADO|Vítima|Vitima|VÍTIMA)\s*:?\s*([A-ZÀ-Úa-zà-ú]+(?:\s+(?:de|da|do|dos|das|e|DE|DA|DO|DOS|DAS|E)\s+)?(?:[A-ZÀ-Úa-zà-ú]+\s*){1,4})/gi;
      for (const m of rawText.matchAll(judicialPartyRegex)) {
        if (m[1] && m[1].length > 3) {
          this.addDetectedPhrase(page, m[1].trim(), 'Nome de Pessoa', 'Parte de Processo Judicial em Segredo de Justiça (LGPD)', 0.99, detected);
        }
      }
    }

    if (categories.addresses) {
      const addressFullRegex = /(?:ENDERECO\s+RESIDENCIAL|ENDEREÇO\s+RESIDENCIAL|LOGRADOURO)\s*:?\s*([^\n]+)/gi;
      for (const m of rawText.matchAll(addressFullRegex)) {
        if (m[1] && m[1].length > 5) {
          this.addDetectedPhrase(page, m[1].trim(), 'Endereço', 'Logradouro / Endereço Residencial Completo (LGPD)', 0.98, detected);
        }
      }

      const streetRegex = /(?:Servidao|Servidão|Rua|Av\.|Avenida|Alameda|Praça|Praca|Rodovia|Estrada)[^:]+?(?:CEP\s*:?\s*\d{5}-\d{3})/gi;
      for (const m of rawText.matchAll(streetRegex)) {
        if (m[0] && m[0].length > 5) {
          this.addDetectedPhrase(page, m[0].trim(), 'Endereço', 'Logradouro Residencial com CEP (LGPD)', 0.98, detected);
        }
      }

      const cepRegex = /CEP\s*:?\s*\d{5}-\d{3}/gi;
      for (const m of rawText.matchAll(cepRegex)) {
        this.addDetectedPhrase(page, m[0].trim(), 'Endereço', 'Código de Endereçamento Postal (CEP - Dado Pessoal LGPD)', 0.99, detected);
      }
    }

    if (categories.financial || rigorLevel === 'broad' || rigorLevel === 'maximum') {
      const accountNumRegex = /\b\d{3,7}-[0-9X]\b/gi;
      for (const m of rawText.matchAll(accountNumRegex)) {
        this.addDetectedPhrase(page, m[0].trim(), 'Financeiro', 'Número de Conta Bancária com Dígito (LGPD)', 0.99, detected);
      }

      const valRegex = /R\$\s*[\d\.\,]+/gi;
      for (const m of rawText.matchAll(valRegex)) {
        this.addDetectedPhrase(page, m[0].trim(), 'Financeiro', 'Valor Monetário / Quantia Financeira (R$)', 0.99, detected);
      }
    }

    if (categories.health || rigorLevel === 'maximum') {
      const cidRegex = /CID\s*(?:10|11)?\s*:?\s*[A-Z]?\d+(?:\.\d)?/gi;
      for (const m of rawText.matchAll(cidRegex)) {
        this.addDetectedPhrase(page, m[0].trim(), 'Saúde', 'Código de Diagnóstico Médico (CID-10 - Dado Sensível LGPD Art. 5º II)', 0.99, detected);
      }
    }

    return detected;
  }

  private static addDetectedPhrase(
    page: PageTextData,
    phrase: string,
    category: DetectedRedactionItem['category'],
    reason: string,
    confidence: number,
    results: DetectedRedactionItem[]
  ): void {
    if (confidence < 0.85) return;

    if (this.isWhitelistedTerm(phrase) || this.isAttorneyOabName(phrase, page)) {
      return;
    }

    const rects = PdfTextExtractor.findTextRectangles(page, phrase);

    for (const rect of rects) {
      const isDuplicate = results.some(
        r => r.pageIndex === page.pageIndex && Math.abs(r.rect.x - rect.x) < 4 && Math.abs(r.rect.y - rect.y) < 4
      );

      if (!isDuplicate) {
        results.push({
          id: 'zero-' + Math.random().toString(36).substring(7),
          pageIndex: page.pageIndex,
          text: phrase,
          category,
          reason,
          confidence,
          selected: true,
          rect
        });
      }
    }
  }
}
