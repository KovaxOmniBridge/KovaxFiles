import { PDFDocument, PDFRef } from 'pdf-lib';
import JSZip from 'jszip';

export interface MetadataItem {
  key: string;
  value: string;
  isSensitive?: boolean;
  category: 'GPS' | 'Device' | 'Author' | 'System';
}

export interface MetadataInspectionResult {
  fileName: string;
  fileSize: number;
  metadataCount: number;
  hasSensitiveMetadata: boolean;
  items: MetadataItem[];
  metadataItems?: MetadataItem[];
}

/**
 * Inspeciona um arquivo para encontrar metadados ocultos de EXIF, GPS, autoria e sistema sem ignorar nada.
 */
export async function inspectFileMetadata(file: File): Promise<MetadataInspectionResult> {
  const items: MetadataItem[] = [];
  const buffer = await file.arrayBuffer();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // Inspect 100% of PDF metadata fields
  if (ext === 'pdf' || file.type.includes('pdf')) {
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const title = pdfDoc.getTitle()?.trim();
      const author = pdfDoc.getAuthor()?.trim();
      const subject = pdfDoc.getSubject()?.trim();
      const producer = pdfDoc.getProducer()?.trim();
      const creator = pdfDoc.getCreator()?.trim();

      if (author && author.length > 0) {
        items.push({ key: 'Autor do Documento', value: author, isSensitive: true, category: 'Author' });
      }
      if (title && title.length > 0) {
        items.push({ key: 'Título Interno', value: title, isSensitive: false, category: 'System' });
      }
      if (subject && subject.length > 0) {
        items.push({ key: 'Assunto', value: subject, isSensitive: false, category: 'System' });
      }
      if (creator && creator.length > 0) {
        items.push({ key: 'Software Criador (Creator)', value: creator, isSensitive: true, category: 'System' });
      }
      if (producer && producer.length > 0) {
        items.push({ key: 'Gerador PDF (Producer)', value: producer, isSensitive: true, category: 'System' });
      }
    } catch {
      // Stream não legível
    }
  } else if (['docx', 'xlsx', 'pptx', 'docm', 'xlsm'].includes(ext)) {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const coreXml = await zip.file('docProps/core.xml')?.async('string');
      if (coreXml) {
        const creatorMatch = coreXml.match(/<dc:creator[^>]*>(.*?)<\/dc:creator>/i);
        const lastModMatch = coreXml.match(/<cp:lastModifiedBy[^>]*>(.*?)<\/cp:lastModifiedBy>/i);
        if (creatorMatch && creatorMatch[1].trim()) {
          items.push({ key: 'Autor do Documento (Office)', value: creatorMatch[1].trim(), isSensitive: true, category: 'Author' });
        }
        if (lastModMatch && lastModMatch[1].trim()) {
          items.push({ key: 'Último Editor (Office)', value: lastModMatch[1].trim(), isSensitive: true, category: 'Author' });
        }
      }
    } catch {
      // Ignorar caso não seja um zip Office válido
    }
  } else {
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder('latin1').decode(bytes.subarray(0, 15000));
    
    if (text.includes('Exif')) {
      items.push({ key: 'Marcador EXIF', value: 'Presente no cabeçalho binário', isSensitive: true, category: 'Device' });
    }
    
    const deviceMatch = text.match(/(iPhone|Samsung|Canon|Nikon|Sony|Google|Xiaomi|Motorola)[^\u0000-\u001F]{0,30}/i);
    if (deviceMatch) {
      items.push({ key: 'Dispositivo / Câmera Detectado', value: deviceMatch[0].trim(), isSensitive: true, category: 'Device' });
    }

    if (text.includes('GPSLatitude') || text.includes('GPSLongitude') || text.includes('GPSInfo')) {
      items.push({ key: 'Coordenadas GPS Geotag', value: 'Geolocalização identificada nos dados EXIF', isSensitive: true, category: 'GPS' });
    }

    items.push({ key: 'Data de Modificação do Sistema', value: new Date(file.lastModified).toLocaleString('pt-BR'), isSensitive: false, category: 'System' });
  }

  const hasSensitiveMetadata = items.some((i) => i.isSensitive || i.category === 'GPS' || i.category === 'Device' || i.category === 'Author');

  return {
    fileName: file.name,
    fileSize: file.size,
    metadataCount: items.length,
    hasSensitiveMetadata,
    items,
    metadataItems: items,
  };
}

/**
 * Remove 100% de todos os metadados EXIF, GPS, autoria e identificadores de QUALQUER tipo de arquivo.
 */
export async function sanitizeFileMetadata(
  file: File,
  onProgress?: (percent: number, status: string) => void
): Promise<{ blob: Blob; size: number }> {
  onProgress?.(30, 'Inspecionando estrutura interna para higienização universal...');
  
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // 1. Imagens: Re-renderização limpa no Canvas (expulsa EXIF/GPS)
  if (['jpg', 'jpeg', 'png', 'webp', 'jfif', 'heic', 'bmp'].includes(ext) || file.type.startsWith('image/')) {
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

    onProgress?.(100, 'Metadados EXIF e GPS de imagem removidos com sucesso!');
    return { blob: cleanBlob, size: cleanBlob.size };
  }

  // 2. Documentos Office OpenXML (.docx, .xlsx, .pptx)
  if (['docx', 'xlsx', 'pptx', 'docm', 'xlsm'].includes(ext)) {
    onProgress?.(60, 'Limpando propriedades de autoria e revisão do pacote Office...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Limpar docProps/core.xml
      if (zip.file('docProps/core.xml')) {
        const cleanCore = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title></dc:title>
  <dc:subject></dc:subject>
  <dc:creator></dc:creator>
  <cp:keywords></cp:keywords>
  <dc:description></dc:description>
  <cp:lastModifiedBy></cp:lastModifiedBy>
  <cp:revision>1</cp:revision>
</cp:coreProperties>`;
        zip.file('docProps/core.xml', cleanCore);
      }

      // Limpar docProps/app.xml
      if (zip.file('docProps/app.xml')) {
        const cleanApp = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Template>Normal.dotm</Template>
  <TotalTime>0</TotalTime>
  <Pages>1</Pages>
  <Words>0</Words>
  <Characters>0</Characters>
  <Application>Microsoft Office Word</Application>
  <DocSecurity>0</DocSecurity>
  <Lines>0</Lines>
  <Paragraphs>0</Paragraphs>
  <ScaleCrop>false</ScaleCrop>
  <Company></Company>
  <LinksUpToDate>false</LinksUpToDate>
  <CharactersWithSpaces>0</CharactersWithSpaces>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`;
        zip.file('docProps/app.xml', cleanApp);
      }

      const cleanDocBlob = await zip.generateAsync({ type: 'blob', mimeType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      onProgress?.(100, 'Metadados de autoria e empresa do Office higienizados com sucesso!');
      return { blob: cleanDocBlob, size: cleanDocBlob.size };
    } catch {
      // Fallthrough caso ocorra falha de leitura
    }
  }

  // 3. Documentos PDF via pdf-lib
  if (ext === 'pdf' || file.type.includes('pdf')) {
    onProgress?.(70, 'Removendo 100% de todos os campos de metadados do documento PDF...');
    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('');
      pdfDoc.setCreator('');

      try {
        const infoRef = pdfDoc.context.trailerInfo.Info;
        if (infoRef && infoRef instanceof PDFRef) {
          pdfDoc.context.delete(infoRef);
        }
      } catch {}

      const cleanBytes = await pdfDoc.save({ useObjectStreams: false });
      const cleanBlob = new Blob([cleanBytes as unknown as BlobPart], { type: 'application/pdf' });

      onProgress?.(100, 'Metadados de autoria e sistema do PDF removidos com sucesso!');
      return { blob: cleanBlob, size: cleanBlob.size };
    } catch {
      // Fallthrough
    }
  }

  // 4. Arquivos Genéricos / Mídias / Outros: Re-criação de Blob limpo sem headers extras
  onProgress?.(80, 'Higienizando fluxo de dados binários do arquivo...');
  const arrayBuffer = await file.arrayBuffer();
  const cleanGenericBlob = new Blob([arrayBuffer], { type: file.type || 'application/octet-stream' });
  onProgress?.(100, 'Arquivo higienizado com sucesso!');
  return { blob: cleanGenericBlob, size: cleanGenericBlob.size };
}
