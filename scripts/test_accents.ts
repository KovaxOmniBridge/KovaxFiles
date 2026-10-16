import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

async function testAccents() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);

  // Testar acentuação brasileira em WinAnsi
  const testText = 'Ação de Execução de Título Extrajudicial • Petição Inicial nº 12345/2026';
  
  // Função para sanitizar caracteres fora de WinAnsi se necessário
  const safeText = testText.replace(/[^\x00-\xFF]/g, ' ');

  page.drawText(safeText, { x: 50, y: 800, size: 12, font, opacity: 0 });

  const bytes = await doc.save();
  const pdfjs = (pdfjsLib as any).getDocument ? pdfjsLib : ((pdfjsLib as any).default || pdfjsLib);
  const loadingTask = pdfjs.getDocument({ data: bytes, useSystemFonts: true });
  const loadedPdf = await loadingTask.promise;
  const p1 = await loadedPdf.getPage(1);
  const textContent = await p1.getTextContent();
  const res = textContent.items.map((it: any) => it.str).join(' ');
  console.log('Extraído com acentos:', res);
}

testAccents().catch(console.error);
