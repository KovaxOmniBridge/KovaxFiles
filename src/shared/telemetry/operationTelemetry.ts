/**
 * KovaxFiles Desktop — Shared Telemetry & Audit Tracker
 * Registra eventos operacionais, tempos de processamento e auditoria em memória local.
 * Em conformidade estrita com o princípio de privacidade total (100% offline, sem telemetria remota).
 */

export interface AuditEvent {
  id: string;
  timestamp: string;
  operation: string;
  category: 'DOCUMENT' | 'SECURITY' | 'REDACTION' | 'SIGNATURE' | 'SYSTEM';
  status: 'STARTED' | 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'CANCELLED';
  durationMs?: number;
  details?: Record<string, unknown>;
}

class LocalAuditTracker {
  private events: AuditEvent[] = [];
  private readonly maxEvents = 1000;

  record(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const fullEvent: AuditEvent = {
      ...event,
      id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };

    this.events.unshift(fullEvent);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }

    return fullEvent;
  }

  getRecentEvents(limit = 50): ReadonlyArray<AuditEvent> {
    return this.events.slice(0, limit);
  }

  clear(): void {
    this.events = [];
  }
}

export const localAuditTracker = new LocalAuditTracker();

/**
 * Utilitário para medir tempo de execução com tipagem estrita
 */
export async function trackExecutionTime<T>(
  operationName: string,
  category: AuditEvent['category'],
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  localAuditTracker.record({
    operation: operationName,
    category,
    status: 'STARTED',
    details: metadata
  });

  try {
    const result = await fn();
    const durationMs = Math.round(performance.now() - start);

    localAuditTracker.record({
      operation: operationName,
      category,
      status: 'SUCCESS',
      durationMs,
      details: metadata
    });

    return { result, durationMs };
  } catch (error: any) {
    const durationMs = Math.round(performance.now() - start);
    const isCancelled = error?.name === 'OperationCancelledException' || error?.category === 'CANCELLATION';

    localAuditTracker.record({
      operation: operationName,
      category,
      status: isCancelled ? 'CANCELLED' : 'FAILED',
      durationMs,
      details: { ...metadata, errorMessage: error?.message }
    });

    throw error;
  }
}
