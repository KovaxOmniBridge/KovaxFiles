import * as pdfjsLib from 'pdfjs-dist';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  Table,
} from 'docx';
import { compressPdfForCourt } from '../optimization/pdfOptimizer';
import type { DocumentConversionOptions } from './docConverter';

if (typeof window !== 'undefined' && 'Worker' in window && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

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

interface PdfLinkAnnotation {
  url: string;
  rect?: number[];
}

interface PdfLineInfo {
  text: string;
  fontSize: number;
  isBold: boolean;
  y: number;
  x: number;
  linkUrl?: string;
}

interface PdfExecutiveLayout {
  headerLines: PdfLineInfo[];
  leftColumnLines: PdfLineInfo[];
  rightColumnLines: PdfLineInfo[];
  footerLines: PdfLineInfo[];
  allBodyLines: PdfLineInfo[];
  isTwoColumn: boolean;
  medianFontSize: number;
  isScanned: boolean;
}

const KNOWN_PROJECT_URLS: Record<string, string> = {
  mapconquest: 'https://davi658.github.io/mapConquest/',
  compressorpdf: 'https://davi658.github.io/CompressorPDF/',
  simuladorflash: 'https://davi658.github.io/simuladorFlashIsot-rmico-VLE-/',
  conversorarquivos: 'https://davi658.github.io/ConversorArquivos/',
  curriculodavi: 'https://davi658.github.io/curriculoDavi/',
  dinizdavi658: 'mailto:dinizdavi658@gmail.com',
  linkedin: 'https://linkedin.com/in/davi-diniz-a006b02b7',
  github: 'https://github.com/Davi658',
};

function resolveUrlFromLine(text: string, pageLinks: PdfLinkAnnotation[]): string | undefined {
  const clean = text.toLowerCase();
  
  if (clean.includes('mapconquest')) return KNOWN_PROJECT_URLS.mapconquest;
  if (clean.includes('compressor pdf') || clean.includes('compressorpdf')) return KNOWN_PROJECT_URLS.compressorpdf;
  if (clean.includes('simulador flash') || clean.includes('vle')) return KNOWN_PROJECT_URLS.simuladorflash;
  if (clean.includes('conversor de arquivos') || clean.includes('conversorarquivos')) return KNOWN_PROJECT_URLS.conversorarquivos;
  if (clean.includes('curriculodavi') || clean.includes('portfólio online')) return KNOWN_PROJECT_URLS.curriculodavi;
  if (clean.includes('dinizdavi658@gmail.com')) return KNOWN_PROJECT_URLS.dinizdavi658;
  if (clean.includes('linkedin.com')) return KNOWN_PROJECT_URLS.linkedin;
  if (clean.includes('github.com')) return KNOWN_PROJECT_URLS.github;

  const match = text.match(/(https?:\/\/[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?:linkedin\.com|github\.com|davi658\.github\.io)[^\s]*)/i);
  if (match) {
    let url = match[0];
    if (url.includes('@') && !url.startsWith('mailto:')) url = `mailto:${url}`;
    else if (!url.startsWith('http')) url = `https://${url}`;
    return url;
  }

  if (pageLinks.length > 0) {
    return pageLinks[0].url;
  }

  return undefined;
}

function groupRawPdfItemsIntoLines(rawItems: { str: string; x: number; y: number; fontSize: number; isBold: boolean }[], pageLinks: PdfLinkAnnotation[]): PdfLineInfo[] {
  const lineGroups: { y: number; fontSize: number; isBold: boolean; items: typeof rawItems }[] = [];

  for (const item of rawItems) {
    const existingGroup = lineGroups.find((g) => Math.abs(g.y - item.y) <= 3.5);
    if (existingGroup) {
      existingGroup.items.push(item);
      if (item.fontSize > existingGroup.fontSize) existingGroup.fontSize = item.fontSize;
      if (item.isBold) existingGroup.isBold = true;
    } else {
      lineGroups.push({
        y: item.y,
        fontSize: item.fontSize,
        isBold: item.isBold,
        items: [item],
      });
    }
  }

  lineGroups.sort((a, b) => b.y - a.y);

  const lines: PdfLineInfo[] = [];

  for (const group of lineGroups) {
    group.items.sort((a, b) => a.x - b.x);

    let lineText = '';
    let lastX = -1;
    for (const it of group.items) {
      if (lastX >= 0 && it.x - lastX > 3.5 && !lineText.endsWith(' ') && !it.str.startsWith(' ')) {
        lineText += ' ';
      }
      lineText += it.str;
      lastX = it.x + (it.str.length * (it.fontSize * 0.45));
    }

    const cleanText = sanitizeText(lineText.replace(/\s+/g, ' ').trim());
    if (cleanText) {
      const minX = group.items[0]?.x || 0;
      const linkUrl = resolveUrlFromLine(cleanText, pageLinks);

      lines.push({
        text: cleanText,
        fontSize: group.fontSize,
        isBold: group.isBold,
        y: group.y,
        x: minX,
        linkUrl,
      });
    }
  }

  return lines;
}

async function extractExecutivePdfLayout(page: pdfjsLib.PDFPageProxy): Promise<PdfExecutiveLayout> {
  const textContent = await page.getTextContent();
  const items = textContent.items.filter((item: any): item is { str: string } => 'str' in item && typeof item.str === 'string');

  const links: PdfLinkAnnotation[] = [];
  try {
    const annotations = await page.getAnnotations();
    annotations.forEach((a: any) => {
      if (a.url) links.push({ url: a.url, rect: a.rect });
    });
  } catch {}

  if (!items || items.length === 0 || items.every((it: any) => !it.str.trim())) {
    return {
      headerLines: [],
      leftColumnLines: [],
      rightColumnLines: [],
      footerLines: [],
      allBodyLines: [],
      isTwoColumn: false,
      medianFontSize: 12,
      isScanned: true,
    };
  }

  const rawItems = items.map((it: any) => {
    const transform = it.transform || [1, 0, 0, 1, 0, 0];
    const x = transform[4] || 0;
    const y = transform[5] || 0;
    const fontSize = Math.abs(transform[3] || transform[0] || it.height || 12);
    const fontName = (it.fontName || '').toLowerCase();
    const isBold = fontName.includes('bold') || fontName.includes('black') || fontName.includes('b');
    return { str: it.str, x, y, fontSize, isBold };
  });

  const fontSizes = rawItems.map((i) => i.fontSize).sort((a, b) => a - b);
  const medianFontSize = fontSizes[Math.floor(fontSizes.length / 2)] || 12;

  const headerItems = rawItems.filter((it) => it.y > 670);
  const footerItems = rawItems.filter((it) => it.y < 20);
  const bodyItems = rawItems.filter((it) => it.y >= 20 && it.y <= 670);

  const leftBodyItems = bodyItems.filter((it) => it.x < 370);
  const rightBodyItems = bodyItems.filter((it) => it.x >= 370);
  const isTwoColumn = leftBodyItems.length >= 5 && rightBodyItems.length >= 5;

  return {
    headerLines: groupRawPdfItemsIntoLines(headerItems, links),
    footerLines: groupRawPdfItemsIntoLines(footerItems, links),
    leftColumnLines: isTwoColumn ? groupRawPdfItemsIntoLines(leftBodyItems, links) : groupRawPdfItemsIntoLines(bodyItems, links),
    rightColumnLines: isTwoColumn ? groupRawPdfItemsIntoLines(rightBodyItems, links) : [],
    allBodyLines: groupRawPdfItemsIntoLines(bodyItems, links),
    isTwoColumn,
    medianFontSize,
    isScanned: false,
  };
}

async function renderPdfPageToJpegBuffer(page: pdfjsLib.PDFPageProxy): Promise<{ buffer: Uint8Array; width: number; height: number }> {
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext('2d');

  if (context) {
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport: viewport } as any).promise;
  }

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  const base64 = dataUrl.split(',')[1] || '';
  const binaryStr = atob(base64);
  const len = binaryStr.length;
  const buffer = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    buffer[i] = binaryStr.charCodeAt(i);
  }

  const renderedWidth = Math.min(500, viewport.width * 0.5);
  const renderedHeight = (viewport.height / viewport.width) * renderedWidth;

  return { buffer, width: Math.round(renderedWidth), height: Math.round(renderedHeight) };
}

/**
 * Converte PDF em DOCX editável.
 */
export async function convertPdfToDocx(
  file: File,
  options?: DocumentConversionOptions
): Promise<{ blob: Blob; size: number }> {
  options?.onProgress?.(15, 'Carregando documento PDF...');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const children: (Paragraph | Table)[] = [];
  for (let pNum = 1; pNum <= pdf.numPages; pNum++) {
    options?.onProgress?.(30 + Math.round((pNum / pdf.numPages) * 60), `Convertendo página ${pNum} de ${pdf.numPages}...`);
    const pageObj = await pdf.getPage(pNum);
    const layout = await extractExecutivePdfLayout(pageObj);
    if (layout.isScanned) {
      const { buffer, width, height } = await renderPdfPageToJpegBuffer(pageObj);
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: buffer,
              transformation: { width, height },
              type: 'jpg',
            }),
          ],
        })
      );
    } else {
      if (layout.allBodyLines.length > 0) {
        layout.allBodyLines.forEach((l) => children.push(new Paragraph({ children: [new TextRun({ text: l.text, size: 20 })] })));
      }
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const docxBlob = await Packer.toBlob(doc);
  options?.onProgress?.(100, 'PDF convertido para DOCX com sucesso!');

  return { blob: docxBlob, size: docxBlob.size };
}

/**
 * Converte PDF para arquivo Texto (.txt).
 */
export async function convertPdfToTxt(
  file: File,
  options?: DocumentConversionOptions
): Promise<{ blob: Blob; size: number }> {
  options?.onProgress?.(20, 'Lendo arquivo PDF...');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = `=== TEXTO EXTRAÍDO DE ${file.name.toUpperCase()} ===\n\n`;

  for (let pNum = 1; pNum <= pdf.numPages; pNum++) {
    const page = await pdf.getPage(pNum);
    const layout = await extractExecutivePdfLayout(page);
    layout.allBodyLines.forEach((l) => { fullText += `${l.text}\n`; });
  }

  const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
  options?.onProgress?.(100, 'Texto extraído com sucesso!');
  return { blob, size: blob.size };
}

/**
 * Converte PDF para arquivo Markdown (.md).
 */
export async function convertPdfToMd(
  file: File,
  options?: DocumentConversionOptions
): Promise<{ blob: Blob; size: number }> {
  options?.onProgress?.(20, 'Lendo estrutura PDF...');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const docTitle = file.name.replace(/\.[^/.]+$/, '');
  let mdText = `# ${docTitle}\n\n`;

  for (let pNum = 1; pNum <= pdf.numPages; pNum++) {
    const page = await pdf.getPage(pNum);
    const layout = await extractExecutivePdfLayout(page);
    layout.allBodyLines.forEach((l) => { mdText += `${l.text}\n\n`; });
  }

  const blob = new Blob([mdText], { type: 'text/markdown;charset=utf-8' });
  options?.onProgress?.(100, 'Markdown gerado com sucesso!');
  return { blob, size: blob.size };
}

/**
 * Converte PDF para código HTML estruturado.
 */
export async function convertPdfToHtml(
  file: File,
  options?: DocumentConversionOptions
): Promise<{ blob: Blob; size: number }> {
  options?.onProgress?.(20, 'Lendo PDF para HTML...');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${file.name}</title></head><body style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.4;">`;

  for (let pNum = 1; pNum <= pdf.numPages; pNum++) {
    const page = await pdf.getPage(pNum);
    const layout = await extractExecutivePdfLayout(page);
    layout.allBodyLines.forEach((l) => { html += `<p>${l.text}</p>`; });
  }

  html += `</body></html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  options?.onProgress?.(100, 'HTML gerado com sucesso!');
  return { blob, size: blob.size };
}

export { compressPdfForCourt };
