import React, { useState, useEffect, useRef } from 'react';
import { 
  FileStack, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft,
  ArrowRight,
  Download, 
  CheckCircle2, 
  RefreshCw, 
  Layers, 
  FolderArchive,
  RotateCw,
  Scissors,
  Eye,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { fileSystemAdapter } from '../../infrastructure/filesystem/fileSystemAdapter';
import { LocalPdfEngine } from '../../services/pdfEngine';
import { CompressionEngine } from '../../services/compressionEngine';
import * as pdfjsLib from 'pdfjs-dist';

interface SelectedPdfItem {
  id: string;
  file: File;
  name: string;
  size: number;
}

interface PageThumbnailItem {
  pageNumber: number; // 1-indexed para o usuário
  originalIndex: number; // 0-indexed no PDF de origem
  rotation: number; // 0, 90, 180, 270
  thumbnailUrl?: string;
  isDeleted: boolean;
}

export const PdfManipulator: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'merge' | 'split' | 'range' | 'organize'>('merge');
  
  // Estado para Fusão (Merge)
  const [fileList, setFileList] = useState<SelectedPdfItem[]>([]);
  const [mergeResult, setMergeResult] = useState<{ data: Uint8Array; fileName: string } | null>(null);

  // Estado para Divisão Completa (Split)
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [splitResult, setSplitResult] = useState<{ pageIndex: number; data: Uint8Array }[] | null>(null);

  // Estado para Extração por Intervalos (Range)
  const [rangeFile, setRangeFile] = useState<File | null>(null);
  const [rangeFileTotalPages, setRangeFileTotalPages] = useState<number>(0);
  const [rangeString, setRangeString] = useState<string>('1-3');
  const [rangeResult, setRangeResult] = useState<{ data: Uint8Array; fileName: string; pageCount: number } | null>(null);

  // Estado para Organizador Visual de Páginas (Miniaturas)
  const [organizeFile, setOrganizeFile] = useState<File | null>(null);
  const [pageThumbnails, setPageThumbnails] = useState<PageThumbnailItem[]>([]);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState<boolean>(false);
  const [organizeResult, setOrganizeResult] = useState<{ data: Uint8Array; fileName: string } | null>(null);

  const [exportState, setExportState] = useState('idle');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // =========================================================================
  // FUSÃO (MERGE)
  // =========================================================================
  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const allFiles = Array.from(e.target.files);
      const pdfFiles = allFiles.filter(f => f.name.toLowerCase().endsWith('.pdf'));
      const invalidCount = allFiles.length - pdfFiles.length;
      if (invalidCount > 0) {
        setErrorMessage(
          invalidCount === 1
            ? 'Apenas arquivos PDF são aceitos. 1 arquivo inválido foi ignorado.'
            : `Apenas arquivos PDF são aceitos. ${invalidCount} arquivos inválidos foram ignorados.`
        );
      } else {
        setErrorMessage(null);
      }
      if (pdfFiles.length > 0) {
        const newItems: SelectedPdfItem[] = pdfFiles.map((f, idx) => ({
          id: Math.random().toString(36).substring(7) + idx,
          file: f,
          name: f.name,
          size: f.size
        }));
        setFileList(prev => [...prev, ...newItems]);
        setMergeResult(null);
      }
    }
  };

  const handleRemoveFile = (id: string) => {
    setFileList(prev => prev.filter(item => item.id !== id));
    setErrorMessage(null);
  };

  const handleClearFileList = () => {
    setFileList([]);
    setMergeResult(null);
    setErrorMessage(null);
  };

  const handleMoveFile = (index: number, direction: 'up' | 'down') => {
    const newList = [...fileList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newList.length) {
      const temp = newList[index];
      newList[index] = newList[targetIndex];
      newList[targetIndex] = temp;
      setFileList(newList);
    }
  };

  const handleMerge = async () => {
    if (fileList.length < 2) {
      setErrorMessage('Por favor, adicione pelo menos 2 arquivos PDF para mesclar.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const buffers = await Promise.all(fileList.map(item => item.file.arrayBuffer()));
      const mergedBytes = await LocalPdfEngine.mergePdfs(buffers);

      setMergeResult({
        data: mergedBytes,
        fileName: 'documentos_mesclados_juntada.pdf'
      });
    } catch (err: any) {
      setErrorMessage('Erro ao unir arquivos PDF: ' + (err?.message || 'Arquivo corrompido.'));
    } finally {
      setIsProcessing(false);
    }
  };

  // =========================================================================
  // DIVISÃO (SPLIT)
  // =========================================================================
  const handleSplit = async () => {
    if (!singleFile) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const buffer = await singleFile.arrayBuffer();
      const splitPages = await LocalPdfEngine.splitPdf(buffer);
      setSplitResult(splitPages);
    } catch (err: any) {
      setErrorMessage('Erro ao dividir PDF: ' + (err?.message || 'Erro desconhecido.'));
    } finally {
      setIsProcessing(false);
    }
  };

  // =========================================================================
  // EXTRAÇÃO POR INTERVALOS (RANGE)
  // =========================================================================
  const handleRangeFileSelect = async (file: File) => {
    setRangeFile(file);
    setRangeResult(null);
    setErrorMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
      const pdf = await loadingTask.promise;
      setRangeFileTotalPages(pdf.numPages);
      setRangeString(`1-${Math.min(3, pdf.numPages)}`);
    } catch (err: any) {
      setErrorMessage('Erro ao analisar páginas do PDF: ' + (err?.message || 'Arquivo corrompido.'));
    }
  };

  const handleExtractRange = async () => {
    if (!rangeFile) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const buffer = await rangeFile.arrayBuffer();
      const parsedPages = LocalPdfEngine.parsePageRanges(rangeString, rangeFileTotalPages);
      if (parsedPages.length === 0) {
        setErrorMessage(`Intervalo inválido. O arquivo possui ${rangeFileTotalPages} página(s).`);
        setIsProcessing(false);
        return;
      }

      const extractedBytes = await LocalPdfEngine.extractPagesByRange(buffer, rangeString);
      const baseName = rangeFile.name.replace(/\.pdf$/i, '');
      setRangeResult({
        data: extractedBytes,
        fileName: `${baseName}_paginas_${rangeString.replace(/[\s,]+/g, '_')}.pdf`,
        pageCount: parsedPages.length
      });
    } catch (err: any) {
      setErrorMessage('Erro na extração de páginas: ' + (err?.message || 'Erro inesperado.'));
    } finally {
      setIsProcessing(false);
    }
  };

  // =========================================================================
  // ORGANIZADOR VISUAL (MINIATURAS)
  // =========================================================================
  const handleOrganizeFileSelect = async (file: File) => {
    setOrganizeFile(file);
    setOrganizeResult(null);
    setErrorMessage(null);
    setIsLoadingThumbnails(true);

    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
      const pdf = await loadingTask.promise;

      const items: PageThumbnailItem[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.35 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          items.push({
            pageNumber: i,
            originalIndex: i - 1,
            rotation: 0,
            thumbnailUrl: dataUrl,
            isDeleted: false
          });
        }
      }

      setPageThumbnails(items);
    } catch (err: any) {
      setErrorMessage('Erro ao carregar miniaturas das páginas: ' + (err?.message || 'Arquivo corrompido.'));
    } finally {
      setIsLoadingThumbnails(false);
    }
  };

  const handleRotatePage = (index: number) => {
    setPageThumbnails(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        rotation: (copy[index].rotation + 90) % 360
      };
      return copy;
    });
  };

  const handleToggleDeletePage = (index: number) => {
    setPageThumbnails(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        isDeleted: !copy[index].isDeleted
      };
      return copy;
    });
  };

  const handleMoveThumbnail = (index: number, direction: 'left' | 'right') => {
    setPageThumbnails(prev => {
      const copy = [...prev];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex >= 0 && targetIndex < copy.length) {
        const temp = copy[index];
        copy[index] = copy[targetIndex];
        copy[targetIndex] = temp;
      }
      return copy;
    });
  };

  const handleSaveOrganizedPdf = async () => {
    if (!organizeFile) return;

    const activePages = pageThumbnails.filter(p => !p.isDeleted);
    if (activePages.length === 0) {
      setErrorMessage('Você excluiu todas as páginas! Ao menos uma página deve ser mantida.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const buffer = await organizeFile.arrayBuffer();
      const pagesConfig = activePages.map(p => ({
        originalIndex: p.originalIndex,
        rotationDelta: p.rotation
      }));

      const organizedBytes = await LocalPdfEngine.reorganizePdf(buffer, pagesConfig);
      const baseName = organizeFile.name.replace(/\.pdf$/i, '');
      setOrganizeResult({
        data: organizedBytes,
        fileName: `${baseName}_reorganizado.pdf`
      });
    } catch (err: any) {
      setErrorMessage('Erro ao salvar PDF reorganizado: ' + (err?.message || 'Erro inesperado.'));
    } finally {
      setIsProcessing(false);
    }
  };

  // =========================================================================
  // DOWNLOADS
  // =========================================================================
  const downloadFile = async (data: Uint8Array, fileName: string) => {
    setExportState('saving');
    try {
      const result = await fileSystemAdapter.saveExportedFile(fileName, data);
      if (result.canceled) { setExportState('canceled'); return; }
      if (!result.success) throw new Error(result.error || 'Falha ao salvar PDF');
      setExportState('saved');
    } catch (error) {
      setExportState('error');
      setErrorMessage('Erro ao exportar PDF: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const downloadAllSplitZip = () => {
    if (!splitResult || splitResult.length === 0) return;
    const baseName = singleFile ? singleFile.name.replace(/\.pdf$/i, '') : 'Pagina';
    const zipFiles = splitResult.map(item => ({
      name: `${baseName}_Pagina_${String(item.pageIndex).padStart(3, '0')}.pdf`,
      data: item.data
    }));
    const zipBytes = CompressionEngine.createZipArchive(zipFiles);
    const blob = new Blob([new Uint8Array(zipBytes)], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_Paginas_Separadas.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="pdf-manipulator" data-file-count={fileList.length} data-export-state={exportState} className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* Tool Header */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-100">Manipulador de PDF (Fusão, Divisão & Miniaturas)</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              100% Offline
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Junte petições com anexos, extraia intervalos de folhas, reorganize, rotacione e exclua páginas com visualização por miniaturas.
          </p>
        </div>

        {/* Subtab Toggle */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 flex-wrap gap-1">
          <button
            onClick={() => setActiveSubTab('merge')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'merge' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Unir PDFs
          </button>
          <button
            onClick={() => setActiveSubTab('split')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'split' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dividir Páginas
          </button>
          <button
            onClick={() => setActiveSubTab('range')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'range' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Extração por Intervalos
          </button>
          <button
            onClick={() => setActiveSubTab('organize')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'organize' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Organizador por Miniaturas
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div data-testid="pdf-error" className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button data-testid="dismiss-error" onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-200">
            ×
          </button>
        </div>
      )}

      {/* TAB 1: MERGE */}
      {activeSubTab === 'merge' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-200 block">Arquivos Selecionados ({fileList.length})</span>
              <span className="text-[11px] text-slate-500">Defina a ordem exata de juntada dos documentos</span>
            </div>

            <div className="flex items-center gap-2">
              {fileList.length > 0 && (
                <button
                  data-testid="clear-file-list"
                  onClick={handleClearFileList}
                  className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Tudo</span>
                </button>
              )}

              <label className="btn-action px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer transition-all">
                <Plus className="w-4 h-4" />
                <span>Adicionar PDFs</span>
                <input data-testid="merge-input" type="file" accept=".pdf" multiple onChange={handleAddFiles} className="hidden" />
              </label>
            </div>
          </div>

          {fileList.length > 0 ? (
            <div className="space-y-2">
              {fileList.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-blue-400 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{item.name}</div>
                      <div className="text-[10px] text-slate-500">{(item.size / (1024 * 1024)).toFixed(2)} MB</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveFile(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 disabled:opacity-30"
                      title="Mover para cima"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveFile(idx, 'down')}
                      disabled={idx === fileList.length - 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 disabled:opacity-30"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      data-testid={`remove-file-${idx}`}
                      onClick={() => handleRemoveFile(item.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      title="Excluir da lista"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
              <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-400">Nenhum arquivo adicionado ainda.</p>
              <p className="text-[11px] text-slate-600 mt-1">Clique em "Adicionar PDFs" para selecionar petições e anexos.</p>
            </div>
          )}

          {fileList.length >= 2 && !mergeResult && (
            <div className="flex justify-between items-center pt-2">
              <button
                data-testid="clear-file-list-bottom"
                onClick={handleClearFileList}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Limpar Lista ({fileList.length})</span>
              </button>

              <button
                data-testid="merge-process" onClick={handleMerge}
                disabled={isProcessing}
                className="btn-action px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-50 transition-all"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Unindo {fileList.length} PDFs...</span>
                  </>
                ) : (
                  <>
                    <FileStack className="w-4 h-4" />
                    <span>Unir Todos os {fileList.length} PDFs em Lote</span>
                  </>
                )}
              </button>
            </div>
          )}

          {mergeResult && (
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100">PDFs Unificados com Sucesso!</h3>
                  <p className="text-xs text-slate-400">O documento combinado está pronto para download.</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  data-testid="merge-reset" onClick={() => { setFileList([]); setMergeResult(null); setExportState('idle'); }}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Mesclar Outros Arquivos
                </button>

                <button
                  data-testid="merge-export" onClick={() => downloadFile(mergeResult.data, mergeResult.fileName)}
                  className="btn-action px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar PDF Unificado</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SPLIT (TODAS AS PÁGINAS) */}
      {activeSubTab === 'split' && (
        <div className="space-y-4">
          <div className="dropzone p-8 text-center cursor-pointer relative rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-900/40 transition-all">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSingleFile(e.target.files[0]);
                  setSplitResult(null);
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
                <Layers className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {singleFile ? singleFile.name : 'Selecione o PDF que deseja dividir em páginas avulsas'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Extrai cada página do documento como um PDF individual ou em arquivo ZIP.
                </p>
              </div>
            </div>
          </div>

          {singleFile && !splitResult && (
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => { setSingleFile(null); setSplitResult(null); }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Limpar Seleção</span>
              </button>

              <button
                onClick={handleSplit}
                disabled={isProcessing}
                className="btn-action px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dividindo Páginas...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    <span>Dividir PDF em Páginas Individuais</span>
                  </>
                )}
              </button>
            </div>
          )}

          {splitResult && (
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{splitResult.length} Página(s) Separada(s) com Sucesso!</h3>
                    <p className="text-xs text-slate-400">Baixe individualmente ou faça o download de todas as páginas em um arquivo ZIP.</p>
                  </div>
                </div>

                <button
                  onClick={downloadAllSplitZip}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-purple-600/20 transition-all"
                >
                  <FolderArchive className="w-4 h-4" />
                  <span>Baixar Todas em ZIP ({splitResult.length})</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {splitResult.map((item) => (
                  <button
                    key={item.pageIndex}
                    onClick={() => downloadFile(item.data, `Pagina_${item.pageIndex}.pdf`)}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500 text-left text-xs flex items-center justify-between transition-all"
                  >
                    <div>
                      <div className="font-bold text-slate-200">Página {item.pageIndex}</div>
                      <div className="text-[10px] text-slate-500">{(item.data.byteLength / 1024).toFixed(1)} KB</div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <button
                  onClick={() => { setSingleFile(null); setSplitResult(null); }}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Dividir Outro Documento
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EXTRAÇÃO POR INTERVALOS (RANGE) */}
      {activeSubTab === 'range' && (
        <div className="space-y-4">
          <div className="dropzone p-8 text-center cursor-pointer relative rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-900/40 transition-all">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleRangeFileSelect(e.target.files[0]);
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
                <Scissors className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {rangeFile ? `${rangeFile.name} (${rangeFileTotalPages} páginas)` : 'Selecione o PDF para extração por intervalos'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Extraia apenas as folhas que importam para sua petição ou recurso.
                </p>
              </div>
            </div>
          </div>

          {rangeFile && !rangeResult && (
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-200">Definição dos Intervalos de Páginas</h3>
                  <p className="text-[11px] text-slate-400">Total de páginas no documento original: <strong className="text-blue-400">{rangeFileTotalPages}</strong></p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Intervalos de Páginas (ex: "1-4, 7, 10-15"):
                </label>
                <input
                  type="text"
                  value={rangeString}
                  onChange={(e) => setRangeString(e.target.value)}
                  placeholder="Ex: 1-5, 8, 12-16"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500">
                  Separe páginas avulsas por vírgula e blocos contínuos por hífen.
                </p>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => { setRangeFile(null); setRangeResult(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleExtractRange}
                  disabled={isProcessing}
                  className="btn-action px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Extraindo Folhas...</span>
                    </>
                  ) : (
                    <>
                      <Scissors className="w-4 h-4" />
                      <span>Extrair Intervalos Selecionados</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {rangeResult && (
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {rangeResult.pageCount} Página(s) Extraída(s) com Sucesso!
                  </h3>
                  <p className="text-xs text-slate-400">Intervalo processado: "{rangeString}"</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  onClick={() => setRangeResult(null)}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Definir Outro Intervalo
                </button>

                <button
                  onClick={() => downloadFile(rangeResult.data, rangeResult.fileName)}
                  className="btn-action px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar PDF Extraído</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ORGANIZADOR POR MINIATURAS (REORGANIZAÇÃO, ROTAÇÃO E EXCLUSÃO) */}
      {activeSubTab === 'organize' && (
        <div className="space-y-4">
          <div className="dropzone p-8 text-center cursor-pointer relative rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-900/40 transition-all">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleOrganizeFileSelect(e.target.files[0]);
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
                <Eye className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {organizeFile ? organizeFile.name : 'Selecione o PDF para reorganizar por miniaturas'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Ordene páginas, corrija orientação com rotação (90°) e exclua folhas em branco ou desnecessárias.
                </p>
              </div>
            </div>
          </div>

          {isLoadingThumbnails && (
            <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mx-auto" />
              <p className="text-xs text-slate-300">Gerando miniaturas visuais das páginas em alta fidelidade...</p>
            </div>
          )}

          {pageThumbnails.length > 0 && !organizeResult && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-300">
                  Total de Páginas: <strong className="text-blue-400">{pageThumbnails.length}</strong> | 
                  Ativas: <strong className="text-emerald-400">{pageThumbnails.filter(p => !p.isDeleted).length}</strong> | 
                  Excluídas: <strong className="text-rose-400">{pageThumbnails.filter(p => p.isDeleted).length}</strong>
                </div>

                <button
                  onClick={handleSaveOrganizedPdf}
                  disabled={isProcessing || pageThumbnails.every(p => p.isDeleted)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Gerando PDF Reorganizado...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>Exportar PDF Reorganizado</span>
                    </>
                  )}
                </button>
              </div>

              {/* Grid de Miniaturas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {pageThumbnails.map((item, idx) => (
                  <div
                    key={`${item.originalIndex}-${idx}`}
                    className={`p-2.5 rounded-xl border flex flex-col items-center space-y-2 transition-all relative ${
                      item.isDeleted 
                        ? 'bg-rose-950/20 border-rose-900/50 opacity-40' 
                        : 'bg-slate-900 border-slate-800 hover:border-blue-500/50 shadow-md'
                    }`}
                  >
                    {/* Badge da Folha */}
                    <div className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
                      <span>Folha {idx + 1}</span>
                      <span className="text-[10px] text-slate-500">Orig. {item.originalIndex + 1}</span>
                    </div>

                    {/* Canvas Thumbnail Image with Rotation */}
                    <div className="w-full h-40 bg-slate-950 rounded-lg flex items-center justify-center overflow-hidden border border-slate-800/80 p-1">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={`Página ${idx + 1}`}
                          className="max-h-full max-w-full object-contain transition-transform duration-200"
                          style={{ transform: `rotate(${item.rotation}deg)` }}
                        />
                      ) : (
                        <div className="text-[10px] text-slate-600">Sem preview</div>
                      )}
                    </div>

                    {/* Botões de Ação da Miniatura */}
                    <div className="w-full flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveThumbnail(idx, 'left')}
                          disabled={idx === 0 || item.isDeleted}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-20"
                          title="Mover para esquerda"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMoveThumbnail(idx, 'right')}
                          disabled={idx === pageThumbnails.length - 1 || item.isDeleted}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-20"
                          title="Mover para direita"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRotatePage(idx)}
                        disabled={item.isDeleted}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 disabled:opacity-20"
                        title={`Girar 90° (Atual: ${item.rotation}°)`}
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => handleToggleDeletePage(idx)}
                        className={`p-1 rounded transition-all ${
                          item.isDeleted 
                            ? 'bg-rose-900/60 text-rose-200' 
                            : 'bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400'
                        }`}
                        title={item.isDeleted ? 'Restaurar página' : 'Excluir página'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {organizeResult && (
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Documento Reorganizado com Sucesso!</h3>
                  <p className="text-xs text-slate-400">Páginas rotacionadas, ordenadas e filtradas com preservação de qualidade.</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  onClick={() => setOrganizeResult(null)}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Continuar Editando Páginas
                </button>

                <button
                  onClick={() => downloadFile(organizeResult.data, organizeResult.fileName)}
                  className="btn-action px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar PDF Reorganizado</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
