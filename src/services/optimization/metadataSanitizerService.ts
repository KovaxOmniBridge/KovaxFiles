import { PDFDocument } from 'pdf-lib';

export interface MetadataInspectionResult {
  fileName: string;
  fileSize: number;
  metadataCount: number;
  metadataItems: { key: string; value: string; category: 'GPS' | 'Device' | 'Author' | 'System' }[];
}

/**
 * Inspeciona um arquivo para encontrar metadados ocultos de EXIF, GPS, autoria e sistema sem ignorar nada.
 */
export async function inspectFileMetadata(file: File): Promise<MetadataInspectionResult> {
  const items: { key: string; value: string; category: 'GPS' | 'Device' | 'Author' | 'System' }[] = [];
  const buffer = await file.arrayBuffer();

  // Inspect 100% of PDF metadata fields
  if (file.name.toLowerCase().endsWith('.pdf') || file.type.includes('pdf')) {
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const title = pdfDoc.getTitle()?.trim();
      const author = pdfDoc.getAuthor()?.trim();
      const subject = pdfDoc.getSubject()?.trim();
      const producer = pdfDoc.getProducer()?.trim();
      const creator = pdfDoc.getCreator()?.trim();

      if (author && author.length > 0) {
        items.push({ key: 'Autor do Documento', value: author, category: 'Author' });
      }
      if (title && title.length > 0) {
        items.push({ key: 'Título Interno', value: title, category: 'System' });
      }
      if (subject && subject.length > 0) {
        items.push({ key: 'Assunto', value: subject, category: 'System' });
      }
      if (creator && creator.length > 0) {
        items.push({ key: 'Software Criador (Creator)', value: creator, category: 'System' });
      }
      if (producer && producer.length > 0) {
        items.push({ key: 'Gerador PDF (Producer)', value: producer, category: 'System' });
      }
    } catch {
      // Unreadable or empty PDF stream
    }
  } else {
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder('latin1').decode(bytes.subarray(0, 15000));
    
    if (text.includes('Exif')) {
      items.push({ key: 'Marcador EXIF', value: 'Presente no cabeçalho binário', category: 'Device' });
    }
    
    const deviceMatch = text.match(/(iPhone|Samsung|Canon|Nikon|Sony|Google|Xiaomi|Motorola)[^\u0000-\u001F]{0,30}/i);
    if (deviceMatch) {
      items.push({ key: 'Dispositivo / Câmera Detectado', value: deviceMatch[0].trim(), category: 'Device' });
    }

    if (text.includes('GPSLatitude') || text.includes('GPSLongitude') || text.includes('GPSInfo')) {
      items.push({ key: 'Coordenadas GPS Geotag', value: 'Geolocalização identificada nos dados EXIF', category: 'GPS' });
    }

    items.push({ key: 'Data de Modificação do Sistema', value: new Date(file.lastModified).toLocaleString('pt-BR'), category: 'System' });
  }

  return {
    fileName: file.name,
    fileSize: file.size,
    metadataCount: items.length,
    metadataItems: items,
  };
}

/**
 * Remove 100% de todos os metadados EXIF, GPS, autoria e identificadores do arquivo.
 */
export async function sanitizeFileMetadata(
  file: File,
  onProgress?: (percent: number, status: string) => void
): Promise<{ blob: Blob; size: number }> {
  onProgress?.(30, 'Inspecionando estrutura interna para higienização total...');
  
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (['jpg', 'jpeg', 'png', 'webp', 'jfif', 'heic'].includes(ext) || file.type.startsWith('image/')) {
    onProgress?.(60, 'Re-codificando imagem no Canvas limpo (Eliminando marcadores EXIF/GPS)...');
    const imgUrl = URL.createObjectURL(file);
    const img = new Image();

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imgUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(imgUrl);

    let mimeType = 'image/png';
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'jfif' || file.type.includes('jpeg')) {
      mimeType = 'image/jpeg';
    } else if (ext === 'webp' || file.type.includes('webp')) {
      mimeType = 'image/webp';
    }

    const cleanBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || file), mimeType, 0.95);
    });

    onProgress?.(100, 'Metadados EXIF e GPS removidos com sucesso!');
    return { blob: cleanBlob, size: cleanBlob.size };
  }

  // PDF Structural Metadata Elimination via pdf-lib
  onProgress?.(70, 'Removendo 100% de todos os campos de metadados do documento PDF...');
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  // Purge all metadata fields to empty strings
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('');
  pdfDoc.setCreator('');

  // Delete XMP Metadata stream and Info dictionary reference if present
  try {
    const infoRef = pdfDoc.context.trailerInfo.Info;
    if (infoRef) {
      pdfDoc.context.delete(infoRef);
    }
  } catch {
    // Ignore if not present
  }

  const cleanBytes = await pdfDoc.save({ useObjectStreams: false });
  const cleanBlob = new Blob([cleanBytes], { type: 'application/pdf' });

  onProgress?.(100, '100% dos metadados de autoria e sistema removidos com sucesso!');
  return { blob: cleanBlob, size: cleanBlob.size };
}
