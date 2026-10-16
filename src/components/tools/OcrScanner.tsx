import React, { useState, useRef } from 'react';
import {
  ScanText,
  Upload,
  Copy,
  Check,
  RefreshCw,
  FileText,
  Trash2,
  Download,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Languages,
  Info,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  FileSearch,
  FileCheck,
  Sparkles,
  HelpCircle,
  Maximize2
} from 'lucide-react';
import {
  OcrDocumentService,
  InspectDocumentResult,
  DocumentPageMeta,
  OcrProcessedPage
} from '../../services/ocrDocumentService';
import { PdfTextExtractor } from '../../services/pdfTextExtractor';

// Suporte unificado de PDF e imagens via OcrDocumentService e PdfTextExtractor.extractTextWithBounds

export const OcrScanner: React.FC = () => {
  // Estado de Entrada e Inspeção Prévia
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [docInspection, setDocInspection] = useState<InspectDocumentResult | null>(null);
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [pageRangeInput, setPageRangeInput] = useState<string>('');
  const [ocrLanguage, setOcrLanguage] = useState<string>('por');

  // Estado de Execução OCR
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [progressState, setProgressState] = useState<{ message: string; percent: number }>({
    message: '',
    percent: 0
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado de Resultados e Revisão
  const [processedPages, setProcessedPages] = useState<OcrProcessedPage[] | null>(null);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [copiedPage, setCopiedPage] = useState<boolean>(false);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // Filtro de revisão
  const [reviewFilter, setReviewFilter] = useState<'all' | 'incomplete' | 'revised'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Manipulação e Inspeção Inicial de Arquivos
  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;

    setSelectedFiles(files);
    setDocInspection(null);
    setProcessedPages(null);
    setErrorMessage(null);
    setIsInspecting(true);

    try {
      const result = await OcrDocumentService.inspectDocument(files);
      setDocInspection(result);
      setPageRangeInput(`1-${result.totalPages}`);
    } catch (err: any) {
      console.error('[OcrScanner] Erro ao inspecionar documento:', err);
      setErrorMessage(`Não foi possível abrir o documento: ${err?.message || 'Formato incompatível ou arquivo corrompido'}`);
    } finally {
      setIsInspecting(false);
    }
  };

  const handleDropzoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(Array.from(e.target.files));
    }
  };

  // 2. Seleção de Páginas
  const togglePageSelection = (pageNum: number) => {
    if (!docInspection) return;
    setDocInspection(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pages: prev.pages.map(p =>
          p.pageNumber === pageNum ? { ...p, selected: !p.selected } : p
        )
      };
    });
  };

  const selectAllPages = (selected: boolean) => {
    if (!docInspection) return;
    setDocInspection(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pages: prev.pages.map(p => ({ ...p, selected }))
      };
    });
  };

  const selectEvenOddPages = (even: boolean) => {
    if (!docInspection) return;
    setDocInspection(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pages: prev.pages.map(p => ({
          ...p,
          selected: even ? p.pageNumber % 2 === 0 : p.pageNumber % 2 !== 0
        }))
      };
    });
  };

  const applyPageRange = (rangeStr: string) => {
    if (!docInspection) return;
    const total = docInspection.totalPages;
    const selectedIndices = new Set<number>();

    const parts = rangeStr.split(',').map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.max(1, Math.min(start, end));
          const max = Math.min(total, Math.max(start, end));
          for (let i = min; i <= max; i++) selectedIndices.add(i);
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 1 && num <= total) {
          selectedIndices.add(num);
        }
      }
    }

    setDocInspection(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pages: prev.pages.map(p => ({
          ...p,
          selected: selectedIndices.has(p.pageNumber)
        }))
      };
    });
  };

  // 3. Execução do OCR
  const handleRunOcr = async () => {
    if (!docInspection) return;
    const selectedPageNumbers = docInspection.pages
      .filter(p => p.selected)
      .map(p => p.pageNumber);

    if (selectedPageNumbers.length === 0) {
      setErrorMessage('Selecione pelo menos uma página para realizar o OCR.');
      return;
    }

    setIsScanning(true);
    setErrorMessage(null);
    setProgressState({ message: 'Preparando motor OCR offline...', percent: 5 });

    try {
      const results = await OcrDocumentService.processDocumentOcr(
        selectedFiles,
        selectedPageNumbers,
        ocrLanguage,
        (progress) => {
          setProgressState(progress);
        }
      );

      setProcessedPages(results);
      setActivePageIndex(0);
      setProgressState({ message: 'Processamento concluído com sucesso!', percent: 100 });
    } catch (err: any) {
      console.error('[OcrScanner] Falha durante o processamento OCR:', err);
      setErrorMessage(
        `[FALHA DE RECONHECIMENTO]: ${err?.message || 'Erro inesperado'}. O arquivo original foi preservado sem alterações.`
      );
    } finally {
      setIsScanning(false);
    }
  };

  // 4. Edição e Revisão em Tempo Real
  const handleUpdateActivePageText = (newText: string) => {
    if (!processedPages || !processedPages[activePageIndex]) return;

    setProcessedPages(prev => {
      if (!prev) return null;
      const updated = [...prev];
      const current = updated[activePageIndex];
      updated[activePageIndex] = {
        ...current,
        fullText: newText,
        isRevised: newText !== current.rawOcrText
      };
      return updated;
    });
  };

  const handleRestorePageOriginal = () => {
    if (!processedPages || !processedPages[activePageIndex]) return;
    handleUpdateActivePageText(processedPages[activePageIndex].rawOcrText);
  };

  // 5. Download do Documento Original Intacto (quando não for possível gerar o pesquisável)
  const handleDownloadOriginalDocument = () => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    const file = selectedFiles[0];
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 6. Geração de PDF Pesquisável (Searchable PDF / Sandwich PDF)
  const handleDownloadSearchablePdf = async () => {
    if (!processedPages || processedPages.length === 0) return;

    setIsGeneratingPdf(true);
    setErrorMessage(null);
    try {
      const docName = docInspection?.documentName || 'Documento';
      const cleanName = docName.replace(/\.[^/.]+$/, '');
      const title = `${cleanName} - Pesquisável (OCR)`;

      const pdfBytes = await OcrDocumentService.generateSearchablePdf(
        processedPages,
        {
          documentTitle: title,
          strictImagePreservation: true,
          onProgress: (percent) => {
            setProgressState({ message: `Compilando PDF Pesquisável... (${percent}%)`, percent });
          }
        }
      );

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanName}_Pesquisavel_OCR.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('[OcrScanner] Erro ao gerar PDF pesquisável:', err);
      const isPreservation = err?.name === 'ImagePreservationError' || err?.message?.includes('preservação visual');
      if (isPreservation) {
        setErrorMessage(
          `Geração cancelada por segurança: ${err.message}. O documento original permanece intacto sem perda visual.`
        );
      } else {
        setErrorMessage(`Erro ao gerar PDF pesquisável: ${err?.message || 'Falha na compilação'}`);
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 6. Exportação em Texto (TXT) e Cópia
  const handleDownloadAllText = () => {
    if (!processedPages) return;
    const fullText = processedPages
      .map(p => `=== [PÁGINA ${p.pageNumber}] ===\n${p.fullText}`)
      .join('\n\n--------------------------------------------------\n\n');

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const docName = docInspection?.documentName.replace(/\.[^/.]+$/, '') || 'Documento';
    a.download = `${docName}_Texto_Reconhecido_OCR.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyActivePage = () => {
    if (!processedPages || !processedPages[activePageIndex]) return;
    navigator.clipboard.writeText(processedPages[activePageIndex].fullText);
    setCopiedPage(true);
    setTimeout(() => setCopiedPage(false), 2000);
  };

  const handleCopyAllText = () => {
    if (!processedPages) return;
    const fullText = processedPages
      .map(p => `[Página ${p.pageNumber}]\n${p.fullText}`)
      .join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleResetAll = () => {
    setSelectedFiles([]);
    setDocInspection(null);
    setProcessedPages(null);
    setErrorMessage(null);
    setActivePageIndex(0);
  };

  // Métricas e diagnósticos agregados
  const selectedCount = docInspection ? docInspection.pages.filter(p => p.selected).length : 0;
  const activePage = processedPages ? processedPages[activePageIndex] : null;

  const incompleteCount = processedPages
    ? processedPages.filter(p => p.status === 'incomplete' || p.status === 'warning').length
    : 0;

  const avgConfidence = processedPages && processedPages.length > 0
    ? Math.round(processedPages.reduce((acc, p) => acc + p.confidence, 0) / processedPages.length)
    : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Corporativo / Judiciário */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <ScanText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span>OCR Documental & Conversor para PDF Pesquisável</span>
              </h2>
              <p className="text-xs text-slate-400">
                Processamento offline com suporte ao Português (Brasil). Reconheça, revise e gere documentos pesquisáveis sem mudar de ferramenta.
              </p>
            </div>
          </div>
        </div>

        {/* Idioma & Garantia Offline */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl">
          <Languages className="w-4 h-4 text-purple-400" />
          <label htmlFor="ocr-lang-select" className="text-xs font-semibold text-slate-300">
            Idioma:
          </label>
          <select
            id="ocr-lang-select"
            value={ocrLanguage}
            onChange={(e) => setOcrLanguage(e.target.value)}
            disabled={isScanning || isInspecting}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-purple-500 focus:outline-none"
          >
            <option value="por">🇧🇷 Português (por.traineddata Offline)</option>
            <option value="eng">🇺🇸 Inglês (eng)</option>
            <option value="spa">🇪🇸 Espanhol (spa)</option>
          </select>
        </div>
      </div>

      {/* ETAPA 1: Upload e Ingestão de Documentos (PDF ou Lote de Imagens) */}
      {!docInspection && !isInspecting && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="dropzone p-12 text-center cursor-pointer relative rounded-2xl border-2 border-dashed border-slate-800 hover:border-purple-500/60 bg-slate-900/40 hover:bg-slate-900/60 transition-all group shadow-inner"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp,image/tiff"
            multiple
            onChange={handleDropzoneChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform shadow-lg shadow-purple-600/10">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-100">
                Arraste um PDF digitalizado ou fotos de autos processuais
              </p>
              <p className="text-xs text-slate-400 mt-1.5 max-w-lg mx-auto leading-relaxed">
                Suporta autos judiciais, inquéritos, certidões e contratos em <strong>PDF</strong> de múltiplas páginas ou imagens (PNG, JPG, TIFF, WEBP).
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-purple-300 bg-purple-950/40 border border-purple-500/20 px-3 py-1 rounded-full font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>100% Offline: nenhuma informação ou imagem sai da sua máquina</span>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de Carregamento / Inspeção Inicial */}
      {isInspecting && (
        <div className="p-10 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-sm font-semibold text-slate-200">
            Lendo estrutura e gerando miniaturas do documento...
          </p>
          <p className="text-xs text-slate-400">Preparando páginas para seleção e processamento óptico.</p>
        </div>
      )}

      {/* Erro Geral / Falha de Reconhecimento */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-red-300">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold mb-0.5">[FALHA DE RECONHECIMENTO] Aviso de Operação</strong>
              <span>{errorMessage}</span>
              <p className="text-[11px] text-slate-400 mt-1">O arquivo original foi preservado integralmente.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={handleRunOcr}
              className="px-3.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Tentar Novamente</span>
            </button>
            <button
              onClick={handleRunOcr}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Nova Tentativa</span>
            </button>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-200 font-bold px-2 py-1 text-sm"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 2: Seleção de Páginas e Painel de Controle */}
      {docInspection && !processedPages && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-800 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-slate-100 truncate max-w-md" title={docInspection.documentName}>
                    {docInspection.documentName}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                    {docInspection.totalPages} página(s) detectada(s)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {(docInspection.fileSize / (1024 * 1024)).toFixed(2)} MB • Selecione as folhas que deseja reconhecer e converter em PDF pesquisável.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetAll}
                  disabled={isScanning}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Trocar Arquivo</span>
                </button>

                <button
                  onClick={handleRunOcr}
                  disabled={isScanning || selectedCount === 0}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{progressState.message || 'Processando OCR...'} ({progressState.percent}%)</span>
                    </>
                  ) : (
                    <>
                      <ScanText className="w-4 h-4" />
                      <span>Reconhecer {selectedCount} Página(s) com OCR</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Barra de Seleção Rápida de Páginas */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-slate-300 mr-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  Seleção Rápida:
                </span>
                <button
                  type="button"
                  onClick={() => selectAllPages(true)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium"
                >
                  Todas ({docInspection.totalPages})
                </button>
                <button
                  type="button"
                  onClick={() => selectEvenOddPages(false)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium"
                >
                  Ímpares
                </button>
                <button
                  type="button"
                  onClick={() => selectEvenOddPages(true)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium"
                >
                  Pares
                </button>
                <button
                  type="button"
                  onClick={() => selectAllPages(false)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] font-medium"
                >
                  Desmarcar Todas
                </button>
              </div>

              {/* Intervalo de Páginas */}
              <div className="flex items-center gap-2">
                <label className="text-slate-400 text-[11px]">Intervalo:</label>
                <input
                  type="text"
                  value={pageRangeInput}
                  onChange={(e) => setPageRangeInput(e.target.value)}
                  placeholder="Ex: 1-5, 8, 12"
                  className="w-28 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs text-center focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => applyPageRange(pageRangeInput)}
                  className="px-2.5 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-[11px] font-semibold"
                >
                  Aplicar
                </button>
              </div>
            </div>

            {/* Barra de Progresso Durante OCR */}
            {isScanning && (
              <div className="space-y-1.5 p-3 rounded-xl bg-purple-950/20 border border-purple-500/30">
                <div className="flex justify-between text-xs text-slate-300 font-medium">
                  <span className="flex items-center gap-1.5 text-purple-300">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {progressState.message}
                  </span>
                  <span className="font-bold text-purple-400">{progressState.percent}%</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressState.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Grade Visual de Páginas com Miniaturas */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto pr-1">
              {docInspection.pages.map((p) => (
                <div
                  key={p.pageNumber}
                  onClick={() => togglePageSelection(p.pageNumber)}
                  className={`relative p-2.5 rounded-xl border text-center cursor-pointer transition-all flex flex-col items-center justify-between group ${
                    p.selected
                      ? 'bg-purple-950/30 border-purple-500 text-slate-100 shadow-md shadow-purple-500/10 ring-1 ring-purple-500/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 opacity-60'
                  }`}
                >
                  <div className="w-full aspect-[3/4] bg-slate-900 rounded-lg overflow-hidden border border-slate-800/80 mb-2 flex items-center justify-center relative">
                    {p.thumbnailUrl ? (
                      <img
                        src={p.thumbnailUrl}
                        alt={`Página ${p.pageNumber}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <FileText className="w-8 h-8 text-slate-700" />
                    )}

                    <div
                      className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition-all ${
                        p.selected
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-slate-900/90 border border-slate-700 text-transparent'
                      }`}
                    >
                      ✓
                    </div>
                  </div>

                  <div className="w-full flex items-center justify-between text-[11px] px-1">
                    <span className="font-bold text-slate-200">Pág. {p.pageNumber}</span>
                    <span className="text-[10px] text-slate-400">{p.width}x{p.height}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ETAPA 3: REVISÃO INTEGRADA EM PAINEL DIVIDIDO (SPLIT VIEW) & GERAÇÃO DE PDF PESQUISÁVEL */}
      {processedPages && activePage && (
        <div className="space-y-4">
          {/* Banner de Segurança / Falha de Preservação Visual na Geração do PDF Pesquisável */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-red-300">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="block font-bold text-red-200 mb-0.5">
                    [SEGURANÇA DOCUMENTAL] A geração do PDF pesquisável foi interrompida
                  </strong>
                  <span>{errorMessage}</span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Para garantir que nenhuma página seja gerada em branco ou sem a imagem original, você pode baixar o documento intacto ou exportar o texto reconhecido.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                {selectedFiles.length > 0 && (
                  <button
                    onClick={handleDownloadOriginalDocument}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                    title="Baixar o arquivo original intacto sem camada pesquisável"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>Baixar Original Intacto</span>
                  </button>
                )}
                <button
                  onClick={handleDownloadAllText}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                  title="Exportar transcrição textual em arquivo .TXT"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exportar TXT</span>
                </button>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-red-400 hover:text-red-200 font-bold px-2 py-1 text-sm"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Card de Resumo e Ações Globais */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-100">
                    Reconhecimento OCR Concluído ({processedPages.length} páginas)
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                    Confiança Média: <strong className={avgConfidence >= 75 ? 'text-emerald-400' : 'text-amber-400'}>{avgConfidence}%</strong>
                  </span>
                  {incompleteCount > 0 ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      {incompleteCount} página(s) com reconhecimento incompleto
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Reconhecimento Óptico de Texto Concluído
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Revise e ajuste o texto diretamente ao lado da imagem original antes de exportar o PDF pesquisável.
                </p>
              </div>
            </div>

            {/* Ações de Exportação Primárias */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadAllText}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
                title="Baixar todo o texto em formato TXT"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                <span>Baixar TXT</span>
              </button>

              <button
                onClick={handleCopyAllText}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
                title="Copiar texto de todas as páginas"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAll ? 'Copiado!' : 'Copiar Tudo'}</span>
              </button>

              <button
                onClick={handleDownloadSearchablePdf}
                disabled={isGeneratingPdf}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
              >
                {isGeneratingPdf ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Gerando PDF Pesquisável...</span>
                  </>
                ) : (
                  <>
                    <FileSearch className="w-4 h-4" />
                    <span>📥 Gerar PDF Pesquisável (Searchable)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Banner de Diagnóstico de Reconhecimento Incompleto (se houver) */}
          {activePage.status === 'incomplete' && activePage.issues.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 font-bold">
                  [AVISO DE RECONHECIMENTO] Indicação de Reconhecimento Incompleto na Página {activePage.pageNumber} (Confiança: {activePage.confidence}%):
                </strong>
                <ul className="list-disc list-inside text-amber-200/90 mt-1 space-y-0.5">
                  {activePage.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Edite o texto no painel à direita para corrigir termos apagados antes de gerar o documento final.
                </p>
              </div>
            </div>
          )}

          {/* Painel Dividido (Split View): Imagem Original à Esquerda / Editor de Revisão à Direita */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Lado Esquerdo: Imagem Digitalizada da Página */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-purple-400" />
                  Imagem Original Escaneada • Pág. {activePage.pageNumber}
                </span>

                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                  {activePage.width} × {activePage.height} pt
                </span>
              </div>

              <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800/80 overflow-auto flex items-center justify-center p-3 max-h-[600px] min-h-[380px]">
                {activePage.previewImageUrl ? (
                  <img
                    src={activePage.previewImageUrl}
                    alt={`Página ${activePage.pageNumber}`}
                    className="max-w-full max-h-[560px] object-contain rounded shadow-md border border-slate-800"
                  />
                ) : (
                  <div className="text-slate-600 text-xs flex flex-col items-center gap-2">
                    <FileText className="w-8 h-8" />
                    <span>Visualização de imagem indisponível para esta página</span>
                  </div>
                )}
              </div>
            </div>

            {/* Lado Direito: Editor de Revisão de Texto em Tempo Real */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-emerald-400" />
                    Texto Reconhecido (Editável para Correção)
                  </span>
                  {activePage.isRevised && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      ✏️ Revisado Manualmente
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {activePage.isRevised && (
                    <button
                      onClick={handleRestorePageOriginal}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1"
                      title="Restaurar reconhecimento bruto original do OCR"
                    >
                      <RotateCcw className="w-3 h-3 text-purple-400" />
                      <span>Restaurar</span>
                    </button>
                  )}

                  <button
                    onClick={handleCopyActivePage}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1"
                  >
                    {copiedPage ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPage ? 'Copiado!' : 'Copiar Pág.'}</span>
                  </button>
                </div>
              </div>

              <textarea
                value={activePage.fullText}
                onChange={(e) => handleUpdateActivePageText(e.target.value)}
                placeholder="Nenhum texto identificado nesta página..."
                className="w-full flex-1 min-h-[460px] p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner resize-none"
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>
                  {activePage.fullText.length} caracteres • {activePage.fullText.split(/\s+/).filter(Boolean).length} palavras
                </span>
                <span className="italic">
                  O texto editado acima será automaticamente embutido na camada pesquisável do PDF.
                </span>
              </div>
            </div>
          </div>

          {/* Navegador e Barra de Miniaturas das Páginas */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">
                  Navegação de Páginas ({processedPages.length}):
                </span>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
                    disabled={activePageIndex === 0}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-semibold text-purple-300 px-1">
                    {activePageIndex + 1} de {processedPages.length}
                  </span>
                  <button
                    onClick={() => setActivePageIndex(prev => Math.min(processedPages.length - 1, prev + 1))}
                    disabled={activePageIndex === processedPages.length - 1}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <button
                onClick={handleResetAll}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                Processar Outro Documento
              </button>
            </div>

            {/* Faixa de Miniaturas */}
            <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
              {processedPages.map((p, idx) => (
                <button
                  key={p.pageNumber}
                  type="button"
                  onClick={() => setActivePageIndex(idx)}
                  className={`p-1.5 rounded-xl border text-left shrink-0 transition-all flex flex-col items-center w-20 ${
                    idx === activePageIndex
                      ? 'bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-500/20 ring-1 ring-purple-500/50'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="w-16 h-20 bg-slate-900 rounded-lg overflow-hidden border border-slate-800/80 mb-1 flex items-center justify-center relative">
                    {p.previewImageUrl ? (
                      <img
                        src={p.previewImageUrl}
                        alt={`Pág ${p.pageNumber}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <FileText className="w-5 h-5 text-slate-700" />
                    )}

                    {/* Status badge no canto da miniatura */}
                    <div className="absolute top-1 right-1">
                      {p.isRevised ? (
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] text-white font-bold" title="Revisado">
                          ✓
                        </div>
                      ) : p.status === 'incomplete' ? (
                        <div className="w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center text-[8px] text-black font-bold" title="Reconhecimento incompleto">
                          !
                        </div>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full bg-slate-700 text-[8px]" />
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-slate-300">Pág. {p.pageNumber}</span>
                  <span className={`text-[9px] font-semibold ${p.confidence >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {p.confidence}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
