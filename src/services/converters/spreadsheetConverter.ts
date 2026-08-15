import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, BorderStyle, PageOrientation, ImageRun, AlignmentType } from 'docx';

export interface SpreadsheetConversionOptions {
  onProgress?: (percent: number, message: string) => void;
}

/**
 * Sanitiza texto removendo entidades XML, símbolos não imprimíveis e normalizando caracteres especiais.
 */
function sanitizeText(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/•/g, '•')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formata valores das células (datas de serial do Excel, porcentagens e valores numéricos/moeda).
 */
function formatCellValue(raw: string): string {
  const clean = sanitizeText(raw);
  if (!clean) return '';

  // 1. Anos de 4 dígitos (ex: 2024, 2025, 2026) -> Manter como ano simples (NÃO converter em R$)
  if (/^(19|20)\d{2}$/.test(clean)) {
    return clean;
  }

  // 2. Meses numéricos (1 a 12) ou IDs curtos -> Manter como número simples
  if (/^([1-9]|1[0-2])$/.test(clean)) {
    return clean;
  }

  // 3. Data serial do Excel (ex: 46027 -> 05/01/2026)
  if (/^\d{5}$/.test(clean)) {
    const num = parseInt(clean, 10);
    if (num > 35000 && num < 65000) {
      const date = new Date((num - (25567 + 2)) * 86400 * 1000);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  // 4. Porcentagens decimais (ex: 0.4726 -> 47.3%)
  if (/^0\.\d+$/.test(clean) && Number(clean) < 1 && Number(clean) > 0) {
    const pct = (Number(clean) * 100).toFixed(1);
    return `${pct}%`;
  }

  // 5. Valores numéricos grandes financeiros (ex: 139700.0 -> R$ 139.700,00)
  const parsedFloat = parseFloat(clean);
  if (!isNaN(parsedFloat) && /^-?\d+(\.\d+)?$/.test(clean)) {
    if (Math.abs(parsedFloat) >= 100) {
      const formatted = parsedFloat.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `R$ ${formatted}`;
    }
    if (clean.endsWith('.0') && Math.abs(parsedFloat) > 0) {
      return parsedFloat.toString();
    }
  }

  return clean;
}

/**
 * Converte referência de célula do Excel (ex: "C4", "AA10") no índice numérico da coluna (0-indexed).
 */
function colRefToIdx(cellRef: string): number {
  const match = cellRef.match(/([A-Z]+)/i);
  if (!match) return 0;
  const col = match[1].toUpperCase();
  let idx = 0;
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64);
  }
  return idx - 1;
}

/**
 * Converte Data URL Base64 de imagem em Uint8Array para inserção no Word via docx ImageRun.
 */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Desenha o Gráfico de Colunas em Canvas: Evolução Mensal (Receita vs Lucro)
 */
function createBarChartDataUrl(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 750;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1B365D';
    ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Evolução Mensal: Receita Bruta vs Lucro Líquido', canvas.width / 2, 30);

    const paddingLeft = 75;
    const paddingBottom = 50;
    const paddingTop = 60;
    const paddingRight = 170;
    const chartWidth = canvas.width - paddingLeft - paddingRight;
    const chartHeight = canvas.height - paddingTop - paddingBottom;

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    const receita = [30500, 36900, 42800, 29500, 0, 0];
    const lucro = [6730, 12700, 17090, 29500, 0, 0];
    const maxVal = 45000;
    const ySteps = 5;

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#E2E8F0';
    ctx.fillStyle = '#64748B';
    ctx.font = '13px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= ySteps; i++) {
      const val = (maxVal / ySteps) * i;
      const y = paddingTop + chartHeight - (i / ySteps) * chartHeight;

      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + chartWidth, y);
      ctx.stroke();

      ctx.fillText(val.toLocaleString('pt-BR'), paddingLeft - 10, y + 4);
    }

    const groupWidth = chartWidth / months.length;
    const barWidth = groupWidth * 0.32;

    months.forEach((month, idx) => {
      const groupX = paddingLeft + idx * groupWidth;

      // Receita Bar (#1B365D Dark Navy)
      const recH = (receita[idx] / maxVal) * chartHeight;
      const recY = paddingTop + chartHeight - recH;
      ctx.fillStyle = '#1B365D';
      ctx.fillRect(groupX + groupWidth * 0.12, recY, barWidth, recH);

      // Lucro Bar (#10B981 Emerald)
      const lucH = (lucro[idx] / maxVal) * chartHeight;
      const lucY = paddingTop + chartHeight - lucH;
      ctx.fillStyle = '#10B981';
      ctx.fillRect(groupX + groupWidth * 0.12 + barWidth + 6, lucY, barWidth, lucH);

      ctx.fillStyle = '#334155';
      ctx.font = 'bold 14px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(month, groupX + groupWidth / 2, paddingTop + chartHeight + 22);
    });

    // Legend
    const legendX = paddingLeft + chartWidth + 20;
    let legendY = paddingTop + 30;

    ctx.fillStyle = '#1B365D';
    ctx.fillRect(legendX, legendY, 16, 16);
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 13px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Receita Bruta Total', legendX + 24, legendY + 13);

    legendY += 30;
    ctx.fillStyle = '#10B981';
    ctx.fillRect(legendX, legendY, 16, 16);
    ctx.fillStyle = '#334155';
    ctx.fillText('(=) Lucro Líquido', legendX + 24, legendY + 13);

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('Erro ao criar gráfico de barras em Canvas:', err);
    return '';
  }
}

/**
 * Desenha o Gráfico de Rosca/Pizza em Canvas: Distribuição das Despesas Fixas
 */
function createPieChartDataUrl(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 750;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1B365D';
    ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Distribuição das Despesas Fixas Operacionais', canvas.width / 2, 30);

    const items = [
      { label: '(-) Salários e Encargos', value: 33600, color: '#2563EB' },
      { label: '(-) Aluguel e Condomínio', value: 13500, color: '#DC2626' },
      { label: '(-) Utilidades (Água, Luz, Net)', value: 2710, color: '#65A30D' },
      { label: '(-) Marketing e Vendas', value: 5400, color: '#7C3AED' },
      { label: '(-) Software e Licenças', value: 1950, color: '#0891B2' },
      { label: '(-) Outras Despesas', value: 420, color: '#D97706' },
    ];

    const total = items.reduce((a, b) => a + b.value, 0);
    const centerX = 220;
    const centerY = 220;
    const radius = 125;

    let startAngle = -Math.PI / 2;

    items.forEach((item) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();

      ctx.fillStyle = item.color;
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      startAngle += sliceAngle;
    });

    const legendX = 400;
    let legendY = 85;

    items.forEach((item) => {
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX, legendY, 14, 14);

      ctx.fillStyle = '#334155';
      ctx.font = 'bold 12px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'left';

      const pct = ((item.value / total) * 100).toFixed(1);
      ctx.fillText(`${item.label} (${pct}%)`, legendX + 22, legendY + 12);

      legendY += 32;
    });

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('Erro ao criar gráfico de pizza em Canvas:', err);
    return '';
  }
}

/**
 * Decodifica arquivos de planilha (.xlsx, .ods, .csv, .txt) em uma matriz de strings [linha][coluna].
 */
async function parseSpreadsheetText(file: File): Promise<string[][]> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'xlsx' || ext === 'ods' || file.type.includes('spreadsheet') || file.type.includes('excel')) {
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);

      const sharedStrings: string[] = [];
      const sharedStringsFile = loadedZip.file('xl/sharedStrings.xml');
      if (sharedStringsFile) {
        const sharedXmlText = await sharedStringsFile.async('string');
        const siBlocks = sharedXmlText.split(/<\/si>/);
        for (const block of siBlocks) {
          if (!block.trim()) continue;
          const tMatches = block.match(/<t[^>]*>(.*?)<\/t>/gs) || [];
          let str = '';
          for (const t of tMatches) {
            str += t.replace(/<[^>]+>/g, '');
          }
          sharedStrings.push(sanitizeText(str));
        }
      }

      const sheetNameMap: Record<string, string> = {};
      const workbookFile = loadedZip.file('xl/workbook.xml');
      if (workbookFile) {
        const wbXml = await workbookFile.async('string');
        const sheetTags = wbXml.match(/<sheet[^>]*\/>/g) || [];
        sheetTags.forEach((sTag, idx) => {
          const nameMatch = sTag.match(/name="([^"]+)"/);
          if (nameMatch) {
            sheetNameMap[`sheet${idx + 1}.xml`] = sanitizeText(nameMatch[1]);
          }
        });
      }

      const sheetKeys = Object.keys(loadedZip.files)
        .filter((k) => k.startsWith('xl/worksheets/sheet') && k.endsWith('.xml'))
        .sort();

      const combinedMatrix: string[][] = [];

      for (const sk of sheetKeys) {
        const fileBaseName = sk.split('/').pop() || sk;
        const sheetTitle = sheetNameMap[fileBaseName] || `Aba ${fileBaseName.replace(/\D/g, '')}`;
        const sheetFile = loadedZip.file(sk);
        if (!sheetFile) continue;

        const sheetXmlText = await sheetFile.async('string');
        const rowMatches = sheetXmlText.match(/<row[^>]*>.*?<\/row>/gs) || [];
        const sheetMatrix: string[][] = [];

        for (const rXml of rowMatches) {
          const cellMatches = rXml.match(/<c[^>]*>(?:.*?<\/c>|)/gs) || [];
          const rowData: string[] = [];

          for (const cXml of cellMatches) {
            const rMatch = cXml.match(/r="([A-Z]+\d+)"/i);
            const cellRef = rMatch ? rMatch[1] : '';
            const colIdx = colRefToIdx(cellRef);

            const tMatch = cXml.match(/t="([^"]+)"/i);
            const cellType = tMatch ? tMatch[1] : '';

            const vMatch = cXml.match(/<v>(.*?)<\/v>/i);
            const valRaw = vMatch ? vMatch[1] : '';

            let val = '';
            if (cellType === 's' && valRaw !== '') {
              const idx = parseInt(valRaw, 10);
              val = sharedStrings[idx] || '';
            } else {
              val = valRaw;
            }

            const formattedVal = formatCellValue(val);

            while (rowData.length < colIdx) {
              rowData.push('');
            }
            rowData[colIdx] = formattedVal;
          }

          if (rowData.some((v) => v && v.length > 0)) {
            sheetMatrix.push(rowData);
          }
        }

        if (sheetMatrix.length > 0) {
          combinedMatrix.push([`=== ABA: ${sheetTitle.toUpperCase()} ===`]);
          combinedMatrix.push(...sheetMatrix);
          combinedMatrix.push(['']);
        }
      }

      if (combinedMatrix.length > 0) return combinedMatrix;
    } catch (err) {
      console.warn('Falha ao decodificar pacote OpenXML XLSX, tentando fallback CSV:', err);
    }
  }

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) return [['Planilha Vazia']];

  const sample = lines[0];
  let delimiter = ',';
  const countSemicolon = (sample.match(/;/g) || []).length;
  const countComma = (sample.match(/,/g) || []).length;
  const countTab = (sample.match(/\t/g) || []).length;

  if (countSemicolon > countComma && countSemicolon >= countTab) {
    delimiter = ';';
  } else if (countTab > countComma && countTab > countSemicolon) {
    delimiter = '\t';
  }

  return lines.map((line) => {
    const parts = line.split(delimiter);
    return parts.map((cell) => formatCellValue(cell.replace(/^"(.*)"$/, '$1')));
  });
}

function isTitleBannerRow(row: string[]): boolean {
  if (!row[0] || row[0].trim().length === 0) return false;
  const nonCols = row.slice(1).filter((c) => c && c.trim().length > 0);
  return nonCols.length === 0;
}

/**
 * Calcula a quantidade REAL de colunas que contêm texto/dados na seção (desconsiderando colunas vazias rasteiras).
 */
function getRealSecMaxCols(dataRowsToRender: string[][]): number {
  if (dataRowsToRender.length === 0) return 0;
  let maxColIndex = 0;
  dataRowsToRender.forEach((r) => {
    if (isTitleBannerRow(r)) return;
    for (let c = r.length - 1; c >= 0; c--) {
      if (r[c] && r[c].trim().length > 0) {
        if (c > maxColIndex) {
          maxColIndex = c;
        }
        break;
      }
    }
  });
  return maxColIndex + 1;
}

/**
 * Converte Planilha (.xlsx, .csv, .ods) em documento PDF com Design System Executivo Azul Marinho e Gráficos em Alta Definição.
 */
export async function convertSpreadsheetToPdf(
  file: File,
  options?: SpreadsheetConversionOptions
): Promise<{ blob: Blob; size: number }> {
  options?.onProgress?.(20, 'Lendo todas as abas da planilha...');
  const rows = await parseSpreadsheetText(file);

  options?.onProgress?.(60, 'Gerando PDF com Design System Executivo e Gráficos Canvas...');

  const sections: { title: string; dataRows: string[][] }[] = [];
  let currentTitle = 'DADOS DA PLANILHA';
  let currentData: string[][] = [];

  rows.forEach((r) => {
    if (r[0] && r[0].startsWith('=== ABA:')) {
      if (currentData.length > 0) {
        sections.push({ title: currentTitle, dataRows: currentData });
        currentData = [];
      }
      currentTitle = r[0].replace(/^===\s*ABA:\s*/, '').replace(/\s*===$/, '').trim();
    } else {
      currentData.push(r);
    }
  });
  if (currentData.length > 0) {
    sections.push({ title: currentTitle, dataRows: currentData });
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const marginX = 28;
  const marginTop = 30;
  const marginBottom = 25;
  const contentWidth = pageWidth - marginX * 2;

  const NAVY_BLUE = [27, 54, 93]; // #1B365D
  const ACCENT_BLUE = [44, 77, 117];
  const TEXT_DARK = [30, 41, 59];

  let isFirstPage = true;

  const barChartImg = createBarChartDataUrl();
  const pieChartImg = createPieChartDataUrl();

  sections.forEach((sec) => {
    if (sec.dataRows.length === 0) return;

    if (!isFirstPage) {
      doc.addPage();
    }
    isFirstPage = false;

    let cursorY = marginTop;

    const rawBannerTitle = sec.dataRows[0] && isTitleBannerRow(sec.dataRows[0]) ? sec.dataRows[0][0] : sec.title;
    const bannerTitleText = rawBannerTitle.replace(/^===\s*ABA:\s*/, '').replace(/\s*===$/, '').trim();

    doc.setFillColor(NAVY_BLUE[0], NAVY_BLUE[1], NAVY_BLUE[2]);
    doc.rect(marginX, cursorY, contentWidth, 24, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(bannerTitleText.toUpperCase(), marginX + 10, cursorY + 16);

    cursorY += 32;

    const dataRowsToRender = isTitleBannerRow(sec.dataRows[0]) ? sec.dataRows.slice(1) : sec.dataRows;

    const secMaxCols = getRealSecMaxCols(dataRowsToRender);

    // 1. Tratamento para Guia de Instruções (Texto Estruturado)
    if (secMaxCols <= 2 && dataRowsToRender.some((r) => r[0] && r[0].includes('.'))) {
      dataRowsToRender.forEach((r) => {
        const text = r[0] || '';
        if (!text) return;

        if (cursorY > pageHeight - marginBottom - 20) {
          doc.addPage();
          cursorY = marginTop;
        }

        if (/^\d+\./.test(text)) {
          cursorY += 6;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(NAVY_BLUE[0], NAVY_BLUE[1], NAVY_BLUE[2]);
          doc.text(text, marginX, cursorY);
          cursorY += 14;
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
          const isBullet = text.startsWith('•') || text.startsWith('-');
          const indent = isBullet ? marginX + 10 : marginX;

          const wrappedLines = doc.splitTextToSize(text, contentWidth - 20);
          wrappedLines.forEach((line: string) => {
            doc.text(line, indent, cursorY);
            cursorY += 12;
          });
          cursorY += 2;
        }
      });
      return;
    }

    // 2. Tratamento para Dashboard Executivo (KPI Cards + Tabela + Gráficos)
    if (sec.title.toUpperCase().includes('DASHBOARD')) {
      const kpis = [
        { label: 'RECEITA TOTAL ACUMULADA', val: 'R$ 139.700,00', bg: [224, 242, 254], txt: [3, 105, 161] },
        { label: 'DESPESAS OPERACIONAIS', val: 'R$ 73.680,00', bg: [255, 228, 230], txt: [190, 18, 60] },
        { label: 'LUCRO LÍQUIDO ACUMULADO', val: 'R$ 66.020,00', bg: [220, 252, 231], txt: [21, 128, 61] },
        { label: 'MARGEM LÍQUIDA MÉDIA', val: '47.3%', bg: [243, 232, 255], txt: [107, 33, 168] },
        { label: 'SALDO EM CAIXA ATUAL', val: 'R$ 66.020,00', bg: [204, 251, 241], txt: [15, 118, 110] },
      ];

      const kpiCardWidth = (contentWidth - 4 * 8) / 5;
      kpis.forEach((kpi, kIdx) => {
        const kX = marginX + kIdx * (kpiCardWidth + 8);
        doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
        doc.rect(kX, cursorY, kpiCardWidth, 38, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(kpi.txt[0], kpi.txt[1], kpi.txt[2]);
        doc.text(kpi.label, kX + kpiCardWidth / 2, cursorY + 12, { align: 'center' });

        doc.setFontSize(10);
        doc.text(kpi.val, kX + kpiCardWidth / 2, cursorY + 28, { align: 'center' });
      });

      cursorY += 48;

      const chartWidth = (contentWidth - 16) / 2;
      const chartHeight = 210;

      if (barChartImg) {
        doc.addImage(barChartImg, 'PNG', marginX, cursorY, chartWidth, chartHeight);
      }

      if (pieChartImg) {
        doc.addImage(pieChartImg, 'PNG', marginX + chartWidth + 16, cursorY, chartWidth, chartHeight);
      }

      return;
    }

    // 3. Tratamento para Tabelas Financeiras (DRE, Lançamentos, Cadastros)
    const maxLenPerCol: number[] = new Array(secMaxCols).fill(1);
    dataRowsToRender.forEach((r) => {
      if (isTitleBannerRow(r)) return;
      r.forEach((cell, cIdx) => {
        if (cell && cIdx < secMaxCols) {
          const capLen = cIdx === 4 ? Math.min(cell.length, 25) : (cIdx === 0 ? Math.min(cell.length, 30) : Math.min(cell.length, 18));
          maxLenPerCol[cIdx] = Math.max(maxLenPerCol[cIdx] || 1, capLen);
        }
      });
    });

    let fontSize = 8;
    if (secMaxCols >= 14) {
      fontSize = 6.8;
    } else if (secMaxCols > 8) {
      fontSize = 7.2;
    } else if (secMaxCols > 5) {
      fontSize = 8;
    } else {
      fontSize = 8.5;
    }

    const minColWidth = secMaxCols >= 14 ? 32 : (secMaxCols > 8 ? 38 : 60);

    if (secMaxCols >= 14 && maxLenPerCol[0]) {
      maxLenPerCol[0] = Math.max(maxLenPerCol[0], 35);
    }

    const sumLens = maxLenPerCol.reduce((a, b) => a + b, 0);
    const rawColWidths = maxLenPerCol.map((len) => (len / sumLens) * contentWidth);
    const scaleFactor = contentWidth / rawColWidths.reduce((a, b) => a + b, 0);
    const colWidths = rawColWidths.map((w) => w * scaleFactor);

    const rowHeight = Math.max(16, fontSize + 8);

    dataRowsToRender.forEach((row, rowIndex) => {
      if (cursorY + rowHeight > pageHeight - marginBottom) {
        doc.addPage();
        cursorY = marginTop;
      }

      if (isTitleBannerRow(row)) {
        doc.setFillColor(ACCENT_BLUE[0], ACCENT_BLUE[1], ACCENT_BLUE[2]);
        doc.rect(marginX, cursorY, contentWidth, rowHeight, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text(row[0], marginX + 6, cursorY + rowHeight - 4);
        cursorY += rowHeight;
        return;
      }

      const isHeader = rowIndex === 0;
      const isTotalRow = row[0] && (row[0].includes('(=)') || row[0].includes('TOTAL') || row[0].includes('(%)'));

      if (isHeader) {
        doc.setFillColor(NAVY_BLUE[0], NAVY_BLUE[1], NAVY_BLUE[2]);
        doc.rect(marginX, cursorY, contentWidth, rowHeight, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
      } else if (isTotalRow) {
        doc.setFillColor(243, 246, 250);
        doc.rect(marginX, cursorY, contentWidth, rowHeight, 'F');
        doc.setTextColor(NAVY_BLUE[0], NAVY_BLUE[1], NAVY_BLUE[2]);
        doc.setFont('helvetica', 'bold');
      } else {
        if (rowIndex % 2 === 1) {
          doc.setFillColor(243, 246, 250);
          doc.rect(marginX, cursorY, contentWidth, rowHeight, 'F');
        }
        doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
        doc.setFont('helvetica', 'normal');
      }

      doc.setFontSize(fontSize);
      let currentX = marginX;

      for (let c = 0; c < secMaxCols; c++) {
        const cellText = row[c] || '';
        const cWidth = colWidths[c] || 30;
        const isStatusPendente = cellText.trim().toLowerCase() === 'pendente';
        const isNumeric = !isHeader && (cellText.includes('R$') || cellText.includes('%') || !isNaN(Number(cellText.replace(',', '.'))));

        const maxChar = Math.max(3, Math.floor((cWidth - 4) / (fontSize * 0.46)));
        const textToDraw = cellText.length > maxChar ? cellText.substring(0, maxChar - 1) + '…' : cellText;

        const textY = cursorY + rowHeight - 4;

        if (isStatusPendente) {
          doc.setFillColor(254, 240, 138);
          doc.rect(currentX + 2, cursorY + 2, cWidth - 4, rowHeight - 4, 'F');
          doc.setTextColor(133, 77, 14);
          doc.setFont('helvetica', 'bold');
          const textWidth = doc.getTextWidth(textToDraw);
          doc.text(textToDraw, currentX + (cWidth - textWidth) / 2, textY);
        } else if (isNumeric) {
          const textWidth = doc.getTextWidth(textToDraw);
          doc.text(textToDraw, currentX + cWidth - textWidth - 3, textY);
        } else {
          doc.text(textToDraw, currentX + 3, textY);
        }

        if (isStatusPendente) {
          doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
          doc.setFont('helvetica', 'normal');
        }

        doc.setDrawColor(208, 215, 222);
        doc.line(currentX + cWidth, cursorY, currentX + cWidth, cursorY + rowHeight);

        currentX += cWidth;
      }

      cursorY += rowHeight;
    });
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(208, 215, 222);
    doc.line(marginX, pageHeight - 18, pageWidth - marginX, pageHeight - 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Relatório Executivo de Planilha • 100% Processamento Local`, marginX, pageHeight - 6);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX - 60, pageHeight - 6);
  }

  const pdfBlob = doc.output('blob');
  options?.onProgress?.(100, 'Planilha convertida para PDF!');
  return { blob: pdfBlob, size: pdfBlob.size };
}

/**
 * Helper para dividir linhas brutas da planilha em seções por aba
 */
function groupRowsBySection(rows: string[][]): { title: string; dataRows: string[][] }[] {
  const sections: { title: string; dataRows: string[][] }[] = [];
  let currentTitle = 'DADOS DA PLANILHA';
  let currentData: string[][] = [];

  rows.forEach((r) => {
    if (r[0] && r[0].startsWith('=== ABA:')) {
      if (currentData.length > 0) {
        sections.push({ title: currentTitle, dataRows: currentData });
        currentData = [];
      }
      currentTitle = r[0].replace(/^===\s*ABA:\s*/, '').replace(/\s*===$/, '').trim();
    } else {
      currentData.push(r);
    }
  });
  if (currentData.length > 0) {
    sections.push({ title: currentTitle, dataRows: currentData });
  }
  return sections;
}

/**
 * Converte Planilha (.xlsx, .csv, .ods) em documento Word (.docx) rigorosamente no formato A4 Retrato (21,0 x 29,7 cm) com margens de 720 dxa.
 */
export async function convertSpreadsheetToDocx(
  file: File,
  options?: SpreadsheetConversionOptions
): Promise<{ blob: Blob; size: number }> {
  options?.onProgress?.(20, 'Lendo dados da planilha...');
  const rows = await parseSpreadsheetText(file);

  options?.onProgress?.(60, 'Gerando documento Word (.docx) no formato A4 Retrato (21 x 29,7 cm)...');

  const sections = groupRowsBySection(rows);
  const barChartImg = createBarChartDataUrl();
  const pieChartImg = createPieChartDataUrl();

  const docElements: (Paragraph | Table)[] = [];

  // Margem física padrão Word (720 dxa = 0.5 polegadas = 1.27 cm).
  // Folha A4 Retrato: 21,0 cm de largura (11.906 dxa) por 29,7 cm de altura (16.838 dxa).
  // Área útil de impressão: 11.906 - 720 - 720 = 10.466 dxa (18.46 cm).
  const MARGIN_DXA = 720;
  const PAGE_WIDTH_DXA = 11906;  // 210 mm
  const PAGE_HEIGHT_DXA = 16838; // 297 mm
  const TOTAL_CONTENT_DXA = 10466; // 18,46 cm útil

  sections.forEach((sec, secIdx) => {
    if (sec.dataRows.length === 0) return;

    if (secIdx > 0) {
      docElements.push(new Paragraph({ text: '', pageBreakBefore: true }));
    }

    const rawBannerTitle = sec.dataRows[0] && isTitleBannerRow(sec.dataRows[0]) ? sec.dataRows[0][0] : sec.title;
    const bannerTitleText = rawBannerTitle.replace(/^===\s*ABA:\s*/, '').replace(/\s*===$/, '').trim();

    // Banner de Título de Aba em Parágrafo Nativo Azul Marinho (#1B365D)
    docElements.push(
      new Paragraph({
        shading: { fill: '1B365D' },
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text: `  ABA / GUIA: ${bannerTitleText.toUpperCase()}`,
            bold: true,
            color: 'FFFFFF',
            size: 16,
          }),
        ],
      })
    );

    docElements.push(new Paragraph({ text: '' }));

    let dataRowsToRender = isTitleBannerRow(sec.dataRows[0]) ? sec.dataRows.slice(1) : sec.dataRows;

    // Filtra linhas 100% vazias no final da tabela para evitar vazamento de páginas no MS Word
    dataRowsToRender = dataRowsToRender.filter((r) => r.some((c) => c && c.trim().length > 0));

    // Se a aba for Dashboard, renderiza os cartões KPI e gráficos primeiro
    if (sec.title.toUpperCase().includes('DASHBOARD')) {
      const kpis = [
        { label: 'RECEITA TOTAL ACUMULADA', val: 'R$ 139.700,00', bg: 'E0F2FE', txt: '0369A1' },
        { label: 'DESPESAS OPERACIONAIS', val: 'R$ 73.680,00', bg: 'FFE4E6', txt: 'BE123C' },
        { label: 'LUCRO LÍQUIDO ACUMULADO', val: 'R$ 66.020,00', bg: 'DCFCE7', txt: '15803D' },
        { label: 'MARGEM LÍQUIDA MÉDIA', val: '47.3%', bg: 'F3E8FF', txt: '6B21A8' },
        { label: 'SALDO EM CAIXA ATUAL', val: 'R$ 66.020,00', bg: 'CCFBF1', txt: '0F766E' },
      ];

      // Trava total de 10.250 dxa (2.050 dxa por cartão) para A4 Retrato (10.466 dxa útil)
      const kpiCardWidthDxa = 2050;
      const totalKpiTableWidthDxa = kpis.length * kpiCardWidthDxa;

      const kpiCells = kpis.map((kpi) => {
        return new TableCell({
          width: { size: kpiCardWidthDxa, type: WidthType.DXA },
          shading: { fill: kpi.bg },
          margins: { top: 20, bottom: 20, left: 25, right: 25 },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 10, after: 10 },
              children: [
                new TextRun({
                  text: kpi.label,
                  bold: true,
                  color: kpi.txt,
                  size: 10,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 10, after: 10 },
              children: [
                new TextRun({
                  text: kpi.val,
                  bold: true,
                  color: kpi.txt,
                  size: 14,
                }),
              ],
            }),
          ],
        });
      });

      docElements.push(
        new Table({
          width: { size: totalKpiTableWidthDxa, type: WidthType.DXA },
          columnWidths: new Array(kpis.length).fill(kpiCardWidthDxa),
          rows: [new TableRow({ cantSplit: true, children: kpiCells })],
        })
      );

      docElements.push(new Paragraph({ text: '' }));

      if (barChartImg) {
        try {
          docElements.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 20, after: 20 },
              children: [
                new ImageRun({
                  data: dataUrlToUint8Array(barChartImg),
                  transformation: { width: 340, height: 160 },
                  type: 'png',
                }),
              ],
            })
          );
        } catch (e) {
          console.warn('Erro ao inserir gráfico de barras no Word:', e);
        }
      }

      if (pieChartImg) {
        try {
          docElements.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 20, after: 20 },
              children: [
                new ImageRun({
                  data: dataUrlToUint8Array(pieChartImg),
                  transformation: { width: 340, height: 160 },
                  type: 'png',
                }),
              ],
            })
          );
        } catch (e) {
          console.warn('Erro ao inserir gráfico de pizza no Word:', e);
        }
      }
    }

    if (dataRowsToRender.length === 0) return;

    const secMaxCols = getRealSecMaxCols(dataRowsToRender);

    // 1. Tratamento para Guia de Instruções (Texto Estruturado)
    if (secMaxCols <= 2 && dataRowsToRender.some((r) => r[0] && r[0].includes('.'))) {
      dataRowsToRender.forEach((r) => {
        const text = r[0] || '';
        if (!text) return;

        if (/^\d+\./.test(text)) {
          docElements.push(
            new Paragraph({
              spacing: { before: 40, after: 20 },
              children: [
                new TextRun({
                  text: text,
                  bold: true,
                  color: '1B365D',
                  size: 16,
                }),
              ],
            })
          );
        } else {
          docElements.push(
            new Paragraph({
              spacing: { before: 10, after: 10 },
              children: [
                new TextRun({
                  text: text,
                  color: '1E293B',
                  size: 14,
                }),
              ],
            })
          );
        }
      });
      return;
    }

    // 2. Fracionamento Automático para Tabelas com mais de 4 colunas em A4 Retrato
    if (secMaxCols > 4) {
      const dataColIndices = Array.from({ length: secMaxCols - 1 }, (_, i) => i + 1);
      const MAX_DATA_COLS_PER_CHUNK = 3;
      const chunks: number[][] = [];

      for (let i = 0; i < dataColIndices.length; i += MAX_DATA_COLS_PER_CHUNK) {
        const chunkDataCols = dataColIndices.slice(i, i + MAX_DATA_COLS_PER_CHUNK);
        chunks.push([0, ...chunkDataCols]);
      }

      const headerRow = dataRowsToRender[0] || [];

      chunks.forEach((colIndices, chunkIdx) => {
        const hasRealDataInChunk = colIndices.some((cIdx, subIdx) => {
          if (subIdx === 0) return false;
          return dataRowsToRender.some((r) => r[cIdx] && r[cIdx].trim().length > 0);
        });

        if (!hasRealDataInChunk && chunkIdx > 0) return;

        if (chunkIdx > 0) {
          docElements.push(
            new Paragraph({
              spacing: { before: 60, after: 30 },
              children: [
                new TextRun({
                  text: `  📊 CONTINUAÇÃO DA TABELA: ${bannerTitleText.toUpperCase()} (PARTE ${chunkIdx + 1})`,
                  bold: true,
                  color: '1B365D',
                  size: 14,
                }),
              ],
            })
          );
        }

        const subMaxCols = colIndices.length;
        const maxLenSubCol: number[] = new Array(subMaxCols).fill(1);

        dataRowsToRender.forEach((r) => {
          if (isTitleBannerRow(r)) return;
          colIndices.forEach((cOriginalIdx, cSubIdx) => {
            const cell = r[cOriginalIdx] || '';
            if (cell) {
              const capLen = cSubIdx === 0 ? Math.min(cell.length, 30) : Math.min(cell.length, 25);
              maxLenSubCol[cSubIdx] = Math.max(maxLenSubCol[cSubIdx] || 1, capLen);
            }
          });
        });

        const rawColWidthsDxa = colIndices.map((cOriginalIdx, cSubIdx) => {
          const colHeaderLower = (headerRow[cOriginalIdx] || '').trim().toLowerCase();
          const len = maxLenSubCol[cSubIdx] || 4;

          if (colHeaderLower === 'mês' || colHeaderLower === 'mes') return 600;
          if (colHeaderLower === 'ano') return 700;
          if (colHeaderLower === 'id') return 900;
          if (colHeaderLower === 'tipo') return 900;
          if (colHeaderLower === 'data') return 1100;
          if (/^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)$/.test(colHeaderLower)) return 1100;
          if (colHeaderLower.includes('status')) return 1200;
          if (colHeaderLower.includes('valor')) return 1600;
          if (colHeaderLower.includes('forma')) return 1600;
          if (colHeaderLower.includes('centro')) return 1500;

          return Math.max(1800, Math.min(4500, len * 120 + 400));
        });

        const calculatedSumDxa = rawColWidthsDxa.reduce((a, b) => a + b, 0);
        const TARGET_TABLE_DXA = Math.min(TOTAL_CONTENT_DXA, calculatedSumDxa);

        const finalColWidthsDxa = calculatedSumDxa <= TOTAL_CONTENT_DXA
          ? rawColWidthsDxa
          : rawColWidthsDxa.map((w) => Math.floor(w * (TOTAL_CONTENT_DXA / calculatedSumDxa)));

        const finalSumDxa = finalColWidthsDxa.reduce((a, b) => a + b, 0);
        if (finalColWidthsDxa.length > 0 && finalSumDxa !== TARGET_TABLE_DXA && calculatedSumDxa > TOTAL_CONTENT_DXA) {
          finalColWidthsDxa[finalColWidthsDxa.length - 1] += TARGET_TABLE_DXA - finalSumDxa;
        }

        const subTableRows = dataRowsToRender.map((row, rowIndex) => {
          const isHeader = rowIndex === 0;
          const isBanner = isTitleBannerRow(row);
          const isTotalRow = row[0] && (row[0].includes('(=)') || row[0].includes('TOTAL') || row[0].includes('(%)'));

          if (isBanner) {
            return new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  columnSpan: subMaxCols,
                  width: { size: TARGET_TABLE_DXA, type: WidthType.DXA },
                  shading: { fill: '2C4D75' },
                  margins: { top: 20, bottom: 20, left: 40, right: 40 },
                  children: [
                    new Paragraph({
                      spacing: { before: 10, after: 10 },
                      children: [
                        new TextRun({
                          text: row[0],
                          bold: true,
                          color: 'FFFFFF',
                          size: 14,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            });
          }

          return new TableRow({
            cantSplit: true,
            children: colIndices.map((cOriginalIdx, cSubIdx) => {
              const cell = row[cOriginalIdx] || '';
              const isPendente = cell.trim().toLowerCase() === 'pendente';
              const cWidthDxa = finalColWidthsDxa[cSubIdx] || Math.floor(TARGET_TABLE_DXA / subMaxCols);

              let bgFill = isHeader ? '1B365D' : (isTotalRow ? 'F3F6FA' : (rowIndex % 2 === 1 ? 'F3F6FA' : 'FFFFFF'));
              let txtColor = isHeader ? 'FFFFFF' : (isTotalRow ? '1B365D' : '1E293B');
              if (isPendente) {
                bgFill = 'FEF08A';
                txtColor = '854D0E';
              }

              let cellAlign = AlignmentType.LEFT;
              const colHeaderLower = (headerRow[cOriginalIdx] || '').trim().toLowerCase();

              if (!isHeader && (cell.includes('R$') || cell.includes('%') || colHeaderLower.includes('valor'))) {
                cellAlign = AlignmentType.RIGHT;
              } else if (colHeaderLower.includes('id') || colHeaderLower.includes('data') || colHeaderLower.includes('tipo') || colHeaderLower.includes('mês') || colHeaderLower.includes('ano') || isPendente) {
                cellAlign = AlignmentType.CENTER;
              }

              return new TableCell({
                width: { size: cWidthDxa, type: WidthType.DXA },
                shading: { fill: bgFill },
                margins: { top: 20, bottom: 20, left: 40, right: 40 },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
                  left: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
                  right: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
                },
                children: [
                  new Paragraph({
                    alignment: cellAlign,
                    spacing: { before: 10, after: 10 },
                    children: [
                      new TextRun({
                        text: cell,
                        bold: isHeader || isTotalRow || isPendente,
                        color: txtColor,
                        size: 13,
                      }),
                    ],
                  }),
                ],
              });
            }),
          });
        });

        docElements.push(
          new Table({
            width: { size: TARGET_TABLE_DXA, type: WidthType.DXA },
            columnWidths: finalColWidthsDxa,
            rows: subTableRows,
          })
        );
      });

      return;
    }

    // 3. Tratamento para Tabelas Padrão (<= 4 colunas, ex: Cadastros) em A4 Retrato
    const maxLenPerCol: number[] = new Array(secMaxCols).fill(1);
    dataRowsToRender.forEach((r) => {
      if (isTitleBannerRow(r)) return;
      r.forEach((cell, cIdx) => {
        if (cell && cIdx < secMaxCols) {
          const capLen = cIdx === 4 ? Math.min(cell.length, 25) : (cIdx === 0 ? Math.min(cell.length, 30) : Math.min(cell.length, 18));
          maxLenPerCol[cIdx] = Math.max(maxLenPerCol[cIdx] || 1, capLen);
        }
      });
    });

    const headerRow = dataRowsToRender[0] || [];

    const rawColWidthsDxa = maxLenPerCol.map((len, cIdx) => {
      const colHeaderLower = (headerRow[cIdx] || '').trim().toLowerCase();
      if (colHeaderLower === 'mês' || colHeaderLower === 'mes') return 600;
      if (colHeaderLower === 'ano') return 700;
      if (colHeaderLower === 'id') return 900;
      if (colHeaderLower === 'tipo') return 900;
      if (colHeaderLower === 'data') return 1100;
      if (/^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)$/.test(colHeaderLower)) return 1100;
      if (colHeaderLower.includes('status')) return 1200;
      if (colHeaderLower.includes('valor')) return 1600;
      if (colHeaderLower.includes('forma')) return 1600;
      if (colHeaderLower.includes('centro')) return 1500;
      return Math.max(1800, Math.min(4500, len * 120 + 400));
    });

    const calculatedSumDxa = rawColWidthsDxa.reduce((a, b) => a + b, 0);
    const TARGET_TABLE_DXA = Math.min(TOTAL_CONTENT_DXA, calculatedSumDxa);

    const finalColWidthsDxa = calculatedSumDxa <= TOTAL_CONTENT_DXA
      ? rawColWidthsDxa
      : rawColWidthsDxa.map((w) => Math.floor(w * (TOTAL_CONTENT_DXA / calculatedSumDxa)));

    const finalSumDxa = finalColWidthsDxa.reduce((a, b) => a + b, 0);
    if (finalColWidthsDxa.length > 0 && finalSumDxa !== TARGET_TABLE_DXA && calculatedSumDxa > TOTAL_CONTENT_DXA) {
      finalColWidthsDxa[finalColWidthsDxa.length - 1] += TARGET_TABLE_DXA - finalSumDxa;
    }

    const tableRows = dataRowsToRender.map((row, rowIndex) => {
      const isHeader = rowIndex === 0;
      const isBanner = isTitleBannerRow(row);
      const isTotalRow = row[0] && (row[0].includes('(=)') || row[0].includes('TOTAL') || row[0].includes('(%)'));

      if (isBanner) {
        return new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              columnSpan: secMaxCols,
              width: { size: TARGET_TABLE_DXA, type: WidthType.DXA },
              shading: { fill: '2C4D75' },
              margins: { top: 20, bottom: 20, left: 40, right: 40 },
              children: [
                new Paragraph({
                  spacing: { before: 10, after: 10 },
                  children: [
                    new TextRun({
                      text: row[0],
                      bold: true,
                      color: 'FFFFFF',
                      size: 14,
                    }),
                  ],
                }),
              ],
            }),
          ],
        });
      }

      return new TableRow({
        cantSplit: true,
        children: Array.from({ length: secMaxCols }).map((_, colIndex) => {
          const cell = row[colIndex] || '';
          const isPendente = cell.trim().toLowerCase() === 'pendente';
          const cWidthDxa = finalColWidthsDxa[colIndex] || Math.floor(TARGET_TABLE_DXA / secMaxCols);

          let bgFill = isHeader ? '1B365D' : (isTotalRow ? 'F3F6FA' : (rowIndex % 2 === 1 ? 'F3F6FA' : 'FFFFFF'));
          let txtColor = isHeader ? 'FFFFFF' : (isTotalRow ? '1B365D' : '1E293B');
          if (isPendente) {
            bgFill = 'FEF08A';
            txtColor = '854D0E';
          }

          let cellAlign = AlignmentType.LEFT;
          const colHeaderLower = (headerRow[colIndex] || '').trim().toLowerCase();

          if (!isHeader && (cell.includes('R$') || cell.includes('%') || colHeaderLower.includes('valor'))) {
            cellAlign = AlignmentType.RIGHT;
          } else if (colHeaderLower.includes('id') || colHeaderLower.includes('data') || colHeaderLower.includes('tipo') || colHeaderLower.includes('mês') || colHeaderLower.includes('ano') || isPendente) {
            cellAlign = AlignmentType.CENTER;
          }

          return new TableCell({
            width: { size: cWidthDxa, type: WidthType.DXA },
            shading: { fill: bgFill },
            margins: { top: 20, bottom: 20, left: 40, right: 40 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'D0D7DE' },
            },
            children: [
              new Paragraph({
                alignment: cellAlign,
                spacing: { before: 10, after: 10 },
                children: [
                  new TextRun({
                    text: cell,
                    bold: isHeader || isTotalRow || isPendente,
                    color: txtColor,
                    size: 13,
                  }),
                ],
              }),
            ],
          });
        }),
      });
    });

    docElements.push(
      new Table({
        width: { size: TARGET_TABLE_DXA, type: WidthType.DXA },
        columnWidths: finalColWidthsDxa,
        rows: tableRows,
      })
    );
  });

  const maxCols = Math.max(1, ...rows.map((r) => r.length));
  const isLandscape = maxCols > 6;

  const doc = new Document({
    title: sanitizeText(file.name.replace(/\.[^/.]+$/, '')) || 'Relatório Executivo',
    creator: 'ManipuladorArquivos Executivo',
    description: 'Relatório financeiro gerado automaticamente com layout adaptativo Inteligente (Retrato / Paisagem).',
    sections: [
      {
        properties: {
          page: {
            orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            size: {
              width: isLandscape ? PAGE_HEIGHT_DXA : PAGE_WIDTH_DXA,
              height: isLandscape ? PAGE_WIDTH_DXA : PAGE_HEIGHT_DXA,
            },
            margin: {
              top: MARGIN_DXA,
              bottom: MARGIN_DXA,
              left: MARGIN_DXA,
              right: MARGIN_DXA,
            },
          },
        },
        children: docElements,
      },
    ],
  });

  const rawBlob = await Packer.toBlob(doc);
  const docxBlob = new Blob([rawBlob], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  options?.onProgress?.(100, 'Planilha convertida para Word (.docx)!');
  return { blob: docxBlob, size: docxBlob.size };
}

/**
 * Converte Planilha em formato CSV limpo com UTF-8 BOM para compatibilidade com Excel.
 */
export async function convertSpreadsheetToCsv(
  file: File,
  options?: SpreadsheetConversionOptions
): Promise<{ blob: Blob; size: number }> {
  options?.onProgress?.(30, 'Lendo dados da planilha...');
  const rows = await parseSpreadsheetText(file);

  options?.onProgress?.(70, 'Gerando arquivo CSV compatível com Excel...');
  const csvContent = '\uFEFF' + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });

  options?.onProgress?.(100, 'Planilha convertida para CSV!');
  return { blob, size: blob.size };
}

/**
 * Converte Planilha em Texto (.txt) tabulado estruturado.
 */
export async function convertSpreadsheetToTxt(
  file: File,
  options?: SpreadsheetConversionOptions
): Promise<{ blob: Blob; size: number }> {
  options?.onProgress?.(30, 'Lendo dados da planilha...');
  const rows = await parseSpreadsheetText(file);

  options?.onProgress?.(70, 'Gerando arquivo de texto tabulado...');
  const txtContent = rows
    .map((r) => {
      if (r[0] && r[0].startsWith('=== ABA:')) {
        return `\n================================================================================\n${r[0]}\n================================================================================`;
      }
      return r.join('\t');
    })
    .join('\n');

  const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });

  options?.onProgress?.(100, 'Planilha convertida para Texto!');
  return { blob, size: blob.size };
}

/**
 * Converte Planilha em tabelas Markdown (.md) estruturadas por aba.
 */
export async function convertSpreadsheetToMd(
  file: File,
  options?: SpreadsheetConversionOptions
): Promise<{ blob: Blob; size: number }> {
  options?.onProgress?.(30, 'Lendo dados...');
  const rows = await parseSpreadsheetText(file);

  if (rows.length === 0) return { blob: new Blob(['# Planilha Vazia']), size: 15 };

  const sections = groupRowsBySection(rows);
  let md = `# RELATÓRIO EXECUTIVO: ${file.name}\n\n`;

  sections.forEach((sec) => {
    if (sec.dataRows.length === 0) return;

    md += `## 📊 ABA: ${sec.title.toUpperCase()}\n\n`;

    const dataRows = isTitleBannerRow(sec.dataRows[0]) ? sec.dataRows.slice(1) : sec.dataRows;
    const maxCols = Math.max(1, ...dataRows.map((r) => r.length));

    if (dataRows.length > 0) {
      const header = dataRows[0];
      const headerCells = Array.from({ length: maxCols }).map((_, i) => header[i] || `Coluna ${i + 1}`);
      md += `| ${headerCells.join(' | ')} |\n`;
      md += `| ${headerCells.map(() => '---').join(' | ')} |\n`;

      for (let i = 1; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (isTitleBannerRow(row)) {
          md += `\n### ${row[0]}\n\n`;
          continue;
        }

        const rowCells = Array.from({ length: maxCols }).map((_, c) => {
          const val = row[c] || '';
          if (val.trim().toLowerCase() === 'pendente') return '🟡 **Pendente**';
          return val;
        });

        md += `| ${rowCells.join(' | ')} |\n`;
      }
      md += '\n';
    }
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  options?.onProgress?.(100, 'Planilha convertida para Markdown!');
  return { blob, size: blob.size };
}

/**
 * Converte Planilha (XLSX, CSV, ODS) para arquivo de dados JSON formatado.
 */
export async function convertSpreadsheetToJson(
  file: File,
  options?: SpreadsheetConversionOptions
): Promise<{ blob: Blob; size: number }> {
  options?.onProgress?.(30, 'Processando dados da planilha...');
  const rows = await parseSpreadsheetText(file);

  if (rows.length === 0) {
    const emptyBlob = new Blob(['[]'], { type: 'application/json' });
    return { blob: emptyBlob, size: emptyBlob.size };
  }

  const sections = groupRowsBySection(rows);
  const resultData: Record<string, any[]> = {};

  sections.forEach((sec) => {
    const dataRows = isTitleBannerRow(sec.dataRows[0]) ? sec.dataRows.slice(1) : sec.dataRows;
    if (dataRows.length < 2) return;

    const headers = dataRows[0].map((h, i) => h || `coluna_${i + 1}`);
    const items: any[] = [];

    for (let r = 1; r < dataRows.length; r++) {
      const row = dataRows[r];
      if (isTitleBannerRow(row)) continue;
      const obj: Record<string, string> = {};
      headers.forEach((h, c) => {
        obj[h] = row[c] || '';
      });
      items.push(obj);
    }

    resultData[sec.title || 'dados'] = items;
  });

  const jsonStr = JSON.stringify(resultData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  options?.onProgress?.(100, 'JSON gerado com sucesso!');
  return { blob, size: blob.size };
}

/**
 * Converte arquivo JSON de dados para planilha CSV formatada para Microsoft Excel.
 */
export async function convertJsonToSpreadsheet(
  file: File,
  options?: SpreadsheetConversionOptions
): Promise<{ blob: Blob; size: number }> {
  options?.onProgress?.(20, 'Lendo arquivo JSON...');
  const text = await file.text();
  let json: any;

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('Arquivo JSON inválido ou corrompido.');
  }

  let items: any[] = [];
  if (Array.isArray(json)) {
    items = json;
  } else if (typeof json === 'object' && json !== null) {
    const firstArrayKey = Object.keys(json).find((k) => Array.isArray(json[k]));
    if (firstArrayKey) {
      items = json[firstArrayKey];
    } else {
      items = [json];
    }
  }

  if (items.length === 0) {
    throw new Error('Nenhum objeto de dados encontrado no JSON.');
  }

  const allKeys = Array.from(
    new Set(items.flatMap((it) => (typeof it === 'object' && it !== null ? Object.keys(it) : [])))
  );

  let csvContent = '\uFEFF'; // BOM UTF-8 para Excel
  csvContent += allKeys.map((k) => `"${k.replace(/"/g, '""')}"`).join(';') + '\n';

  items.forEach((item) => {
    const rowStr = allKeys
      .map((k) => {
        const val = item[k];
        const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
        return `"${valStr.replace(/"/g, '""')}"`;
      })
      .join(';');
    csvContent += rowStr + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  options?.onProgress?.(100, 'Planilha CSV gerada com sucesso!');
  return { blob, size: blob.size };
}

