/**
 * PDF TABLE EXTRACTOR & EXCEL EXPORTER SERVICE
 * Identifica estrutura de linhas e colunas em PDFs usando âncoras espaciais X e alinhamento de grade perfeito.
 * 100% Client-Side.
 */

import * as pdfjsLib from 'pdfjs-dist';
import saveAs from 'file-saver';
import * as XLSX from 'xlsx';

export interface ExtractedTableData {
  pageNumber: number;
  rows: string[][];
}

interface TextItemPos {
  str: string;
  x: number;
  y: number;
  width: number;
}

/**
 * Pré-costura fragmentos de números, moedas e centavos divididos pelo PDF.js na mesma linha.
 * Exemplo: ["R$", "18.500,", "00"] -> "R$ 18.500,00"
 * Exemplo: ["22.1", "%"] -> "22.1%"
 */
function preStitchLineItems(items: TextItemPos[]): TextItemPos[] {
  if (items.length <= 1) return items;

  const result: TextItemPos[] = [];
  let current = { ...items[0] };

  for (let i = 1; i < items.length; i++) {
    const next = items[i];
    const currStr = current.str.trim();
    const nextStr = next.str.trim();

    const isCurrency = /^R\$$|^\$$/i.test(currStr);
    const endsWithCommaOrDot = /[,.]$/.test(currStr);
    const isNextCents = /^\d{1,2}$/.test(nextStr) && (endsWithCommaOrDot || isCurrency);
    const isNextPercent = /^%$/.test(nextStr);
    const isCodePrefix = /^[A-Z]{2,4}-$/i.test(currStr);

    const gap = next.x - (current.x + Math.min(currStr.length * 6, 80));

    if (isCurrency && nextStr.match(/^[\d.]+/)) {
      // "R$" + "18.500,00" -> "R$ 18.500,00"
      current.str = `${currStr} ${nextStr}`;
      current.width = Math.max(current.width, next.x + next.width - current.x);
    } else if (endsWithCommaOrDot && /^\d{1,2}$/.test(nextStr)) {
      // "18.500," + "00" -> "18.500,00" (sem espaço extra entre a vírgula e o centavo!)
      current.str = currStr + nextStr;
      current.width = Math.max(current.width, next.x + next.width - current.x);
    } else if (isNextPercent && /[\d.]+$/.test(currStr)) {
      // "22.1" + "%" -> "22.1%"
      current.str = currStr + nextStr;
      current.width = Math.max(current.width, next.x + next.width - current.x);
    } else if (isCodePrefix && gap < 25) {
      // "LNC-" + "001" -> "LNC-001"
      current.str = currStr + nextStr;
      current.width = Math.max(current.width, next.x + next.width - current.x);
    } else {
      result.push(current);
      current = { ...next };
    }
  }
  result.push(current);
  return result;
}

export const pdfTableExtractorService = {
  /**
   * Extrai dados tabulares de um PDF analisando as coordenadas espaciais das palavras e âncoras de colunas X.
   */
  async extractTablesFromPdf(file: File): Promise<ExtractedTableData[]> {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

    const tablesResult: ExtractedTableData[] = [];

    for (let pNum = 1; pNum <= pdf.numPages; pNum++) {
      const page = await pdf.getPage(pNum);
      const textContent = await page.getTextContent();

      const items: TextItemPos[] = textContent.items.map((item: any) => ({
        str: item.str,
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
        width: Math.round(item.width || item.str.length * 6),
      }));

      if (items.length === 0) continue;

      // Agrupa itens por linha horizontal (coordenada Y próxima)
      const lineMap: Map<number, TextItemPos[]> = new Map();
      const yTolerance = 4;

      items.forEach((it) => {
        const trimmed = it.str.trim();
        if (!trimmed) return;

        // Filtro Anti-Rodapé e Cabeçalhos Institucionais de Impressão
        if (
          trimmed.includes('Relatório Executivo') ||
          trimmed.includes('100% Processamento Local') ||
          /^Página\s+\d+\s+de\s+\d+$/i.test(trimmed) ||
          /^Página\s+\d+$/i.test(trimmed)
        ) {
          return;
        }

        let foundYKey: number | null = null;
        for (const existingY of lineMap.keys()) {
          if (Math.abs(existingY - it.y) <= yTolerance) {
            foundYKey = existingY;
            break;
          }
        }

        if (foundYKey !== null) {
          lineMap.get(foundYKey)!.push(it);
        } else {
          lineMap.set(it.y, [it]);
        }
      });

      // Ordenar linhas de cima para baixo (coordenada Y decrescente no PDF)
      const sortedYKeys = Array.from(lineMap.keys()).sort((a, b) => b - a);

      // Descobre as âncoras de colunas X da página analisando as linhas com maior número de itens
      let columnAnchors: number[] | undefined;
      const candidateHeaderY = sortedYKeys.find((y) => {
        const line = lineMap.get(y)!;
        const stitched = preStitchLineItems(line.sort((a, b) => a.x - b.x));
        return stitched.length >= 3;
      });

      if (candidateHeaderY !== undefined) {
        const headerItems = preStitchLineItems(
          lineMap.get(candidateHeaderY)!.sort((a, b) => a.x - b.x)
        );
        if (headerItems.length >= 3) {
          columnAnchors = headerItems.map((it) => it.x);
        }
      }

      const rows: string[][] = [];
      sortedYKeys.forEach((yKey) => {
        const rawLineItems = lineMap.get(yKey)!;
        rawLineItems.sort((a, b) => a.x - b.x);

        // Aplica a pré-costura de fragmentos numéricos (ex: R$ + 18.500, + 00)
        const lineItems = preStitchLineItems(rawLineItems);

        // Mapeia os elementos para a grade de colunas
        const rowCells = this.extractRowCellsByXAnchors(lineItems, columnAnchors);

        const fullRowText = rowCells.join(' ');
        if (
          fullRowText.includes('Relatório Executivo de Planilha') ||
          fullRowText.includes('100% Processamento Local') ||
          /Página\s+\d+\s+de\s+\d+/i.test(fullRowText)
        ) {
          return;
        }

        if (rowCells.length > 0) {
          rows.push(rowCells);
        }
      });

      if (rows.length > 0) {
        tablesResult.push({
          pageNumber: pNum,
          rows,
        });
      }
    }

    return tablesResult;
  },

  /**
   * Mapeia elementos de uma linha para colunas com base nas âncoras X ou lacunas horizontais.
   */
  extractRowCellsByXAnchors(lineItems: TextItemPos[], columnAnchors?: number[]): string[] {
    if (lineItems.length === 0) return [];

    // Se a página possui âncoras de colunas X bem definidas
    if (columnAnchors && columnAnchors.length >= 3) {
      const row = new Array(columnAnchors.length).fill('');
      lineItems.forEach((it) => {
        const str = it.str.trim();
        if (!str) return;

        // Encontra a coluna X por divisão de pontos médios entre âncoras
        let targetCol = 0;
        for (let c = 0; c < columnAnchors.length - 1; c++) {
          const currentAnchor = columnAnchors[c];
          const nextAnchor = columnAnchors[c + 1];
          const midPoint = (currentAnchor + nextAnchor) / 2;
          if (it.x < midPoint) {
            targetCol = c;
            break;
          }
          targetCol = c + 1;
        }

        row[targetCol] = row[targetCol] ? `${row[targetCol]} ${str}` : str;
      });

      // Remove colunas vazias à direita
      while (row.length > 0 && !row[row.length - 1]) {
        row.pop();
      }
      return row;
    }

    // Se não há âncoras fixas, separa por lacunas de largura estimada de caractere (gap >= 22px)
    const rowCells: string[] = [];
    let currentCellText = '';
    let lastXEnd = -1;

    lineItems.forEach((it) => {
      const str = it.str.trim();
      if (!str) return;

      const estimatedWidth = Math.min(str.length * 7, 120);

      if (lastXEnd < 0) {
        currentCellText = str;
      } else {
        const gap = it.x - lastXEnd;
        if (gap >= 22) {
          if (currentCellText) rowCells.push(currentCellText.trim());
          currentCellText = str;
        } else {
          currentCellText += ' ' + str;
        }
      }

      lastXEnd = it.x + estimatedWidth;
    });

    if (currentCellText) {
      rowCells.push(currentCellText.trim());
    }

    return rowCells;
  },

  /**
   * Exporta a estrutura de tabelas para um arquivo Excel Nativo (.xlsx) com abas idênticas ao benchmark (Lancamentos, DRE, Cadastros, Dashboard).
   */
  exportTablesToXlsxBlob(tables: ExtractedTableData[]): { blob: Blob; size: number } {
    const wb = XLSX.utils.book_new();
    const sheetsMap = new Map<string, (string | number)[][]>();

    tables.forEach((tbl) => {
      const cleanRows = tbl.rows.filter((r) => r.length > 0);
      if (cleanRows.length === 0) return;

      const firstRowText = cleanRows[0]?.join(' ').toUpperCase() || '';
      let sheetName = `Pagina_${tbl.pageNumber}`;

      if (firstRowText.includes('CADASTRO') || firstRowText.includes('PARAMETRIZAÇÃO')) sheetName = 'Cadastros';
      else if (firstRowText.includes('LANÇAMENTO') || firstRowText.includes('LNC-')) sheetName = 'Lancamentos';
      else if (firstRowText.includes('DRE') || firstRowText.includes('EXERCÍCIO')) sheetName = 'DRE_Simplificada';
      else if (firstRowText.includes('PAINEL') || firstRowText.includes('DASHBOARD')) sheetName = 'Dashboard';
      else if (firstRowText.includes('INSTRUÇ') || firstRowText.includes('OBJETIVO')) sheetName = 'Guia_Instrucoes';

      const parsedRows: (string | number)[][] = cleanRows.map((row) =>
        row.map((cell) => {
          const currencyMatch = cell.match(/^R\$\s*([\d.]+),(\d{2})$/);
          if (currencyMatch) {
            const rawNum = parseFloat(currencyMatch[1].replace(/\./g, '') + '.' + currencyMatch[2]);
            return isNaN(rawNum) ? cell : rawNum;
          }
          const percentMatch = cell.match(/^([\d.]+)\%$/);
          if (percentMatch) {
            const pNum = parseFloat(percentMatch[1]) / 100;
            return isNaN(pNum) ? cell : pNum;
          }
          if (/^\d+$/.test(cell)) return parseInt(cell, 10);
          return cell;
        })
      );

      if (!sheetsMap.has(sheetName)) {
        sheetsMap.set(sheetName, parsedRows);
      } else {
        // Se a aba já existe (ex: Lancamentos continuado na Página 4), pula o título e anexa apenas as linhas de dados
        const existing = sheetsMap.get(sheetName)!;
        const dataRows = parsedRows.filter((r) => {
          const str = r.join(' ').toUpperCase();
          return !str.includes('REGISTRO DE LANÇAMENTOS') && !str.includes('ID DATA TIPO');
        });
        sheetsMap.set(sheetName, [...existing, ...dataRows]);
      }
    });

    sheetsMap.forEach((wsData, sheetName) => {
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Ajuste automático de largura das colunas do Excel (Auto-fit)
      const colWidths = wsData.reduce((acc, row) => {
        row.forEach((cell, cIdx) => {
          const len = String(cell || '').length;
          acc[cIdx] = Math.max(acc[cIdx] || 10, len + 3);
        });
        return acc;
      }, [] as number[]);

      ws['!cols'] = colWidths.map((w) => ({ wch: Math.min(w, 50) }));

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([xlsxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return { blob, size: blob.size };
  },

  /**
   * Exporta a estrutura de tabelas para um arquivo CSV limpo com BOM UTF-8 e delimitador ';'
   */
  exportTablesToCsvBlob(tables: ExtractedTableData[]): { blob: Blob; size: number } {
    let csvContent = '\uFEFF';

    tables.forEach((tbl) => {
      const cleanRows = tbl.rows.filter((r) => r.length > 0);
      if (cleanRows.length === 0) return;

      csvContent += `--- Tabela da Página ${tbl.pageNumber} ---\n`;
      cleanRows.forEach((row) => {
        const csvLine = row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';');
        csvContent += csvLine + '\n';
      });
      csvContent += '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return { blob, size: blob.size };
  },

  /**
   * Exporta a estrutura de tabelas para um arquivo Excel CSV com BOM UTF-8 e faz o download direto (Legado).
   */
  exportTablesToExcelCsv(tables: ExtractedTableData[], baseFileName: string): void {
    const { blob } = this.exportTablesToCsvBlob(tables);
    const outputName = `${baseFileName.replace(/\.pdf$/i, '')}_tabelas_excel.csv`;
    saveAs(blob, outputName);
  },
};
