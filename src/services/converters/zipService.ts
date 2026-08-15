import JSZip from 'jszip';

export interface UnpackZipProgressOptions {
  onProgress?: (percent: number, message: string) => void;
}

/**
 * Descompacta um arquivo .zip enviado no navegador e retorna uma lista de Files prontos para a fila.
 */
export async function unpackZipFile(
  zipFile: File,
  options?: UnpackZipProgressOptions
): Promise<File[]> {
  options?.onProgress?.(10, `Carregando arquivo ZIP ${zipFile.name}...`);
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipFile);

  const extractedFiles: File[] = [];
  const entries = Object.keys(loadedZip.files).filter(
    (filename) => !loadedZip.files[filename].dir && !filename.startsWith('__MACOSX') && !filename.includes('.DS_Store')
  );

  const total = entries.length;
  if (total === 0) {
    throw new Error('O arquivo ZIP enviado está vazio ou não contém arquivos válidos.');
  }

  const MAX_TOTAL_UNCOMPRESSED_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB limit
  const MAX_COMPRESSION_RATIO = 100; // 100:1 max ratio
  let cumulativeUncompressedBytes = 0;

  for (let i = 0; i < entries.length; i++) {
    const filename = entries[i];
    const zipEntry = loadedZip.files[filename];
    
    options?.onProgress?.(
      20 + Math.floor(((i + 1) / total) * 70),
      `Extraindo ${filename} (${i + 1}/${total})...`
    );

    const blob = await zipEntry.async('blob');
    cumulativeUncompressedBytes += blob.size;

    if (cumulativeUncompressedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error('Alerta de Segurança: O arquivo ZIP excede o limite máximo de 2 GB descompactado.');
    }

    if (zipFile.size > 1024 && (blob.size / zipFile.size) > MAX_COMPRESSION_RATIO) {
      throw new Error('Alerta de Segurança: Rejeitada tentativa de Zip Bomb (taxa de expansão anômala detectada).');
    }

    const cleanName = filename.split('/').pop() || filename;
    
    // Infer mime type
    let mimeType = 'application/octet-stream';
    const ext = cleanName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') mimeType = 'application/pdf';
    else if (['jpg', 'jpeg', 'jfif'].includes(ext)) mimeType = 'image/jpeg';
    else if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'webp') mimeType = 'image/webp';
    else if (ext === 'avif') mimeType = 'image/avif';
    else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (['xlsx', 'xls', 'csv'].includes(ext)) mimeType = 'text/csv';
    else if (['txt', 'md'].includes(ext)) mimeType = 'text/plain';

    const extractedFile = new File([blob], cleanName, { type: mimeType });
    extractedFiles.push(extractedFile);
  }

  options?.onProgress?.(100, `ZIP descompactado com sucesso! ${extractedFiles.length} arquivos extraídos.`);
  return extractedFiles;
}
