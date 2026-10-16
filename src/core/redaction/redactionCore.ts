/**
 * KovaxFiles Desktop — Core Redaction Engine
 * Motor central de identificação e anonimização de dados pessoais (LGPD),
 * desacoplado da interface gráfica e com controle de ciclo de vida e cancelamento.
 */

import {
  CancellationToken,
  OperationProgress,
  ProgressCallback,
  OperationStatus,
  OperationResult,
  BatchOperationResult,
  BatchItemResult,
  determineBatchStatus
} from '../../shared/contracts/operation.types';
import { ValidationError, DocumentProcessingError, ensureKovaxError } from '../../shared/errors/kovaxErrors';
import { LocalPdfEngine, RedactionRectangle, AnonymizePdfOptions } from '../../services/pdfEngine';
import { cryptoAdapter } from '../../infrastructure/crypto/cryptoAdapter';

export type { RedactionRectangle, AnonymizePdfOptions };

export interface RedactDocumentInput {
  id: string;
  name: string;
  pdfBytes: Uint8Array | ArrayBuffer;
  rectangles?: RedactionRectangle[];
  options?: AnonymizePdfOptions;
}

export interface RedactDocumentOutput {
  id: string;
  name: string;
  sanitizedPdfBytes: Uint8Array;
  originalSizeBytes: number;
  sanitizedSizeBytes: number;
  sha256Hex: string;
}

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
  /**
   * Validação matemática determinística de CPF pelo algoritmo oficial Módulo 11
   */
  static validateCpf(str: string): boolean {
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

  /**
   * Validação matemática determinística de CNPJ pelo algoritmo oficial Módulo 11
   */
  static validateCnpj(str: string): boolean {
    const clean = str.replace(/\D/g, '');
    if (clean.length !== 14 || /^(\d)\1{13}$/.test(clean)) return false;
    let size = clean.length - 2;
    let numbers = clean.substring(0, size);
    const digits = clean.substring(size);
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i), 10) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0), 10)) return false;

    size = size + 1;
    numbers = clean.substring(0, size);
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i), 10) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return result === parseInt(digits.charAt(1), 10);
  }

  private static readonly BRAZILIAN_RULES: RedactionRule[] = [
    {
      id: 'rule_cpf',
      category: 'CPF',
      pattern: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
      description: 'Cadastro de Pessoas Físicas (CPF)',
      validate: (str) => CoreRedactionEngine.validateCpf(str)
    },
    {
      id: 'rule_cnpj',
      category: 'CNPJ',
      pattern: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,
      description: 'Cadastro Nacional de Pessoa Jurídica (CNPJ)',
      validate: (str) => CoreRedactionEngine.validateCnpj(str)
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
   * Retorna as regras determinísticas homologadas da legislação brasileira
   */
  static getRules(): ReadonlyArray<RedactionRule> {
    return this.BRAZILIAN_RULES;
  }

  /**
   * Obtém uma regra específica pelo seu identificador
   */
  static getRule(id: string): RedactionRule | undefined {
    return this.BRAZILIAN_RULES.find(r => r.id === id);
  }
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

  /**
   * Executa a anonimização física de um documento PDF, preservando o buffer original intacto.
   */
  static async redactDocument(
    input: RedactDocumentInput,
    onProgress?: ProgressCallback,
    cancellationToken?: CancellationToken
  ): Promise<OperationResult<RedactDocumentOutput>> {
    const startTime = performance.now();
    try {
      if (cancellationToken?.isCancelled) {
        cancellationToken.throwIfCancelled();
      }

      if (!input.pdfBytes || input.pdfBytes.byteLength === 0) {
        throw new ValidationError(`O documento "${input.name}" não contém bytes válidos para anonimização.`);
      }

      onProgress?.({
        stage: 'Iniciando anonimização segura do documento',
        current: 10,
        total: 100,
        percentage: 10,
        itemDetail: input.name
      });

      // Cria cópia isolada de leitura para blindar o buffer original do chamador contra mutação
      const inputBytes = input.pdfBytes instanceof Uint8Array
        ? new Uint8Array(input.pdfBytes)
        : new Uint8Array(input.pdfBytes.slice(0));

      const sanitizedBytes = await LocalPdfEngine.anonymizePdf(
        inputBytes,
        input.rectangles || [],
        input.options
      );

      if (cancellationToken?.isCancelled) {
        cancellationToken.throwIfCancelled();
      }

      const sha256Hex = cryptoAdapter.computeSha256Sync(sanitizedBytes);
      const durationMs = Math.round(performance.now() - startTime);

      return {
        status: 'completed',
        isSuccess: true,
        data: {
          id: input.id,
          name: input.name,
          sanitizedPdfBytes: sanitizedBytes,
          originalSizeBytes: input.pdfBytes.byteLength,
          sanitizedSizeBytes: sanitizedBytes.byteLength,
          sha256Hex
        },
        durationMs
      };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      const isCancelled = err.name === 'OperationCancelledException' || cancellationToken?.isCancelled;

      return {
        status: isCancelled ? 'canceled' : 'failed',
        isSuccess: false,
        error: ensureKovaxError(err, 'DOCUMENT_PROCESSING'),
        durationMs
      };
    }
  }

  /**
   * Executa anonimização em lote com integridade estrita de status:
   * 100% sucesso -> 'completed', mistura -> 'partial', 100% falha -> 'failed'.
   */
  static async redactBatch(
    items: RedactDocumentInput[],
    onProgress?: ProgressCallback,
    cancellationToken?: CancellationToken
  ): Promise<BatchOperationResult<RedactDocumentInput, RedactDocumentOutput>> {
    const startTime = performance.now();
    const totalItems = items.length;
    const itemResults: BatchItemResult<RedactDocumentInput, RedactDocumentOutput>[] = [];

    let succeeded = 0;
    let failed = 0;
    let canceled = 0;

    for (let i = 0; i < totalItems; i++) {
      const item = items[i];

      if (cancellationToken?.isCancelled) {
        canceled++;
        itemResults.push({
          id: item.id,
          input: item,
          status: 'canceled',
          error: new Error(cancellationToken.cancelReason || 'Anonimização cancelada.'),
          durationMs: 0
        });
        continue;
      }

      const itemStart = performance.now();
      try {
        onProgress?.({
          stage: `Anonimizando documento ${i + 1} de ${totalItems}`,
          current: i + 1,
          total: totalItems,
          percentage: Math.round((i / totalItems) * 100),
          message: `Anonimizando "${item.name}"...`,
          itemDetail: item.name
        });

        const opResult = await this.redactDocument(item, undefined, cancellationToken);
        const itemDuration = Math.round(performance.now() - itemStart);

        if (opResult.status === 'completed' && opResult.data) {
          succeeded++;
          itemResults.push({
            id: item.id,
            input: item,
            status: 'completed',
            data: opResult.data,
            durationMs: itemDuration
          });
        } else if (opResult.status === 'canceled') {
          canceled++;
          itemResults.push({
            id: item.id,
            input: item,
            status: 'canceled',
            error: opResult.error as any,
            durationMs: itemDuration
          });
        } else {
          failed++;
          itemResults.push({
            id: item.id,
            input: item,
            status: 'failed',
            error: opResult.error as any,
            durationMs: itemDuration
          });
        }
      } catch (err: any) {
        const itemDuration = Math.round(performance.now() - itemStart);
        failed++;
        itemResults.push({
          id: item.id,
          input: item,
          status: 'failed',
          error: err,
          durationMs: itemDuration
        });
      }
    }

    const totalDuration = Math.round(performance.now() - startTime);
    const finalStatus: OperationStatus = determineBatchStatus({
      total: totalItems,
      succeeded,
      failed,
      canceled
    });

    return {
      status: finalStatus,
      totalItems,
      processedItems: succeeded + failed + canceled,
      succeededItems: succeeded,
      failedItems: failed,
      canceledItems: canceled,
      items: itemResults,
      durationMs: totalDuration,
      summary: `Lote de anonimização finalizado com status "${finalStatus}": ${succeeded}/${totalItems} sucessos, ${failed} falhas, ${canceled} cancelamentos.`
    };
  }

  /**
   * Anonimiza fisicamente um documento PDF com sobreposição de retângulos opacos
   */
  static async anonymizePdf(
    pdfBytes: ArrayBuffer | Uint8Array,
    rectangles: RedactionRectangle[],
    options?: AnonymizePdfOptions
  ): Promise<Uint8Array> {
    return LocalPdfEngine.anonymizePdf(pdfBytes, rectangles, options);
  }

  /**
   * Anonimiza fisicamente um documento PDF e emite relatório técnico com métricas
   */
  static async anonymizePdfWithReport(
    pdfBytes: ArrayBuffer | Uint8Array,
    rectangles: RedactionRectangle[],
    options?: AnonymizePdfOptions
  ): Promise<{ pdfBytes: Uint8Array; report: any }> {
    return LocalPdfEngine.anonymizePdfWithReport(pdfBytes, rectangles, options);
  }
}

