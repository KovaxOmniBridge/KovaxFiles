export type FileCategory = 
  | 'all' 
  | 'pdf_court' 
  | 'image' 
  | 'document' 
  | 'spreadsheet' 
  | 'presentation' 
  | 'media' 
  | 'archive';

export type OperationType = 
  | 'court_pdf_compress'
  | 'heic_to_jpg'
  | 'heic_to_png'
  | 'webp_to_png'
  | 'img_to_webp'
  | 'img_to_png'
  | 'img_to_jpg'
  | 'img_to_avif'
  | 'img_to_pdf'
  | 'img_to_gif'
  | 'img_to_bmp'
  | 'img_to_tiff'
  | 'png_to_docx'
  | 'png_to_ico'
  | 'png_to_svg'
  | 'svg_to_png'
  | 'svg_to_pdf'
  | 'svg_to_webp'
  | 'img_convert_format'
  | 'docx_to_pdf'
  | 'docx_to_pdfa'
  | 'docx_to_txt'
  | 'doc_to_pdfa'
  | 'doc_to_txt'
  | 'pdf_to_docx'
  | 'pdf_to_excel'
  | 'pdf_to_csv'
  | 'pdf_to_txt'
  | 'pdf_to_md'
  | 'pdf_to_html'
  | 'txt_to_pdf'
  | 'md_to_pdf'
  | 'md_to_docx'
  | 'md_to_excel'
  | 'md_to_csv'
  | 'docx_to_md'
  | 'html_to_pdf'
  | 'html_to_docx'
  | 'epub_to_pdf'
  | 'rtf_to_pdf'
  | 'odt_to_pdf'
  | 'spreadsheet_to_pdf'
  | 'spreadsheet_to_docx'
  | 'spreadsheet_to_csv'
  | 'spreadsheet_to_txt'
  | 'spreadsheet_to_md'
  | 'spreadsheet_to_json'
  | 'json_to_spreadsheet'
  | 'presentation_to_pdf'
  | 'presentation_to_txt'
  | 'presentation_to_images'
  | 'video_to_mp4'
  | 'video_convert'
  | 'video_to_gif'
  | 'extract_mp3'
  | 'audio_convert'
  | 'unpack_zip';

export type CourtPresetId = 'pje_5mb' | 'pje_25mb' | 'tjsp_10mb' | 'tjsp_3mb' | 'stj_10mb' | 'custom';

export interface CourtPreset {
  id: CourtPresetId;
  name: string;
  tribunal: string;
  maxSizeMB: number;
  description: string;
  isPopular?: boolean;
}

export interface ProcessingOptions {
  courtPreset?: CourtPresetId;
  targetMaxMB?: number;
  quality?: number; // 0.10 to 1.0 (10% to 100%)
  resizeScale?: number; // 0.25, 0.5, 0.75, 1.0
  imageOutputFormat?: 'jpeg' | 'png' | 'webp' | 'avif';
  audioOutputFormat?: 'mp3' | 'wav' | 'aac' | 'ogg' | 'flac';
  audioBitrate?: '128k' | '192k' | '256k' | '320k';
  videoPreset?: 'ultrafast' | 'balanced' | 'high_quality';
  videoOutputFormat?: 'mp4' | 'webm' | 'mkv';
  linkedCssFiles?: { name: string; content: string }[];
  customCssText?: string;
}

export type ProcessingStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'error' | 'cancelled';

export interface BatchFileItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  type: string;
  category: FileCategory;
  operation: OperationType;
  status: ProcessingStatus;
  progress: number;
  processedBlob?: Blob;
  processedSize?: number;
  processedUrl?: string;
  originalUrl?: string;
  previewBeforeUrl?: string;
  previewAfterUrl?: string;
  error?: string;
  options: ProcessingOptions;
  timeTakenMs?: number;
}

export interface ConversionResult {
  blob: Blob;
  size: number;
  previewUrl?: string;
  warnings?: string[];
}
