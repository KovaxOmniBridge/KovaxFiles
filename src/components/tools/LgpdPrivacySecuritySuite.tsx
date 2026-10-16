import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  EyeOff,
  Eraser,
  Lock,
  Unlock,
  Key,
  KeyRound,
  FileText,
  Download,
  Trash2,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  FolderArchive,
  Info,
  ShieldAlert,
  Brain,
  Plus,
  Award
} from 'lucide-react';

import { LocalPdfEngine, PdfMetadataReport, SanitizeOptions } from '../../services/pdfEngine';
import { CompressionEngine } from '../../services/compressionEngine';
import { PdfTextExtractor, PageTextData } from '../../services/pdfTextExtractor';
import {
  RedactionDetectionService,
  DetectionMode,
  DetectedRedactionItem,
  RedactionCategoryOptions
} from '../../services/aiRedactionService';
import { DetectionRigorLevel } from '../../services/universalAiClassifier';
import { PdfReportExporterService, LgpdAuditRecord } from '../../services/pdfReportExporterService';
import { EncryptionEngine } from '../../services/encryptionEngine';

export type SecuritySuiteSubTab = 'redactor' | 'sanitizer' | 'pdf_protection' | 'vault_aes' | 'certificate' | 'encryption';

interface LgpdPrivacySecuritySuiteProps {
  initialSubTab?: SecuritySuiteSubTab;
}

export const LgpdPrivacySecuritySuite: React.FC<LgpdPrivacySecuritySuiteProps> = ({
  initialSubTab = 'redactor'
}) => {
  const normalizeSubTab = (tab: SecuritySuiteSubTab): SecuritySuiteSubTab => {
    if (tab === 'encryption') return 'pdf_protection';
    return tab;
  };

  const [activeSubTab, setActiveSubTab] = useState<SecuritySuiteSubTab>(normalizeSubTab(initialSubTab));

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(normalizeSubTab(initialSubTab));
    }
  }, [initialSubTab]);

  // ==========================================
  // ESTADOS COMPARTILHADOS / ARQUIVOS
  // ==========================================
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Audit Log global acumulado
  const [auditRecords, setAuditRecords] = useState<LgpdAuditRecord[]>([]);

  // ==========================================
  // ESTADOS DA ABA 1: TARJAMENTO LGPD
  // ==========================================
  const [scanMode] = useState<DetectionMode>('pattern');
  const [rigorLevel] = useState<DetectionRigorLevel>('broad');

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

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [pagesDataMap, setPagesDataMap] = useState<Map<string, PageTextData[]>>(new Map());
  const [detectedItems, setDetectedItems] = useState<DetectedRedactionItem[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState<boolean>(false);

  const [isRedacting, setIsRedacting] = useState<boolean>(false);
  const [redactedResults, setRedactedResults] = useState<{ fileName: string; data: Uint8Array; redactionCount: number }[] | null>(null);

  // ==========================================
  // ESTADOS DA ABA 2: HIGIENIZAÇÃO DE METADADOS
  // ==========================================
  const [reports, setReports] = useState<Record<string, PdfMetadataReport>>({});
  const [isInspecting, setIsInspecting] = useState<boolean>(false);

  const [cleanAuthorAndCreator, setCleanAuthorAndCreator] = useState<boolean>(true);
  const [cleanDates, setCleanDates] = useState<boolean>(true);
  const [cleanXmpAndPrivateData, setCleanXmpAndPrivateData] = useState<boolean>(true);
  const [removeAnnotations, setRemoveAnnotations] = useState<boolean>(false);
  const [removeAttachments, setRemoveAttachments] = useState<boolean>(true);
  const [customProducerText, setCustomProducerText] = useState<string>('KovaxFiles LGPD Privacy Engine (Offline)');

  const [isSanitizing, setIsSanitizing] = useState<boolean>(false);
  const [sanitizedResults, setSanitizedResults] = useState<{ fileName: string; data: Uint8Array; originalReport?: PdfMetadataReport }[] | null>(null);

  // ==========================================
  // ESTADOS DA ABA 3: PROTEÇÃO DE PDF POR SENHA (ISO 32000)
  // ==========================================
  const [pdfProtectionMode, setPdfProtectionMode] = useState<'encrypt_pdf' | 'decrypt_pdf'>('encrypt_pdf');
  const [pdfUserPassword, setPdfUserPassword] = useState<string>('');
  const [pdfOwnerPassword, setPdfOwnerPassword] = useState<string>('');
  const [pdfUnlockPassword, setPdfUnlockPassword] = useState<string>('');
  const [allowPrinting, setAllowPrinting] = useState<boolean>(true);
  const [allowCopying, setAllowCopying] = useState<boolean>(false);
  const [allowModifying, setAllowModifying] = useState<boolean>(false);
  const [allowAnnotating, setAllowAnnotating] = useState<boolean>(false);

  const [isPdfProtecting, setIsPdfProtecting] = useState<boolean>(false);
  const [pdfProtectionResults, setPdfProtectionResults] = useState<{ fileName: string; data: Uint8Array; modeName: string; hash: string }[] | null>(null);

  // ==========================================
  // ESTADOS DA ABA 4: COFRE CRIPTOGRÁFICO AES-256 (CUSTÓDIA)
  // ==========================================
  const [vaultMode, setVaultMode] = useState<'lock_vault' | 'unlock_vault'>('lock_vault');
  const [vaultPassword, setVaultPassword] = useState<string>('');
  const [vaultUnlockPassword, setVaultUnlockPassword] = useState<string>('');
  const [isVaultProcessing, setIsVaultProcessing] = useState<boolean>(false);
  const [vaultResults, setVaultResults] = useState<{ fileName: string; data: Uint8Array; modeName: string; hash: string }[] | null>(null);

  // ==========================================
  // GERENCIAMENTO DE ARQUIVOS
  // ==========================================
  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setRedactedResults(null);
      setSanitizedResults(null);
      setPdfProtectionResults(null);
      setVaultResults(null);
      setHasAnalyzed(false);
      setErrorMessage(null);
      e.target.value = '';

      if (activeSubTab === 'sanitizer') {
        inspectMetadataForFiles(newFiles);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setRedactedResults(null);
      setSanitizedResults(null);
      setPdfProtectionResults(null);
      setVaultResults(null);
      setHasAnalyzed(false);
      setErrorMessage(null);

      if (activeSubTab === 'sanitizer') {
        inspectMetadataForFiles(newFiles);
      }
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setRedactedResults(null);
    setSanitizedResults(null);
    setPdfProtectionResults(null);
    setVaultResults(null);
    setHasAnalyzed(false);
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setRedactedResults(null);
    setSanitizedResults(null);
    setPdfProtectionResults(null);
    setVaultResults(null);
    setDetectedItems([]);
    setHasAnalyzed(false);
    setReports({});
  };

  const inspectMetadataForFiles = async (filesToInspect: File[]) => {
    const pdfs = filesToInspect.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) return;

    setIsInspecting(true);
    try {
      const newReports: Record<string, PdfMetadataReport> = { ...reports };
      for (const file of pdfs) {
        const buffer = await file.arrayBuffer();
        const report = await LocalPdfEngine.inspectPdfMetadata(buffer);
        newReports[file.name] = report;
      }
      setReports(newReports);
    } catch (err) {
      console.error('Erro inspecionando metadados:', err);
    } finally {
      setIsInspecting(false);
    }
  };

  // ==========================================
  // LÓGICA DA ABA 1: TARJAMENTO LGPD
  // ==========================================
  const handleAddCustomKeyword = () => {
    if (!customTermInput.trim()) return;
    const term = customTermInput.trim();
    if (!categories.customKeywords.includes(term)) {
      setCategories(prev => ({
        ...prev,
        customKeywords: [...prev.customKeywords, term]
      }));
    }
    setCustomTermInput('');
  };

  const handleRemoveCustomKeyword = (term: string) => {
    setCategories(prev => ({
      ...prev,
      customKeywords: prev.customKeywords.filter(k => k !== term)
    }));
  };

  const handleStartAnalysis = async () => {
    if (selectedFiles.length === 0) {
      setErrorMessage('Por favor, adicione ao menos um arquivo para analisar.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setErrorMessage(null);
    setDetectedItems([]);
    const newPagesMap = new Map<string, PageTextData[]>();
    const allDetections: DetectedRedactionItem[] = [];

    try {
      const totalFiles = selectedFiles.length;
      for (let i = 0; i < totalFiles; i++) {
        const file = selectedFiles[i];
        const buffer = await file.arrayBuffer();

        if (file.name.toLowerCase().endsWith('.pdf')) {
          const pagesData = await PdfTextExtractor.extractTextWithBounds(
            buffer,
            p => setAnalysisProgress(Math.round(((i + (p.percent / 100) * 0.5) / totalFiles) * 100))
          );
          newPagesMap.set(file.name, pagesData);

          const items = await RedactionDetectionService.analyzePdf(
            pagesData,
            categories,
            { mode: scanMode, rigorLevel },
            p => setAnalysisProgress(Math.round(((i + 0.5 + (p.percent / 100) * 0.5) / totalFiles) * 100)),
            file.name
          );
          const taggedItems = items.map(it => ({
            ...it,
            fileName: file.name,
            rect: { ...it.rect, fileName: file.name }
          }));
          allDetections.push(...taggedItems);
        }

        setAnalysisProgress(Math.round(((i + 1) / totalFiles) * 100));
      }

      setPagesDataMap(newPagesMap);
      setDetectedItems(allDetections);
      setHasAnalyzed(true);
    } catch (err: any) {
      setErrorMessage(`Erro durante a análise LGPD: ${err.message || 'Ocorreu uma falha inesperada.'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleItemSelection = (id: string) => {
    setDetectedItems(prev =>
      prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item)
    );
  };

  const handleExecuteRedaction = async () => {
    const selectedToRedact = detectedItems.filter(i => i.selected);
    if (selectedToRedact.length === 0 && categories.customKeywords.length === 0) {
      setErrorMessage('Nenhum item foi selecionado para tarjamento.');
      return;
    }

    setIsRedacting(true);
    setErrorMessage(null);
    const resultsList: { fileName: string; data: Uint8Array; redactionCount: number }[] = [];
    const newAuditRecords: LgpdAuditRecord[] = [];

    try {
      for (const file of selectedFiles) {
        if (!file.name.toLowerCase().endsWith('.pdf')) continue;
        const buffer = await file.arrayBuffer();
        
        // Filtra ESTRITAMENTE as tarjas aprovadas pertencentes a este arquivo específico
        const fileItemsToRedact = selectedToRedact.filter(i => !i.fileName || i.fileName === file.name);
        const rectsToApply = fileItemsToRedact.map(i => i.rect);
        const redactedBuffer = await LocalPdfEngine.anonymizePdf(buffer, rectsToApply, { targetFileName: file.name });

        resultsList.push({
          fileName: file.name,
          data: redactedBuffer,
          redactionCount: rectsToApply.length
        });

        for (const item of fileItemsToRedact) {
          newAuditRecords.push({
            id: item.id,
            originalTerm: item.text,
            maskedTerm: '[TARJADO LGPD]',
            entityType: item.category,
            detectionReason: item.reason || 'Conformidade LGPD',
            timestamp: new Date().toLocaleString('pt-BR')
          });
        }
      }

      setRedactedResults(resultsList);
      setAuditRecords(prev => [...prev, ...newAuditRecords]);
      setSuccessMessage('Tarjamento efetuado com sucesso! Arquivos descaracterizados sem reversão.');
    } catch (err: any) {
      setErrorMessage(`Erro ao aplicar tarjamento: ${err.message}`);
    } finally {
      setIsRedacting(false);
    }
  };

  // ==========================================
  // LÓGICA DA ABA 2: HIGIENIZAÇÃO DE METADADOS
  // ==========================================
  const handleExecuteSanitization = async () => {
    const pdfs = selectedFiles.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) {
      setErrorMessage('Selecione ao menos um arquivo PDF para higienizar metadados.');
      return;
    }

    setIsSanitizing(true);
    setErrorMessage(null);
    const resultsList: { fileName: string; data: Uint8Array; originalReport?: PdfMetadataReport }[] = [];
    const newAuditRecords: LgpdAuditRecord[] = [];

    try {
      const options: SanitizeOptions = {
        cleanAuthorAndCreator,
        cleanDates,
        cleanXmpAndPrivateData,
        removeAnnotations,
        removeAttachments,
        customProducerText
      };

      for (const file of pdfs) {
        const buffer = await file.arrayBuffer();
        const cleanedBuffer = await LocalPdfEngine.sanitizePdfMetadata(buffer, options);

        resultsList.push({
          fileName: file.name,
          data: cleanedBuffer,
          originalReport: reports[file.name]
        });

        newAuditRecords.push({
          id: 'meta-' + Math.random().toString(36).substring(7),
          originalTerm: file.name,
          maskedTerm: 'Metadados Expurgados',
          entityType: 'Metadados EXIF/PDF',
          detectionReason: 'Expurgo de Autor, Criador, Datas e XMP',
          timestamp: new Date().toLocaleString('pt-BR')
        });
      }

      setSanitizedResults(resultsList);
      setAuditRecords(prev => [...prev, ...newAuditRecords]);
      setSuccessMessage('Higienização concluída! Todos os rastros ocultos de autoria e criação foram expurgados.');
    } catch (err: any) {
      setErrorMessage(`Erro na higienização de metadados: ${err.message}`);
    } finally {
      setIsSanitizing(false);
    }
  };

  // ==========================================
  // LÓGICA DA ABA 3: PROTEÇÃO DE PDF POR SENHA (ISO 32000)
  // ==========================================
  const handleExecutePdfProtection = async () => {
    if (selectedFiles.length === 0) {
      setErrorMessage('Por favor, selecione ao menos um arquivo PDF.');
      return;
    }

    if (pdfProtectionMode === 'encrypt_pdf') {
      if (!pdfUserPassword && !pdfOwnerPassword) {
        setErrorMessage('Digite uma Senha de Leitura ou Senha de Proprietário para proteger o PDF.');
        return;
      }
    } else {
      if (!pdfUnlockPassword) {
        setErrorMessage('Digite a senha atual do documento PDF para remover a proteção.');
        return;
      }
    }

    setIsPdfProtecting(true);
    setErrorMessage(null);
    const resultsList: { fileName: string; data: Uint8Array; modeName: string; hash: string }[] = [];
    const newAuditRecords: LgpdAuditRecord[] = [];

    try {
      for (const file of selectedFiles) {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
          throw new Error(`O arquivo "${file.name}" não é um documento PDF. A proteção por senha padrão leitor aplica-se exclusivamente a PDFs. Para outros arquivos (DOCX, ZIP, etc.), utilize a aba "Cofre Criptográfico AES-256".`);
        }

        const buffer = await file.arrayBuffer();
        let processedData: Uint8Array;
        let modeName = '';

        if (pdfProtectionMode === 'encrypt_pdf') {
          processedData = await EncryptionEngine.encryptPdf(buffer, {
            userPassword: pdfUserPassword,
            ownerPassword: pdfOwnerPassword || pdfUserPassword,
            allowPrinting,
            allowCopying,
            allowModifying,
            allowAnnotating
          });
          modeName = 'PDF Protegido por Senha (ISO 32000)';
        } else {
          processedData = await EncryptionEngine.decryptPdf(buffer, pdfUnlockPassword);
          modeName = 'PDF Descriptografado / Aberto';
        }

        const sha256 = await EncryptionEngine.computeSha256(processedData);

        resultsList.push({
          fileName: file.name,
          data: processedData,
          modeName,
          hash: sha256
        });

        newAuditRecords.push({
          id: 'pdf-enc-' + Math.random().toString(36).substring(7),
          originalTerm: file.name,
          maskedTerm: `[PROTEGIDO: ${modeName}]`,
          entityType: 'Proteção de Senha PDF',
          detectionReason: `Hash Auditável SHA-256: ${sha256.substring(0, 16)}...`,
          timestamp: new Date().toLocaleString('pt-BR')
        });
      }

      setPdfProtectionResults(resultsList);
      setAuditRecords(prev => [...prev, ...newAuditRecords]);
      setSuccessMessage('Operação de Proteção por Senha de PDF executada com sucesso!');
    } catch (err: any) {
      setErrorMessage(`Erro ao processar proteção de PDF: ${err.message || 'Falha de senha ou formato inválido.'}`);
    } finally {
      setIsPdfProtecting(false);
    }
  };

  // ==========================================
  // LÓGICA DA ABA 4: COFRE CRIPTOGRÁFICO AES-256 (CUSTÓDIA)
  // ==========================================
  const handleExecuteVault = async () => {
    if (selectedFiles.length === 0) {
      setErrorMessage('Por favor, selecione ao menos um arquivo para o Cofre.');
      return;
    }

    if (vaultMode === 'lock_vault') {
      if (!vaultPassword) {
        setErrorMessage('Digite uma senha forte para trancar o arquivo no Cofre Militar AES-256.');
        return;
      }
    } else {
      if (!vaultUnlockPassword) {
        setErrorMessage('Digite a senha do Cofre para destrancar e restaurar o arquivo.');
        return;
      }
    }

    setIsVaultProcessing(true);
    setErrorMessage(null);
    const resultsList: { fileName: string; data: Uint8Array; modeName: string; hash: string }[] = [];
    const newAuditRecords: LgpdAuditRecord[] = [];

    try {
      for (const file of selectedFiles) {
        const buffer = await file.arrayBuffer();
        let processedData: Uint8Array;
        let modeName = '';
        let targetFileName = file.name;

        if (vaultMode === 'lock_vault') {
          processedData = await EncryptionEngine.encryptFileAesGcm(buffer, vaultPassword);
          modeName = 'Envelope Cofre Forte AES-GCM (KVX1)';
          if (!targetFileName.toLowerCase().endsWith('.kvx')) {
            targetFileName = `${targetFileName}.kvx`;
          }
        } else {
          processedData = await EncryptionEngine.decryptFileAesGcm(buffer, vaultUnlockPassword);
          modeName = 'Arquivo Restaurado do Cofre';
          if (targetFileName.toLowerCase().endsWith('.kvx')) {
            targetFileName = targetFileName.slice(0, -4);
          }
        }

        const sha256 = await EncryptionEngine.computeSha256(processedData);

        resultsList.push({
          fileName: targetFileName,
          data: processedData,
          modeName,
          hash: sha256
        });

        newAuditRecords.push({
          id: 'vault-' + Math.random().toString(36).substring(7),
          originalTerm: file.name,
          maskedTerm: `[COFRE: ${modeName}]`,
          entityType: 'Cofre Forte AES-GCM 256',
          detectionReason: `Hash Auditável SHA-256: ${sha256.substring(0, 16)}...`,
          timestamp: new Date().toLocaleString('pt-BR')
        });
      }

      setVaultResults(resultsList);
      setAuditRecords(prev => [...prev, ...newAuditRecords]);
      setSuccessMessage(
        vaultMode === 'lock_vault'
          ? 'Arquivo(s) trancado(s) no Cofre AES-256 com sucesso!'
          : 'Arquivo(s) destrancado(s) e restaurado(s) com sucesso!'
      );
    } catch (err: any) {
      setErrorMessage(`Erro ao processar Cofre AES-256: ${err.message || 'Senha incorreta ou dados corrompidos.'}`);
    } finally {
      setIsVaultProcessing(false);
    }
  };

  // ==========================================
  // DOWNLOAD UTILITÁRIO
  // ==========================================
  const downloadSingleResult = (fileName: string, data: Uint8Array, suffix: string) => {
    const blob = new Blob([data as unknown as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const parts = fileName.split('.');
    const ext = parts.pop();
    const name = parts.join('.');
    a.download = `${name}_${suffix}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadZipResults = (resultsArray: { fileName: string; data: Uint8Array }[], suffix: string) => {
    const zipFiles = resultsArray.map(r => {
      const parts = r.fileName.split('.');
      const ext = parts.pop();
      const name = parts.join('.');
      return {
        name: `${name}_${suffix}.${ext}`,
        data: r.data
      };
    });

    const zipBuffer = CompressionEngine.createZipArchive(zipFiles);
    const blob = new Blob([zipBuffer as unknown as BlobPart], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lgpd_Arquivos_Protegidos_${suffix}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (auditRecords.length === 0) {
      setErrorMessage('Ainda não há registros de auditoria nesta sessão para exportar.');
      return;
    }
    PdfReportExporterService.exportLgpdAuditCsv(auditRecords, `laudo_auditoria_lgpd_${Date.now()}.csv`);
  };

  const handleExportJson = () => {
    if (auditRecords.length === 0) {
      setErrorMessage('Ainda não há registros de auditoria nesta sessão para exportar.');
      return;
    }
    PdfReportExporterService.exportLgpdAuditJson(auditRecords, `laudo_auditoria_lgpd_${Date.now()}.json`);
  };

  return (
    <div className="flex flex-col h-full w-full space-y-5">
      {/* HEADER PRINCIPAL E NAVEGAÇÃO ENTRE ABAS DA SUÍTE */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500/20 via-blue-500/20 to-purple-500/20 border border-emerald-500/30 rounded-xl">
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-100">Central de Privacidade, Tarjamento & Criptografia LGPD</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  100% Offline & Sigiloso
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Plataforma unificada para descaracterização com I.A., expurgo de metadados, proteção por senha e laudos auditáveis.
              </p>
            </div>
          </div>

          {/* BOTÕES DE NAVEGAÇÃO DAS ABAS */}
          <div className="flex flex-wrap items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 gap-1">
            <button
              onClick={() => setActiveSubTab('redactor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'redactor'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              1. Tarjador LGPD
            </button>
            <button
              onClick={() => setActiveSubTab('sanitizer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'sanitizer'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              2. Higienizador Metadados
            </button>
            <button
              onClick={() => setActiveSubTab('pdf_protection')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'pdf_protection' || activeSubTab === 'encryption'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              3. Senha PDF (ISO 32000)
            </button>
            <button
              onClick={() => setActiveSubTab('vault_aes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'vault_aes'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              4. Cofre AES-256 (Custódia)
            </button>
            <button
              onClick={() => setActiveSubTab('certificate')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'certificate'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              5. Laudo Auditável
            </button>
          </div>
        </div>

        {/* FEEDBACK DE MENSAGENS */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl flex items-center justify-between text-xs text-red-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-200 text-xs font-bold">
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs text-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200 text-xs font-bold">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ÁREA DROPZONE COMPARTILHADA */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-blue-400" />
            Arquivos em Análise ({selectedFiles.length})
          </label>
          {selectedFiles.length > 0 && (
            <button
              onClick={clearAllFiles}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Lista
            </button>
          )}
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={handleDrop}
          className="border-2 border-dashed border-slate-700/80 hover:border-blue-500/50 bg-slate-950/50 hover:bg-slate-900/40 rounded-xl p-6 text-center transition-all cursor-pointer group"
        >
          <input
            type="file"
            multiple
            onChange={handleFilesChange}
            className="hidden"
            id="global-file-upload-suite"
          />
          <label htmlFor="global-file-upload-suite" className="cursor-pointer flex flex-col items-center justify-center">
            <div className="p-3 bg-slate-900 group-hover:bg-blue-600/20 text-slate-400 group-hover:text-blue-400 rounded-2xl transition-all border border-slate-800 mb-2">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold text-slate-200 group-hover:text-blue-300">
              Arraste seus documentos ou clique para selecionar
            </span>
            <span className="text-xs text-slate-500 mt-1">
              Suporta PDF, DOCX, imagens e arquivos confidenciais. Processamento 100% em memória local.
            </span>
          </label>
        </div>

        {/* LISTAGEM DE ARQUIVOS CARREGADOS */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-44 overflow-y-auto pr-1">
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs group hover:border-slate-700"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="truncate">
                    <div className="font-medium text-slate-200 truncate">{file.name}</div>
                    <div className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* CONTEÚDO DA ABA 1: TARJADOR LGPD DEFINITIVO */}
      {/* ========================================================= */}
      {activeSubTab === 'redactor' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* PAINEL DE CONFIGURAÇÃO DE TARJAMENTO */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                Categorias de Proteção LGPD
              </h3>

              <div className="space-y-2">
                {[
                  { key: 'cpf', label: 'CPF (Cadastro de Pessoas Físicas)' },
                  { key: 'cnpj', label: 'CNPJ (Cadastro de Empresas)' },
                  { key: 'rg', label: 'RG / Cédula de Identidade' },
                  { key: 'emails', label: 'Endereços de E-mail' },
                  { key: 'phones', label: 'Telefones e Celulares' },
                  { key: 'names', label: 'Nomes Próprios (I.A. Reconhecimento)' },
                  { key: 'addresses', label: 'Endereços e CEPs' },
                  { key: 'financial', label: 'Dados Bancários e Cartões' },
                  { key: 'health', label: 'Prontuários / Saúde Sensível' }
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors"
                  >
                    <span className="text-xs text-slate-300 font-medium">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={!!(categories as any)[item.key]}
                      onChange={(e) => setCategories(prev => ({ ...prev, [item.key]: e.target.checked }))}
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                  </label>
                ))}
              </div>

              {/* TERMOS CUSTOMIZADOS */}
              <div className="pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-400 block mb-1.5">Termos ou Nomes Específicos</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTermInput}
                    onChange={(e) => setCustomTermInput(e.target.value)}
                    placeholder="Ex: Nome da testemunha ou segredo..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomKeyword()}
                  />
                  <button
                    onClick={handleAddCustomKeyword}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold"
                  >
                    Adicionar
                  </button>
                </div>
                {categories.customKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {categories.customKeywords.map((term, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-950 border border-blue-800 text-blue-300 rounded-lg text-[10px] flex items-center gap-1">
                        {term}
                        <button onClick={() => handleRemoveCustomKeyword(term)} className="hover:text-red-400">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* BOTAO EXECUTAR ANÁLISE */}
              <button
                onClick={handleStartAnalysis}
                disabled={isAnalyzing || selectedFiles.length === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analisando Documento ({analysisProgress}%)...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Iniciar Varredura LGPD de Risco
                  </>
                )}
              </button>
            </div>

            {/* LISTAGEM DE ITENS DETECTADOS & AÇÃO DE TARJAMENTO */}
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-emerald-400" />
                    Itens Identificados para Ocultação ({detectedItems.length})
                  </h3>
                  {hasAnalyzed && (
                    <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      Varredura Concluída
                    </span>
                  )}
                </div>

                {!hasAnalyzed ? (
                  <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl p-6 text-center text-slate-500">
                    <ShieldCheck className="w-10 h-10 text-slate-700 mb-2" />
                    <p className="text-xs">Clique em "Iniciar Varredura LGPD de Risco" para rastrear dados pessoais e sensíveis.</p>
                  </div>
                ) : detectedItems.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl p-6 text-center text-slate-400">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                    <p className="text-xs font-semibold text-slate-300">Nenhum dado pessoal crítico detectado nas categorias selecionadas.</p>
                    <p className="text-[11px] text-slate-500 mt-1">Seus documentos parecem seguros ou adicione termos customizados.</p>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {detectedItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => toggleItemSelection(item.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                          item.selected
                            ? 'bg-blue-950/40 border-blue-500/40 text-slate-200'
                            : 'bg-slate-950/40 border-slate-800/60 text-slate-500 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => {}}
                            className="w-4 h-4 accent-blue-600 rounded"
                          />
                          <div>
                            <span className="font-semibold text-blue-400 block">{item.text}</span>
                            <span className="text-[10px] text-slate-500">
                              Pág. {item.pageIndex + 1} • Tipo: {item.category.toUpperCase()}
                              {item.fileName && <> • Arquivo: <span className="text-slate-300 font-medium">{item.fileName}</span></>}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                          {item.confidence ? `${Math.round(item.confidence * 100)}% Confiança` : 'Exato'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* BOTAO APLICAR TARJAS DEFINITIVAS */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  <span className="font-bold text-slate-200">{detectedItems.filter(i => i.selected).length}</span> itens selecionados para sanitização
                </div>
                <button
                  onClick={handleExecuteRedaction}
                  disabled={isRedacting || detectedItems.filter(i => i.selected).length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isRedacting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sanitizando Camadas...
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Aplicar Tarjamento e Sanitização
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RESULTADOS DO TARJAMENTO */}
          {redactedResults && redactedResults.length > 0 && (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Arquivos Tarjados Prontos para Download ({redactedResults.length})
                </h4>
                {redactedResults.length > 1 && (
                  <button
                    onClick={() => downloadZipResults(redactedResults, 'tarjado')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    Baixar Todos em .ZIP
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {redactedResults.map((res, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-200">{res.fileName}</div>
                      <div className="text-[10px] text-emerald-400 mt-0.5">{res.redactionCount} tarjas irreversíveis aplicadas</div>
                    </div>
                    <button
                      onClick={() => downloadSingleResult(res.fileName, res.data, 'tarjado')}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* CONTEÚDO DA ABA 2: HIGIENIZAÇÃO DE METADADOS */}
      {/* ========================================================= */}
      {activeSubTab === 'sanitizer' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* PAINEL DE METADADOS ENCONTRADOS */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                Relatório de Metadados Rastreáveis
              </h3>

              {isInspecting ? (
                <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-400" />
                  <p>Inspecionando campos oculta do documento...</p>
                </div>
              ) : Object.keys(reports).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl p-4">
                  Adicione um arquivo PDF para visualizar os metadados gravados.
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {Object.entries(reports).map(([fname, rep]) => (
                    <div key={fname} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                      <div className="font-bold text-slate-200 truncate">{fname}</div>
                      <div className="text-[11px] text-slate-400">Autor: <span className="text-slate-200 font-mono">{rep.author || 'Não declarado'}</span></div>
                      <div className="text-[11px] text-slate-400">Criador: <span className="text-slate-200 font-mono">{rep.creator || rep.producer || 'Não declarado'}</span></div>
                      <div className="text-[11px] text-slate-400">Data Criação: <span className="text-slate-200 font-mono">{rep.creationDate || 'N/A'}</span></div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          rep.riskLevel === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          Risco LGPD: {rep.riskLevel.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* OPCÕES DE EXPURGO */}
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-4">
                  <Eraser className="w-4 h-4 text-emerald-400" />
                  Opções de Limpeza e Expurgo
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">Expurgar Autor e Software Criador</span>
                      <span className="text-[10px] text-slate-500">Remove nomes de licença de Word, Acrobat, etc.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={cleanAuthorAndCreator}
                      onChange={(e) => setCleanAuthorAndCreator(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">Zerar Timestamps de Criação</span>
                      <span className="text-[10px] text-slate-500">Remove data e hora exata da última edição.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={cleanDates}
                      onChange={(e) => setCleanDates(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">Limpar Metadados Avançados XMP</span>
                      <span className="text-[10px] text-slate-500">Remove tags ocultas de geolocalização e sistema.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={cleanXmpAndPrivateData}
                      onChange={(e) => setCleanXmpAndPrivateData(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">Remover Anexos Embutidos</span>
                      <span className="text-[10px] text-slate-500">Apaga arquivos anexos internamente no PDF.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={removeAttachments}
                      onChange={(e) => setRemoveAttachments(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                  </label>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Identificação Genérica do Software Gerador</label>
                  <input
                    type="text"
                    value={customProducerText}
                    onChange={(e) => setCustomProducerText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* BOTAO HIGIENIZAR */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Mantém a estética e o texto visual do PDF intatos</span>
                <button
                  onClick={handleExecuteSanitization}
                  disabled={isSanitizing || selectedFiles.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSanitizing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Higienizando...
                    </>
                  ) : (
                    <>
                      <Eraser className="w-4 h-4" />
                      Expurgar Metadados Agora
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RESULTADOS DA HIGIENIZAÇÃO */}
          {sanitizedResults && sanitizedResults.length > 0 && (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Arquivos Higienizados Prontos ({sanitizedResults.length})
                </h4>
                {sanitizedResults.length > 1 && (
                  <button
                    onClick={() => downloadZipResults(sanitizedResults, 'higienizado')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    Baixar Todos em .ZIP
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sanitizedResults.map((res, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-200">{res.fileName}</div>
                      <div className="text-[10px] text-emerald-400 mt-0.5">Rastros de autoria completamente removidos</div>
                    </div>
                    <button
                      onClick={() => downloadSingleResult(res.fileName, res.data, 'higienizado')}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* CONTEÚDO DA ABA 3: PROTEÇÃO DE PDF POR SENHA (ISO 32000)   */}
      {/* ========================================================= */}
      {(activeSubTab === 'pdf_protection' || activeSubTab === 'encryption') && (
        <div className="space-y-5">
          {/* BANNER INFORMATIVO ISO 32000 */}
          <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-blue-300 block mb-0.5">Proteção Padrão para Leitores de Mercado (ISO 32000)</span>
              Aplica criptografia AES-256 oficial do padrão PDF. O documento resultante continuará sendo um arquivo .pdf normal, porém leitores como Adobe Acrobat, Foxit, Chrome e sistemas dos tribunais (PJe/TJSP/TRF) exigirão a senha para exibição ou edição.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* SELEÇÃO DA OPERAÇÃO DE PDF */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-400" />
                Operação no PDF
              </h3>

              <div className="space-y-2">
                <button
                  onClick={() => setPdfProtectionMode('encrypt_pdf')}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    pdfProtectionMode === 'encrypt_pdf'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center gap-2">
                    <Key className="w-3.5 h-3.5" />
                    1. Proteger PDF com Senha
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Exige senha para o destinatário conseguir visualizar o documento.
                  </div>
                </button>

                <button
                  onClick={() => setPdfProtectionMode('decrypt_pdf')}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    pdfProtectionMode === 'decrypt_pdf'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center gap-2">
                    <Unlock className="w-3.5 h-3.5" />
                    2. Desbloquear PDF (Remover Senha)
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Remove a senha de um PDF protegido fornecendo a credencial atual.
                  </div>
                </button>
              </div>
            </div>

            {/* ENTRADA DE SENHAS E PERMISSÕES */}
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  {pdfProtectionMode === 'decrypt_pdf' ? 'Desbloqueio de PDF Protegido' : 'Definição de Senhas e Restrições ISO 32000'}
                </h3>

                {pdfProtectionMode === 'decrypt_pdf' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 block">Digite a Senha Atual do PDF</label>
                    <input
                      type="password"
                      value={pdfUnlockPassword}
                      onChange={(e) => setPdfUnlockPassword(e.target.value)}
                      placeholder="Senha de abertura do PDF..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 block">Senha de Leitura (Abertura)</label>
                      <input
                        type="password"
                        value={pdfUserPassword}
                        onChange={(e) => setPdfUserPassword(e.target.value)}
                        placeholder="Senha exigida para abrir..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <span className="text-[10px] text-slate-500">Exigida para visualizar o conteúdo.</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 block">Senha de Proprietário (Modificações)</label>
                      <input
                        type="password"
                        value={pdfOwnerPassword}
                        onChange={(e) => setPdfOwnerPassword(e.target.value)}
                        placeholder="Senha administrativa (opcional)..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <span className="text-[10px] text-slate-500">Exigida para alterar permissões ou extrair páginas.</span>
                    </div>
                  </div>
                )}

                {/* OPÇÕES DE PERMISSÕES PARA PDF */}
                {pdfProtectionMode === 'encrypt_pdf' && (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-slate-400 block mb-1">Restrições Granulares do Documento</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer">
                        <span className="text-xs text-slate-300">Permitir Impressão em Alta Resolução</span>
                        <input
                          type="checkbox"
                          checked={allowPrinting}
                          onChange={(e) => setAllowPrinting(e.target.checked)}
                          className="w-4 h-4 accent-blue-600 rounded"
                        />
                      </label>
                      <label className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer">
                        <span className="text-xs text-slate-300">Permitir Copiar Texto / Conteúdo</span>
                        <input
                          type="checkbox"
                          checked={allowCopying}
                          onChange={(e) => setAllowCopying(e.target.checked)}
                          className="w-4 h-4 accent-blue-600 rounded"
                        />
                      </label>
                      <label className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer">
                        <span className="text-xs text-slate-300">Permitir Modificações na Estrutura</span>
                        <input
                          type="checkbox"
                          checked={allowModifying}
                          onChange={(e) => setAllowModifying(e.target.checked)}
                          className="w-4 h-4 accent-blue-600 rounded"
                        />
                      </label>
                      <label className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer">
                        <span className="text-xs text-slate-300">Permitir Anotações e Formulários</span>
                        <input
                          type="checkbox"
                          checked={allowAnnotating}
                          onChange={(e) => setAllowAnnotating(e.target.checked)}
                          className="w-4 h-4 accent-blue-600 rounded"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* BOTÃO EXECUTAR PROTEÇÃO DE PDF */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Compatível 100% com Adobe Acrobat e Tribunais</span>
                <button
                  onClick={handleExecutePdfProtection}
                  disabled={isPdfProtecting || selectedFiles.length === 0}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {isPdfProtecting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processando PDF...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      {pdfProtectionMode === 'encrypt_pdf' ? 'Aplicar Senha no PDF' : 'Remover Proteção do PDF'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RESULTADOS DA PROTEÇÃO DE PDF */}
          {pdfProtectionResults && pdfProtectionResults.length > 0 && (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  PDFs Prontos ({pdfProtectionResults.length})
                </h4>
                {pdfProtectionResults.length > 1 && (
                  <button
                    onClick={() => downloadZipResults(pdfProtectionResults, 'protegido')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    Baixar Todos em .ZIP
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pdfProtectionResults.map((res, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-200">{res.fileName}</div>
                      <div className="text-[10px] text-blue-400 mt-0.5">{res.modeName} • Hash: {res.hash.substring(0, 12)}...</div>
                    </div>
                    <button
                      onClick={() => downloadSingleResult(res.fileName, res.data, 'protegido')}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* CONTEÚDO DA ABA 4: COFRE CRIPTOGRÁFICO AES-256 (CUSTÓDIA)   */}
      {/* ========================================================= */}
      {activeSubTab === 'vault_aes' && (
        <div className="space-y-5">
          {/* BANNER RIGOROSO DE SEGREGAÇÃO CRIPTOGRÁFICA */}
          <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-purple-300 block mb-0.5">Segregação de Segurança: Cofre Forte de Arquivos (AES-256-GCM)</span>
              O Cofre Forte gera um invólucro criptografado (<code className="text-purple-300 font-mono">.kvx</code>) com chave derivada via PBKDF2 (100.000 iterações). <strong>Este formato destina-se a custódia e backup seguro</strong>, sendo 100% segregado da proteção por senha de PDFs comuns. Arquivos trancados no cofre não abrem diretamente em leitores de PDF ou editores de texto sem que sejam destrancados nesta ferramenta.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* SELEÇÃO DO MODO DO COFRE */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                Operação do Cofre
              </h3>

              <div className="space-y-2">
                <button
                  onClick={() => setVaultMode('lock_vault')}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    vaultMode === 'lock_vault'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" />
                    1. Trancar Arquivo no Cofre (.kvx)
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Gera invólucro AES-256-GCM para custódia segura de PDF, DOCX, ZIP, etc.
                  </div>
                </button>

                <button
                  onClick={() => setVaultMode('unlock_vault')}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    vaultMode === 'unlock_vault'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center gap-2">
                    <Unlock className="w-3.5 h-3.5" />
                    2. Destrancar / Restaurar Arquivo
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Restaura o arquivo original a partir de um envelope .kvx fornecendo a senha.
                  </div>
                </button>
              </div>
            </div>

            {/* ENTRADA DE SENHAS DO COFRE */}
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-purple-400" />
                  {vaultMode === 'lock_vault' ? 'Definição da Chave Mestra do Cofre' : 'Credencial de Desbloqueio do Cofre'}
                </h3>

                {vaultMode === 'lock_vault' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">Senha Forte do Cofre AES-256</label>
                    <input
                      type="password"
                      value={vaultPassword}
                      onChange={(e) => setVaultPassword(e.target.value)}
                      placeholder="Crie uma senha forte de custódia..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-500 block">
                      A chave será derivada com algoritmo PBKDF2 e 100.000 iterações. Sem a senha, a recuperação é matematicamente impossível.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">Senha de Destrancamento do Arquivo .kvx</label>
                    <input
                      type="password"
                      value={vaultUnlockPassword}
                      onChange={(e) => setVaultUnlockPassword(e.target.value)}
                      placeholder="Senha cadastrada ao trancar o cofre..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* BOTÃO EXECUTAR COFRE */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Padrão militar AES-GCM com autenticação de integridade</span>
                <button
                  onClick={handleExecuteVault}
                  disabled={isVaultProcessing || selectedFiles.length === 0}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
                >
                  {isVaultProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processando Cofre...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      {vaultMode === 'lock_vault' ? 'Trancar no Cofre (.kvx)' : 'Destrancar Arquivo'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RESULTADOS DO COFRE */}
          {vaultResults && vaultResults.length > 0 && (
            <div className="bg-purple-950/30 border border-purple-500/30 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  Arquivos Processados no Cofre ({vaultResults.length})
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vaultResults.map((res, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-200">{res.fileName}</div>
                      <div className="text-[10px] text-purple-400 mt-0.5">{res.modeName} • Hash: {res.hash.substring(0, 12)}...</div>
                    </div>
                    <button
                      onClick={() => {
                        const blob = new Blob([res.data as unknown as BlobPart], { type: 'application/octet-stream' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = res.fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* CONTEÚDO DA ABA 4: LAUDO & CERTIFICADO LGPD AUDITÁVEL */}
      {/* ========================================================= */}
      {activeSubTab === 'certificate' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                Laudo & Certificado de Conformidade Auditável LGPD
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Exporte o relatório estruturado em CSV ou JSON de todas as operações de tarjamento, expurgo e criptografia realizadas nesta sessão.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportCsv}
                disabled={auditRecords.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
              <button
                onClick={handleExportJson}
                disabled={auditRecords.length === 0}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Exportar JSON
              </button>
            </div>
          </div>

          {auditRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
              <ShieldAlert className="w-10 h-10 text-slate-700 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-300">Nenhum registro de auditoria gerado ainda nesta sessão.</p>
              <p className="text-[11px] text-slate-500 mt-1">Execute um tarjamento, expurgo de metadados ou criptografia para acumular registros de auditoria.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Histórico de Ações Registradas ({auditRecords.length})
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {auditRecords.map((rec, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-200 flex items-center gap-2">
                        <span className="text-blue-400">{rec.entityType}</span>
                        <span className="text-slate-500">• {rec.originalTerm}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">{rec.detectionReason}</div>
                      <div className="text-[10px] text-emerald-400 font-mono mt-1">Status: {rec.maskedTerm}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block mt-1">{rec.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LgpdPrivacySecuritySuite;
