import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, Video, Layers, ShieldCheck, HardDrive, TestTube, Camera } from 'lucide-react';
import { getSampleFiles, captureActiveTabFrame } from '../services';

interface DropzoneProps {
  onFilesAdded: (files: FileList | File[]) => void;
  currentCount: number;
  maxCount?: number;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFilesAdded,
  currentCount,
  maxCount = 50,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesAdded(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(e.target.files);
    }
  };

  const handleLoadSamples = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const samples = await getSampleFiles();
    onFilesAdded(samples);
  };

  const handleCaptureTab = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const capturedFile = await captureActiveTabFrame();
      if (capturedFile) {
        onFilesAdded([capturedFile]);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao capturar aba do navegador.');
    }
  };

  return (
    <div className="mb-8">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-300 group overflow-hidden ${
          isDragOver
            ? 'border-indigo-400 bg-indigo-950/30 scale-[1.01] shadow-2xl shadow-indigo-500/20'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,video/*,audio/*,application/pdf,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain,text/markdown,.md,.markdown,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,.docx,.doc,.pdf,.txt,.rtf,.odt,.html"
          onChange={handleFileChange}
        />

        {/* Ambient background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-indigo-400 group-hover:scale-110 group-hover:border-indigo-500/50 transition-all duration-300 shadow-lg shadow-indigo-950 mb-4">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">
            Arraste e solte seus arquivos aqui ou clique para selecionar
          </h3>
          <p className="text-xs text-slate-400 mb-4 max-w-md">
            Processamento 100% no seu navegador. Privacidade total com 0% de upload para servidores externos.
          </p>

          <div className="flex flex-wrap justify-center items-center gap-3 mb-6">
            <button
              type="button"
              onClick={handleCaptureTab}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 border border-sky-500/40 hover:border-sky-400 transition-all shadow-md active:scale-95"
            >
              <Camera className="w-4 h-4 text-sky-400 animate-pulse" />
              <span>🎥 Capturar Aba Aberta / Tela</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSamples}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 hover:border-indigo-400 transition-all shadow-md active:scale-95"
            >
              <TestTube className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>🧪 Carregar Arquivos de Teste (1 Clique)</span>
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Limite Máximo: 2 GB por arquivo</span>
            </div>
          </div>

          {/* Supported Format Pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-6 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-purple-300 border border-slate-700/60">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              PDF / Word / EPUB / ODT
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-emerald-300 border border-slate-700/60">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Planilhas (XLSX, CSV) ➔ PDF / Word
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-indigo-300 border border-slate-700/60">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              Imagens & RAW (DNG/CR2/TGA/DICOM/PNG) ➔ PDF / WEBP / ICO / DOCX
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-amber-300 border border-slate-700/60">
              <Video className="w-3.5 h-3.5 text-amber-400" />
              Vídeo & Áudio (MP4/MKV/MOV/MP3/WAV/OPUS/AMR) ➔ Transcodificação & GIF
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-sky-300 border border-slate-700/60">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              Arquivos .ZIP (Extração Automática)
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Fila: <strong className="text-slate-300 font-mono">{currentCount} / {maxCount}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Processamento 100% no seu computador
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
