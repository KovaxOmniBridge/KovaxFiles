import React, { useState } from 'react';
import { 
  Stamp, 
  Upload, 
  Download, 
  CheckCircle2, 
  RefreshCw, 
  Building2, 
  Calendar, 
  Trash2, 
  FolderArchive, 
  FileText,
  Eye,
  ArrowUp,
  ArrowDown,
  Merge,
  ShieldCheck,
  Award,
  Sliders,
  UserCheck,
  Info,
  BookOpen
} from 'lucide-react';
import { LocalPdfEngine, ProcessStampOptions, computeSha256Hex } from '../../services/pdfEngine';
import { CompressionEngine } from '../../services/compressionEngine';
import { PDFDocument } from 'pdf-lib';

export interface StampedResultItem {
  fileName: string;
  data: Uint8Array;
}

export const ProcessStamper: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processNumber, setProcessNumber] = useState<string>('12.345/2026');
  const [startPageNumber, setStartPageNumber] = useState<number>(1);
  const [prefix, setPrefix] = useState<string>('Fl.');
  const [departmentName, setDepartmentName] = useState<string>('Prefeitura Municipal');
  const [position, setPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');
  const [stampColor, setStampColor] = useState<'blue' | 'black' | 'red'>('blue');
  const [stampShape, setStampShape] = useState<'rectangle' | 'round'>('round');
  const [opacity, setOpacity] = useState<number>(0.35); // Marca d'água (35% opacidade)
  const [padDigits, setPadDigits] = useState<number>(3);
  const [skipFirstPage, setSkipFirstPage] = useState<boolean>(false);
  const [showTimestamp, setShowTimestamp] = useState<boolean>(true);
  const [mergeOutput, setMergeOutput] = useState<boolean>(false);
  const [appendAuditPage, setAppendAuditPage] = useState<boolean>(true);
  const [continuousPagination, setContinuousPagination] = useState<boolean>(true);
  const [generateIndexCover, setGenerateIndexCover] = useState<boolean>(true);
  const [signerName, setSignerName] = useState<string>('Dr(a). Servidor / Advogado Responsável');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [results, setResults] = useState<StampedResultItem[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const pdfs = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
      if (pdfs.length === 0) {
        setErrorMessage('Por favor, selecione arquivos no formato PDF.');
        e.target.value = '';
        return;
      }
      setSelectedFiles(prev => [...prev, ...pdfs]);
      setResults(null);
      setErrorMessage(null);
      // Reset DOM value so selecting the same file after clear/delete triggers onChange
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const pdfs = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
      if (pdfs.length === 0) {
        setErrorMessage('Por favor, selecione arquivos no formato PDF.');
        return;
      }
      setSelectedFiles(prev => [...prev, ...pdfs]);
      setResults(null);
      setErrorMessage(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setResults(null);
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === selectedFiles.length - 1) return;

    const newFiles = [...selectedFiles];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = newFiles[index];
    newFiles[index] = newFiles[targetIdx];
    newFiles[targetIdx] = temp;
    setSelectedFiles(newFiles);
    setResults(null);
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setResults(null);
    setErrorMessage(null);
  };

  const handleStampProcess = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const baseOptions: ProcessStampOptions = {
        processNumber,
        startPageNumber,
        prefix,
        departmentName,
        position,
        showTimestamp,
        skipFirstPage,
        stampColor,
        padDigits,
        stampShape,
        opacity,
        appendAuditPage,
        signerName
      };

      // 1. Extrair contagem de páginas e hash SHA-256 de cada peça
      const fileBuffers = await Promise.all(selectedFiles.map(f => f.arrayBuffer()));
      let currentFolha = startPageNumber;
      const piecesMetadata: {
        pieceIndex: number;
        title: string;
        fileName: string;
        startFolha: number;
        endFolha: number;
        pageCount: number;
        sha256Hex: string;
      }[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const buffer = fileBuffers[i];
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const count = doc.getPageCount();
        const hash = await computeSha256Hex(new Uint8Array(buffer));
        const effectiveCount = (skipFirstPage && i === 0) ? Math.max(1, count - 1) : count;

        piecesMetadata.push({
          pieceIndex: i + 1,
          title: file.name.replace(/\.[^/.]+$/, ''),
          fileName: file.name,
          startFolha: currentFolha,
          endFolha: currentFolha + effectiveCount - 1,
          pageCount: count,
          sha256Hex: hash
        });

        if (continuousPagination) {
          currentFolha += effectiveCount;
        }
      }

      // 2. Gerar Capa de Juntada e Índice com Manifesto SHA-256 se habilitado
      let coverBytes: Uint8Array | null = null;
      if (generateIndexCover) {
        coverBytes = await LocalPdfEngine.generateJuntadaCoverAndIndex({
          processNumber,
          departmentName,
          signerName,
          prefix,
          padDigits,
          pieces: piecesMetadata
        });
      }

      // 3. Processar saída (Mesclada ou Individual)
      if (mergeOutput && selectedFiles.length > 1) {
        const stampedBuffers: Uint8Array[] = [];
        if (coverBytes) {
          stampedBuffers.push(coverBytes);
        }

        for (let i = 0; i < selectedFiles.length; i++) {
          const piece = piecesMetadata[i];
          const fileOptions: ProcessStampOptions = {
            ...baseOptions,
            startPageNumber: piece.startFolha,
            appendAuditPage: false // termo individual desnecessário se unificado com capa e manifesto
          };
          const stamped = await LocalPdfEngine.stampProcess(fileBuffers[i], fileOptions);
          stampedBuffers.push(stamped);
        }

        const mergedAll = await LocalPdfEngine.mergePdfs(stampedBuffers.map(b => b.buffer as ArrayBuffer));
        let finalOutput = mergedAll;

        if (appendAuditPage) {
          finalOutput = await LocalPdfEngine.stampProcess(mergedAll, {
            ...baseOptions,
            startPageNumber: 1,
            skipFirstPage: true,
            opacity: 0,
            appendAuditPage: true
          });
        }

        setResults([{
          fileName: `Juntada_Processo_${processNumber.replace(/[^a-zA-Z0-9]/g, '_')}_Completo.pdf`,
          data: finalOutput
        }]);
      } else {
        const processedResults: StampedResultItem[] = [];
        if (coverBytes) {
          processedResults.push({
            fileName: `00_Capa_e_Indice_de_Juntada_Processo_${processNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
            data: coverBytes
          });
        }

        for (let i = 0; i < selectedFiles.length; i++) {
          const piece = piecesMetadata[i];
          const fileOptions: ProcessStampOptions = {
            ...baseOptions,
            startPageNumber: piece.startFolha
          };
          const stampedBytes = await LocalPdfEngine.stampProcess(fileBuffers[i], fileOptions);
          processedResults.push({
            fileName: selectedFiles[i].name.replace(/\.pdf$/i, `_fls_${String(piece.startFolha).padStart(padDigits, '0')}_a_${String(piece.endFolha).padStart(padDigits, '0')}.pdf`),
            data: stampedBytes
          });
        }
        setResults(processedResults);
      }
    } catch (err: any) {
      setErrorMessage('Erro ao carimbar processos: ' + (err?.message || 'Erro desconhecido.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSingle = (res: StampedResultItem) => {
    const blob = new Blob([new Uint8Array(res.data)], { type: 'application/pdf' });
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
    const zipData = CompressionEngine.createZipArchive(zipFiles);
    const blob = new Blob([new Uint8Array(zipData)], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Documentos_Carimbados_Juntada.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const samplePageNum = padDigits > 0 
    ? startPageNumber.toString().padStart(padDigits, '0') 
    : startPageNumber.toString();
  const sampleStampText = `${prefix} ${samplePageNum}`;
  const sampleProcText = processNumber ? `Proc: ${processNumber}` : '';
  const sampleDeptText = departmentName ? departmentName.toUpperCase() : 'DOCUMENTO AUTENTICADO';

  // Visual Styles for Stamp Preview
  const borderColors = {
    blue: 'border-blue-600 text-blue-900',
    black: 'border-slate-800 text-slate-900',
    red: 'border-red-600 text-red-900',
  }[stampColor];

  const bgColors = {
    blue: 'bg-blue-100',
    black: 'bg-slate-200',
    red: 'bg-red-100',
  }[stampColor];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header com Banner de Respaldo Administrativo e Integridade SHA-256 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-xl font-bold text-slate-100">Juntada, Numeração & Chancela de Autos</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Chancela Administrativa & Hash SHA-256
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Carimbo oficial de numeração sequencial de folhas (Fl. 001/2026), chancela visual em marca d'água e geração de Termo de Juntada e Integridade Documental com Hash SHA-256.
          </p>
        </div>
      </div>

      {/* Aviso de Conformidade Legal e Técnica */}
      <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-200 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-blue-100">Aviso de Conformidade Técnica e Legal:</span>
          <span className="text-slate-300 ml-1">
            Esta rotina aplica chancela visual e numeração sequencial de autos, registrando o hash SHA-256 das peças. 
            <strong> Este ato administrativo não constitui assinatura digital PAdES (ISO 32000 / ETSI EN 319 142) nem substitui certificado digital ICP-Brasil com chave privada.</strong> Para assinar peças e petições com certificado digital A1 (.pfx/.p12), utilize o módulo dedicado <strong>Assinador & Validador PAdES</strong> no menu lateral.
          </span>
        </div>
      </div>

      {/* Main Grid: Config Panel + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Config Form (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <Building2 className="w-4 h-4" /> Configuração da Chancela & Numeração
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Número do Processo / Protocolo:
              </label>
              <input
                type="text"
                value={processNumber}
                onChange={(e) => setProcessNumber(e.target.value)}
                placeholder="Ex: 12.345/2026"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Órgão / Departamento / Prefeitura:
              </label>
              <input
                type="text"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                placeholder="Ex: Prefeitura Municipal de SP"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Prefixo & Página Inicial:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="Fl."
                  className="w-20 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 text-center font-semibold"
                />
                <input
                  type="number"
                  value={startPageNumber}
                  onChange={(e) => setStartPageNumber(Number(e.target.value))}
                  min={1}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Formato Visual da Chancela:
              </label>
              <select
                value={stampShape}
                onChange={(e: any) => setStampShape(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-medium"
              >
                <option value="round">💮 Selo Redondo Oficial (Chancela Circular)</option>
                <option value="rectangle">▭ Retangular Clássico (Tribunais)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Transparência / Marca d'Água (Opacidade):
              </label>
              <select
                value={opacity}
                onChange={(e: any) => setOpacity(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-medium"
              >
                <option value={0.20}>💧 Marca d'água Suave (20% Opacidade)</option>
                <option value={0.35}>💧 Marca d'água Média (35% Opacidade - Recomendado)</option>
                <option value={0.55}>👁️ Visibilidade Moderada (55% Opacidade)</option>
                <option value={1.0}>██ Carimbo 100% Opaco (Sem Transparência)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Cor da Tinta do Carimbo:
              </label>
              <select
                value={stampColor}
                onChange={(e: any) => setStampColor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
              >
                <option value="blue">🔵 Azul Tribunal (Oficial)</option>
                <option value="black">⚫ Preto Formal</option>
                <option value="red">🔴 Vermelho Chancela/Urgência</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Posição no Documento:
              </label>
              <select
                value={position}
                onChange={(e: any) => setPosition(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
              >
                <option value="top-right">Superior Direito (Padrão Tribunais)</option>
                <option value="top-left">Superior Esquerdo</option>
                <option value="bottom-right">Inferior Direito</option>
                <option value="bottom-left">Inferior Esquerdo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Signatário / Operador Responsável:
              </label>
              <div className="relative">
                <UserCheck className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Nome do servidor ou advogado"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 space-y-2 border-t border-slate-800/80">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-emerald-300 bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/30">
              <input
                type="checkbox"
                checked={appendAuditPage}
                onChange={(e) => setAppendAuditPage(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-semibold">Anexar Termo de Juntada e Integridade Documental ao final do PDF (Hash SHA-256)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTimestamp}
                  onChange={(e) => setShowTimestamp(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Incluir data/hora local do protocolo</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipFirstPage}
                  onChange={(e) => setSkipFirstPage(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Pular 1ª página (ex: Capa original)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={continuousPagination}
                  onChange={(e) => setContinuousPagination(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Paginação contínua entre peças (Fl. sequencial)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateIndexCover}
                  onChange={(e) => setGenerateIndexCover(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Gerar Capa com Índice & Manifesto SHA-256</span>
              </label>
            </div>
          </div>
        </div>

        {/* Live Stamp Visual Preview (1 col) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> Pré-visualização A4 (Tempo Real)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Opacidade: {(opacity * 100).toFixed(0)}%
            </span>
          </div>

          {/* Miniature A4 Sheet with Live Watermark Stamp Rendering */}
          <div className="relative w-full h-56 bg-slate-100 rounded-lg border border-slate-400 p-3 flex flex-col justify-between overflow-hidden shadow-inner">
            {/* Background Simulated Text Lines */}
            <div className="space-y-2 opacity-50">
              <div className="h-2 bg-slate-600 rounded w-3/4"></div>
              <div className="h-1.5 bg-slate-500 rounded w-full"></div>
              <div className="h-1.5 bg-slate-500 rounded w-5/6"></div>
              <div className="h-1.5 bg-slate-500 rounded w-full"></div>
              <div className="h-1.5 bg-slate-500 rounded w-2/3"></div>
              <div className="h-1.5 bg-slate-500 rounded w-4/5"></div>
              <div className="h-1.5 bg-slate-500 rounded w-full"></div>
            </div>

            {/* Stamp Element: Round Seal vs Rectangle */}
            {stampShape === 'round' ? (
              <div
                style={{ opacity: opacity }}
                className={`absolute w-24 h-24 rounded-full border-2 border-dashed flex flex-col items-center justify-center text-center p-1 shadow-sm transition-all ${bgColors} ${borderColors} ${
                  position === 'top-right' ? 'top-2 right-2' :
                  position === 'top-left' ? 'top-2 left-2' :
                  position === 'bottom-right' ? 'bottom-2 right-2' : 'bottom-2 left-2'
                }`}
              >
                <div className="w-[86px] h-[86px] rounded-full border border-current flex flex-col items-center justify-center p-1 overflow-hidden">
                  <div className="text-[7px] font-semibold leading-tight text-center truncate max-w-[80px]">
                    {sampleDeptText}
                  </div>
                  <div className="text-[11px] font-bold leading-tight text-center my-0.5 max-w-[80px] truncate">
                    {sampleStampText}
                  </div>
                  {sampleProcText && (
                    <div className="text-[7.5px] leading-tight text-center opacity-85 truncate max-w-[80px]">
                      {sampleProcText}
                    </div>
                  )}
                  <div className="text-[6.5px] leading-tight text-center opacity-75 truncate max-w-[80px] mt-0.5">
                    {showTimestamp ? '31/08/2026 11:44' : 'Chancela Oficial'}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{ opacity: opacity }}
                className={`absolute p-1.5 rounded border-2 shadow-sm text-left max-w-[150px] transition-all ${bgColors} ${borderColors} ${
                  position === 'top-right' ? 'top-2 right-2' :
                  position === 'top-left' ? 'top-2 left-2' :
                  position === 'bottom-right' ? 'bottom-2 right-2' : 'bottom-2 left-2'
                }`}
              >
                <div className="text-[10px] font-bold leading-tight">
                  {sampleStampText}
                </div>
                {sampleProcText && (
                  <div className="text-[8px] opacity-80 leading-tight">
                    {sampleProcText}
                  </div>
                )}
                <div className="text-[7px] opacity-75 leading-tight truncate">
                  {sampleDeptText} • CHANCELA
                </div>
              </div>
            )}

            <div className="text-[9px] text-slate-600 text-center font-mono font-semibold">
              [Página A4 • Texto Visível Sob a Marca d'Água]
            </div>
          </div>

          <div className="text-[11px] text-slate-400 space-y-1">
            <p className="text-center">
              Com opacidade de <strong className="text-slate-200">{(opacity * 100).toFixed(0)}%</strong>, o carimbo atuará como marca d'água sem cobrir assinaturas ou textos sob ele.
            </p>
            {appendAuditPage && (
              <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                <span>Termo de Juntada com Hash SHA-256 será anexado ao final.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div 
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="dropzone p-6 text-center cursor-pointer relative rounded-2xl border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-900/40 transition-all"
      >
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFilesChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
            <Stamp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">
              Arraste um ou múltiplos PDFs para juntada e numeração de folhas
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Defina a ordem exata das peças antes de gerar o documento com chancela oficial.
            </p>
          </div>
        </div>
      </div>

      {/* Selected Files List & Order Actions */}
      {selectedFiles.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">
                Ordem da Juntada ({selectedFiles.length} arquivo(s)):
              </span>
              <span className="text-[11px] text-slate-500">
                (Use as setas para alterar a sequência)
              </span>
            </div>

            <div className="flex items-center gap-3">
              {selectedFiles.length > 1 && (
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/30">
                  <Merge className="w-3.5 h-3.5" />
                  <input
                    type="checkbox"
                    checked={mergeOutput}
                    onChange={(e) => setMergeOutput(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600"
                  />
                  <span>Unificar em 1 único PDF de Juntada</span>
                </label>
              )}

              <button
                onClick={clearAll}
                className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Tudo</span>
              </button>
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/60 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-slate-200 font-medium truncate">{file.name}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => moveFile(idx, 'up')}
                    disabled={idx === 0}
                    title="Mover para cima na ordem de juntada"
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveFile(idx, 'down')}
                    disabled={idx === selectedFiles.length - 1}
                    title="Mover para baixo na ordem de juntada"
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeFile(idx)}
                    className="text-red-400 hover:text-red-300 font-bold px-1.5 py-0.5 rounded hover:bg-red-500/10 text-sm transition-all"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action Buttons */}
      {selectedFiles.length > 0 && !results && (
        <div className="flex justify-between items-center pt-2">
          <button
            onClick={clearAll}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Limpar Seleção ({selectedFiles.length})</span>
          </button>

          <button
            onClick={handleStampProcess}
            disabled={isProcessing}
            className="btn-action px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 disabled:opacity-50 transition-all"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gerando chancela e termo de juntada para {selectedFiles.length} PDF(s)...</span>
              </>
            ) : (
              <>
                <Stamp className="w-4 h-4" />
                <span>
                  {mergeOutput 
                    ? `Chancelar e Mesclar em 1 PDF de Autos` 
                    : `Chancelar Documentos em Lote (${selectedFiles.length})`}
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Result Section */}
      {results && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">{results.length} Documento(s) Chancelado(s) com Sucesso!</h3>
                <p className="text-xs text-slate-400">
                  Chancela oficial em marca d'água {appendAuditPage && 'e Termo de Juntada com Hash SHA-256 anexado no final'}.
                </p>
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

          <div className="space-y-2">
            {results.map((res, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-200 font-bold truncate">{res.fileName}</span>
                </div>
                <button
                  onClick={() => handleDownloadSingle(res)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 font-semibold text-xs flex items-center gap-1.5 border border-emerald-500/30"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar PDF Chancelado
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-800">
            <button
              onClick={clearAll}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Chancelar Novos Documentos
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
