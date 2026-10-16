import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Layers,
  FilePlus,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Scale,
  ShieldCheck,
  FileArchive,
  Copy,
  Check,
  Settings2,
  Sparkles,
  RefreshCw,
  FolderDown,
  Info,
  ChevronRight,
  ChevronLeft,
  Eye,
  Hash,
  Scissors
} from 'lucide-react';

import {
  CoreCourtFilingService,
  CourtFilingPiece,
  CourtPieceType,
  PIECE_TYPE_LABELS,
  COURT_TARGET_PRESETS,
  CourtTargetPreset,
  CourtFilingOptions,
  CourtFilingPackageResult,
  CourtFilingVolumePlan
} from '../../core/court-filing';

type WizardStep = 1 | 2 | 3 | 4 | 5;

export const CourtFilingWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // ==========================================
  // ESTADO: PEÇAS E DOCUMENTOS
  // ==========================================
  const [pieces, setPieces] = useState<CourtFilingPiece[]>([]);
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [selectedPieceIdForPages, setSelectedPieceIdForPages] = useState<string | null>(null);

  // ==========================================
  // ESTADO: PARÂMETROS DO TRIBUNAL & LIMITES
  // ==========================================
  const [selectedPresetId, setSelectedPresetId] = useState<string>('pje_10mb');
  const [customLimitMb, setCustomLimitMb] = useState<number>(15);

  const activePreset: CourtTargetPreset = useMemo(() => {
    const found = COURT_TARGET_PRESETS.find(p => p.id === selectedPresetId);
    if (selectedPresetId === 'custom' || !found) {
      return {
        id: 'custom',
        name: `Limite Personalizado (${customLimitMb} MB)`,
        shortLabel: `${customLimitMb} MB`,
        systemName: 'Personalizado',
        courtScope: 'Conforme Despacho Judicial / Edital Específico',
        maxSizeMB: customLimitMb,
        maxVolumeSizeBytes: Math.max(1, customLimitMb) * 1024 * 1024,
        versionOrDate: 'Conforme Processo',
        normativeReference: 'Determinação Judicial da Causa',
        description: 'Limite definido manualmente pelo operador dos autos.',
        notes: 'Verifique com a secretaria da vara se houver dúvidas sobre a cota de envio.',
        targetPortal: 'Personalizado',
        recommendedResolutionDpi: 200,
        isUniversalRule: false
      };
    }
    return found;
  }, [selectedPresetId, customLimitMb]);

  // ==========================================
  // ESTADO: DADOS PROCESSUAIS & CHANCELA
  // ==========================================
  const [processNumber, setProcessNumber] = useState<string>('5001234-56.2026.8.26.0100');
  const [courtName, setCourtName] = useState<string>('TRIBUNAL DE JUSTIÇA DO ESTADO DE SÃO PAULO');
  const [varalForum, setVaralForum] = useState<string>('12ª Vara Cível do Foro Central - Comarca da Capital');
  const [actionType, setActionType] = useState<string>('Ação Ordinária de Cobrança c/c Tutela de Urgência');
  const [authorName, setAuthorName] = useState<string>('João da Silva & Cia Ltda');
  const [defendantName, setDefendantName] = useState<string>('Banco e Financeira Nacional S.A.');
  const [lawyerName, setLawyerName] = useState<string>('Dra. Amanda Vasconcelos');
  const [lawyerOab, setLawyerOab] = useState<string>('OAB/SP 432.190');

  const [startFolhaNumber, setStartFolhaNumber] = useState<number>(1);
  const [folhaPrefix, setFolhaPrefix] = useState<string>('Fl.');
  const [padDigits, setPadDigits] = useState<number>(3);
  const [stampPosition, setStampPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');
  const [stampColor, setStampColor] = useState<'blue' | 'black' | 'red'>('blue');
  const [includeCoverAndIndex, setIncludeCoverAndIndex] = useState<boolean>(true);
  const [includePieceIdentificationHeader, setIncludePieceIdentificationHeader] = useState<boolean>(true);

  // ==========================================
  // ESTADO: COMPILAÇÃO & RESULTADO
  // ==========================================
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filingResult, setFilingResult] = useState<CourtFilingPackageResult | null>(null);
  const [activeManifestTab, setActiveManifestTab] = useState<'txt' | 'json'>('txt');
  const [copiedManifest, setCopiedManifest] = useState<boolean>(false);

  // ==========================================
  // PLANEJAMENTO PREVENTIVO EM TEMPO REAL
  // ==========================================
  const previewVolumePlans: CourtFilingVolumePlan[] = useMemo(() => {
    if (pieces.length === 0) return [];
    try {
      return CoreCourtFilingService.planVolumes(
        pieces,
        activePreset.maxVolumeSizeBytes,
        startFolhaNumber
      );
    } catch {
      return [];
    }
  }, [pieces, activePreset.maxVolumeSizeBytes, startFolhaNumber]);

  const totalEffectivePages = useMemo(() => {
    return pieces.reduce((acc, p) => acc + p.effectivePageCount, 0);
  }, [pieces]);

  const totalRawSizeBytes = useMemo(() => {
    return pieces.reduce((acc, p) => acc + p.sizeBytes, 0);
  }, [pieces]);

  // ==========================================
  // MANIPULAÇÃO DE PEÇAS
  // ==========================================
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsInspecting(true);
    setErrorMsg(null);

    try {
      const newPieces: CourtFilingPiece[] = [];
      const fileList = Array.from(e.target.files);

      for (const file of fileList) {
        if (!file.name.toLowerCase().endsWith('.pdf')) continue;
        const buffer = await file.arrayBuffer();
        const piece = await CoreCourtFilingService.inspectPiece(file.name, buffer);
        newPieces.push(piece);
      }

      setPieces(prev => [...prev, ...newPieces]);
      if (newPieces.length > 0 && !selectedPieceIdForPages) {
        setSelectedPieceIdForPages(newPieces[0].id);
      }
    } catch (err: any) {
      setErrorMsg(`Erro ao ler arquivos PDF: ${err.message || err}`);
    } finally {
      setIsInspecting(false);
      e.target.value = '';
    }
  };

  const loadDemoPieces = async () => {
    setIsInspecting(true);
    setErrorMsg(null);
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      
      const makeDemoDoc = async (title: string, pType: CourtPieceType, pageCount: number, colorRgb: [number, number, number]) => {
        const doc = await PDFDocument.create();
        const font = await doc.embedFont(StandardFonts.HelveticaBold);
        const fontReg = await doc.embedFont(StandardFonts.Helvetica);

        for (let p = 1; p <= pageCount; p++) {
          const page = doc.addPage([595, 842]);
          page.drawRectangle({
            x: 40,
            y: 740,
            width: 515,
            height: 50,
            color: rgb(...colorRgb)
          });
          page.drawText(`${title} - Folha de Teste ${p}`, {
            x: 55,
            y: 760,
            size: 14,
            font,
            color: rgb(1, 1, 1)
          });
          page.drawText(`Documento demonstrativo para simulação da esteira de montagem e divisão de volumes.`, {
            x: 55,
            y: 700,
            size: 10,
            font: fontReg,
            color: rgb(0.2, 0.2, 0.2)
          });
          page.drawText(`Classificação: ${PIECE_TYPE_LABELS[pType]}`, {
            x: 55,
            y: 680,
            size: 10,
            font,
            color: rgb(0.1, 0.3, 0.6)
          });
        }
        const bytes = await doc.save();
        return CoreCourtFilingService.inspectPiece(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`, bytes.buffer as ArrayBuffer, pType);
      };

      const demo1 = await makeDemoDoc('01_Peticao_Inicial_Cobrança', 'peticao_inicial', 4, [0.08, 0.2, 0.4]);
      const demo2 = await makeDemoDoc('02_Procuracao_Ad_Judicia', 'procuracao', 1, [0.15, 0.3, 0.2]);
      const demo3 = await makeDemoDoc('03_Documentos_Identificacao_RG_CPF', 'documento_identificacao', 2, [0.35, 0.2, 0.1]);
      const demo4 = await makeDemoDoc('04_Comprovante_Residencia_Atualizado', 'comprovante_residencia', 1, [0.3, 0.1, 0.35]);
      const demo5 = await makeDemoDoc('05_Contrato_Prestacao_Servicos_Anexo', 'prova_documental', 6, [0.1, 0.25, 0.45]);
      const demo6 = await makeDemoDoc('06_Guia_Custas_DARE_Comprovante', 'guia_custas', 1, [0.4, 0.3, 0.05]);

      setPieces([demo1, demo2, demo3, demo4, demo5, demo6]);
      setSelectedPieceIdForPages(demo1.id);
    } catch (err: any) {
      setErrorMsg(`Erro ao gerar peças demonstrativas: ${err.message || err}`);
    } finally {
      setIsInspecting(false);
    }
  };

  const movePiece = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === pieces.length - 1)) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...pieces];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setPieces(updated);
  };

  const removePiece = (id: string) => {
    setPieces(prev => prev.filter(p => p.id !== id));
    if (selectedPieceIdForPages === id) {
      const remaining = pieces.filter(p => p.id !== id);
      setSelectedPieceIdForPages(remaining[0]?.id || null);
    }
  };

  const updatePieceType = (id: string, newType: CourtPieceType) => {
    setPieces(prev => prev.map(p => {
      if (p.id !== id) return p;
      return { ...p, pieceType: newType };
    }));
  };

  const updatePieceTitle = (id: string, newTitle: string) => {
    setPieces(prev => prev.map(p => {
      if (p.id !== id) return p;
      return { ...p, title: newTitle };
    }));
  };

  // ==========================================
  // MANIPULAÇÃO DE PÁGINAS DA PEÇA SELECIONADA
  // ==========================================
  const activePieceForPages = pieces.find(p => p.id === selectedPieceIdForPages) || pieces[0] || null;

  const togglePageDeletion = (pieceId: string, pageIndex: number) => {
    setPieces(prev => prev.map(p => {
      if (p.id !== pieceId) return p;
      const mods = [...(p.modifications || [])];
      const existing = mods.find(m => m.pageIndex === pageIndex);
      if (existing) {
        existing.deleted = !existing.deleted;
      } else {
        mods.push({ pageIndex, deleted: true });
      }

      // Recalcular effectivePageCount
      const effectivePages = CoreCourtFilingService.getEffectivePages({ ...p, modifications: mods });
      return {
        ...p,
        modifications: mods,
        effectivePageCount: effectivePages.length
      };
    }));
  };

  const rotatePage = (pieceId: string, pageIndex: number) => {
    setPieces(prev => prev.map(p => {
      if (p.id !== pieceId) return p;
      const mods = [...(p.modifications || [])];
      const existing = mods.find(m => m.pageIndex === pageIndex);
      if (existing) {
        const curRot = existing.rotate || 0;
        existing.rotate = (curRot + 90) % 360;
      } else {
        mods.push({ pageIndex, rotate: 90 });
      }
      return {
        ...p,
        modifications: mods
      };
    }));
  };

  // ==========================================
  // EXECUÇÃO DO FLUXO COMPLETO DE PROTOCOLO
  // ==========================================
  const handleExecuteFiling = async () => {
    if (pieces.length === 0) {
      setErrorMsg('Adicione ao menos uma peça ou documento antes de gerar o pacote.');
      return;
    }

    setIsProcessing(true);
    setProgressMsg('Iniciando montagem técnica dos autos judiciais...');
    setProgressPercent(5);
    setErrorMsg(null);
    setFilingResult(null);

    const options: CourtFilingOptions = {
      processNumber: processNumber.trim(),
      courtName: courtName.trim(),
      varalForum: varalForum.trim(),
      actionType: actionType.trim(),
      authorName: authorName.trim(),
      defendantName: defendantName.trim(),
      lawyerName: lawyerName.trim(),
      lawyerOab: lawyerOab.trim(),
      startFolhaNumber: Number(startFolhaNumber) || 1,
      folhaPrefix: folhaPrefix.trim() || 'Fl.',
      padDigits: Number(padDigits) || 3,
      stampPosition,
      stampColor,
      includeCoverAndIndex,
      includePieceIdentificationHeader,
      targetPreset: activePreset
    };

    try {
      const res = await CoreCourtFilingService.prepareFiling(
        pieces,
        options,
        (progress) => {
          setProgressMsg(progress.message || progress.stage);
          setProgressPercent(progress.percentage || 0);
        }
      );

      if (res.data) {
        setFilingResult(res.data);
      }
      if (!res.isSuccess) {
        setErrorMsg(res.error?.message || 'Falha durante a compilação do protocolo judicial.');
      }
      setCurrentStep(5);
    } catch (err: any) {
      setErrorMsg(`Falha durante a compilação do protocolo: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadVolume = (vol: { fileName: string; pdfBytes: Uint8Array }) => {
    const blob = new Blob([vol.pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = vol.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadZipPackage = () => {
    if (!filingResult) return;
    const blob = new Blob([filingResult.zipPackageBytes as unknown as BlobPart], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeProc = (processNumber || 'Autos').replace(/[^a-zA-Z0-9]/g, '_');
    a.href = url;
    a.download = `Pacote_Protocolo_Processo_${safeProc}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyManifestToClipboard = () => {
    if (!filingResult) return;
    const text = activeManifestTab === 'txt' ? filingResult.manifestTxt : filingResult.manifestJson;
    navigator.clipboard.writeText(text);
    setCopiedManifest(true);
    setTimeout(() => setCopiedManifest(false), 2500);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 shadow-lg shadow-blue-500/10">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Preparação de Processos para Protocolo
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Fluxo Integrado
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                Seleção e classificação de peças, reorganização de páginas, divisão de volumes por tribunal, numeração sequencial e pacote com manifesto SHA-256.
              </p>
            </div>
          </div>
        </div>

        {/* Resumo rápido no topo */}
        <div className="flex items-center space-x-3 bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-800 text-xs">
          <div className="flex flex-col">
            <span className="text-slate-500 font-medium uppercase tracking-wider">Peças</span>
            <span className="text-slate-200 font-bold text-sm">{pieces.length} doc(s)</span>
          </div>
          <div className="h-6 w-px bg-slate-800 mx-1" />
          <div className="flex flex-col">
            <span className="text-slate-500 font-medium uppercase tracking-wider">Páginas</span>
            <span className="text-slate-200 font-bold text-sm">{totalEffectivePages} págs</span>
          </div>
          <div className="h-6 w-px bg-slate-800 mx-1" />
          <div className="flex flex-col">
            <span className="text-slate-500 font-medium uppercase tracking-wider">Tribunal / Cota</span>
            <span className="text-blue-400 font-bold text-sm">{activePreset.shortLabel}</span>
          </div>
        </div>
      </div>

      {/* STEPPER DE ETAPAS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800/80">
        {[
          { num: 1, label: '1. Peças & Juntada', icon: Layers },
          { num: 2, label: '2. Páginas & Ajustes', icon: FileText },
          { num: 3, label: '3. Tribunal & Volumes', icon: Scale },
          { num: 4, label: '4. Parâmetros dos Autos', icon: Settings2 },
          { num: 5, label: '5. Pacote Final', icon: ShieldCheck }
        ].map(step => {
          const isActive = currentStep === step.num;
          const isDone = currentStep > step.num;
          const Icon = step.icon;

          return (
            <button
              key={step.num}
              onClick={() => setCurrentStep(step.num as WizardStep)}
              disabled={isProcessing || (step.num > 1 && pieces.length === 0)}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40'
                  : isDone
                  ? 'bg-slate-800/70 text-slate-200 hover:bg-slate-800 border border-emerald-500/30'
                  : 'text-slate-500 hover:text-slate-300 disabled:opacity-40 disabled:hover:text-slate-500'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Icon className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="truncate">{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* MENSAGENS DE ERRO */}
      {errorMsg && (
        <div className="p-4 bg-red-950/40 border border-red-700/60 rounded-xl flex items-start space-x-3 text-red-200 text-sm">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Aviso da Esteira Processual:</span>
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-200 text-xs">
            Dispensar
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* ETAPA 1: PEÇAS & JUNTADA (Upload e Classificação) */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Seleção, Ordenação e Classificação de Peças
              </h2>
              <p className="text-xs text-slate-400">
                Arraste os arquivos PDF ou selecione-os. Reordene com as setas para ditar a sequência cronológica da juntada.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={loadDemoPieces}
                disabled={isInspecting}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
                title="Carregar conjunto exemplo (Petição Inicial, Procuração, RG, Provas, Custas)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Carregar Exemplo Real</span>
              </button>

              <label className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-md transition">
                <FilePlus className="w-3.5 h-3.5" />
                <span>Adicionar PDFs</span>
                <input
                  type="file"
                  multiple
                  accept="application/pdf,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* DROPZONE / LISTA */}
          {pieces.length === 0 ? (
            <div className="flex-1 border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-slate-900/30 transition-all">
              <div className="p-4 bg-blue-600/10 text-blue-400 rounded-2xl border border-blue-500/20 mb-4">
                <FileText className="w-10 h-10" />
              </div>
              <h3 className="text-base font-semibold text-slate-200 mb-1">
                Nenhum documento adicionado ainda
              </h3>
              <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                Adicione a Petição Inicial/Intermediária e todos os anexos e documentos que devem compor os autos judiciais protocolados.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <label className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-lg shadow-blue-600/30 flex items-center space-x-2 transition">
                  <FilePlus className="w-4 h-4" />
                  <span>Selecionar Documentos (PDF)</span>
                  <input
                    type="file"
                    multiple
                    accept="application/pdf,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={loadDemoPieces}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition"
                >
                  Experimentar com Peças Demonstrativas
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  Ordem de Juntada nos Autos ({pieces.length} peças identificadas)
                </span>
                <span>Tamanho Total Bruto: {(totalRawSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {pieces.map((piece, index) => {
                  return (
                    <div
                      key={piece.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 rounded-xl gap-3 transition-all"
                    >
                      {/* Lado Esquerdo: Ordem + Info */}
                      <div className="flex items-start sm:items-center space-x-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-slate-300 text-xs shrink-0 border border-slate-700">
                          {index + 1}º
                        </div>

                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={piece.title}
                            onChange={(e) => updatePieceTitle(piece.id, e.target.value)}
                            className="bg-transparent hover:bg-slate-800/80 focus:bg-slate-800 border border-transparent focus:border-blue-500/50 rounded px-2 py-0.5 text-sm font-semibold text-slate-100 w-full focus:outline-none transition"
                            title="Clique para editar o título oficial da peça"
                          />
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400">
                            <span className="text-slate-500 truncate max-w-xs">{piece.fileName}</span>
                            <span>•</span>
                            <span className="text-blue-300 font-medium">{piece.effectivePageCount} pág(s)</span>
                            <span>•</span>
                            <span>{(piece.sizeBytes / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span className="font-mono text-slate-500 text-[10px]" title={piece.sha256Hex}>
                              SHA: {piece.sha256Hex.substring(0, 8)}...
                            </span>
                            {piece.signatureInfo?.hasSignatures && (
                              <span 
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                                title="Assinatura digital ICP-Brasil / PAdES detectada. A alteração de páginas invalida o selo original."
                              >
                                <ShieldCheck className="w-3 h-3 text-amber-400" />
                                Assinado Digitalmente ({piece.signatureInfo.signatureCount})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Lado Direito: Seletor de Tipo + Ações */}
                      <div className="flex items-center space-x-2 shrink-0">
                        {/* Seletor de Tipo */}
                        <select
                          value={piece.pieceType}
                          onChange={(e) => updatePieceType(piece.id, e.target.value as CourtPieceType)}
                          className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          {Object.entries(PIECE_TYPE_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          ))}
                        </select>

                        {/* Setas de Reordenação */}
                        <div className="flex items-center space-x-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
                          <button
                            onClick={() => movePiece(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-20 transition"
                            title="Mover para cima na ordem da juntada"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => movePiece(index, 'down')}
                            disabled={index === pieces.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-20 transition"
                            title="Mover para baixo na ordem da juntada"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Remover */}
                        <button
                          onClick={() => removePiece(piece.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition"
                          title="Remover peça do processo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FOOTER DA ETAPA 1 */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              {pieces.length > 0 && (
                <span>✓ {pieces.length} peças prontas para inspeção de páginas e planejamento de volumes</span>
              )}
            </div>

            <button
              onClick={() => setCurrentStep(2)}
              disabled={pieces.length === 0}
              className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 transition"
            >
              <span>Avançar: Ajustar Páginas</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ETAPA 2: PÁGINAS & AJUSTES (Rotação e Exclusão) */}
      {/* ======================================================== */}
      {currentStep === 2 && (
        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              Inspeção e Ajuste Fino de Páginas
            </h2>
            <p className="text-xs text-slate-400">
              Gire digitalizações invertidas (90° horário) ou marque páginas em branco/desnecessárias para exclusão antes do carimbo dos autos.
            </p>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 min-h-0">
            {/* Coluna Esquerda: Lista de Peças */}
            <div className="md:col-span-1 bg-slate-900/50 border border-slate-800 rounded-2xl flex flex-col min-h-0 overflow-hidden">
              <div className="p-3 bg-slate-900 border-b border-slate-800 text-xs font-semibold text-slate-300">
                Selecione a Peça
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {pieces.map((piece, idx) => {
                  const isSel = piece.id === (activePieceForPages?.id);
                  return (
                    <button
                      key={piece.id}
                      onClick={() => setSelectedPieceIdForPages(piece.id)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition flex flex-col ${
                        isSel
                          ? 'bg-blue-600/20 border border-blue-500/40 text-blue-200'
                          : 'bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 text-slate-400'
                      }`}
                    >
                      <span className="font-semibold text-slate-200 truncate">
                        {idx + 1}. {piece.title}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        {piece.effectivePageCount} de {piece.originalPageCount} págs ativas
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Coluna Direita: Grade de Páginas da Peça Ativa */}
            <div className="md:col-span-3 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col min-h-0 overflow-hidden p-4">
              {activePieceForPages ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">{activePieceForPages.title}</h3>
                      <p className="text-xs text-slate-400">
                        {PIECE_TYPE_LABELS[activePieceForPages.pieceType]} • {activePieceForPages.originalPageCount} páginas no PDF original
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <span className="inline-block w-2.5 h-2.5 bg-blue-500 rounded-sm" /> Ativa
                      <span className="inline-block w-2.5 h-2.5 bg-red-500 rounded-sm ml-2" /> Excluída dos Autos
                    </div>
                  </div>

                  {activePieceForPages.signatureInfo?.hasSignatures && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>
                        <strong>Aviso Jurídico:</strong> Este documento possui {activePieceForPages.signatureInfo.signatureCount} assinatura(s) digital(is) (ICP-Brasil / PAdES).
                        A rotação ou exclusão de páginas alterará a integridade binária do arquivo e invalidará a assinatura originária no volume consolidado.
                      </span>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto pt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {Array.from({ length: activePieceForPages.originalPageCount }).map((_, pIdx) => {
                      const mod = (activePieceForPages.modifications || []).find(m => m.pageIndex === pIdx);
                      const isDeleted = mod?.deleted || false;
                      const rot = mod?.rotate || 0;

                      return (
                        <div
                          key={pIdx}
                          className={`flex flex-col p-3 rounded-xl border transition-all ${
                            isDeleted
                              ? 'bg-red-950/20 border-red-800/40 opacity-60'
                              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {/* Miniatura Simulada */}
                          <div className="relative aspect-[3/4] bg-slate-950 rounded-lg border border-slate-800 flex flex-col items-center justify-center p-2 text-center overflow-hidden mb-2">
                            <div
                              style={{ transform: `rotate(${rot}deg)` }}
                              className="w-full h-full flex flex-col items-center justify-center border border-slate-700/50 rounded bg-slate-900/60 p-2 transition-transform duration-300"
                            >
                              <FileText className={`w-8 h-8 ${isDeleted ? 'text-red-500' : 'text-blue-400'}`} />
                              <span className="text-[10px] text-slate-400 mt-1">Pág. {pIdx + 1}</span>
                              {rot > 0 && (
                                <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 rounded mt-0.5 font-mono">
                                  {rot}°
                                </span>
                              )}
                            </div>

                            {isDeleted && (
                              <div className="absolute inset-0 bg-red-950/80 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-red-300 uppercase tracking-widest bg-red-900/80 px-2 py-0.5 rounded">
                                  Excluída
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Ações de Página */}
                          <div className="flex items-center justify-between pt-1">
                            <button
                              onClick={() => rotatePage(activePieceForPages.id, pIdx)}
                              className="p-1 text-slate-400 hover:text-blue-300 hover:bg-slate-800 rounded transition"
                              title="Girar página 90° no sentido horário"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => togglePageDeletion(activePieceForPages.id, pIdx)}
                              className={`p-1 rounded text-xs font-semibold transition ${
                                isDeleted
                                  ? 'text-emerald-400 hover:bg-emerald-950/30'
                                  : 'text-red-400 hover:bg-red-950/30'
                              }`}
                              title={isDeleted ? 'Restaurar página nos autos' : 'Excluir página (em branco / duplicada)'}
                            >
                              {isDeleted ? 'Restaurar' : <Scissors className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                  Nenhuma peça selecionada.
                </div>
              )}
            </div>
          </div>

          {/* FOOTER DA ETAPA 2 */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar para Peças</span>
            </button>

            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 transition"
            >
              <span>Avançar: Tribunal & Limites</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ETAPA 3: TRIBUNAL ALVO & DIVISÃO DE VOLUMES */}
      {/* ======================================================== */}
      {currentStep === 3 && (
        <div className="flex-1 flex flex-col space-y-5 min-h-0 overflow-y-auto">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-400" />
              Limite do Tribunal e Simulação de Volumes
            </h2>
            <p className="text-xs text-slate-400">
              Selecione o tribunal de destino dos autos. O sistema calculará preventivamente a divisão exata em volumes para evitar rejeição no upload.
            </p>
            <div className="mt-2.5 p-3 rounded-xl bg-blue-950/20 border border-blue-500/20 text-[11px] text-blue-300 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>Vinculação Normativa e Regra Contextual:</strong> Cada preset está vinculado a uma norma regulamentar (CNJ, CSJT, TJSP, TRF) e a um escopo jurisdicional específico. Os limites representam os parâmetros vigentes e <em>não constituem regras universais imutáveis</em>, podendo variar conforme despacho do juízo ou capacidade do portal.
              </span>
            </div>
          </div>

          {/* SELETOR DE PRESETS DO TRIBUNAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {COURT_TARGET_PRESETS.map(preset => {
              const isSelected = selectedPresetId === preset.id;
              const limitMb = (preset.maxVolumeSizeBytes / (1024 * 1024)).toFixed(0);

              return (
                <div
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">{preset.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        isSelected ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {limitMb} MB
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 font-semibold">
                        {preset.systemName}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {preset.versionOrDate}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed mb-2.5">
                      {preset.description}
                    </p>

                    <div className="text-[10.5px] text-slate-400 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 mb-2 space-y-1 leading-relaxed">
                      <div><strong className="text-slate-300">Escopo:</strong> {preset.courtScope}</div>
                      <div><strong className="text-slate-300">Norma:</strong> {preset.normativeReference}</div>
                    </div>

                    {preset.notes && (
                      <p className="text-[10px] text-slate-500 italic leading-snug">
                        Nota: {preset.notes}
                      </p>
                    )}
                  </div>

                  {preset.id === 'custom' && isSelected && (
                    <div className="mt-2 pt-2 border-t border-slate-800 flex items-center space-x-2">
                      <label className="text-[11px] text-slate-300">Cota:</label>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={customLimitMb}
                        onChange={(e) => setCustomLimitMb(Math.max(1, Number(e.target.value)))}
                        className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                      />
                      <span className="text-[11px] text-slate-400">MB por Volume</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* SIMULAÇÃO DE VOLUMES PLANEJADOS */}
          <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center space-x-2">
                <FileArchive className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Distribuição Preventiva de Volumes ({previewVolumePlans.length} volume(s) projetado(s))
                </h3>
              </div>
              <span className="text-xs text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-lg">
                ✓ Todos dentro do limite de {activePreset.shortLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {previewVolumePlans.map(vol => {
                const estMb = (vol.estimatedSizeBytes / (1024 * 1024)).toFixed(2);
                const maxMb = (activePreset.maxVolumeSizeBytes / (1024 * 1024)).toFixed(0);
                const pctOfMax = Math.min(100, Math.round((vol.estimatedSizeBytes / activePreset.maxVolumeSizeBytes) * 100));

                return (
                  <div
                    key={vol.volumeIndex}
                    className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <FileArchive className="w-3.5 h-3.5 text-blue-400" />
                          {vol.volumeTitle}
                        </span>
                        <span className="text-[11px] font-mono text-slate-300 font-semibold">
                          {folhaPrefix} {vol.startFolha} até {folhaPrefix} {vol.endFolha}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span>{vol.totalPageCount} folhas ({vol.plannedPieces.length} peças)</span>
                        <span className="font-semibold text-slate-200">{estMb} MB / {maxMb} MB</span>
                      </div>

                      {/* Barra de Progresso do Tamanho */}
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pctOfMax > 90 ? 'bg-amber-400' : 'bg-blue-500'
                          }`}
                          style={{ width: `${pctOfMax}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-900 text-[11px] text-slate-500 space-y-0.5">
                      {vol.plannedPieces.map((p, pIdx) => (
                        <div key={pIdx} className="truncate flex items-center justify-between">
                          <span className="truncate max-w-[200px]">
                            • {p.pieceTitle}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-2">
                            {folhaPrefix} {p.startFolha}-{p.endFolha}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FOOTER DA ETAPA 3 */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar para Páginas</span>
            </button>

            <button
              onClick={() => setCurrentStep(4)}
              className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 transition"
            >
              <span>Avançar: Dados dos Autos</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ETAPA 4: METADADOS DOS AUTOS & CHANCELA */}
      {/* ======================================================== */}
      {currentStep === 4 && (
        <div className="flex-1 flex flex-col space-y-5 min-h-0 overflow-y-auto">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-blue-400" />
              Dados do Processo e Parâmetros de Chancela
            </h2>
            <p className="text-xs text-slate-400">
              Essas informações alimentarão a Capa Oficial de cada Volume, o Índice Geral das Peças e a chancela carimbada em cada folha.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Bloco 1: Informações Processuais */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                1. Identificação Processual
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Número Único do Processo (CNJ)
                  </label>
                  <input
                    type="text"
                    value={processNumber}
                    onChange={(e) => setProcessNumber(e.target.value)}
                    placeholder="0000000-00.0000.0.00.0000"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tribunal / Órgão Julgador
                  </label>
                  <input
                    type="text"
                    value={courtName}
                    onChange={(e) => setCourtName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Vara / Juízo / Foro
                  </label>
                  <input
                    type="text"
                    value={varalForum}
                    onChange={(e) => setVaralForum(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Classe Processual / Ação
                  </label>
                  <input
                    type="text"
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Autor / Requerente</label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Réu / Requerido</label>
                    <input
                      type="text"
                      value={defendantName}
                      onChange={(e) => setDefendantName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Advogado(a) Subscritor(a)</label>
                    <input
                      type="text"
                      value={lawyerName}
                      onChange={(e) => setLawyerName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Inscrição OAB</label>
                    <input
                      type="text"
                      value={lawyerOab}
                      onChange={(e) => setLawyerOab(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 2: Parâmetros de Paginação e Chancela */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                2. Paginação Contínua & Carimbo Oficial
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Folha Inicial</label>
                    <input
                      type="number"
                      min="1"
                      value={startFolhaNumber}
                      onChange={(e) => setStartFolhaNumber(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Prefixo</label>
                    <input
                      type="text"
                      value={folhaPrefix}
                      onChange={(e) => setFolhaPrefix(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Dígitos</label>
                    <select
                      value={padDigits}
                      onChange={(e) => setPadDigits(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
                    >
                      <option value={3}>001 (3)</option>
                      <option value={4}>0001 (4)</option>
                      <option value={5}>00001 (5)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Posição da Chancela</label>
                    <select
                      value={stampPosition}
                      onChange={(e) => setStampPosition(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white"
                    >
                      <option value="top-right">Superior Direito (Padrão)</option>
                      <option value="top-left">Superior Esquerdo</option>
                      <option value="bottom-right">Inferior Direito</option>
                      <option value="bottom-left">Inferior Esquerdo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Cor do Carimbo</label>
                    <select
                      value={stampColor}
                      onChange={(e) => setStampColor(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white"
                    >
                      <option value="blue">Azul Forense</option>
                      <option value="black">Preto Clássico</option>
                      <option value="red">Vermelho Cartório</option>
                    </select>
                  </div>
                </div>

                {/* Opções de Elementos */}
                <div className="pt-3 border-t border-slate-800 space-y-2.5">
                  <label className="flex items-center space-x-2.5 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeCoverAndIndex}
                      onChange={(e) => setIncludeCoverAndIndex(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span className="font-semibold">Inserir Capa Oficial e Índice Geral por Volume</span>
                  </label>

                  <label className="flex items-center space-x-2.5 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePieceIdentificationHeader}
                      onChange={(e) => setIncludePieceIdentificationHeader(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Incluir cabeçalho de identificação da peça em cada página</span>
                  </label>
                </div>

                {/* Prévia do Carimbo */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] space-y-1">
                  <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block">
                    Prévia da Chancela de Folha:
                  </span>
                  <div className="inline-block p-1.5 px-3 rounded border border-blue-600/40 bg-blue-950/20 text-blue-300 font-mono text-xs">
                    AUTOS DIGITAIS • {processNumber || 'Nº PROCESSO'} • {folhaPrefix} {String(startFolhaNumber).padStart(padDigits, '0')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER DA ETAPA 4 */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar para Tribunal</span>
            </button>

            <button
              onClick={handleExecuteFiling}
              disabled={isProcessing}
              className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition transform hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Compilar e Gerar Pacote de Protocolo</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ETAPA 5: PRODUÇÃO & PACOTE FINAL DE PROTOCOLO */}
      {/* ======================================================== */}
      {currentStep === 5 && (
        <div className="flex-1 flex flex-col space-y-5 min-h-0 overflow-y-auto">
          {/* Se estiver compilando */}
          {isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-900/40 rounded-2xl border border-slate-800 text-center">
              <RefreshCw className="w-12 h-12 text-blue-400 animate-spin mb-4" />
              <h3 className="text-base font-bold text-white mb-2">{progressMsg}</h3>
              <p className="text-xs text-slate-400 max-w-md mb-6">
                Carimbando numeração sequencial, inserindo capas e índices e gerando os volumes oficiais em conformidade com o Tribunal.
              </p>
              <div className="w-72 bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 mt-2 font-mono">{progressPercent}%</span>
            </div>
          )}

          {/* Resultado Pronto */}
          {!isProcessing && filingResult && (
            <div className="space-y-6">
              {/* Card de Sucesso ou Reprovação */}
              {filingResult.summary.reproved ? (
                <div className="p-6 bg-gradient-to-r from-red-950/80 via-slate-900 to-rose-950/50 rounded-2xl border border-red-500/50 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
                  <div>
                    <div className="flex items-center space-x-2 text-rose-400 mb-1">
                      <AlertTriangle className="w-5 h-5 text-rose-400" />
                      <span className="font-bold text-sm tracking-wide uppercase">
                        Pacote Reprovado: Volume Excede o Limite do Tribunal
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      Incompatibilidade de Tamanho com {filingResult.summary.targetCourt}
                    </h3>
                    <p className="text-xs text-rose-200/90 mt-1 max-w-xl leading-relaxed">
                      {filingResult.summary.reprovedReason}
                    </p>
                    <div className="mt-3 p-3 bg-red-950/60 rounded-xl border border-red-800/40 text-[11px] text-rose-300 space-y-1">
                      <strong>Orientações Técnicas para Desbloqueio:</strong>
                      <ul className="list-disc list-inside space-y-0.5 text-rose-200/80">
                        <li>Volte à Etapa 1 e verifique se anexos densos ou digitalizações de alta resolução podem ser fracionados.</li>
                        <li>Se o tribunal autorizou cota ampliada em despacho ou edital, selecione o preset correspondente ou "Customizado".</li>
                        <li>Na Etapa 2, revise e marque para exclusão eventuais páginas em branco ou duplicadas.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="w-full sm:w-auto px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-2 transition"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span>Revisar Peças</span>
                    </button>
                    <button
                      onClick={downloadZipPackage}
                      className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                      title="Baixar para auditoria interna"
                    >
                      <span>Baixar p/ Auditoria</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gradient-to-r from-blue-950/60 via-slate-900 to-emerald-950/40 rounded-2xl border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
                  <div>
                    <div className="flex items-center space-x-2 text-emerald-400 mb-1">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-bold text-sm tracking-wide uppercase">
                        Pacote Preparado para Protocolo (Não Protocolado Automaticamente)
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      Autos Preparados para Juntada: {filingResult.summary.processNumber || 'Processo'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                      Foram compilados e validados {filingResult.summary.totalVolumes} volume(s) rigorosamente dentro do limite do {filingResult.summary.targetCourt}, 
                      com chancela sequencial contínua e manifesto auditável SHA-256.
                    </p>
                    <div className="mt-2.5 text-[10.5px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 leading-relaxed">
                      ⚠️ <strong>Delimitação Técnica:</strong> Este software prepara e pagina os autos. Ele <em>NÃO comprova protocolo perante o Poder Judiciário</em> nem atesta que o tribunal recebeu ou aceitou os documentos. O peticionamento e protocolo efetivo devem ser realizados diretamente no portal do tribunal pelo advogado.
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                    <button
                      onClick={downloadZipPackage}
                      className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition"
                    >
                      <FolderDown className="w-4 h-4" />
                      <span>Baixar Pacote Preparado (.ZIP)</span>
                    </button>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                    >
                      Novo Protocolo
                    </button>
                  </div>
                </div>
              )}

              {/* LISTA DE VOLUMES GERADOS */}
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileArchive className="w-4 h-4 text-blue-400" />
                  Volumes em PDF Compilados e Medidos Efetivamente
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filingResult.volumes.map(vol => (
                    <div
                      key={vol.volumeIndex}
                      className={`p-4 bg-slate-950/80 rounded-xl border flex items-center justify-between gap-3 ${
                        vol.exceedsEffectiveLimit ? 'border-red-500/60 bg-red-950/20' : 'border-slate-800'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-200 block truncate">
                          {vol.fileName}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400 mt-1">
                          <span className="text-blue-300 font-medium">
                            {folhaPrefix} {vol.startFolha} até {folhaPrefix} {vol.endFolha}
                          </span>
                          <span>•</span>
                          <span>{vol.pageCount} págs</span>
                          <span>•</span>
                          <span className={`font-semibold ${vol.exceedsEffectiveLimit ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {(vol.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                          </span>
                          {vol.autoCorrected && (
                            <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                              Autocorrigido
                            </span>
                          )}
                          {vol.exceedsEffectiveLimit && (
                            <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-semibold border border-red-500/30">
                              Excede Limite
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 block truncate mt-1">
                          SHA-256: {vol.sha256Hex}
                        </span>
                      </div>

                      <button
                        onClick={() => downloadVolume(vol)}
                        className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-xs font-semibold border border-blue-500/30 transition shrink-0 flex items-center space-x-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* MANIFESTO DE INTEGRIDADE SHA-256 */}
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">
                      Manifesto Oficial de Integridade & Hashes de Auditoria
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                      <button
                        onClick={() => setActiveManifestTab('txt')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                          activeManifestTab === 'txt' ? 'bg-blue-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        Certidão (TXT)
                      </button>
                      <button
                        onClick={() => setActiveManifestTab('json')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                          activeManifestTab === 'json' ? 'bg-blue-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        JSON Auditável
                      </button>
                    </div>

                    <button
                      onClick={copyManifestToClipboard}
                      className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
                    >
                      {copiedManifest ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono text-[11px] text-slate-300 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {activeManifestTab === 'txt' ? filingResult.manifestTxt : filingResult.manifestJson}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
