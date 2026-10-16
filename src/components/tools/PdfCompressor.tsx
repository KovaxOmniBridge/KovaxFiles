import React, { useState, useEffect, useRef } from 'react';
import { 
  FileArchive, Upload, Download, CheckCircle2, AlertCircle, RefreshCw, Zap, 
  Layers, PackageCheck, FileText, Hash, ShieldCheck, FolderArchive, FileSpreadsheet,
  FileType, Image, FileCode, Archive, Sparkles, Settings2, ChevronDown, ChevronUp,
  FileSignature, ShieldAlert, Award, Sliders, Trash2, AlertTriangle, Eye, X
} from 'lucide-react';
import { 
  TARGET_PRESETS, TargetPreset, CoreCompressionService, VolumeBundleOutput, 
  DirectCompressOutput, GenericZipOutput, AdvancedCompressOptions,
  PdfWorkflowMode 
} from '../../core/compression';
import * as pdfjsLib from 'pdfjs-dist';

export type CompressorMode = 'direct_pdf' | 'volume_pdf' | 'generic_zip';

export const PdfCompressor: React.FC = () => {
  const [activeMode, setActiveMode] = useState<CompressorMode>('generic_zip');
  const [workflowMode, setWorkflowMode] = useState<PdfWorkflowMode>('unsigned_optimization');
  const [generateConsultationCopy, setGenerateConsultationCopy] = useState<boolean>(true);
  const [selectedPreset, setSelectedPreset] = useState<TargetPreset>(TARGET_PRESETS[0]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processNumber, setProcessNumber] = useState<string>('');
  const [packageTitle, setPackageTitle] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Configurações Avançadas Opcionais
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedCompressOptions>({
    workflowMode: 'unsigned_optimization',
    enableImageReencode: false,
    imageQuality: 0.70,
    maxDpi: 150,
    grayscale: false,
    detectSignatures: true,
    enablePdfA: false,
    generateAuditCertificate: false,
    operatorDepartment: 'Departamento Jurídico / Prefeitura'
  });

  // Results states
  const [directResult, setDirectResult] = useState<DirectCompressOutput[] | null>(null);
  const [volumeResult, setVolumeResult] = useState<VolumeBundleOutput | null>(null);
  const [zipResult, setZipResult] = useState<GenericZipOutput | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progressInfo, setProgressInfo] = useState<{ message: string; percent: number } | null>(null);

  const [customMaxSizeMB, setCustomMaxSizeMB] = useState<number>(20);
  const [detectedSignedFiles, setDetectedSignedFiles] = useState<{ name: string; count: number }[]>([]);
  const [confirmSignedReencode, setConfirmSignedReencode] = useState<boolean>(false);
  const [comparisonModalData, setComparisonModalData] = useState<{
    originalBuffer: ArrayBuffer;
    compressedBuffer: Uint8Array;
    originalSize: number;
    newSize: number;
    fileName: string;
  } | null>(null);
  const canvasOriginalRef = useRef<HTMLCanvasElement | null>(null);
  const canvasCompressedRef = useRef<HTMLCanvasElement | null>(null);

  // Efeito para renderização da comparação visual antes/depois no canvas
  useEffect(() => {
    if (!comparisonModalData) return;
    let isCancelled = false;

    const renderComparison = async () => {
      try {
        const origTask = pdfjsLib.getDocument({ data: new Uint8Array(comparisonModalData.originalBuffer) });
        const origPdf = await origTask.promise;
        const origPage = await origPdf.getPage(1);
        const origViewport = origPage.getViewport({ scale: 0.8 });

        if (canvasOriginalRef.current && !isCancelled) {
          canvasOriginalRef.current.width = origViewport.width;
          canvasOriginalRef.current.height = origViewport.height;
          const ctxOrig = canvasOriginalRef.current.getContext('2d');
          if (ctxOrig) {
            await origPage.render({ canvasContext: ctxOrig, viewport: origViewport }).promise;
          }
        }

        const compTask = pdfjsLib.getDocument({ data: new Uint8Array(comparisonModalData.compressedBuffer) });
        const compPdf = await compTask.promise;
        const compPage = await compPdf.getPage(1);
        const compViewport = compPage.getViewport({ scale: 0.8 });

        if (canvasCompressedRef.current && !isCancelled) {
          canvasCompressedRef.current.width = compViewport.width;
          canvasCompressedRef.current.height = compViewport.height;
          const ctxComp = canvasCompressedRef.current.getContext('2d');
          if (ctxComp) {
            await compPage.render({ canvasContext: ctxComp, viewport: compViewport }).promise;
          }
        }
      } catch (err) {
        console.error('Erro ao renderizar comparação visual:', err);
      }
    };

    renderComparison();
    return () => { isCancelled = true; };
  }, [comparisonModalData]);

  // Verificação preventiva e automática de assinaturas digitais nos arquivos PDF selecionados
  useEffect(() => {
    let isCancelled = false;
    const checkSignatures = async () => {
      const signedList: { name: string; count: number }[] = [];
      for (const file of selectedFiles) {
        if (file.name.toLowerCase().endsWith('.pdf')) {
          try {
            const buf = await file.slice(0, 5000000).arrayBuffer();
            const res = CoreCompressionService.detectDigitalSignatures(buf);
            if (res.hasSignatures) {
              signedList.push({ name: file.name, count: res.signatureCount });
            }
          } catch {}
        }
      }
      if (!isCancelled) {
        setDetectedSignedFiles(signedList);
        if (signedList.length === 0) {
          setConfirmSignedReencode(false);
          setAdvancedOptions(prev => ({ ...prev, allowSignedPdfReencoding: false }));
        }
      }
    };
    checkSignatures();
    return () => { isCancelled = true; };
  }, [selectedFiles]);

  const resetResults = () => {
    setDirectResult(null);
    setVolumeResult(null);
    setZipResult(null);
    setErrorMessage(null);
    setProgressInfo(null);
  };

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArr]);
      resetResults();
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArr = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...filesArr]);
      resetResults();
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    resetResults();
  };

  const moveFileUp = (index: number) => {
    if (index === 0) return;
    setSelectedFiles(prev => {
      const arr = [...prev];
      const temp = arr[index - 1];
      arr[index - 1] = arr[index];
      arr[index] = temp;
      return arr;
    });
    resetResults();
  };

  const moveFileDown = (index: number) => {
    setSelectedFiles(prev => {
      if (index >= prev.length - 1) return prev;
      const arr = [...prev];
      const temp = arr[index + 1];
      arr[index + 1] = arr[index];
      arr[index] = temp;
      return arr;
    });
    resetResults();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTotalSelectedSize = () => {
    return selectedFiles.reduce((acc, f) => acc + f.size, 0);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-400 shrink-0" />;
      case 'csv':
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'docx':
      case 'doc':
      case 'txt':
      case 'md':
        return <FileType className="w-4 h-4 text-blue-400 shrink-0" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'heic':
        return <Image className="w-4 h-4 text-purple-400 shrink-0" />;
      default:
        return <FileCode className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  const processExecution = async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setProgressInfo({ message: 'Iniciando processamento offline...', percent: 0 });
    resetResults();

    try {
      if (detectedSignedFiles.length > 0 && !confirmSignedReencode) {
        throw new Error(
          `OPERAÇÃO BLOQUEADA POR SEGURANÇA JURÍDICA: O(s) arquivo(s) [${detectedSignedFiles.map(d => d.name).join(', ')}] possui(em) assinatura digital válida. Para prosseguir ciente de que as assinaturas serão removidas/invalidadas, marque a caixa de autorização expressa no alerta exibido.`
        );
      }

      const fileBuffers = await Promise.all(
        selectedFiles.map(async f => ({
          name: f.name,
          buffer: await f.arrayBuffer()
        }))
      );

      if (activeMode === 'direct_pdf') {
        const invalidFiles = selectedFiles.filter(f => {
          const ext = f.name.toLowerCase().split('.').pop();
          return !['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext || '');
        });
        if (invalidFiles.length > 0) {
          throw new Error('O modo "Comprimir Arquivo Direto" aceita apenas arquivos .PDF ou Imagens (.JPG, .PNG, .WEBP). Para outros formatos (.docx, .xlsx), utilize o modo "Criar Pacote ZIP".');
        }

        const results: DirectCompressOutput[] = [];
        const totalFiles = fileBuffers.length;

        const effectiveOptions: AdvancedCompressOptions = {
          ...advancedOptions,
          workflowMode,
          generateConsultationCopy,
          allowSignedPdfReencoding: confirmSignedReencode
        };

        for (let i = 0; i < totalFiles; i++) {
          const f = fileBuffers[i];
          const ext = f.name.toLowerCase().split('.').pop();
          
          const filePrefix = totalFiles > 1 ? `[${i + 1}/${totalFiles}] ` : '';
          const handleProgress = (p: { message: string; percent: number }) => {
            const overall = Math.round(((i + (p.percent / 100)) / totalFiles) * 100);
            setProgressInfo({ message: `${filePrefix}${p.message}`, percent: overall });
          };

          if (ext === 'pdf') {
            const res = await CoreCompressionService.compressDirectPdf(f.buffer, f.name, effectiveOptions, handleProgress);
            results.push(res);
          } else {
            handleProgress({ message: 'Otimizando imagem...', percent: 50 });
            const res = await CoreCompressionService.compressDirectImage(f.buffer, f.name, effectiveOptions);
            results.push(res);
          }
        }
        setDirectResult(results);

      } else if (activeMode === 'volume_pdf') {
        const nonPdfs = selectedFiles.filter(f => !f.name.toLowerCase().endsWith('.pdf'));
        if (nonPdfs.length > 0) {
          throw new Error('O modo "Fracionar em Volumes" aceita apenas arquivos .PDF. Para outros formatos (.docx, .xlsx, .csv), utilize o modo "Criar Pacote ZIP".');
        }

        const effectivePreset = selectedPreset.id === 'custom'
          ? { ...selectedPreset, maxSizeMB: customMaxSizeMB }
          : selectedPreset;

        const res = await CoreCompressionService.packIntoVolumeBundle(
          fileBuffers,
          effectivePreset,
          {
            processNumber,
            title: packageTitle || selectedFiles[0].name.replace(/\.[^/.]+$/, ''),
            advanced: {
              ...advancedOptions,
              workflowMode,
              customMaxSizeMB: selectedPreset.id === 'custom' ? customMaxSizeMB : undefined,
              allowSignedPdfReencoding: confirmSignedReencode
            }
          },
          (prog: any) => setProgressInfo(prog)
        );
        setVolumeResult(res);

      } else if (activeMode === 'generic_zip') {
        setProgressInfo({ message: 'Compactando pacote ZIP...', percent: 50 });
        const zipName = packageTitle || 'Pacote_Arquivos_Compactado';
        const res = await CoreCompressionService.createGenericZipPackage(fileBuffers, zipName);
        setProgressInfo({ message: 'Pacote ZIP concluído!', percent: 100 });
        setZipResult(res);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao processar os arquivos.');
    } finally {
      setIsProcessing(false);
      setProgressInfo(null);
    }
  };

  const downloadFile = (data: Uint8Array, fileName: string, mimeType: string) => {
    const blob = new Blob([new Uint8Array(data)], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Tool Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Archive className="w-6 h-6 text-blue-400" />
              Compressor & Empacotador Multiformato
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Offline (LGPD)
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Comprima PDFs, fracione documentos para portais públicos (PJe, TJSP) ou empacote arquivos de qualquer formato (.pdf, .docx, .xlsx, .csv, .txt) em pacotes ZIP.
          </p>
        </div>
      </div>

      {/* Mode Selector Cards */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
          Selecione o que você deseja fazer:
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Mode 1: Generic ZIP */}
          <button
            onClick={() => { setActiveMode('generic_zip'); resetResults(); }}
            className={`p-4 rounded-xl text-left border transition-all duration-200 ${
              activeMode === 'generic_zip'
                ? 'bg-blue-600/20 border-blue-500 text-slate-100 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/50'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <FolderArchive className="w-6 h-6 text-purple-400" />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Multiformato
              </span>
            </div>
            <div className="text-xs font-bold text-slate-200 mb-1">📦 Criar Pacote Compactado (.ZIP)</div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Junte múltiplos arquivos (.pdf, .docx, .xlsx, .csv, .txt, imagens) em um único pacote ZIP super compactado.
            </div>
          </button>

          {/* Mode 2: Volume PDF */}
          <button
            onClick={() => { setActiveMode('volume_pdf'); resetResults(); }}
            className={`p-4 rounded-xl text-left border transition-all duration-200 ${
              activeMode === 'volume_pdf'
                ? 'bg-blue-600/20 border-blue-500 text-slate-100 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/50'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Layers className="w-6 h-6 text-blue-400" />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Portais Públicos
              </span>
            </div>
            <div className="text-xs font-bold text-slate-200 mb-1">📚 Fracionar em Volumes (PDF)</div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Divida PDFs grandes em volumes com Capa de Juntada (limites de 3MB PJe, 10MB TJSP, 5MB TRF).
            </div>
          </button>

          {/* Mode 3: Direct PDF Compress */}
          <button
            onClick={() => { setActiveMode('direct_pdf'); resetResults(); }}
            className={`p-4 rounded-xl text-left border transition-all duration-200 ${
              activeMode === 'direct_pdf'
                ? 'bg-blue-600/20 border-blue-500 text-slate-100 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/50'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-6 h-6 text-emerald-400" />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Rápido
              </span>
            </div>
            <div className="text-xs font-bold text-slate-200 mb-1">🗜️ Comprimir Arquivo Direto (PDF / Imagem)</div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Otimize o tamanho de PDFs ou Imagens (.JPG, .PNG) mantendo o formato original, sem gerar arquivos ZIP.
            </div>
          </button>
        </div>

        {/* Mode Context Banner */}
        <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-center gap-3 text-xs transition-all">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-200 flex items-center gap-2">
              {activeMode === 'generic_zip' && '📦 Pacote Compactado Multiformato (.ZIP)'}
              {activeMode === 'volume_pdf' && '📚 Fracionamento de Volumes para Portais Judiciais'}
              {activeMode === 'direct_pdf' && '🗜️ Otimização Direta de PDF & Imagens em Lote'}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {activeMode === 'generic_zip' && 'Ideal para enviar conjuntos heterogêneos de arquivos (.docx, .xlsx, .csv, .pdf) por e-mail ou protocolo municipal.'}
              {activeMode === 'volume_pdf' && 'Divide PDFs grandes respeitando o limite máximo em MB do tribunal (ex: PJe 3MB, TJSP 10MB) com Capa de Juntada e Sumário Oficial.'}
              {activeMode === 'direct_pdf' && 'Otimiza arquivos individuais em lote, com descarte de páginas em branco, sanitização rígida PJe/e-SAJ e relatório LGPD.'}
            </p>
          </div>
        </div>
      </div>

      {/* SELETOR DE FLUXO DE INTEGRIDADE JURÍDICA */}
      {activeMode !== 'generic_zip' && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Fluxo de Integridade Jurídica & Assinaturas:</span>
            </label>
            <span className="text-[10px] text-slate-400 font-medium">
              Separação estrita conforme normas da ICP-Brasil & CNJ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Fluxo 1: Otimização Não Assinados */}
            <button
              type="button"
              onClick={() => {
                setWorkflowMode('unsigned_optimization');
                setAdvancedOptions(prev => ({ ...prev, workflowMode: 'unsigned_optimization' }));
                resetResults();
              }}
              className={`p-3.5 rounded-xl text-left border transition-all ${
                workflowMode === 'unsigned_optimization'
                  ? 'bg-emerald-950/30 border-emerald-500 text-slate-100 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  🟢 Otimização Não Assinados
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                  Padrão
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Para minutas, peças iniciais e anexos que <strong>ainda não foram assinados</strong>. Bloqueia PDFs assinados para resguardar a validade.
              </p>
            </button>

            {/* Fluxo 2: Preparação Pré-Assinatura */}
            <button
              type="button"
              onClick={() => {
                setWorkflowMode('pre_signature_preparation');
                setAdvancedOptions(prev => ({ ...prev, workflowMode: 'pre_signature_preparation', enablePdfA: true }));
                resetResults();
              }}
              className={`p-3.5 rounded-xl text-left border transition-all ${
                workflowMode === 'pre_signature_preparation'
                  ? 'bg-amber-950/30 border-amber-500 text-slate-100 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  🟡 Preparação Pré-Assinatura
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                  Padronização XMP/sRGB
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Normaliza, expurga scripts dinâmicos, enquadra no limite do tribunal e padroniza metadados <strong>antes</strong> de assinar com ICP-Brasil/Gov.br.
              </p>
            </button>

            {/* Fluxo 3: Documentos Já Assinados */}
            <button
              type="button"
              onClick={() => {
                setWorkflowMode('signed_preservation');
                setAdvancedOptions(prev => ({ ...prev, workflowMode: 'signed_preservation' }));
                resetResults();
              }}
              className={`p-3.5 rounded-xl text-left border transition-all ${
                workflowMode === 'signed_preservation'
                  ? 'bg-blue-950/30 border-blue-500 text-slate-100 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  🔵 Documentos Já Assinados
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">
                  Custódia Estrita
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                <strong>Preserva a matriz original 100% intacta</strong>. Audita assinaturas, emite Relatório Técnico de Custódia e gera cópia desvinculada para consulta.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Preset options if Volume PDF mode */}
      {activeMode === 'volume_pdf' && (
        <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="block text-xs font-bold text-blue-300 uppercase tracking-wider">
              Selecione o Portal Alvo (Limite por Volume):
            </label>
            <span className="text-[10.5px] text-slate-400">
              * Limites técnicos unificados vinculados a normas específicas (não são regras universais)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {TARGET_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setSelectedPreset(preset.id === 'custom' ? { ...preset, maxSizeMB: customMaxSizeMB } : preset);
                  resetResults();
                }}
                className={`p-2.5 rounded-lg text-left border text-xs transition-all flex flex-col justify-between ${
                  selectedPreset.id === preset.id
                    ? 'bg-blue-600/30 border-blue-400 text-slate-100 font-semibold shadow-md'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
                title={`${preset.name} • ${preset.courtScope} • Norma: ${preset.normativeReference}`}
              >
                <div>
                  <div className="font-bold text-slate-200 truncate">{preset.name}</div>
                  <div className="text-[9.5px] text-slate-400 truncate mt-0.5" title={preset.courtScope}>
                    {preset.courtScope}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-blue-400 mt-2 pt-1 border-t border-slate-800/80">
                  <span className="truncate max-w-[120px]">{preset.versionOrDate}</span>
                  <span className="font-bold shrink-0">
                    {preset.id === 'custom' ? `${customMaxSizeMB} MB` : `${preset.maxSizeMB} MB`}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {selectedPreset && (
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="font-bold text-slate-200">{selectedPreset.name}</span>
                <span className="font-mono text-blue-400 text-[10.5px]">{selectedPreset.normativeReference}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                <strong className="text-slate-300">Escopo Jurisdicional:</strong> {selectedPreset.courtScope}
              </div>
              {selectedPreset.notes && (
                <div className="text-[10px] text-amber-300/80 italic">
                  Nota Prática: {selectedPreset.notes}
                </div>
              )}
            </div>
          )}

          {selectedPreset.id === 'custom' && (
            <div className="mt-3 p-3 rounded-lg bg-blue-900/30 border border-blue-500/40 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-slate-200">Definir Limite Personalizado do Portal:</div>
                <div className="text-[11px] text-slate-400">Informe o tamanho máximo exato por volume aceito pelo tribunal ou sistema municipal.</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.5"
                  max="100"
                  step="0.5"
                  value={customMaxSizeMB}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 1;
                    setCustomMaxSizeMB(val);
                    setSelectedPreset(prev => ({ ...prev, maxSizeMB: val }));
                    setAdvancedOptions(prev => ({ ...prev, customMaxSizeMB: val }));
                    resetResults();
                  }}
                  className="w-24 px-3 py-1.5 rounded-lg bg-slate-950 border border-blue-500 text-slate-100 font-bold text-xs focus:outline-none"
                />
                <span className="text-xs text-blue-300 font-bold">MB</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Title & Metadata Option */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
            Título do Pacote / Nome do Arquivo Final:
          </label>
          <input
            type="text"
            placeholder={activeMode === 'generic_zip' ? 'Ex: Documentacao_Empresa_2024' : 'Ex: Peticao_e_Anexos'}
            value={packageTitle}
            onChange={(e) => setPackageTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        {activeMode === 'volume_pdf' && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Número do Processo (Opcional - Capa de Juntada):
            </label>
            <input
              type="text"
              placeholder="Ex: 5001234-56.2024.8.26.0100"
              value={processNumber}
              onChange={(e) => setProcessNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* CONFIGURAÇÕES AVANÇADAS OPCIONAIS (PAINEL SANFONA) */}
      {activeMode !== 'generic_zip' && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-950/10 overflow-hidden transition-all">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-purple-300 hover:bg-purple-900/20 transition-all"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-purple-400" />
              <span>⚙️ Configurações Avançadas de Governança & Otimização (Opcional)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-normal text-purple-400/80 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                {advancedOptions.enableImageReencode || advancedOptions.enablePdfA || advancedOptions.generateAuditCertificate ? 'Ativadas' : 'Padrão'}
              </span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showAdvanced && (
            <div className="p-4 pt-2 border-t border-purple-500/20 space-y-4 bg-slate-950/40 text-xs">
              {/* Opção 1: Recompactação de Imagem & DPI */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={advancedOptions.enableImageReencode || false}
                      onChange={(e) => setAdvancedOptions(prev => ({ ...prev, enableImageReencode: e.target.checked }))}
                      className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-purple-500"
                    />
                    <span>🖼️ Recompactar Imagens Internas & Ajustar DPI (HTML5 Canvas WASM)</span>
                  </label>
                  <span className="text-[10px] text-emerald-400 font-medium">Redução de até 90% em Scans</span>
                </div>

                {advancedOptions.enableImageReencode && (
                  <div className="pl-6 pt-2 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Resolução Alvo (DPI):</label>
                      <select
                        value={advancedOptions.maxDpi || 150}
                        onChange={(e) => setAdvancedOptions(prev => ({ ...prev, maxDpi: Number(e.target.value) }))}
                        className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                      >
                        <option value={100}>100 DPI (Compressão Máxima)</option>
                        <option value={150}>150 DPI (Recomendado Portais)</option>
                        <option value={200}>200 DPI (Alta Qualidade)</option>
                        <option value={300}>300 DPI (Sem redução de DPI)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Qualidade JPEG:</label>
                      <select
                        value={advancedOptions.imageQuality || 0.70}
                        onChange={(e) => setAdvancedOptions(prev => ({ ...prev, imageQuality: Number(e.target.value) }))}
                        className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                      >
                        <option value={0.50}>50% (Muito Leve)</option>
                        <option value={0.70}>70% (Equilibrado / Padrão)</option>
                        <option value={0.85}>85% (Alta Nitidez)</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={advancedOptions.grayscale || false}
                          onChange={(e) => setAdvancedOptions(prev => ({ ...prev, grayscale: e.target.checked }))}
                          className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-purple-500"
                        />
                        <span>Tons de Cinza (Grayscale)</span>
                      </label>
                    </div>

                    {advancedOptions.enableImageReencode && ((advancedOptions.imageQuality || 0.7) <= 0.50 || (advancedOptions.maxDpi || 150) <= 100) && (
                      <div className="col-span-full mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                        <span><strong>Aviso de Degradação Visual:</strong> Resolução de 100 DPI ou qualidade ≤ 50% reduz bastante o tamanho, mas pode dificultar a leitura de carimbos, assinaturas manuscritas ou notas de rodapé pequenas em petições.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Opção 2: Detecção de Assinaturas ICP-Brasil */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advancedOptions.detectSignatures !== false}
                    onChange={(e) => setAdvancedOptions(prev => ({ ...prev, detectSignatures: e.target.checked }))}
                    className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-purple-500"
                  />
                  <span>🔏 Detectar Assinaturas Digitais Existentes (ICP-Brasil / PKCS#7)</span>
                </label>
                <span className="text-[10px] text-slate-400">Emite aviso prévio de integridade</span>
              </div>

              {/* Opção 3: Padronização Arquivística Preliminar (XMP/sRGB) */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advancedOptions.enablePdfA || false}
                    onChange={(e) => setAdvancedOptions(prev => ({ ...prev, enablePdfA: e.target.checked }))}
                    className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-purple-500"
                  />
                  <span>🏛️ Padronização Arquivística de Metadados (XMP & Perfil sRGB)</span>
                </label>
                <span className="text-[10px] text-blue-400">Metadados XMP/sRGB</span>
              </div>

              {/* Opção 4: Relatório Técnico de Processamento e Integridade */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={advancedOptions.generateAuditCertificate || false}
                      onChange={(e) => setAdvancedOptions(prev => ({ ...prev, generateAuditCertificate: e.target.checked }))}
                      className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-purple-500"
                    />
                    <span>📑 Emitir Relatório Técnico de Processamento e Integridade (.PDF)</span>
                  </label>
                  <span className="text-[10px] text-purple-400">Rastreabilidade SHA-256</span>
                </div>

                {advancedOptions.generateAuditCertificate && (
                  <div className="pl-6 pt-2 border-t border-slate-800">
                    <label className="block text-[11px] text-slate-400 mb-1">Nome do Órgão / Operador no Relatório Técnico:</label>
                    <input
                      type="text"
                      value={advancedOptions.operatorDepartment || ''}
                      onChange={(e) => setAdvancedOptions(prev => ({ ...prev, operatorDepartment: e.target.value }))}
                      placeholder="Ex: Procuradoria Geral do Município"
                      className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Opção 5: Remover Páginas em Branco */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advancedOptions.removeBlankPages || false}
                    onChange={(e) => setAdvancedOptions(prev => ({ ...prev, removeBlankPages: e.target.checked }))}
                    className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-purple-500"
                  />
                  <span>📄 Remover Páginas em Branco / Folhas Vazias (&gt;98.5% superfície limpa)</span>
                </label>
                <span className="text-[10px] text-amber-400">Descarte inteligente de versos</span>
              </div>

              {/* Opção 6: Sanitização Rígida PJe / e-SAJ */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advancedOptions.sanitizeCourtRules || false}
                    onChange={(e) => setAdvancedOptions(prev => ({ ...prev, sanitizeCourtRules: e.target.checked }))}
                    className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-purple-500"
                  />
                  <span>🛡️ Sanitização PJe/e-SAJ (Limpar Scripts JS, AcroForms e Anexos Ocultos)</span>
                </label>
                <span className="text-[10px] text-emerald-400">Evita erro de recusa no portal</span>
              </div>

              {/* Opção 7: Carimbar Numeração por Volume */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advancedOptions.stampPages || false}
                    onChange={(e) => setAdvancedOptions(prev => ({ ...prev, stampPages: e.target.checked }))}
                    className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-purple-500"
                  />
                  <span>🏷️ Carimbar Numeração de Folhas por Volume no Cabeçalho</span>
                </label>
                <span className="text-[10px] text-blue-300">Vol. X - Fls. Y/Z</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="dropzone p-8 text-center cursor-pointer relative rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-900/40 transition-all"
      >
        <input
          type="file"
          accept={
            activeMode === 'generic_zip' 
              ? '.pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.heic,.md' 
              : activeMode === 'direct_pdf' 
                ? '.pdf,.jpg,.jpeg,.png,.webp,.heic' 
                : '.pdf'
          }
          multiple
          onChange={handleFilesSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
            <Upload className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">
              Arraste um ou múltiplos arquivos aqui ou clique para selecionar
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {activeMode === 'generic_zip'
                ? 'Suporta: .PDF, .DOCX, .XLSX, .CSV, .TXT, .PNG, .JPG'
                : activeMode === 'direct_pdf'
                  ? 'Suporta: .PDF, .JPG, .PNG, .WEBP (Comprime mantendo o formato original)'
                  : 'Suporta arquivos no formato .PDF'}
            </p>
          </div>
        </div>
      </div>

      {/* Selected files list & Batch Actions */}
      {selectedFiles.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Arquivos Selecionados ({selectedFiles.length}):
            </span>
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-blue-400 font-semibold">
                Tamanho Total: {formatBytes(getTotalSelectedSize())}
              </span>

              <button
                onClick={() => { setSelectedFiles([]); resetResults(); }}
                className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all"
                title="Excluir todos os arquivos selecionados"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Tudo</span>
              </button>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/60 text-xs">
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    #{idx + 1}
                  </span>
                  {getFileIcon(file.name)}
                  <span className="text-slate-200 font-medium truncate">{file.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-slate-500 text-[11px] mr-1">{formatBytes(file.size)}</span>
                  
                  <button
                    onClick={() => moveFileUp(idx)}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    title="Mover para cima na ordem de juntada"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => moveFileDown(idx)}
                    disabled={idx === selectedFiles.length - 1}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    title="Mover para baixo na ordem de juntada"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => removeFile(idx)}
                    className="text-red-400 hover:text-red-300 font-bold px-1.5 py-0.5 rounded hover:bg-red-500/10 text-sm transition-all ml-1"
                    title="Excluir este arquivo"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerta de Segurança: Assinaturas Digitais Detectadas */}
      {detectedSignedFiles.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-xs space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="font-bold text-amber-300 text-sm">
                ⚠️ Assinatura Digital Detectada ({detectedSignedFiles.length} documento(s))
              </div>
              <p className="text-slate-300 leading-relaxed">
                Identificamos chancelas criptográficas ICP-Brasil / PKCS#7 em: <span className="font-semibold text-amber-200">{detectedSignedFiles.map(f => `${f.name} (${f.count} assinatura(s))`).join(', ')}</span>.
                A regravação convencional de PDFs altera a tabela de objetos e destrói irreversivelmente a validade jurídica das assinaturas existentes.
              </p>

              {workflowMode !== 'signed_preservation' ? (
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setWorkflowMode('signed_preservation');
                      setAdvancedOptions(prev => ({ ...prev, workflowMode: 'signed_preservation' }));
                      resetResults();
                    }}
                    className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition-all"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Mudar para Fluxo "Documentos Já Assinados (Preservação)"</span>
                  </button>
                  <span className="text-[11px] text-amber-200/80">
                    Garante intocabilidade da matriz original e emite Certificado Forense de Custódia.
                  </span>
                </div>
              ) : (
                <div className="pt-1 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Modo de Preservação & Custódia Ativo: A matriz original será mantida 100% inalterada bit a bit.</span>
                </div>
              )}
            </div>
          </div>

          {workflowMode !== 'signed_preservation' && (
            <label className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-950/40 border border-amber-500/50 cursor-pointer hover:bg-amber-950/60 transition-all">
              <input
                type="checkbox"
                checked={confirmSignedReencode}
                onChange={(e) => {
                  setConfirmSignedReencode(e.target.checked);
                  setAdvancedOptions(prev => ({ ...prev, allowSignedPdfReencoding: e.target.checked }));
                }}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-amber-400"
              />
              <span className="font-semibold text-amber-200 text-xs leading-normal">
                Estou ciente de que a assinatura digital existente será invalidada/removida e autorizo expressamente a recompressão/fracionamento do arquivo.
              </span>
            </label>
          )}
        </div>
      )}

      {/* Error display */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Progress Bar Indicator */}
      {isProcessing && progressInfo && (
        <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs text-blue-200 font-medium">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
              {progressInfo.message}
            </span>
            <span className="font-bold text-blue-300">{progressInfo.percent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-200"
              style={{ width: `${progressInfo.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons (Batch Processing) */}
      {selectedFiles.length > 0 && !directResult && !volumeResult && !zipResult && (
        <div className="flex justify-between items-center">
          <button
            onClick={() => { setSelectedFiles([]); resetResults(); }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Limpar Seleção ({selectedFiles.length})</span>
          </button>

          <button
            onClick={processExecution}
            disabled={isProcessing}
            className="btn-action px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-50 transition-all"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processando localmente...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {activeMode === 'generic_zip' && `Criar Pacote Compactado em Lote (${selectedFiles.length})`}
                  {activeMode === 'volume_pdf' && `Fracionar e Gerar Volumes em Lote (${selectedFiles.length})`}
                  {activeMode === 'direct_pdf' && `Otimizar Todos em Lote (${selectedFiles.length})`}
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* RESULT 1: Direct PDF Compression */}
      {directResult && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">Arquivo(s) Otimizado(s) com Sucesso!</h3>
                <p className="text-xs text-slate-400">Processado 100% offline em lote com preservação de integridade.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {directResult.length > 1 && (
                <button
                  onClick={() => {
                    const zipFiles = directResult.map(res => ({ name: res.fileName, data: res.data }));
                    directResult.forEach((res, idx) => {
                      if (res.auditCertificatePdf) {
                        zipFiles.push({ name: `Relatorio_Tecnico_Integridade_${idx + 1}_${res.fileName.replace(/\.[^/.]+$/, '')}.pdf`, data: res.auditCertificatePdf });
                      }
                    });
                    const zipBytes = CoreCompressionService.createZipArchive(zipFiles);
                    downloadFile(zipBytes, 'Arquivos_Otimizados_Lote.zip', 'application/zip');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all"
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>Baixar Todos em ZIP ({directResult.length})</span>
                </button>
              )}

              <button
                onClick={() => { setSelectedFiles([]); resetResults(); }}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                Processar Novos Arquivos
              </button>
            </div>
          </div>

          {/* Batch Summary Metrics Card */}
          {directResult.length > 0 && (() => {
            const totalOrig = directResult.reduce((acc, r) => acc + r.originalSize, 0);
            const totalNew = directResult.reduce((acc, r) => acc + r.newSize, 0);
            const totalSaved = Math.max(0, totalOrig - totalNew);
            const totalPercent = totalOrig > 0 ? Math.round((totalSaved / totalOrig) * 100) : 0;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Tamanho Original</div>
                    <div className="text-xs font-bold text-slate-200">{formatBytes(totalOrig)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Tamanho Otimizado</div>
                    <div className="text-xs font-bold text-emerald-400">{formatBytes(totalNew)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Redução em Lote</div>
                    <div className="text-xs font-bold text-purple-300">
                      -{totalPercent}% ({formatBytes(totalSaved)} economizados)
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Signature Warning Banner if detected */}
          {directResult.some(r => r.signatureInfo?.hasSignatures) && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Aviso de Integridade de Assinatura Digital</div>
                <div className="text-[11px] text-amber-200/80 mt-0.5">
                  {directResult.find(r => r.signatureInfo?.hasSignatures)?.signatureInfo?.warningMessage}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {directResult.map((res, idx) => (
              <div key={idx} className="flex flex-col space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {res.isPreservedOriginal ? (
                      <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    ) : res.workflowMode === 'pre_signature_preparation' ? (
                      <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    ) : res.isImage ? (
                      <Image className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    ) : (
                      <FileText className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-slate-200 flex items-center gap-2 flex-wrap">
                        <span>{res.fileName}</span>
                        {res.isPreservedOriginal ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                            🛡️ Matriz Preservada 100% Intacta
                          </span>
                        ) : res.workflowMode === 'pre_signature_preparation' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                            🏛️ Pronto para Assinatura (Padronização XMP/sRGB)
                          </span>
                        ) : res.isImage ? (
                          <span className="text-[10px] px-2 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-normal">
                            🖼️ Imagem Otimizada (.JPG)
                          </span>
                        ) : res.reencodedImagesCount ? (
                          <span className="text-[10px] px-2 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-normal">
                            🖼️ {res.reencodedImagesCount} Imagem(ns) Recompactada(s)
                          </span>
                        ) : null}
                        {res.blankPagesRemovedCount ? (
                          <span className="text-[10px] px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-normal">
                            📄 {res.blankPagesRemovedCount} Folha(s) em Branco Removida(s)
                          </span>
                        ) : null}
                        {res.sanitizedActionsCount ? (
                          <span className="text-[10px] px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-normal">
                            🛡️ PJe/e-SAJ Sanitizado
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {res.isPreservedOriginal ? (
                          <span>Tamanho original: <strong className="text-slate-200">{formatBytes(res.originalSize)}</strong> • Bytes inalterados para validação ICP-Brasil</span>
                        ) : (
                          <>
                            {formatBytes(res.originalSize)} ➔ <span className="font-semibold text-emerald-400">{formatBytes(res.newSize)}</span> 
                            <span className={`ml-2 px-1.5 py-0.2 rounded font-bold ${res.savedPercent > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                              {res.savedPercent > 0 ? `-${res.savedPercent}%` : 'Sem alteração'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {res.forensicCertificatePdf && (
                      <button
                        onClick={() => downloadFile(res.forensicCertificatePdf!, `Relatorio_Custodia_${res.fileName}`, 'application/pdf')}
                        className="px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 font-semibold text-xs flex items-center gap-1.5 border border-blue-500/40"
                        title="Baixar Relatório Técnico de Preservação e Custódia"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Relatório de Custódia
                      </button>
                    )}

                    {res.preSignatureCertificatePdf && (
                      <button
                        onClick={() => downloadFile(res.preSignatureCertificatePdf!, `Relatorio_Preparacao_${res.fileName}`, 'application/pdf')}
                        className="px-3 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 font-semibold text-xs flex items-center gap-1.5 border border-amber-500/40"
                        title="Baixar Relatório Técnico de Preparação Pré-Assinatura"
                      >
                        <Award className="w-3.5 h-3.5" />
                        Relatório Pré-Assinatura
                      </button>
                    )}

                    {res.auditCertificatePdf && !res.forensicCertificatePdf && !res.preSignatureCertificatePdf && (
                      <button
                        onClick={() => downloadFile(res.auditCertificatePdf!, `Relatorio_Integridade_${res.fileName}`, 'application/pdf')}
                        className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 font-semibold text-xs flex items-center gap-1.5 border border-purple-500/40"
                        title="Baixar Relatório Técnico de Processamento e Integridade"
                      >
                        <Award className="w-3.5 h-3.5" />
                        Relatório de Integridade
                      </button>
                    )}

                    {selectedFiles[idx] && selectedFiles[idx].name.toLowerCase().endsWith('.pdf') && (
                      <button
                        type="button"
                        onClick={async () => {
                          const origBuf = await selectedFiles[idx].arrayBuffer();
                          setComparisonModalData({
                            originalBuffer: origBuf,
                            compressedBuffer: res.data,
                            originalSize: res.originalSize,
                            newSize: res.newSize,
                            fileName: res.fileName
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
                        title="Comparação visual antes/depois da compressão"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>Comparar Antes/Depois</span>
                      </button>
                    )}

                    <button
                      onClick={() => downloadFile(res.data, res.fileName, res.mimeType || (res.isImage ? 'image/jpeg' : 'application/pdf'))}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 ${
                        res.isPreservedOriginal 
                          ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{res.isPreservedOriginal ? 'Baixar Matriz Preservada' : res.isImage ? 'Baixar Imagem' : 'Baixar PDF'}</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Card para Cópia Reprográfica de Consulta (se gerada no fluxo de preservação) */}
                {res.consultationCopy && (
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 mt-1">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-300 flex items-center gap-2">
                        <span>📑 Cópia Reprográfica para Simples Consulta (Desvinculada)</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                          Marca D'água Aplicada
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Otimizada para {formatBytes(res.consultationCopy.sizeBytes)} ({res.consultationCopy.savedPercent > 0 ? `-${res.consultationCopy.savedPercent}%` : 'Tamanho mantido'}). As assinaturas originais foram desvinculadas para envio leve.
                      </div>
                    </div>
                    <button
                      onClick={() => downloadFile(res.consultationCopy!.data, res.consultationCopy!.fileName, 'application/pdf')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 shrink-0 border border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>Baixar Cópia Consulta</span>
                    </button>
                  </div>
                )}

                {res.sha256Post && (
                  <div className="text-[10px] text-slate-500 font-mono bg-slate-900/60 p-1.5 rounded border border-slate-800/80 truncate">
                    SHA-256: {res.sha256Post}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESULT 2: Volume PDF */}
      {volumeResult && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              <div>
                <h3 className="text-base font-bold text-slate-100">Volumes PDF Gerados com Sucesso!</h3>
                <p className="text-xs text-slate-400">
                  Fracionado em {volumeResult.volumes.length} volume(s) de até {volumeResult.preset.maxSizeMB}MB para {volumeResult.preset.targetPortal}.
                </p>
              </div>
            </div>

            <button
              onClick={() => downloadFile(volumeResult.zipData, `${packageTitle || 'Pacote_Volumes'}_Backup.zip`, 'application/zip')}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-purple-600/20"
            >
              <FolderArchive className="w-4 h-4" />
              <span>Baixar Pacote completo (.ZIP)</span>
            </button>
          </div>

          {/* Signature Warning Banner if detected */}
          {volumeResult.signatureInfo?.hasSignatures && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Aviso de Assinatura Digital ICP-Brasil</div>
                <div className="text-[11px] text-amber-200/80 mt-0.5">
                  {volumeResult.signatureInfo.warningMessage}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="font-bold text-blue-300">00_Capa_de_Juntada_Sumario.pdf</div>
                  <div className="text-[11px] text-slate-400">Capa Oficial de Juntada e Hashes SHA-256 de Autenticidade</div>
                </div>
              </div>
              <button
                onClick={() => downloadFile(volumeResult.coverPdf, '00_Capa_de_Juntada_Sumario.pdf', 'application/pdf')}
                className="px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar Capa
              </button>
            </div>

            {volumeResult.auditCertificatePdf && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <div className="font-bold text-purple-300">00_Relatorio_Tecnico_Integridade_LGPD.pdf</div>
                    <div className="text-[11px] text-slate-400">Relatório Técnico de Integridade e Rastreabilidade SHA-256 Gravado no ZIP</div>
                  </div>
                </div>
                <button
                  onClick={() => downloadFile(volumeResult.auditCertificatePdf!, '00_Relatorio_Tecnico_Integridade_LGPD.pdf', 'application/pdf')}
                  className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-semibold flex items-center gap-1.5 border border-purple-500/40"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar Relatório Técnico
                </button>
              </div>
            )}

            {volumeResult.volumes.map((vol, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-200">{vol.fileName}</div>
                    <div className="text-[11px] text-slate-400">
                      Páginas {vol.pageStart} à {vol.pageEnd} • <span className="font-semibold text-emerald-400">{formatBytes(vol.sizeBytes)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => downloadFile(vol.data, vol.fileName, 'application/pdf')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar Volume
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-800">
            <button
              onClick={() => { setSelectedFiles([]); resetResults(); }}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Processar Novos Arquivos
            </button>
          </div>
        </div>
      )}

      {/* RESULT 3: Generic ZIP Package */}
      {zipResult && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              <div>
                <h3 className="text-base font-bold text-slate-100">Pacote ZIP Criado com Sucesso!</h3>
                <p className="text-xs text-slate-400">
                  {zipResult.fileCount} arquivo(s) empacotados e compactados localmente.
                </p>
              </div>
            </div>

            <button
              onClick={() => downloadFile(zipResult.zipData, zipResult.fileName, 'application/zip')}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Pacote ZIP ({formatBytes(zipResult.totalZipSize)})</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 py-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-center">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Tamanho Original</span>
              <span className="text-sm font-bold text-slate-300">{formatBytes(zipResult.totalOriginalSize)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Tamanho do Arquivo ZIP</span>
              <span className="text-sm font-bold text-emerald-400">{formatBytes(zipResult.totalZipSize)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Taxa de Compressão</span>
              <span className="text-sm font-bold text-purple-400">{zipResult.savedPercent}% Economizado</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-800">
            <button
              onClick={() => { setSelectedFiles([]); resetResults(); }}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Criar Outro Pacote ZIP
            </button>

            <button
              onClick={() => downloadFile(zipResult.zipData, zipResult.fileName, 'application/zip')}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/20"
            >
              <FolderArchive className="w-4 h-4" />
              <span>Salvar Arquivo ZIP</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE COMPARAÇÃO VISUAL ANTES / DEPOIS */}
      {comparisonModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span>Comparação Visual Antes / Depois • {comparisonModalData.fileName}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Original: <strong className="text-slate-200">{formatBytes(comparisonModalData.originalSize)}</strong> ➔ 
                  Otimizado: <strong className="text-emerald-400">{formatBytes(comparisonModalData.newSize)}</strong> 
                  <span className="text-purple-300 ml-1 font-bold">
                    (-{Math.round(((comparisonModalData.originalSize - comparisonModalData.newSize) / comparisonModalData.originalSize) * 100)}%)
                  </span>
                </p>
              </div>
              <button
                onClick={() => setComparisonModalData(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/50">
              <div className="flex flex-col items-center space-y-2">
                <div className="text-xs font-bold text-slate-300 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
                  Documento Original (Página 1)
                </div>
                <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-center overflow-auto max-h-[550px]">
                  <canvas ref={canvasOriginalRef} className="max-w-full h-auto shadow-md rounded" />
                </div>
              </div>

              <div className="flex flex-col items-center space-y-2">
                <div className="text-xs font-bold text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60">
                  Otimizado / Comprimido (Página 1)
                </div>
                <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-center overflow-auto max-h-[550px]">
                  <canvas ref={canvasCompressedRef} className="max-w-full h-auto shadow-md rounded" />
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>🔍 Aproxime e verifique se as fontes, carimbos e assinaturas mantiveram a nitidez adequada para o protocolo.</span>
              <button
                onClick={() => setComparisonModalData(null)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
              >
                Concluir Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
