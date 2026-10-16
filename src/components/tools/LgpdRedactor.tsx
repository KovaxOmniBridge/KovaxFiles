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
  Maximize2,
  Folder,
  ExternalLink,
  Gauge,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
  Lock,
  Unlock,
  Check,
  Table,
  X,
  FileX
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  LocalPdfEngine,
  RasterizationQualityProfile,
  RasterizationQualityReport,
  RASTER_QUALITY_PROFILES,
  AnonymizePdfOptions
} from '../../services/pdfEngine';
import { CompressionEngine } from '../../services/compressionEngine';
import { PdfTextExtractor, PageTextData } from '../../services/pdfTextExtractor';
import {
  RedactionDetectionService,
  DetectionMode,
  DetectionSettings,
  DetectedRedactionItem,
  RedactionCategoryOptions
} from '../../services/aiRedactionService';
import { DocumentEntityClassifier, DetectionRigorLevel } from '../../services/universalAiClassifier';
import { PdfReportExporterService, LgpdAuditRecord } from '../../services/pdfReportExporterService';

export interface ManagedRedactionDocument {
  fileId: string;
  file: File;
  name: string;
  size: number;
}

export interface RedactResultItem {
  fileId?: string;
  originalFileName?: string;
  fileName: string;
  data: Uint8Array;
  redactionCount: number;
  savedPath?: string;
  rasterReport?: RasterizationQualityReport;
}

export interface FileRedactionStatus {
  fileId: string;
  fileName: string;
  fileSize: number;
  totalPages: number;
  isScanned: boolean;
  reproved: boolean;
  reprovedReason?: string;
  manualOverride?: boolean;
}

export const LgpdRedactor: React.FC = () => {
  // Configuração dos Documentos Selecionados (Gerenciados por fileId único e imutável)
  const [selectedDocs, setSelectedDocs] = useState<ManagedRedactionDocument[]>([]);
  const [fileStatuses, setFileStatuses] = useState<FileRedactionStatus[]>([]);
  
  // Derivação para compatibilidade com APIs externas
  const selectedFiles = selectedDocs.map(d => d.file);
  
  // Configuração de Modo de Varredura - Padrão: Varredura por Padrões Determinísticos
  const [scanMode, setScanMode] = useState<DetectionMode>('pattern');
  const [rigorLevel, setRigorLevel] = useState<DetectionRigorLevel>('broad');

  // Configuração de Rasterização e Critérios de Qualidade (Achatamento Seguro)
  const [rasterProfile, setRasterProfile] = useState<RasterizationQualityProfile>('balanced');
  const [customTargetDpi, setCustomTargetDpi] = useState<number>(300);
  const [customMinDpi, setCustomMinDpi] = useState<number>(150);
  const [customQuality, setCustomQuality] = useState<number>(88);
  const [customMaxPixels, setCustomMaxPixels] = useState<number>(25);
  const [expandedReportIdx, setExpandedReportIdx] = useState<number | null>(null);

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

  // Estados de Desenho Manual com o Mouse no Canvas e Seleção de Arquivo Ativo
  const [activePreviewFileIndex, setActivePreviewFileIndex] = useState<number>(0);
  const [activePreviewPageIndex, setActivePreviewPageIndex] = useState<number>(0);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Estados de Controle Estrito por Arquivo, Confirmação Explícita e Relatório Técnico
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmUnderstood, setConfirmUnderstood] = useState<boolean>(false);
  const [fileViewFilter, setFileViewFilter] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [removedItemsAudit, setRemovedItemsAudit] = useState<LgpdAuditRecord[]>([]);
  const [showAuditTable, setShowAuditTable] = useState<boolean>(true);

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

  // Upload de arquivos com geração de fileId único e imutável por documento
  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const pdfs = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
      if (pdfs.length === 0) {
        setErrorMessage('Por favor, selecione apenas arquivos no formato PDF.');
        e.target.value = '';
        return;
      }
      const newDocs: ManagedRedactionDocument[] = pdfs.map((file, idx) => ({
        fileId: `doc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}_${idx}`,
        file,
        name: file.name,
        size: file.size
      }));
      setSelectedDocs(prev => [...prev, ...newDocs]);
      setResults(null);
      setDetectedItems([]);
      setHasAnalyzed(false);
      setErrorMessage(null);
      e.target.value = '';
    }
  };

  const removeDocument = (fileId: string) => {
    setSelectedDocs(prev => prev.filter(d => d.fileId !== fileId));
    setFileStatuses(prev => prev.filter(f => f.fileId !== fileId));
    setDetectedItems(prev => prev.filter(item => item.fileId !== fileId));
    setPagesDataMap(prev => {
      const next = new Map(prev);
      next.delete(fileId);
      return next;
    });
    setActivePreviewFileIndex(0);
    setActivePreviewPageIndex(0);
    setResults(null);
    setRemovedItemsAudit([]);
    setHasAnalyzed(false);
  };

  const removeFile = (index: number) => {
    const doc = selectedDocs[index];
    if (doc) removeDocument(doc.fileId);
  };

  const clearAll = () => {
    setSelectedDocs([]);
    setFileStatuses([]);
    setActivePreviewFileIndex(0);
    setActivePreviewPageIndex(0);
    setResults(null);
    setDetectedItems([]);
    setRemovedItemsAudit([]);
    setPagesDataMap(new Map());
    setHasAnalyzed(false);
    setErrorMessage(null);
    setShowConfirmModal(false);
    setConfirmUnderstood(false);
  };

  // Alternar permissão manual para arquivo escaneado reprovado por fileId
  const toggleFileManualOverride = (fileId: string) => {
    setFileStatuses(prev => prev.map(f => f.fileId === fileId ? { ...f, manualOverride: !f.manualOverride } : f));
  };

  // Selecionar/desmarcar itens exclusivamente do arquivo informado (estrito por fileId)
  const setFileItemsSelection = (fileId: string, selected: boolean) => {
    setDetectedItems(prev => prev.map(item =>
      item.fileId === fileId ? { ...item, selected } : item
    ));
  };

  // Executar Análise Inteligente com Diagnóstico de Reprovação Óptica
  const handleRunAiAnalysis = async () => {
    if (selectedDocs.length === 0) return;

    setIsAnalyzing(true);
    setAnalysisProgress(10);
    setErrorMessage(null);
    setDetectedItems([]);
    setFileStatuses([]);
    setRemovedItemsAudit([]);

    const detectionSettings: DetectionSettings = {
      mode: scanMode,
      rigorLevel
    };

    try {
      const allDetected: DetectedRedactionItem[] = [];
      const newPagesMap = new Map<string, PageTextData[]>();
      const newStatuses: FileRedactionStatus[] = [];

      for (let i = 0; i < selectedDocs.length; i++) {
        const doc = selectedDocs[i];
        setAnalysisProgress(Math.round(((i + 0.1) / selectedDocs.length) * 80));

        const buffer = await doc.file.arrayBuffer();
        const pagesData = await PdfTextExtractor.extractTextWithBounds(
          buffer,
          p => setAnalysisProgress(Math.round(((i + (p.percent / 100) * 0.4) / selectedDocs.length) * 80))
        );
        newPagesMap.set(doc.fileId, pagesData);

        // Avaliação de integridade óptica: o processamento deve reprovar se não puder analisar adequadamente
        const isFileScanned = pagesData.some(p => p.isScanned);
        const badOcrPage = pagesData.find(p => p.isScanned && p.ocrQuality && p.ocrQuality.status !== 'ok');
        const isReproved = !!badOcrPage;
        const reprovedReason = badOcrPage
          ? `Página ${badOcrPage.pageIndex + 1}: ${badOcrPage.ocrQuality?.reason || 'Reconhecimento óptico incompleto/ilegível'}`
          : undefined;

        newStatuses.push({
          fileId: doc.fileId,
          fileName: doc.name,
          fileSize: doc.size,
          totalPages: pagesData.length,
          isScanned: isFileScanned,
          reproved: isReproved,
          reprovedReason,
          manualOverride: false
        });

        // Executa varredura por padrões e regras LGPD com progresso por página em tempo real, indexado por fileId
        const items = await RedactionDetectionService.analyzePdf(
          pagesData,
          categories,
          detectionSettings,
          p => setAnalysisProgress(Math.round(((i + 0.4 + (p.percent / 100) * 0.6) / selectedDocs.length) * 80)),
          doc.name,
          doc.fileId
        );
        allDetected.push(...items);
      }

      setPagesDataMap(newPagesMap);
      setDetectedItems(allDetected);
      setFileStatuses(newStatuses);
      setHasAnalyzed(true);
      setAnalysisProgress(100);

      const reprovedFiles = newStatuses.filter(f => f.reproved);
      if (reprovedFiles.length > 0) {
        setErrorMessage(
          `Aviso de Reprovação de Documento: ${reprovedFiles.length} arquivo(s) escaneado(s) não puderam ser analisados adequadamente pelo OCR (${reprovedFiles.map(f => f.fileName).join(', ')}). O processamento automatizado destes arquivos foi bloqueado para impedir vazamento de dados por omissão.`
        );
      }
    } catch (err: any) {
      setErrorMessage('Erro durante a análise de dados sensíveis: ' + (err?.message || 'Falha desconhecida.'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Renderizar a página no Canvas de Pré-visualização para Desenho Manual
  useEffect(() => {
    if (!hasAnalyzed || selectedDocs.length === 0 || !canvasRef.current) return;

    let isMounted = true;
    const renderPreview = async () => {
      const docIndex = Math.min(activePreviewFileIndex, selectedDocs.length - 1);
      const activeDoc = selectedDocs[docIndex];
      if (!activeDoc) return;

      const buffer = await activeDoc.file.arrayBuffer();
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

      // Desenhar sobreposição das tarjas detectadas na página EXCLUSIVAMENTE deste arquivo por fileId
      const pageItems = detectedItems.filter(item =>
        item.fileId === activeDoc.fileId &&
        item.pageIndex === pageIndex &&
        item.selected
      );
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

        // Badge textual da categoria desenhado diretamente sobre a tarja para auditoria visual
        const badgeW = Math.max(30, Math.min(canvasW, 75));
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(canvasX, Math.max(0, canvasY - 13), badgeW, 13);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(item.category.substring(0, 11), canvasX + 2, Math.max(9, canvasY - 3));
      }
    };

    renderPreview();
    return () => { isMounted = false; };
  }, [hasAnalyzed, selectedDocs, activePreviewFileIndex, activePreviewPageIndex, detectedItems]);

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

      const docIndex = Math.min(activePreviewFileIndex, selectedDocs.length - 1);
      const activeDoc = selectedDocs[docIndex] || selectedDocs[0];

      const newManualItem: DetectedRedactionItem = {
        id: 'manual-' + Math.random().toString(36).substring(7),
        fileId: activeDoc?.fileId,
        fileName: activeDoc?.name,
        pageIndex: activePreviewPageIndex,
        text: 'Tarja Manual (Desenho com o Mouse)',
        category: 'Personalizado',
        reason: activeDoc ? `Tarja manual em ${activeDoc.name} (pág. ${activePreviewPageIndex + 1})` : 'Tarja desenhada manualmente pelo usuário sobre elemento visual',
        confidence: 1.0,
        selected: true,
        rect: {
          pageIndex: activePreviewPageIndex,
          fileId: activeDoc?.fileId,
          fileName: activeDoc?.name,
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

  // 1. Inicia o fluxo com verificação estrita de reprovação e abre modal de confirmação explícita
  const handleInitiateRedaction = () => {
    if (selectedDocs.length === 0) return;

    // Fluxo Obrigatório: Requer análise prévia revisada (eliminação da anonimização cega/emergencial)
    if (!hasAnalyzed) {
      setErrorMessage(
        'Fluxo de Segurança Obrigatório: É indispensável executar a Análise Prévia e validar as tarjas antes de efetuar a anonimização definitiva. A anonimização emergencial sem análise prévia foi descontinuada para garantir conformidade integral com a LGPD.'
      );
      return;
    }

    // Bloqueio rigoroso de arquivo escaneado reprovado sem override explícito do operador
    const blockedFiles = fileStatuses.filter(f => f.reproved && !f.manualOverride);
    if (blockedFiles.length > 0) {
      setErrorMessage(
        `[PROCESSO REPROVADO]: O arquivo escaneado '${blockedFiles[0].fileName}' não pôde ser analisado adequadamente pelo OCR (${blockedFiles[0].reprovedReason}). Para prevenir vazamentos por omissão de dados, a exportação deste lote foi bloqueada. Remova o arquivo reprovado ou autorize a liberação manual após inspecioná-lo.`
      );
      return;
    }

    const approvedItems = detectedItems.filter(i => i.selected);
    if (approvedItems.length === 0) {
      setErrorMessage('Nenhuma tarja selecionada. Selecione pelo menos um item detectado ou desenhe uma tarja manual para prosseguir.');
      return;
    }

    setErrorMessage(null);
    setConfirmUnderstood(false);
    setShowConfirmModal(true);
  };

  // 2. Executa o Burn-in Definitivo após confirmação explícita do operador
  const handleExecuteConfirmedRedaction = async () => {
    if (!hasAnalyzed) {
      setErrorMessage('Operação abortada: Análise e confirmação prévias são obrigatórias.');
      return;
    }
    setShowConfirmModal(false);
    setIsRedacting(true);
    setErrorMessage(null);

    try {
      const processedResults: RedactResultItem[] = [];
      const auditRecords: LgpdAuditRecord[] = [];
      const approvedItems = detectedItems.filter(i => i.selected);

      for (const doc of selectedDocs) {
        const buffer = await doc.file.arrayBuffer();
        
        // Filtra ESTRITAMENTE as tarjas aprovadas pertencentes a este fileId específico
        const fileApprovedItems = approvedItems.filter(i => i.fileId === doc.fileId);
        const rectsToApply = fileApprovedItems.map(i => ({
          ...i.rect,
          fileId: doc.fileId,
          fileName: doc.name
        }));

        const rasterOptions: AnonymizePdfOptions = {
          profile: rasterProfile,
          dpi: rasterProfile === 'custom' ? customTargetDpi : undefined,
          minDpi: rasterProfile === 'custom' ? customMinDpi : undefined,
          quality: rasterProfile === 'custom' ? customQuality / 100 : undefined,
          maxPixelsPerPage: rasterProfile === 'custom' ? customMaxPixels * 1_000_000 : undefined,
          targetFileId: doc.fileId,
          targetFileName: doc.name
        };

        const anonymizeRes = await LocalPdfEngine.anonymizePdfWithReport(buffer, rectsToApply, rasterOptions);
        const transformedFileName = doc.name.replace(/\.pdf$/i, '') + '_anonimizado_LGPD.pdf';

        processedResults.push({
          fileId: doc.fileId,
          originalFileName: doc.name,
          fileName: transformedFileName,
          data: anonymizeRes.pdfBytes,
          redactionCount: rectsToApply.length,
          rasterReport: anonymizeRes.report
        });

        // Registrar itens removidos para o Relatório Técnico de Integridade e Auditoria
        for (const item of fileApprovedItems) {
          const termHash = PdfReportExporterService.computeTermHash(item.text);
          auditRecords.push({
            id: item.id,
            fileId: doc.fileId,
            fileName: doc.name,
            pageNumber: item.pageIndex + 1,
            originalTerm: item.text,
            termHash,
            maskedTerm: '[DADO ANONIMIZADO LGPD]',
            entityType: item.category,
            detectionReason: item.reason || 'Regra de Conformidade LGPD',
            coordinates: `X: ${item.rect.x.toFixed(1)}, Y: ${item.rect.y.toFixed(1)}, L: ${item.rect.width.toFixed(1)}, A: ${item.rect.height.toFixed(1)}`,
            timestamp: new Date().toLocaleString('pt-BR'),
            status: 'REMOVIDO / TARJADO'
          });
        }
      }

      setResults(processedResults);
    } catch (err: any) {
      setErrorMessage('Erro ao queimar tarjas no PDF: ' + (err?.message || 'Erro inesperado.'));
    } finally {
      setIsRedacting(false);
    }
  };

  // Downloads e Exportação com Suporte a Autorização de Sessão Nativa
  const handleDownloadSingle = async (res: RedactResultItem) => {
    // Se estiver executando no Electron Desktop, utiliza a gravação nativa com autorização de sessão
    if (typeof window !== 'undefined' && window.electronAPI?.saveExportedFile) {
      try {
        const saveRes = await window.electronAPI.saveExportedFile(res.fileName, res.data);
        if (saveRes?.success && saveRes.filePath) {
          setResults(prev => prev ? prev.map(r => r.fileName === res.fileName ? { ...r, savedPath: saveRes.filePath } : r) : prev);
          return;
        } else if (saveRes?.error) {
          setErrorMessage(`Falha na exportação nativa: ${saveRes.error}`);
          return;
        } else if (saveRes?.canceled) {
          return;
        }
      } catch (err: any) {
        console.warn('Falha no salvamento nativo do Electron, tentando download web:', err);
      }
    }

    // Fallback de navegador web via Blob
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

  // Filtragem dos itens exibidos com suporte a isolamento estrito por documento
  const activeDoc = selectedDocs[activePreviewFileIndex] || selectedDocs[0];
  const activeFileId = activeDoc?.fileId;
  const filteredDetectedItems = detectedItems.filter(item => {
    if (fileViewFilter === 'ACTIVE') {
      if (!activeFileId || item.fileId !== activeFileId) return false;
    }
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
              Burn-in Definitivo + Padrões LGPD + OCR + Desenho Manual
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Analise e queime permanentemente dados sigilosos (CPFs, nomes de partes, endereços, assinaturas e fotos) em PDFs nativos ou escaneados.
          </p>
        </div>
      </div>

      {/* 1. Seletor de Modo de Detecção */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Motor de Triagem e Detecção de Dados Sensíveis:</span>
          </label>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-medium bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/30" />
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Local & Determinístico (Zero Vazamento Externo)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Opção 1: Varredura Algorítmica Ampla */}
          <div
            onClick={() => setScanMode('comprehensive')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              scanMode === 'comprehensive'
                ? 'bg-emerald-950/50 border-emerald-500/70 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-950/50'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <FileText className="w-4 h-4" />
                <span>Varredura Algorítmica Ampla (Padrões + Nomes/Endereços)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Recomendado
                </span>
                {scanMode === 'comprehensive' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </div>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
              Varre o documento por expressões regulares e heurísticas estruturadas para sugerir nomes de partes, médicos, logradouros, dados financeiros e diagnósticos CID-10 com proteção de OAB.
            </p>
            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-[10px] text-emerald-300/90 leading-normal flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Supervisão Humana Ativa:</strong> As sugestões de detecção são auxiliares. Cada item detectado deve ser revisado e validado pelo operador antes da aplicação das tarjas.
              </span>
            </div>
          </div>

          {/* Opção 2: Somente Padrões Determinísticos / Regex */}
          <div
            onClick={() => setScanMode('pattern')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              scanMode === 'pattern'
                ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-300 font-bold text-xs">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Somente Padrões Determinísticos (Ultra Rápido)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                  Instantâneo
                </span>
                {scanMode === 'pattern' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
              Varredura algorítmica direta e instantânea por formatos objetivos conhecidos (CPFs, CNPJs, RGs, E-mails e Telefones).
            </p>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400 leading-normal flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Ideal para lotes volumosos de comprovantes, certidões e planilhas onde apenas números estruturados precisam ser anonimizados.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Seletor de Rigor da Varredura Algorítmica */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Rigor da Varredura Algorítmica LGPD:</span>
          </label>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            ✨ Análise Local
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
            <span className="font-medium text-slate-300">Nomes de Pessoas (Partes/Médicos)</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
            <input
              type="checkbox"
              checked={categories.addresses}
              onChange={(e) => setCategories({ ...categories, addresses: e.target.checked })}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <span className="font-medium text-slate-300">Endereços & CEP</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
            <input
              type="checkbox"
              checked={categories.financial}
              onChange={(e) => setCategories({ ...categories, financial: e.target.checked })}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <span className="font-medium text-slate-300">Financeiro (R$ e Contas)</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
            <input
              type="checkbox"
              checked={categories.health}
              onChange={(e) => setCategories({ ...categories, health: e.target.checked })}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <span className="font-medium text-slate-300">Saúde (CID-10 e CRM)</span>
          </label>
        </div>
      </div>

      {/* 2.1 Critérios de Qualidade e Perfil de Rasterização (Achatamento Seguro) */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-400" />
            <span>Perfil de Rasterização & Critérios de Qualidade Mínima:</span>
          </label>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 w-fit">
            🛡️ Sanitização por Achatamento Rasterizado (Destruição Física de Texto)
          </span>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          O achatamento adaptativo transforma o PDF em imagens de alta definição, destruindo fisicamente qualquer texto ou metadados subjacentes.
          Escolha o perfil adequado entre qualidade gráfica, tamanho do arquivo e consumo de memória — <strong>sem comprometer o sigilo e a irreversibilidade da anonimização</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* Equilibrado */}
          <div
            onClick={() => setRasterProfile('balanced')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              rasterProfile === 'balanced'
                ? 'bg-emerald-950/50 border-emerald-500/70 ring-1 ring-emerald-500/40'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-emerald-400">⚖️ Equilibrado (Padrão)</span>
              {rasterProfile === 'balanced' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              300 DPI nominais com piso de 150 DPI para plantas/páginas grandes. Ideal para processos jurídicos e autos gerais.
            </p>
            <div className="text-[10px] text-slate-500 space-y-0.5 border-t border-slate-800/80 pt-1.5 font-mono">
              <div>• Alvo: 300 DPI | Piso: 150 DPI</div>
              <div>• Qualidade: 88% | Teto: 25 MP</div>
            </div>
          </div>

          {/* Alta Fidelidade */}
          <div
            onClick={() => setRasterProfile('high_quality')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              rasterProfile === 'high_quality'
                ? 'bg-purple-950/50 border-purple-500/70 ring-1 ring-purple-500/40'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-purple-400">🔍 Alta Fidelidade Forense</span>
              {rasterProfile === 'high_quality' && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              300 DPI nominais com piso rigoroso de 220 DPI e teto de 50 MP. Preserva carimbos diminutos e assinaturas manuscritas.
            </p>
            <div className="text-[10px] text-slate-500 space-y-0.5 border-t border-slate-800/80 pt-1.5 font-mono">
              <div>• Alvo: 300 DPI | Piso: 220 DPI</div>
              <div>• Qualidade: 95% | Teto: 50 MP</div>
            </div>
          </div>

          {/* Econômico */}
          <div
            onClick={() => setRasterProfile('compact')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              rasterProfile === 'compact'
                ? 'bg-blue-950/50 border-blue-500/70 ring-1 ring-blue-500/40'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-blue-400">⚡ Econômico (PJe / Uploads)</span>
              {rasterProfile === 'compact' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              200 DPI nominais com piso de 100 DPI e compressão otimizada. Para portais com restrição severa de tamanho (ex: PJe 10MB).
            </p>
            <div className="text-[10px] text-slate-500 space-y-0.5 border-t border-slate-800/80 pt-1.5 font-mono">
              <div>• Alvo: 200 DPI | Piso: 100 DPI</div>
              <div>• Qualidade: 75% | Teto: 12 MP</div>
            </div>
          </div>

          {/* Personalizado */}
          <div
            onClick={() => setRasterProfile('custom')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              rasterProfile === 'custom'
                ? 'bg-amber-950/50 border-amber-500/70 ring-1 ring-amber-500/40'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-amber-400">⚙️ Personalizado</span>
              {rasterProfile === 'custom' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Ajuste fino manual de DPI alvo, piso mínimo garantido, qualidade JPEG e teto de memória.
            </p>
            <div className="text-[10px] text-slate-500 space-y-0.5 border-t border-slate-800/80 pt-1.5 font-mono">
              <div>• Alvo: {customTargetDpi} DPI | Piso: {customMinDpi} DPI</div>
              <div>• Qualidade: {customQuality}% | Teto: {customMaxPixels} MP</div>
            </div>
          </div>
        </div>

        {/* Controles do Modo Personalizado */}
        {rasterProfile === 'custom' && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                DPI Nominal Alvo: <span className="text-emerald-400 font-mono">{customTargetDpi} DPI</span>
              </label>
              <input
                type="range"
                min="100"
                max="600"
                step="25"
                value={customTargetDpi}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCustomTargetDpi(val);
                  if (customMinDpi > val) setCustomMinDpi(val);
                }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Resolução desejada para páginas padrão</span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Piso Mínimo Garantido: <span className="text-amber-400 font-mono">{customMinDpi} DPI</span>
              </label>
              <input
                type="range"
                min="72"
                max={customTargetDpi}
                step="10"
                value={customMinDpi}
                onChange={(e) => setCustomMinDpi(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Nunca reduz abaixo deste valor em páginas grandes</span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Qualidade de Imagem JPEG: <span className="text-purple-400 font-mono">{customQuality}%</span>
              </label>
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={customQuality}
                onChange={(e) => setCustomQuality(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Balanço entre nitidez e tamanho do PDF</span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Teto de Memória por Página: <span className="text-blue-400 font-mono">{customMaxPixels} MP</span>
              </label>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={customMaxPixels}
                onChange={(e) => setCustomMaxPixels(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Megapixels máximos antes de ativar adaptação</span>
            </div>
          </div>
        )}
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
            {selectedDocs.map((doc, idx) => (
              <div key={doc.fileId} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/60 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-200 font-medium truncate" title={`${doc.name} (ID: ${doc.fileId})`}>
                    {doc.name}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                    ID: {doc.fileId.slice(-6)}
                  </span>
                </div>
                <button
                  onClick={() => removeDocument(doc.fileId)}
                  className="text-red-400 hover:text-red-300 font-bold px-1.5 py-0.5 rounded hover:bg-red-500/10 text-sm transition-all"
                  title="Remover documento do lote"
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
                  <span>Analisando padrões LGPD... ({analysisProgress}%)</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Analisar & Detectar Dados Sigilosos ({selectedDocs.length} PDF)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 5. Visualizador Canvas de Páginas com Ferramenta de Desenho Manual de Tarjas por Mouse */}
      {hasAnalyzed && selectedDocs.length > 0 && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
          {/* Abas Superiores de Isolamento Estrito de Arquivo */}
          {selectedDocs.length > 1 && (
            <div className="space-y-1.5 pb-2 border-b border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Documentos no Lote (Isolamento Estrito):
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {selectedDocs.map((doc, idx) => {
                  const fStatus = fileStatuses.find(s => s.fileId === doc.fileId);
                  const isReproved = fStatus?.reproved && !fStatus?.manualOverride;
                  const fileItems = detectedItems.filter(i => i.fileId === doc.fileId);
                  const fileApproved = fileItems.filter(i => i.selected).length;

                  return (
                    <button
                      key={doc.fileId}
                      type="button"
                      onClick={() => {
                        setActivePreviewFileIndex(idx);
                        setActivePreviewPageIndex(0);
                      }}
                      className={`px-3 py-2 rounded-xl text-left border shrink-0 transition-all text-xs flex items-center gap-2 ${
                        idx === activePreviewFileIndex
                          ? isReproved
                            ? 'bg-red-950/60 border-red-500 text-white shadow-md ring-1 ring-red-500/50'
                            : 'bg-emerald-950/60 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500/50'
                          : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <FileText className={`w-4 h-4 ${isReproved ? 'text-red-400' : 'text-emerald-400'}`} />
                      <div className="flex flex-col text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold truncate max-w-[150px]" title={`${doc.name} (${doc.fileId})`}>{doc.name}</span>
                          <span className="text-[9px] font-mono text-slate-500">#{doc.fileId.slice(-4)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px]">
                          {isReproved ? (
                            <span className="text-red-400 font-bold">❌ Reprovado (OCR Ilegível)</span>
                          ) : (
                            <span className="text-emerald-400">{fileApproved} de {fileItems.length} aprovados</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Banner de Reprovação Óptica para o Arquivo Ativo (se houver) */}
          {(() => {
            const activeDoc = selectedDocs[activePreviewFileIndex];
            const activeStatus = fileStatuses.find(s => s.fileId === activeDoc?.fileId);
            if (!activeStatus?.reproved) return null;

            return (
              <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/40 text-xs text-red-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="block text-red-300 font-bold">
                      ❌ ARQUIVO REPROVADO PARA PROCESSAMENTO AUTOMÁTICO
                    </strong>
                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-mono font-bold">
                      {activeStatus.fileName}
                    </span>
                  </div>
                  <p className="text-red-200/90 leading-relaxed">
                    {activeStatus.reprovedReason}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    O processamento e a exportação deste arquivo foram <strong>bloqueados</strong> para prevenir vazamentos de dados pessoais decorrentes de reconhecimento omisso.
                    Para aprovar a inclusão deste documento, inspecione a folha no visualizador abaixo, desenhe manualmente as tarjas pretas sobre os dados sensíveis e ative a liberação manual.
                  </p>
                  <div className="pt-1.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleFileManualOverride(activeStatus.fileId)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        activeStatus.manualOverride
                          ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300 shadow-sm'
                          : 'bg-red-500/20 hover:bg-red-500/30 border-red-500/40 text-red-200'
                      }`}
                    >
                      {activeStatus.manualOverride ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Liberação Manual Concedida (Tarjas Manuais Autorizadas)</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Liberar Arquivo sob Revisão Manual do Operador</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-3 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Revisão Visual Pré-Exportação & Desenho de Tarjas
                </h3>
                {isAnyScanned && (
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-semibold flex items-center gap-1">
                    <ScanText className="w-3 h-3" />
                    OCR Local Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Revise os retângulos detectados ou clique e arraste para desenhar tarjas adicionais antes da confirmação final.
              </p>
            </div>

            {/* Navegação entre Arquivos e Páginas do PDF */}
            <div className="flex items-center gap-3 text-xs flex-wrap">
              {selectedDocs.length > 1 && (
                <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[11px] font-medium">Arquivo:</span>
                  <select
                    value={activePreviewFileIndex}
                    onChange={(e) => {
                      setActivePreviewFileIndex(Number(e.target.value));
                      setActivePreviewPageIndex(0);
                    }}
                    className="bg-transparent text-slate-200 font-semibold text-xs focus:outline-none cursor-pointer max-w-[180px] truncate"
                  >
                    {selectedDocs.map((doc, idx) => (
                      <option key={doc.fileId} value={idx} className="bg-slate-900 text-slate-200">
                        {doc.name} (#{doc.fileId.slice(-4)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
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
                <span>Resultados da Análise ({detectedItems.length} ocorrência(s) no lote)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Cada arquivo mantém suas próprias detecções e aprovações. Apenas os itens marcados serão queimados com tarja definitiva.
              </p>
            </div>

            {/* Alternância de Visualização e Controles de Seleção */}
            <div className="flex items-center gap-2 text-xs flex-wrap">
              {selectedDocs.length > 1 && (
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFileViewFilter('ACTIVE')}
                    className={`px-2.5 py-1 rounded font-semibold transition-all ${
                      fileViewFilter === 'ACTIVE'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Arquivo Ativo
                  </button>
                  <button
                    type="button"
                    onClick={() => setFileViewFilter('ALL')}
                    className={`px-2.5 py-1 rounded font-semibold transition-all ${
                      fileViewFilter === 'ALL'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Todos do Lote
                  </button>
                </div>
              )}

              {activeDoc && (
                <>
                  <button
                    type="button"
                    onClick={() => setFileItemsSelection(activeDoc.fileId, true)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-[11px] flex items-center gap-1 transition-all"
                    title={`Marcar todos os itens de ${activeDoc.name}`}
                  >
                    <CheckSquare className="w-3 h-3 text-emerald-400" />
                    <span>Aprovar Deste Arquivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFileItemsSelection(activeDoc.fileId, false)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-[11px] flex items-center gap-1 transition-all"
                    title={`Desmarcar todos os itens de ${activeDoc.name}`}
                  >
                    <Square className="w-3 h-3 text-slate-400" />
                    <span>Desmarcar Deste</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setAllItemsSelection(true)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-[11px] flex items-center gap-1 transition-all"
              >
                <span>Marcar Tudo</span>
              </button>

              <button
                type="button"
                onClick={() => setAllItemsSelection(false)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-[11px] flex items-center gap-1 transition-all"
              >
                <span>Desmarcar Tudo</span>
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

                        {item.fileName && (
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-medium truncate max-w-[220px]" title={item.fileName}>
                            {item.fileName}
                          </span>
                        )}

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

          {/* Rodapé de Ação de Burn-in com Confirmação Explícita */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-300">
              {selectedCount} de {detectedItems.length} tarja(s) aprovada(s)
            </span>

            <button
              onClick={handleInitiateRedaction}
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

      {/* Modal de Confirmação Explícita de Anonimização Definitiva */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-100">
                Confirmação Explícita de Anonimização Definitiva
              </h3>
            </div>

            <div className="text-xs text-slate-300 space-y-3">
              <p>
                Você está prestes a aplicar <strong>{selectedCount} tarja(s) definitiva(s)</strong> em <strong>{selectedDocs.length} documento(s)</strong>:
              </p>
              
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 font-mono text-[11px] max-h-36 overflow-y-auto">
                {selectedDocs.map(doc => {
                  const count = detectedItems.filter(i => i.fileId === doc.fileId && i.selected).length;
                  return (
                    <div key={doc.fileId} className="flex justify-between items-center py-0.5 text-slate-300">
                      <span className="truncate max-w-[280px]">• {doc.name} (#{doc.fileId.slice(-4)})</span>
                      <span className="text-emerald-400 font-bold">{count} tarja(s)</span>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-[11px] leading-relaxed">
                <strong>Aviso de Irreversibilidade Técnica (Burn-in):</strong> Esta operação destrói permanentemente o texto e os pixels originais sob as coordenadas aprovadas através de achatamento rasterizado seguro. O processo não pode ser desfeito.
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={confirmUnderstood}
                  onChange={(e) => setConfirmUnderstood(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded mt-0.5 cursor-pointer"
                />
                <span className="text-slate-200 text-xs font-semibold leading-normal">
                  Confirmo que revisei visualmente as páginas, coordenadas e aprovações de cada arquivo e autorizo a execução definitiva.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmedRedaction}
                disabled={!confirmUnderstood}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Confirmar e Queimar Tarjas</span>
              </button>
            </div>
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
                <p className="text-xs text-slate-400">Tarjas pretas definitivas aplicadas com sanitização por achatamento rasterizado adaptativo.</p>
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

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-2 font-semibold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Garantia de Anonimização Definitiva (LGPD):</span>
            </div>
            <p>
              Todos os fluxos originais de texto, formulários interativos, assinaturas e metadados foram fisicamente destruídos.
            </p>
            <p className="text-slate-500 pt-0.5">
              💡 <strong>Nota de Acessibilidade & Pesquisa (Ctrl+F):</strong> Como o texto original foi eliminado pela rasterização de segurança, caso o tribunal exija documentos pesquisáveis, envie o PDF baixado ao módulo <strong className="text-slate-400 font-semibold">OCR Local & Scanner</strong> para gerar uma nova camada textual pesquisável indexada.
            </p>
          </div>

          <div className="space-y-2">
            {results.map((res, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <span className="text-slate-200 font-bold truncate block">{res.fileName}</span>
                      {res.savedPath && (
                        <span className="text-[10px] text-emerald-400/80 font-mono truncate block" title={res.savedPath}>
                          ✓ Salvo em: {res.savedPath}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                      {res.redactionCount} tarja(s) aplicadas
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {res.savedPath ? (
                      <>
                        <button
                          onClick={async () => {
                            if (window.electronAPI?.openPath) {
                              await window.electronAPI.openPath(res.savedPath!);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-semibold text-xs flex items-center gap-1.5 border border-emerald-500/30 transition-all"
                          title="Abrir o arquivo PDF no leitor padrão do sistema operacional"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Abrir PDF
                        </button>
                        <button
                          onClick={async () => {
                            if (window.electronAPI?.showItemInFolder) {
                              await window.electronAPI.showItemInFolder(res.savedPath!);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
                          title="Revelar o arquivo na pasta do sistema de arquivos"
                        >
                          <Folder className="w-3.5 h-3.5" />
                          Ver na Pasta
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleDownloadSingle(res)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-semibold text-xs flex items-center gap-1.5 border border-emerald-500/30 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Salvar PDF
                      </button>
                    )}
                  </div>
                </div>

                {/* Resolução Efetivamente Utilizada & Critérios de Qualidade */}
                {res.rasterReport && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
                          DPI Efetivo Médio: {res.rasterReport.averageEffectiveDpi} DPI
                        </span>
                        {res.rasterReport.adaptedPagesCount > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium flex items-center gap-1">
                            ⚠️ {res.rasterReport.adaptedPagesCount} página(s) grande(s) adaptada(s) (Piso de {res.rasterReport.minDpi} DPI preservado para carimbos e assinaturas)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                            ✓ Resolução nominal integral mantida ({res.rasterReport.targetDpi} DPI)
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setExpandedReportIdx(expandedReportIdx === idx ? null : idx)}
                        className="text-slate-400 hover:text-slate-200 underline text-[10px] flex items-center gap-1 cursor-pointer ml-auto"
                      >
                        {expandedReportIdx === idx ? (
                          <>
                            <ChevronUp className="w-3 h-3" />
                            <span>Ocultar Detalhes de Resolução</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" />
                            <span>Ver Resolução por Página ({res.rasterReport.totalPages})</span>
                          </>
                        )}
                      </button>
                    </div>

                    {expandedReportIdx === idx && (
                      <div className="mt-2.5 p-3 rounded-lg bg-slate-900 border border-slate-800 text-[10px] overflow-x-auto space-y-2">
                        <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
                          <span className="font-semibold text-slate-300">Detalhamento de Qualidade Gráfica:</span>
                          <span className="text-[9px]">Piso Mínimo Configurado: {res.rasterReport.minDpi} DPI</span>
                        </div>
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800/80 text-slate-400">
                              <th className="py-1 px-2">Página</th>
                              <th className="py-1 px-2">Dimensões Originais</th>
                              <th className="py-1 px-2">DPI Alvo vs Efetivo</th>
                              <th className="py-1 px-2">Megapixels</th>
                              <th className="py-1 px-2">Critério de Nitidez</th>
                              <th className="py-1 px-2">Diagnóstico de Legibilidade</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono">
                            {res.rasterReport.pages.map((p) => (
                              <tr key={p.pageNumber} className="hover:bg-slate-800/30">
                                <td className="py-1.5 px-2 text-slate-300 font-bold">Pág. {p.pageNumber}</td>
                                <td className="py-1.5 px-2 text-slate-400">
                                  {p.widthPt > 0 && p.heightPt > 0 ? `${p.widthPt}x${p.heightPt} pt` : 'N/D'}
                                </td>
                                <td className="py-1.5 px-2">
                                  <span className={
                                    p.status === 'measurement_unavailable'
                                      ? 'text-slate-400 font-medium'
                                      : p.wasAdapted
                                        ? 'text-amber-400 font-bold'
                                        : 'text-emerald-400 font-bold'
                                  }>
                                    {p.status === 'measurement_unavailable' ? 'Indisponível' : `${p.effectiveDpi} DPI`}
                                  </span>
                                  <span className="text-slate-500 text-[9px]"> (Alvo: {p.targetDpi})</span>
                                </td>
                                <td className="py-1.5 px-2 text-slate-300">
                                  {p.status === 'measurement_unavailable' ? 'N/D' : `${p.megaPixels} MP`}
                                </td>
                                <td className="py-1.5 px-2 font-sans">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                    p.status === 'optimal'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : p.status === 'adapted_acceptable'
                                        ? 'bg-amber-500/20 text-amber-300'
                                        : p.status === 'measurement_unavailable'
                                          ? 'bg-slate-700/50 text-slate-300 border border-slate-600/40'
                                          : 'bg-red-500/20 text-red-300'
                                  }`}>
                                    {p.status === 'optimal'
                                      ? 'Ótima Nitidez'
                                      : p.status === 'adapted_acceptable'
                                        ? 'Piso Garantido'
                                        : p.status === 'measurement_unavailable'
                                          ? 'Medição Indisponível'
                                          : 'Abaixo do Padrão'}
                                  </span>
                                </td>
                                <td className="py-1.5 px-2 font-sans text-slate-400">
                                  {p.qualityWarning || (p.status === 'measurement_unavailable' ? 'Medição técnica indisponível.' : 'Resolução plena sem redução operacional.')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Relatório Técnico de Itens Removidos */}
          {removedItemsAudit.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">
                    Relatório Técnico de Itens Removidos ({removedItemsAudit.length} ocorrência(s))
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAuditTable(!showAuditTable)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline flex items-center gap-1"
                >
                  {showAuditTable ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <span>{showAuditTable ? 'Recolher Tabela' : 'Expandir Tabela'}</span>
                </button>
              </div>

              {showAuditTable && (
                <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0">
                      <tr className="border-b border-slate-800">
                        <th className="py-2 px-2.5">Arquivo</th>
                        <th className="py-2 px-2.5">Pág.</th>
                        <th className="py-2 px-2.5">Categoria</th>
                        <th className="py-2 px-2.5">Dado Anonimizado / Hash SHA-256</th>
                        <th className="py-2 px-2.5">Coordenadas (PDF)</th>
                        <th className="py-2 px-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                      {removedItemsAudit.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-900/50">
                          <td className="py-1.5 px-2.5 truncate max-w-[140px]" title={`${record.fileName} (${record.fileId || ''})`}>
                            {record.fileName}
                          </td>
                          <td className="py-1.5 px-2.5 text-slate-400">Pág. {record.pageNumber}</td>
                          <td className="py-1.5 px-2.5">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-sans font-semibold">
                              {record.entityType}
                            </span>
                          </td>
                          <td className="py-1.5 px-2.5 font-sans">
                            <span className="text-slate-300 font-semibold text-[11px]">{record.maskedTerm || '[DADO ANONIMIZADO]'}</span>
                            {record.termHash && (
                              <div className="text-slate-500 font-mono text-[9px] mt-0.5 truncate max-w-[200px]" title={`Hash SHA-256: ${record.termHash}`}>
                                #{record.termHash.slice(0, 16)}...
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-2.5 text-slate-400 text-[10px]">
                            {record.coordinates}
                          </td>
                          <td className="py-1.5 px-2.5 font-sans">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

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
                  const recordsToExport: LgpdAuditRecord[] = removedItemsAudit.length > 0
                    ? removedItemsAudit
                    : detectedItems.filter(i => i.selected).map(item => ({
                        id: item.id,
                        fileId: item.fileId,
                        fileName: item.fileName,
                        pageNumber: item.pageIndex + 1,
                        originalTerm: item.text,
                        termHash: PdfReportExporterService.computeTermHash(item.text),
                        maskedTerm: '[DADO ANONIMIZADO LGPD]',
                        entityType: item.category,
                        detectionReason: item.reason || 'Regra de Conformidade LGPD',
                        coordinates: `X: ${item.rect.x.toFixed(1)}, Y: ${item.rect.y.toFixed(1)}, L: ${item.rect.width.toFixed(1)}, A: ${item.rect.height.toFixed(1)}`,
                        timestamp: new Date().toLocaleString('pt-BR'),
                        status: 'REMOVIDO / TARJADO'
                      }));
                  PdfReportExporterService.exportLgpdAuditCsv(recordsToExport, 'relatorio_tecnico_itens_removidos_lgpd.csv', { minimizePersonalData: true });
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 shadow-sm transition-all"
                title="Baixar Relatório Técnico com minimização de dados sensíveis e hash SHA-256 em CSV"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Relatório Técnico (CSV)</span>
              </button>

              <button
                onClick={() => {
                  const recordsToExport: LgpdAuditRecord[] = removedItemsAudit.length > 0
                    ? removedItemsAudit
                    : detectedItems.filter(i => i.selected).map(item => ({
                        id: item.id,
                        fileId: item.fileId,
                        fileName: item.fileName,
                        pageNumber: item.pageIndex + 1,
                        originalTerm: item.text,
                        termHash: PdfReportExporterService.computeTermHash(item.text),
                        maskedTerm: '[DADO ANONIMIZADO LGPD]',
                        entityType: item.category,
                        detectionReason: item.reason || 'Regra de Conformidade LGPD',
                        coordinates: `X: ${item.rect.x.toFixed(1)}, Y: ${item.rect.y.toFixed(1)}, L: ${item.rect.width.toFixed(1)}, A: ${item.rect.height.toFixed(1)}`,
                        timestamp: new Date().toLocaleString('pt-BR'),
                        status: 'REMOVIDO / TARJADO'
                      }));
                  PdfReportExporterService.exportLgpdAuditJson(recordsToExport, 'relatorio_tecnico_itens_removidos_lgpd.json', { minimizePersonalData: true });
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 shadow-sm transition-all"
                title="Baixar Relatório Técnico estruturado em JSON com minimização de dados sensíveis e hash SHA-256"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                <span>Relatório Técnico (JSON)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LgpdRedactor;
