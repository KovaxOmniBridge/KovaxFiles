/**
 * KovaxFiles Desktop — Core Redaction Engine
 * Motor central de identificação e anonimização de dados pessoais (LGPD),
 * desacoplado da interface gráfica e com controle de ciclo de vida e cancelamento.
 */

import { CancellationToken, OperationProgress, ProgressCallback, OperationStatus } from '../../shared/contracts/operation.types';
import { ValidationError, DocumentProcessingError } from '../../shared/errors/kovaxErrors';

export interface RedactionRule {
  id: string;
  category: 'CPF' | 'CNPJ' | 'RG' | 'EMAIL' | 'PHONE' | 'PROCESS_CNJ' | 'CUSTOM';
  pattern: RegExp;
  description: string;
  validate?: (match: string) => boolean;
}

export interface RedactionMatch {
  id: string;
  ruleId: string;
  category: string;
  matchedText: string;
  startIndex: number;
  endIndex: number;
  replacementMask: string;
  isValidated: boolean;
}

export class CoreRedactionEngine {
  private static readonly BRAZILIAN_RULES: RedactionRule[] = [
    {
      id: 'rule_cpf',
      category: 'CPF',
      pattern: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
      description: 'Cadastro de Pessoas Físicas (CPF)',
      validate: (str) => {
        const clean = str.replace(/\D/g, '');
        if (clean.length !== 11 || /^(\d)\1{10}$/.test(clean)) return false;
        let sum = 0;
        for (let i = 0; i < 9; i++) sum += parseInt(clean[i], 10) * (10 - i);
        let rev = 11 - (sum % 11);
        if (rev === 10 || rev === 11) rev = 0;
        if (rev !== parseInt(clean[9], 10)) return false;
        sum = 0;
        for (let i = 0; i < 10; i++) sum += parseInt(clean[i], 10) * (11 - i);
        rev = 11 - (sum % 11);
        if (rev === 10 || rev === 11) rev = 0;
        return rev === parseInt(clean[10], 10);
      }
    },
    {
      id: 'rule_cnpj',
      category: 'CNPJ',
      pattern: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,
      description: 'Cadastro Nacional de Pessoa Jurídica (CNPJ)'
    },
    {
      id: 'rule_email',
      category: 'EMAIL',
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      description: 'Endereço de Correio Eletrônico'
    },
    {
      id: 'rule_phone',
      category: 'PHONE',
      pattern: /\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})-?\d{4}\b/g,
      description: 'Telefone Fixo ou Móvel Brasileiro'
    },
    {
      id: 'rule_process_cnj',
      category: 'PROCESS_CNJ',
      pattern: /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/g,
      description: 'Número de Processo Judicial Padrão CNJ'
    }
  ];

  /**
   * Executa varredura de texto identificando padrões LGPD com suporte a cancelamento
   */
  static scanText(
    text: string,
    enabledCategories?: Array<RedactionRule['category']>,
    cancellationToken?: CancellationToken
  ): RedactionMatch[] {
    if (cancellationToken?.isCancelled) {
      cancellationToken.throwIfCancelled();
    }

    const matches: RedactionMatch[] = [];
    const activeRules = enabledCategories
      ? this.BRAZILIAN_RULES.filter(r => enabledCategories.includes(r.category))
      : this.BRAZILIAN_RULES;

    for (const rule of activeRules) {
      if (cancellationToken?.isCancelled) {
        cancellationToken.throwIfCancelled();
      }

      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      let matchResult: RegExpExecArray | null;

      while ((matchResult = regex.exec(text)) !== null) {
        const rawText = matchResult[0];
        const isValid = rule.validate ? rule.validate(rawText) : true;

        matches.push({
          id: `match_${rule.category.toLowerCase()}_${matchResult.index}_${Date.now().toString(36)}`,
          ruleId: rule.id,
          category: rule.category,
          matchedText: rawText,
          startIndex: matchResult.index,
          endIndex: matchResult.index + rawText.length,
          replacementMask: '█'.repeat(rawText.length),
          isValidated: isValid
        });
      }
    }

    return matches.sort((a, b) => a.startIndex - b.startIndex);
  }

  /**
   * Aplica substituições de tarjamento diretamente em uma cadeia de caracteres
   */
  static applyTextRedactions(text: string, matches: RedactionMatch[]): string {
    if (matches.length === 0) return text;

    let result = '';
    let lastIndex = 0;

    for (const match of matches) {
      if (match.startIndex >= lastIndex) {
        result += text.substring(lastIndex, match.startIndex);
        result += match.replacementMask;
        lastIndex = match.endIndex;
      }
    }

    result += text.substring(lastIndex);
    return result;
  }
}
