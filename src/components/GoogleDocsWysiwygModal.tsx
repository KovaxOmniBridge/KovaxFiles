import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  FileText,
  Sparkles,
  Printer,
  FileDown,
  Ruler,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { extractUniversalDocText } from '../services/converters/docConverter';
import { renderMarkdownToHtml } from '../services/converters/markdownConverter';
import { sanitizeClonedDocCss } from '../utils/cssSanitizer';

interface GoogleDocsWysiwygModalProps {
  file: File | null;
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleDocsWysiwygModal: React.FC<GoogleDocsWysiwygModalProps> = ({
  file,
  isOpen,
  onClose,
}) => {
  const [contentHtml, setContentHtml] = useState<string>('');
  const [docTitle, setDocTitle] = useState<string>('Documento sem título');
  const [fontFamily, setFontFamily] = useState<string>('Arial');
  const [fontSize, setFontSize] = useState<string>('11pt');
  const [lineHeight, setLineHeight] = useState<string>('1.28');
  const [showPageNumbers, setShowPageNumbers] = useState<boolean>(true);
  const [headerText, setHeaderText] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !file) return;

    const loadContent = async () => {
      setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
      setStatusMessage('Carregando documento...');

      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';

        if (ext === 'html' || ext === 'htm') {
          const text = await file.text();
          setContentHtml(text);
        } else if (ext === 'md' || ext === 'markdown') {
          const text = await file.text();
          setContentHtml(renderMarkdownToHtml(text));
        } else if (ext === 'txt') {
          const text = await file.text();
          const html = text
            .split(/\r?\n/)
            .map((line) => `<p style="margin:0 0 6pt 0; text-align:justify; font-size:11pt; line-height:1.28; font-family:Arial, sans-serif;">${line || '&nbsp;'}</p>`)
            .join('');
          setContentHtml(html);
        } else {
          // Arquivos DOCX, DOC, ODT, etc.
          const rawText = await extractUniversalDocText(file);
          const html = rawText
            .split(/\r?\n/)
            .filter((l) => l.trim().length > 0)
            .map((line) => `<p style="margin:0 0 6pt 0; text-align:justify; font-size:11pt; line-height:1.28; font-family:Arial, sans-serif;">${line}</p>`)
            .join('');
          setContentHtml(html || '<p style="margin:0 0 6pt 0; text-align:justify; font-size:11pt; line-height:1.28; font-family:Arial, sans-serif;">Documento pronto para edição...</p>');
        }
        setStatusMessage('');
      } catch (err) {
        console.error('Erro ao carregar conteúdo do documento:', err);
        setContentHtml('<p style="margin:0 0 6pt 0; text-align:justify; font-size:11pt; line-height:1.28; font-family:Arial, sans-serif;">Insira seu texto aqui...</p>');
        setStatusMessage('');
      }
    };

    loadContent();
  }, [isOpen, file]);

  if (!isOpen) return null;

  const execCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setContentHtml(editorRef.current.innerHTML);
    }
  };

  const handleExportPdf = async () => {
    if (!editorRef.current) return;
    setIsExporting(true);
    setStatusMessage('Exportando PDF (Margens 2,54 cm, Arial 11pt)...');

    try {
      const pageWidthPt = 595.28;
      const pageHeightPt = 841.89;
      const marginPt = 72; // 2.54 cm exato (1 polegada)
      const contentWidthPt = pageWidthPt - 2 * marginPt; // 451.28 pt

      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = '794px';
      iframe.style.height = '1123px';
      iframe.style.border = 'none';

      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        throw new Error('Erro ao inicializar renderizador.');
      }

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              html, body {
                width: ${contentWidthPt}pt !important;
                max-width: ${contentWidthPt}pt !important;
                font-family: ${fontFamily}, Arial, Helvetica, sans-serif !important;
                font-size: ${fontSize} !important;
                line-height: ${lineHeight} !important;
                color: #000000 !important;
                background-color: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
              p, h1, h2, h3, li, tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              p { text-align: justify; margin: 0 0 6pt 0; font-size: ${fontSize} !important; line-height: ${lineHeight} !important; font-family: ${fontFamily}, Arial, sans-serif !important; }
              h1, h2, h3 { text-align: center; font-weight: bold; margin: 12pt 0 6pt 0; font-family: ${fontFamily}, Arial, sans-serif !important; }
              table { width: 100%; border-collapse: collapse; margin: 10pt 0; }
              td, th { border: 1px solid #000000; padding: 5pt; font-size: 10pt !important; }
              b, strong { font-weight: bold !important; }
            </style>
          </head>
          <body>
            <div id="gdocs-export-root">${editorRef.current.innerHTML}</div>
          </body>
        </html>
      `);
      iframeDoc.close();

      await new Promise((resolve) => setTimeout(resolve, 150));
      const targetElement = iframeDoc.getElementById('gdocs-export-root') || iframeDoc.body;

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });

      await doc.html(targetElement as HTMLElement, {
        callback: () => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        },
        x: 0,
        y: 0,
        width: contentWidthPt,
        windowWidth: contentWidthPt,
        margin: [marginPt, marginPt, marginPt, marginPt],
        autoPaging: 'text',
        html2canvas: {
          useCORS: true,
          allowTaint: true,
          scale: 1,
          logging: false,
          onclone: (clonedDoc) => {
            sanitizeClonedDocCss(clonedDoc);
          },
        },
      });

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);

        if (headerText.trim()) {
          doc.text(headerText.trim(), marginPt, 36);
        }

        if (showPageNumbers) {
          doc.text(`Página ${i} de ${totalPages}`, pageWidthPt - marginPt, pageHeightPt - 36, { align: 'right' });
        }
      }

      const pdfBlob = doc.output('blob');
      saveAs(pdfBlob, `${docTitle}_Editado.pdf`);
      setStatusMessage('PDF gerado e baixado com sucesso!');
    } catch (err) {
      console.error('Erro na exportação de PDF:', err);
      setStatusMessage('Erro ao gerar PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDocx = () => {
    if (!editorRef.current) return;
    const htmlString = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: ${fontFamily}, Arial; font-size: ${fontSize}; line-height: ${lineHeight}; margin: 2.54cm; }
            p { margin-bottom: 6pt; text-align: justify; }
          </style>
        </head>
        <body>${editorRef.current.innerHTML}</body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + htmlString], { type: 'application/msword' });
    saveAs(blob, `${docTitle}_Editado.docx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-100 w-full max-w-6xl h-[95vh] rounded-3xl flex flex-col border border-slate-300 shadow-2xl overflow-hidden">
        
        {/* Header Bar - Editor Title & Actions */}
        <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="text-base font-extrabold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-slate-50 px-1 py-0.5 rounded outline-none transition-all"
                placeholder="Título do Documento"
              />
              <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                  <Sparkles className="w-3 h-3 text-emerald-600" /> Padrão A4 (2,54 cm / Arial 11pt)
                </span>
                {statusMessage && <span className="text-blue-600 animate-pulse">{statusMessage}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportDocx}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-300 transition-all flex items-center gap-1.5"
              title="Exportar para formato Word / DOCX"
            >
              <FileDown className="w-4 h-4 text-blue-600" />
              <span>Baixar DOCX</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
              title="Exportar PDF oficial"
            >
              <Printer className="w-4 h-4" />
              <span>{isExporting ? 'Gerando PDF...' : 'Baixar PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar - Editor Controls */}
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center gap-2 text-xs text-slate-700 overflow-x-auto">
          {/* Font Family Select */}
          <select
            value={fontFamily}
            onChange={(e) => {
              setFontFamily(e.target.value);
              execCommand('fontName', e.target.value);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-semibold text-xs outline-none cursor-pointer hover:border-slate-400"
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Trebuchet MS">Trebuchet MS</option>
          </select>

          {/* Font Size Select */}
          <select
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-semibold text-xs outline-none cursor-pointer hover:border-slate-400"
          >
            <option value="9pt">9 pt</option>
            <option value="10pt">10 pt</option>
            <option value="11pt">11 pt (Padrão)</option>
            <option value="12pt">12 pt (Título)</option>
            <option value="14pt">14 pt</option>
            <option value="18pt">18 pt</option>
            <option value="24pt">24 pt</option>
          </select>

          <div className="h-5 w-[1px] bg-slate-300 mx-1" />

          {/* Style Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => execCommand('bold')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 font-bold"
              title="Negrito (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => execCommand('italic')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300"
              title="Itálico (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => execCommand('underline')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300"
              title="Sublinhado (Ctrl+U)"
            >
              <Underline className="w-4 h-4" />
            </button>
          </div>

          <div className="h-5 w-[1px] bg-slate-300 mx-1" />

          {/* Alignment Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => execCommand('justifyLeft')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 border border-slate-300"
              title="Alinhar à Esquerda"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => execCommand('justifyCenter')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 border border-slate-300"
              title="Centralizar"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              onClick={() => execCommand('justifyRight')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 border border-slate-300"
              title="Alinhar à Direita"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => execCommand('justifyFull')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 border border-slate-300"
              title="Justificado"
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>

          <div className="h-5 w-[1px] bg-slate-300 mx-1" />

          {/* Line Height Control */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-500 font-medium">Entre linhas:</span>
            <select
              value={lineHeight}
              onChange={(e) => setLineHeight(e.target.value)}
              className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-xs outline-none cursor-pointer"
            >
              <option value="1.0">1.0 (Simples)</option>
              <option value="1.15">1.15</option>
              <option value="1.28">1.28 (Padrão)</option>
              <option value="1.5">1.5</option>
              <option value="2.0">2.0 (Duplo)</option>
            </select>
          </div>

          <div className="h-5 w-[1px] bg-slate-300 mx-1" />

          {/* Page Number & Header Toggles */}
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700 font-medium select-none">
              <input
                type="checkbox"
                checked={showPageNumbers}
                onChange={(e) => setShowPageNumbers(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Numeração "Página X de Y"</span>
            </label>

            <input
              type="text"
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder="Cabeçalho opcional..."
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs outline-none w-44 hover:border-slate-400 focus:border-blue-500"
            />
          </div>

        </div>

        {/* Workspace Canvas - A4 Sheet Simulation */}
        <div className="flex-1 bg-slate-300/70 p-4 sm:p-8 overflow-y-auto flex flex-col items-center">
          
          {/* Visual Ruler Bar */}
          <div className="w-full max-w-[794px] mb-2 bg-white/80 border border-slate-300 rounded-lg px-6 py-1 flex items-center justify-between text-[10px] text-slate-500 font-mono shadow-xs select-none">
            <div className="flex items-center gap-1 text-slate-700 font-bold">
              <Ruler className="w-3.5 h-3.5 text-blue-600" />
              <span>Margem 2,54 cm (72pt)</span>
            </div>
            <span>[ ◀ ------- Área Útil 16,02 cm (451.28 pt) ------- ▶ ]</span>
            <span>Margem 2,54 cm (72pt)</span>
          </div>

          {/* A4 Sheet Paper */}
          <div className="w-full max-w-[794px] min-h-[1123px] bg-white rounded-md border border-slate-300 shadow-2xl p-[72px] relative transition-all">
            
            {/* Optional Header Render */}
            {headerText && (
              <div className="absolute top-[28px] left-[72px] right-[72px] border-b border-slate-200 pb-1 text-xs text-slate-400 font-sans truncate">
                {headerText}
              </div>
            )}

            {/* Editable Content Workspace */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: contentHtml }}
              className="w-full min-h-[950px] outline-none text-slate-900 text-justify"
              style={{
                fontFamily: `${fontFamily}, Arial, sans-serif`,
                fontSize: fontSize,
                lineHeight: lineHeight,
              }}
            />

            {/* Optional Footer Page Number Render */}
            {showPageNumbers && (
              <div className="absolute bottom-[28px] right-[72px] text-xs text-slate-400 font-sans select-none">
                Página 1 de 1 (Pré-visualização)
              </div>
            )}

          </div>

        </div>

        {/* Footer info bar */}
        <div className="bg-white px-6 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Folha A4 (210 x 297 mm) • Margens normais de 2,54 cm (1 polegada)</span>
          </div>
          <div>
            <span>100% Processamento Local (Zero Upload)</span>
          </div>
        </div>

      </div>
    </div>
  );
};
