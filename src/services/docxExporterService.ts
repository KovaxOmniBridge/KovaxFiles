import {
  Document,
  Packer,
  AlignmentType,
  Paragraph,
  TextRun,
  Header,
  Footer,
  PageNumber,
  PageBreak
} from 'docx';
import { htmlToContent } from 'docx/html';
import * as fflate from 'fflate';

export interface DocxFormattingOptions {
  headerText?: string;
  footerText?: string;
  enableHeaderFooter?: boolean;
}

export interface DocxExportOptions {
  title: string;
  authorName?: string;
  roleTitle?: string;
  profileBadge?: string;
  retrievedLawsSummary?: string;
  content: string;
  fileName?: string;
  headerText?: string;
  footerText?: string;
  enableHeaderFooter?: boolean;
}

export class DocxExporterService {
  /**
   * Converte texto com Markdown e tabelas para estrutura HTML semântica
   */
  private static markdownToSemanticHtml(options: DocxExportOptions): string {
    const formattedDate = new Date().toLocaleDateString('pt-BR');
    const formattedTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let contentFormatted = options.content || '';

    // Converter sintaxe de tabelas Markdown (| col1 | col2 |) para tabelas HTML compatíveis
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

    // Converter sintaxe Markdown básica para marcas HTML
    let htmlBody = contentFormatted
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>');

    // Garantir que <li> estejam agrupados em <ul>
    htmlBody = htmlBody.replace(/(<li>.*?<\/li>(\s*<li>.*?<\/li>)*)/gis, '<ul>$1</ul>');

    // Montar cabeçalho institucional e metadados
    const headerBannerHtml = `
      <div class="header-banner">
        <h1 style="color: #1e3a8a; text-align: center;">KOVAXFILES - RELATÓRIO JURÍDICO OFICIAL</h1>
        <p style="text-align: center; color: #475569;">Relatório de Engenharia Documental & Análise de Conformidade (PJe / ABNT)</p>
      </div>
      <hr />
      <div class="meta-box">
        <p><strong>Especialidade / Perfil:</strong> ${options.authorName || 'Pesquisa Jurídica Oficial'} ${options.roleTitle ? `(${options.roleTitle})` : ''}</p>
        <p><strong>Data de Emissão:</strong> ${formattedDate} às ${formattedTime}</p>
        ${options.profileBadge ? `<p><strong>Módulo Ativo:</strong> ${options.profileBadge}</p>` : ''}
        ${options.retrievedLawsSummary ? `<p><strong>Ancoragem Legislativa:</strong> ${options.retrievedLawsSummary}</p>` : ''}
      </div>
      <hr />
    `;

    const footerHtml = `
      <hr />
      <p style="text-align: center; font-size: 9pt; color: #64748b;">
        Documento autêntico gerado via KovaxFiles Desktop. Ancoragem estrita de legislação e verificabilidade de fontes preservadas localmente.
      </p>
    `;

    return `${headerBannerHtml}<div class="content"><p>${htmlBody}</p></div>${footerHtml}`;
  }

  /**
   * Constrói uma instância de Document OOXML no padrão ABNT / PJe
   */
  private static async buildOoxmlDocument(
    html: string,
    docTitle: string,
    formatting?: DocxFormattingOptions
  ): Promise<Document> {
    const pageBreakRegex = /<hr[^>]*class="[^"]*page-break[^"]*"[^>]*>|<div[^>]*class="[^"]*page-break[^"]*"[^>]*>[\s\S]*?<\/div>|<[^>]+style="[^"]*page-break-(?:after|before):\s*always[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi;
    const parts = html.split(pageBreakRegex);

    const children: any[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part && parts.length > 1) continue;

      if (i > 0) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }

      const partChildren = await htmlToContent(part || '<p></p>');
      if (Array.isArray(partChildren) && partChildren.length > 0) {
        children.push(...partChildren);
      }
    }

    if (children.length === 0) {
      children.push(new Paragraph({ children: [new TextRun(docTitle || 'Documento sem título')] }));
    }

    // Configuração de cabeçalho e rodapé oficial
    const headers = formatting?.enableHeaderFooter !== false && formatting?.headerText ? {
      default: new Header({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: formatting.headerText.substring(0, 100),
                size: 18, // 9pt
                color: '64748b',
                font: 'Times New Roman'
              })
            ],
            alignment: AlignmentType.RIGHT,
          }),
        ],
      }),
    } : undefined;

    const footers = formatting?.enableHeaderFooter !== false ? {
      default: new Footer({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: formatting?.footerText
                  ? `${formatting.footerText} • Página `
                  : 'KovaxFiles Desktop • Página ',
                size: 18, // 9pt
                color: '64748b',
                font: 'Times New Roman'
              }),
              new TextRun({
                children: [PageNumber.CURRENT],
                size: 18,
                color: '64748b',
                font: 'Times New Roman'
              }),
              new TextRun({ text: ' de ', size: 18, color: '64748b', font: 'Times New Roman' }),
              new TextRun({
                children: [PageNumber.TOTAL_PAGES],
                size: 18,
                color: '64748b',
                font: 'Times New Roman'
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      }),
    } : undefined;

    return new Document({
      title: docTitle,
      creator: 'KovaxFiles Desktop',
      description: 'Documento gerado em conformidade com o padrão PJe / ABNT (Office Open XML)',
      styles: {
        default: {
          document: {
            run: {
              font: 'Times New Roman',
              size: 24, // 12pt em half-points
              color: '111827',
            },
            paragraph: {
              spacing: {
                line: 360, // Espaçamento 1.5 linhas (240 = 1.0)
                after: 120, // 6pt após o parágrafo
              },
              alignment: AlignmentType.JUSTIFIED,
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              size: {
                width: 11906, // Formato A4: 210mm em twips (1/20 pt)
                height: 16838, // Formato A4: 297mm em twips
              },
              margin: {
                top: 1701, // Padrão ABNT: Superior 3.0 cm
                left: 1701, // Padrão ABNT: Esquerda 3.0 cm
                bottom: 1134, // Padrão ABNT: Inferior 2.0 cm
                right: 1134, // Padrão ABNT: Direita 2.0 cm
              },
            },
          },
          headers,
          footers,
          children: children as any,
        },
      ],
    });
  }

  /**
   * Gera o Blob de um arquivo .docx verdadeiro (Office Open XML)
   */
  static async generateDocxBlob(options: DocxExportOptions): Promise<Blob> {
    const fullHtml = this.markdownToSemanticHtml(options);
    const doc = await this.buildOoxmlDocument(fullHtml, options.title, {
      headerText: options.headerText,
      footerText: options.footerText,
      enableHeaderFooter: options.enableHeaderFooter
    });
    return await Packer.toBlob(doc);
  }

  /**
   * Gera o Blob de um arquivo .docx verdadeiro a partir de conteúdo HTML (usado pelo DocEditor)
   */
  static async generateHtmlDocxBlob(
    htmlContent: string,
    title?: string,
    formatting?: DocxFormattingOptions
  ): Promise<Blob> {
    const safeTitle = title || 'Documento KovaxFiles';
    const doc = await this.buildOoxmlDocument(htmlContent, safeTitle, formatting);
    return await Packer.toBlob(doc);
  }

  /**
   * Gera o Buffer Node.js de um arquivo .docx verdadeiro (útil para testes automatizados)
   */
  static async generateDocxBuffer(options: DocxExportOptions): Promise<Buffer> {
    const fullHtml = this.markdownToSemanticHtml(options);
    const doc = await this.buildOoxmlDocument(fullHtml, options.title, {
      headerText: options.headerText,
      footerText: options.footerText,
      enableHeaderFooter: options.enableHeaderFooter
    });
    return await Packer.toBuffer(doc);
  }

  /**
   * Gera o Buffer Node.js de um arquivo .docx verdadeiro a partir de HTML (útil para testes automatizados)
   */
  static async generateHtmlDocxBuffer(
    htmlContent: string,
    title?: string,
    formatting?: DocxFormattingOptions
  ): Promise<Buffer> {
    const safeTitle = title || 'Documento KovaxFiles';
    const doc = await this.buildOoxmlDocument(htmlContent, safeTitle, formatting);
    return await Packer.toBuffer(doc);
  }

  /**
   * Exporta o parecer ou parecer técnico diretamente para um arquivo .docx verdadeiro compatível com Word e LibreOffice
   */
  static async exportToDocx(options: DocxExportOptions): Promise<void> {
    const blob = await this.generateDocxBlob(options);
    const baseName = options.fileName || `parecer-juridico-${options.title.toLowerCase().replace(/[^\w]/g, '-')}-${Date.now().toString(36)}.docx`;
    const fileName = baseName.endsWith('.docx') ? baseName : `${baseName}.docx`;
    this.downloadFile(blob, fileName);
  }

  /**
   * Exporta conteúdo HTML do editor para um arquivo .docx verdadeiro (Office Open XML)
   */
  static async exportHtmlToDocx(
    htmlContent: string,
    title?: string,
    formatting?: DocxFormattingOptions
  ): Promise<void> {
    const safeTitle = title || 'Documento';
    const blob = await this.generateHtmlDocxBlob(htmlContent, safeTitle, formatting);
    const cleanTitle = safeTitle.replace(/\.[^/.]+$/, '').replace(/[^\w\s-]/g, '').trim() || 'Documento';
    const fileName = `${cleanTitle}.docx`;
    this.downloadFile(blob, fileName);
  }

  /**
   * Importa e converte um arquivo .docx (Office Open XML) em HTML formatado para o editor
   * Preserva parágrafos, cabeçalhos, negrito, itálico, tabelas e quebras de página.
   */
  static async importDocxToHtml(docxData: Uint8Array | ArrayBuffer): Promise<string> {
    const bytes = docxData instanceof Uint8Array ? docxData : new Uint8Array(docxData);
    const unzipped = fflate.unzipSync(bytes);
    
    // Localizar o arquivo XML principal
    const docXmlEntry = unzipped['word/document.xml'] || unzipped['word/document2.xml'];
    if (!docXmlEntry) {
      throw new Error('Arquivo DOCX inválido: não contém word/document.xml');
    }

    const docXmlStr = fflate.strFromU8(docXmlEntry);
    const bodyMatch = docXmlStr.match(/<w:body>([\s\S]*?)<\/w:body>/);
    const bodyContent = bodyMatch ? bodyMatch[1] : docXmlStr;

    // Encontrar elementos sequenciais (<w:p> e <w:tbl>)
    const elementRegex = /<(w:p|w:tbl)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g;
    const elements = bodyContent.match(elementRegex) || [];
    const htmlBlocks: string[] = [];

    for (const elXml of elements) {
      if (elXml.startsWith('<w:tbl')) {
        let tblHtml = '<table style="width: 100%; border-collapse: collapse; margin: 14pt 0; border: 1px solid #cbd5e1;"><tbody>';
        const trMatches = elXml.match(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g) || [];
        for (let rIdx = 0; rIdx < trMatches.length; rIdx++) {
          tblHtml += '<tr>';
          const tcMatches = trMatches[rIdx].match(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g) || [];
          for (const tcXml of tcMatches) {
            const tMatches = tcXml.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g) || [];
            const cellText = tMatches
              .map(t => t.replace(/<w:t(?:\s[^>]*)?>|<\/w:t>/g, ''))
              .join(' ')
              .trim();
            const tag = rIdx === 0 ? 'th' : 'td';
            const bg = rIdx === 0 ? 'background-color: #f1f5f9; font-weight: bold;' : '';
            tblHtml += `<${tag} style="border: 1px solid #cbd5e1; padding: 6pt 10pt; ${bg}">${cellText}</${tag}>`;
          }
          tblHtml += '</tr>';
        }
        tblHtml += '</tbody></table>';
        htmlBlocks.push(tblHtml);
      } else if (elXml.startsWith('<w:p')) {
        if (elXml.includes('<w:br w:type="page"/>') || elXml.includes('<w:lastRenderedPageBreak/>')) {
          htmlBlocks.push('<hr class="page-break" style="page-break-after: always; border: none; border-top: 2px dashed #3b82f6; margin: 24px 0;" />');
        }

        const isHeading1 = elXml.includes('Heading1') || elXml.includes('Titulo1');
        const isHeading2 = elXml.includes('Heading2') || elXml.includes('Titulo2');
        const isHeading3 = elXml.includes('Heading3') || elXml.includes('Titulo3');

        // Extrair alinhamento
        let align = 'justify';
        if (elXml.includes('<w:jc w:val="center"/>')) align = 'center';
        else if (elXml.includes('<w:jc w:val="right"/>')) align = 'right';
        else if (elXml.includes('<w:jc w:val="left"/>')) align = 'left';

        const rMatches = elXml.match(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g) || [];
        let pText = '';
        for (const rXml of rMatches) {
          const isBold = rXml.includes('<w:b/>') || rXml.includes('<w:b ');
          const isItalic = rXml.includes('<w:i/>') || rXml.includes('<w:i ');
          const isUnderline = rXml.includes('<w:u/>') || rXml.includes('<w:u ');
          const tMatches = rXml.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g) || [];
          for (const t of tMatches) {
            let text = t.replace(/<w:t(?:\s[^>]*)?>|<\/w:t>/g, '');
            if (isBold) text = `<strong>${text}</strong>`;
            if (isItalic) text = `<em>${text}</em>`;
            if (isUnderline) text = `<u>${text}</u>`;
            pText += text;
          }
        }

        if (pText.trim()) {
          if (isHeading1) {
            htmlBlocks.push(`<h1 style="text-align: ${align}; font-weight: bold; margin-top: 16pt; margin-bottom: 8pt;">${pText}</h1>`);
          } else if (isHeading2) {
            htmlBlocks.push(`<h2 style="text-align: ${align}; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">${pText}</h2>`);
          } else if (isHeading3) {
            htmlBlocks.push(`<h3 style="text-align: ${align}; font-weight: bold; margin-top: 12pt; margin-bottom: 4pt;">${pText}</h3>`);
          } else {
            const indent = align === 'justify' ? 'text-indent: 2cm; ' : '';
            htmlBlocks.push(`<p style="${indent}margin-bottom: 12pt; text-align: ${align}; line-height: 1.5;">${pText}</p>`);
          }
        }
      }
    }

    return htmlBlocks.length > 0 ? htmlBlocks.join('\n') : '<p>Documento vazio.</p>';
  }

  /**
   * Executa o download de arquivo no navegador de forma compatível e segura
   */
  private static downloadFile(blob: Blob, fileName: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }
}
