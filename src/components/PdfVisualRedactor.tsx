import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, MousePointer, ShieldAlert, Trash2, RotateCw, ZoomIn, ZoomOut, RotateCcw, Stamp, Download, Cpu } from 'lucide-react';
import type { PiiDetectionItem } from '../services';
import { watermarkService, type WatermarkOptions } from '../services';


interface PdfVisualRedactorProps {
  file: File;
  redactionItems: PiiDetectionItem[];
  onAddVisualRedaction: (item: PiiDetectionItem) => void;
  onRemoveVisualRedaction: (id: string) => void;
}

export const PdfVisualRedactor: React.FC<PdfVisualRedactorProps> = ({
  file,
  redactionItems = [],
  onAddVisualRedaction,
  onRemoveVisualRedaction,
}) => {
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [zoomScale, setZoomScale] = useState(1.0);

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);

  // Watermark State
  const [showWatermarkPanel, setShowWatermarkPanel] = useState(false);
  const [watermarkText, setWatermarkText] = useState('CONFIDENCIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [watermarkRotation, setWatermarkRotation] = useState(-45);
  const [isTiledWatermark, setIsTiledWatermark] = useState(false);
  const [watermarkColor, setWatermarkColor] = useState('#EF4444');
  const [isApplyingWatermark, setIsApplyingWatermark] = useState(false);
  const [watermarkedBlobUrl, setWatermarkedBlobUrl] = useState<string | null>(null);


  // Load PDF Document
  useEffect(() => {
    let isMounted = true;
    const loadPdf = async () => {
      try {
        const buffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
        const doc = await loadingTask.promise;
        if (isMounted) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error('Erro ao carregar PDF no visualizador:', err);
      }
    };
    loadPdf();
    return () => { isMounted = false; };
  }, [file]);

  // Render Base PDF Page (ONCE per page change/zoom/rotation - NEVER on mousemove)
  const renderPdfBase = useCallback(async () => {
    if (!pdfDoc || !pdfCanvasRef.current || !containerRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const pdfCanvas = pdfCanvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      const ctx = pdfCanvas.getContext('2d')!;

      const containerWidth = containerRef.current.clientWidth - 48;
      const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
      const fitScale = Math.min(1.5, containerWidth / unscaledViewport.width);
      const effectiveScale = fitScale * zoomScale;
      const viewport = page.getViewport({ scale: effectiveScale, rotation });

      pdfCanvas.width = viewport.width;
      pdfCanvas.height = viewport.height;

      if (overlayCanvas) {
        overlayCanvas.width = viewport.width;
        overlayCanvas.height = viewport.height;
      }

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Erro ao renderizar base do PDF:', err);
    }
  }, [pdfDoc, currentPage, rotation, zoomScale]);

  useEffect(() => {
    renderPdfBase();
  }, [renderPdfBase]);

  // Render Overlay Layer (Fast 60fps - Redaction boxes + active mouse drag selection)
  const drawOverlay = useCallback(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d')!;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Render Redaction Boxes for Current Page
    const pageItems = (redactionItems || []).filter(
      (i) => i && i.selected && (i.pageIndex === currentPage - 1 || i.pageIndex === undefined)
    );

    pageItems.forEach((item) => {
      if (item.customRect) {
        const rx = (item.customRect.xPercent / 100) * overlay.width;
        const ry = (item.customRect.yPercent / 100) * overlay.height;
        const rw = (item.customRect.widthPercent / 100) * overlay.width;
        const rh = (item.customRect.heightPercent / 100) * overlay.height;

        ctx.fillStyle = '#000000'; // PURE SOLID BLACK
        ctx.fillRect(rx, ry, rw, rh);
      } else if (item.type === 'Região Cabeçalho') {
        ctx.fillStyle = '#000000'; // PURE SOLID BLACK
        ctx.fillRect(0, 0, overlay.width, overlay.height * 0.12);
      } else if (item.type === 'Região Rodapé') {
        ctx.fillStyle = '#000000'; // PURE SOLID BLACK
        ctx.fillRect(0, overlay.height * 0.88, overlay.width, overlay.height * 0.12);
      }
    });

    // Draw active mouse drag selection box if drawing
    if (isDrawing && startPos && currentPos) {
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      const w = Math.abs(currentPos.x - startPos.x);
      const h = Math.abs(currentPos.y - startPos.y);

      ctx.fillStyle = 'rgba(168, 85, 247, 0.35)';
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
  }, [redactionItems, currentPage, isDrawing, startPos, currentPos]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  // Mouse Drag Events
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return { x: 0, y: 0 };
    const rect = overlay.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(coords);
    setCurrentPos(coords);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);
    setCurrentPos(coords);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !startPos || !currentPos || !overlayCanvasRef.current) {
      setIsDrawing(false);
      return;
    }

    const overlay = overlayCanvasRef.current;
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const w = Math.abs(currentPos.x - startPos.x);
    const h = Math.abs(currentPos.y - startPos.y);

    if (w > 8 && h > 6) {
      const xPercent = (x / overlay.width) * 100;
      const yPercent = (y / overlay.height) * 100;
      const widthPercent = (w / overlay.width) * 100;
      const heightPercent = (h / overlay.height) * 100;

      const visualItem: PiiDetectionItem = {
        id: `visual_${Date.now()}_${Math.random()}`,
        type: 'Seleção Visual',
        textValue: `Seleção Visual (${Math.round(w)}x${Math.round(h)}px)`,
        location: `Página ${currentPage}`,
        selected: true,
        pageIndex: currentPage - 1,
        customRect: {
          xPercent,
          yPercent,
          widthPercent,
          heightPercent,
        },
      };

      onAddVisualRedaction(visualItem);
    }

    setIsDrawing(false);
    setStartPos(null);
    setCurrentPos(null);
  };

  const handleApplyWatermark = async () => {
    if (!file) return;
    setIsApplyingWatermark(true);
    setWatermarkedBlobUrl(null);

    try {
      const options: WatermarkOptions = {
        text: watermarkText,
        opacity: watermarkOpacity,
        rotationDegrees: watermarkRotation,
        isTiled: isTiledWatermark,
        colorHex: watermarkColor,
        pages: 'all',
      };

      const { blob } = await watermarkService.applyTextWatermark(file, options);
      const url = URL.createObjectURL(blob);
      setWatermarkedBlobUrl(url);
    } catch (err) {
      console.error('Erro ao aplicar marca d\'água:', err);
    } finally {
      setIsApplyingWatermark(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-4">
      
      {/* Top Visual Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
        
        {/* Instruction badge */}
        <div className="flex items-center space-x-2 text-purple-300">
          <MousePointer className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="font-bold">Arraste o mouse sobre qualquer palavra ou imagem para tarjar</span>
        </div>

        {/* Controls: Zoom & Rotate & Page Nav & Watermark */}
        <div className="flex items-center space-x-2">
          
          <button
            onClick={() => setShowWatermarkPanel(!showWatermarkPanel)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              showWatermarkPanel
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Stamp className="w-3.5 h-3.5 text-indigo-400" />
            Marca D'Água
          </button>

          {/* Zoom controls */}
          <div className="flex items-center space-x-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setZoomScale((z) => Math.max(0.6, z - 0.15))}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Reduzir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-slate-300 text-[11px] px-1 font-bold">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={() => setZoomScale((z) => Math.min(2.5, z + 0.15))}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rotate controls */}
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Rotacionar 90°"
          >
            <RotateCw className="w-4 h-4 text-indigo-400" />
          </button>

          <button
            onClick={() => { setZoomScale(1.0); setRotation(0); }}
            className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Resetar Zoom e Rotação"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="h-5 w-[1px] bg-slate-800 mx-1" />

          {/* Page Navigation */}
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-white text-xs font-bold px-1">
            {currentPage} / {numPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Expandable Watermark Configuration Panel */}
      {showWatermarkPanel && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Stamp className="w-4 h-4 text-indigo-400" />
              Configurador de Marca D'Água & Carimbo Visual
            </span>
            <span className="text-[10px] text-slate-400">100% Memória RAM Local</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Texto da Marca D'Água:</label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="Ex: CONFIDENCIAL"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Opacidade ({Math.round(watermarkOpacity * 100)}%):</label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Ângulo de Rotação:</label>
              <select
                value={watermarkRotation}
                onChange={(e) => setWatermarkRotation(parseInt(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
              >
                <option value={-45}>Diagonal (-45°)</option>
                <option value={45}>Diagonal Inversa (45°)</option>
                <option value={0}>Horizontal (0°)</option>
                <option value={90}>Vertical (90°)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Cor do Carimbo:</label>
              <input
                type="color"
                value={watermarkColor}
                onChange={(e) => setWatermarkColor(e.target.value)}
                className="w-full h-8 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isTiledWatermark}
                onChange={(e) => setIsTiledWatermark(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
              />
              <span>Padrão em Mosaico / Repetido (Tiled)</span>
            </label>

            {!watermarkedBlobUrl ? (
              <button
                onClick={handleApplyWatermark}
                disabled={isApplyingWatermark || !watermarkText.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isApplyingWatermark ? <Cpu className="w-3.5 h-3.5 animate-spin" /> : <Stamp className="w-3.5 h-3.5" />}
                Aplicar Marca D'Água no PDF
              </button>
            ) : (
              <a
                href={watermarkedBlobUrl}
                download={`${file.name.replace(/\.pdf$/i, '')}_marcadagua.pdf`}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar PDF com Marca D'Água (.pdf)
              </a>
            )}
          </div>
        </div>
      )}


      {/* Two-Canvas Layer System: Base PDF Canvas (Bottom) + Overlay Canvas (Top) */}
      <div className="flex justify-center bg-slate-950 p-4 rounded-3xl border border-slate-800 overflow-auto shadow-2xl relative max-h-[70vh]">
        <div className="relative inline-block">
          
          {/* Base PDF Canvas (renders PDF page ONCE) */}
          <canvas
            ref={pdfCanvasRef}
            className="rounded-xl shadow-xl select-none block"
          />

          {/* Overlay Canvas (60fps smooth mouse events & drag box drawing) */}
          <canvas
            ref={overlayCanvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="absolute inset-0 cursor-crosshair rounded-xl select-none"
            style={{ touchAction: 'none' }}
          />

        </div>
      </div>

      {/* List of Custom Visual Drag Selections */}
      {redactionItems.some((i) => i.type === 'Seleção Visual') && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-400" />
            Tarjas Desenhadas com o Mouse no Visualizador ({redactionItems.filter(i => i.type === 'Seleção Visual').length}):
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {redactionItems
              .filter((i) => i.type === 'Seleção Visual')
              .map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between text-xs text-white"
                >
                  <div>
                    <span className="text-[10px] text-purple-400 font-bold uppercase block">{item.location}</span>
                    <span className="font-mono text-slate-200">{item.textValue}</span>
                  </div>
                  <button
                    onClick={() => onRemoveVisualRedaction(item.id)}
                    className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    title="Remover tarja visual"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

    </div>
  );
};
