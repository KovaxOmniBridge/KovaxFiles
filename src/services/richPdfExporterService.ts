import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, PDFImage } from 'pdf-lib';

export interface RichPdfExportOptions {
  title?: string;
  author?: string;
  margin?: number;
  fontSize?: number;
  lineHeight?: number;
  headerTitle?: string;
  footerTitle?: string;
  enableHeaderFooter?: boolean;
  headerOnFirstPage?: boolean;
}

export class RichPdfExporterService {
  /**
   * Converte conteúdo HTML formatado (headings, estilos, tabelas, imagens) em documento PDF de alta fidelidade
   */
  static async exportHtmlToPdf(
    htmlContent: string,
    options?: RichPdfExportOptions
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    const title = options?.title || 'Documento Processual';
    pdfDoc.setTitle(title);
    pdfDoc.setAuthor(options?.author || 'KovaxFiles Desktop');
    pdfDoc.setProducer('KovaxFiles Rich PDF Exporter');
    pdfDoc.setCreator('KovaxFiles App');

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const fontBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

    const margin = options?.margin || 54; // ~19mm (padrão judicial)
    const pageWidth = 595.28; // A4 pt
    const pageHeight = 841.89; // A4 pt
    const usableWidth = pageWidth - margin * 2;

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPos = pageHeight - margin - 20;

    const checkNewPage = (neededHeight: number): PDFPage => {
      if (yPos - neededHeight < margin + 25) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPos = pageHeight - margin - 25;
      }
      return currentPage;
    };

    // Obter nós do DOM (Browser / Electron Renderer ou Node.js fallback)
    const elements = this.parseHtmlToBlocks(htmlContent);

    for (const el of elements) {
      switch (el.type) {
        case 'h1': {
          const fontSize = 18;
          const lineHeight = 24;
          yPos -= 10;
          const lines = this.wrapText(el.text, fontBold, fontSize, usableWidth);
          for (const line of lines) {
            checkNewPage(lineHeight);
            const x = this.calculateX(line, fontBold, fontSize, el.align, margin, usableWidth);
            currentPage.drawText(line, { x, y: yPos, size: fontSize, font: fontBold, color: rgb(0.08, 0.15, 0.28) });
            yPos -= lineHeight;
          }
          yPos -= 8;
          break;
        }

        case 'h2': {
          const fontSize = 14;
          const lineHeight = 20;
          yPos -= 8;
          const lines = this.wrapText(el.text, fontBold, fontSize, usableWidth);
          for (const line of lines) {
            checkNewPage(lineHeight);
            const x = this.calculateX(line, fontBold, fontSize, el.align, margin, usableWidth);
            currentPage.drawText(line, { x, y: yPos, size: fontSize, font: fontBold, color: rgb(0.12, 0.2, 0.35) });
            yPos -= lineHeight;
          }
          yPos -= 6;
          break;
        }

        case 'h3': {
          const fontSize = 12;
          const lineHeight = 17;
          yPos -= 6;
          const lines = this.wrapText(el.text, fontBold, fontSize, usableWidth);
          for (const line of lines) {
            checkNewPage(lineHeight);
            const x = this.calculateX(line, fontBold, fontSize, el.align, margin, usableWidth);
            currentPage.drawText(line, { x, y: yPos, size: fontSize, font: fontBold, color: rgb(0.15, 0.25, 0.4) });
            yPos -= lineHeight;
          }
          yPos -= 4;
          break;
        }

        case 'paragraph': {
          const fontSize = el.fontSize || 10.5;
          const lineHeight = fontSize * 1.45;
          const font = el.isBold ? (el.isItalic ? fontBoldItalic : fontBold) : (el.isItalic ? fontItalic : fontRegular);
          const color = el.color ? this.parseColor(el.color) : rgb(0.12, 0.12, 0.12);

          const lines = this.wrapText(el.text, font, fontSize, usableWidth);
          for (const line of lines) {
            checkNewPage(lineHeight);
            const x = this.calculateX(line, font, fontSize, el.align, margin, usableWidth);
            currentPage.drawText(line, { x, y: yPos, size: fontSize, font, color });
            yPos -= lineHeight;
          }
          yPos -= 4;
          break;
        }

        case 'list_item': {
          const fontSize = 10.5;
          const lineHeight = 15;
          const bullet = el.listType === 'ol' ? `${el.index || 1}.` : '•';
          const indent = 20;

          checkNewPage(lineHeight);
          currentPage.drawText(bullet, {
            x: margin + 4,
            y: yPos,
            size: fontSize,
            font: fontBold,
            color: rgb(0.2, 0.3, 0.5)
          });

          const lines = this.wrapText(el.text, fontRegular, fontSize, usableWidth - indent);
          for (let i = 0; i < lines.length; i++) {
            if (i > 0) checkNewPage(lineHeight);
            currentPage.drawText(lines[i], {
              x: margin + indent,
              y: yPos,
              size: fontSize,
              font: fontRegular,
              color: rgb(0.12, 0.12, 0.12)
            });
            yPos -= lineHeight;
          }
          yPos -= 2;
          break;
        }

        case 'table': {
          if (!el.rows || el.rows.length === 0) break;
          const numCols = Math.max(...el.rows.map(r => r.cells.length), 1);
          const colWidth = usableWidth / numCols;
          const cellPadding = 5;
          const fontSize = 9.5;
          const lineHeight = 13;

          yPos -= 6;

          for (let rIdx = 0; rIdx < el.rows.length; rIdx++) {
            const row = el.rows[rIdx];
            const isHeader = row.isHeader || rIdx === 0;

            let maxCellLines = 1;
            const wrappedCells: string[][] = [];
            for (let cIdx = 0; cIdx < numCols; cIdx++) {
              const cellText = row.cells[cIdx]?.text || '';
              const font = isHeader ? fontBold : fontRegular;
              const lines = this.wrapText(cellText, font, fontSize, colWidth - cellPadding * 2);
              wrappedCells.push(lines);
              if (lines.length > maxCellLines) maxCellLines = lines.length;
            }

            const rowHeight = maxCellLines * lineHeight + cellPadding * 2;
            checkNewPage(rowHeight);

            for (let cIdx = 0; cIdx < numCols; cIdx++) {
              const cellX = margin + cIdx * colWidth;
              const cellY = yPos - rowHeight;

              currentPage.drawRectangle({
                x: cellX,
                y: cellY,
                width: colWidth,
                height: rowHeight,
                color: isHeader ? rgb(0.93, 0.95, 0.98) : rgb(1, 1, 1),
                borderColor: rgb(0.75, 0.8, 0.85),
                borderWidth: 0.75
              });

              const font = isHeader ? fontBold : fontRegular;
              const lines = wrappedCells[cIdx] || [];
              let textY = yPos - cellPadding - fontSize;

              for (const line of lines) {
                currentPage.drawText(line, {
                  x: cellX + cellPadding,
                  y: textY,
                  size: fontSize,
                  font,
                  color: isHeader ? rgb(0.08, 0.15, 0.28) : rgb(0.15, 0.15, 0.15)
                });
                textY -= lineHeight;
              }
            }

            yPos -= rowHeight;
          }

          yPos -= 8;
          break;
        }

        case 'image': {
          if (!el.imageSrc) break;
          try {
            let embeddedImg: PDFImage | null = null;
            let rawBytes: Uint8Array | null = null;

            if (el.imageSrc.startsWith('data:image/png;base64,')) {
              rawBytes = this.base64ToUint8Array(el.imageSrc.replace('data:image/png;base64,', ''));
              embeddedImg = await pdfDoc.embedPng(rawBytes);
            } else if (el.imageSrc.startsWith('data:image/jpeg;base64,') || el.imageSrc.startsWith('data:image/jpg;base64,')) {
              rawBytes = this.base64ToUint8Array(el.imageSrc.replace(/^data:image\/jpe?g;base64,/, ''));
              embeddedImg = await pdfDoc.embedJpg(rawBytes);
            }

            if (embeddedImg) {
              const origW = embeddedImg.width;
              const origH = embeddedImg.height;
              let scale = 1.0;
              const maxW = Math.min(usableWidth * 0.9, 450);
              const maxH = 260;

              if (origW > maxW) scale = maxW / origW;
              if (origH * scale > maxH) scale = maxH / origH;

              const imgW = origW * scale;
              const imgH = origH * scale;

              checkNewPage(imgH + 15);
              const imgX = margin + (usableWidth - imgW) / 2;

              currentPage.drawImage(embeddedImg, {
                x: imgX,
                y: yPos - imgH,
                width: imgW,
                height: imgH
              });

              yPos -= imgH + 12;
            }
          } catch (imgErr) {
            console.warn('[RichPdfExporter] Falha ao incorporar imagem:', imgErr);
          }
          break;
        }

        case 'page_break': {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          yPos = pageHeight - margin - 25;
          break;
        }

        case 'hr': {
          yPos -= 8;
          checkNewPage(10);
          currentPage.drawLine({
            start: { x: margin, y: yPos },
            end: { x: pageWidth - margin, y: yPos },
            thickness: 0.75,
            color: rgb(0.8, 0.85, 0.9)
          });
          yPos -= 10;
          break;
        }
      }
    }

    // Paginação oficial (cabeçalho superior e rodapé com "Página X de Y")
    const totalPages = pdfDoc.getPageCount();
    for (let pIdx = 0; pIdx < totalPages; pIdx++) {
      const page = pdfDoc.getPage(pIdx);

      if (options?.enableHeaderFooter !== false) {
        // Rodapé
        page.drawLine({
          start: { x: margin, y: margin + 14 },
          end: { x: pageWidth - margin, y: margin + 14 },
          thickness: 0.5,
          color: rgb(0.85, 0.88, 0.92)
        });

        const footerText = options?.footerTitle || 'KovaxFiles Desktop • Documento Processual Auditado';
        page.drawText(footerText.substring(0, 80), {
          x: margin,
          y: margin + 2,
          size: 8,
          font: fontRegular,
          color: rgb(0.5, 0.55, 0.6)
        });

        const pageStr = `Página ${pIdx + 1} de ${totalPages}`;
        const pageStrWidth = fontRegular.widthOfTextAtSize(pageStr, 8);
        page.drawText(pageStr, {
          x: pageWidth - margin - pageStrWidth,
          y: margin + 2,
          size: 8,
          font: fontRegular,
          color: rgb(0.5, 0.55, 0.6)
        });

        // Cabeçalho (a partir da página 2 ou na página 1 se headerOnFirstPage for true)
        const headerText = options?.headerTitle || title;
        if (pIdx > 0 || options?.headerOnFirstPage) {
          page.drawText(headerText.substring(0, 75), {
            x: margin,
            y: pageHeight - margin + 8,
            size: 8,
            font: fontRegular,
            color: rgb(0.5, 0.55, 0.6)
          });
          page.drawLine({
            start: { x: margin, y: pageHeight - margin + 4 },
            end: { x: pageWidth - margin, y: pageHeight - margin + 4 },
            thickness: 0.5,
            color: rgb(0.85, 0.88, 0.92)
          });
        }
      }
    }

    return await pdfDoc.save({ useObjectStreams: true });
  }

  private static base64ToUint8Array(base64: string): Uint8Array {
    if (typeof atob === 'function') {
      const binary = atob(base64.trim());
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
    return new Uint8Array(Buffer.from(base64.trim(), 'base64'));
  }

  private static calculateX(
    text: string,
    font: PDFFont,
    fontSize: number,
    align?: string,
    margin: number = 54,
    usableWidth: number = 487.28
  ): number {
    if (align === 'center') {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      return margin + Math.max(0, (usableWidth - textWidth) / 2);
    }
    if (align === 'right') {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      return margin + usableWidth - textWidth;
    }
    return margin;
  }

  private static wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
    if (!text || text.trim() === '') return [''];
    const clean = text.replace(/[\r\n]+/g, ' ').trim();
    const words = clean.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      let width = 0;
      try {
        width = font.widthOfTextAtSize(testLine, fontSize);
      } catch {
        width = testLine.length * (fontSize * 0.55);
      }

      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines.length > 0 ? lines : [''];
  }

  private static parseColor(cssColor: string) {
    if (cssColor.startsWith('#')) {
      const hex = cssColor.replace('#', '');
      if (hex.length === 6) {
        return rgb(
          parseInt(hex.slice(0, 2), 16) / 255,
          parseInt(hex.slice(2, 4), 16) / 255,
          parseInt(hex.slice(4, 6), 16) / 255
        );
      }
    }
    return rgb(0.12, 0.12, 0.12);
  }

  private static parseHtmlToBlocks(html: string): Array<{
    type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'list_item' | 'table' | 'image' | 'hr' | 'page_break';
    text: string;
    align?: 'left' | 'center' | 'right' | 'justify';
    isBold?: boolean;
    isItalic?: boolean;
    fontSize?: number;
    color?: string;
    listType?: 'ul' | 'ol';
    index?: number;
    imageSrc?: string;
    rows?: Array<{ isHeader?: boolean; cells: Array<{ text: string }> }>;
  }> {
    const blocks: any[] = [];

    if (typeof document !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const body = doc.body;

      const traverse = (node: Node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tag = el.tagName.toLowerCase();

          // Detecção de quebra de página
          const hasPageBreak =
            el.classList.contains('page-break') ||
            el.getAttribute('data-page-break') === 'true' ||
            el.style.pageBreakAfter === 'always' ||
            el.style.pageBreakBefore === 'always' ||
            (el.style as any).breakAfter === 'page';

          if (tag === 'hr') {
            if (hasPageBreak) {
              blocks.push({ type: 'page_break', text: '' });
            } else {
              blocks.push({ type: 'hr', text: '' });
            }
            return;
          }

          if ((tag === 'div' || tag === 'p') && hasPageBreak && !el.innerText.trim()) {
            blocks.push({ type: 'page_break', text: '' });
            return;
          }

          if (tag === 'h1') {
            blocks.push({ type: 'h1', text: el.innerText.trim(), align: (el.style.textAlign as any) || 'left' });
            return;
          }
          if (tag === 'h2') {
            blocks.push({ type: 'h2', text: el.innerText.trim(), align: (el.style.textAlign as any) || 'left' });
            return;
          }
          if (tag === 'h3' || tag === 'h4') {
            blocks.push({ type: 'h3', text: el.innerText.trim(), align: (el.style.textAlign as any) || 'left' });
            return;
          }
          if (tag === 'img') {
            const src = el.getAttribute('src');
            if (src) blocks.push({ type: 'image', text: '', imageSrc: src });
            return;
          }
          if (tag === 'table') {
            const tableRows: Array<{ isHeader?: boolean; cells: Array<{ text: string }> }> = [];
            const trElements = el.querySelectorAll('tr');
            trElements.forEach(tr => {
              const cells: Array<{ text: string }> = [];
              const thsOrTds = tr.querySelectorAll('th, td');
              const isHeader = tr.querySelector('th') !== null || tr.parentElement?.tagName.toLowerCase() === 'thead';
              thsOrTds.forEach(cell => {
                cells.push({ text: (cell as HTMLElement).innerText.trim() });
              });
              if (cells.length > 0) {
                tableRows.push({ isHeader, cells });
              }
            });
            if (tableRows.length > 0) {
              blocks.push({ type: 'table', text: '', rows: tableRows });
            }
            return;
          }
          if (tag === 'ul' || tag === 'ol') {
            const listType = tag as 'ul' | 'ol';
            const lis = el.querySelectorAll(':scope > li');
            lis.forEach((li, idx) => {
              blocks.push({
                type: 'list_item',
                text: (li as HTMLElement).innerText.trim(),
                listType,
                index: idx + 1
              });
            });
            return;
          }
          if (tag === 'p' || tag === 'div' || tag === 'blockquote') {
            const innerImg = el.querySelector('img');
            if (innerImg) {
              const src = innerImg.getAttribute('src');
              if (src) blocks.push({ type: 'image', text: '', imageSrc: src });
            }

            const text = el.innerText.trim();
            if (text) {
              const isBold = el.style.fontWeight === 'bold' || el.querySelector('strong, b') !== null;
              const isItalic = el.style.fontStyle === 'italic' || el.querySelector('em, i') !== null;
              blocks.push({
                type: 'paragraph',
                text,
                align: (el.style.textAlign as any) || 'left',
                isBold,
                isItalic,
                color: el.style.color || undefined
              });
            }
            if (hasPageBreak) {
              blocks.push({ type: 'page_break', text: '' });
            }
            return;
          }
        }

        node.childNodes.forEach(child => traverse(child));
      };

      body.childNodes.forEach(child => traverse(child));
    } else {
      const cleanHtml = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<hr[^>]*class="[^"]*page-break[^"]*"[^>]*>/gi, '\n#PAGEBREAK#\n')
        .replace(/<div[^>]*class="[^"]*page-break[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '\n#PAGEBREAK#\n')
        .replace(/<[^>]+style="[^"]*page-break-(?:after|before):\s*always[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, '\n#PAGEBREAK#\n');

      const tableMatch = cleanHtml.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
      if (tableMatch) {
        const rows: Array<{ isHeader?: boolean; cells: Array<{ text: string }> }> = [];
        const trMatches = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
        for (const tr of trMatches) {
          const isHeader = /<th/i.test(tr);
          const cellMatches = tr.match(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi) || [];
          const cells = cellMatches.map(c => ({ text: c.replace(/<[^>]+>/g, '').trim() }));
          if (cells.length > 0) rows.push({ isHeader, cells });
        }
        if (rows.length > 0) blocks.push({ type: 'table', text: '', rows });
      }

      const rawLines = cleanHtml
        .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n#H1#$1\n')
        .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n#H2#$1\n')
        .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n#H3#$1\n')
        .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n#LI#$1\n')
        .replace(/<[^>]+>/g, '\n')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      for (const line of rawLines) {
        if (line.startsWith('#PAGEBREAK#')) {
          blocks.push({ type: 'page_break', text: '' });
        } else if (line.startsWith('#H1#')) {
          blocks.push({ type: 'h1', text: line.replace('#H1#', '').trim() });
        } else if (line.startsWith('#H2#')) {
          blocks.push({ type: 'h2', text: line.replace('#H2#', '').trim() });
        } else if (line.startsWith('#H3#')) {
          blocks.push({ type: 'h3', text: line.replace('#H3#', '').trim() });
        } else if (line.startsWith('#LI#')) {
          blocks.push({ type: 'list_item', text: line.replace('#LI#', '').trim(), listType: 'ul' });
        } else {
          blocks.push({ type: 'paragraph', text: line });
        }
      }
    }

    return blocks;
  }
}
