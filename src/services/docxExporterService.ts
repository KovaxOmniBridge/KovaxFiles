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
import {
  safeUnzipDocx,
  parseXml,
  XmlNode,
  DocxSecurityError,
  MalformedDocxError
} from './ooxmlParser';
import { HtmlSanitizer } from './htmlSanitizer';

export { DocxSecurityError, MalformedDocxError };

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
   * Utiliza parser XML/OOXML robusto com validação estrita, limites de descompressão contra zip bombs,
   * e preserva elementos essenciais: imagens embutidas, tabelas, listas numeradas e com marcadores,
   * cabeçalhos, rodapés, quebras de página e estilos tipográficos.
   */
  static async importDocxToHtml(docxData: Uint8Array | ArrayBuffer): Promise<string> {
    const bytes = docxData instanceof Uint8Array ? docxData : new Uint8Array(docxData);

    // 1. Descompressão segura com validação contra Zip Bombs
    const unzipped = safeUnzipDocx(bytes);

    // 2. Localizar o arquivo XML principal do documento
    const docXmlEntry = unzipped['word/document.xml'] || unzipped['word/document2.xml'];
    if (!docXmlEntry) {
      throw new MalformedDocxError('Arquivo DOCX inválido: não contém word/document.xml');
    }

    // 3. Mapear relacionamentos de mídia (word/_rels/document.xml.rels)
    const mediaRels: Record<string, string> = {};
    const relsEntry = unzipped['word/_rels/document.xml.rels'];
    if (relsEntry) {
      try {
        const relsStr = fflate.strFromU8(relsEntry);
        const relsXml = parseXml(relsStr);
        const relNodes = relsXml.findDescendants('Relationship');
        for (const rel of relNodes) {
          const id = rel.getAttribute('Id');
          const target = rel.getAttribute('Target');
          if (id && target) {
            mediaRels[id] = target;
          }
        }
      } catch (err) {
        console.warn('[DocxExporterService] Aviso ao ler relacionamentos .rels:', err);
      }
    }

    // 4. Mapear tipos de numeração (word/numbering.xml) para identificar ol vs ul
    const numberingTypes: Record<string, 'ol' | 'ul'> = {};
    const numberingEntry = unzipped['word/numbering.xml'];
    if (numberingEntry) {
      try {
        const numStr = fflate.strFromU8(numberingEntry);
        const numXml = parseXml(numStr);
        const numNodes = numXml.findDescendants('w:num');
        const abstractNums: Record<string, 'ol' | 'ul'> = {};

        const abstractNumNodes = numXml.findDescendants('w:abstractNum');
        for (const abs of abstractNumNodes) {
          const absId = abs.getAttribute('w:abstractNumId') || abs.getAttribute('abstractNumId');
          const numFmt = abs.findFirstDescendant('w:numFmt')?.getAttribute('w:val');
          if (absId) {
            abstractNums[absId] = numFmt === 'bullet' ? 'ul' : 'ol';
          }
        }

        for (const num of numNodes) {
          const numId = num.getAttribute('w:numId') || num.getAttribute('numId');
          const absRef = num.findFirstDescendant('w:abstractNumId')?.getAttribute('w:val');
          if (numId && absRef && abstractNums[absRef]) {
            numberingTypes[numId] = abstractNums[absRef];
          }
        }
      } catch (err) {
        console.warn('[DocxExporterService] Aviso ao ler numbering.xml:', err);
      }
    }

    // 5. Extrair cabeçalhos e rodapés oficiais
    let docHeaderHtml = '';
    let docFooterHtml = '';
    for (const key of Object.keys(unzipped)) {
      if (/^word\/header\d*\.xml$/i.test(key)) {
        try {
          const hStr = fflate.strFromU8(unzipped[key]);
          const hXml = parseXml(hStr);
          const text = hXml.getTextContent().trim();
          if (text && !docHeaderHtml) {
            docHeaderHtml = `<header class="document-header" style="text-align: right; font-size: 9pt; color: #64748b; margin-bottom: 18pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 6pt;">${text}</header>`;
          }
        } catch {}
      } else if (/^word\/footer\d*\.xml$/i.test(key)) {
        try {
          const fStr = fflate.strFromU8(unzipped[key]);
          const fXml = parseXml(fStr);
          const text = fXml.getTextContent().trim();
          if (text && !docFooterHtml) {
            docFooterHtml = `<footer class="document-footer" style="text-align: center; font-size: 9pt; color: #64748b; margin-top: 24pt; border-top: 1px solid #e2e8f0; padding-top: 6pt;">${text}</footer>`;
          }
        } catch {}
      }
    }

    // 6. Fazer parse estrito de word/document.xml
    const docXmlStr = fflate.strFromU8(docXmlEntry);
    const docXml = parseXml(docXmlStr);

    const bodyNode = docXml.findFirstDescendant('w:body');
    if (!bodyNode) {
      throw new MalformedDocxError('Estrutura DOCX inválida: elemento <w:body> não localizado.');
    }

    const htmlBlocks: string[] = [];
    if (docHeaderHtml) htmlBlocks.push(docHeaderHtml);

    let activeList: { type: 'ol' | 'ul'; items: string[] } | null = null;

    const flushActiveList = () => {
      if (activeList && activeList.items.length > 0) {
        const tag = activeList.type;
        const listItemsHtml = activeList.items.map(it => `<li style="margin-bottom: 6pt;">${it}</li>`).join('');
        htmlBlocks.push(`<${tag} style="margin-left: 2cm; margin-bottom: 12pt; line-height: 1.5;">${listItemsHtml}</${tag}>`);
        activeList = null;
      }
    };

    for (const child of bodyNode.children) {
      if (typeof child === 'string') continue;

      const nodeName = child.name;

      if (nodeName === 'w:tbl') {
        flushActiveList();
        const tblHtml = this.convertXmlTableToHtml(child);
        if (tblHtml) htmlBlocks.push(tblHtml);
      } else if (nodeName === 'w:p') {
        // Verifica quebra de página
        const hasPageBreak = child.findFirstDescendant('w:br')?.getAttribute('w:type') === 'page' ||
          child.findFirstDescendant('w:lastRenderedPageBreak') !== null;
        if (hasPageBreak) {
          flushActiveList();
          htmlBlocks.push('<hr class="page-break" style="page-break-after: always; break-after: page; border: none; border-top: 2px dashed #3b82f6; margin: 24px 0;" data-page-break="true" />');
        }

        // Verifica imagens embutidas no parágrafo
        const drawingNodes = child.findDescendants('w:drawing').concat(child.findDescendants('w:pict'));
        if (drawingNodes.length > 0) {
          flushActiveList();
          for (const dNode of drawingNodes) {
            const blip = dNode.findFirstDescendant('a:blip') || dNode.findFirstDescendant('v:imagedata');
            const rId = blip?.getAttribute('r:embed') || blip?.getAttribute('r:id');
            if (rId && mediaRels[rId]) {
              const target = mediaRels[rId];
              const normalizedPath = target.startsWith('word/') ? target : `word/${target}`;
              const imgBytes = unzipped[normalizedPath];
              if (imgBytes && imgBytes.byteLength > 0) {
                const mime = normalizedPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
                const base64 = this.uint8ArrayToBase64(imgBytes);
                const imgHtml = `<img src="data:${mime};base64,${base64}" style="max-width: 100%; height: auto; margin: 12pt auto; display: block; border-radius: 4px;" alt="Imagem do documento" />`;
                htmlBlocks.push(imgHtml);
              }
            }
          }
        }

        // Verifica listas
        const numPr = child.findFirstDescendant('w:numPr');
        if (numPr) {
          const numId = numPr.findFirstDescendant('w:numId')?.getAttribute('w:val') || '1';
          const listType = numberingTypes[numId] || 'ul';
          const pText = this.extractParagraphRunsHtml(child);
          if (pText.trim()) {
            if (activeList && activeList.type === listType) {
              activeList.items.push(pText);
            } else {
              flushActiveList();
              activeList = { type: listType, items: [pText] };
            }
          }
          continue;
        } else {
          flushActiveList();
        }

        // Verifica títulos
        const pStyle = child.findFirstDescendant('w:pStyle')?.getAttribute('w:val') || '';
        const isHeading1 = /Heading1|Titulo1/i.test(pStyle);
        const isHeading2 = /Heading2|Titulo2/i.test(pStyle);
        const isHeading3 = /Heading3|Titulo3/i.test(pStyle);

        // Alinhamento
        const jcVal = child.findFirstDescendant('w:jc')?.getAttribute('w:val');
        let align = 'justify';
        if (jcVal === 'center') align = 'center';
        else if (jcVal === 'right') align = 'right';
        else if (jcVal === 'left') align = 'left';

        // Citação recuada (4cm)
        const indNode = child.findFirstDescendant('w:ind');
        const leftInd = indNode?.getAttribute('w:left');
        const isQuote = leftInd && (parseInt(leftInd, 10) >= 2000 || leftInd.includes('cm'));

        const pContent = this.extractParagraphRunsHtml(child);
        if (pContent.trim()) {
          if (isHeading1) {
            htmlBlocks.push(`<h1 style="text-align: ${align}; font-weight: bold; margin-top: 16pt; margin-bottom: 8pt;">${pContent}</h1>`);
          } else if (isHeading2) {
            htmlBlocks.push(`<h2 style="text-align: ${align}; font-weight: bold; margin-top: 14pt; margin-bottom: 6pt;">${pContent}</h2>`);
          } else if (isHeading3) {
            htmlBlocks.push(`<h3 style="text-align: ${align}; font-weight: bold; margin-top: 12pt; margin-bottom: 4pt;">${pContent}</h3>`);
          } else if (isQuote) {
            htmlBlocks.push(`<blockquote style="margin-left: 4cm; font-size: 10pt; line-height: 1.2; text-align: justify; font-style: italic; margin-top: 12pt; margin-bottom: 12pt; border-left: 2px solid #cbd5e1; padding-left: 8px;">${pContent}</blockquote>`);
          } else {
            const indent = align === 'justify' ? 'text-indent: 2cm; ' : '';
            htmlBlocks.push(`<p style="${indent}margin-bottom: 12pt; text-align: ${align}; line-height: 1.5;">${pContent}</p>`);
          }
        }
      }
    }

    flushActiveList();
    if (docFooterHtml) htmlBlocks.push(docFooterHtml);

    const rawResult = htmlBlocks.length > 0 ? htmlBlocks.join('\n') : '<p>Documento vazio.</p>';

    // 7. Sanitização estrita do HTML antes da entrega ao editor
    return HtmlSanitizer.sanitize(rawResult);
  }

  private static convertXmlTableToHtml(tblNode: XmlNode): string {
    let tblHtml = '<table style="width: 100%; border-collapse: collapse; margin: 14pt 0; border: 1px solid #cbd5e1;"><tbody>';
    const trNodes = tblNode.findChildren('w:tr');

    for (let rIdx = 0; rIdx < trNodes.length; rIdx++) {
      const tr = trNodes[rIdx];
      const isHeader = rIdx === 0 || tr.findFirstDescendant('w:tblHeader') !== null;
      tblHtml += '<tr>';

      const tcNodes = tr.findChildren('w:tc');
      for (const tc of tcNodes) {
        const shd = tc.findFirstDescendant('w:shd')?.getAttribute('w:fill');
        const bg = shd && shd !== 'auto' ? `background-color: #${shd}; ` : (isHeader ? 'background-color: #f1f5f9; ' : '');
        const fw = isHeader ? 'font-weight: bold; ' : '';
        const tag = isHeader ? 'th' : 'td';

        const pNodes = tc.findChildren('w:p');
        const cellParts: string[] = [];
        for (const p of pNodes) {
          const pt = this.extractParagraphRunsHtml(p);
          if (pt.trim()) cellParts.push(pt);
        }
        const cellContent = cellParts.join('<br>') || '&nbsp;';
        tblHtml += `<${tag} style="border: 1px solid #cbd5e1; padding: 6pt 10pt; ${bg}${fw}">${cellContent}</${tag}>`;
      }
      tblHtml += '</tr>';
    }

    tblHtml += '</tbody></table>';
    return tblHtml;
  }

  private static extractParagraphRunsHtml(pNode: XmlNode): string {
    const runs = pNode.findDescendants('w:r');
    let pText = '';

    for (const r of runs) {
      const rPr = r.findFirstDescendant('w:rPr');
      const isBold = rPr?.findFirstDescendant('w:b') !== null;
      const isItalic = rPr?.findFirstDescendant('w:i') !== null;
      const isUnderline = rPr?.findFirstDescendant('w:u') !== null;
      const isStrike = rPr?.findFirstDescendant('w:strike') !== null;
      const isSub = rPr?.findFirstDescendant('w:vertAlign')?.getAttribute('w:val') === 'subscript';
      const isSup = rPr?.findFirstDescendant('w:vertAlign')?.getAttribute('w:val') === 'superscript';
      const highlight = rPr?.findFirstDescendant('w:highlight')?.getAttribute('w:val');
      const color = rPr?.findFirstDescendant('w:color')?.getAttribute('w:val');

      const tNodes = r.findChildren('w:t');
      for (const t of tNodes) {
        let text = t.getTextContent();
        if (!text) continue;

        // Escapa caracteres HTML
        text = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        if (isBold) text = `<strong>${text}</strong>`;
        if (isItalic) text = `<em>${text}</em>`;
        if (isUnderline) text = `<u>${text}</u>`;
        if (isStrike) text = `<s>${text}</s>`;
        if (isSub) text = `<sub>${text}</sub>`;
        if (isSup) text = `<sup>${text}</sup>`;
        if (highlight) text = `<mark style="background-color: ${highlight}">${text}</mark>`;
        if (color && color !== 'auto') text = `<span style="color: #${color}">${text}</span>`;

        pText += text;
      }
    }

    return pText;
  }

  private static uint8ArrayToBase64(bytes: Uint8Array): string {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes).toString('base64');
    }
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
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
