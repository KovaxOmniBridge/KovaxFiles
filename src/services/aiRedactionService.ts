import { PageTextData, PdfTextExtractor } from './pdfTextExtractor';
import { LocalNerService } from './localNerService';
import { UniversalAiClassifier, AiRigorLevel } from './universalAiClassifier';

export type AiEngineMode = 'pattern' | 'assisted_ner' | 'embedded';

export interface RedactionCategoryOptions {
  cpf: boolean;
  cnpj: boolean;
  rg: boolean;
  emails: boolean;
  phones: boolean;
  names: boolean;
  addresses: boolean;
  financial: boolean;
  health: boolean;
  customKeywords: string[];
}

export interface DetectedRedactionItem {
  id: string;
  pageIndex: number;
  text: string;
  category: 'CPF' | 'CNPJ' | 'RG' | 'E-mail' | 'Telefone' | 'Nome de Pessoa' | 'Endereço' | 'Financeiro' | 'Saúde' | 'Personalizado';
  reason: string;
  confidence: number;
  selected: boolean;
  rect: {
    pageIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
    text?: string;
    category?: string;
    reason?: string;
  };
}

export interface AiSettings {
  mode: AiEngineMode;
  rigorLevel?: AiRigorLevel;
  geminiApiKey?: string;
}

export class AiRedactionService {
  /**
   * Executa a análise completa:
   * 1. Varredura por Padrões / Regex (Determinístico e Instantâneo: CPF, CNPJ, etc.)
   * 2. Classificação Semântica Zero-Shot de Tokens (quando ativado o modo assistido)
   * 3. Extração Neural Local de Entidades (NER via Transformers.js/BERT em WebAssembly)
   * 
   * AVISO METODOLÓGICO: Todas as sugestões produzidas são preliminares e auxiliares,
   * exigindo verificação e aprovação humana explícita antes de qualquer operação de tarjamento.
   */
  static async analyzePdf(
    pagesData: PageTextData[],
    categories: RedactionCategoryOptions,
    aiSettings: AiSettings,
    onProgress?: (progress: { message: string; percent: number }) => void
  ): Promise<DetectedRedactionItem[]> {
    const results: DetectedRedactionItem[] = [];
    const totalPages = pagesData.length;

    // 1. Fase 1: Análise por Padrões / Regex em todas as páginas (Sempre ativa, instantânea)
    for (let i = 0; i < totalPages; i++) {
      const page = pagesData[i];
      onProgress?.({
        message: `Analisando padrões e regras (Página ${i + 1}/${totalPages})...`,
        percent: Math.round(((i + 1) / totalPages) * 35)
      });
      await new Promise(r => setTimeout(r, 0));

      const patternItems = this.scanPageWithPatterns(page, categories);
      results.push(...patternItems);
    }

    // 2. Fase 2: Análise por IA Universal Zero-Shot por Classificação de Tokens (Motor Heurístico - confidence >= 0.85)
    for (let i = 0; i < totalPages; i++) {
      const page = pagesData[i];
      onProgress?.({
        message: `Classificação semântica de tokens (Página ${i + 1}/${totalPages})...`,
        percent: 35 + Math.round(((i + 1) / totalPages) * 35)
      });
      await new Promise(r => setTimeout(r, 0));

      if (!page.fullText || page.fullText.trim().length < 5) continue;

      const zeroShotItems = UniversalAiClassifier.classifyPageTokens(
        page,
        categories,
        aiSettings.rigorLevel || 'broad'
      );
      for (const item of zeroShotItems) {
        // Trava de Confiança Estrita 0.85
        if (item.confidence < 0.85) continue;

        const alreadyExists = results.some(
          r => r.pageIndex === item.pageIndex && Math.abs(r.rect.x - item.rect.x) < 5 && Math.abs(r.rect.y - item.rect.y) < 5
        );
        if (!alreadyExists) {
          results.push(item);
        }
      }
    }

    // 3. Fase 3: Reconhecimento Inteligente Assistido de Entidades Nomeadas (NER Local via Transformers.js)
    // Recurso opcional de auxílio à triagem com confirmação humana prévia
    if (aiSettings.mode !== 'pattern') {
      const BATCH_SIZE = 2;
      for (let i = 0; i < totalPages; i += BATCH_SIZE) {
        const batchPages = pagesData.slice(i, i + BATCH_SIZE);

        onProgress?.({
          message: `Identificação assistida de dados sensíveis (Páginas ${i + 1}-${Math.min(i + BATCH_SIZE, totalPages)}/${totalPages})...`,
          percent: 70 + Math.round(((i + Math.min(BATCH_SIZE, totalPages - i)) / totalPages) * 28)
        });
        await new Promise(r => setTimeout(r, 0));

        await Promise.all(
          batchPages.map(async (page) => {
            if (!page.fullText || page.fullText.trim().length < 10) return;

            let aiEntities: { text: string; category: string; reason: string; confidence?: number }[] = [];

            try {
              if (categories.names || categories.addresses) {
                const nerEntities = await LocalNerService.extractEntities(page.fullText);
                aiEntities.push(...nerEntities.map(e => ({ ...e, confidence: 0.90 })));
              }
            } catch (nerErr) {
              console.warn('[AiRedactionService] Extração NER local falhou na página:', page.pageIndex + 1, nerErr);
            }

            // Processar entidades detectadas da IA com validações cirúrgicas
            for (const ent of aiEntities) {
              if (!ent.text || ent.text.trim().length < 2) continue;
              if (ent.confidence !== undefined && ent.confidence < 0.85) continue; // Trava Estrita 0.85

              const cleanPhrase = ent.text.trim();

              // Blindagem de Whitelist e Advogados OAB
              if (
                UniversalAiClassifier.isWhitelistedTerm(cleanPhrase) ||
                UniversalAiClassifier.isAttorneyOabName(cleanPhrase, page)
              ) {
                continue;
              }

              const categoryName = (ent.category as any) || 'Nome de Pessoa';
              const alreadyExists = results.some(
                r => r.pageIndex === page.pageIndex && r.text.toLowerCase().trim() === cleanPhrase.toLowerCase()
              );
              if (alreadyExists) continue;

              const rects = PdfTextExtractor.findTextRectangles(page, cleanPhrase);
              for (const rect of rects) {
                results.push({
                  id: 'ai-' + Math.random().toString(36).substring(7),
                  pageIndex: page.pageIndex,
                  text: cleanPhrase,
                  category: categoryName,
                  reason: ent.reason || 'Identificado por Análise Semântica de IA (LGPD)',
                  confidence: ent.confidence || 0.95,
                  selected: true,
                  rect: {
                    ...rect,
                    text: cleanPhrase,
                    category: categoryName,
                    reason: ent.reason || 'Identificado por Análise Semântica de IA (LGPD)'
                  }
                });
              }
            }
          })
        );
      }
    }

    // 4. Cobertura Automática da Margem Lateral Judicial (e-SAJ / PJe / TRF)
    const esajRegex = /(?:esaj\.tjsp\.jus\.br|abrirConferenciaDocumento|código\s+[A-Z0-9]{5,8}|protocolado em|sob o número\s+\d{7})/gi;
    for (const page of pagesData) {
      if (page.fullText && esajRegex.test(page.fullText)) {
        results.push({
          id: 'esaj-margin-' + page.pageIndex,
          pageIndex: page.pageIndex,
          text: 'Margem Lateral de Autenticação Judicial (e-SAJ/TJSP)',
          category: 'RG',
          reason: 'Proteção de Sigilo Judicial: Cobertura da Margem Lateral com Link e Código de Verificação e-SAJ/TJSP',
          confidence: 1.0,
          selected: true,
          rect: {
            pageIndex: page.pageIndex,
            x: Math.max(0, page.pageWidth - 32),
            y: 0,
            width: 32,
            height: page.pageHeight,
            text: 'Margem Lateral de Autenticação Judicial (e-SAJ/TJSP)',
            category: 'RG',
            reason: 'Proteção de Sigilo Judicial: Cobertura da Margem Lateral com Link e Código de Verificação e-SAJ/TJSP'
          }
        });
      }
    }

    onProgress?.({ message: 'Análise concluída com sucesso!', percent: 100 });
    return results;
  }

  /**
   * Varredura por expressões regulares de alta precisão
   */
  private static scanPageWithPatterns(
    page: PageTextData,
    categories: RedactionCategoryOptions
  ): DetectedRedactionItem[] {
    const items: DetectedRedactionItem[] = [];
    const patterns: { category: DetectedRedactionItem['category']; regex: RegExp; reason: string }[] = [];

    if (categories.cpf) {
      patterns.push({
        category: 'CPF',
        regex: /(?:CPF(?:\/MF)?\s*:?\s*n?º?\s*)?(\d{3}\.\d{3}\.\d{3}-\d{2}|\b\d{11}\b)/gi,
        reason: 'Dado Pessoal Identificável (CPF - LGPD Art. 5º)'
      });
    }

    if (categories.cnpj) {
      patterns.push({
        category: 'CNPJ',
        regex: /(?:CNPJ(?:\/MF)?\s*:?\s*n?º?\s*)?(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\b\d{14}\b)/gi,
        reason: 'Identificador de Pessoa Jurídica (CNPJ - LGPD)'
      });
    }

    if (categories.rg) {
      patterns.push({
        category: 'RG',
        regex: /(?:RG\s*:?\s*n?º?\s*)?(\d{1,2}\.\d{3}\.\d{3}-[0-9X]{1})/gi,
        reason: 'Registro Geral de Identidade (RG - LGPD)'
      });

      patterns.push({
        category: 'RG',
        regex: /(?:esaj\.tjsp\.jus\.br|abrirConferenciaDocumento\.do|código\s+[A-Z0-9]{5,8})/gi,
        reason: 'Margem Lateral de Autenticação Judicial (Código de Verificação e-SAJ/TJSP)'
      });
    }

    if (categories.emails) {
      patterns.push({
        category: 'E-mail',
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
        reason: 'Endereço de Correio Eletrônico'
      });
    }

    if (categories.phones) {
      patterns.push({
        category: 'Telefone',
        regex: /\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})[-\s]?\d{4}\b/g,
        reason: 'Contato Telefônico Privado'
      });
    }

    if (categories.financial) {
      patterns.push({
        category: 'Financeiro',
        regex: /R\$\s*[\d\.\,]+/g,
        reason: 'Valor Monetário / Quantia Financeira (R$ - LGPD)'
      });
      patterns.push({
        category: 'Financeiro',
        regex: /\b\d{3,7}-[0-9X]\b/gi,
        reason: 'Número de Conta Bancária com Dígito (LGPD)'
      });
    }

    if (categories.health) {
      patterns.push({
        category: 'Saúde',
        regex: /\b([A-Z][0-9]{2}(?:\.[0-9])?)\b/g,
        reason: 'Código Internacional de Doenças (CID-10 / Saúde - LGPD Art. 5º II)'
      });
      patterns.push({
        category: 'Saúde',
        regex: /(?:CRM\/[A-Z]{2}\s*nº?\s*|\bCRM\/[A-Z]{2}\b\s*)(\d{2,6})/gi,
        reason: 'Inscrição no Conselho Regional de Medicina (CRM - LGPD)'
      });
    }

    // Processar regex padrão
    for (const pat of patterns) {
      const matches = page.fullText.matchAll(pat.regex);
      for (const match of matches) {
        const foundText = match[0];
        if (!foundText || foundText.length < 3) continue;

        const rects = PdfTextExtractor.findTextRectangles(page, foundText);
        for (const rect of rects) {
          items.push({
            id: 'pat-' + Math.random().toString(36).substring(7),
            pageIndex: page.pageIndex,
            text: foundText,
            category: pat.category,
            reason: pat.reason,
            confidence: 0.99,
            selected: true,
            rect: {
              ...rect,
              text: foundText,
              category: pat.category,
              reason: pat.reason
            }
          });
        }
      }
    }

    // Processar palavras-chave personalizadas do usuário
    if (categories.customKeywords && categories.customKeywords.length > 0) {
      for (const kw of categories.customKeywords) {
        const cleanKw = kw.trim();
        if (!cleanKw || cleanKw.length < 2) continue;

        const rects = PdfTextExtractor.findTextRectangles(page, cleanKw);
        for (const rect of rects) {
          items.push({
            id: 'cust-' + Math.random().toString(36).substring(7),
            pageIndex: page.pageIndex,
            text: cleanKw,
            category: 'Personalizado',
            reason: 'Termo / Palavra-chave especificada pelo usuário',
            confidence: 1.0,
            selected: true,
            rect: {
              ...rect,
              text: cleanKw,
              category: 'Personalizado',
              reason: 'Termo / Palavra-chave especificada pelo usuário'
            }
          });
        }
      }
    }

    return items;
  }

  /**
   * System Prompt Imperativo de Preservação do Contexto Jurídico para LLMs
   */
  private static getStrictLlmPrompt(text: string): string {
    return `Você é um auditor sênior de privacidade e LGPD especialista em Engenharia de Documentos.
SUA MISSÃO É RESTRITA EXCLUSIVAMENTE A EXTRAIR DADOS PESSOAIS IDENTIFICÁVEIS BRUTOS DE CIDADÃOS:
- Nomes próprios de pessoas físicas (autores, réus, clientes, testemunhas, pacientes).
- Documentos Pessoais (CPFs, RGs, Passaportes, SSN, SWIFT).
- Endereços residenciais privados e CEPs.
- Dados bancários específicos, favorecidos de PIX e salários/valores R$ isolados.

INSTRUÇÕES IMPERATIVAS DE PRESERVAÇÃO (NUNCA EXTRAIR):
1. PRESERVE E IGNORE CONCEITOS ABSTRATOS (ex: "Dignidade da Pessoa Humana", "Boa-Fé Objetiva", "Segurança Jurídica").
2. PRESERVE E IGNORE LATIM JURÍDICO (ex: "data venia", "fumus boni iuris", "periculum in mora", "ex tunc", "ex nunc").
3. PRESERVE E IGNORE TRANSCRIÇÕES JURISPRUDENCIAIS, EMENTAS DE ACÓRDÃOS E CITAÇÕES DOUTRINÁRIAS.
4. PRESERVE E IGNORE NOMES DE LEIS, TRIBUNAIS, ÓRGÃOS PÚBLICOS E MUNICÍPIOS (ex: "Código Civil", "Constituição Federal", "Prefeitura Municipal").
5. PRESERVE E IGNORE TÍTULOS E CARGOS (ex: "Juiz de Direito", "Vossa Excelência", "Desembargador").

Responda EXCLUSIVAMENTE em formato JSON com o seguinte esquema:
{"entities": [{"text": "Trecho Exato do Documento", "category": "Nome de Pessoa|Endereço|Financeiro|Saúde", "reason": "Motivo LGPD Art. 5º"}]}

Texto a analisar:
${text.substring(0, 3800)}`;
  }

  /**
   * Anonimiza o texto substituindo PIIs (CPFs, CNPJs, E-mails, Telefones e Dados Sensíveis)
   * por tokens genéricos seguros antes do processamento em APIs de nuvem.
   */
  static anonymizeTextForCloud(text: string): { anonymizedText: string; tokenMap: Record<string, string> } {
    if (!text) return { anonymizedText: '', tokenMap: {} };

    const tokenMap: Record<string, string> = {};
    let anonymizedText = text;
    let counter = 1;

    // 1. CPFs
    anonymizedText = anonymizedText.replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, (match) => {
      const token = `[CPF_ANONIMIZADO_${counter++}]`;
      tokenMap[token] = match;
      return token;
    });

    // 2. CNPJs
    anonymizedText = anonymizedText.replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, (match) => {
      const token = `[CNPJ_ANONIMIZADO_${counter++}]`;
      tokenMap[token] = match;
      return token;
    });

    // 3. E-mails
    anonymizedText = anonymizedText.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, (match) => {
      const token = `[EMAIL_ANONIMIZADO_${counter++}]`;
      tokenMap[token] = match;
      return token;
    });

    // 4. Telefones
    anonymizedText = anonymizedText.replace(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\d{4}|\d{4})[-\s]?\d{4}\b/g, (match) => {
      if (match.length >= 8) {
        const token = `[TELEFONE_ANONIMIZADO_${counter++}]`;
        tokenMap[token] = match;
        return token;
      }
      return match;
    });

    return { anonymizedText, tokenMap };
  }
}
