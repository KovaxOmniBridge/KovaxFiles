import { jsPDF } from 'jspdf';
import { sanitizeClonedDocCss } from '../../utils/cssSanitizer';

import type { DocumentConversionOptions } from './docConverter';

export async function convertHtmlToPdf(
  file: File,
  options?: DocumentConversionOptions
): Promise<{ blob: Blob; size: number }> {
  options?.onProgress?.(20, 'Lendo documento HTML...');
  const htmlStr = await file.text();

  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
  iframe.style.border = 'none';

  document.body.appendChild(iframe);
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
    throw new Error('Falha ao inicializar iframe.');
  }

  iframeDoc.open();
  iframeDoc.write(htmlStr);
  iframeDoc.close();

  await new Promise((resolve) => setTimeout(resolve, 150));
  const targetElement = iframeDoc.body;

  options?.onProgress?.(70, 'Gerando arquivo PDF...');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  await doc.html(targetElement as HTMLElement, {
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
      onclone: (clonedDoc) => {
        sanitizeClonedDocCss(clonedDoc);
      },
    },
  });

  const pdfBlob = doc.output('blob');
  options?.onProgress?.(100, 'HTML convertido para PDF com sucesso!');
  return { blob: pdfBlob, size: pdfBlob.size };
}

export async function convertHtmlToDocx(
  file: File,
  options?: DocumentConversionOptions
): Promise<{ blob: Blob; size: number }> {
  options?.onProgress?.(50, 'Processando HTML para DOCX...');
  const htmlStr = await file.text();
  const blob = new Blob(['\ufeff' + htmlStr], { type: 'application/msword' });
  options?.onProgress?.(100, 'HTML convertido com sucesso!');
  return { blob, size: blob.size };
}
