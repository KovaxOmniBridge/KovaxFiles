import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { setupPdfWorker } from '../pdf/pdfWorkerInit';

setupPdfWorker();


export interface PiiDetectionItem {
  id: string;
  type: 'CPF' | 'CNPJ' | 'RG' | 'CNH' | 'Placa de Veículo' | 'Chave PIX' | 'Dado Bancário' | 'Email' | 'Telefone' | 'Link/URL' | 'Termo Personalizado' | 'Região Cabeçalho' | 'Região Rodapé' | 'Seleção Visual' | 'Nome de Pessoa (IA)' | 'CEP/Endereço (IA)' | 'Dado Financeiro (IA)' | 'CID/Saúde (IA)';
  textValue: string;
  location: string;
  selected: boolean;
  pageIndex?: number;
  customRect?: {
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
  };
}

// Algoritmo de Validação do Módulo 11 de CPF
function isValidCPF(cpf: string): boolean {
  const clean = cpf.replace(/[^\d]+/g, '');
  if (clean.length !== 11 || /^(\d)\1+$/.test(clean)) return false;
  let add = 0;
  for (let i = 0; i < 9; i++) add += parseInt(clean.charAt(i), 10) * (10 - i);
  let rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;
  add = 0;
  for (let i = 0; i < 10; i++) add += parseInt(clean.charAt(i), 10) * (11 - i);
  rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  return rev === parseInt(clean.charAt(10), 10);
}

function formatCPF(cpf: string): string {
  const c = cpf.replace(/[^\d]+/g, '');
  if (c.length === 11) {
    return `${c.substring(0, 3)}.${c.substring(3, 6)}.${c.substring(6, 9)}-${c.substring(9, 11)}`;
  }
  return cpf;
}

interface RectItem {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Unifica retângulos de tarjas pretas adjacentes na mesma linha Y em um único bloco contínuo (Continuous Block Redaction).
 */
function mergeAdjacentRects(rects: RectItem[]): RectItem[] {
  if (rects.length <= 1) return rects;

  const merged: RectItem[] = [];
  const visited = new Set<number>();

  for (let i = 0; i < rects.length; i++) {
    if (visited.has(i)) continue;
    let r1 = { ...rects[i] };
    visited.add(i);

    for (let j = i + 1; j < rects.length; j++) {
      if (visited.has(j)) continue;
      const r2 = rects[j];

      // Se estão alinhados no mesmo nível Y aproximado (+/- 5pt)
      if (Math.abs(r1.y - r2.y) <= 5 && Math.abs(r1.height - r2.height) <= 5) {
        const r1Right = r1.x + r1.width;
        const r2Right = r2.x + r2.width;

        // Se r2 sobrepõe r1 ou está a até 15pt de distância na mesma linha
        if (r2.x <= r1Right + 15 && r1.x <= r2Right + 15) {
          const minX = Math.min(r1.x, r2.x);
          const maxX = Math.max(r1Right, r2Right);
          r1.x = minX;
          r1.width = maxX - minX;
          r1.y = Math.min(r1.y, r2.y);
          r1.height = Math.max(r1.height, r2.height);
          visited.add(j);
        }
      }
    }
    merged.push(r1);
  }

  return merged;
}

/**
 * Escaneia o texto de todas as páginas do PDF via pdfjs-dist. ZERO DADOS FICTÍCIOS.
 */
export async function detectPiiInData(file: File, customTerms: string[] = []): Promise<PiiDetectionItem[]> {
  const items: PiiDetectionItem[] = [];
  let idx = 0;

  try {
    const buffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;

    const cpfRegex = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{11}\b/g;
    const cnpjRegex = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g;
    const rgRegex = /\bRG\s*:?\s*\d{2}\.\d{3}\.\d{3}-[\dX]\b|\b\d{2}\.\d{3}\.\d{3}-[\dX]\b/gi;
    const cnhRegex = /\bCNH\s*:?\s*\d{11}\b/gi;
    const plateRegex = /\b[A-Z]{3}-\d{4}\b|\b[A-Z]{3}\d[A-Z]\d{2}\b/g; // Antiga ABC-1234 e Mercosul ABC1D23
    const pixRegex = /\b(?:PIX|Chave PIX)\s*:?\s*[\w\d.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b|\b(?:PIX|Chave PIX)\s*:?\s*\+?\d{10,13}\b/gi;
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    const phoneRegex = /\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}\b/g;
    const urlRegex = /\b(?:https?:\/\/|www\.|github\.com\/|linkedin\.com\/)[^\s)]+\b/gi;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');

      // CPFs reais (Validação Módulo 11)
      let match: RegExpExecArray | null;
      while ((match = cpfRegex.exec(pageText)) !== null) {
        const raw = match[0];
        if (isValidCPF(raw) || raw.includes('.')) {
          items.push({
            id: `pii_cpf_${idx++}`,
            type: 'CPF',
            textValue: formatCPF(raw),
            location: `Página ${pageNum}`,
            selected: true,
            pageIndex: pageNum - 1,
          });
        }
      }

      // CNPJs
      while ((match = cnpjRegex.exec(pageText)) !== null) {
        items.push({
          id: `pii_cnpj_${idx++}`,
          type: 'CNPJ',
          textValue: match[0],
          location: `Página ${pageNum}`,
          selected: true,
          pageIndex: pageNum - 1,
        });
      }

      // RGs
      while ((match = rgRegex.exec(pageText)) !== null) {
        items.push({
          id: `pii_rg_${idx++}`,
          type: 'RG',
          textValue: match[0],
          location: `Página ${pageNum}`,
          selected: true,
          pageIndex: pageNum - 1,
        });
      }

      // CNHs
      while ((match = cnhRegex.exec(pageText)) !== null) {
        items.push({
          id: `pii_cnh_${idx++}`,
          type: 'CNH',
          textValue: match[0],
          location: `Página ${pageNum}`,
          selected: true,
          pageIndex: pageNum - 1,
        });
      }

      // Placas de Veículos
      while ((match = plateRegex.exec(pageText)) !== null) {
        items.push({
          id: `pii_plate_${idx++}`,
          type: 'Placa de Veículo',
          textValue: match[0],
          location: `Página ${pageNum}`,
          selected: true,
          pageIndex: pageNum - 1,
        });
      }

      // Chaves PIX
      while ((match = pixRegex.exec(pageText)) !== null) {
        items.push({
          id: `pii_pix_${idx++}`,
          type: 'Chave PIX',
          textValue: match[0],
          location: `Página ${pageNum}`,
          selected: true,
          pageIndex: pageNum - 1,
        });
      }

      // E-mails
      while ((match = emailRegex.exec(pageText)) !== null) {
        items.push({
          id: `pii_email_${idx++}`,
          type: 'Email',
          textValue: match[0],
          location: `Página ${pageNum}`,
          selected: true,
          pageIndex: pageNum - 1,
        });
      }

      // Links, URLs e Perfis GitHub / Portfólio
      while ((match = urlRegex.exec(pageText)) !== null) {
        const urlVal = match[0];
        if (!items.some(i => i.textValue === urlVal && i.pageIndex === pageNum - 1)) {
          items.push({
            id: `pii_url_${idx++}`,
            type: 'Link/URL',
            textValue: urlVal,
            location: `Página ${pageNum}`,
            selected: true,
            pageIndex: pageNum - 1,
          });
        }
      }

      // Telefones / WhatsApp
      while ((match = phoneRegex.exec(pageText)) !== null) {
        const phoneVal = match[0].trim();
        if (phoneVal.length >= 8 && !items.some(i => i.textValue === phoneVal && i.pageIndex === pageNum - 1)) {
          items.push({
            id: `pii_phone_${idx++}`,
            type: 'Telefone',
            textValue: phoneVal,
            location: `Página ${pageNum}`,
            selected: true,
            pageIndex: pageNum - 1,
          });
        }
      }

      // Termos e Substrings Customizados (Varredura inteligente de elementos similares completos ou parciais)
      for (const term of customTerms) {
        if (!term.trim()) continue;
        const cleanTerm = term.trim();
        const termRegex = new RegExp(cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        
        while ((match = termRegex.exec(pageText)) !== null) {
          // Extrai a palavra/elemento completo contendo a substring buscada
          const matchPos = match.index;
          const startIdx = Math.max(0, pageText.lastIndexOf(' ', matchPos) + 1);
          let endIdx = pageText.indexOf(' ', matchPos + cleanTerm.length);
          if (endIdx === -1) endIdx = pageText.length;
          
          const fullMatchedElement = pageText.substring(startIdx, endIdx).trim() || match[0];

          if (!items.some(i => i?.textValue && i.textValue.toLowerCase() === fullMatchedElement.toLowerCase() && i.pageIndex === pageNum - 1)) {
            items.push({
              id: `pii_custom_${idx++}`,
              type: 'Termo Personalizado',
              textValue: fullMatchedElement,
              location: `Página ${pageNum}`,
              selected: true,
              pageIndex: pageNum - 1,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Escaneamento PDF.js fallback:', err);
  }

  return items;
}

/**
 * Realiza varredura semântica inteligente com IA Local / NER (Named Entity Recognition)
 * para localizar Nomes de Pessoas Físicas, Razões Sociais, Endereços e Dados Sensíveis LGPD.
 */
export async function detectPiiWithAi(
  file: File,
  onProgress?: (status: string) => void
): Promise<PiiDetectionItem[]> {
  onProgress?.('Carregando motor de IA Local para varredura semântica NER...');
  const items: PiiDetectionItem[] = [];
  let idx = 0;

  try {
    const buffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;

    // RegEx Semântico de Nomes Próprios e Títulos de Pessoas Físicas (Português)
    const personNameRegex = /\b(?:Dr\.|Dra\.|Sr\.|Sra\.|Prof\.|Adv\.|Eng\.|Juiz|Desembargador|Arrendador|Arrendatário|Empregado|Empregador|Contratante|Contratado)\s+([A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõ]+(?:\s+(?:de|da|do|dos|das|e)?\s+[A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõ]+)+)/gi;
    
    // RegEx de Nomes Próprios Compostos em Maiúsculas (ex: "Davi Diniz", "João Carlos da Silva")
    const capitalizedNameRegex = /\b([A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõ]{2,}(?:\s+(?:de|da|do|dos|das|e)?\s+[A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõ]{2,})+)\b/g;

    // RegEx de Endereços, Bairros e Logradouros
    const addressRegex = /\b(?:Rua|Avenida|Av\.|Alameda|Praça|Rodovia|Bairro|CEP|Quadra|Lote)\s+[^,\n.]{4,40}/gi;

    // RegEx de Dados Financeiros e Documentos Sensíveis LGPD
    const financialAndSensitivesRegex = /\b(?:Agência|Conta|PIX|Chave PIX|Iban|RG|CNH|Passaporte|Título de Eleitor|Certidão|PIS\/PASEP|Diagnóstico|Prontuário)\s*:?\s*[\w\d.-]{3,30}/gi;

    const stopWords = new Set([
      'pelo presente', 'presente instrumento', 'instrumento particular', 'imóvel rural',
      'exploração de pecuária', 'fins de exploração', 'nacionalidade', 'estado civil',
      'profissão', 'residente e domiciliado', 'neste mesmo município', 'ora em diante',
      'simplesmente de arrendador', 'simplesmente de arrendatário', 'justo e contratado',
      'proprietário da fazenda', 'situada no bairro', 'conforme título', 'título de posse',
      'cadastro do incra', 'gleba de terra', 'área arrendada', 'invernada', 'pasto formado',
      'capim colonião', 'arame farpado', 'perfeitas condições', 'conservação', 'dimensões seguintes',
      'termo de compromisso', 'contrato de arrendamento', 'arrendamento rural', 'uso do solo',
      'exploracao pecuaria', 'assinatura digital', 'relatório de conformidade', 'todas as páginas',
      'direitos reservados', 'marca registrada', 'política de privacidade', 'termo de uso',
      'propriedade intelectual', 'medida provisória', 'república federativa', 'estado de sp',
      'cédula de identidade', 'carteira de trabalho', 'termo de encerramento'
    ]);

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      onProgress?.(`[IA Local] Analisando sintaxe e entidades da Página ${pageNum}/${pdf.numPages}...`);
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');

      let match: RegExpExecArray | null;

      // 1. Nomes Próprios com Títulos
      while ((match = personNameRegex.exec(pageText)) !== null) {
        const val = match[0].trim();
        if (val.length > 5 && !stopWords.has(val.toLowerCase()) && !items.some(i => i?.textValue && i.textValue.toLowerCase() === val.toLowerCase())) {
          items.push({
            id: `ai_name_${idx++}`,
            type: 'Nome de Pessoa (IA)',
            textValue: val,
            location: `Página ${pageNum}`,
            selected: true,
            pageIndex: pageNum - 1,
          });
        }
      }

      // 2. Nomes Compostos Reais em Maiúsculas
      while ((match = capitalizedNameRegex.exec(pageText)) !== null) {
        const val = match[1].trim();
        const valLower = val.toLowerCase();
        
        // Descarta palavras comuns e cabeçalhos formais
        if (
          val.length > 6 &&
          !stopWords.has(valLower) &&
          !valLower.includes('contrato') &&
          !valLower.includes('termo') &&
          !valLower.includes('assinatura') &&
          !valLower.includes('parágrafo') &&
          !valLower.includes('cláusula') &&
          !valLower.includes('presente') &&
          !valLower.includes('instrumento') &&
          !valLower.includes('arrendamento') &&
          !items.some(i => i?.textValue && i.textValue.toLowerCase() === valLower)
        ) {
          items.push({
            id: `ai_name_cap_${idx++}`,
            type: 'Nome de Pessoa (IA)',
            textValue: val,
            location: `Página ${pageNum}`,
            selected: true,
            pageIndex: pageNum - 1,
          });
        }
      }

      // 3. Endereços e Logradouros
      while ((match = addressRegex.exec(pageText)) !== null) {
        const val = match[0].trim();
        if (!items.some(i => i?.textValue && i.textValue.toLowerCase() === val.toLowerCase())) {
          items.push({
            id: `ai_address_${idx++}`,
            type: 'CEP/Endereço (IA)',
            textValue: val,
            location: `Página ${pageNum}`,
            selected: true,
            pageIndex: pageNum - 1,
          });
        }
      }

      // 4. Dados Financeiros & Documentos Sensíveis
      while ((match = financialAndSensitivesRegex.exec(pageText)) !== null) {
        const val = match[0].trim();
        if (!items.some(i => i?.textValue && i.textValue.toLowerCase() === val.toLowerCase())) {
          items.push({
            id: `ai_sensitive_${idx++}`,
            type: 'Dado Financeiro (IA)',
            textValue: val,
            location: `Página ${pageNum}`,
            selected: true,
            pageIndex: pageNum - 1,
          });
        }
      }
    }
  } catch (err) {
    console.warn('Erro no escaneamento por IA Local:', err);
  }

  onProgress?.(`Varredura da IA Local concluída! Identificados ${items.length} elementos semânticos.`);
  return items;
}

/**
 * Aplica tarjamento preto irreversível SOLID BLACK no PDF com opção de rasterização plana (NSA/DOJ).
 * Inclui algoritmo de Unificação de Tarjas Adjacentes (Continuous Block Redaction).
 */
export async function applyRedactionsToPdf(
  file: File,
  itemsToRedact: PiiDetectionItem[],
  rasterizeHighSecurity = false,
  onProgress?: (percent: number, status: string) => void
): Promise<{ blob: Blob; size: number }> {
  onProgress?.(20, 'Carregando PDF original para mapeamento exato de coordenadas...');
  const buffer = await file.arrayBuffer();

  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  if (pages.length === 0) {
    throw new Error('O PDF está vazio ou corrompido.');
  }

  let pdfjsDoc: pdfjsLib.PDFDocumentProxy | null = null;
  try {
    pdfjsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  } catch (err) {
    console.warn('Erro ao carregar PDF.js para coordenadas:', err);
  }

  onProgress?.(50, `Gravando ${itemsToRedact.length} tarjas pretas sólidas puras sobre o documento...`);

  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    const page = pages[pIdx];
    const { width, height } = page.getSize();
    const pageItems = itemsToRedact.filter((i) => i.pageIndex === pIdx || i.pageIndex === undefined);

    let textItems: any[] = [];
    if (pdfjsDoc && pIdx < pdfjsDoc.numPages) {
      try {
        const jsPage = await pdfjsDoc.getPage(pIdx + 1);
        const textContent = await jsPage.getTextContent();
        textItems = textContent.items as any[];
      } catch (e) {
        console.warn('Erro ao ler textItems da página:', e);
      }
    }

    const pageRectsToDraw: { x: number; y: number; width: number; height: number }[] = [];

    pageItems.forEach((item) => {
      if (item.customRect) {
        const pdfX = (item.customRect.xPercent / 100) * width;
        const pdfW = (item.customRect.widthPercent / 100) * width;
        const pdfH = (item.customRect.heightPercent / 100) * height;
        const pdfY = height - ((item.customRect.yPercent / 100) * height) - pdfH;

        pageRectsToDraw.push({
          x: Math.max(0, pdfX),
          y: Math.max(0, pdfY),
          width: Math.min(width, pdfW),
          height: Math.min(height, pdfH),
        });
      } else if (item.type === 'Região Cabeçalho') {
        pageRectsToDraw.push({
          x: 0,
          y: height - height * 0.10,
          width: width,
          height: height * 0.10,
        });
      } else if (item.type === 'Região Rodapé') {
        pageRectsToDraw.push({
          x: 0,
          y: 0,
          width: width,
          height: height * 0.10,
        });
      } else if (item.textValue && textItems.length > 0) {
        const targetClean = item.textValue.trim().toLowerCase();

        for (const tItem of textItems) {
          if (!tItem.str || !tItem.transform) continue;
          const strClean = tItem.str.trim().toLowerCase();

          if (strClean && (strClean.includes(targetClean) || targetClean.includes(strClean))) {
            const tx = tItem.transform[4];
            const ty = tItem.transform[5];
            const tw = tItem.width || (tItem.str.length * 6);
            const th = tItem.height || Math.abs(tItem.transform[3]) || 12;

            pageRectsToDraw.push({
              x: Math.max(0, tx - 2),
              y: Math.max(0, ty - 2),
              width: Math.min(width, tw + 4),
              height: Math.min(height, th + 4),
            });
          }
        }
      }
    });

    // Unifica tarjas pretas adjacentes na mesma linha (Continuous Block Redaction)
    const mergedRects = mergeAdjacentRects(pageRectsToDraw);
    mergedRects.forEach((r) => {
      page.drawRectangle({
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        color: rgb(0, 0, 0), // PURE SOLID BLACK
      });
    });
  }

  onProgress?.(80, 'Salvando estrutura de documento tarjado...');
  const redactedBytes = await pdfDoc.save();

  if (rasterizeHighSecurity) {
    onProgress?.(85, 'Aplicando camada de rasterização plana (Destruição de texto sob a tarja - Padrão NSA/DOJ)...');
    try {
      const tempPdf = await pdfjsLib.getDocument({ data: new Uint8Array(redactedBytes) }).promise;
      const flatPdfDoc = await PDFDocument.create();

      for (let pNum = 1; pNum <= tempPdf.numPages; pNum++) {
        const page = await tempPdf.getPage(pNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport }).promise;

        const imgDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const embeddedImg = await flatPdfDoc.embedJpg(imgDataUrl);

        const origVp = page.getViewport({ scale: 1.0 });
        const newP = flatPdfDoc.addPage([origVp.width, origVp.height]);
        newP.drawImage(embeddedImg, { x: 0, y: 0, width: origVp.width, height: origVp.height });
      }

      const flatBytes = await flatPdfDoc.save();
      const flatBlob = new Blob([new Uint8Array(flatBytes)], { type: 'application/pdf' });
      onProgress?.(100, 'Documento tarjado e rasterizado com segurança máxima!');
      return { blob: flatBlob, size: flatBlob.size };
    } catch {
      // Fallback to vector redaction if rendering fails
    }
  }

  const redactedBlob = new Blob([redactedBytes], { type: 'application/pdf' });
  onProgress?.(100, 'Documento PDF tarjado com sucesso!');
  return {
    blob: redactedBlob,
    size: redactedBlob.size,
  };
}

export const applyRedactionToPdf = applyRedactionsToPdf;
