import React, { useState, useRef } from 'react';
import { Sparkles, ShieldAlert, Trash2, Download, Cpu, CheckCircle2, FileText, AlertTriangle } from 'lucide-react';
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
      <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start justify-between relative z-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Proteção de Privacidade EXIF / GPS / Autoria • Em 1 Clique
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              Higienizador de Metadados Ocultos
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Remova metadados invisíveis que expõem coordenadas de GPS, modelo do celular, número de série de câmeras e dados de autoria em imagens e documentos antes do peticionamento público ou envio institucional.
            </p>
          </div>
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <Trash2 className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
        </div>
      </div>

      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white hover:bg-slate-50 rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-300 group shadow-xs"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mb-1">Selecione uma Imagem, PDF ou Vídeo para higienizar</h3>
          <p className="text-xs text-slate-500">Inspeção instantânea e eliminação de coordenadas de localização e rastros de dispositivos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* File Summary Column */}
          <div className="md:col-span-1 bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-xs">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
              <FileText className="w-8 h-8 text-emerald-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-900 truncate">{file.name}</h4>
                <span className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-600 block">Diagnóstico de Privacidade:</span>
              {inspection?.hasSensitiveMetadata ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    Metadados Sensíveis Detectados!
                  </div>
                  <p className="text-[11px]">Contém rastros de GPS ou informações do dispositivo.</p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Arquivo sem rastros de localização ou dispositivo detectados.</span>
                </div>
              )}
            </div>

            <button
              onClick={() => { setFile(null); setSanitizedBlobUrl(null); }}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
            >
              Trocar de Arquivo
            </button>
          </div>

          {/* Inspection Details & Action Column */}
          <div className="md:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl space-y-5 shadow-xs">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Metadados Encontrados no Arquivo
            </h3>

            {inspection && inspection.items.length > 0 ? (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {inspection.items.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-slate-900 block font-mono">{item.key}</span>
                      <span className="text-slate-600 truncate block text-[11px]">{item.value}</span>
                    </div>
                    {item.isSensitive && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                        Sensível / Rastro
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Nenhum cabeçalho EXIF/GPS crítico foi exposto neste arquivo.</span>
              </div>
            )}

            {isProcessing && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3 text-emerald-800 text-xs animate-pulse">
                <Cpu className="w-4 h-4 animate-spin text-emerald-600" />
                <span>{statusMessage}</span>
              </div>
            )}

            {!sanitizedBlobUrl ? (
              <button
                onClick={handleSanitize}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Higienizar & Remover Todos os Metadados EXIF/GPS
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Arquivo Higienizado com Sucesso e Salvo na Memória RAM!
                </div>
                <a
                  href={sanitizedBlobUrl}
                  download={`${file.name.replace(/\.([^.]+)$/, '')}_higienizado.$1`}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all block text-center"
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
