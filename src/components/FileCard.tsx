import React from 'react';
import { 
  FileText, Image as ImageIcon, Video, Music, Scale, 
  Download, Eye, Trash2, CheckCircle2, AlertTriangle, RefreshCw, Clock, Sliders, Bot, Sparkles 
} from 'lucide-react';
import type { BatchFileItem, OperationType, ProcessingOptions } from '../types';
import { formatBytes, getOperationName } from '../utils/formatters';

interface FileCardProps {
  item: BatchFileItem;
  onUpdateOperation: (id: string, op: OperationType) => void;
  onUpdateOptions?: (id: string, options: Partial<ProcessingOptions>) => void;
  onRemove: (id: string) => void;
  onPreview: (item: BatchFileItem) => void;
  onDownload: (item: BatchFileItem) => void;
  onOpenGDocsEditor?: (file: File) => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  item,
  onUpdateOperation,
  onUpdateOptions,
  onRemove,
  onPreview,
  onDownload,
  onOpenGDocsEditor,
}) => {
  const getFileIcon = () => {
    switch (item.category) {
      case 'pdf_court':
        return <Scale className="w-5 h-5 text-blue-600" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-indigo-600" />;
      case 'document':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'media':
        return item.operation.includes('audio') || item.operation === 'extract_mp3' ? (
          <Music className="w-5 h-5 text-purple-600" />
        ) : (
          <Video className="w-5 h-5 text-amber-600" />
        );
      default:
        return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  const getAvailableOperations = (): { value: OperationType; label: string }[] => {
    const ext = item.name.split('.').pop()?.toLowerCase() || '';
    const type = item.type.toLowerCase();

    if (item.category === 'pdf_court' || ext === 'pdf') {
      return [
        { value: 'court_pdf_compress', label: 'Compactar p/ Tribunal (PJe)' },
        { value: 'pdf_to_docx', label: 'PDF ➔ Word (.docx)' },
        { value: 'pdf_to_excel', label: 'PDF ➔ Pasta de Trabalho Excel (.xlsx)' },
        { value: 'pdf_to_csv', label: 'PDF ➔ Planilha CSV (.csv)' },
        { value: 'pdf_to_txt', label: 'PDF ➔ Texto (.txt)' },
        { value: 'pdf_to_md', label: 'PDF ➔ Markdown (.md)' },
        { value: 'pdf_to_html', label: 'PDF ➔ Página Web HTML' },
      ];
    }
    if (item.category === 'image') {
      const isRaw = ['dng', 'cr2', 'cr3', 'nef', 'nrw', 'arw', 'srf', 'sr2', 'raf', 'orf', 'rw2', 'pef'].includes(ext);
      const isTexture = ['tga', 'targa', 'dds', 'exr', 'hdr', 'pcx'].includes(ext);
      const isVector = ['eps', 'ai', 'cdr', 'dxf', 'dwg'].includes(ext);
      const isMedical = ['dcm', 'dicom', 'fits'].includes(ext);

      if (ext === 'svg' || type.includes('svg')) {
        return [
          { value: 'svg_to_png', label: 'Vetor SVG ➔ PNG' },
          { value: 'svg_to_webp', label: 'Vetor SVG ➔ WebP (Otimizado)' },
          { value: 'svg_to_pdf', label: 'Vetor SVG ➔ Documento PDF' },
        ];
      }

      const allOps: { value: OperationType; label: string }[] = [
        { value: 'img_to_pdf', label: 'Foto / Imagem ➔ PDF (A4 Alta Qualidade)' },
        { value: 'img_to_webp', label: 'Imagem ➔ WebP (Otimizado Web)' },
        { value: 'img_to_png', label: 'Imagem ➔ PNG (Sem Perdas)' },
        { value: 'img_to_jpg', label: 'Imagem ➔ JPG / JPEG' },
        { value: 'img_to_avif', label: 'Imagem ➔ AVIF (Alta Compressão)' },
        { value: 'png_to_docx', label: 'Imagem / PNG ➔ Documento Word (.docx)' },
        { value: 'png_to_ico', label: 'Imagem / PNG ➔ Ícone do Windows (.ico)' },
        { value: 'png_to_svg', label: 'Imagem / PNG ➔ Vetor SVG (.svg)' },
        { value: 'img_to_gif', label: 'Imagem ➔ GIF' },
        { value: 'img_to_bmp', label: 'Imagem ➔ Bitmap (.bmp)' },
        { value: 'img_to_tiff', label: 'Imagem ➔ TIFF (Gráfica)' },
      ];

      if (isRaw) {
        allOps.splice(1, 0, { value: 'img_to_jpg', label: 'Foto RAW (Câmera) ➔ JPG HD' });
        allOps.splice(2, 0, { value: 'img_to_png', label: 'Foto RAW (Câmera) ➔ PNG Sem Perdas' });
      } else if (isTexture) {
        allOps.splice(1, 0, { value: 'img_to_png', label: 'Textura 3D / Game ➔ PNG' });
      } else if (isVector) {
        allOps.splice(1, 0, { value: 'img_to_pdf', label: 'Vetor / Design ➔ PDF' });
      } else if (isMedical) {
        allOps.splice(1, 0, { value: 'img_to_pdf', label: 'Imagem Médica (DICOM) ➔ PDF' });
      }

      if (ext === 'heic' || ext === 'heif' || type.includes('heic')) {
        allOps.push({ value: 'heic_to_jpg', label: 'HEIC (iPhone) ➔ JPG' });
        allOps.push({ value: 'heic_to_png', label: 'HEIC (iPhone) ➔ PNG' });
      }

      allOps.push({ value: 'img_convert_format', label: 'Personalizado (Formato/DPI)' });

      return allOps.filter((op) => {
        if (ext === 'png' || type.includes('png')) {
          if (op.value === 'img_to_png' || op.value === 'heic_to_png' || op.value === 'webp_to_png') return false;
        }
        if (ext === 'jpg' || ext === 'jpeg' || ext === 'jfif' || type.includes('jpeg')) {
          if (op.value === 'img_to_jpg' || op.value === 'heic_to_jpg') return false;
        }
        if (ext === 'webp' || type.includes('webp')) {
          if (op.value === 'img_to_webp') return false;
        }
        if (ext === 'avif' || type.includes('avif')) {
          if (op.value === 'img_to_avif') return false;
        }
        if (ext !== 'heic' && ext !== 'heif' && !type.includes('heic') && !type.includes('heif')) {
          if (op.value === 'heic_to_jpg' || op.value === 'heic_to_png') return false;
        }
        return true;
      });
    }

    if (ext === 'json' || type.includes('json')) {
      return [
        { value: 'json_to_spreadsheet', label: 'JSON ➔ Planilha Excel / CSV' },
      ];
    }

    if (item.category === 'spreadsheet' || ['xlsx', 'xls', 'csv', 'ods'].includes(ext)) {
      const ops: { value: OperationType; label: string }[] = [
        { value: 'spreadsheet_to_pdf', label: 'Planilha (XLSX/CSV) ➔ PDF' },
        { value: 'spreadsheet_to_docx', label: 'Planilha ➔ Word (.docx)' },
        { value: 'spreadsheet_to_csv', label: 'Planilha ➔ CSV Limpo' },
        { value: 'spreadsheet_to_txt', label: 'Planilha ➔ Texto (.txt)' },
        { value: 'spreadsheet_to_md', label: 'Planilha ➔ Tabela Markdown (.md)' },
        { value: 'spreadsheet_to_json', label: 'Planilha ➔ Dados JSON (.json)' },
      ];
      if (ext === 'csv') {
        return ops.filter((op) => op.value !== 'spreadsheet_to_csv');
      }
      return ops;
    }

    if (item.category === 'presentation' || ['pptx', 'ppt', 'odp'].includes(ext)) {
      return [
        { value: 'presentation_to_pdf', label: 'Apresentação (PPTX) ➔ PDF' },
        { value: 'presentation_to_images', label: 'Apresentação (PPTX) ➔ Imagens dos Slides' },
        { value: 'presentation_to_txt', label: 'Apresentação ➔ Texto (.txt)' },
      ];
    }

    if (item.category === 'document' || ['docx', 'doc', 'rtf', 'odt', 'epub', 'txt', 'md'].includes(ext)) {
      if (ext === 'md') {
        return [
          { value: 'md_to_pdf', label: 'Markdown (.md) ➔ PDF Executivo 1:1' },
          { value: 'md_to_docx', label: 'Markdown (.md) ➔ Word Executivo (.docx)' },
          { value: 'md_to_excel', label: 'Markdown (.md) ➔ Excel (.xlsx) [IA Local]' },
          { value: 'md_to_csv', label: 'Markdown (.md) ➔ Planilha CSV (.csv) [IA Local]' },
        ];
      }
      if (ext === 'docx' || ext === 'doc') {
        return [
          { value: 'docx_to_pdf', label: 'Documento / Word ➔ PDF (Padrão 1:1)' },
          { value: 'docx_to_pdfa', label: 'Documento / Word ➔ PDF/A Arquivístico (ISO 19005)' },
          { value: 'docx_to_txt', label: 'Documento / Word ➔ Texto Puro (.txt UTF-8)' },
          { value: 'docx_to_md', label: 'Word (.docx) ➔ Markdown (.md)' },
        ];
      }
      return [
        { value: 'docx_to_pdf', label: 'Documento / Word ➔ PDF' },
        { value: 'docx_to_pdfa', label: 'Documento / Word ➔ PDF/A Arquivístico (ISO 19005)' },
        { value: 'docx_to_txt', label: 'Documento / Word ➔ Texto Puro (.txt UTF-8)' },
        { value: 'md_to_pdf', label: 'Markdown (.md) ➔ PDF Executivo 1:1' },
        { value: 'md_to_docx', label: 'Markdown (.md) ➔ Word Executivo (.docx)' },
        { value: 'docx_to_md', label: 'Word (.docx) ➔ Markdown (.md)' },
        { value: 'epub_to_pdf', label: 'E-book / Documento ➔ PDF' },
        { value: 'txt_to_pdf', label: 'Texto (.txt) ➔ PDF' },
      ];
    }

    if (item.category === 'archive' || ext === 'zip') {
      return [
        { value: 'unpack_zip', label: 'Descompactar ZIP na Fila' },
      ];
    }
    if (item.category === 'media' || type.startsWith('video/') || type.startsWith('audio/')) {
      const isVideo = ['mov', 'webm', 'avi', 'mkv', 'flv', 'mp4', '3gp', 'wmv', 'vob', 'ts'].includes(ext) || type.startsWith('video/');
      if (isVideo) {
        return [
          { value: 'video_convert', label: 'Conversor & Compressor de Vídeo (MP4/WebM)' },
          { value: 'video_to_gif', label: 'Vídeo ➔ GIF Animado' },
          { value: 'extract_mp3', label: 'Extrair Áudio do Vídeo ➔ MP3' },
        ];
      }
      return [
        { value: 'audio_convert', label: 'Conversor & Otimizador de Áudio (MP3/WAV/AAC/FLAC)' },
        { value: 'extract_mp3', label: 'Converter Áudio ➔ MP3' },
      ];
    }

    return [{ value: item.operation, label: getOperationName(item.operation) }];
  };

  const calculateReductionPercent = () => {
    if (!item.processedSize || item.processedSize >= item.originalSize) return null;
    const diff = item.originalSize - item.processedSize;
    return Math.round((diff / item.originalSize) * 100);
  };

  const reduction = calculateReductionPercent();

  const isImageCategory = item.category === 'image' && (item.operation === 'img_convert_format' || item.operation === 'img_to_webp' || item.operation === 'img_to_jpg' || item.operation === 'img_to_png' || item.operation === 'img_to_avif');
  const isAiSupportedOperation = ['pdf_to_docx', 'pdf_to_excel', 'pdf_to_csv', 'md_to_pdf', 'md_to_excel', 'md_to_csv'].includes(item.operation);

  const ext = item.name.split('.').pop()?.toLowerCase() || '';
  const type = item.type.toLowerCase();

  const availableImageFormats = [
    { value: 'webp', label: 'WebP (Otimizado)' },
    { value: 'png', label: 'PNG (Sem Perdas)' },
    { value: 'jpeg', label: 'JPEG / JPG' },
    { value: 'avif', label: 'AVIF (Alta Compressão)' },
  ].filter((fmt) => {
    if (ext === 'png' || type.includes('png')) return fmt.value !== 'png';
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'jfif' || type.includes('jpeg')) return fmt.value !== 'jpeg';
    if (ext === 'webp' || type.includes('webp')) return fmt.value !== 'webp';
    if (ext === 'avif' || type.includes('avif')) return fmt.value !== 'avif';
    return true;
  });

  const selectedImageFormat = availableImageFormats.some(f => f.value === item.options.imageOutputFormat)
    ? item.options.imageOutputFormat
    : (availableImageFormats[0]?.value || 'webp');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between relative group hover:border-blue-300 shadow-xs hover:shadow-md transition-all duration-200">
      
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start space-x-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 shrink-0 mt-0.5">
            {getFileIcon()}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
              {item.name}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span className="font-mono">{formatBytes(item.originalSize)}</span>
              <span>•</span>
              <span className="uppercase text-[10px] font-semibold text-slate-500">{item.category}</span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="shrink-0">
          {item.status === 'completed' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Concluído
            </span>
          )}
          {item.status === 'processing' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              Processando ({item.progress}%)
            </span>
          )}
          {item.status === 'queued' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
              <Clock className="w-3.5 h-3.5" />
              Na fila
            </span>
          )}
          {item.status === 'error' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              Erro
            </span>
          )}
        </div>
      </div>

      {/* Operation & Compression Options if idle */}
      {item.status === 'idle' && (
        <div className="my-2 space-y-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Operação de Conversão:
            </label>
            <select
              value={item.operation}
              onChange={(e) => onUpdateOperation(item.id, e.target.value as OperationType)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {getAvailableOperations().map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          {/* Universal Image Options */}
          {isImageCategory && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Formato de Saída:</label>
                <select
                  value={selectedImageFormat}
                  onChange={(e) => onUpdateOptions?.(item.id, { imageOutputFormat: e.target.value as any })}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-900"
                >
                  {availableImageFormats.map((fmt) => (
                    <option key={fmt.value} value={fmt.value}>
                      {fmt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Redimensionar:</label>
                <select
                  value={item.options.resizeScale || 1.0}
                  onChange={(e) => onUpdateOptions?.(item.id, { resizeScale: parseFloat(e.target.value) })}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-900"
                >
                  <option value={1.0}>100% (Original)</option>
                  <option value={0.75}>75% Escala</option>
                  <option value={0.5}>50% Escala</option>
                  <option value={0.25}>25% Escala</option>
                </select>
              </div>

              <div className="col-span-2 pt-1">
                <div className="flex items-center justify-between text-[10px] text-slate-600 mb-1">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-blue-600" /> Qualidade de Compressão:
                  </span>
                  <span className="font-mono font-bold text-blue-700">
                    {Math.round((item.options.quality || 0.85) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={item.options.quality || 0.85}
                  onChange={(e) => onUpdateOptions?.(item.id, { quality: parseFloat(e.target.value) })}
                  className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Universal Audio Options */}
          {(item.operation === 'audio_convert' || item.operation === 'extract_mp3') && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Formato Áudio:</label>
                <select
                  value={item.options.audioOutputFormat || 'mp3'}
                  onChange={(e) => onUpdateOptions?.(item.id, { audioOutputFormat: e.target.value as any })}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-900"
                >
                  <option value="mp3">MP3</option>
                  <option value="wav">WAV (Sem Perdas)</option>
                  <option value="aac">AAC</option>
                  <option value="ogg">OGG</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Bitrate / Qualidade:</label>
                <select
                  value={item.options.audioBitrate || '192k'}
                  onChange={(e) => onUpdateOptions?.(item.id, { audioBitrate: e.target.value as any })}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-900"
                >
                  <option value="128k">128 kbps (Compacto)</option>
                  <option value="192k">192 kbps (Padrão)</option>
                  <option value="256k">256 kbps (Alta)</option>
                  <option value="320k">320 kbps (Máxima)</option>
                </select>
              </div>
            </div>
          )}

          {/* AI Local Engine Options */}
          {isAiSupportedOperation && (
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-blue-800 font-bold">
                <Bot className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Motor Kovax</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.options.useAiEngine !== false}
                  onChange={(e) => onUpdateOptions?.(item.id, { useAiEngine: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {item.status === 'processing' && (
        <div className="my-2">
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
            <div
              className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {item.status === 'error' && item.error && (
        <p className="text-xs text-red-700 bg-red-50 p-2 rounded border border-red-200 my-2">
          {item.error}
        </p>
      )}

      {/* Completed Results Summary */}
      {item.status === 'completed' && item.processedSize && (
        <div className="my-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="text-xs">
            <span className="text-slate-600">Tamanho Final: </span>
            <strong className="font-mono text-emerald-700">{formatBytes(item.processedSize)}</strong>
          </div>

          {reduction !== null && (
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              -{reduction}% Reduzido
            </span>
          )}
        </div>
      )}

      {/* Bottom Footer Actions */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        
        <div className="flex items-center space-x-2">
          {/* Quality Preview Button */}
          {(item.status === 'completed' || item.originalUrl) && (
            <button
              onClick={() => onPreview(item)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold border border-slate-200 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              Pré-visualizar
            </button>
          )}

          {/* Editor & Visualizer Button */}
          {onOpenGDocsEditor && (item.category === 'document' || item.category === 'pdf_court' || item.name.endsWith('.docx') || item.name.endsWith('.doc') || item.name.endsWith('.txt') || item.name.endsWith('.md') || item.name.endsWith('.html')) && (
            <button
              onClick={() => onOpenGDocsEditor(item.file)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 text-xs font-bold border border-blue-200 transition-colors"
              title="Abrir no Editor & Visualizador WYSIWYG A4"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Editar
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Download Button */}
          {item.status === 'completed' && item.processedBlob && (
            <button
              onClick={() => onDownload(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar
            </button>
          )}

          {/* Remove Button */}
          <button
            onClick={() => onRemove(item.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors"
            title="Remover arquivo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
