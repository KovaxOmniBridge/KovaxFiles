import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { setupPdfWorker } from '../pdf/pdfWorkerInit';

setupPdfWorker();

/**
 * Extrai o texto formatado por página de qualquer arquivo (PDF, DOCX, TXT, CSV, MD).
 */
export async function extractTextFromAnyDocument(file: File): Promise<{ page: number; text: string }[]> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pagesText: { page: number; text: string }[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageStr = textContent.items
        .map((it: any) => it.str || '')
        .join(' ')
        .replace(/\s+/g, ' ');
      pagesText.push({ page: i, text: pageStr.trim() });
    }
    return pagesText;
  }

  if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value || '';
    const paragraphs = text.split(/\n\s*\n/);
    const pages: { page: number; text: string }[] = [];
    
    let currentPageText = '';
    let pageNum = 1;

    for (const p of paragraphs) {
      currentPageText += p + '\n\n';
      if (currentPageText.length > 2500) {
        pages.push({ page: pageNum++, text: currentPageText.trim() });
        currentPageText = '';
      }
    }
    if (currentPageText.trim()) {
      pages.push({ page: pageNum, text: currentPageText.trim() });
    }
    return pages.length > 0 ? pages : [{ page: 1, text: text.trim() }];
  }

  const rawText = await file.text();
  const chunkSize = 2500;
  const pages: { page: number; text: string }[] = [];
  let pageNum = 1;

  for (let i = 0; i < rawText.length; i += chunkSize) {
    pages.push({ page: pageNum++, text: rawText.substring(i, i + chunkSize).trim() });
  }

  return pages.length > 0 ? pages : [{ page: 1, text: rawText.trim() }];
}
