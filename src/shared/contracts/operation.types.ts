/**
 * KovaxFiles Desktop — Shared Operation Contracts & Lifecycle
 * Define status de operação, contratos de progresso, cancelamento cooperativo
 * e resultados de operações individuais e em lote.
 */

import type { KovaxError } from '../errors/kovaxErrors';

/**
 * Estados explícitos de ciclo de vida de qualquer operação assíncrona ou em lote no sistema.
 * REGRA CRÍTICA: Não deve registrar 'completed' quando apenas parte de um lote foi processada!
 * Lotes com sucessos e falhas parciais DEVEM ser classificados como 'partial'.
 */
export type OperationStatus =
  | 'pending'     // Na fila / aguardando início
  | 'processing'  // Em execução ativa
  | 'completed'   // Concluído integralmente com 100% de sucesso
  | 'partial'     // Conclusão parcial (alguns itens sucederam, outros falharam ou foram cancelados)
  | 'failed'      // Falha total (nenhum item sucedeu)
  | 'canceled';   // Cancelado antes de produzir resultados úteis

/**
 * Contrato uniforme para notificação de progresso
 */
export interface OperationProgress {
  /** Estágio ou etapa atual legível (ex: 'Analisando páginas', 'Comprimindo imagens') */
  stage: string;
  /** Índice ou quantidade processada até o momento (1-based ou 0-based) */
  current: number;
  /** Quantidade total prevista de etapas ou itens */
  total: number;
  /** Percentual normalizado de 0 a 100 */
  percentage: number;
  /** Mensagem descritiva opcional para a interface */
  message?: string;
  /** Detalhe específico do item atual sendo processado */
  itemDetail?: string;
  /** Tempo estimado restante em milissegundos, se disponível */
  estimatedRemainingMs?: number;
}

export type ProgressCallback = (progress: OperationProgress) => void;

/**
 * Token de cancelamento cooperativo com suporte a listeners e propagação limpa
 */
export interface CancellationToken {
  readonly isCancelled: boolean;
  readonly cancelReason?: string;
  throwIfCancelled(): void;
  onCancel(callback: (reason?: string) => void): () => void;
}

/**
 * Fonte de controle para emissão de CancellationToken
 */
export class CancellationTokenSource {
  private _isCancelled = false;
  private _reason?: string;
  private _listeners: Array<(reason?: string) => void> = [];

  get isCancelled(): boolean {
    return this._isCancelled;
  }

  get cancelReason(): string | undefined {
    return this._reason;
  }

  get token(): CancellationToken {
    const self = this;
    return {
      get isCancelled(): boolean {
        return self._isCancelled;
      },
      get cancelReason(): string | undefined {
        return self._reason;
      },
      throwIfCancelled: () => self.throwIfCancelled(),
      onCancel: (cb) => self.onCancel(cb)
    };
  }

  cancel(reason = 'Operação cancelada pelo usuário.'): void {
    if (this._isCancelled) return;
    this._isCancelled = true;
    this._reason = reason;
    const callbacks = [...this._listeners];
    this._listeners = [];
    callbacks.forEach(cb => {
      try {
        cb(reason);
      } catch (e) {
        console.error('[CancellationTokenSource] Erro ao executar callback de cancelamento:', e);
      }
    });
  }

  throwIfCancelled(): void {
    if (this._isCancelled) {
      throw new OperationCancelledException(this._reason || 'Operação cancelada.');
    }
  }

  onCancel(callback: (reason?: string) => void): () => void {
    if (this._isCancelled) {
      callback(this._reason);
      return () => {};
    }
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(l => l !== callback);
    };
  }
}

export class OperationCancelledException extends Error {
  readonly isCancellation = true;
  constructor(message = 'Operação cancelada pelo usuário.') {
    super(message);
    this.name = 'OperationCancelledException';
  }
}

/**
 * Resultado padronizado de uma operação individual
 */
export interface OperationResult<TData = unknown, TError = KovaxError> {
  status: OperationStatus;
  isSuccess: boolean;
  data?: TData;
  error?: TError;
  durationMs: number;
  metadata?: Record<string, unknown>;
}

/**
 * Resultado de um item individual dentro de um lote
 */
export interface BatchItemResult<TInput = unknown, TOutput = unknown> {
  id: string;
  input: TInput;
  status: 'completed' | 'failed' | 'canceled';
  data?: TOutput;
  error?: KovaxError | Error;
  durationMs: number;
}

/**
 * Contrato de resultado de operação em lote (Batch)
 * Garante rigorosamente que o status reflete a integridade de TODOS os itens.
 */
export interface BatchOperationResult<TInput = unknown, TOutput = unknown> {
  status: OperationStatus;
  totalItems: number;
  processedItems: number;
  succeededItems: number;
  failedItems: number;
  canceledItems: number;
  items: BatchItemResult<TInput, TOutput>[];
  durationMs: number;
  summary: string;
}

/**
 * Utilitário para sintetizar o status correto de uma operação em lote
 */
export function determineBatchStatus(counts: {
  total: number;
  succeeded: number;
  failed: number;
  canceled: number;
}): OperationStatus {
  if (counts.total === 0) return 'completed';
  if (counts.succeeded === counts.total) return 'completed';
  if (counts.failed === counts.total) return 'failed';
  if (counts.canceled === counts.total) return 'canceled';
  if (counts.succeeded > 0 && (counts.failed > 0 || counts.canceled > 0)) return 'partial';
  if (counts.failed > 0 && counts.canceled > 0) return 'failed';
  return 'processing';
}
