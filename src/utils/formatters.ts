import type { CourtPreset, FileCategory, OperationType } from '../types';

export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB limit

export const COURT_PRESETS: CourtPreset[] = [
  {
    id: 'pje_5mb',
    name: 'PJe Nacional / TRF / TRT (5 MB)',
    tribunal: 'PJe / TRF / TRT',
    maxSizeMB: 5.0,
    description: 'Limite padrão de 5 MB exigido na maioria das varas do PJe, TRF e TRT.',
    isPopular: true,
  },
  {
    id: 'pje_25mb',
    name: 'PJe Restrito (2.5 MB)',
    tribunal: 'PJe Restrito',
    maxSizeMB: 2.5,
    description: 'Limite rigoroso de 2,5 MB por arquivo em sistemas regionais antigos.',
  },
  {
    id: 'tjsp_10mb',
    name: 'TJSP - Processo Eletrônico (10 MB)',
    tribunal: 'TJSP',
    maxSizeMB: 10.0,
    description: 'Limite máximo de 10 MB para documentos anexos no TJSP.',
    isPopular: true,
  },
  {
    id: 'tjsp_3mb',
    name: 'TJSP - Petição Inicial/Intermediária (3 MB)',
    tribunal: 'TJSP',
    maxSizeMB: 3.0,
    description: 'Recomendado para petições no peticionamento eletrônico do TJSP.',
  },
  {
    id: 'stj_10mb',
    name: 'STJ / STF - Recursos (10 MB)',
    tribunal: 'STJ & STF',
    maxSizeMB: 10.0,
    description: 'Limite para peças enviadas aos Tribunais Superiores.',
  },
  {
    id: 'custom',
    name: 'Tamanho Personalizado (MB)',
    tribunal: 'Personalizado',
    maxSizeMB: 5.0,
    description: 'Defina exatamente quantos MB o arquivo PDF final deve ter.',
  },
];

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function detectCategoryAndDefaultOperation(file: File): { category: FileCategory; operation: OperationType } {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const type = file.type.toLowerCase();

  if (ext === 'zip' || type.includes('zip')) {
    return { category: 'archive', operation: 'unpack_zip' };
  }

  if (ext === 'pdf' || type.includes('pdf')) {
    return { category: 'pdf_court', operation: 'court_pdf_compress' };
  }

  if (ext === 'json' || type.includes('json')) {
    return { category: 'spreadsheet', operation: 'json_to_spreadsheet' };
  }

  if (['xlsx', 'xls', 'csv', 'ods'].includes(ext) || type.includes('spreadsheet') || type.includes('csv') || type.includes('excel')) {
    return { category: 'spreadsheet', operation: 'spreadsheet_to_pdf' };
  }

  if (ext === 'svg' || type.includes('svg')) {
    return { category: 'image', operation: 'svg_to_png' };
  }

  if (['pptx', 'ppt', 'odp'].includes(ext) || type.includes('presentation') || type.includes('powerpoint')) {
    return { category: 'presentation', operation: 'presentation_to_pdf' };
  }

  if (['epub', 'mobi', 'azw3', 'rtf', 'odt'].includes(ext)) {
    return { category: 'document', operation: 'epub_to_pdf' };
  }

  if (ext === 'heic' || ext === 'heif' || type.includes('heic') || type.includes('heif')) {
    return { category: 'image', operation: 'heic_to_jpg' };
  }

  if (ext === 'webp' || type.includes('webp')) {
    return { category: 'image', operation: 'img_to_png' };
  }

  const extendedImageExtensions = [
    'jpg', 'jpeg', 'jfif', 'png', 'gif', 'bmp', 'avif', 'svg', 'ico', 'tif', 'tiff', 'psd',
    'dng', 'cr2', 'cr3', 'nef', 'nrw', 'arw', 'srf', 'sr2', 'raf', 'orf', 'rw2', 'pef',
    'eps', 'ai', 'cdr', 'dxf', 'dwg', 'tga', 'targa', 'dds', 'exr', 'hdr', 'pcx',
    'dcm', 'dicom', 'fits'
  ];

  if (extendedImageExtensions.includes(ext) || type.startsWith('image/')) {
    return { category: 'image', operation: 'img_to_pdf' };
  }

  if (['docx', 'doc'].includes(ext) || type.includes('wordprocessingml') || type.includes('msword')) {
    return { category: 'document', operation: 'docx_to_pdf' };
  }

  if (ext === 'md' || ext === 'markdown' || type.includes('markdown')) {
    return { category: 'document', operation: 'md_to_pdf' };
  }

  if (['txt'].includes(ext) || type.includes('text/plain')) {
    return { category: 'document', operation: 'txt_to_pdf' };
  }

  if (['html', 'htm'].includes(ext) || type.includes('html')) {
    return { category: 'document', operation: 'html_to_pdf' };
  }


  const audioExtensions = [
    'mp3', 'wav', 'aac', 'ogg', 'oga', 'flac', 'm4a', 'm4b', 'wma', 'amr', 'opus',
    'aiff', 'aif', 'ac3', 'caf', 'spx', 'ra', 'mid', 'midi'
  ];

  if (audioExtensions.includes(ext) || type.startsWith('audio/')) {
    return { category: 'media', operation: 'audio_convert' };
  }

  const videoExtensions = [
    'mp4', 'mov', 'webm', 'avi', 'mkv', 'flv', 'f4v', '3gp', '3g2', 'wmv', 'vob',
    'ts', 'mts', 'm2ts', 'ogv', 'm4v', 'mpg', 'mpeg', 'm2v', 'divx', 'xvid', 'asf', 'rm', 'rmvb'
  ];

  if (ext === 'pdf' || type.includes('pdf')) {
    const nameLower = file.name.toLowerCase();
    if (['dre', 'fluxo', 'caixa', 'excel', 'tabela', 'dados', 'planilha', 'relatorio', 'financeiro'].some((k) => nameLower.includes(k))) {
      return { category: 'pdf_court', operation: 'pdf_to_excel' };
    }
    return { category: 'pdf_court', operation: 'court_pdf_compress' };
  }

  return { category: 'document', operation: 'docx_to_pdf' };
}

export function getOperationName(op: OperationType): string {
  switch (op) {
    case 'court_pdf_compress':
      return 'Compactar p/ Tribunal (PJe)';
    case 'heic_to_jpg':
      return 'HEIC ➔ JPG';
    case 'heic_to_png':
      return 'HEIC ➔ PNG';
    case 'webp_to_png':
      return 'WebP ➔ PNG';
    case 'img_to_webp':
      return 'Imagem ➔ WebP (Otimizado)';
    case 'img_to_png':
      return 'Imagem ➔ PNG (Sem Perdas)';
    case 'img_to_jpg':
      return 'Imagem ➔ JPG / JPEG';
    case 'img_to_avif':
      return 'Imagem ➔ AVIF (Alta Compressão)';
    case 'img_to_pdf':
      return 'Imagem ➔ Documento PDF';
    case 'png_to_docx':
      return 'PNG ➔ Documento Word (.docx)';
    case 'png_to_ico':
      return 'PNG ➔ Ícone do Windows (.ico)';
    case 'png_to_svg':
      return 'PNG ➔ Vetor SVG (.svg)';
    case 'svg_to_png':
      return 'Vetor SVG ➔ PNG';
    case 'svg_to_pdf':
      return 'Vetor SVG ➔ PDF';
    case 'svg_to_webp':
      return 'Vetor SVG ➔ WebP';
    case 'img_to_gif':
      return 'Imagem ➔ GIF';
    case 'img_to_bmp':
      return 'Imagem ➔ Bitmap (.bmp)';
    case 'img_to_tiff':
      return 'Imagem ➔ TIFF (Gráfica)';
    case 'img_convert_format':
      return 'Conversor Personalizado de Imagem';
    case 'docx_to_pdf':
      return 'Word (.doc / .docx) ➔ PDF Executivo';
    case 'pdf_to_docx':
      return 'PDF ➔ Word (.docx)';
    case 'pdf_to_excel':
      return 'PDF ➔ Pasta de Trabalho Excel (.xlsx)';
    case 'pdf_to_csv':
      return 'PDF ➔ Planilha CSV (.csv)';
    case 'pdf_to_txt':
      return 'PDF ➔ Texto (.txt)';
    case 'pdf_to_md':
      return 'PDF ➔ Markdown (.md)';
    case 'pdf_to_html':
      return 'PDF ➔ Página Web HTML';
    case 'txt_to_pdf':
      return 'Texto (.txt) ➔ PDF';
    case 'md_to_pdf':
      return 'Markdown (.md) ➔ PDF Executivo 1:1';
    case 'md_to_docx':
      return 'Markdown (.md) ➔ Word Executivo (.docx)';
    case 'docx_to_md':
      return 'Word (.docx) ➔ Markdown (.md)';
    case 'html_to_pdf':
      return 'Página Web HTML ➔ PDF Executivo 1:1';
    case 'html_to_docx':
      return 'Página Web HTML ➔ Word (.docx)';

    case 'epub_to_pdf':
      return 'E-book / Documento ➔ PDF';
    case 'rtf_to_pdf':
      return 'RTF ➔ PDF';
    case 'odt_to_pdf':
      return 'ODT ➔ PDF';
    case 'spreadsheet_to_pdf':
      return 'Planilha (XLSX/CSV) ➔ PDF';
    case 'spreadsheet_to_docx':
      return 'Planilha ➔ Word (.docx)';
    case 'spreadsheet_to_csv':
      return 'Planilha ➔ CSV Limpo';
    case 'spreadsheet_to_txt':
      return 'Planilha ➔ Texto (.txt)';
    case 'spreadsheet_to_md':
      return 'Planilha ➔ Tabela Markdown (.md)';
    case 'spreadsheet_to_json':
      return 'Planilha ➔ Dados JSON (.json)';
    case 'json_to_spreadsheet':
      return 'JSON ➔ Planilha Excel / CSV';
    case 'presentation_to_pdf':
      return 'Apresentação (PPTX) ➔ PDF';
    case 'presentation_to_txt':
      return 'Apresentação ➔ Texto (.txt)';
    case 'presentation_to_images':
      return 'Apresentação (PPTX) ➔ Imagens dos Slides';
    case 'video_to_mp4':
      return 'Vídeo ➔ MP4 Otimizado';
    case 'video_convert':
      return 'Conversor & Compressor de Vídeo';
    case 'video_to_gif':
      return 'Vídeo ➔ GIF Animado';
    case 'extract_mp3':
      return 'Extrair Áudio ➔ MP3';
    case 'audio_convert':
      return 'Conversor & Otimizador de Áudio';
    case 'unpack_zip':
      return 'Descompactar Arquivo ZIP na Fila';
    default:
      return 'Processar Arquivo';
  }
}
