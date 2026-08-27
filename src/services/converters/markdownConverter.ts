import { jsPDF } from 'jspdf';
import { sanitizeClonedDocCss } from '../../utils/cssSanitizer';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

export interface MarkdownConversionOptions {
  fileName?: string;
  onProgress?: (percent: number, status: string) => void;
}

/**
 * Sanitiza cirurgicamente o texto eliminando UTF-8 BOM, caracteres de controle
 * e APENAS pares surrogates de Emojis de 4-bytes (que corrompem o canvas gerando Ø=\u0096, Ø<ßÛ).
 * Preserva 100% da acentuação em Português (á, é, í, ó, ú, ç, ã, õ, Â, É, Ô), números e nomes de seções.
 */
function cleanGarbledSurrogates(text: string): string {
  if (!text) return '';
  return text
    .replace(/^\ufeff/, '') // Remove UTF-8 BOM
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u0080-\u009F]/g, '') // Remove caracteres de controle
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ''); // Expurga cirurgicamente apenas Emojis de 4-bytes
}

/**
 * Formata marcadores de texto embutido (negrito, itálico, código, links).
 * Normaliza delimitadores inline para garantir que parágrafos e listas sejam processados
 * como um único nó DOM contínuo e unificado no html2canvas, eliminando 100% de lacunas, saltos e sobreposições.
 */
function formatInlineMarkdown(text: string): string {
  if (!text) return '';

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1');
}

/**
 * Converte a estrutura sintática do arquivo Markdown em HTML limpo de alta fidelidade no padrão Google Docs.
 */
export function renderMarkdownToHtml(mdText: string): string {
  if (!mdText) return '<p></p>';

  const lines = mdText.replace(/^\ufeff/, '').split(/\r?\n/);
  let html = '';

  let inCodeBlock = false;
  let codeBlockContent = '';

  let inTable = false;
  let tableRows: string[] = [];

  function flushTable() {
    if (!inTable || tableRows.length === 0) return;

    let tableHtml = '<table style="width:100%; border-collapse:collapse; table-layout:fixed; margin:14px 0; font-size:9.5pt; page-break-inside:avoid !important; break-inside:avoid-page !important;">';

    tableRows.forEach((rowStr, idx) => {
      if (rowStr.includes('---') || rowStr.includes(':-')) return;

      const cells = rowStr.split('|').map((c) => c.trim()).filter((_, cIdx, arr) => cIdx > 0 && cIdx < arr.length - 1);
      if (cells.length === 0) return;

      const isHeader = idx === 0;
      tableHtml += '<tr style="page-break-inside:avoid !important; break-inside:avoid-page !important;">';
      cells.forEach((cellText, colIdx) => {
        const tag = isHeader ? 'th' : 'td';
        let widthAttr = '';
        if (cells.length === 4) {
          if (colIdx === 0) widthAttr = 'width:26%;';
          if (colIdx === 1) widthAttr = 'width:26%;';
          if (colIdx === 2) widthAttr = 'width:28%;';
          if (colIdx === 3) widthAttr = 'width:20%;';
        }

        const style = isHeader
          ? `${widthAttr} padding:7px 9px; border:1px solid #475569; font-weight:bold; text-align:left; background-color:#F1F5F9; color:#0f172a; word-wrap:break-word; overflow-wrap:break-word;`
          : `${widthAttr} padding:6px 9px; border:1px solid #CBD5E1; color:#1e293b; text-align:left; word-wrap:break-word; overflow-wrap:break-word;`;
        const cleanCell = cleanGarbledSurrogates(cellText);
        tableHtml += `<${tag} style="${style}">${formatInlineMarkdown(cleanCell)}</${tag}>`;
      });
      tableHtml += '</tr>';
    });

    tableHtml += '</table>';
    html += tableHtml;

    inTable = false;
    tableRows = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        const safeCode = codeBlockContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        html += `<pre style="background-color:#F8FAFC; border:1px solid #CBD5E1; padding:10px 14px; border-radius:6px; font-family:'Courier New', Courier, monospace; font-size:8.5pt; line-height:1.35; color:#0f172a; margin:12px 0; white-space:pre-wrap; word-break:break-all; page-break-inside:avoid !important; break-inside:avoid-page !important;"><code style="display:block; margin-top:0px; padding-top:0px;">${safeCode.trim()}</code></pre>\n`;
        inCodeBlock = false;
        codeBlockContent = '';
      } else {
        flushTable();
        inCodeBlock = true;
        codeBlockContent = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent += line + '\n';
      continue;
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      tableRows.push(trimmed);
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (!trimmed) {
      continue;
    }

    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      html += `<hr style="border:none; border-top:1px solid #CBD5E1; margin:14px 0; clear:both;" />\n`;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      const cleanTitle = cleanGarbledSurrogates(trimmed.substring(2));
      html += `<h1 style="font-size:14pt; font-weight:bold; color:#0f172a; margin:18px 0 8px 0; font-family:Arial, sans-serif; text-transform:uppercase; page-break-after:avoid !important; break-after:avoid-page !important;">${formatInlineMarkdown(cleanTitle)}</h1>\n`;
    } else if (trimmed.startsWith('## ')) {
      const cleanTitle = cleanGarbledSurrogates(trimmed.substring(3));
      html += `<h2 style="font-size:12pt; font-weight:bold; color:#0f172a; margin:14px 0 6px 0; font-family:Arial, sans-serif; page-break-after:avoid !important; break-after:avoid-page !important;">${formatInlineMarkdown(cleanTitle)}</h2>\n`;
    } else if (trimmed.startsWith('### ')) {
      const cleanTitle = cleanGarbledSurrogates(trimmed.substring(4));
      html += `<h3 style="font-size:11pt; font-weight:bold; color:#1e293b; margin:12px 0 4px 0; font-family:Arial, sans-serif; page-break-after:avoid !important; break-after:avoid-page !important;">${formatInlineMarkdown(cleanTitle)}</h3>\n`;
    } else if (trimmed.startsWith('> ')) {
      html += `<blockquote style="margin:10px 0; padding:8px 12px; border-left:4px solid #3b82f6; background-color:#f8fafc; color:#334155; font-style:italic; font-size:10pt; page-break-inside:avoid !important; break-inside:avoid-page !important;">${formatInlineMarkdown(cleanGarbledSurrogates(trimmed.substring(2)))}</blockquote>\n`;
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const cleanLine = cleanGarbledSurrogates(trimmed.substring(2));
      html += `<p style="margin:0 0 6px 0; padding-left:12px; font-size:11pt; color:#1e293b; line-height:1.35; font-family:Arial, sans-serif; text-align:left !important;">• ${formatInlineMarkdown(cleanLine)}</p>\n`;
    } else if (/^\d+[\.\)]\s+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+[\.\)])\s+(.*)$/);
      const num = match ? match[1] : '';
      const rest = match ? match[2] : trimmed;
      const cleanRest = cleanGarbledSurrogates(rest);
      html += `<p style="margin:0 0 6px 0; font-size:11pt; color:#1e293b; line-height:1.35; font-family:Arial, sans-serif; text-align:left !important;">${num} ${formatInlineMarkdown(cleanRest)}</p>\n`;
    } else {
      const cleanText = cleanGarbledSurrogates(trimmed);
      html += `<p style="margin:0 0 6px 0; font-size:11pt; color:#1e293b; line-height:1.35; font-family:Arial, sans-serif; text-align:left !important;">${formatInlineMarkdown(cleanText)}</p>\n`;
    }
  }

  flushTable();
  return html;
}

/**
 * Converte arquivo Markdown (.md) para PDF A4 com alinhamento 100% contínuo e sem sobreposição de blocos.
 */
export async function convertMarkdownToPdf(
  file: File,
  options?: MarkdownConversionOptions
): Promise<{ blob: Blob; size: number }> {
  options?.onProgress?.(20, `Lendo documento Markdown (${file.name})...`);
  const text = await file.text();

  options?.onProgress?.(40, 'Renderizando documento HTML com alinhamento contínuo...');
  const htmlContent = renderMarkdownToHtml(text);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
  iframe.style.border = 'none';

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
            line-height: 1.28 !important;
            text-align: left !important;
            width: 451.28pt !important;
          }
          #md-root {
            padding: 0 !important;
            width: 100% !important;
            display: block !important;
          }
          h1, h2, h3, h4, h5, h6, p, div, pre, table, blockquote, hr {
            display: block !important;
            width: 100% !important;
            clear: both !important;
            position: relative !important;
          }
          h1 {
            font-size: 12pt !important;
            font-weight: bold !important;
            margin-top: 12pt !important;
            margin-bottom: 6pt !important;
            color: #0f172a !important;
            text-align: center !important;
          }
          h2 {
            font-size: 11.5pt !important;
            font-weight: bold !important;
            margin-top: 10pt !important;
            margin-bottom: 6pt !important;
            color: #0f172a !important;
          }
          h3 {
            font-size: 11pt !important;
            font-weight: bold !important;
            margin-top: 8pt !important;
            margin-bottom: 4pt !important;
            color: #1e293b !important;
          }
          p {
            margin-top: 0 !important;
            margin-bottom: 6pt !important;
            font-size: 11pt !important;
            color: #1e293b !important;
            line-height: 1.28 !important;
          }
          b, strong {
            font-weight: bold !important;
            color: #000000 !important;
          }
          pre, table, tr, blockquote {
            page-break-inside: avoid !important;
            break-inside: avoid-page !important;
          }
          h1, h2, h3 {
            page-break-after: avoid !important;
            break-after: avoid-page !important;
          }
        </style>
      </head>
      <body>
        <div id="md-root">${htmlContent}</div>
      </body>
    </html>
  `);
  iframeDoc.close();

  await new Promise((r) => setTimeout(r, 150));

  const targetElement = (iframeDoc.getElementById('md-root') || iframeDoc.body) as HTMLElement;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidthPt = 595.28;
  const pageHeightPt = 841.89;
  const marginPt = 72; // 2.54 cm exato (1 polegada)
  const contentWidthPt = pageWidthPt - 2 * marginPt; // 451.28 pt

  await doc.html(targetElement, {
    callback: () => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    },
    x: 0,
    y: 0,
    width: contentWidthPt,
    windowWidth: contentWidthPt,
    margin: [marginPt, marginPt, marginPt, marginPt],
    autoPaging: 'text',
    html2canvas: {
      useCORS: true,
      allowTaint: true,
      scale: 1,
      logging: false,
      onclone: (clonedDoc: Document) => {
        sanitizeClonedDocCss(clonedDoc);
      },
    },
  } as any);

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Página ${i} de ${totalPages}`, pageWidthPt - marginPt, pageHeightPt - 36, { align: 'right' });
  }

  const pdfBlob = doc.output('blob');
  options?.onProgress?.(100, `PDF gerado com sucesso a partir de ${file.name}!`);
  return { blob: pdfBlob, size: pdfBlob.size };
}

export async function convertMarkdownToDocx(
  file: File,
  options?: MarkdownConversionOptions
): Promise<{ blob: Blob; size: number }> {
  options?.onProgress?.(30, 'Convertendo Markdown para DOCX...');
  const text = await file.text();
  const paragraphs = text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map((l) => new Paragraph({ children: [new TextRun({ text: l.trim(), size: 22 })] }));

  const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
  const docxBlob = await Packer.toBlob(doc);

  options?.onProgress?.(100, 'DOCX gerado com sucesso!');
  return { blob: docxBlob, size: docxBlob.size };
}
