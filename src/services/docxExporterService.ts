export interface DocxExportOptions {
  title: string;
  authorName?: string;
  roleTitle?: string;
  profileBadge?: string;
  retrievedLawsSummary?: string;
  content: string;
}

export class DocxExporterService {
  /**
   * Exporta o parecer ou parecer técnico de IA diretamente para um arquivo .docx compatível com o Microsoft Word no padrão PJe/ABNT
   */
  static exportToDocx(options: DocxExportOptions): void {
    const formattedDate = new Date().toLocaleDateString('pt-BR');
    const formattedTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Converter sintaxe de tabelas Markdown (| col1 | col2 |) para tabelas HTML Word
    let contentFormatted = options.content;
    contentFormatted = contentFormatted.replace(
      /(\|[^\n]+\|\n\|[\s:-|-]+\|\n(?:\|[^\n]+\|\n?)+)/g,
      (match) => {
        const lines = match.trim().split('\n');
        if (lines.length < 2) return match;

        const headerLine = lines[0];
        const headers = headerLine.split('|').map(h => h.trim()).filter(h => h.length > 0);
        
        const dataLines = lines.slice(2);
        const rows = dataLines.map(line => {
          const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
          return `<tr>${cells.map(c => `<td style="border: 1px solid #cbd5e1; padding: 6pt 10pt;">${c}</td>`).join('')}</tr>`;
        });

        const headerHtml = `<thead><tr>${headers.map(h => `<th style="border: 1px solid #cbd5e1; padding: 6pt 10pt; background-color: #f1f5f9; font-weight: bold;">${h}</th>`).join('')}</tr></thead>`;
        return `<table style="width: 100%; border-collapse: collapse; margin: 14pt 0;">${headerHtml}<tbody>${rows.join('')}</tbody></table>`;
      }
    );

    // Converter sintaxe markdown básica (hashtags, listas e negritos) para marcas HTML do Word
    let htmlBody = contentFormatted
      .replace(/^### (.*$)/gim, '<h3 style="font-size: 13pt; font-weight: bold; color: #0f172a; margin-top: 16pt; margin-bottom: 6pt;">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="font-size: 15pt; font-weight: bold; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4pt; margin-top: 20pt; margin-bottom: 8pt;">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="font-size: 18pt; font-weight: bold; color: #0f172a; margin-top: 24pt; margin-bottom: 12pt; text-align: center;">$1</h1>')
      .replace(/^\s*[\-\*]\s+(.*$)/gim, '<li style="margin-left: 20pt; margin-bottom: 4pt;">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p style="margin-bottom: 10pt; line-height: 1.5; text-align: justify; text-indent: 1.25cm;">');

    // Montar estrutura completa HTML MSOffice Word
    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>${options.title}</title>
          <style>
            @page Section1 {
              size: 595.3pt 841.9pt; /* A4 */
              margin: 70.85pt 70.85pt 70.85pt 70.85pt; /* Margens 2.5cm / 3cm */
              mso-header-margin: 35.4pt;
              mso-footer-margin: 35.4pt;
              mso-paper-source: 0;
            }
            div.Section1 { page: Section1; }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              line-height: 1.5;
              color: #111827;
            }
            .header-banner {
              text-align: center;
              border-bottom: 2px solid #1e3a8a;
              padding-bottom: 12pt;
              margin-bottom: 20pt;
            }
            .header-banner h1 {
              font-size: 16pt;
              color: #1e3a8a;
              text-transform: uppercase;
              margin: 0;
            }
            .header-banner p {
              font-size: 10pt;
              color: #475569;
              margin: 4pt 0 0 0;
            }
            .meta-box {
              background-color: #f8fafc;
              border: 1px solid #cbd5e1;
              padding: 10pt 14pt;
              margin-bottom: 20pt;
              font-size: 10.5pt;
            }
            p {
              margin-bottom: 10pt;
              text-align: justify;
              text-indent: 1.25cm;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 12pt 0;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 6pt 10pt;
              font-size: 10.5pt;
            }
            th {
              background-color: #f1f5f9;
              font-weight: bold;
            }
            .footer-note {
              margin-top: 30pt;
              border-top: 1px solid #e2e8f0;
              padding-top: 10pt;
              font-size: 9pt;
              color: #64748b;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="Section1">
            <div class="header-banner">
              <h1>KOVAXFILES - RELATÓRIO JURÍDICO OFICIAL</h1>
              <p>Relatório de Engenharia Documental & Análise de Conformidade (PJe / ABNT)</p>
            </div>

            <div class="meta-box">
              <strong>Especialidade / Perfil:</strong> ${options.authorName || 'Pesquisa Jurídica Oficial'} ${options.roleTitle ? `(${options.roleTitle})` : ''}<br>
              <strong>Data de Emissão:</strong> ${formattedDate} às ${formattedTime}<br>
              ${options.profileBadge ? `<strong>Módulo Ativo:</strong> ${options.profileBadge}<br>` : ''}
              ${options.retrievedLawsSummary ? `<strong>Ancoragem Legislativa:</strong> ${options.retrievedLawsSummary}` : ''}
            </div>

            <div class="content">
              <p style="margin-bottom: 10pt; line-height: 1.5; text-align: justify; text-indent: 1.25cm;">
                ${htmlBody}
              </p>
            </div>

            <div class="footer-note">
              Documento autêntico gerado via KovaxFiles Desktop. Ancoragem estrita de legislação e verificabilidade de fontes preservadas localmente.
            </div>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', docHtml], {
      type: 'application/msword'
    });

    const fileName = `parecer-juridico-${options.title.toLowerCase().replace(/[^\w]/g, '-')}-${Date.now().toString(36)}.docx`;
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
