/**
 * HtmlReportExporterService - Gerador de Relatório Técnico Dashboard HTML Interativo
 * Compila análises jurídicas em um arquivo HTML autocontido (Single-File) com tema escuro,
 * seções sanfonadas retráteis, tabela de métricas e botões de cópia de citações jurídicas.
 */

export interface HtmlReportOptions {
  title: string;
  moduleBadge: string;
  userMessage: string;
  aiResponse: string;
  retrievedLaws?: { lawName: string; article: string; title: string; content: string }[];
  engineName?: string;
  latencyMs?: number;
}

export class HtmlReportExporterService {
  /**
   * Compila e dispara o download de um relatório interativo HTML autocontido
   */
  public static exportInteractiveHtmlReport(options: HtmlReportOptions, fileName: string = 'relatorio_tecnico_kovax.html'): void {
    const timestamp = new Date().toLocaleString('pt-BR');
    
    const lawsSectionHtml = (options.retrievedLaws && options.retrievedLaws.length > 0)
      ? options.retrievedLaws.map((law, idx) => `
        <div class="law-card">
          <div class="law-header" onclick="toggleAccordion('law-${idx}')">
            <span>⚖️ <strong>${this.escapeHtml(law.lawName)}</strong> — ${this.escapeHtml(law.article)} (${this.escapeHtml(law.title)})</span>
            <span class="toggle-icon">+</span>
          </div>
          <div id="law-${idx}" class="law-body">
            <p>${this.escapeHtml(law.content)}</p>
          </div>
        </div>
      `).join('')
      : '<p class="empty-state">Nenhum artigo de lei específico vinculado a este relatório.</p>';

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(options.title)} — KovaxFiles Relatório Técnico</title>
  <style>
    :root {
      --bg-dark: #0f172a;
      --card-bg: #1e293b;
      --border-color: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent-blue: #38bdf8;
      --accent-emerald: #34d399;
      --accent-purple: #c084fc;
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg-dark);
      color: var(--text-main);
      margin: 0;
      padding: 30px 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    header {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(56, 189, 248, 0.15);
      color: var(--accent-blue);
      border: 1px solid rgba(56, 189, 248, 0.3);
      margin-bottom: 10px;
    }
    h1 {
      font-size: 22px;
      margin: 5px 0 10px 0;
      color: var(--text-main);
    }
    .meta-bar {
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
    }
    .section-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--accent-blue);
      margin-top: 0;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .user-query {
      background: #090d16;
      border-left: 3px solid var(--accent-blue);
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 13px;
      color: #cbd5e1;
    }
    .markdown-body {
      font-size: 14px;
      color: #e2e8f0;
      white-space: pre-wrap;
    }
    .law-card {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      margin-bottom: 10px;
      overflow: hidden;
    }
    .law-header {
      background: #0f172a;
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .law-header:hover {
      background: #1e293b;
    }
    .law-body {
      display: none;
      padding: 14px 16px;
      background: #090d16;
      font-size: 12px;
      color: #cbd5e1;
      border-top: 1px solid var(--border-color);
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 40px;
      border-top: 1px solid var(--border-color);
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <span class="badge">${this.escapeHtml(options.moduleBadge || 'ANÁLISE JURÍDICA')}</span>
      <h1>${this.escapeHtml(options.title)}</h1>
      <div class="meta-bar">
        <span>📅 <strong>Data:</strong> ${timestamp}</span>
        <span>🤖 <strong>Motor:</strong> ${this.escapeHtml(options.engineName || 'Local C++ 18888')}</span>
        <span>⚡ <strong>Latência:</strong> ${options.latencyMs ? options.latencyMs + 'ms' : 'Offline'}</span>
      </div>
    </header>

    <div class="section-card">
      <div class="section-title">🔍 Consulta / Documento Analisado</div>
      <div class="user-query">${this.escapeHtml(options.userMessage)}</div>
    </div>

    <div class="section-card">
      <div class="section-title">📊 Parecer & Resposta do Sistema</div>
      <div class="markdown-body">${this.escapeHtml(options.aiResponse)}</div>
    </div>

    <div class="section-card">
      <div class="section-title">📜 Fundamentação Jurídica & Base Legal (RAG BM25)</div>
      ${lawsSectionHtml}
    </div>

    <div class="footer">
      KovaxFilesApp • Relatório Técnico Gerado 100% Offline via Motor de IA Nativo C++
    </div>
  </div>

  <script>
    function toggleAccordion(id) {
      const el = document.getElementById(id);
      if (el) {
        const isHidden = el.style.display === 'none' || el.style.display === '';
        el.style.display = isHidden ? 'block' : 'none';
      }
    }
  </script>
</body>
</html>`;

    this.downloadFile(htmlContent, fileName, 'text/html;charset=utf-8;');
  }

  private static escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

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
