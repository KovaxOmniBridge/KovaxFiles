import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Trash2, 
  FileText, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  FolderArchive, 
  Eraser, 
  EyeOff, 
  AlertTriangle,
  Info,
  Sliders,
  FileCheck
} from 'lucide-react';
import { LocalPdfEngine, PdfMetadataReport, SanitizeOptions } from '../../services/pdfEngine';
import { CompressionEngine } from '../../services/compressionEngine';

export interface SanitizedResultItem {
  fileName: string;
  data: Uint8Array;
  originalReport?: PdfMetadataReport;
}

export const PdfMetadataSanitizer: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [reports, setReports] = useState<Record<string, PdfMetadataReport>>({});
  const [isInspecting, setIsInspecting] = useState<boolean>(false);

  // Options
  const [cleanAuthorAndCreator, setCleanAuthorAndCreator] = useState<boolean>(true);
  const [cleanDates, setCleanDates] = useState<boolean>(true);
  const [cleanXmpAndPrivateData, setCleanXmpAndPrivateData] = useState<boolean>(true);
  const [removeAnnotations, setRemoveAnnotations] = useState<boolean>(false);
  const [removeAttachments, setRemoveAttachments] = useState<boolean>(true);
  const [customProducerText, setCustomProducerText] = useState<string>('KovaxFiles LGPD Privacy Engine (Offline)');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [results, setResults] = useState<SanitizedResultItem[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      e.target.value = '';

      // Executar varredura prévia de metadados
      setIsInspecting(true);
      try {
        const newReports: Record<string, PdfMetadataReport> = { ...reports };
        for (const file of pdfs) {
          const buffer = await file.arrayBuffer();
          const report = await LocalPdfEngine.inspectPdfMetadata(buffer);
          newReports[file.name] = report;
        }
        setReports(newReports);
      } catch (err) {
        console.error('Erro na inspeção de metadados:', err);
      } finally {
        setIsInspecting(false);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
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

      setIsInspecting(true);
      try {
        const newReports: Record<string, PdfMetadataReport> = { ...reports };
        for (const file of pdfs) {
          const buffer = await file.arrayBuffer();
          const report = await LocalPdfEngine.inspectPdfMetadata(buffer);
          newReports[file.name] = report;
        }
        setReports(newReports);
      } catch (err) {
        console.error('Erro na inspeção de metadados:', err);
      } finally {
        setIsInspecting(false);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeFile = (index: number) => {
    const fileToRemove = selectedFiles[index];
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    if (fileToRemove) {
      setReports(prev => {
        const copy = { ...prev };
        delete copy[fileToRemove.name];
        return copy;
      });
    }
    setResults(null);
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setReports({});
    setResults(null);
    setErrorMessage(null);
  };

  const handleSanitizeProcess = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const options: SanitizeOptions = {
        cleanAuthorAndCreator,
        cleanDates,
        cleanXmpAndPrivateData,
        removeAnnotations,
        removeAttachments,
        customProducerText
      };

      const processed = await Promise.all(
        selectedFiles.map(async file => {
          const buffer = await file.arrayBuffer();
          const sanitizedBytes = await LocalPdfEngine.sanitizePdfMetadata(buffer, options);
          return {
            fileName: file.name.replace(/\.pdf$/i, '_higienizado_lgpd.pdf'),
            data: sanitizedBytes,
            originalReport: reports[file.name]
          };
        })
      );

      setResults(processed);
    } catch (err: any) {
      setErrorMessage('Erro ao higienizar metadados: ' + (err?.message || 'Erro desconhecido.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSingle = (res: SanitizedResultItem) => {
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
    a.download = 'Documentos_Higienizados_LGPD.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-xl font-bold text-slate-100">Higienizador de Metadados Ocultos</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Privacidade LGPD 100% Offline
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Inspecione e expurge dados pessoais e corporativos ocultos em arquivos PDF (autor, programa criador, sistema operacional, datas de revisão e histórico de edições).
          </p>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div 
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="dropzone p-7 text-center cursor-pointer relative rounded-2xl border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-900/40 transition-all"
      >
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFilesChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Eraser className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">
              Arraste um ou múltiplos PDFs para varredura e higienização de metadados
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Identificação instantânea de riscos de vazamento de autoria e estrutura.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area: Selected Files & Audit Inspection Reports */}
      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* File List & Inspection Diagnostic Cards (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4" /> Diagnóstico de Metadados ({selectedFiles.length} arquivo(s))
              </span>
              {isInspecting && (
                <span className="text-xs text-indigo-400 flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Inspecionando...
                </span>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
              {selectedFiles.map((file, idx) => {
                const rep = reports[file.name];
                return (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-slate-200 font-bold truncate">{file.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        onClick={() => removeFile(idx)}
                        className="text-red-400 hover:text-red-300 font-bold px-1.5 py-0.5 rounded hover:bg-red-500/10 text-sm transition-all"
                      >
                        ×
                      </button>
                    </div>

                    {rep ? (
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                          <span className="text-[11px] font-semibold text-slate-300">Nível de Risco de Vazamento:</span>
                          {rep.riskLevel === 'high' && (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                              Alto Risco de Vazamento (LGPD)
                            </span>
                          )}
                          {rep.riskLevel === 'medium' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                              <Info className="w-3 h-3 text-amber-400" />
                              Metadados Moderados Detectados
                            </span>
                          )}
                          {rep.riskLevel === 'low' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Metadados Baixos / Limpos
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                          <div>
                            <span className="text-slate-500">Autor Original: </span>
                            <span className={rep.author ? 'text-red-300 font-semibold' : 'text-slate-400 italic'}>
                              {rep.author || 'Nenhum'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Software Criador: </span>
                            <span className={rep.creator ? 'text-amber-300 font-medium' : 'text-slate-400 italic'}>
                              {rep.creator || 'Nenhum'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Data Criação: </span>
                            <span className="text-slate-300">{rep.creationDate || 'Não informada'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Produtor: </span>
                            <span className="text-slate-300 truncate block">{rep.producer || 'Não informado'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Stream XMP: </span>
                            <span className={rep.hasXmpMetadata ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
                              {rep.hasXmpMetadata ? 'Sim (Informações Ocultas)' : 'Não'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Anexos / Anotações: </span>
                            <span className="text-slate-300">
                              {rep.hasEmbeddedFiles ? 'Anexos Detectados' : `${rep.annotationCount} Anotação(ões)`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic">Inspecionando arquivo...</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sanitization Options Panel (1 col) */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sliders className="w-4 h-4" /> Opções de Expulso & Limpeza
              </h3>

              <div className="space-y-2.5 text-xs text-slate-300">
                <label className="flex items-start gap-2 cursor-pointer bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <input
                    type="checkbox"
                    checked={cleanAuthorAndCreator}
                    onChange={(e) => setCleanAuthorAndCreator(e.target.checked)}
                    className="mt-0.5 rounded bg-slate-950 border-slate-800 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-semibold block text-slate-200">Expurgar Autor & Criador</span>
                    <span className="text-[10px] text-slate-400">Remove nome do usuário, máquina e software (Word, Writer, Acrobat)</span>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <input
                    type="checkbox"
                    checked={cleanDates}
                    onChange={(e) => setCleanDates(e.target.checked)}
                    className="mt-0.5 rounded bg-slate-950 border-slate-800 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-semibold block text-slate-200">Limpar Datas de Criação & Modificação</span>
                    <span className="text-[10px] text-slate-400">Neutraliza marcas temporais de redação do documento</span>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <input
                    type="checkbox"
                    checked={cleanXmpAndPrivateData}
                    onChange={(e) => setCleanXmpAndPrivateData(e.target.checked)}
                    className="mt-0.5 rounded bg-slate-950 border-slate-800 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-semibold block text-slate-200">Remover Metadados XMP Ocultos</span>
                    <span className="text-[10px] text-slate-400">Elimina históricos de edição e dados salvos por aplicativos de design</span>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <input
                    type="checkbox"
                    checked={removeAttachments}
                    onChange={(e) => setRemoveAttachments(e.target.checked)}
                    className="mt-0.5 rounded bg-slate-950 border-slate-800 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-semibold block text-slate-200">Remover Anexos Embutidos</span>
                    <span className="text-[10px] text-slate-400">Deleta arquivos ocultos anexados dentro da estrutura do PDF</span>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <input
                    type="checkbox"
                    checked={removeAnnotations}
                    onChange={(e) => setRemoveAnnotations(e.target.checked)}
                    className="mt-0.5 rounded bg-slate-950 border-slate-800 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-semibold block text-slate-200">Expurgar Comentários & Anotações</span>
                    <span className="text-[10px] text-slate-400">Remove notas de revisão interna deixadas nas páginas</span>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Texto do Produtor Sanitizado:
                </label>
                <input
                  type="text"
                  value={customProducerText}
                  onChange={(e) => setCustomProducerText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              onClick={handleSanitizeProcess}
              disabled={isProcessing || selectedFiles.length === 0}
              className="btn-action w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 disabled:opacity-50 transition-all mt-4"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Higienizando {selectedFiles.length} PDF(s)...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Higienizar e Proteger PDF(s) ({selectedFiles.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action Bar when files are selected */}
      {selectedFiles.length > 0 && !results && (
        <div className="flex justify-between items-center">
          <button
            onClick={clearAll}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Limpar Seleção ({selectedFiles.length})</span>
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
                <h3 className="text-sm font-bold text-slate-100">{results.length} Documento(s) Higienizado(s) com Sucesso!</h3>
                <p className="text-xs text-slate-400">Metadados ocultos, autoria e histórico de programa removidos para conformidade LGPD.</p>
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
                  <div>
                    <span className="text-slate-200 font-bold truncate block">{res.fileName}</span>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      100% Higienizado • LGPD Compliant
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadSingle(res)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 font-semibold text-xs flex items-center gap-1.5 border border-emerald-500/30"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar PDF Limpo
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-800">
            <button
              onClick={clearAll}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Higienizar Novos Documentos
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
