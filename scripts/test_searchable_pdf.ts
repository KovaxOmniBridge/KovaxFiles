import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

async function testSearchablePdf() {
  console.log('Testando criação de Searchable PDF com pdf-lib e leitura com pdfjs-dist...');
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // Criar uma página 595 x 842 (A4)
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();

  // Desenhar retângulo de fundo simulando imagem
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.95, 0.95, 0.95)
  });

  // Desenhar texto invisível para busca (Ctrl+F)
  const testWords = [
    { text: 'EXCELENTISSIMO', x: 50, y: 800, size: 12 },
    { text: 'SENHOR', x: 170, y: 800, size: 12 },
    { text: 'DOUTOR', x: 235, y: 800, size: 12 },
    { text: 'JUIZ', x: 295, y: 800, size: 12 },
    { text: 'DE', x: 330, y: 800, size: 12 },
    { text: 'DIREITO', x: 355, y: 800, size: 12 },
  ];

  for (const w of testWords) {
    page.drawText(w.text, {
      x: w.x,
      y: w.y,
      size: w.size,
      font,
      opacity: 0, // Invisível visualmente, mas presente no stream de texto do PDF!
    });
  }

  const pdfBytes = await doc.save();
  console.log('Tamanho do PDF gerado:', pdfBytes.byteLength, 'bytes');

  // Verificar com pdfjs-dist se o texto é 100% extraível e pesquisável
  const pdfjs = (pdfjsLib as any).getDocument ? pdfjsLib : ((pdfjsLib as any).default || pdfjsLib);
  const getDoc = pdfjs.getDocument;
  const loadingTask = getDoc({ data: pdfBytes, useSystemFonts: true });
  const loadedPdf = await loadingTask.promise;
  const p1 = await loadedPdf.getPage(1);
  const textContent = await p1.getTextContent();

  const extractedStrings = textContent.items.map((it: any) => it.str).join(' ');
  console.log('Texto extraído pelo leitor PDF:', extractedStrings);

  const containsAll = extractedStrings.includes('EXCELENTISSIMO') && extractedStrings.includes('DIREITO');
  if (!containsAll) {
    throw new Error(`Falha: Texto não encontrado no leitor PDF. Extraído: "${extractedStrings}"`);
  }

  console.log('✓ SUCESSO: O PDF é 100% pesquisável (searchable) com camada invisível!');
}

testSearchablePdf().catch(err => {
  console.error(err);
  process.exit(1);
});
