/**
 * Service de Exportação Avançada de Relatórios e Auditoria LGPD
 * Permite a geração e download de relatórios em CSV, JSON e acionamento de download.
 */

export interface LgpdAuditRecord {
  id: string;
  originalTerm: string;
  maskedTerm: string;
  entityType: string;
  detectionReason: string;
  timestamp: string;
}

export class PdfReportExporterService {
  /**
   * Exporta a lista de termos anonimizados para um arquivo CSV de auditoria LGPD
   */
  public static exportLgpdAuditCsv(records: LgpdAuditRecord[], fileName: string = 'relatorio_auditoria_lgpd.csv'): void {
    if (!records || records.length === 0) return;

    const headers = ['ID', 'Termo Original', 'Termo Mascarado', 'Categoria', 'Motivo da Detecção', 'Data/Hora'];
    const rows = records.map(r => [
      `"${r.id}"`,
      `"${(r.originalTerm || '').replace(/"/g, '""')}"`,
      `"${(r.maskedTerm || '').replace(/"/g, '""')}"`,
      `"${(r.entityType || '').replace(/"/g, '""')}"`,
      `"${(r.detectionReason || '').replace(/"/g, '""')}"`,
      `"${r.timestamp}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    this.downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
  }

  /**
   * Exporta os registros de conformidade para JSON estruturado
   */
  public static exportLgpdAuditJson(records: LgpdAuditRecord[], fileName: string = 'relatorio_auditoria_lgpd.json'): void {
    if (!records || records.length === 0) return;

    const exportData = {
      plataforma: 'KovaxFilesApp - LGPD Shield Engine',
      dataExportacao: new Date().toISOString(),
      totalTermosAnonimizados: records.length,
      registros: records
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    this.downloadFile(jsonContent, fileName, 'application/json;charset=utf-8;');
  }

  /**
   * Dispara o download de uma string formatada como arquivo no navegador
   */
  private static downloadFile(content: string, fileName: string, mimeType: string): void {
    if (typeof window === 'undefined') return;

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
