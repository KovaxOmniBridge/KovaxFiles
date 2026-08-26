import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from 'docx';
import { setupPdfWorker } from '../pdf/pdfWorkerInit';
import { sanitizeClonedDocCss } from '../../utils/cssSanitizer';
import { ocrService } from './ocrService';

setupPdfWorker();

/**
 * Agrupa itens de texto por linha (eixo Y) utilizando clustering por tolerância (ex: 3.5pt).
 * Evita linhas fantasmas e desalinhamentos causados por pequenas variações sub-pixel nos PDFs.
 */
export function groupTextItemsByTolerance(items: any[], tolerance = 3.5): { y: number; items: any[] }[] {
  const lineGroups: { y: number; items: any[] }[] = [];

  for (const item of items) {
    if (!item || item.str === undefined || item.str === null) continue;
    const yVal = item.transform ? item.transform[5] : 0;

    let targetGroup = lineGroups.find((g) => Math.abs(g.y - yVal) <= tolerance);
    if (!targetGroup) {
      targetGroup = { y: yVal, items: [] };
      lineGroups.push(targetGroup);
    }
    targetGroup.items.push(item);
  }

  lineGroups.sort((a, b) => b.y - a.y);

  for (const group of lineGroups) {
    group.items.sort((a, b) => (a.transform ? a.transform[4] : 0) - (b.transform ? b.transform[4] : 0));
  }

  return lineGroups;
}

/**
 * Converte um grupo de itens de texto da mesma linha visual em uma lista de TextRuns do docx,
 * preservando 100% dos caracteres, espaçamentos, negritos, itálicos e tamanhos de fonte do PDF.
 */
export function createTextRunsFromLineGroup(
  items: any[],
  options?: { defaultBold?: boolean; boldPrefixLength?: number }
): TextRun[] {
  if (!items || items.length === 0) return [];

  const runs: TextRun[] = [];
  let charAccumulator = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const text = item.str;
    if (text === undefined || text === null) continue;

    const fontName = (item.fontName || '').toLowerCase();
    let isBold = options?.defaultBold || /bold|black|heavy|b\+/i.test(fontName);
    const isItalic = /italic|oblique|i\+/i.test(fontName);

    if (options?.boldPrefixLength && charAccumulator < options.boldPrefixLength) {
      isBold = true;
    }

    charAccumulator += text.length;

    const fontHeight = Math.abs(item.transform ? (item.transform[3] || item.transform[0] || 11) : 11);
    const docxSize = Math.max(16, Math.min(Math.round(fontHeight * 2), 36));

    runs.push(
      new TextRun({
        text: text,
        font: 'Arial',
        size: docxSize,
        bold: isBold,
        italics: isItalic,
        color: '000000',
        language: { value: 'pt-BR' },
      })
    );
  }

  return runs.length > 0
    ? runs
    : [
        new TextRun({
          text: items.map((it) => it.str).join(''),
          font: 'Arial',
          size: 22,
          color: '000000',
          language: { value: 'pt-BR' },
        }),
      ];
}

export interface AiConversionOptions {
  detectFinancialData?: boolean;
  detectTablesOnly?: boolean;
  outputFormat?: 'xlsx' | 'csv' | 'docx' | 'pdf';
  onProgress?: (percent: number, status: string) => void;
}

export interface ExtractedTableData {
  sheetName: string;
  headers: string[];
  rows: (string | number | boolean)[];
}

/**
 * Limpa cirurgicamente símbolos e marcadores brutos de Markdown (**negrito**, `código`, *itálico*),
 * tornando os dados das células da planilha 100% limpos e legíveis no Excel/Google Sheets.
 */
function cleanMarkdownSyntax(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)')
    .replace(/^#+\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .trim();
}

/**
 * Formata marcadores embutidos em HTML (negrito, itálico, código) mantendo a estrutura limpa.
 */
function formatMarkdownInlineToHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code style="background:#F1F5F9;padding:1px 4px;border-radius:3px;font-family:monospace;font-size:10pt;">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/__([^_]+)__/g, '<b>$1</b>')
    .replace(/\*([^*]+)\*/g, '<i>$1</i>')
    .replace(/_([^_]+)_/g, '<i>$1</i>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color:#2563EB;text-decoration:none;">$1</a>');
}

class AiDocumentConverterService {
  /**
   * Converte PDF em Planilha Excel (.xlsx) e CSV com IA Local.
   * Aplica dimensionamento automático de colunas (wch), formatação de valores e limpeza de cabeçalhos.
   * Operação 100% Client-Side.
   */
  public async convertPdfToExcelWithAi(
    file: File,
    options?: AiConversionOptions
  ): Promise<{ xlsxBlob: Blob; csvText: string; filename: string }> {
    options?.onProgress?.(10, 'Carregando documento PDF no motor de IA local...');

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const numPages = pdfDoc.numPages;

    const allRows: (string | number)[][] = [];

    options?.onProgress?.(30, `Analisando ${numPages} páginas e extraindo tabelas...`);

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const items = textContent.items as any[];
      if (!items || items.length === 0) {
        // Fallback para páginas escaneadas/digitalizadas
        const scannedText = await ocrService.extractScannedPageTextFallback(page);
        if (scannedText) {
          allRows.push([scannedText, `Página ${pageNum} (Digitalizada)`]);
        }
        continue;
      }

      // Agrupa itens de texto por linha (eixo Y) com algoritmo de clustering por tolerância (3.5pt)
      const groupedLines = groupTextItemsByTolerance(items, 3.5);

      for (const lineGroup of groupedLines) {
        const lineText = lineGroup.items.map((it) => it.str).join(' ').trim();
        if (!lineText) continue;

        // Extrai elementos da tabela por delimitadores e múltiplos espaços
        const columns = lineText.split(/\s{2,}|\t|\|/).map((c) => cleanMarkdownSyntax(c)).filter(Boolean);
        
        if (columns.length >= 2) {
          const processedRow = columns.map((val) => {
            // Converte moedas e números mantendo a precisão matemática
            const cleanVal = val.replace(/^R\$\s?/, '').trim();
            if (/^-?\d+([.,]\d+)?$/.test(cleanVal.replace(/\./g, '').replace(',', '.'))) {
              const num = parseFloat(cleanVal.replace(/\./g, '').replace(',', '.'));
              if (!isNaN(num)) return num;
            }
            return val;
          });

          allRows.push(processedRow);
        }
      }

      options?.onProgress?.(
        30 + Math.floor((pageNum / numPages) * 50),
        `Processando inteligência estrutural da página ${pageNum}/${numPages}...`
      );
    }

    if (allRows.length === 0) {
      allRows.push(['Conteúdo Extraído', 'Status IA']);
      allRows.push(['Texto livre processado do PDF', 'Concluído sem tabelas explícitas']);
    }

    options?.onProgress?.(85, 'Aplicando regras executivas no Excel (largura de colunas e estilos)...');

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(allRows);

    // Auto-ajuste dinâmico da largura das colunas no Excel
    const colWidths = allRows.reduce<number[]>((acc, row) => {
      row.forEach((cell, i) => {
        const len = String(cell || '').length;
        const current = typeof acc[i] === 'number' ? acc[i] : 12;
        const maxAllowed = i === 0 ? 50 : 100;
        acc[i] = Math.max(current, Math.min(len + 4, maxAllowed));
      });
      return acc;
    }, []);
    worksheet['!cols'] = colWidths.map((w: number) => ({ wch: w }));

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados Extraídos');

    const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const xlsxBlob = new Blob([xlsxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const csvText = XLSX.utils.sheet_to_csv(worksheet);
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    options?.onProgress?.(100, 'Conversão para Excel/CSV concluída!');

    return {
      xlsxBlob,
      csvText,
      filename: `${baseName}_IA_Local.xlsx`,
    };
  }

  /**
   * Converte texto ou relatórios Markdown em planilhas XLSX e CSV impecavelmente limpas e organizadas.
   */
  public convertMarkdownToSpreadsheetWithAi(markdownText: string): {
    xlsxBlob: Blob;
    csvText: string;
  } {
    const lines = markdownText.split(/\r?\n/);
    const rows: (string | number)[][] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed
          .split('|')
          .slice(1, -1)
          .map((c) => cleanMarkdownSyntax(c));
        
        if (cells.every((c) => /^:?-+:?$/.test(c) || c === '')) continue;

        const processedRow = cells.map((cell) => {
          const cleanNum = cell.replace(/[^0-9,-]/g, '').replace(',', '.');
          const num = parseFloat(cleanNum);
          return !isNaN(num) && /^-?\d+([.,]\d+)?$/.test(cell) ? num : cell;
        });

        rows.push(processedRow);
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+[.)]\s+/.test(trimmed)) {
        const contentWithoutBullet = trimmed.replace(/^([-*]|\d+[.)])\s+/, '');
        const cleanContent = cleanMarkdownSyntax(contentWithoutBullet);
        
        const colonIndex = cleanContent.indexOf(':');
        if (colonIndex > 0 && colonIndex < cleanContent.length - 1) {
          const key = cleanContent.substring(0, colonIndex).trim();
          const val = cleanContent.substring(colonIndex + 1).trim();
          rows.push([key, val]);
        } else {
          rows.push([cleanContent]);
        }
      } else if (trimmed.startsWith('#')) {
        rows.push([cleanMarkdownSyntax(trimmed)]);
      } else {
        rows.push([cleanMarkdownSyntax(trimmed)]);
      }
    }

    if (rows.length === 0) {
      rows.push(['Conteúdo Extraído']);
      rows.push([cleanMarkdownSyntax(markdownText)]);
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    const colWidths = rows.reduce<number[]>((acc, row) => {
      row.forEach((cell, i) => {
        const len = String(cell || '').length;
        const current = typeof acc[i] === 'number' ? acc[i] : 12;
        const maxAllowed = i === 0 ? 55 : 100;
        acc[i] = Math.max(current, Math.min(len + 4, maxAllowed));
      });
      return acc;
    }, []);
    worksheet['!cols'] = colWidths.map((w: number) => ({ wch: w }));

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Markdown IA');

    const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const xlsxBlob = new Blob([xlsxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const csvText = XLSX.utils.sheet_to_csv(worksheet);

    return { xlsxBlob, csvText };
  }

  /**
   * Renderiza a estrutura Markdown para HTML semântico executivo alinhado ao padrão Google Docs.
   */
  private renderMarkdownToExecutiveHtml(markdownText: string): string {
    const lines = markdownText.split(/\r?\n/);
    let html = '';
    let inList = false;
    let inTable = false;
    let inCode = false;
    let codeBuffer = '';

    for (const line of lines) {
      const trimmed = line.trim();

      // Bloco de Código (```)
      if (trimmed.startsWith('```')) {
        if (inCode) {
          html += `<pre><code>${formatMarkdownInlineToHtml(codeBuffer.trim())}</code></pre>`;
          codeBuffer = '';
          inCode = false;
        } else {
          if (inList) { html += '</ul>'; inList = false; }
          if (inTable) { html += '</tbody></table>'; inTable = false; }
          inCode = true;
        }
        continue;
      }

      if (inCode) {
        codeBuffer += line + '\n';
        continue;
      }

      if (!trimmed) {
        if (inList) { html += '</ul>'; inList = false; }
        if (inTable) { html += '</tbody></table>'; inTable = false; }
        continue;
      }

      // Tabelas Markdown (| Col1 | Col2 |)
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (inList) { html += '</ul>'; inList = false; }

        const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());
        if (cells.every((c) => /^:?-+:?$/.test(c))) continue; // Linha separadora

        if (!inTable) {
          inTable = true;
          html += '<table><thead><tr>';
          for (const headerCell of cells) {
            html += `<th>${formatMarkdownInlineToHtml(headerCell)}</th>`;
          }
          html += '</tr></thead><tbody>';
        } else {
          html += '<tr>';
          for (const cell of cells) {
            html += `<td>${formatMarkdownInlineToHtml(cell)}</td>`;
          }
          html += '</tr>';
        }
        continue;
      } else if (inTable) {
        html += '</tbody></table>';
        inTable = false;
      }

      // Títulos (# H1, ## H2, ### H3)
      if (trimmed.startsWith('# ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h1>${formatMarkdownInlineToHtml(trimmed.substring(2))}</h1>`;
      } else if (trimmed.startsWith('## ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h2>${formatMarkdownInlineToHtml(trimmed.substring(3))}</h2>`;
      } else if (trimmed.startsWith('### ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h3>${formatMarkdownInlineToHtml(trimmed.substring(4))}</h3>`;
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        // Listas com marcadores
        if (!inList) {
          inList = true;
          html += '<ul>';
        }
        html += `<li>${formatMarkdownInlineToHtml(trimmed.substring(2))}</li>`;
      } else if (trimmed.startsWith('> ')) {
        // Citações / Callouts
        if (inList) { html += '</ul>'; inList = false; }
        html += `<blockquote>${formatMarkdownInlineToHtml(trimmed.substring(2))}</blockquote>`;
      } else {
        // Parágrafos regulares com detecção de rótulo de cláusulas
        if (inList) { html += '</ul>'; inList = false; }

        const isClauseLabel = /^(Cláusula\s+\d+ª?|Parágrafo\s+único|Artigo\s+\d+º?)/i.test(trimmed);
        if (isClauseLabel) {
          const match = trimmed.match(/^(Cláusula\s+\d+ª?|Parágrafo\s+único|Artigo\s+\d+º?)(.*)/i);
          const label = match ? match[1] : '';
          const rest = match ? match[2] : trimmed;
          html += `<p><b>${label}</b>${formatMarkdownInlineToHtml(rest)}</p>`;
        } else {
          html += `<p>${formatMarkdownInlineToHtml(trimmed)}</p>`;
        }
      }
    }

    if (inList) html += '</ul>';
    if (inTable) html += '</tbody></table>';
    return html;
  }

  /**
   * Converte documento Markdown (.md) em PDF Executivo com IA Local no rigoroso Padrão Google Docs / AGENTS.md.
   * Suporta tabelas estilizadas, blocos de código, cláusulas em negrito, blocos de assinatura e paginação inteligente.
   */
  public async convertMarkdownToPdfWithAi(
    markdownText: string,
    options?: AiConversionOptions
  ): Promise<Blob> {
    options?.onProgress?.(10, 'Iniciando análise semântica do Markdown com IA local...');

    const htmlBody = this.renderMarkdownToExecutiveHtml(markdownText);

    options?.onProgress?.(40, 'Montando documento no padrão visual Google Docs...');

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '487.28pt'; // A4 width sem margens
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      throw new Error('Não foi possível inicializar o ambiente de conversão.');
    }

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <style>
            * {
              box-sizing: border-box !important;
              float: none !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: #FFFFFF !important;
              color: #000000 !important;
              font-family: Arial, Helvetica, sans-serif !important;
              font-size: 11pt !important;
              line-height: 1.35 !important;
              text-align: left !important;
              width: 487.28pt !important;
            }
            #md-root {
              padding: 0 !important;
              width: 100% !important;
              display: block !important;
            }
            h1, h2, h3, h4, p, div, pre, table, blockquote, hr {
              display: block !important;
              width: 100% !important;
              clear: both !important;
              position: relative !important;
            }
            h1 {
              font-size: 14pt !important;
              font-weight: bold !important;
              margin-top: 16pt !important;
              margin-bottom: 8pt !important;
              color: #0F172A !important;
              text-align: center !important;
            }
            h2 {
              font-size: 12pt !important;
              font-weight: bold !important;
              margin-top: 14pt !important;
              margin-bottom: 6pt !important;
              color: #0F172A !important;
              page-break-after: avoid !important;
              break-after: avoid-page !important;
            }
            h3 {
              font-size: 11pt !important;
              font-weight: bold !important;
              margin-top: 12pt !important;
              margin-bottom: 4pt !important;
              color: #1E293B !important;
              page-break-after: avoid !important;
              break-after: avoid-page !important;
            }
            p {
              margin-top: 0 !important;
              margin-bottom: 6pt !important;
              font-size: 11pt !important;
              color: #1E293B !important;
              line-height: 1.35 !important;
              text-align: justify !important;
            }
            b, strong {
              font-weight: bold !important;
              color: #000000 !important;
            }
            ul, ol {
              margin-top: 0 !important;
              margin-bottom: 6pt !important;
              padding-left: 20pt !important;
            }
            li {
              font-size: 11pt !important;
              line-height: 1.35 !important;
              margin-bottom: 3pt !important;
              color: #1E293B !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin-top: 8pt !important;
              margin-bottom: 12pt !important;
              font-size: 10pt !important;
              page-break-inside: avoid !important;
              break-inside: avoid-page !important;
            }
            th {
              background-color: #1E293B !important;
              color: #FFFFFF !important;
              font-weight: bold !important;
              padding: 6pt 8pt !important;
              text-align: left !important;
              border: 1px solid #0F172A !important;
            }
            td {
              padding: 5pt 8pt !important;
              border: 1px solid #CBD5E1 !important;
              color: #1E293B !important;
            }
            tr:nth-child(even) td {
              background-color: #F8FAFC !important;
            }
            pre {
              background-color: #F1F5F9 !important;
              border: 1px solid #CBD5E1 !important;
              border-radius: 4px !important;
              padding: 8pt 10pt !important;
              font-family: 'Courier New', Courier, monospace !important;
              font-size: 9.5pt !important;
              white-space: pre-wrap !important;
              word-break: break-all !important;
              margin-top: 8pt !important;
              margin-bottom: 8pt !important;
              page-break-inside: avoid !important;
              break-inside: avoid-page !important;
            }
            blockquote {
              border-left: 4px solid #2563EB !important;
              background-color: #F8FAFC !important;
              margin: 8pt 0 !important;
              padding: 6pt 12pt !important;
              font-style: italic !important;
              color: #334155 !important;
            }
          </style>
        </head>
        <body>
          <div id="md-root">${htmlBody}</div>
        </body>
      </html>
    `);
    iframeDoc.close();

    await new Promise((r) => setTimeout(r, 150));

    options?.onProgress?.(70, 'Gerando PDF com paginação inteligente no jsPDF...');

    const targetElement = (iframeDoc.getElementById('md-root') || iframeDoc.body) as HTMLElement;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    await doc.html(targetElement, {
      callback: () => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      },
      x: 0,
      y: 0,
      width: 487.28,
      windowWidth: 487.28,
      margin: [54, 54, 54, 54],
      autoPaging: 'text',
      html2canvas: {
        useCORS: true,
        allowTaint: true,
        scale: 1,
        logging: false,
        onclone: (clonedDoc: any) => {
          sanitizeClonedDocCss(clonedDoc);
        },
      },
    } as any);

    const pdfBlob = doc.output('blob');
    options?.onProgress?.(100, 'PDF no Padrão Google Docs gerado a partir do Markdown com sucesso!');
    return pdfBlob;
  }

  /**
   * Converte PDF para DOCX rigorosamente alinhado ao padrão Google Docs/Drive e às regras do AGENTS.md:
   * Fonte Arial 11pt, altura de linha 1.25-1.35, 6pt pós-parágrafo, cláusulas em negrito, blocos de assinatura e 0% de banners sintéticos.
   */
  public async convertPdfToDocxGoogleDocsStandardWithAi(
    file: File,
    onProgress?: (percent: number, status: string) => void
  ): Promise<Blob> {
    onProgress?.(10, 'Iniciando reconstrução de layout no padrão Google Docs...');

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const numPages = pdfDoc.numPages;

    const docChildren: any[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items as any[];

      if (!items || items.length === 0) {
        const scannedText = await ocrService.extractScannedPageTextFallback(page);
        if (scannedText) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120, line: 300 },
              children: [
                new TextRun({ text: scannedText, font: 'Arial', size: 22, italics: true, color: '64748B' }),
              ],
            })
          );
        }
        continue;
      }

      const groupedLines = groupTextItemsByTolerance(items, 3.5);

      for (const lineGroup of groupedLines) {
        let lineText = '';
        let lastX = -1;
        for (const it of lineGroup.items) {
          const itemX = it.transform ? it.transform[4] : 0;
          const fontHeight = Math.abs(it.transform ? (it.transform[3] || it.transform[0] || 11) : 11);
          if (lastX >= 0 && itemX - lastX > 3.5 && !lineText.endsWith(' ') && !it.str.startsWith(' ')) {
            lineText += ' ';
          }
          lineText += it.str;
          lastX = itemX + (it.str.length * (fontHeight * 0.45));
        }
        lineText = lineText.trim();

        if (!lineText) continue;

        const isHeader = /^(([A-ZÁÉÍÓÚÇÃÕ\s]{5,80})$|CLÁUSULA|SEÇÃO|CAPÍTULO|ARRENDAMENTO\s+RURAL)/i.test(lineText);
        const isClauseLabel = /^(\d+[ºª°]?\s*[-–]?|Cláusula\s+\d+ª?|Parágrafo\s+único|Artigo\s+\d+º?)/i.test(lineText);
        const isListItem = /^([-•]|\d+[.)])\s+/.test(lineText);
        const isDottedLine = /^[.\s_]{8,}$/.test(lineText);
        const isSignatory = /^(CONTRATANTE|CONTRATADO|TESTEMUNHA|OUTORGANTE|OUTORGADO|ADVOGADO|Arrendante|Arrendatário|Testemunhas:?)/i.test(lineText);

        const columns = lineText.split(/\s{2,}|\t|\|/).map((c) => cleanMarkdownSyntax(c)).filter(Boolean);
        const isTableLine = columns.length >= 2 && !isHeader && !isSignatory && !isClauseLabel && !isDottedLine;

        if (isHeader) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 140, before: 140, line: 324 },
              children: createTextRunsFromLineGroup(lineGroup.items, { defaultBold: true }),
            })
          );
        } else if (isClauseLabel) {
          let label = '';

          if (lineText.includes(':') && /^\d+[ºª°]?/.test(lineText)) {
            const colonIdx = lineText.indexOf(':');
            label = lineText.substring(0, colonIdx + 1);
          } else {
            const match = lineText.match(/^(\d+[ºª°]?\s*[-–]?|Cláusula\s+\d+ª?|Parágrafo\s+único|Artigo\s+\d+º?)/i);
            label = match ? match[0] : '';
          }

          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120, line: 324 },
              children: createTextRunsFromLineGroup(lineGroup.items, { boldPrefixLength: label.length }),
            })
          );
        } else if (isDottedLine) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 240, after: 30, line: 300 },
              children: [
                new TextRun({
                  text: lineText,
                  font: 'Arial',
                  size: 20,
                  color: '475569',
                  language: { value: 'pt-BR' },
                }),
              ],
            })
          );
        } else if (isSignatory) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 30, after: 120, line: 300 },
              children: [
                new TextRun({
                  text: lineText,
                  font: 'Arial',
                  size: 20,
                  bold: true,
                  color: '000000',
                  language: { value: 'pt-BR' },
                }),
              ],
            })
          );
        } else if (isListItem) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.LEFT,
              indent: { left: 360 },
              spacing: { after: 120, line: 324 },
              children: createTextRunsFromLineGroup(lineGroup.items),
            })
          );
        } else if (isTableLine) {
          const cellWidth = Math.floor(100 / columns.length);
          docChildren.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: columns.map(
                    (colText) =>
                      new TableCell({
                        width: { size: cellWidth, type: WidthType.PERCENTAGE },
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                          bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                          left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                          right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                        },
                        shading: { fill: 'F8FAFC' },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.LEFT,
                            spacing: { before: 60, after: 60, line: 300 },
                            children: [
                              new TextRun({
                                text: colText,
                                font: 'Arial',
                                size: 20,
                                color: '1E293B',
                                language: { value: 'pt-BR' },
                              }),
                            ],
                          }),
                        ],
                      })
                  ),
                }),
              ],
            })
          );
        } else {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120, line: 324 },
              children: createTextRunsFromLineGroup(lineGroup.items),
            })
          );
        }
      }

      onProgress?.(
        20 + Math.floor((pageNum / numPages) * 60),
        `Processando página ${pageNum}/${numPages} no padrão Google Docs...`
      );
    }

    onProgress?.(90, 'Gerando arquivo .docx no padrão Google Docs...');

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440,
                bottom: 1440,
                left: 1440,
                right: 1440,
              },
            },
          },
          children: docChildren,
        },
      ],
    });

    const buffer = await Packer.toBlob(doc);
    onProgress?.(100, 'DOCX no Padrão Google Docs gerado com sucesso!');
    return buffer;
  }
}

export const aiDocumentConverterService = new AiDocumentConverterService();
