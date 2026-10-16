import React, { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PdfCompressor } from './components/tools/PdfCompressor';
import { LgpdPrivacySecuritySuite } from './components/tools/LgpdPrivacySecuritySuite';
import { FileConverter } from './components/tools/FileConverter';
import { ProcessStamper } from './components/tools/ProcessStamper';
import { PdfManipulator } from './components/tools/PdfManipulator';
import { OcrScanner } from './components/tools/OcrScanner';
import { LexmlSearchTool } from './components/tools/LexmlSearchTool';
import { DocEditor } from './components/tools/DocEditor';
import { DigitalSignatureTool } from './components/tools/DigitalSignatureTool';
import { CourtFilingWizard } from './components/tools/CourtFilingWizard';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('court_filing');

  const renderActiveTool = () => {
    switch (activeTab) {
      case 'court_filing':
      case 'protocolo':
        return <CourtFilingWizard />;
      case 'editor':
        return <DocEditor />;
      case 'pades_signer':
      case 'signature':
        return <DigitalSignatureTool />;
      case 'lexml':
        return <LexmlSearchTool />;
      case 'compressor':
        return <PdfCompressor />;
      case 'converter':
        return <FileConverter />;
      case 'privacy_suite':
      case 'lgpd':
        return <LgpdPrivacySecuritySuite initialSubTab="redactor" />;
      case 'sanitizer':
        return <LgpdPrivacySecuritySuite initialSubTab="sanitizer" />;
      case 'encryption':
        return <LgpdPrivacySecuritySuite initialSubTab="encryption" />;
      case 'certificate':
        return <LgpdPrivacySecuritySuite initialSubTab="certificate" />;
      case 'stamper':
        return <ProcessStamper />;
      case 'manipulator':
        return <PdfManipulator />;
      case 'ocr':
        return <OcrScanner />;
      default:
        return <DocEditor />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden text-slate-100">
      {/* Top Header */}
      <Header activeTab={activeTab} />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Content Viewport */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 md:p-6 bg-slate-950/90">
          <div className="glass-panel p-6 md:p-8 h-full flex flex-col min-h-0 overflow-y-auto">
            {renderActiveTool()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
