import React, { useState } from 'react';
import { 
  FileArchive, Upload, Download, CheckCircle2, AlertCircle, RefreshCw, Zap, 
  Layers, PackageCheck, FileText, Hash, ShieldCheck, FolderArchive, FileSpreadsheet,
  FileType, Image, FileCode, Archive, Sparkles, Settings2, ChevronDown, ChevronUp,
  FileSignature, ShieldAlert, Award, Sliders, Trash2
} from 'lucide-react';
import { 
  TARGET_PRESETS, TargetPreset, CompressionEngine, VolumeBundleOutput, 
  DirectCompressOutput, GenericZipOutput, AdvancedCompressOptions 
} from '../../services/compressionEngine';

export type CompressorMode = 'direct_pdf' | 'volume_pdf' | 'generic_zip';

export const PdfCompressor: React.FC = () => {
  const [activeMode, setActiveMode] = useState<CompressorMode>('generic_zip');
  const [selectedPreset, setSelectedPreset] = useState<TargetPreset>(TARGET_PRESETS[0]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processNumber, setProcessNumber] = useState<string>('');
  const [packageTitle, setPackageTitle] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Configurações Avançadas Opcionais
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedCompressOptions>({
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

        for (let i = 0; i < totalFiles; i++) {
          const f = fileBuffers[i];
          const ext = f.name.toLowerCase().split('.').pop();
          
          const filePrefix = totalFiles > 1 ? `[${i + 1}/${totalFiles}] ` : '';
          const handleProgress = (p: { message: string; percent: number }) => {
            const overall = Math.round(((i + (p.percent / 100)) / totalFiles) * 100);
            setProgressInfo({ message: `${filePrefix}${p.message}`, percent: overall });
          };

          if (ext === 'pdf') {
            const res = await CompressionEngine.compressDirectPdf(f.buffer, f.name, advancedOptions, handleProgress);
            results.push(res);
          } else {
            handleProgress({ message: 'Otimizando imagem...', percent: 50 });
            const res = await CompressionEngine.compressDirectImage(f.buffer, f.name, advancedOptions);
            results.push(res);
          }
        }
        setDirectResult(results);

      } else if (activeMode === 'volume_pdf') {
        const nonPdfs = selectedFiles.filter(f => !f.name.toLowerCase().endsWith('.pdf'));
        if (nonPdfs.length > 0) {
          throw new Error('O modo "Fracionar em Volumes" aceita apenas arquivos .PDF. Para outros formatos (.docx, .xlsx, .csv), utilize o modo "Criar Pacote ZIP".');
        }

        const res = await CompressionEngine.packIntoVolumeBundle(
          fileBuffers,
          selectedPreset,
          {
            processNumber,
            title: packageTitle || selectedFiles[0].name.replace(/\.[^/.]+$/, ''),
            advanced: advancedOptions
          },
          prog => setProgressInfo(prog)
        );
        setVolumeResult(res);

      } else if (activeMode === 'generic_zip') {
        setProgressInfo({ message: 'Compactando pacote ZIP...', percent: 50 });
        const zipName = packageTitle || 'Pacote_Arquivos_Compactado';
        const res = await CompressionEngine.createGenericZipPackage(fileBuffers, zipName);
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

      {/* Preset options if Volume PDF mode */}
      {activeMode === 'volume_pdf' && (
        <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-3">
          <label className="block text-xs font-bold text-blue-300 uppercase tracking-wider">
            Selecione o Portal Alvo (Limite por Volume):
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {TARGET_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => { setSelectedPreset(preset); resetResults(); }}
                className={`p-2.5 rounded-lg text-left border text-xs transition-all ${
                  selectedPreset.id === preset.id
                    ? 'bg-blue-600/30 border-blue-400 text-slate-100 font-semibold'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-slate-200">{preset.name}</div>
                <div className="text-[10px] text-blue-400">Máx {preset.maxSizeMB}MB por parte</div>
              </button>
            ))}
          </div>
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

              {/* Opção 3: Conformidade PDF/A-1b */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advancedOptions.enablePdfA || false}
                    onChange={(e) => setAdvancedOptions(prev => ({ ...prev, enablePdfA: e.target.checked }))}
                    className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-purple-500"
                  />
                  <span>🏛️ Aplicar Metadados Padrão PDF/A-1b (Arquivamento Histórico)</span>
                </label>
                <span className="text-[10px] text-blue-400">ISO 19005-1 Compliant</span>
              </div>

              {/* Opção 4: Certificado de Auditoria LGPD */}
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-slate-200 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={advancedOptions.generateAuditCertificate || false}
                      onChange={(e) => setAdvancedOptions(prev => ({ ...prev, generateAuditCertificate: e.target.checked }))}
                      className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-purple-500"
                    />
                    <span>📜 Emitir Certificado de Auditoria LGPD & Autenticidade (.PDF)</span>
                  </label>
                  <span className="text-[10px] text-purple-400">Relatório com Hashes SHA-256</span>
                </div>

                {advancedOptions.generateAuditCertificate && (
                  <div className="pl-6 pt-2 border-t border-slate-800">
                    <label className="block text-[11px] text-slate-400 mb-1">Nome do Órgão / Operador no Certificado:</label>
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
                        zipFiles.push({ name: `Certificado_Auditoria_${idx + 1}_${res.fileName.replace(/\.[^/.]+$/, '')}.pdf`, data: res.auditCertificatePdf });
                      }
                    });
                    const zipBytes = CompressionEngine.createZipArchive(zipFiles);
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

          <div className="space-y-2">
            {directResult.map((res, idx) => (
              <div key={idx} className="flex flex-col space-y-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {res.isImage ? (
                      <Image className="w-4 h-4 text-purple-400 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-slate-200 flex items-center gap-2 flex-wrap">
                        {res.fileName}
                        {res.isImage ? (
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
                      <div className="text-[11px] text-slate-400">
                        {formatBytes(res.originalSize)} ➔ <span className="font-semibold text-emerald-400">{formatBytes(res.newSize)}</span> 
                        <span className={`ml-2 px-1.5 py-0.2 rounded font-bold ${res.savedPercent > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                          {res.savedPercent > 0 ? `-${res.savedPercent}%` : 'Sem alteração'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {res.auditCertificatePdf && (
                      <button
                        onClick={() => downloadFile(res.auditCertificatePdf!, `Certificado_Auditoria_${res.fileName}`, 'application/pdf')}
                        className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 font-semibold text-xs flex items-center gap-1.5 border border-purple-500/40"
                      >
                        <Award className="w-3.5 h-3.5" />
                        Certificado LGPD
                      </button>
                    )}

                    <button
                      onClick={() => downloadFile(res.data, res.fileName, res.mimeType || (res.isImage ? 'image/jpeg' : 'application/pdf'))}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{res.isImage ? 'Baixar Imagem' : 'Baixar PDF'}</span>
                    </button>
                  </div>
                </div>

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
                    <div className="font-bold text-purple-300">00_Certificado_de_Auditoria_LGPD.pdf</div>
                    <div className="text-[11px] text-slate-400">Relatório de Integridade Documental e Autenticidade Gravado no ZIP</div>
                  </div>
                </div>
                <button
                  onClick={() => downloadFile(volumeResult.auditCertificatePdf!, '00_Certificado_de_Auditoria_LGPD.pdf', 'application/pdf')}
                  className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-semibold flex items-center gap-1.5 border border-purple-500/40"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar Certificado
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
    </div>
  );
};
