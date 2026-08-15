import { useState, useCallback, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { BatchFileItem, CourtPresetId, OperationType, ProcessingOptions } from '../types';
import { detectCategoryAndDefaultOperation, MAX_FILE_SIZE_BYTES, formatBytes } from '../utils/formatters';
import {
  compressPdfForCourt,
  convertImage,
  convertImageToPdf,
  convertMultipleImagesToPdf,
  convertImageToDocx,
  convertImageToIco,
  convertImageToSvg,
  convertSvgToOutput,
  convertImageToSpecificFormat,
  convertDocxToPdf,
  convertDocToPdfA,
  convertDocToTxt,
  convertPdfToDocx,
  convertPdfToTxt,
  convertPdfToMd,
  convertPdfToHtml,
  convertUniversalDocToPdf,
  convertDocxToMarkdown,
  convertHtmlToPdf,
  convertHtmlToDocx,
  convertMarkdownToPdf,
  convertMarkdownToDocx,
  convertSpreadsheetToPdf,
  convertSpreadsheetToDocx,
  convertSpreadsheetToCsv,
  convertSpreadsheetToTxt,
  convertSpreadsheetToMd,
  convertSpreadsheetToJson,
  convertJsonToSpreadsheet,
  pdfTableExtractorService,
  convertVideoUniversal,
  convertAudioUniversal,
  convertVideoToGif,
  unpackZipFile,
  memoryManager,
} from '../services';

export function useBatchProcessor() {
  const [items, setItems] = useState<BatchFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<CourtPresetId>('pje_5mb');
  const [customMaxMB, setCustomMaxMB] = useState<number>(5.0);
  const [rejectedFilesError, setRejectedFilesError] = useState<string | null>(null);
  const cancelRequestedRef = useRef(false);

  useEffect(() => {
    memoryManager.init();
  }, []);

  // Add files to batch (up to 50 max, enforces 2GB per file limit)
  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    setRejectedFilesError(null);

    const validFiles: File[] = [];
    const rejectedFiles: File[] = [];

    fileArray.forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejectedFiles.push(file);
      } else {
        validFiles.push(file);
      }
    });

    if (rejectedFiles.length > 0) {
      const names = rejectedFiles.map((f) => `${f.name} (${formatBytes(f.size)})`).join(', ');
      setRejectedFilesError(
        `Os seguintes arquivos excederam o limite máximo de 2 GB e foram rejeitados para segurança da memória: ${names}`
      );
    }

    const newItems: BatchFileItem[] = validFiles.map((file, idx) => {
      const { category, operation } = detectCategoryAndDefaultOperation(file);
      const originalUrl = file.type.startsWith('image/') || file.type.includes('pdf') 
        ? memoryManager.createAndRegisterBlobUrl(file) 
        : undefined;

      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let initialImageFormat: 'webp' | 'png' | 'jpeg' | 'avif' = 'webp';
      if (ext === 'png' || file.type.includes('png')) {
        initialImageFormat = 'webp';
      } else if (ext === 'webp' || file.type.includes('webp')) {
        initialImageFormat = 'png';
      } else if (ext === 'jpg' || ext === 'jpeg' || ext === 'jfif' || file.type.includes('jpeg')) {
        initialImageFormat = 'webp';
      } else if (ext === 'avif' || file.type.includes('avif')) {
        initialImageFormat = 'webp';
      }

      return {
        id: `file_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 6)}`,
        file,
        name: file.name,
        originalSize: file.size,
        type: file.type,
        category,
        operation,
        status: 'idle',
        progress: 0,
        originalUrl,
        previewBeforeUrl: originalUrl,
        options: {
          courtPreset: 'pje_5mb',
          targetMaxMB: 5.0,
          quality: 0.85,
          resizeScale: 1.0,
          imageOutputFormat: initialImageFormat,
          audioOutputFormat: 'mp3',
          audioBitrate: '192k',
          videoOutputFormat: 'mp4',
          videoPreset: 'balanced',
        },
      };
    });

    const cssFiles = validFiles.filter((f) => f.name.toLowerCase().endsWith('.css'));
    if (cssFiles.length > 0) {
      Promise.all(
        cssFiles.map(async (f) => ({
          name: f.name,
          content: await f.text(),
        }))
      ).then((cssContentList) => {
        setItems((prevItems) => {
          const currentCount = prevItems.length;
          const allowedCount = Math.max(0, 50 - currentCount);
          const slicedNewItems = newItems.slice(0, allowedCount);

          const updatedNewItems = slicedNewItems.map((item) => {
            const ext = item.name.split('.').pop()?.toLowerCase() || '';
            if (ext === 'html' || ext === 'htm') {
              return {
                ...item,
                options: {
                  ...item.options,
                  linkedCssFiles: cssContentList,
                },
              };
            }
              return item;
          });

          return [...prevItems, ...updatedNewItems];
        });
      });
    } else {
      setItems((prevItems) => {
        const currentCount = prevItems.length;
        const allowedCount = Math.max(0, 50 - currentCount);
        return [...prevItems, ...newItems.slice(0, allowedCount)];
      });
    }
  }, []);

  const updateItemOperation = useCallback((id: string, operation: OperationType) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        // Auto-sync options.imageOutputFormat based on specific selected operation
        let imageOutputFormat = item.options.imageOutputFormat || 'webp';
        if (operation === 'img_to_png' || operation === 'heic_to_png' || operation === 'webp_to_png') {
          imageOutputFormat = 'png';
        } else if (operation === 'img_to_jpg' || operation === 'heic_to_jpg') {
          imageOutputFormat = 'jpeg';
        } else if (operation === 'img_to_webp') {
          imageOutputFormat = 'webp';
        } else if (operation === 'img_to_avif') {
          imageOutputFormat = 'avif';
        }

        return {
          ...item,
          operation,
          options: {
            ...item.options,
            imageOutputFormat,
          },
        };
      })
    );
  }, []);

  const updateItemOptions = useCallback((id: string, newOptions: Partial<ProcessingOptions>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, options: { ...item.options, ...newOptions } } : item
      )
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.originalUrl) memoryManager.revokeBlobUrl(target.originalUrl);
      if (target?.processedUrl) memoryManager.revokeBlobUrl(target.processedUrl);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems((prev) => {
      prev.forEach((item) => {
        if (item.originalUrl) memoryManager.revokeBlobUrl(item.originalUrl);
        if (item.processedUrl) memoryManager.revokeBlobUrl(item.processedUrl);
      });
      return [];
    });
    memoryManager.purgeAllMemory();
    setRejectedFilesError(null);
  }, []);

  // Process a single file item
  const processSingleItem = async (item: BatchFileItem): Promise<BatchFileItem> => {
    const startTime = Date.now();
    const updateProgress = (progress: number) => {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, progress } : i))
      );
    };

    try {
      let resultBlob: Blob;
      let resultSize: number;

      const targetMaxMB = selectedPreset === 'custom' ? customMaxMB : (
        selectedPreset === 'pje_25mb' ? 2.5 :
        selectedPreset === 'tjsp_10mb' ? 10.0 :
        selectedPreset === 'tjsp_3mb' ? 3.0 :
        selectedPreset === 'stj_10mb' ? 10.0 : 5.0
      );

      switch (item.operation) {
        case 'court_pdf_compress': {
          const res = await compressPdfForCourt(item.file, {
            targetMaxMB,
            onProgress: updateProgress,
          });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'heic_to_jpg':
        case 'img_to_jpg': {
          const res = await convertImage(item.file, {
            outputFormat: 'jpeg',
            quality: item.options.quality || 0.85,
            resizeScale: item.options.resizeScale || 1.0,
            onProgress: updateProgress,
          });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'heic_to_png':
        case 'webp_to_png':
        case 'img_to_png': {
          const res = await convertImage(item.file, {
            outputFormat: 'png',
            quality: item.options.quality || 1.0,
            resizeScale: item.options.resizeScale || 1.0,
            onProgress: updateProgress,
          });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'img_to_avif': {
          const res = await convertImage(item.file, {
            outputFormat: 'avif',
            quality: item.options.quality || 0.85,
            resizeScale: item.options.resizeScale || 1.0,
            onProgress: updateProgress,
          });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'img_to_webp':
        case 'img_convert_format': {
          const format = item.options.imageOutputFormat || 'webp';
          const res = await convertImage(item.file, {
            outputFormat: format,
            quality: item.options.quality || 0.85,
            resizeScale: item.options.resizeScale || 1.0,
            onProgress: updateProgress,
          });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'img_to_pdf': {
          const res = await convertImageToPdf(item.file, updateProgress);
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'png_to_docx': {
          const res = await convertImageToDocx(item.file, updateProgress);
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'png_to_ico': {
          const res = await convertImageToIco(item.file, updateProgress);
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'png_to_svg': {
          const res = await convertImageToSvg(item.file, updateProgress);
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'img_to_gif': {
          const res = await convertImageToSpecificFormat(item.file, 'gif', { onProgress: updateProgress });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'img_to_bmp': {
          const res = await convertImageToSpecificFormat(item.file, 'bmp', { onProgress: updateProgress });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'img_to_tiff': {
          const res = await convertImageToSpecificFormat(item.file, 'tiff', { onProgress: updateProgress });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'svg_to_png': {
          const res = await convertSvgToOutput(item.file, 'png', updateProgress);
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'svg_to_pdf': {
          const res = await convertSvgToOutput(item.file, 'pdf', updateProgress);
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'svg_to_webp': {
          const res = await convertSvgToOutput(item.file, 'webp', updateProgress);
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'spreadsheet_to_pdf': {
          const res = await convertSpreadsheetToPdf(item.file, { onProgress: updateProgress });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'spreadsheet_to_docx': {
          const res = await convertSpreadsheetToDocx(item.file, { onProgress: updateProgress });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'spreadsheet_to_csv': {
          const res = await convertSpreadsheetToCsv(item.file, { onProgress: updateProgress });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'spreadsheet_to_txt': {
          const res = await convertSpreadsheetToTxt(item.file, { onProgress: updateProgress });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'spreadsheet_to_md': {
          const res = await convertSpreadsheetToMd(item.file, { onProgress: updateProgress });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'spreadsheet_to_json': {
          const res = await convertSpreadsheetToJson(item.file, { onProgress: updateProgress });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'json_to_spreadsheet': {
          const res = await convertJsonToSpreadsheet(item.file, { onProgress: updateProgress });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'epub_to_pdf':
        case 'rtf_to_pdf':
        case 'odt_to_pdf':
        case 'presentation_to_pdf': {
          const res = await convertUniversalDocToPdf(item.file, { onProgress: updateProgress });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'presentation_to_txt': {
          const res = await convertPdfToTxt(item.file, { onProgress: updateProgress });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'unpack_zip': {
          const extracted = await unpackZipFile(item.file, { onProgress: updateProgress });
          if (extracted.length === 1) {
            resultBlob = extracted[0];
            resultSize = extracted[0].size;
          } else {
            updateProgress(90);
            const outZip = new JSZip();
            extracted.forEach((f) => outZip.file(f.name, f));
            const zipContent = await outZip.generateAsync({ type: 'blob' });
            resultBlob = zipContent;
            resultSize = zipContent.size;
            updateProgress(100);
          }
          break;
        }

        case 'docx_to_pdf': {
          const res = await convertDocxToPdf(item.file, {
            onProgress: updateProgress,
          });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'docx_to_pdfa':
        case 'doc_to_pdfa': {
          const res = await convertDocToPdfA(item.file, {
            onProgress: updateProgress,
          });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'docx_to_txt':
        case 'doc_to_txt': {
          const res = await convertDocToTxt(item.file, {
            onProgress: updateProgress,
          });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'html_to_pdf': {
          const res = await convertHtmlToPdf(item.file, {
            linkedCssFiles: item.options.linkedCssFiles,
            customCssText: item.options.customCssText,
            onProgress: updateProgress,
          });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'html_to_docx': {
          const res = await convertHtmlToDocx(item.file, {
            onProgress: updateProgress,
          });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'txt_to_pdf': {
          const res = await convertDocxToPdf(item.file, {
            onProgress: updateProgress,
          });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'md_to_pdf': {
          const res = await convertMarkdownToPdf(item.file, {
            onProgress: updateProgress,
          });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'md_to_docx': {
          const res = await convertMarkdownToDocx(item.file, {
            onProgress: updateProgress,
          });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'docx_to_md': {
          const res = await convertDocxToMarkdown(item.file);
          resultBlob = new Blob([res], { type: 'text/markdown' });
          resultSize = resultBlob.size;
          break;
        }

        case 'presentation_to_images': {
          const res = await convertDocxToPdf(item.file, {
            onProgress: updateProgress,
          });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }


        case 'pdf_to_docx': {
          const res = await convertPdfToDocx(item.file, {
            onProgress: updateProgress,
          });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'pdf_to_txt': {
          const res = await convertPdfToTxt(item.file, {
            onProgress: updateProgress,
          });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'pdf_to_md': {
          const res = await convertPdfToMd(item.file, {
            onProgress: updateProgress,
          });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'pdf_to_excel': {
          updateProgress(30);
          const tables = await pdfTableExtractorService.extractTablesFromPdf(item.file);
          updateProgress(80);
          const res = pdfTableExtractorService.exportTablesToXlsxBlob(tables);
          resultBlob = res.blob;
          resultSize = res.size;
          updateProgress(100);
          break;
        }

        case 'pdf_to_csv': {
          updateProgress(30);
          const tables = await pdfTableExtractorService.extractTablesFromPdf(item.file);
          updateProgress(80);
          const res = pdfTableExtractorService.exportTablesToCsvBlob(tables);
          resultBlob = res.blob;
          resultSize = res.size;
          updateProgress(100);
          break;
        }

        case 'pdf_to_html': {
          const res = await convertPdfToHtml(item.file, { onProgress: updateProgress });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'video_to_mp4':
        case 'video_convert': {
          const res = await convertVideoUniversal(item.file, {
            outputFormat: item.options.videoOutputFormat || 'mp4',
            preset: item.options.videoPreset || 'ultrafast',
            onProgress: updateProgress,
          });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'video_to_gif': {
          const res = await convertVideoToGif(item.file, { onProgress: updateProgress });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        case 'extract_mp3':
        case 'audio_convert': {
          const res = await convertAudioUniversal(item.file, {
            outputFormat: item.options.audioOutputFormat || 'mp3',
            bitrate: item.options.audioBitrate || '192k',
            onProgress: updateProgress,
          });
          resultBlob = res.blob;
          resultSize = res.size;
          break;
        }

        default:
          throw new Error('Operação de conversão não suportada.');
      }

      const processedUrl = memoryManager.createAndRegisterBlobUrl(resultBlob);

      return {
        ...item,
        status: 'completed',
        progress: 100,
        processedBlob: resultBlob,
        processedSize: resultSize,
        processedUrl,
        previewAfterUrl: processedUrl,
        timeTakenMs: Date.now() - startTime,
      };
    } catch (err: any) {
      console.error(`Erro ao processar ${item.name}:`, err);
      return {
        ...item,
        status: 'error',
        progress: 0,
        error: err.message || 'Erro inesperado durante o processamento.',
      };
    }
  };

  // Process all files in queue concurrently using Worker pool limit
  const processBatch = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    cancelRequestedRef.current = false;

    const concurrency = Math.min(Math.max(navigator.hardwareConcurrency || 2, 2), 4);
    
    setItems((prev) =>
      prev.map((item) => (item.status === 'idle' ? { ...item, status: 'queued', progress: 0 } : item))
    );

    const pendingItems = items.filter((i) => i.status === 'idle' || i.status === 'queued' || i.status === 'error');

    for (let i = 0; i < pendingItems.length; i += concurrency) {
      if (cancelRequestedRef.current) break;

      const chunk = pendingItems.slice(i, i + concurrency);

      setItems((prev) =>
        prev.map((item) =>
          chunk.some((c) => c.id === item.id) ? { ...item, status: 'processing', progress: 5 } : item
        )
      );

      const results = await Promise.all(chunk.map((item) => processSingleItem(item)));

      setItems((prev) =>
        prev.map((item) => {
          const match = results.find((r) => r.id === item.id);
          return match || item;
        })
      );
    }

    setIsProcessing(false);
  };

  // Download single processed item
  const downloadSingle = (item: BatchFileItem) => {
    if (!item.processedBlob) return;
    
    const ext = getOutputExtensionForOperation(item.operation, item.options);
    const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
    const finalName = `${baseName}_otimizado.${ext}`;

    saveAs(item.processedBlob, finalName);
  };

  // Download all completed items as ZIP archive
  const downloadAllAsZip = async () => {
    const completedItems = items.filter((i) => i.status === 'completed' && i.processedBlob);
    if (completedItems.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder('arquivos_otimizados');

    completedItems.forEach((item) => {
      const ext = getOutputExtensionForOperation(item.operation, item.options);
      const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
      const finalName = `${baseName}_otimizado.${ext}`;

      folder?.file(finalName, item.processedBlob!);
    });

    const zipContent = await zip.generateAsync({ type: 'blob' });
    saveAs(zipContent, `arquivos_otimizados_${Date.now()}.zip`);
  };

  // Convert all images in queue to 1 multi-page PDF document
  const convertAllImagesToPdf = async () => {
    const imageItems = items.filter((i) => i.category === 'image' || i.file.type.startsWith('image/'));
    if (imageItems.length === 0) return;

    setIsProcessing(true);
    try {
      const files = imageItems.map((i) => i.file);
      const { blob } = await convertMultipleImagesToPdf(files);
      saveAs(blob, `fotos_convertidas_pdf_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Erro ao converter fotos para PDF:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    items,
    isProcessing,
    selectedPreset,
    setSelectedPreset,
    customMaxMB,
    setCustomMaxMB,
    rejectedFilesError,
    addFiles,
    updateItemOperation,
    updateItemOptions,
    removeItem,
    clearAll,
    processBatch,
    downloadSingle,
    downloadAllAsZip,
    convertAllImagesToPdf,
  };
}

export function getOutputExtensionForOperation(operation: OperationType, options: ProcessingOptions = {}): string {
  switch (operation) {
    case 'court_pdf_compress':
    case 'docx_to_pdf':
    case 'docx_to_pdfa':
    case 'doc_to_pdfa':
    case 'html_to_pdf':
    case 'txt_to_pdf':
    case 'md_to_pdf':
    case 'epub_to_pdf':
    case 'rtf_to_pdf':
    case 'odt_to_pdf':
    case 'spreadsheet_to_pdf':
    case 'presentation_to_pdf':
    case 'img_to_pdf':
    case 'svg_to_pdf':
      return 'pdf';

    case 'pdf_to_docx':
    case 'png_to_docx':
    case 'spreadsheet_to_docx':
    case 'md_to_docx':
    case 'html_to_docx':
      return 'docx';

    case 'pdf_to_txt':
    case 'docx_to_txt':
    case 'doc_to_txt':
    case 'spreadsheet_to_txt':
    case 'presentation_to_txt':
      return 'txt';

    case 'pdf_to_md':
    case 'spreadsheet_to_md':
    case 'docx_to_md':
      return 'md';

    case 'pdf_to_html':
      return 'html';

    case 'pdf_to_excel':
      return 'xlsx';

    case 'spreadsheet_to_csv':
    case 'pdf_to_csv':
    case 'json_to_spreadsheet':
      return 'csv';

    case 'spreadsheet_to_json':
      return 'json';

    case 'svg_to_png':
    case 'heic_to_png':
    case 'webp_to_png':
    case 'img_to_png':
      return 'png';

    case 'heic_to_jpg':
    case 'img_to_jpg':
      return 'jpg';

    case 'img_to_avif':
      return 'avif';

    case 'img_to_webp':
    case 'svg_to_webp':
      return 'webp';

    case 'img_to_gif':
    case 'video_to_gif':
      return 'gif';

    case 'img_to_bmp':
      return 'bmp';

    case 'img_to_tiff':
      return 'tiff';

    case 'png_to_ico':
      return 'ico';

    case 'png_to_svg':
      return 'svg';

    case 'video_to_mp4':
      return 'mp4';

    case 'video_convert':
      return options.videoOutputFormat || 'mp4';

    case 'extract_mp3':
      return 'mp3';

    case 'audio_convert':
      return options.audioOutputFormat || 'mp3';

    case 'unpack_zip':
    case 'presentation_to_images':
      return 'zip';

    case 'img_convert_format':
      return options.imageOutputFormat || 'webp';

    default:
      return 'file';
  }
}
