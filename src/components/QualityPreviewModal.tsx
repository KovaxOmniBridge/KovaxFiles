import React, { useState } from 'react';
import { X, Eye, ShieldCheck, Download, Scale } from 'lucide-react';
import type { BatchFileItem } from '../types';
import { formatBytes } from '../utils/formatters';

interface QualityPreviewModalProps {
  item: BatchFileItem | null;
  onClose: () => void;
  onDownload: (item: BatchFileItem) => void;
}

export const QualityPreviewModal: React.FC<QualityPreviewModalProps> = ({
  item,
  onClose,
  onDownload,
}) => {
  const [sliderPos, setSliderPos] = useState(50); // percentage 0 - 100

  if (!item) return null;

  const originalSize = item.originalSize;
  const processedSize = item.processedSize || originalSize;
  const percentageSaved = originalSize > 0 && processedSize < originalSize
    ? Math.round(((originalSize - processedSize) / originalSize) * 100)
    : 0;

  const beforeUrl = item.previewBeforeUrl || item.originalUrl;
  const afterUrl = item.previewAfterUrl || item.processedUrl || beforeUrl;

  const isImageOrPdf = item.category === 'image' || item.category === 'pdf_court' || item.type.startsWith('image/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border-slate-700 shadow-2xl">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white truncate max-w-md">
                Comparativo de Qualidade: {item.name}
              </h3>
              <p className="text-xs text-slate-400">
                Compare visualmente a nitidez da imagem/documento e verifique a redução de tamanho.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Visual Split Slider */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center">
          
          {/* File Metric Comparison Badge */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block mb-1">Tamanho Original</span>
              <span className="text-sm font-mono font-bold text-white">{formatBytes(originalSize)}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block mb-1">Tamanho Otimizado</span>
              <span className="text-sm font-mono font-bold text-emerald-400">{formatBytes(processedSize)}</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center flex flex-col justify-center">
              <span className="text-xs text-emerald-300 block">Redução de Espaço</span>
              <span className="text-base font-bold text-emerald-400">
                {percentageSaved > 0 ? `-${percentageSaved}% Economizado` : 'Qualidade Preservada'}
              </span>
            </div>
          </div>

          {/* Interactive Comparison Container */}
          {isImageOrPdf && beforeUrl ? (
            <div className="w-full max-w-2xl relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 select-none shadow-2xl min-h-[300px] flex items-center justify-center">
              
              {/* After / Processed Image (Background) */}
              <div className="w-full flex items-center justify-center p-2">
                <img
                  src={afterUrl}
                  alt="Processado"
                  className="max-h-[450px] object-contain rounded-lg"
                />
              </div>

              {/* Before / Original Image (Clipped Overlay) */}
              <div
                className="absolute inset-0 overflow-hidden flex items-center justify-center p-2"
                style={{ width: `${sliderPos}%` }}
              >
                <img
                  src={beforeUrl}
                  alt="Original"
                  className="max-h-[450px] object-contain rounded-lg max-w-none"
                  style={{ width: '100%', height: '100%' }}
                />
              </div>

              {/* Divider Handle */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(255,255,255,0.8)] flex items-center justify-center"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center text-xs font-bold shadow-lg">
                  ↔
                </div>
              </div>

              {/* Slider Input overlay */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
              />

              {/* Labels */}
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded bg-slate-950/80 backdrop-blur text-[11px] font-bold text-slate-300 border border-slate-700">
                Original (Antes)
              </span>
              <span className="absolute top-3 right-3 px-2.5 py-1 rounded bg-slate-950/80 backdrop-blur text-[11px] font-bold text-emerald-400 border border-emerald-800">
                Otimizado (Depois)
              </span>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800 w-full">
              <ShieldCheck className="w-12 h-12 text-indigo-400 mx-auto mb-3 opacity-80" />
              <p className="text-sm font-semibold text-white">Arquivo pronto para download local</p>
              <p className="text-xs text-slate-400 mt-1">
                A conversão foi processada localmente sem perdas com sucesso.
              </p>
            </div>
          )}

          <p className="text-xs text-slate-500 mt-4 text-center">
            Arraste a barra para a esquerda ou direita para comparar a qualidade antes de baixar.
          </p>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Scale className="w-4 h-4 text-purple-400" />
            <span>Processado 100% no navegador do cliente</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Fechar
            </button>
            {item.processedBlob && (
              <button
                onClick={() => {
                  onDownload(item);
                  onClose();
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition-all"
              >
                <Download className="w-4 h-4" />
                Baixar Arquivo Otimizado
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
