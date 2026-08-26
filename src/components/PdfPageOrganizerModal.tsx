import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { X, RotateCw, RotateCcw, Trash2, ArrowLeft, ArrowRight, Download, RefreshCw, FileText } from 'lucide-react';
import { pdfPageEditorService, type PageRotationMap } from '../services/pdf/pdfPageEditorService';
import { setupPdfWorker } from '../services/pdf/pdfWorkerInit';

setupPdfWorker();


interface PageItem {
  originalIndex: number;
  id: string;
  dataUrl: string;
  rotation: number; // 0, 90, 180, 270
}

interface PdfPageOrganizerModalProps {
  isOpen: boolean;
  file: File | null;
  onClose: () => void;
  onSave?: (newBlob: Blob, filename: string) => void;
}

export const PdfPageOrganizerModal: React.FC<PdfPageOrganizerModalProps> = ({
  isOpen,
  file,
  onClose,
  onSave,
}) => {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !file) return;

    let isMounted = true;
    const loadPdfThumbnails = async () => {
      setLoading(true);
      setError(null);
      setPages([]);
      setLoadingText('Carregando documento e gerando miniaturas das páginas...');

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const total = pdf.numPages;

        const pageItems: PageItem[] = [];

        for (let i = 1; i <= total; i++) {
          if (!isMounted) return;
          setLoadingText(`Renderizando página ${i} de ${total}...`);

          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            pageItems.push({
              originalIndex: i - 1,
              id: `page-${i}-${Date.now()}`,
              dataUrl: canvas.toDataURL('image/jpeg', 0.8),
              rotation: 0,
            });
          }
        }

        if (isMounted) {
          setPages(pageItems);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Falha ao carregar páginas do PDF.');
          setLoading(false);
        }
      }
    };

    loadPdfThumbnails();

    return () => {
      isMounted = false;
    };
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const handleRotate = (index: number, direction: 'cw' | 'ccw') => {
    setPages((prev) =>
      prev.map((p, idx) => {
        if (idx !== index) return p;
        const change = direction === 'cw' ? 90 : -90;
        let newRot = (p.rotation + change) % 360;
        if (newRot < 0) newRot += 360;
        return { ...p, rotation: newRot };
      })
    );
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    setPages((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleDelete = (index: number) => {
    setPages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleRotateAll = (direction: 'cw' | 'ccw') => {
    setPages((prev) =>
      prev.map((p) => {
        const change = direction === 'cw' ? 90 : -90;
        let newRot = (p.rotation + change) % 360;
        if (newRot < 0) newRot += 360;
        return { ...p, rotation: newRot };
      })
    );
  };

  const handleSaveAndExport = async () => {
    if (!file || pages.length === 0) return;
    setSaving(true);
    setLoadingText('Processando e gerando novo documento PDF...');

    try {
      // 1. Reordenar e filtrar páginas excluídas
      const keepIndices = pages.map((p) => p.originalIndex);
      const reordered = await pdfPageEditorService.reorderAndDeletePages(file, keepIndices);

      // 2. Se houverem rotações individuais, aplica rotação no novo arquivo
      const tempFile = new File([reordered.blob], file.name, { type: 'application/pdf' });
      const rotationMap: PageRotationMap = {};

      pages.forEach((p, newIndex) => {
        if (p.rotation !== 0) {
          rotationMap[newIndex] = p.rotation;
        }
      });

      let finalResult = reordered;
      if (Object.keys(rotationMap).length > 0) {
        finalResult = await pdfPageEditorService.rotatePdfPages(tempFile, rotationMap);
      }

      const outName = file.name.replace(/\.[^/.]+$/, '') + '_editado.pdf';

      if (onSave) {
        onSave(finalResult.blob, outName);
      } else {
        const url = URL.createObjectURL(finalResult.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outName;
        a.click();
        URL.revokeObjectURL(url);
      }

      setSaving(false);
      onClose();
    } catch (err: any) {
      setError('Erro ao salvar alterações no PDF: ' + (err?.message || err));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Organizador Visual de Páginas</h3>
              <p className="text-xs text-slate-500 truncate max-w-md">{file.name}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleRotateAll('cw')}
              disabled={loading || saving}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
              title="Girar todas as páginas 90° à direita"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Girar Todas (90°)
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto min-h-[350px] bg-slate-100/50">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4 py-16">
              <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">{loadingText}</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs text-center py-8">
              {error}
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              Nenhuma página encontrada para exibir.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {pages.map((p, idx) => (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs hover:shadow-md transition-all flex flex-col items-center relative group"
                >
                  {/* Page Badge */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-mono font-bold z-10">
                    Pág. {idx + 1}
                  </span>

                  {/* Thumbnail Image */}
                  <div className="w-full h-44 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 my-1">
                    <img
                      src={p.dataUrl}
                      alt={`Página ${idx + 1}`}
                      className="max-h-full max-w-full object-contain transition-transform duration-300"
                      style={{ transform: `rotate(${p.rotation}deg)` }}
                    />
                  </div>

                  {/* Page Action Toolbar */}
                  <div className="w-full flex items-center justify-between pt-2 border-t border-slate-100 gap-1">
                    <button
                      onClick={() => handleRotate(idx, 'ccw')}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                      title="Girar anti-horário"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRotate(idx, 'cw')}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                      title="Girar horário"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 'left')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30"
                      title="Mover para esquerda"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 'right')}
                      disabled={idx === pages.length - 1}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30"
                      title="Mover para direita"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(idx)}
                      className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                      title="Excluir página"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            {pages.length} páginas no total
          </span>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveAndExport}
              disabled={loading || saving || pages.length === 0}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Salvar PDF Reordenado
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
