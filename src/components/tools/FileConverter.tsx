import React, { useState } from 'react';
import { 
  Repeat, 
  Image as ImageIcon, 
  FileText, 
  FileCheck, 
  Download, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  FolderArchive, 
  ArrowUp, 
  ArrowDown, 
  Merge,
  Layers,
  Sliders,
  Sparkles,
  FileType
} from 'lucide-react';
import { CoreConversionService, ImageToPdfOptions, PdfToImageOptions, TextToPdfOptions } from '../../core/documents';
import { CoreCompressionService } from '../../core/compression';

export interface ConvertedItem {
  fileName: string;
  data: Uint8Array;
  previewUrl?: string;
}

export const FileConverter: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'img2pdf' | 'pdf2img' | 'txt2pdf'>('img2pdf');

  // --- MODO 1: Imagens ➔ PDF ---
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [pageSize, setPageSize] = useState<'a4' | 'fit'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [margin, setMargin] = useState<number>(20);
  const [outputPdfName, setOutputPdfName] = useState<string>('documentos_imagens.pdf');

  // --- MODO 2: PDF ➔ Imagens ---
  const [pdfForImages, setPdfForImages] = useState<File | null>(null);
  const [imageFormat, setImageFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [imageQuality, setImageQuality] = useState<number>(0.92);
  const [imageScale, setImageScale] = useState<number>(300 / 72);

  // --- MODO 3: Texto ➔ PDF ---
  const [txtFile, setTxtFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [txtTitle, setTxtTitle] = useState<string>('DOCUMENTO PROCESSUAL');
  const [txtFontSize, setTxtFontSize] = useState<number>(11);

  // Shared state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [results, setResults] = useState<ConvertedItem[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- HANDLERS MODO 1 (Img ➔ PDF) ---
  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const imgs = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      if (imgs.length === 0) {
        setErrorMessage('Por favor, selecione arquivos de imagem válidos (JPG, PNG, WEBP).');
        e.target.value = '';
        return;
      }
      setSelectedImages(prev => [...prev, ...imgs]);
      setResults(null);
      setErrorMessage(null);
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setResults(null);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === selectedImages.length - 1) return;

    const newImgs = [...selectedImages];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = newImgs[index];
    newImgs[index] = newImgs[targetIdx];
    newImgs[targetIdx] = temp;
    setSelectedImages(newImgs);
    setResults(null);
  };

  const handleConvertImagesToPdf = async () => {
    if (selectedImages.length === 0) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const items = await Promise.all(
        selectedImages.map(async file => {
          const buffer = await file.arrayBuffer();
          return {
            data: buffer,
            mimeType: file.type,
            name: file.name
          };
        })
      );

      const options: ImageToPdfOptions = {
        pageSize,
        orientation,
        margin,
        mergeIntoSinglePdf: true
      };

      const pdfBytes = await CoreConversionService.imagesToPdf(items, options);

      setResults([{
        fileName: outputPdfName.endsWith('.pdf') ? outputPdfName : `${outputPdfName}.pdf`,
        data: pdfBytes
      }]);
    } catch (err: any) {
      setErrorMessage('Erro ao converter imagens para PDF: ' + (err?.message || 'Erro desconhecido.'));
    } finally {
      setIsProcessing(false);
    }
  };

  // --- HANDLERS MODO 2 (PDF ➔ Imagens) ---
  const handlePdfForImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (!f.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('Por favor, selecione um arquivo no formato PDF.');
        e.target.value = '';
        return;
      }
      setPdfForImages(f);
      setResults(null);
      setErrorMessage(null);
      e.target.value = '';
    }
  };

  const handleConvertPdfToImages = async () => {
    if (!pdfForImages) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const buffer = await pdfForImages.arrayBuffer();
      const options: PdfToImageOptions = {
        format: imageFormat,
        quality: imageQuality,
        scale: imageScale
      };

      const pagesImages = await CoreConversionService.pdfToImages(buffer, options);

      const items: ConvertedItem[] = pagesImages.map(img => ({
        fileName: `${pdfForImages.name.replace(/\.pdf$/i, '')}_${img.fileName}`,
        data: img.bytes,
        previewUrl: img.dataUrl
      }));

      setResults(items);
    } catch (err: any) {
      setErrorMessage('Erro ao converter PDF em imagens: ' + (err?.message || 'Erro desconhecido.'));
    } finally {
      setIsProcessing(false);
    }
  };

  // --- HANDLERS MODO 3 (TXT ➔ PDF) ---
  const handleTxtFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        setTextContent(text);
        setTxtTitle(f.name.replace(/\.[^/.]+$/, '').toUpperCase());
      };
      reader.readAsText(f);
      setTxtFile(f);
      setResults(null);
      setErrorMessage(null);
      e.target.value = '';
    }
  };

  const handleConvertTxtToPdf = async () => {
    if (!textContent.trim()) {
      setErrorMessage('Por favor, insira ou carregue um texto para converter em PDF.');
      return;
    }
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const options: TextToPdfOptions = {
        fontSize: txtFontSize,
        title: txtTitle
      };

      const pdfBytes = await CoreConversionService.textToPdf(textContent, options);

      setResults([{
        fileName: `${(txtTitle || 'documento_texto').toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
        data: pdfBytes
      }]);
    } catch (err: any) {
      setErrorMessage('Erro ao converter texto para PDF: ' + (err?.message || 'Erro desconhecido.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSingle = (res: ConvertedItem) => {
    const mime = res.fileName.endsWith('.pdf') ? 'application/pdf' : res.fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const blob = new Blob([new Uint8Array(res.data)], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllZip = () => {
    if (!results || results.length === 0) return;
    const zipFiles = results.map(r => ({ name: r.fileName, data: r.data }));
    const zipData = CoreCompressionService.createZipArchive(zipFiles);
    const blob = new Blob([new Uint8Array(zipData)], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Arquivos_Convertidos_KovaxFiles.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    setSelectedImages([]);
    setPdfForImages(null);
    setTxtFile(null);
    setTextContent('');
    setResults(null);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-xl font-bold text-slate-100">Conversor de Arquivos</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
              <FileType className="w-3.5 h-3.5 text-blue-400" />
              Multimídia 100% Local
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Converta imagens JPG/PNG para PDF formatado, exporte páginas de PDFs em imagens de alta definição ou transforme relatórios TXT em PDF.
          </p>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
        <button
          onClick={() => { setActiveSubTab('img2pdf'); setResults(null); setErrorMessage(null); }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'img2pdf'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Imagens ➔ PDF</span>
        </button>

        <button
          onClick={() => { setActiveSubTab('pdf2img'); setResults(null); setErrorMessage(null); }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'pdf2img'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileType className="w-4 h-4" />
          <span>PDF ➔ Imagens (JPG/PNG)</span>
        </button>

        <button
          onClick={() => { setActiveSubTab('txt2pdf'); setResults(null); setErrorMessage(null); }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'txt2pdf'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Texto (TXT) ➔ PDF</span>
        </button>
      </div>

      {/* --- MODO 1: Imagens ➔ PDF --- */}
      {activeSubTab === 'img2pdf' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Controls (2 cols) */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Sliders className="w-4 h-4" /> Opções da Folha & Formatação
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Tamanho da Página PDF:
                  </label>
                  <select
                    value={pageSize}
                    onChange={(e: any) => setPageSize(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  >
                    <option value="a4">📄 Padrão A4 (595 x 842 pt)</option>
                    <option value="fit">📐 Ajustar ao Tamanho da Imagem Original</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Orientação do PDF:
                  </label>
                  <select
                    value={orientation}
                    onChange={(e: any) => setOrientation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  >
                    <option value="portrait">📱 Retrato (Vertical)</option>
                    <option value="landscape">🖥️ Paisagem (Horizontal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Margem Interna (pt):
                  </label>
                  <input
                    type="number"
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Nome do Arquivo PDF Final:
                  </label>
                  <input
                    type="text"
                    value={outputPdfName}
                    onChange={(e) => setOutputPdfName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Info Card (1 col) */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Qualidade de Imagem
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                As imagens são preservadas em resolução original dentro da estrutura do PDF sem compressão destrutiva, ideais para comprovantes e fotos de documentos.
              </p>
              <div className="p-2.5 rounded-xl bg-blue-950/20 border border-blue-500/30 text-[11px] text-blue-300">
                Suporta JPG, JPEG, PNG e WEBP.
              </div>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div className="dropzone p-7 text-center cursor-pointer relative rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-900/40 transition-all">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImagesChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  Arraste ou selecione fotos / imagens (JPG, PNG, WEBP)
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reordene as imagens para definir a sequência de páginas do PDF.
                </p>
              </div>
            </div>
          </div>

          {/* Selected Images List & Ordering */}
          {selectedImages.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Imagens Selecionadas ({selectedImages.length}):
                </span>
                <button
                  onClick={clearAll}
                  className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Seleção</span>
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {selectedImages.map((img, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/60 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="text-slate-200 font-medium truncate">{img.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({(img.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => moveImage(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveImage(idx, 'down')}
                        disabled={idx === selectedImages.length - 1}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeImage(idx)}
                        className="text-red-400 hover:text-red-300 font-bold px-1.5 py-0.5 rounded hover:bg-red-500/10 text-sm transition-all"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleConvertImagesToPdf}
                disabled={isProcessing}
                className="btn-action w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-50 transition-all mt-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Gerando PDF a partir de {selectedImages.length} imagem(ns)...</span>
                  </>
                ) : (
                  <>
                    <FileType className="w-4 h-4" />
                    <span>Converter {selectedImages.length} Imagem(ns) em PDF Único</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- MODO 2: PDF ➔ Imagens --- */}
      {activeSubTab === 'pdf2img' && (
        <div className="space-y-5">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Formato da Imagem de Saída:
              </label>
              <select
                value={imageFormat}
                onChange={(e: any) => setImageFormat(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
              >
                <option value="jpeg">🖼️ JPEG (Fotos e Documentos)</option>
                <option value="png">🎨 PNG (Sem Perdas de Qualidade)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Resolução / DPI (Escala):
              </label>
              <select
                value={imageScale}
                onChange={(e: any) => setImageScale(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-medium"
              >
                <option value={150 / 72}>150 DPI (Padrão Web)</option>
                <option value={300 / 72}>300 DPI (Alta Definição - Recomendado)</option>
                <option value={450 / 72}>450 DPI (Ultra Definição)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Qualidade de Compressão JPEG:
              </label>
              <select
                value={imageQuality}
                onChange={(e: any) => setImageQuality(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
              >
                <option value={0.95}>95% - Qualidade Máxima</option>
                <option value={0.85}>85% - Equilibrado</option>
                <option value={0.70}>70% - Arquivos Menores</option>
              </select>
            </div>
          </div>

          <div className="dropzone p-8 text-center cursor-pointer relative rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-900/40 transition-all">
            <input
              type="file"
              accept=".pdf"
              onChange={handlePdfForImagesChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
                <FileType className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {pdfForImages ? pdfForImages.name : 'Selecione ou arraste o arquivo PDF para exportar as páginas'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cada página do PDF será renderizada como uma imagem em alta definição.
                </p>
              </div>
            </div>
          </div>

          {pdfForImages && (
            <button
              onClick={handleConvertPdfToImages}
              disabled={isProcessing}
              className="btn-action w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-50 transition-all"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Renderizando páginas do PDF em imagens...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  <span>Exportar Páginas do PDF em Imagens ({imageFormat.toUpperCase()})</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* --- MODO 3: Texto ➔ PDF --- */}
      {activeSubTab === 'txt2pdf' && (
        <div className="space-y-5">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Título do Documento (Cabeçalho):
              </label>
              <input
                type="text"
                value={txtTitle}
                onChange={(e) => setTxtTitle(e.target.value)}
                placeholder="Ex: RELATÓRIO PROCESSUAL"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Tamanho da Fonte (pt):
              </label>
              <select
                value={txtFontSize}
                onChange={(e: any) => setTxtFontSize(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
              >
                <option value={10}>10 pt (Pequeno)</option>
                <option value={11}>11 pt (Padrão Formal)</option>
                <option value={12}>12 pt (Grande)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400">
                Digite ou Cole o Texto (ou carregue um arquivo .TXT):
              </label>
              <label className="cursor-pointer text-xs text-blue-400 hover:text-blue-300 underline flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                <span>Carregar arquivo TXT</span>
                <input type="file" accept=".txt" onChange={handleTxtFileChange} className="hidden" />
              </label>
            </div>

            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Cole aqui o conteúdo em texto plano..."
              rows={10}
              className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 space-y-2"
            />
          </div>

          <button
            onClick={handleConvertTxtToPdf}
            disabled={isProcessing || !textContent.trim()}
            className="btn-action w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-50 transition-all"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gerando PDF a partir do texto...</span>
              </>
            ) : (
              <>
                <FileType className="w-4 h-4" />
                <span>Gerar Documento PDF Formatado</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Result Section */}
      {results && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">{results.length} Arquivo(s) Convertido(s) com Sucesso!</h3>
                <p className="text-xs text-slate-400">Processamento concluído em memória local com alta qualidade.</p>
              </div>
            </div>

            {results.length > 1 && (
              <button
                onClick={handleDownloadAllZip}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-purple-600/20 transition-all"
              >
                <FolderArchive className="w-4 h-4" />
                <span>Baixar Todos em ZIP ({results.length})</span>
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {results.map((res, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-center gap-3 truncate">
                  {res.previewUrl ? (
                    <img src={res.previewUrl} alt={res.fileName} className="w-10 h-10 object-cover rounded border border-slate-700 shrink-0" />
                  ) : (
                    <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                  )}
                  <span className="text-slate-200 font-bold truncate">{res.fileName}</span>
                </div>
                <button
                  onClick={() => handleDownloadSingle(res)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 font-semibold text-xs flex items-center gap-1.5 border border-blue-500/30"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar Arquivo
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-800">
            <button
              onClick={clearAll}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Realizar Nova Conversão
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
