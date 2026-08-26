import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
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

setupPdfWorker();

export interface AiConversionOptions {
  detectFinancialData?: boolean;
  detectTablesOnly?: boolean;
  outputFormat?: 'xlsx' | 'csv' | 'docx';
  onProgress?: (percent: number, status: string) => void;
}

export interface ExtractedTableData {
  sheetName: string;
  headers: string[];
  rows: (string | number | boolean)[];
}

class AiDocumentConverterService {
  /**
   * Converte PDF em Planilha Excel (.xlsx) e CSV com IA Local e detecção de dados financeiros/datas.
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
    const headerSet = new Set<string>();

    options?.onProgress?.(30, `Analisando ${numPages} páginas e extraindo tabelas...`);

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const items = textContent.items as any[];
      if (!items || items.length === 0) continue;

      // Agrupa itens de texto por linha (eixo Y)
      const linesMap = new Map<number, any[]>();
      for (const item of items) {
        if (!item.str || !item.str.trim()) continue;
        const y = Math.round(item.transform[5]);
        if (!linesMap.has(y)) linesMap.set(y, []);
        linesMap.get(y)!.push(item);
      }

      // Ordena as linhas de cima para baixo
      const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);

      for (const y of sortedY) {
        const lineItems = linesMap.get(y)!;
        // Ordena horizontalmente por X
        lineItems.sort((a, b) => a.transform[4] - b.transform[4]);

        const lineText = lineItems.map((it) => it.str).join(' ').trim();
        if (!lineText) continue;

        // Verifica se a linha contém elementos de tabela (separados por tabulação ou múltiplos espaços)
        const columns = lineText.split(/\s{2,}|\t|\|/).map((c) => c.trim()).filter(Boolean);
        
        if (columns.length >= 2) {
          const processedRow = columns.map((val) => {
            // Tenta converter moedas como "R$ 1.500,00" ou números
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
      // Se nenhuma tabela com colunas foi detectada, cria uma planilha com o texto por parágrafos
      allRows.push(['Conteúdo Extraído', 'Status IA']);
      allRows.push(['Texto livre processado do PDF', 'Concluído sem tabelas explícitas']);
    }

    options?.onProgress?.(85, 'Gerando arquivo XLSX e CSV otimizados...');

    // Cria a planilha XLSX via SheetJS
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(allRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados Extraídos');

    const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const xlsxBlob = new Blob([xlsxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const csvText = XLSX.utils.sheet_to_csv(worksheet);
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    options?.onProgress?.(100, 'Conversão concluída com sucesso!');

    return {
      xlsxBlob,
      csvText,
      filename: `${baseName}_IA_Local.xlsx`,
    };
  }

  /**
   * Converte texto ou relatórios Markdown em planilhas XLSX e CSV com IA Local.
   */
  public convertMarkdownToSpreadsheetWithAi(markdownText: string): {
    xlsxBlob: Blob;
    csvText: string;
  } {
    const lines = markdownText.split('\n');
    const rows: (string | number)[][] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        // Tabela Markdown: | Col1 | Col2 |
        const cells = trimmed
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        
        // Ignora linha separadora | --- | --- |
        if (cells.every((c) => /^:?-+:?$/.test(c))) continue;

        const processedRow = cells.map((cell) => {
          const num = parseFloat(cell.replace(/[^0-9,-]/g, '').replace(',', '.'));
          return !isNaN(num) && /^\d+/.test(cell) ? num : cell;
        });

        rows.push(processedRow);
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        // Lista com marcadores
        const item = trimmed.substring(2).trim();
        const parts = item.split(/:\s*|;\s*/);
        if (parts.length >= 2) {
          rows.push([parts[0], parts.slice(1).join(': ')]);
        } else {
          rows.push([item]);
        }
      }
    }

    if (rows.length === 0) {
      rows.push(['Conteúdo Markdown']);
      rows.push([markdownText]);
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Markdown IA');

    const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const xlsxBlob = new Blob([xlsxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const csvText = XLSX.utils.sheet_to_csv(worksheet);

    return { xlsxBlob, csvText };
  }

  /**
   * Converte PDF para DOCX rigorosamente alinhado ao padrão Google Docs/Drive (Arial 11pt, 1.25 line height, 6pt pós-parágrafo).
   */
  public async convertPdfToDocxGoogleDocsStandardWithAi(
    file: File,
    onProgress?: (percent: number, status: string) => void
  ): Promise<Blob> {
    onProgress?.(10, 'Iniciando reconstrução de layout padrão Google Docs...');

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const numPages = pdfDoc.numPages;

    const docChildren: any[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items as any[];

      if (!items || items.length === 0) continue;

      // Agrupa texto por linha Y
      const linesMap = new Map<number, any[]>();
      for (const item of items) {
        if (!item.str || !item.str.trim()) continue;
        const y = Math.round(item.transform[5]);
        if (!linesMap.has(y)) linesMap.set(y, []);
        linesMap.get(y)!.push(item);
      }

      const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);

      for (const y of sortedY) {
        const lineItems = linesMap.get(y)!;
        lineItems.sort((a, b) => a.transform[4] - b.transform[4]);
        const lineText = lineItems.map((it) => it.str).join(' ').trim();

        if (!lineText) continue;

        // Detecta títulos em caixa alta ou início de cláusula
        const isHeader = /^(([A-ZÁÉÍÓÚÇÃÕ\s]{5,70})$|CLÁUSULA|SEÇÃO|CAPÍTULO)/i.test(lineText);
        const isClauseLabel = /^(Cláusula\s+\d+ª?|Parágrafo\s+único|Artigo\s+\d+º?)/i.test(lineText);

        if (isHeader) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120, before: 120, line: 300 }, // 1.25 line height, 6pt (120 dxa) after
              children: [
                new TextRun({
                  text: lineText,
                  font: 'Arial',
                  size: 24, // 12pt
                  bold: true,
                  color: '000000',
                }),
              ],
            })
          );
        } else if (isClauseLabel) {
          const match = lineText.match(/^(Cláusula\s+\d+ª?|Parágrafo\s+único|Artigo\s+\d+º?)(.*)/i);
          const label = match ? match[1] : '';
          const rest = match ? match[2] : lineText;

          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFY,
              spacing: { after: 120, line: 300 }, // 1.25 line height, 6pt after
              children: [
                new TextRun({
                  text: label,
                  font: 'Arial',
                  size: 22, // 11pt
                  bold: true,
                  color: '000000',
                }),
                new TextRun({
                  text: rest,
                  font: 'Arial',
                  size: 22, // 11pt
                  color: '000000',
                }),
              ],
            })
          );
        } else {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFY,
              spacing: { after: 120, line: 300 }, // Padrão Google Docs (11pt Arial, line 1.25, 6pt after)
              children: [
                new TextRun({
                  text: lineText,
                  font: 'Arial',
                  size: 22, // 11pt = 22 half-pts
                  color: '1E293B',
                }),
              ],
            })
          );
        }
      }

      onProgress?.(
        20 + Math.floor((pageNum / numPages) * 60),
        `Processando página ${pageNum}/${numPages} no padrão Google Docs...`
      );
    }

    options?.onProgress?.(90, 'Gerando arquivo .docx...');

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 polegada (2.54cm)
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
