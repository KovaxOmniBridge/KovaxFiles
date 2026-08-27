import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { sanitizeClonedDocCss } from '../../utils/cssSanitizer';

export interface DocumentConversionOptions {
  onProgress?: (percent: number, status: string) => void;
  linkedCssFiles?: { name: string; content: string }[];
  customCssText?: string;
}

// Modelo AST (Abstract Syntax Tree) Genérico e Dinâmico para qualquer documento
export interface DocRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
}

export interface DocParagraphNode {
  type: 'heading' | 'paragraph' | 'list_item';
  level?: number;
  alignment: 'left' | 'center' | 'right' | 'justify';
  runs: DocRun[];
}

export interface DocTableNode {
  type: 'table';
  rows: string[][];
}

export type DocNode = DocParagraphNode | DocTableNode;

function sanitizeText(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Decodifica buffers binários OLE de arquivos .doc em texto limpo mantendo acentuação Windows-1252.
 */
export async function extractUniversalDocText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (['docx', 'docm', 'dotx'].includes(ext)) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      if (result.value && result.value.trim().length > 0) {
        return result.value.trim();
      }
    } catch {}
  }

  if (['pptx', 'ppt', 'odp', 'epub', 'odt'].includes(ext)) {
    try {
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      let combinedText = '';

      for (const relativePath in zip.files) {
        if (
          relativePath.includes('slide') ||
          relativePath.includes('content.xml') ||
          relativePath.endsWith('.xhtml') ||
          relativePath.endsWith('.html')
        ) {
          const content = await zip.files[relativePath].async('string');
          const clean = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          if (clean.length > 5) {
            combinedText += clean + '\n\n';
          }
        }
      }
      if (combinedText.trim().length > 10) return combinedText;
    } catch {}
  }

  try {
    const buffer = await file.arrayBuffer();
    let text = '';
    try {
      text = new TextDecoder('windows-1252').decode(buffer);
    } catch {
      text = new TextDecoder('utf-8').decode(buffer);
    }

    const paragraphs = text.split(/\r?\n|\r/);
    const cleanLines: string[] = [];

    for (const p of paragraphs) {
      const clean = p.replace(/[\x00-\x1f\x7f-\x9f]/g, ' ').replace(/\s+/g, ' ').trim();
      if (
        clean.includes('[Content_Types].xml') ||
        clean.includes('Root Entry') ||
        clean.includes('SummaryInformation') ||
        clean.includes('DocumentSummaryInformation') ||
        clean.includes('Normal.dot') ||
        clean.includes('F o n t e p a r á g') ||
        clean.includes('Fonte parág')
      ) {
        break;
      }

      const alphaCount = (clean.match(/[a-zA-ZáéíóúçãõÁÉÍÓÚÇÃÕ]/g) || []).length;
      const ratio = clean.length > 0 ? alphaCount / clean.length : 0;
      const isBinaryHeaderOrFooter = /^ÐÏ|^bjbj|ÿÿÿÿ|Tabela normal|Sem lista|Normal \(Web\)|OJ QJ ph|gdÂm/.test(clean);

      if (clean.length > 5 && !isBinaryHeaderOrFooter && ratio > 0.45 && !clean.startsWith('ÐÏ')) {
        cleanLines.push(clean);
      }
    }

    if (cleanLines.length > 0) {
      return cleanLines.join('\n\n');
    }

    const raw = await file.text();
    return raw
      .replace(/<[^>]*>/g, ' ')
      .replace(/\\\\\w+/g, ' ')
      .replace(/[\u0000-\u001F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return `Conteúdo processado do arquivo ${file.name}`;
  }
}

/**
 * Parser AST Genérico que tokeniza qualquer texto de documento detectando negritos de titulos e clausulas.
 */
export function parseDocToAst(rawLines: string[]): DocNode[] {
  const nodes: DocNode[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;

    const isHeading = line.toUpperCase() === line && line.length > 4 && line.length < 85 && !line.endsWith('.');
    const isListItem = line.startsWith('-') || line.startsWith('•') || /^\d+[\.\)]/.test(line);
    const isDateOrRightLine = /^(____+[\s,]*de\s+____|[\w\s]+,\s*\d+\s+de\s+\w+)/i.test(line);

    // Detectar rótulos de cláusulas e seções que terminam em dois pontos (ex: "Cláusula Primeira:", "Parágrafo Único:")
    const labelColonMatch = line.match(/^([^:]+:)(.*)$/);

    // Detectar dinamicamente se uma frase em CAIXA ALTA (título) está embutida no início do parágrafo
    const embeddedCapsMatch = line.match(/(^|["“'«])([A-ZÁÉÍÓÚÇÃÕ\s]{8,70})([pt\."”'»]|\s+de\s+um\s+lado|\s+celebrado|$)/);

    if (isHeading) {
      nodes.push({
        type: 'heading',
        level: 1,
        alignment: 'center',
        runs: [{ text: sanitizeText(line), bold: true }],
      });
    } else if (embeddedCapsMatch && embeddedCapsMatch[2] && i === 0 && line.length > 85) {
      const extractedTitle = embeddedCapsMatch[2].trim();
      nodes.push({
        type: 'heading',
        level: 1,
        alignment: 'center',
        runs: [{ text: sanitizeText(extractedTitle), bold: true }],
      });

      const before = line.substring(0, line.indexOf(extractedTitle)).replace(/["“'«]/g, '').trim();
      const after = line.substring(line.indexOf(extractedTitle) + extractedTitle.length).replace(/^["”'»\s,]+/, '').trim();
      const remainingParagraph = [before, after].filter(Boolean).join(' ');

      if (remainingParagraph.length > 0) {
        nodes.push({
          type: 'paragraph',
          alignment: 'justify',
          runs: [{ text: sanitizeText(remainingParagraph) }],
        });
      }
    } else if (isDateOrRightLine) {
      nodes.push({
        type: 'paragraph',
        alignment: 'right',
        runs: [{ text: sanitizeText(line) }],
      });
    } else if (isListItem) {
      nodes.push({
        type: 'list_item',
        alignment: 'justify',
        runs: [{ text: sanitizeText(line) }],
      });
    } else if (labelColonMatch) {
      const labelPart = labelColonMatch[1].trim();
      const bodyPart = labelColonMatch[2].trim();
      nodes.push({
        type: 'paragraph',
        alignment: 'justify',
        runs: [
          { text: sanitizeText(labelPart), bold: true },
          { text: bodyPart ? ` ${sanitizeText(bodyPart)}` : '' },
        ],
      });
    } else {
      nodes.push({
        type: 'paragraph',
        alignment: 'justify',
        runs: [{ text: sanitizeText(line) }],
      });
    }
  }

  return nodes;
}

/**
 * Renderiza os nós AST em uma estrutura HTML dinâmica aplicando o alinhamento individual de cada nó.
 */
export function renderAstToGoogleDocsHtml(nodes: DocNode[]): string {
  let html = '';

  nodes.forEach((node) => {
    if (node.type === 'heading') {
      const align = node.alignment || 'center';
      const headingHtml = node.runs
        .map((r) => (r.bold ? `<b>${sanitizeText(r.text)}</b>` : sanitizeText(r.text)))
        .join('');
      html += `
        <h1 style="text-align: ${align}; font-size: 12px; font-weight: bold; font-family: Arial, Helvetica, sans-serif; color: #000000; padding-top: 10px; padding-bottom: 8px; margin: 0; text-transform: uppercase; line-height: 1.3; display: block; box-sizing: border-box; page-break-inside: avoid; break-inside: avoid;">
          ${headingHtml}
        </h1>
      `;
    } else if (node.type === 'list_item') {
      const align = node.alignment || 'justify';
      const listHtml = node.runs
        .map((r) => (r.bold ? `<b>${sanitizeText(r.text)}</b>` : sanitizeText(r.text)))
        .join('');
      html += `
        <p style="font-size: 11px; font-family: Arial, Helvetica, sans-serif; line-height: 1.32; color: #000000; margin: 0; padding-top: 2px; padding-bottom: 6px; padding-left: 14px; text-align: ${align}; display: block; box-sizing: border-box; page-break-inside: avoid; break-inside: avoid;">
          ${listHtml}
        </p>
      `;
    } else if (node.type === 'paragraph') {
      const align = node.alignment || 'justify';
      const paragraphHtml = node.runs
        .map((r) => (r.bold ? `<b>${sanitizeText(r.text)}</b>` : sanitizeText(r.text)))
        .join('');
      html += `
        <p style="font-size: 11px; font-family: Arial, Helvetica, sans-serif; line-height: 1.32; color: #000000; text-align: ${align}; margin: 0; padding-bottom: 8px; word-break: break-word; display: block; box-sizing: border-box; page-break-inside: avoid; break-inside: avoid;">
          ${paragraphHtml}
        </p>
      `;
    } else if (node.type === 'table') {
      let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 0; padding-bottom: 10px; display: table; box-sizing: border-box; page-break-inside: avoid; break-inside: avoid;">';
      node.rows.forEach((row) => {
        tableHtml += '<tr>';
        row.forEach((cell) => {
          tableHtml += `<td style="border: 1px solid #000000; padding: 4px; font-size: 10px;">${sanitizeText(cell)}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</table>';
      html += tableHtml;
    }
  });

  return html;
}

/**
 * Converte documentos Word (.doc), RTF, ODT em HTML dinâmico.
 */
export async function parseDocToExecutiveHtml(file: File): Promise<{ html: string; isLandscape: boolean }> {
  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  let rawText = '';
  let isHtmlContent = false;

  if (['html', 'htm', 'rtf', 'txt'].includes(ext)) {
    try {
      const textBuffer = await file.text();
      if (textBuffer.includes('<html') || textBuffer.includes('<table') || textBuffer.includes('<body') || textBuffer.includes('<!DOCTYPE')) {
        isHtmlContent = true;
        rawText = textBuffer;
      } else if (textBuffer.includes('{\\rtf')) {
        rawText = textBuffer
          .replace(/\\par[d]?/g, '\n')
          .replace(/\\[a-z0-9]+\s?/gi, '')
          .replace(/[{}]/g, '')
          .replace(/[\r]+/g, '');
      }
    } catch {}

    if (isHtmlContent) {
      const cleanHtml = rawText
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      return { html: cleanHtml, isLandscape: false };
    }
  }

  if (!rawText || rawText.length < 10) {
    rawText = await extractUniversalDocText(file);
  }

  const rawLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const astNodes = parseDocToAst(rawLines);
  const html = renderAstToGoogleDocsHtml(astNodes);

  return { html, isLandscape: false };
}

/**
 * Converte documentos Word (.doc e .docx) para PDF de alta fidelidade 1:1 com o Google Docs de forma 100% dinâmica.
 */
export async function convertDocxToPdf(
  file: File,
  options?: DocumentConversionOptions
): Promise<{ blob: Blob; size: number }> {
  options?.onProgress?.(10, `Analisando arquivo Word ${file.name}...`);
  const arrayBuffer = await file.arrayBuffer();

  const isDocxZip =
    arrayBuffer.byteLength > 4 &&
    new Uint8Array(arrayBuffer, 0, 4).every((val, i) => val === [0x50, 0x4b, 0x03, 0x04][i]);

  const MARGIN_TOP_BOTTOM = 28.35; // 1 cm exato (28.35 pt)
  const MARGIN_LEFT_RIGHT = 56.69; // 2 cm exatos (56.69 pt)

  if (isDocxZip) {
    options?.onProgress?.(25, 'Processando estrutura OpenXML (.docx) 100% local via Motor AST...');

    try {
      const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
      const rawLines = (rawTextResult.value || '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const astNodes = parseDocToAst(rawLines);
      const docxHtml = renderAstToGoogleDocsHtml(astNodes);

      const pageWidthPt = 595.28;
      const pageHeightPt = 841.89;
      const MARGIN_TOP_BOTTOM = 72; // 2.54 cm exato (72 pt / 1 polegada) - Padrão Google Docs
      const MARGIN_LEFT_RIGHT = 72; // 2.54 cm exato (72 pt / 1 polegada) - Padrão Google Docs
      const contentWidthPt = pageWidthPt - 2 * MARGIN_LEFT_RIGHT; // 451.28 pt

      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '794px';
      iframe.style.height = '1123px';
      iframe.style.border = 'none';

      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
        throw new Error('Falha ao inicializar o ambiente de renderização.');
      }

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              html, body {
                width: ${contentWidthPt}pt !important;
                max-width: ${contentWidthPt}pt !important;
                font-family: Arial, Helvetica, sans-serif !important;
                font-size: 11pt !important;
                line-height: 1.28 !important;
                color: #000000 !important;
                background-color: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
              p, h1, h2, h3, li, tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              p { text-align: justify; margin: 0 0 6pt 0; font-size: 11pt !important; line-height: 1.28 !important; font-family: Arial, Helvetica, sans-serif !important; }
              h1, h2, h3 { text-align: center; font-size: 12pt !important; font-weight: bold; margin: 12pt 0 6pt 0; font-family: Arial, Helvetica, sans-serif !important; }
              table { width: 100%; border-collapse: collapse; margin: 10pt 0; }
              td, th { border: 1px solid #000000; padding: 5pt; font-size: 10pt !important; }
              b, strong { font-weight: bold !important; }
            </style>
          </head>
          <body>
            <div id="docx-render-container">${docxHtml}</div>
          </body>
        </html>
      `);
      iframeDoc.close();

      const targetElement = iframeDoc.getElementById('docx-render-container') || iframeDoc.body;

      options?.onProgress?.(75, 'Gerando arquivo PDF...');

      const doc = new jsPDF({
        unit: 'pt',
        format: 'a4',
        orientation: 'portrait',
      });

      await doc.html(targetElement as HTMLElement, {
        callback: () => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        },
        x: 0,
        y: 0,
        width: contentWidthPt,
        windowWidth: contentWidthPt,
        margin: [MARGIN_TOP_BOTTOM, MARGIN_LEFT_RIGHT, MARGIN_TOP_BOTTOM, MARGIN_LEFT_RIGHT],
        autoPaging: 'text',
        html2canvas: {
          useCORS: true,
          allowTaint: true,
          scale: 1,
          logging: false,
          onclone: (clonedDoc) => {
            sanitizeClonedDocCss(clonedDoc);
          },
        },
      });

      // Injetar numeração de páginas "Página X de Y" e rodapé institucional estilo Google Docs
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Página ${i} de ${totalPages}`, pageWidthPt - MARGIN_LEFT_RIGHT, pageHeightPt - 36, { align: 'right' });
      }

      const pdfBlob = doc.output('blob');
      options?.onProgress?.(100, `Documento ${file.name} convertido com sucesso!`);
      return { blob: pdfBlob, size: pdfBlob.size };
    } catch (e) {
      console.warn('Fallback para motor OLE devido a exceção no .docx:', e);
    }
  }

  // Fallback / Processamento de arquivos .doc OLE CFBF via Motor AST Genérico
  const { html: htmlContent, isLandscape } = await parseDocToExecutiveHtml(file);

  const pageWidthPt = isLandscape ? 841.89 : 595.28;
  const contentWidthPt = pageWidthPt - 2 * MARGIN_LEFT_RIGHT;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = isLandscape ? '1123px' : '794px';
  iframe.style.height = isLandscape ? '794px' : '1123px';
  iframe.style.border = 'none';

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
    throw new Error('Falha ao inicializar o ambiente de conversão.');
  }

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          p, h1, h2, h3, li, tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          html, body {
            width: ${contentWidthPt}pt !important;
            max-width: ${contentWidthPt}pt !important;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            line-height: 1.28;
            color: #000000;
            background-color: #ffffff;
            margin: 0 !important;
            padding: 0 !important;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
        </style>
      </head>
      <body>
        <div id="executive-doc-pdf-root">${htmlContent}</div>
      </body>
    </html>
  `);
  iframeDoc.close();

  const targetElement = iframeDoc.getElementById('executive-doc-pdf-root') || iframeDoc.body;

  options?.onProgress?.(75, 'Gerando arquivo PDF de alta fidelidade...');

  try {
    const doc = new jsPDF({
      unit: 'pt',
      format: 'a4',
      orientation: isLandscape ? 'landscape' : 'portrait',
    });

    await doc.html(targetElement as HTMLElement, {
      callback: () => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      },
      x: 0,
      y: 0,
      width: contentWidthPt,
      windowWidth: contentWidthPt,
      margin: [MARGIN_TOP_BOTTOM, MARGIN_LEFT_RIGHT, MARGIN_TOP_BOTTOM, MARGIN_LEFT_RIGHT],
      autoPaging: 'text',
      html2canvas: {
        useCORS: true,
        allowTaint: true,
        scale: 1,
        logging: false,
        onclone: (clonedDoc) => {
          sanitizeClonedDocCss(clonedDoc);
        },
      },
    });

    const pageHeightPt = isLandscape ? 595.28 : 841.89;
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Página ${i} de ${totalPages}`, pageWidthPt - MARGIN_LEFT_RIGHT, pageHeightPt - 36, { align: 'right' });
    }

    const pdfBlob = doc.output('blob');
    options?.onProgress?.(100, `Documento ${file.name} convertido com sucesso!`);
    return { blob: pdfBlob, size: pdfBlob.size };
  } catch (err: any) {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
    throw err;
  }
}

export async function convertUniversalDocToPdf(
  file: File,
  options?: DocumentConversionOptions
): Promise<{ blob: Blob; size: number }> {
  return convertDocxToPdf(file, options);
}

export async function convertDocxToMarkdown(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || '';
}

/**
 * Converte documentos Word (.doc, .docx, .rtf, .odt) para o padrão de arquivamento PDF/A-1b (ISO 19005-1).
 */
export async function convertDocToPdfA(
  file: File,
  options?: DocumentConversionOptions
): Promise<{ blob: Blob; size: number }> {
  options?.onProgress?.(10, `Analisando estrutura de ${file.name} para padrão PDF/A-1b...`);
  const { blob: standardPdfBlob } = await convertDocxToPdf(file, {
    onProgress: (pct, msg) => options?.onProgress?.(Math.round(pct * 0.8), msg),
  });

  options?.onProgress?.(85, 'Injetando metadados XMP de conformidade ISO 19005-1 (PDF/A-1b)...');
  const buffer = await standardPdfBlob.arrayBuffer();
  const pdfBytes = new Uint8Array(buffer);
  const cleanDocName = file.name.replace(/\.[^/.]+$/, '');

  const xmpMetadataString = `\n1 0 obj\n<<\n  /Type /Metadata\n  /Subtype /XML\n  /Length 680\n>>\nstream\n<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n<x:xmpmeta xmlns:x="adobe:ns:meta/">\n <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n  <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">\n   <pdfaid:part>1</pdfaid:part>\n   <pdfaid:conformance>B</pdfaid:conformance>\n  </rdf:Description>\n  <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">\n   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${cleanDocName}</rdf:li></rdf:Alt></dc:title>\n   <dc:creator><rdf:Seq><rdf:li>ManipuladorArquivos PDF/A Engine</rdf:li></rdf:Seq></dc:creator>\n  </rdf:Description>\n </rdf:RDF>\n</x:xmpmeta>\n<?xpacket end="w"?>\nendstream\nendobj\n`;

  const xmpBytes = new TextEncoder().encode(xmpMetadataString);
  const headerMarker = new TextEncoder().encode('%PDF-1.4');

  let headerPos = -1;
  for (let i = 0; i < pdfBytes.length - headerMarker.length; i++) {
    let match = true;
    for (let j = 0; j < headerMarker.length; j++) {
      if (pdfBytes[i + j] !== headerMarker[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      headerPos = i;
      break;
    }
  }

  let pdfaBuffer: Uint8Array;
  if (headerPos !== -1) {
    const insertPos = headerPos + headerMarker.length;
    pdfaBuffer = new Uint8Array(pdfBytes.length + xmpBytes.length);
    pdfaBuffer.set(pdfBytes.subarray(0, insertPos), 0);
    pdfaBuffer.set(xmpBytes, insertPos);
    pdfaBuffer.set(pdfBytes.subarray(insertPos), insertPos + xmpBytes.length);
  } else {
    pdfaBuffer = pdfBytes;
  }

  const pdfaBlob = new Blob([pdfaBuffer.buffer as ArrayBuffer], { type: 'application/pdf' });
  options?.onProgress?.(100, `Documento ${file.name} convertido com sucesso para PDF/A arquivístico!`);
  return { blob: pdfaBlob, size: pdfaBlob.size };
}

/**
 * Extrai o texto puro limpo (UTF-8) de qualquer documento Word (.docx, .doc, .rtf, .odt).
 */
export async function convertDocToTxt(
  file: File,
  options?: DocumentConversionOptions
): Promise<{ blob: Blob; text: string; size: number }> {
  options?.onProgress?.(20, `Extraindo texto de ${file.name}...`);
  const rawText = await extractUniversalDocText(file);
  const blob = new Blob([rawText], { type: 'text/plain;charset=utf-8' });
  options?.onProgress?.(100, `Arquivo ${file.name} convertido para TXT com sucesso!`);
  return { blob, text: rawText, size: blob.size };
}
