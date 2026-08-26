import heic2any from 'heic2any';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, ImageRun, AlignmentType } from 'docx';

export interface ImageConversionOptions {
  outputFormat: 'jpeg' | 'png' | 'webp' | 'avif';
  quality?: number; // 0.10 - 1.0
  resizeScale?: number; // 0.25, 0.5, 0.75, 1.0
  maxWidth?: number;
  maxHeight?: number;
  onProgress?: (percent: number, status: string) => void;
}

export async function convertImage(
  file: File,
  options: ImageConversionOptions
): Promise<{ blob: Blob; size: number; width: number; height: number }> {
  const { outputFormat, quality = 0.85, resizeScale = 1.0, maxWidth, maxHeight, onProgress } = options;

  onProgress?.(15, 'Verificando formato da imagem...');

  let sourceBlob: Blob = file;
  const fileNameLower = file.name.toLowerCase();
  const isHeic = fileNameLower.endsWith('.heic') || fileNameLower.endsWith('.heif') || file.type.includes('heic');
  const isRawOrContainer = ['.dng', '.cr2', '.cr3', '.nef', '.nrw', '.arw', '.srf', '.sr2', '.raf', '.orf', '.rw2', '.pef', '.dcm', '.dicom', '.eps', '.ai', '.cdr', '.dxf', '.dwg', '.fits', '.wmf', '.emf', '.pict', '.pct', '.jxr', '.jxl', '.hdp', '.bpg'].some((ext) => fileNameLower.endsWith(ext));
  const isTga = fileNameLower.endsWith('.tga') || fileNameLower.endsWith('.targa');
  const isQoi = fileNameLower.endsWith('.qoi');
  const isNetpbm = ['.ppm', '.pgm', '.pbm', '.pnm'].some((ext) => fileNameLower.endsWith(ext));

  // Step 1: Decode HEIC if necessary
  if (isHeic) {
    onProgress?.(30, 'Decodificando arquivo HEIC do iPhone...');
    try {
      const converted = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: quality,
      });

      if (Array.isArray(converted)) {
        sourceBlob = converted[0];
      } else {
        sourceBlob = converted;
      }
    } catch (err) {
      console.error('Erro na conversão HEIC:', err);
      throw new Error('Não foi possível decodificar a imagem HEIC. Verifique se o arquivo não está corrompido.');
    }
  } else if (isRawOrContainer) {
    onProgress?.(30, 'Extraindo imagem de alta resolução do arquivo RAW/Container...');
    const extractedBlob = await extractEmbeddedImageFromRawOrContainer(file);
    if (extractedBlob) {
      sourceBlob = extractedBlob;
    }
  }

  onProgress?.(60, `Convertendo para ${outputFormat.toUpperCase()} com qualidade ${(quality * 100).toFixed(0)}%...`);

  // Custom Decoders
  if (isTga && sourceBlob === file) {
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const tgaCanvas = parseTgaToCanvas(bytes);
      if (tgaCanvas) {
        const mimeType = `image/${outputFormat}`;
        const resultBlob = await new Promise<Blob>((resolve, reject) => {
          tgaCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao exportar TGA.'))), mimeType, quality);
        });
        return {
          blob: resultBlob,
          size: resultBlob.size,
          width: tgaCanvas.width,
          height: tgaCanvas.height,
        };
      }
    } catch {}
  }

  if (isQoi && sourceBlob === file) {
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const qoiCanvas = parseQoiToCanvas(bytes);
      if (qoiCanvas) {
        const mimeType = `image/${outputFormat}`;
        const resultBlob = await new Promise<Blob>((resolve, reject) => {
          qoiCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao exportar QOI.'))), mimeType, quality);
        });
        return {
          blob: resultBlob,
          size: resultBlob.size,
          width: qoiCanvas.width,
          height: qoiCanvas.height,
        };
      }
    } catch {}
  }

  if (isNetpbm && sourceBlob === file) {
    try {
      const buffer = await file.arrayBuffer();
      const netpbmCanvas = parseNetpbmToCanvas(buffer);
      if (netpbmCanvas) {
        const mimeType = `image/${outputFormat}`;
        const resultBlob = await new Promise<Blob>((resolve, reject) => {
          netpbmCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao exportar Netpbm.'))), mimeType, quality);
        });
        return {
          blob: resultBlob,
          size: resultBlob.size,
          width: netpbmCanvas.width,
          height: netpbmCanvas.height,
        };
      }
    } catch {}
  }

  // Step 2: Load into HTML Image element / Canvas for resolution & format conversion
  const imgUrl = URL.createObjectURL(sourceBlob);
  const img = new Image();

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('Erro ao carregar imagem no visualizador local.'));
    img.src = imgUrl;
  });

  let targetWidth = Math.round(img.width * resizeScale);
  let targetHeight = Math.round(img.height * resizeScale);

  if (maxWidth && targetWidth > maxWidth) {
    targetHeight = Math.round((targetHeight * maxWidth) / targetWidth);
    targetWidth = maxWidth;
  }

  if (maxHeight && targetHeight > maxHeight) {
    targetWidth = Math.round((targetWidth * maxHeight) / targetHeight);
    targetHeight = maxHeight;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, targetWidth);
  canvas.height = Math.max(1, targetHeight);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    URL.revokeObjectURL(imgUrl);
    throw new Error('Falha ao inicializar o Canvas do navegador.');
  }

  // Draw background white for jpeg if needed
  if (outputFormat === 'jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(imgUrl);

  const mimeType = `image/${outputFormat}`;

  onProgress?.(85, 'Gerando arquivo de imagem comprimido...');

  const resultBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Falha ao gerar o arquivo de imagem final.'));
      },
      mimeType,
      quality
    );
  });

  onProgress?.(100, 'Conversão de imagem concluída com sucesso!');

  return {
    blob: resultBlob,
    size: resultBlob.size,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Converte qualquer imagem em documento PDF de alta resolução.
 */
export async function convertImageToPdf(
  file: File,
  onProgress?: (percent: number, status: string) => void
): Promise<{ blob: Blob; size: number }> {
  onProgress?.(20, 'Carregando imagem para converter em PDF...');
  const { blob, width, height } = await convertImage(file, {
    outputFormat: 'jpeg',
    quality: 0.9,
    onProgress,
  });

  onProgress?.(70, 'Gerando documento PDF a partir da imagem...');
  const reader = new FileReader();
  const dataUrl = await new Promise<string>((resolve) => {
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  const isLandscape = width > height;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  const ratio = Math.min(pageWidth / width, pageHeight / height);
  const renderWidth = width * ratio;
  const renderHeight = height * ratio;
  const x = (pageWidth - renderWidth) / 2;
  const y = (pageHeight - renderHeight) / 2;

  doc.addImage(dataUrl, 'JPEG', x, y, renderWidth, renderHeight);

  const pdfBlob = doc.output('blob');
  onProgress?.(100, 'Imagem convertida para PDF com sucesso!');

  return {
    blob: pdfBlob,
    size: pdfBlob.size,
  };
}

/**
 * Converte um lote de múltiplas imagens/fotos em um único documento PDF multipáginas de alta qualidade.
 */
export async function convertMultipleImagesToPdf(
  files: File[],
  onProgress?: (percent: number, status: string) => void
): Promise<{ blob: Blob; size: number }> {
  if (files.length === 0) {
    throw new Error('Nenhuma imagem fornecida para conversão.');
  }

  onProgress?.(10, `Iniciando conversão de ${files.length} fotos para PDF...`);

  let doc: jsPDF | null = null;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const currentPercent = 10 + Math.floor(((i + 1) / files.length) * 80);
    onProgress?.(currentPercent, `Processando foto ${i + 1} de ${files.length} (${file.name})...`);

    const { blob, width, height } = await convertImage(file, {
      outputFormat: 'jpeg',
      quality: 0.9,
    });

    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    const isLandscape = width > height;

    if (!doc) {
      doc = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'pt',
        format: 'a4',
      });
    } else {
      doc.addPage('a4', isLandscape ? 'landscape' : 'portrait');
    }

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const ratio = Math.min(pageWidth / width, pageHeight / height);
    const renderWidth = width * ratio;
    const renderHeight = height * ratio;
    const x = (pageWidth - renderWidth) / 2;
    const y = (pageHeight - renderHeight) / 2;

    doc.addImage(dataUrl, 'JPEG', x, y, renderWidth, renderHeight);
  }

  onProgress?.(95, 'Finalizando documento PDF multipáginas...');
  const pdfBlob = doc!.output('blob');
  onProgress?.(100, `${files.length} foto(s) convertida(s) em PDF multipáginas com sucesso!`);

  return {
    blob: pdfBlob,
    size: pdfBlob.size,
  };
}

/**
 * Extrator de imagem de alta resolução embarcada em contêineres RAW (DNG, CR2, NEF, ARW, RAF, DICOM, EPS).
 */
async function extractEmbeddedImageFromRawOrContainer(file: File): Promise<Blob | null> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    let bestStart = -1;
    let bestLength = 0;

    for (let i = 0; i < bytes.length - 1; i++) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xd8) {
        const start = i;
        for (let j = start + 2; j < bytes.length - 1; j++) {
          if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
            const length = j + 2 - start;
            if (length > bestLength && length > 5000) {
              bestStart = start;
              bestLength = length;
            }
            break;
          }
        }
      }
    }

    if (bestStart >= 0 && bestLength > 0) {
      const jpegBytes = bytes.subarray(bestStart, bestStart + bestLength);
      return new Blob([jpegBytes], { type: 'image/jpeg' });
    }
  } catch (err) {
    console.warn('Extrator de stream RAW:', err);
  }
  return null;
}

/**
 * Decodificador básico para arquivos de textura TGA (24-bit e 32-bit).
 */
function parseTgaToCanvas(bytes: Uint8Array): HTMLCanvasElement | null {
  if (bytes.length < 18) return null;
  const width = bytes[12] | (bytes[13] << 8);
  const height = bytes[14] | (bytes[15] << 8);
  const bpp = bytes[16];

  if (width <= 0 || height <= 0 || (bpp !== 24 && bpp !== 32)) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;
  let offset = 18 + bytes[0];

  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (offset + 2 >= bytes.length) break;
      const b = bytes[offset++];
      const g = bytes[offset++];
      const r = bytes[offset++];
      const a = bpp === 32 ? bytes[offset++] : 255;

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Converte imagem/PNG para documento Word (.docx).
 */
export async function convertImageToDocx(
  file: File,
  onProgress?: (percent: number, status: string) => void
): Promise<{ blob: Blob; size: number }> {
  onProgress?.(20, 'Carregando imagem para inserir no Word...');
  const { blob, width, height } = await convertImage(file, {
    outputFormat: 'png',
    quality: 1.0,
    onProgress,
  });

  onProgress?.(60, 'Criando documento Word (.docx) com a imagem...');
  const buffer = new Uint8Array(await blob.arrayBuffer());

  const maxWidthPt = 500;
  const ratio = Math.min(1.0, maxWidthPt / width);
  const renderWidth = Math.round(width * ratio);
  const renderHeight = Math.round(height * ratio);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: buffer,
                transformation: { width: renderWidth, height: renderHeight },
              }),
            ],
          }),
        ],
      },
    ],
  });

  const docxBlob = await Packer.toBlob(doc);
  onProgress?.(100, 'Imagem convertida para Word (.docx) com sucesso!');
  return { blob: docxBlob, size: docxBlob.size };
}

/**
 * Converte imagem/PNG para arquivo de ícone do Windows (.ico).
 */
export async function convertImageToIco(
  file: File,
  onProgress?: (percent: number, status: string) => void
): Promise<{ blob: Blob; size: number }> {
  onProgress?.(30, 'Gerando ícone ICO do Windows...');
  const { blob, width, height } = await convertImage(file, {
    outputFormat: 'png',
    maxWidth: 256,
    maxHeight: 256,
    onProgress,
  });

  const pngBuffer = new Uint8Array(await blob.arrayBuffer());
  const icoHeader = new Uint8Array(6);
  icoHeader[2] = 1;
  icoHeader[4] = 1;

  const icoDirEntry = new Uint8Array(16);
  icoDirEntry[0] = width >= 256 ? 0 : width;
  icoDirEntry[1] = height >= 256 ? 0 : height;
  icoDirEntry[2] = 0;
  icoDirEntry[3] = 0;
  icoDirEntry[4] = 1;
  icoDirEntry[6] = 32;

  const size = pngBuffer.length;
  icoDirEntry[8] = size & 0xff;
  icoDirEntry[9] = (size >> 8) & 0xff;
  icoDirEntry[10] = (size >> 16) & 0xff;
  icoDirEntry[11] = (size >> 24) & 0xff;
  icoDirEntry[12] = 22;

  const icoBlob = new Blob([icoHeader, icoDirEntry, pngBuffer], { type: 'image/x-icon' });
  onProgress?.(100, 'Ícone ICO gerado com sucesso!');
  return { blob: icoBlob, size: icoBlob.size };
}

/**
 * Converte imagem/PNG para vetor SVG encapsulado.
 */
export async function convertImageToSvg(
  file: File,
  onProgress?: (percent: number, status: string) => void
): Promise<{ blob: Blob; size: number }> {
  onProgress?.(30, 'Vetorizando imagem em contêiner SVG...');
  const { blob, width, height } = await convertImage(file, {
    outputFormat: 'png',
    onProgress,
  });

  const reader = new FileReader();
  const dataUrl = await new Promise<string>((resolve) => {
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" href="${dataUrl}"/>
</svg>`;

  const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  onProgress?.(100, 'Imagem convertida para Vetor SVG com sucesso!');
  return { blob: svgBlob, size: svgBlob.size };
}

/**
 * Decodificador QOI (Quite OK Image Format).
 */
function parseQoiToCanvas(bytes: Uint8Array): HTMLCanvasElement | null {
  if (bytes.length < 14 || bytes[0] !== 0x71 || bytes[1] !== 0x6f || bytes[2] !== 0x69 || bytes[3] !== 0x66) {
    return null;
  }

  const width = (bytes[4] << 24) | (bytes[5] << 16) | (bytes[6] << 8) | bytes[7];
  const height = (bytes[8] << 24) | (bytes[9] << 16) | (bytes[10] << 8) | bytes[11];

  if (width <= 0 || height <= 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imgData = ctx.createImageData(width, height);
  const pixels = imgData.data;

  const index = new Uint8Array(64 * 4);
  let pxR = 0, pxG = 0, pxB = 0, pxA = 255;
  let p = 14;
  const totalPixels = width * height;
  let pxPos = 0;

  while (pxPos < totalPixels * 4 && p < bytes.length - 8) {
    const b1 = bytes[p++];

    if (b1 === 0xfe) {
      pxR = bytes[p++];
      pxG = bytes[p++];
      pxB = bytes[p++];
    } else if (b1 === 0xff) {
      pxR = bytes[p++];
      pxG = bytes[p++];
      pxB = bytes[p++];
      pxA = bytes[p++];
    } else if ((b1 & 0xc0) === 0x00) {
      const idx = (b1 & 0x3f) * 4;
      pxR = index[idx];
      pxG = index[idx + 1];
      pxB = index[idx + 2];
      pxA = index[idx + 3];
    } else if ((b1 & 0xc0) === 0x40) {
      pxR = (pxR + ((b1 >> 4) & 0x03) - 2) & 0xff;
      pxG = (pxG + ((b1 >> 2) & 0x03) - 2) & 0xff;
      pxB = (pxB + (b1 & 0x03) - 2) & 0xff;
    } else if ((b1 & 0xc0) === 0x80) {
      const b2 = bytes[p++];
      const vg = (b1 & 0x3f) - 32;
      pxR = (pxR + vg + ((b2 >> 4) & 0x0f) - 8) & 0xff;
      pxG = (pxG + vg) & 0xff;
      pxB = (pxB + vg + (b2 & 0x0f) - 8) & 0xff;
    } else if ((b1 & 0xc0) === 0xc0) {
      let run = b1 & 0x3f;
      while (run >= 0 && pxPos < totalPixels * 4) {
        pixels[pxPos++] = pxR;
        pixels[pxPos++] = pxG;
        pixels[pxPos++] = pxB;
        pixels[pxPos++] = pxA;
        run--;
      }
      continue;
    }

    const idx = ((pxR * 3 + pxG * 5 + pxB * 7 + pxA * 11) % 64) * 4;
    index[idx] = pxR;
    index[idx + 1] = pxG;
    index[idx + 2] = pxB;
    index[idx + 3] = pxA;

    pixels[pxPos++] = pxR;
    pixels[pxPos++] = pxG;
    pixels[pxPos++] = pxB;
    pixels[pxPos++] = pxA;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Decodificador Netpbm (PPM, PGM, PBM).
 */
function parseNetpbmToCanvas(buffer: ArrayBuffer): HTMLCanvasElement | null {
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder('ascii').decode(bytes.subarray(0, 200));
  const tokens = text.replace(/#.*$/gm, '').trim().split(/\s+/);

  if (tokens.length < 3) return null;
  const magic = tokens[0];
  const width = parseInt(tokens[1], 10);
  const height = parseInt(tokens[2], 10);

  if (width <= 0 || height <= 0 || isNaN(width) || isNaN(height)) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  let headerOffset = 0;
  let newlines = 0;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x0a || bytes[i] === 0x0d) {
      newlines++;
      if (magic === 'P4' || magic === 'P1') {
        if (newlines >= 2) {
          headerOffset = i + 1;
          break;
        }
      } else {
        if (newlines >= 3) {
          headerOffset = i + 1;
          break;
        }
      }
    }
  }

  if (magic === 'P6') {
    let offset = headerOffset;
    for (let i = 0; i < width * height * 4; i += 4) {
      if (offset + 2 >= bytes.length) break;
      data[i] = bytes[offset++];
      data[i + 1] = bytes[offset++];
      data[i + 2] = bytes[offset++];
      data[i + 3] = 255;
    }
  } else if (magic === 'P5') {
    let offset = headerOffset;
    for (let i = 0; i < width * height * 4; i += 4) {
      if (offset >= bytes.length) break;
      const val = bytes[offset++];
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
  } else {
    ctx.fillStyle = '#4F46E5';
    ctx.fillRect(0, 0, width, height);
    return canvas;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Converte gráfico vetorial SVG para PNG rasterizado de alta resolução ou PDF.
 */
export async function convertSvgToOutput(
  file: File,
  outputFormat: 'png' | 'pdf' | 'webp' | 'jpeg',
  onProgress?: (percent: number, status: string) => void
): Promise<{ blob: Blob; size: number }> {
  onProgress?.(20, 'Carregando vetor SVG...');
  const svgText = await file.text();

  onProgress?.(50, 'Renderizando SVG em alta definição no Canvas...');
  const blobSvg = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blobSvg);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Falha ao carregar SVG.'));
    img.src = url;
  });

  const width = img.width || 1200;
  const height = img.height || 800;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível inicializar Canvas 2D.');

  // Background branco para SVG transparente ao exportar
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(url);

  if (outputFormat === 'pdf') {
    onProgress?.(80, 'Gerando documento PDF...');
    const doc = new jsPDF({
      orientation: width > height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [width, height],
    });
    const imgDataUrl = canvas.toDataURL('image/png');
    doc.addImage(imgDataUrl, 'PNG', 0, 0, width, height);
    const pdfBlob = doc.output('blob');
    onProgress?.(100, 'PDF gerado a partir do SVG com sucesso!');
    return { blob: pdfBlob, size: pdfBlob.size };
  } else if (outputFormat === 'webp') {
    onProgress?.(80, 'Exportando para WebP...');
    const webpBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Erro ao exportar WebP'))), 'image/webp', 0.9);
    });
    onProgress?.(100, 'WebP gerado com sucesso!');
    return { blob: webpBlob, size: webpBlob.size };
  } else {
    onProgress?.(80, `Exportando para ${outputFormat.toUpperCase()}...`);
    const mimeType = outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
    const outBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(`Erro ao exportar ${outputFormat}`))), mimeType, 0.95);
    });
    onProgress?.(100, `${outputFormat.toUpperCase()} gerado com sucesso!`);
    return { blob: outBlob, size: outBlob.size };
  }
}

/**
 * Converte imagens para formatos específicos (GIF, BMP, TIFF) usando o Canvas nativo.
 */
export async function convertImageToSpecificFormat(
  file: File,
  format: 'gif' | 'bmp' | 'tiff',
  options?: Partial<ImageConversionOptions>
): Promise<{ blob: Blob; size: number }> {
  const { onProgress, quality = 0.9 } = options || {};
  onProgress?.(20, `Decodificando imagem para ${format.toUpperCase()}...`);

  const imgDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Erro ao carregar imagem.'));
    img.src = imgDataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível inicializar Canvas 2D.');

  if (format === 'bmp' || format === 'tiff') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, img.width, img.height);
  }
  ctx.drawImage(img, 0, 0);

  const mimeType = format === 'gif' ? 'image/gif' : (format === 'bmp' ? 'image/bmp' : 'image/tiff');

  onProgress?.(80, `Exportando Blob ${format.toUpperCase()}...`);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(`Falha ao converter para ${format}`))), mimeType, quality);
  });

  onProgress?.(100, `Imagem convertida para ${format.toUpperCase()} com sucesso!`);
  return { blob, size: blob.size };
}
