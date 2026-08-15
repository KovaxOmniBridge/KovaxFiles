import React, { useState, useRef } from 'react';
import { Sparkles, ShieldAlert, Trash2, Download, Cpu, CheckCircle2, FileText, Eye, AlertTriangle } from 'lucide-react';
import { inspectFileMetadata, sanitizeFileMetadata, type MetadataInspectionResult } from '../services';

export const MetadataSanitizerTab: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<MetadataInspectionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [sanitizedBlobUrl, setSanitizedBlobUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setSanitizedBlobUrl(null);
      
      const result = await inspectFileMetadata(selectedFile);
      setInspection(result);
    }
  };

  const handleSanitize = async () => {
    if (!file) return;
    setIsProcessing(true);
    setStatusMessage('Iniciando sanitização e limpeza de metadados...');

    try {
      const { blob } = await sanitizeFileMetadata(file, (percent, status) => setStatusMessage(status));
      const url = URL.createObjectURL(blob);
      setSanitizedBlobUrl(url);
    } catch (err) {
      console.error('Erro na sanitização:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 relative overflow-hidden">
        <div className="flex items-start justify-between relative z-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3">
              <Sparkles className="w-4 h-4" />
              Proteção de Privacidade EXIF / GPS / Autoria • Em 1 Clique
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              Higienizador de Metadados Ocultos
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              Remova metadados invisíveis que expõem coordenadas de GPS, modelo do celular, número de série de câmeras e dados de autoria em imagens e documentos antes do peticionamento público ou envio institucional.
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Trash2 className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Upload Box */}
      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-900/40 hover:bg-slate-900/60 rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.heic,.webp,.tiff"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Eye className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Selecione o arquivo para inspecionar e higienizar</h3>
          <p className="text-xs text-slate-400">Suporte a fotos (JPG/PNG/HEIC) e documentos PDF com eliminação imediata de marcadores</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* File Info */}
          <div className="md:col-span-1 glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
              <FileText className="w-8 h-8 text-emerald-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-white truncate">{file.name}</h4>
                <span className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            </div>

            {inspection?.metadataCount && inspection.metadataCount > 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-white font-bold mb-0.5">Risco de Vazamento de Metadados:</strong>
                  <span>Encontrados {inspection.metadataCount} metadados no arquivo.</span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-white font-bold mb-0.5">Arquivo Limpo & Conforme:</strong>
                  <span>Nenhum metadado sensível de autoria, GPS ou dispositivo encontrado.</span>
                </div>
              </div>
            )}

            <button
              onClick={() => { setFile(null); setSanitizedBlobUrl(null); }}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-800 transition-colors"
            >
              Trocar Arquivo
            </button>
          </div>

          {/* Inspection Items & Scrub Button */}
          <div className="md:col-span-2 glass-panel p-6 rounded-2xl space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-emerald-400" />
              Relatório de Metadados Encontrados no Arquivo
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {inspection?.metadataItems && inspection.metadataItems.length > 0 ? (
                inspection.metadataItems.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold text-emerald-400">{item.category}</span>
                      <strong className="text-white font-medium">{item.key}</strong>
                    </div>
                    <span className="font-mono text-slate-300 bg-slate-900 px-2 py-1 rounded-md">{item.value}</span>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Nenhum metadado oculto ou de localização localizado neste arquivo.</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    100% LIMPO
                  </span>
                </div>
              )}
            </div>

            {isProcessing && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center space-x-3 text-emerald-300 text-xs animate-pulse">
                <Cpu className="w-4 h-4 animate-spin text-emerald-400" />
                <span>{statusMessage}</span>
              </div>
            )}

            {!sanitizedBlobUrl ? (
              <button
                onClick={handleSanitize}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                Higienizar & Remover Todos os Metadados
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                  Arquivo Higienizado com Sucesso! 100% Livre de EXIF e GPS.
                </div>
                <a
                  href={sanitizedBlobUrl}
                  download={`${file.name.substring(0, file.name.lastIndexOf('.'))}_higienizado.${file.name.split('.').pop()}`}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition-all block text-center"
                >
                  <Download className="w-4 h-4" />
                  Baixar Arquivo Higienizado Sem Metadados
                </a>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};
