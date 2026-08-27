import { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import { Navbar, type AppTabType } from './components/Navbar';
import { CourtPdfPresets } from './components/CourtPdfPresets';
import { Dropzone } from './components/Dropzone';
import { CategoryFilter } from './components/CategoryFilter';
import { FileCard } from './components/FileCard';
import { QualityPreviewModal } from './components/QualityPreviewModal';
import { ComplianceModal } from './components/ComplianceModal';
import { PdfPageOrganizerModal } from './components/PdfPageOrganizerModal';
import { PdfMergeModal } from './components/PdfMergeModal';
import { GoogleDocsWysiwygModal } from './components/GoogleDocsWysiwygModal';
import { DigitalSignerTab } from './components/DigitalSignerTab';
import { MetadataSanitizerTab } from './components/MetadataSanitizerTab';
import { RedactionAnonymizerTab } from './components/RedactionAnonymizerTab';
import { LocalAiAnalyzerTab } from './components/LocalAiAnalyzerTab';
import { Footer } from './components/Footer';
import { useBatchProcessor } from './hooks/useBatchProcessor';
import type { BatchFileItem, FileCategory } from './types';
import { Play, Download, Trash2, Cpu, ShieldCheck, AlertTriangle, FileText, Layers } from 'lucide-react';
import { networkAuditLogger } from './services';

export function App() {
  const [activeTab, setActiveTab] = useState<AppTabType>('converter');
  const {
    items,
    isProcessing,
    selectedPreset,
    setSelectedPreset,
    customMaxMB,
    setCustomMaxMB,
    rejectedFilesError,
    addFiles,
    updateItemOperation,
    updateItemOptions,
    removeItem,
    clearAll,
    processBatch,
    downloadSingle,
    downloadAllAsZip,
    convertAllImagesToPdf,
  } = useBatchProcessor();

  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('all');
  const [previewItem, setPreviewItem] = useState<BatchFileItem | null>(null);
  const [isComplianceOpen, setIsComplianceOpen] = useState(false);
  const [organizerFile, setOrganizerFile] = useState<File | null>(null);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [gdocsFile, setGdocsFile] = useState<File | null>(null);

  useEffect(() => {
    // Initialize network audit interceptor
    networkAuditLogger.init();

    // Register Service Worker for offline functionality
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').then(() => {
        // Registered successfully
      }).catch(() => {
        // Silently ignore if not found in dev environment
      });
    }
  }, []);

  // Category counts
  const categoryCounts: Record<FileCategory, number> = {
    all: items.length,
    pdf_court: items.filter((i) => i.category === 'pdf_court').length,
    image: items.filter((i) => i.category === 'image').length,
    document: items.filter((i) => i.category === 'document').length,
    spreadsheet: items.filter((i) => i.category === 'spreadsheet').length,
    presentation: items.filter((i) => i.category === 'presentation').length,
    media: items.filter((i) => i.category === 'media').length,
    archive: items.filter((i) => i.category === 'archive').length,
  };

  // Filtered list
  const filteredItems = items.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const totalOriginalSize = items.reduce((acc, curr) => acc + curr.originalSize, 0);
  const totalProcessedSize = items.reduce((acc, curr) => acc + (curr.processedSize || curr.originalSize), 0);
  const totalSavedPercent = totalOriginalSize > 0 && totalProcessedSize < totalOriginalSize
    ? Math.round(((totalOriginalSize - totalProcessedSize) / totalOriginalSize) * 100)
    : 0;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} onOpenCompliance={() => setIsComplianceOpen(true)} />

      <main className="flex-1 w-[96vw] max-w-[96vw] mx-auto px-2 sm:px-4 lg:px-6 pt-6 sm:pt-8 pb-16">
        {activeTab === 'converter' && (
          <>
            {/* Hero Title Header */}
            <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10 px-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-4 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>100% Processamento Local • Zero Upload • Limite 2 GB por arquivo</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3 sm:mb-4 leading-tight">
                Conversor, Compressor & <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">Otimizador Universal</span>
              </h2>
              <p className="text-slate-600 text-xs sm:text-base leading-relaxed">
                Compacte PDFs para Tribunais (PJe/TJSP), converta imagens HEIC, WebP e AVIF, documentos Word/PDF e transcodifique mídias com múltiplos Web Workers locais.
              </p>
            </div>

            {/* Golden Feature: Court PDF Presets */}
            <CourtPdfPresets
              selectedPreset={selectedPreset}
              onSelectPreset={setSelectedPreset}
              customMaxMB={customMaxMB}
              onCustomMaxMBChange={setCustomMaxMB}
            />

            {/* Rejection Alert for >2GB Files */}
            {rejectedFilesError && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start space-x-3 text-amber-900 text-xs shadow-xs animate-fadeIn">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block text-amber-950 text-sm mb-1">Aviso de Limite de Arquivo (2 GB Max):</strong>
                  <p className="leading-relaxed">{rejectedFilesError}</p>
                </div>
              </div>
            )}

            {/* Batch File Dropzone */}
            <Dropzone onFilesAdded={addFiles} currentCount={items.length} />

            {/* Queue Management & Batch Actions */}
            {items.length > 0 && (
              <div className="mb-8">
                
                {/* Category Navigation Tabs */}
                <CategoryFilter
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  counts={categoryCounts}
                />

                {/* Batch Processing Controls Bar */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 mb-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                  
                  {/* Left Info Metrics */}
                  <div className="flex items-center space-x-4 text-xs w-full md:w-auto justify-between md:justify-start">
                    <div>
                      <span className="text-slate-500 block">Total na Fila:</span>
                      <strong className="text-slate-900 text-sm font-mono">{items.length} arquivos</strong>
                    </div>

                    <div className="h-8 w-[1px] bg-slate-200" />

                    <div>
                      <span className="text-slate-500 block">Concluídos:</span>
                      <strong className="text-emerald-700 text-sm font-mono">{completedCount} / {items.length}</strong>
                    </div>

                    {completedCount > 0 && totalSavedPercent > 0 && (
                      <>
                        <div className="h-8 w-[1px] bg-slate-200" />
                        <div>
                          <span className="text-slate-500 block">Espaço Economizado:</span>
                          <strong className="text-indigo-700 text-sm font-mono">-{totalSavedPercent}%</strong>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto justify-end">
                    
                    <button
                      onClick={clearAll}
                      disabled={isProcessing}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      title="Limpar fila e auto-destruir memória RAM temporária"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                      Limpar Fila & RAM
                    </button>

                    {completedCount > 0 && (
                      <button
                        onClick={downloadAllAsZip}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        Baixar Todos (.ZIP)
                      </button>
                    )}

                    {categoryCounts.image > 1 && (
                      <button
                        onClick={convertAllImagesToPdf}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                        title="Juntar todas as fotos/imagens da fila em um único arquivo PDF multipáginas"
                      >
                        <FileText className="w-4 h-4 text-blue-100" />
                        Juntar Fotos ➔ PDF Único
                      </button>
                    )}

                    {categoryCounts.pdf_court > 1 && (
                      <button
                        onClick={() => setIsMergeModalOpen(true)}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                        title="Juntar múltiplos PDFs da fila em um único arquivo"
                      >
                        <Layers className="w-4 h-4 text-indigo-100" />
                        Mesclar PDFs em Fila
                      </button>
                    )}

                    <button
                      onClick={processBatch}
                      disabled={isProcessing || items.every((i) => i.status === 'completed')}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <Cpu className="w-4 h-4 animate-spin" />
                          Processando em Lote...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          Processar Fila em Lote
                        </>
                      )}
                    </button>

                  </div>

                </div>

                {/* File Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map((item) => (
                    <FileCard
                      key={item.id}
                      item={item}
                      onUpdateOperation={updateItemOperation}
                      onUpdateOptions={updateItemOptions}
                      onRemove={removeItem}
                      onPreview={setPreviewItem}
                      onDownload={downloadSingle}
                      onOpenGDocsEditor={setGdocsFile}
                    />
                  ))}
                </div>

              </div>
            )}
          </>
        )}

        {activeTab === 'signer' && <DigitalSignerTab />}
        {activeTab === 'sanitizer' && <MetadataSanitizerTab />}
        {activeTab === 'redactor' && <RedactionAnonymizerTab />}
        {activeTab === 'local-ai' && <LocalAiAnalyzerTab />}
      </main>

      {/* Quality Comparison Modal */}
      <QualityPreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        onDownload={downloadSingle}
      />

      {/* Compliance & Security Audit Report Modal */}
      <ComplianceModal
        isOpen={isComplianceOpen}
        onClose={() => setIsComplianceOpen(false)}
      />

      {/* Google Docs WYSIWYG Editor & Visualizer Modal */}
      <GoogleDocsWysiwygModal
        isOpen={Boolean(gdocsFile)}
        file={gdocsFile}
        onClose={() => setGdocsFile(null)}
      />

      {/* PDF Page Organizer & Rotator Modal */}
      <PdfPageOrganizerModal
        isOpen={Boolean(organizerFile)}
        file={organizerFile}
        onClose={() => setOrganizerFile(null)}
        onSave={(blob, filename) => {
          saveAs(blob, filename);
          setOrganizerFile(null);
        }}
      />

      {/* PDF Merge Modal */}
      <PdfMergeModal
        isOpen={isMergeModalOpen}
        initialFiles={items.filter((i) => i.category === 'pdf_court' || i.name.endsWith('.pdf')).map((i) => i.file)}
        onClose={() => setIsMergeModalOpen(false)}
        onMerged={(blob, filename) => {
          saveAs(blob, filename);
          setIsMergeModalOpen(false);
        }}
      />

      <Footer />
    </div>
  );
}

export default App;
