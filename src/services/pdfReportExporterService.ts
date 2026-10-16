import forge from 'node-forge';

/**
 * Service de Exportação Avançada de Relatórios e Auditoria LGPD
 * Permite a geração e download de relatórios em CSV, JSON e acionamento de download.
 * Implementa minimização de dados pessoais por padrão (LGPD Art. 6º, III).
 */

export interface LgpdAuditRecord {
  id: string;
  fileId?: string;
  fileName?: string;
  pageNumber?: number;
  originalTerm?: string;
  termHash?: string;
  maskedTerm: string;
  entityType: string;
  detectionReason: string;
  coordinates?: string;
  timestamp: string;
  status?: string;
}

export interface LgpdReportExportOptions {
  /**
   * Se true (padrão), o relatório não exporta o dado sensível puro (originalTerm),
   * substituindo-o pelo seu hash criptográfico SHA-256 e pelo termo mascarado.
   * Conforme o Princípio da Necessidade e Minimização (Art. 6º, III da Lei 13.709/2018).
   */
  minimizePersonalData?: boolean;
}

export class PdfReportExporterService {
  /**
   * Calcula hash SHA-256 determinístico de um termo sensível para auditoria sem vazamento
   */
  public static computeTermHash(term: string): string {
    if (!term) return '';
    try {
      const md = forge.md.sha256.create();
      md.update(term, 'utf8');
      return md.digest().toHex();
    } catch {
      let hash = 0;
      for (let i = 0; i < term.length; i++) {
        hash = ((hash << 5) - hash) + term.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash).toString(16).padStart(16, '0');
    }
  }

  /**
   * Gera a string CSV formatada de auditoria LGPD
   */
  public static generateLgpdAuditCsvString(records: LgpdAuditRecord[], options?: LgpdReportExportOptions): string {
    if (!records || records.length === 0) return '';
    const minimize = options?.minimizePersonalData ?? true;

    const hasExtendedFields = records.some(r => r.fileId || r.fileName || r.pageNumber !== undefined || r.coordinates);

    const headers = minimize
      ? (hasExtendedFields
          ? ['ID', 'ID do Documento (fileId)', 'Arquivo', 'Página', 'Categoria', 'Hash SHA-256', 'Termo Mascarado', 'Coordenadas (PDF)', 'Motivo da Detecção', 'Data/Hora', 'Status']
          : ['ID', 'Categoria', 'Hash SHA-256', 'Termo Mascarado', 'Motivo da Detecção', 'Data/Hora'])
      : (hasExtendedFields
          ? ['ID', 'ID do Documento (fileId)', 'Arquivo', 'Página', 'Categoria', 'Termo Original (NÃO MINIMIZADO)', 'Hash SHA-256', 'Termo Mascarado', 'Coordenadas (PDF)', 'Motivo da Detecção', 'Data/Hora', 'Status']
          : ['ID', 'Termo Original (NÃO MINIMIZADO)', 'Hash SHA-256', 'Termo Mascarado', 'Categoria', 'Motivo da Detecção', 'Data/Hora']);

    const rows = records.map(r => {
      const hash = r.termHash || (r.originalTerm ? this.computeTermHash(r.originalTerm) : '');
      const masked = r.maskedTerm || '[DADO ANONIMIZADO LGPD]';

      if (minimize) {
        if (hasExtendedFields) {
          return [
            `"${r.id}"`,
            `"${(r.fileId || '').replace(/"/g, '""')}"`,
            `"${(r.fileName || '').replace(/"/g, '""')}"`,
            `"${r.pageNumber !== undefined ? r.pageNumber : ''}"`,
            `"${(r.entityType || '').replace(/"/g, '""')}"`,
            `"${hash}"`,
            `"${masked.replace(/"/g, '""')}"`,
            `"${(r.coordinates || '').replace(/"/g, '""')}"`,
            `"${(r.detectionReason || '').replace(/"/g, '""')}"`,
            `"${r.timestamp}"`,
            `"${(r.status || 'REMOVIDO / TARJADO').replace(/"/g, '""')}"`
          ];
        }
        return [
          `"${r.id}"`,
          `"${(r.entityType || '').replace(/"/g, '""')}"`,
          `"${hash}"`,
          `"${masked.replace(/"/g, '""')}"`,
          `"${(r.detectionReason || '').replace(/"/g, '""')}"`,
          `"${r.timestamp}"`
        ];
      }

      // Modo não-minimizado (apenas sob autorização explícita)
      if (hasExtendedFields) {
        return [
          `"${r.id}"`,
          `"${(r.fileId || '').replace(/"/g, '""')}"`,
          `"${(r.fileName || '').replace(/"/g, '""')}"`,
          `"${r.pageNumber !== undefined ? r.pageNumber : ''}"`,
          `"${(r.entityType || '').replace(/"/g, '""')}"`,
          `"${(r.originalTerm || '').replace(/"/g, '""')}"`,
          `"${hash}"`,
          `"${masked.replace(/"/g, '""')}"`,
          `"${(r.coordinates || '').replace(/"/g, '""')}"`,
          `"${(r.detectionReason || '').replace(/"/g, '""')}"`,
          `"${r.timestamp}"`,
          `"${(r.status || 'REMOVIDO / TARJADO').replace(/"/g, '""')}"`
        ];
      }
      return [
        `"${r.id}"`,
        `"${(r.originalTerm || '').replace(/"/g, '""')}"`,
        `"${hash}"`,
        `"${masked.replace(/"/g, '""')}"`,
        `"${(r.entityType || '').replace(/"/g, '""')}"`,
        `"${(r.detectionReason || '').replace(/"/g, '""')}"`,
        `"${r.timestamp}"`
      ];
    });

    return '\uFEFF' + [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
  }

  /**
   * Exporta a lista de termos anonimizados para um arquivo CSV de auditoria LGPD
   */
  public static exportLgpdAuditCsv(
    records: LgpdAuditRecord[],
    fileName: string = 'relatorio_auditoria_lgpd.csv',
    options?: LgpdReportExportOptions
  ): void {
    if (!records || records.length === 0) return;
    const csvContent = this.generateLgpdAuditCsvString(records, options);
    this.downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
  }

  /**
   * Gera a string JSON formatada de auditoria LGPD
   */
  public static generateLgpdAuditJsonString(records: LgpdAuditRecord[], options?: LgpdReportExportOptions): string {
    if (!records || records.length === 0) return '{}';
    const minimize = options?.minimizePersonalData ?? true;

    const sanitizedRecords = records.map(r => {
      const hash = r.termHash || (r.originalTerm ? this.computeTermHash(r.originalTerm) : '');
      const item: any = {
        id: r.id,
        fileId: r.fileId,
        fileName: r.fileName,
        pageNumber: r.pageNumber,
        entityType: r.entityType,
        termHash: hash,
        maskedTerm: r.maskedTerm || '[DADO ANONIMIZADO LGPD]',
        coordinates: r.coordinates,
        detectionReason: r.detectionReason,
        status: r.status || 'REMOVIDO / TARJADO',
        timestamp: r.timestamp
      };
      if (!minimize && r.originalTerm !== undefined) {
        item.originalTerm = r.originalTerm;
      }
      return item;
    });

    const exportData = {
      plataforma: 'KovaxFilesApp - LGPD Shield Engine',
      minimizacaoDadosPessoais: minimize,
      padraoConformidade: 'LGPD Art. 6º, III (Princípio da Necessidade/Minimização)',
      dataExportacao: new Date().toISOString(),
      totalTermosAnonimizados: sanitizedRecords.length,
      registros: sanitizedRecords
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Exporta os registros de conformidade para JSON estruturado
   */
  public static exportLgpdAuditJson(
    records: LgpdAuditRecord[],
    fileName: string = 'relatorio_auditoria_lgpd.json',
    options?: LgpdReportExportOptions
  ): void {
    if (!records || records.length === 0) return;
    const jsonContent = this.generateLgpdAuditJsonString(records, options);
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

