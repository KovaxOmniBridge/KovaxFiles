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
        className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-10 text-center cursor-pointer transition-all duration-300 group overflow-hidden ${
          isDragOver
            ? 'border-blue-600 bg-blue-50/80 scale-[1.01] shadow-md shadow-blue-500/10'
            : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50 shadow-xs'
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

        <div className="relative z-10 flex flex-col items-center">
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 group-hover:scale-110 transition-all duration-300 shadow-xs mb-4">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
            Arraste e solte seus arquivos aqui ou clique para selecionar
          </h3>
          <p className="text-xs text-slate-600 mb-4 max-w-md">
            Processamento 100% no seu navegador. Privacidade total com 0% de upload para servidores externos.
          </p>

          <div className="flex flex-wrap justify-center items-center gap-2.5 mb-6">
            <button
              type="button"
              onClick={handleCaptureTab}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 transition-all shadow-xs active:scale-95"
            >
              <Camera className="w-4 h-4 text-sky-600" />
              <span>🎥 Capturar Aba Aberta / Tela</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSamples}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition-all shadow-xs active:scale-95"
            >
              <TestTube className="w-4 h-4 text-blue-600" />
              <span>🧪 Carregar Arquivos de Teste (1 Clique)</span>
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
              <HardDrive className="w-3.5 h-3.5 text-amber-600" />
              <span>Limite Máximo: 2 GB por arquivo</span>
            </div>
          </div>

          {/* Supported Format Pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-6 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-indigo-800 border border-slate-200">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              PDF / Word / EPUB / ODT
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-emerald-800 border border-slate-200">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              Planilhas (XLSX, CSV) ➔ PDF / Word
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-blue-800 border border-slate-200">
              <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
              Imagens (HEIC/PNG/JPG/WEBP) ➔ PDF / WEBP / DOCX
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-amber-800 border border-slate-200">
              <Video className="w-3.5 h-3.5 text-amber-600" />
              Vídeo & Áudio (MP4/MP3/WAV) ➔ Transcodificação
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-sky-800 border border-slate-200">
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              Arquivos .ZIP (Extração Automática)
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Fila: <strong className="text-slate-900 font-mono">{currentCount} / {maxCount}</strong>
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Processamento 100% no seu computador
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
