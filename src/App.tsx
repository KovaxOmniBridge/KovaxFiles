import { useState, useEffect } from 'react';
import { Navbar, type AppTabType } from './components/Navbar';
import { CourtPdfPresets } from './components/CourtPdfPresets';
import { Dropzone } from './components/Dropzone';
import { CategoryFilter } from './components/CategoryFilter';
import { FileCard } from './components/FileCard';
import { QualityPreviewModal } from './components/QualityPreviewModal';
import { ComplianceModal } from './components/ComplianceModal';
import { DigitalSignerTab } from './components/DigitalSignerTab';
import { MetadataSanitizerTab } from './components/MetadataSanitizerTab';
import { RedactionAnonymizerTab } from './components/RedactionAnonymizerTab';
import { LocalAiAnalyzerTab } from './components/LocalAiAnalyzerTab';
import { Footer } from './components/Footer';
import { useBatchProcessor } from './hooks/useBatchProcessor';
import type { BatchFileItem, FileCategory } from './types';
import { Play, Download, Trash2, Cpu, ShieldCheck, AlertTriangle, FileText } from 'lucide-react';
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
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} onOpenCompliance={() => setIsComplianceOpen(true)} />

      <main className="flex-1 w-[92vw] max-w-[92vw] mx-auto px-2 sm:px-4 lg:px-6 pt-8 pb-16">
        {activeTab === 'converter' && (
          <>
            {/* Hero Title Header */}
            <div className="text-center max-w-3xl mx-auto mb-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4 shadow-inner">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                100% Processamento Local na Máquina • Zero Upload • Limite 2 GB por arquivo
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4 leading-tight">
                Conversor, Compressor & <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">Otimizador Universal</span> Local
              </h2>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
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
              <div className="mb-6 p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex items-start space-x-3 text-amber-300 text-xs shadow-lg animate-fadeIn">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block text-white text-sm mb-1">Aviso de Limite de Arquivo (2 GB Max):</strong>
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
                <div className="glass-panel p-4 sm:p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  
                  {/* Left Info Metrics */}
                  <div className="flex items-center space-x-4 text-xs">
                    <div>
                      <span className="text-slate-400 block">Total na Fila:</span>
                      <strong className="text-white text-sm font-mono">{items.length} arquivos</strong>
                    </div>

                    <div className="h-8 w-[1px] bg-slate-800" />

                    <div>
                      <span className="text-slate-400 block">Concluídos:</span>
                      <strong className="text-emerald-400 text-sm font-mono">{completedCount} / {items.length}</strong>
                    </div>

                    {completedCount > 0 && totalSavedPercent > 0 && (
                      <>
                        <div className="h-8 w-[1px] bg-slate-800" />
                        <div>
                          <span className="text-slate-400 block">Espaço Economizado:</span>
                          <strong className="text-purple-300 text-sm font-mono">-{totalSavedPercent}%</strong>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center flex-wrap gap-3 w-full md:w-auto justify-end">
                    
                    <button
                      onClick={clearAll}
                      disabled={isProcessing}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold border border-slate-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      title="Limpar fila e auto-destruir memória RAM temporária"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                      Limpar Fila & RAM
                    </button>

                    {completedCount > 0 && (
                      <button
                        onClick={downloadAllAsZip}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-950 flex items-center gap-2 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        Baixar Todos (.ZIP)
                      </button>
                    )}

                    {categoryCounts.image > 1 && (
                      <button
                        onClick={convertAllImagesToPdf}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-950 flex items-center gap-2 transition-all disabled:opacity-50"
                        title="Juntar todas as fotos/imagens da fila em um único arquivo PDF multipáginas"
                      >
                        <FileText className="w-4 h-4 text-blue-200" />
                        Juntar Fotos ➔ PDF Único
                      </button>
                    )}

                    <button
                      onClick={processBatch}
                      disabled={isProcessing || items.every((i) => i.status === 'completed')}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 hover:opacity-90 text-white text-xs font-bold shadow-xl shadow-indigo-950 flex items-center gap-2 transition-all disabled:opacity-50"
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

      <Footer />
    </div>
  );
}

export default App;
