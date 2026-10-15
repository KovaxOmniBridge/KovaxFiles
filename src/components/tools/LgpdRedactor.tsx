import React, { useState, useEffect, useRef } from 'react';
import {
  EyeOff,
  ShieldCheck,
  Download,
  AlertTriangle,
  RefreshCw,
  Trash2,
  FolderArchive,
  FileText,
  Brain,
  Zap,
  Sparkles,
  CheckCircle2,
  Key,
  Server,
  Filter,
  CheckSquare,
  Square,
  HelpCircle,
  Plus,
  Cpu,
  ScanText,
  MousePointer,
  Maximize2
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { LocalPdfEngine } from '../../services/pdfEngine';
import { CompressionEngine } from '../../services/compressionEngine';
import { PdfTextExtractor, PageTextData } from '../../services/pdfTextExtractor';
import { AiRedactionService, AiEngineMode, AiSettings, DetectedRedactionItem, RedactionCategoryOptions } from '../../services/aiRedactionService';
import { UniversalAiClassifier, AiRigorLevel } from '../../services/universalAiClassifier';
import { PdfReportExporterService, LgpdAuditRecord } from '../../services/pdfReportExporterService';

export interface RedactResultItem {
  fileName: string;
  data: Uint8Array;
  redactionCount: number;
}

export const LgpdRedactor: React.FC = () => {
  // Configuração dos Arquivos Selecionados
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Configuração de Modo da IA - Padrão: IA Local Embutida no App
  const [aiMode, setAiMode] = useState<AiEngineMode>('embedded');
  const [rigorLevel, setRigorLevel] = useState<AiRigorLevel>('broad');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');

  // Status do Servidor de IA Local (Inicializado como Indisponível até validação real de inferência)
  const [embeddedAiStatus, setEmbeddedAiStatus] = useState<{
    running: boolean;
    checking: boolean;
    cpuCores: number;
    modelName: string;
    inferenceVerified?: boolean;
    inferenceLatencyMs?: number;
    statusMessage?: string;
  }>({
    running: false,
    checking: true,
    cpuCores: typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4,
    modelName: 'Verificando conectividade e inferência com motor local...'
  });

  useEffect(() => {
    let isMounted = true;

    async function probeAiHealth() {
      // 1. Tenta consulta via IPC no Electron se disponível (inclui teste real de inferência)
      if (typeof window !== 'undefined' && window.electronAPI?.getAiStatus) {
        try {
          const status = await window.electronAPI.getAiStatus();
          if (isMounted && status) {
            setEmbeddedAiStatus({
              running: status.running && !!status.inferenceVerified,
              checking: false,
              cpuCores: status.cpuCores || (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4) || 4,
              modelName: status.running
                ? (status.modelName || 'Motor Local C++ Ativo')
                : (status.modelName || 'Servidor Local Offline (Porta 18888)'),
              inferenceVerified: status.inferenceVerified,
              inferenceLatencyMs: status.inferenceLatencyMs,
              statusMessage: status.statusMessage
            });
            return;
          }
        } catch (err) {
          console.warn('[LgpdRedactor] Erro ao consultar status via IPC:', err);
        }
      }

      // 2. Fallback Browser: Probe em 3 etapas (Socket / Models / Inferência Real com Timeout de 3500ms)
      try {
        // Etapa 1: /health
        const healthRes = await fetch('http://127.0.0.1:18888/health', {
          signal: AbortSignal.timeout(1200)
        });

        if (healthRes.ok) {
          // Etapa 2: /v1/models
          let detectedModel = '';
          try {
            const modelsRes = await fetch('http://127.0.0.1:18888/v1/models', {
              signal: AbortSignal.timeout(1500)
            });
            if (modelsRes.ok) {
              const data = await modelsRes.json();
              if (Array.isArray(data.data) && data.data[0]?.id) {
                detectedModel = data.data[0].id;
              }
            }
          } catch {}

          if (!detectedModel) {
            if (isMounted) {
              setEmbeddedAiStatus({
                running: false,
                checking: false,
                cpuCores: typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4,
                modelName: 'Servidor HTTP Ativo (Nenhum modelo neural carregado)',
                inferenceVerified: false
              });
              return;
            }
          }

          // Etapa 3: Teste Real de Inferência (Smoke Test)
          const startTime = Date.now();
          try {
            const inferRes = await fetch('http://127.0.0.1:18888/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: detectedModel,
                messages: [
                  { role: 'system', content: 'Responda com uma palavra: OK' },
                  { role: 'user', content: 'Ping' }
                ],
                max_tokens: 5,
                temperature: 0.0
              }),
              signal: AbortSignal.timeout(3500)
            });

            if (inferRes.ok) {
              const inferJson = await inferRes.json();
              const reply = inferJson.choices?.[0]?.message?.content;
              const latencyMs = Date.now() - startTime;

              if (typeof reply === 'string' && reply.trim().length > 0) {
                if (isMounted) {
                  setEmbeddedAiStatus({
                    running: true,
                    checking: false,
                    cpuCores: typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4,
                    modelName: detectedModel,
                    inferenceVerified: true,
                    inferenceLatencyMs: latencyMs,
                    statusMessage: `Inferência validada (${latencyMs}ms)`
                  });
                  return;
                }
              }
            }
          } catch {
            // Falha na inferência
          }

          if (isMounted) {
            setEmbeddedAiStatus({
              running: false,
              checking: false,
              cpuCores: typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4,
              modelName: `${detectedModel} (Falha no teste de inferência)`,
              inferenceVerified: false,
              statusMessage: 'Servidor respondeu mas a inferência falhou ou excedeu 3500ms'
            });
            return;
          }
        }
      } catch {
        // Servidor offline ou porta fechada
      }

      if (isMounted) {
        setEmbeddedAiStatus({
          running: false,
          checking: false,
          cpuCores: typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4,
          modelName: 'Servidor Local Offline (Porta 18888)',
          inferenceVerified: false
        });
      }
    }

    probeAiHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Configuração das Categorias LGPD
  const [categories, setCategories] = useState<RedactionCategoryOptions>({
    cpf: true,
    cnpj: true,
    rg: true,
    emails: true,
    phones: true,
    names: true,
    addresses: true,
    financial: false,
    health: false,
    customKeywords: []
  });

  const [customTermInput, setCustomTermInput] = useState<string>('');

  // Estados do Fluxo de Análise e Tarjamento
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [pagesDataMap, setPagesDataMap] = useState<Map<string, PageTextData[]>>(new Map());
  const [detectedItems, setDetectedItems] = useState<DetectedRedactionItem[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState<boolean>(false);

  const [isRedacting, setIsRedacting] = useState<boolean>(false);
  const [results, setResults] = useState<RedactResultItem[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Estados de Desenho Manual com o Mouse no Canvas
  const [activePreviewPageIndex, setActivePreviewPageIndex] = useState<number>(0);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Adicionar termo customizado
  const handleAddCustomTerm = () => {
    if (!customTermInput.trim()) return;
    const terms = customTermInput.split(',').map(t => t.trim()).filter(Boolean);
    setCategories(prev => ({
      ...prev,
      customKeywords: Array.from(new Set([...prev.customKeywords, ...terms]))
    }));
    setCustomTermInput('');
  };

  const handleRemoveCustomTerm = (term: string) => {
    setCategories(prev => ({
      ...prev,
      customKeywords: prev.customKeywords.filter(t => t !== term)
    }));
  };

  // Upload de arquivos
  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const pdfs = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
      if (pdfs.length === 0) {
        setErrorMessage('Por favor, selecione apenas arquivos no formato PDF.');
        e.target.value = '';
        return;
      }
      setSelectedFiles(prev => [...prev, ...pdfs]);
      setResults(null);
      setDetectedItems([]);
      setHasAnalyzed(false);
      setErrorMessage(null);
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setResults(null);
    setDetectedItems([]);
    setHasAnalyzed(false);
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setResults(null);
    setDetectedItems([]);
    setPagesDataMap(new Map());
    setHasAnalyzed(false);
    setErrorMessage(null);
  };

  // Executar Análise Inteligente (Regex + IA + Fallback OCR)
  const handleRunAiAnalysis = async () => {
    if (selectedFiles.length === 0) return;

    setIsAnalyzing(true);
    setAnalysisProgress(10);
    setErrorMessage(null);
    setDetectedItems([]);

    const aiSettings: AiSettings = {
      mode: aiMode,
      rigorLevel,
      geminiApiKey
    };

    try {
      const allDetected: DetectedRedactionItem[] = [];
      const newPagesMap = new Map<string, PageTextData[]>();

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setAnalysisProgress(Math.round(((i + 0.3) / selectedFiles.length) * 80));

        const buffer = await file.arrayBuffer();
        const pagesData = await PdfTextExtractor.extractTextWithBounds(buffer);
        newPagesMap.set(file.name, pagesData);

        // Executa varredura por IA e Padrões com progresso por página em tempo real
        const items = await AiRedactionService.analyzePdf(
          pagesData,
          categories,
          aiSettings,
          p => setAnalysisProgress(p.percent)
        );
        allDetected.push(...items);
      }

      setPagesDataMap(newPagesMap);
      setDetectedItems(allDetected);
      setHasAnalyzed(true);
      setAnalysisProgress(100);
    } catch (err: any) {
      setErrorMessage('Erro durante a análise por Inteligência Artificial: ' + (err?.message || 'Falha desconhecida.'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Renderizar a página no Canvas de Pré-visualização para Desenho Manual
  useEffect(() => {
    if (!hasAnalyzed || selectedFiles.length === 0 || !canvasRef.current) return;

    let isMounted = true;
    const renderPreview = async () => {
      const file = selectedFiles[0];
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
      const pdf = await loadingTask.promise;
      
      const pageIndex = Math.min(activePreviewPageIndex, pdf.numPages - 1);
      const page = await pdf.getPage(pageIndex + 1);
      
      const scale = 1.2;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas || !isMounted) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Desenhar sobreposição das tarjas detectadas na página
      const pageItems = detectedItems.filter(item => item.pageIndex === pageIndex && item.selected);
      for (const item of pageItems) {
        // Converter coordenadas do PDF (origem bottom-left) para Canvas (origem top-left)
        const pdfY = item.rect.y;
        const pdfH = item.rect.height;
        const canvasX = item.rect.x * scale;
        const canvasY = (viewport.height / scale - (pdfY + pdfH)) * scale;
        const canvasW = item.rect.width * scale;
        const canvasH = pdfH * scale;

        ctx.fillStyle = 'rgba(239, 68, 68, 0.45)'; // Vermelho semitransparente na pré-visualização
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.fillRect(canvasX, canvasY, canvasW, canvasH);
        ctx.strokeRect(canvasX, canvasY, canvasW, canvasH);
      }
    };

    renderPreview();
    return () => { isMounted = false; };
  }, [hasAnalyzed, selectedFiles, activePreviewPageIndex, detectedItems]);

  // Manipuladores de Evento de Desenho de Tarja Manual com o Mouse no Canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setDrawStart({ x, y });
    setCurrentBox({ x, y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const x = Math.min(drawStart.x, currentX);
    const y = Math.min(drawStart.y, currentY);
    const w = Math.abs(currentX - drawStart.x);
    const h = Math.abs(currentY - drawStart.y);

    setCurrentBox({ x, y, w, h });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox || !canvasRef.current) {
      setIsDrawing(false);
      return;
    }

    if (currentBox.w > 5 && currentBox.h > 5) {
      const scale = 1.2;
      const canvasH = canvasRef.current.height;

      // Converter retângulo desenhado do Canvas para coordenadas do PDF
      const pdfX = currentBox.x / scale;
      const pdfW = currentBox.w / scale;
      const pdfH = currentBox.h / scale;
      const pdfY = (canvasH - (currentBox.y + currentBox.h)) / scale;

      const newManualItem: DetectedRedactionItem = {
        id: 'manual-' + Math.random().toString(36).substring(7),
        pageIndex: activePreviewPageIndex,
        text: 'Tarja Manual (Desenho com o Mouse)',
        category: 'Personalizado',
        reason: 'Tarja desenhada manualmente pelo usuário sobre elemento visual (foto/assinatura)',
        confidence: 1.0,
        selected: true,
        rect: {
          pageIndex: activePreviewPageIndex,
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH
        }
      };

      setDetectedItems(prev => [...prev, newManualItem]);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setCurrentBox(null);
  };

  // Alternar Seleção de um Item Detectado
  const toggleItemSelection = (id: string) => {
    setDetectedItems(prev => prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item));
  };

  const setAllItemsSelection = (selected: boolean) => {
    setDetectedItems(prev => prev.map(item => ({ ...item, selected })));
  };

  // Executar Burn-in (Anonimização Definitiva com Tarjas Pretas)
  const handleProcessRedaction = async () => {
    if (selectedFiles.length === 0) return;

    const approvedItems = detectedItems.filter(i => i.selected);
    if (approvedItems.length === 0 && hasAnalyzed) {
      setErrorMessage('Selecione pelo menos um item detectado para aplicar as tarjas.');
      return;
    }

    setIsRedacting(true);
    setErrorMessage(null);

    try {
      const processedResults: RedactResultItem[] = [];

      for (const file of selectedFiles) {
        const buffer = await file.arrayBuffer();
        
        let rectsToApply: { pageIndex: number; x: number; y: number; width: number; height: number }[] = [];

        if (hasAnalyzed) {
          rectsToApply = approvedItems.map(i => i.rect);
        } else {
          // Tarjamento Heurístico Padrão de Emergência
          const pagesData = pagesDataMap.get(file.name) || await PdfTextExtractor.extractTextWithBounds(buffer);
          const autoItems = await AiRedactionService.analyzePdf(pagesData, categories, {
            mode: 'embedded',
            geminiApiKey: ''
          });
          rectsToApply = autoItems.map(i => i.rect);
        }

        const redactedBytes = await LocalPdfEngine.redactPdf(buffer, rectsToApply, { sanitizeFlatten: true });

        processedResults.push({
          fileName: file.name.replace(/\.pdf$/i, '_anonimizado_LGPD.pdf'),
          data: redactedBytes,
          redactionCount: rectsToApply.length
        });
      }

      setResults(processedResults);
    } catch (err: any) {
      setErrorMessage('Erro ao queimar tarjas no PDF: ' + (err?.message || 'Erro inesperado.'));
    } finally {
      setIsRedacting(false);
    }
  };

  // Downloads
  const handleDownloadSingle = (res: RedactResultItem) => {
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
    a.download = 'Documentos_Anonimizados_LGPD_Lote.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filtragem dos itens exibidos
  const filteredDetectedItems = detectedItems.filter(item => {
    if (categoryFilter === 'ALL') return true;
    return item.category === categoryFilter;
  });

  const selectedCount = detectedItems.filter(i => i.selected).length;
  const isAnyScanned = Array.from(pagesDataMap.values()).some(pages => pages.some(p => p.isScanned));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <EyeOff className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Tarjador & Anonimizador LGPD Universal</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Burn-in Definitivo + IA + OCR + Desenho Manual
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Analise e queime permanentemente dados sigilosos (CPFs, nomes de partes, endereços, assinaturas e fotos) em PDFs nativos ou escaneados.
          </p>
        </div>
      </div>

      {/* 1. Selector de Motor de Inteligência Artificial */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Brain className="w-4 h-4 text-emerald-400" />
            <span>Motor de Análise e Detecção:</span>
          </label>

          {/* Badge de Status da IA Local com Diagnóstico Real */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all ${
            embeddedAiStatus.checking
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : embeddedAiStatus.running
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              embeddedAiStatus.checking
                ? 'bg-amber-400 animate-pulse'
                : embeddedAiStatus.running
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-slate-500'
            }`} />
            <Cpu className="w-3.5 h-3.5" />
            <span>
              {embeddedAiStatus.checking
                ? 'Diagnosticando Motor Local (Porta 18888)...'
                : embeddedAiStatus.running
                  ? `Motor C++ Conectado: ${embeddedAiStatus.modelName} (${embeddedAiStatus.cpuCores} núcleos)`
                  : `Motor C++ Offline — Fallback Neural Local (WASM/BERT) Ativo`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Card: IA Local Embutida WASM/BERT - Padrão */}
          <div
            onClick={() => setAiMode('embedded')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              aiMode === 'embedded'
                ? 'bg-emerald-950/50 border-emerald-500/70 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-950/50'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Brain className="w-4 h-4" />
                <span>IA Neural Local (BERT / WASM)</span>
              </div>
              {aiMode === 'embedded' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong>Padrão Autônomo (100% Offline).</strong> Reconhecimento de entidades nomeadas (NER) e classificação Zero-Shot em memória.
            </p>
          </div>

          {/* Card: Regex / Padrões (100% Offline) */}
          <div
            onClick={() => setAiMode('pattern')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              aiMode === 'pattern'
                ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-300 font-bold text-xs">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Somente Regex (Ultra Rápido)</span>
              </div>
              {aiMode === 'pattern' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Varredura instantânea por números conhecidos (CPFs, CNPJs, RGs, E-mails e Telefones).
            </p>
          </div>

          {/* Card: Servidor Local C++ (Porta 18888) */}
          <div
            onClick={() => setAiMode('embedded')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              aiMode === 'embedded'
                ? 'bg-purple-950/40 border-purple-500/60 ring-1 ring-purple-500/30'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                <Server className="w-4 h-4" />
                <span>Servidor Local C++ (Porta 18888)</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                embeddedAiStatus.running
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {embeddedAiStatus.running ? 'Inferência Comprovada' : 'Offline'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {embeddedAiStatus.running
                ? `Modelo: ${embeddedAiStatus.modelName}. Inferência ativa comprovada (${embeddedAiStatus.inferenceLatencyMs ? embeddedAiStatus.inferenceLatencyMs + 'ms' : 'OK'}).`
                : `${embeddedAiStatus.modelName}. O aplicativo opera via motor neural local WASM.`}
            </p>
          </div>
        </div>


      </div>

      {/* Seletor de Rigor da IA Universal Zero-Shot (Para qualquer documento inédito) */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Intensidade de Análise de IA Universal Zero-Shot (Documentos Inéditos):</span>
          </label>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            ✨ Zero Pré-configuração
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div
            onClick={() => setRigorLevel('essential')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              rigorLevel === 'essential'
                ? 'bg-emerald-950/50 border-emerald-500/70 ring-1 ring-emerald-500/40'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-emerald-400">🟢 Essencial (LGPD Básica)</span>
              {rigorLevel === 'essential' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </div>
            <p className="text-[11px] text-slate-400">
              Identifica nomes de cidadãos, CPFs, RGs, e-mails e endereços em qualquer tipo de documento.
            </p>
          </div>

          <div
            onClick={() => setRigorLevel('broad')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              rigorLevel === 'broad'
                ? 'bg-emerald-950/50 border-emerald-500/70 ring-1 ring-emerald-500/40'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-emerald-400">🟡 Amplo (LGPD Completo - Padrão)</span>
              {rigorLevel === 'broad' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </div>
            <p className="text-[11px] text-slate-400">
              Adiciona dados bancários, salários, contas, CEPs e qualificações contratuais de partes.
            </p>
          </div>

          <div
            onClick={() => setRigorLevel('maximum')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              rigorLevel === 'maximum'
                ? 'bg-purple-950/50 border-purple-500/70 ring-1 ring-purple-500/40'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-purple-400">🔴 Máximo (Segredo de Justiça & Saúde)</span>
              {rigorLevel === 'maximum' && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
            </div>
            <p className="text-[11px] text-slate-400">
              Auditoria profunda para laudos médicos, CIDs, registros de menores, testemunhas e dados sensíveis.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Filtros de Categorias LGPD */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          Filtros de Anonimização & Categorias Sensíveis:
        </label>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
            <input
              type="checkbox"
              checked={categories.cpf}
              onChange={(e) => setCategories({ ...categories, cpf: e.target.checked })}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <span className="font-medium text-slate-300">CPFs (Regex)</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
            <input
              type="checkbox"
              checked={categories.cnpj}
              onChange={(e) => setCategories({ ...categories, cnpj: e.target.checked })}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <span className="font-medium text-slate-300">CNPJs</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
            <input
              type="checkbox"
              checked={categories.rg}
              onChange={(e) => setCategories({ ...categories, rg: e.target.checked })}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <span className="font-medium text-slate-300">RGs / Documentos</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
            <input
              type="checkbox"
              checked={categories.emails}
              onChange={(e) => setCategories({ ...categories, emails: e.target.checked })}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <span className="font-medium text-slate-300">E-mails / Contatos</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
            <input
              type="checkbox"
              checked={categories.names}
              onChange={(e) => setCategories({ ...categories, names: e.target.checked })}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <span className="font-medium text-slate-300">Nomes de Pessoas (IA)</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
            <input
              type="checkbox"
              checked={categories.addresses}
              onChange={(e) => setCategories({ ...categories, addresses: e.target.checked })}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <span className="font-medium text-slate-300">Endereços (IA)</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
            <input
              type="checkbox"
              checked={categories.financial}
              onChange={(e) => setCategories({ ...categories, financial: e.target.checked })}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <span className="font-medium text-slate-300">Financeiro (IA)</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
            <input
              type="checkbox"
              checked={categories.health}
              onChange={(e) => setCategories({ ...categories, health: e.target.checked })}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <span className="font-medium text-slate-300">Saúde / Laudos (IA)</span>
          </label>
        </div>
      </div>

      {/* 3. Upload Dropzone */}
      <div className="dropzone p-8 text-center cursor-pointer relative rounded-2xl border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-900/40 transition-all">
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFilesChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <EyeOff className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">
              Arraste um ou múltiplos PDFs para anonimização universal (Nativos ou Escaneados)
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Suporta leitura OCR de fotos/scans e desenho manual de tarjas com o mouse.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Lista de PDFs Selecionados e Ação de Análise */}
      {selectedFiles.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>PDFs Selecionados ({selectedFiles.length}):</span>
            </span>

            <button
              onClick={clearAll}
              className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Tudo</span>
            </button>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/60 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-200 font-medium truncate">{file.name}</span>
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  className="text-red-400 hover:text-red-300 font-bold px-1.5 py-0.5 rounded hover:bg-red-500/10 text-sm transition-all"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Botão de Análise de IA */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleRunAiAnalysis}
              disabled={isAnalyzing}
              className="btn-action px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 disabled:opacity-50 transition-all"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analisando com IA + OCR... ({analysisProgress}%)</span>
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  <span>Analisar & Detectar Dados Sigilosos por IA ({selectedFiles.length} PDF)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 5. Visualizador Canvas de Páginas com Ferramenta de Desenho Manual de Tarjas por Mouse */}
      {hasAnalyzed && selectedFiles.length > 0 && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-3 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Visualizador de Páginas & Desenho Manual de Tarja</h3>
                {isAnyScanned && (
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-semibold flex items-center gap-1">
                    <ScanText className="w-3 h-3" />
                    Documento Digitalizado (OCR Local Ativo)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Clique e arraste o mouse sobre a página para desenhar retângulos manuais (ex: fotos, assinaturas físicas ou carimbos).
              </p>
            </div>

            {/* Navegação entre Páginas do PDF */}
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setActivePreviewPageIndex(prev => Math.max(0, prev - 1))}
                disabled={activePreviewPageIndex === 0}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-medium"
              >
                Anterior
              </button>
              <span className="text-slate-300 font-bold px-2">
                Página {activePreviewPageIndex + 1}
              </span>
              <button
                onClick={() => setActivePreviewPageIndex(prev => prev + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium"
              >
                Próxima
              </button>
            </div>
          </div>

          {/* Canvas de Desenho */}
          <div className="flex justify-center bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-auto max-h-[500px] relative">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="cursor-crosshair shadow-2xl rounded border border-slate-700/80"
            />
            {currentBox && isDrawing && (
              <div
                style={{
                  position: 'absolute',
                  left: currentBox.x + 16,
                  top: currentBox.y + 16,
                  width: currentBox.w,
                  height: currentBox.h,
                  backgroundColor: 'rgba(239, 68, 68, 0.6)',
                  border: '2px solid #ef4444',
                  pointerEvents: 'none'
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* 6. Painel de Revisão Interativa dos Itens Detectados */}
      {hasAnalyzed && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-3 gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Brain className="w-4 h-4 text-emerald-400" />
                <span>Resultados da Análise ({detectedItems.length} ocorrência(s) detectada(s))</span>
              </h3>
              <p className="text-xs text-slate-400">
                Revise os trechos identificados abaixo. Apenas os itens marcados serão queimados com tarja preta.
              </p>
            </div>

            {/* Controles da seleção */}
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setAllItemsSelection(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1.5 transition-all"
              >
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Marcar Todos</span>
              </button>

              <button
                onClick={() => setAllItemsSelection(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1.5 transition-all"
              >
                <Square className="w-3.5 h-3.5 text-slate-400" />
                <span>Desmarcar Todos</span>
              </button>
            </div>
          </div>

          {/* Filtro por Categoria */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-400 text-[11px] font-medium">Filtrar:</span>

            {['ALL', 'CPF', 'CNPJ', 'RG', 'E-mail', 'Telefone', 'Nome de Pessoa', 'Endereço', 'Financeiro', 'Saúde', 'Personalizado'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  categoryFilter === cat
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat === 'ALL' ? 'Todos' : cat}
              </button>
            ))}
          </div>

          {/* Lista de Cards de Entidades */}
          {filteredDetectedItems.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/80 text-xs text-slate-500">
              Nenhuma ocorrência encontrada para a categoria selecionada.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {filteredDetectedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleItemSelection(item.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    item.selected
                      ? 'bg-slate-950 border-emerald-500/50 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleItemSelection(item.id)}
                      className="w-4 h-4 accent-emerald-600 rounded mt-0.5 cursor-pointer"
                    />

                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                          {item.category}
                        </span>

                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium">
                          Pág. {item.pageIndex + 1}
                        </span>

                        <span className="text-[10px] text-slate-500 font-mono">
                          Confiança: {Math.round(item.confidence * 100)}%
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-100 font-mono bg-slate-900/90 px-2 py-1 rounded inline-block border border-slate-800 mb-1">
                        "{item.text}"
                      </p>

                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{item.reason}</span>
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-semibold px-2 py-1 rounded ${
                    item.selected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {item.selected ? 'Selecionado para Tarjar' : 'Ignorado'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Rodapé de Ação de Burn-in */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-300">
              {selectedCount} de {detectedItems.length} tarja(s) aprovada(s)
            </span>

            <button
              onClick={handleProcessRedaction}
              disabled={isRedacting || selectedCount === 0}
              className="btn-action px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 disabled:opacity-50 transition-all"
            >
              {isRedacting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Queimando Tarjas nos PDFs...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Aplicar Tarjamento e Sanitização LGPD ({selectedCount})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 7. Erros */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 8. Resultados do Tarjamento (Pós Burn-in) */}
      {results && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">{results.length} Documento(s) Anonimizado(s) com Sucesso!</h3>
                <p className="text-xs text-slate-400">Tarjas pretas aplicadas com sanitização documental por achatamento rasterizado (300 DPI).</p>
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
                  <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    {res.redactionCount} tarja(s) aplicadas
                  </span>
                </div>
                <button
                  onClick={() => handleDownloadSingle(res)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-semibold text-xs flex items-center gap-1.5 border border-emerald-500/30 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar PDF
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={clearAll}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Anonimizar Novos Documentos
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!detectedItems || detectedItems.length === 0) return;
                  const records: LgpdAuditRecord[] = detectedItems.map(item => ({
                    id: item.id,
                    originalTerm: item.text,
                    maskedTerm: '[DADO ANONIMIZADO LGPD]',
                    entityType: item.category,
                    detectionReason: item.reason || 'Regra de Conformidade LGPD',
                    timestamp: new Date().toLocaleString('pt-BR')
                  }));
                  PdfReportExporterService.exportLgpdAuditCsv(records);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                Auditoria (CSV)
              </button>

              <button
                onClick={() => {
                  if (!detectedItems || detectedItems.length === 0) return;
                  const records: LgpdAuditRecord[] = detectedItems.map(item => ({
                    id: item.id,
                    originalTerm: item.text,
                    maskedTerm: '[DADO ANONIMIZADO LGPD]',
                    entityType: item.category,
                    detectionReason: item.reason || 'Regra de Conformidade LGPD',
                    timestamp: new Date().toLocaleString('pt-BR')
                  }));
                  PdfReportExporterService.exportLgpdAuditJson(records);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                Auditoria (JSON)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LgpdRedactor;
