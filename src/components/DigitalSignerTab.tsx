import React, { useState, useRef } from 'react';
import { FileCheck, ShieldCheck, Key, Download, Cpu, AlertCircle, FileText, CheckCircle2, Lock, Edit3, FormInput } from 'lucide-react';
import { inspectPdfSignatures, signPdfLocally, acroFormService, type SignatureDetails, type StampPositionType, type FormFieldInfo } from '../services';

export const DigitalSignerTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'signer' | 'acroform'>('signer');

  // Signer State
  const [file, setFile] = useState<File | null>(null);
  const [signatureInfo, setSignatureInfo] = useState<SignatureDetails | null>(null);
  const [signerName, setSignerName] = useState('Dr. Davi Diniz');
  const [cpfCnpj, setCpfCnpj] = useState('123.456.789-00');
  const [reason, setReason] = useState('Conformidade e Autenticação Jurídica / PJe');
  const [stampPosition, setStampPosition] = useState<StampPositionType>('auto');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [signedBlobUrl, setSignedBlobUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AcroForm State
  const [formFile, setFormFile] = useState<File | null>(null);
  const [detectedFields, setDetectedFields] = useState<FormFieldInfo[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>({});
  const [flattenForm, setFlattenForm] = useState(true);
  const [isFillingForm, setIsFillingForm] = useState(false);
  const [formStatusMessage, setFormStatusMessage] = useState('');
  const [filledBlobUrl, setFilledBlobUrl] = useState<string | null>(null);
  const formFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setSignedBlobUrl(null);

      const details = await inspectPdfSignatures(selectedFile);
      setSignatureInfo(details);
    }
  };

  const handleSign = async () => {
    if (!file) return;
    setIsProcessing(true);
    setStatusMessage('Iniciando assinador digital PAdES...');

    try {
      const { blob } = await signPdfLocally(
        file,
        { signerName, cpfCnpj, reason, stampPosition },
        (percent, status) => setStatusMessage(`[${percent}%] ${status}`)
      );

      const url = URL.createObjectURL(blob);
      setSignedBlobUrl(url);
    } catch (err) {
      console.error('Erro na assinatura:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFormFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFormFile(selectedFile);
      setFilledBlobUrl(null);
      setFormStatusMessage('Inspecionando campos de formulário no PDF...');

      try {
        const { fields } = await acroFormService.inspectPdfFormFields(selectedFile);
        setDetectedFields(fields);

        const initialValues: Record<string, string | boolean> = {};
        fields.forEach((f) => {
          initialValues[f.name] = f.value;
        });
        setFormValues(initialValues);
        setFormStatusMessage(
          fields.length > 0
            ? `${fields.length} campo(s) de formulário interativo(s) localizado(s)!`
            : 'Nenhum campo de formulário interativo pré-existente encontrado. Você pode preencher metadados.'
        );
      } catch (err) {
        console.error('Erro ao inspecionar formulário:', err);
      }
    }
  };

  const handleFillForm = async () => {
    if (!formFile) return;
    setIsFillingForm(true);

    try {
      const { blob } = await acroFormService.fillAndSavePdfForm(
        formFile,
        formValues,
        flattenForm,
        (percent, status) => setFormStatusMessage(`[${percent}%] ${status}`)
      );

      const url = URL.createObjectURL(blob);
      setFilledBlobUrl(url);
    } catch (err) {
      console.error('Erro ao preencher formulário:', err);
    } finally {
      setIsFillingForm(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 relative overflow-hidden">
        <div className="flex items-start justify-between relative z-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold mb-3">
              <ShieldCheck className="w-4 h-4" />
              PAdES / ICP-Brasil • Formulários AcroForms • Trilha de Auditoria Criptográfica
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              Assinador Digital & Formulários Interativos
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              Assine digitalmente PDFs com carimbo PAdES e integridade SHA-256 ou preencha formulários interativos (AcroForms) 100% localmente sem expor dados.
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Lock className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('signer')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'signer'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Assinador PAdES & Carimbo ICP-Brasil
        </button>

        <button
          onClick={() => setActiveSubTab('acroform')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'acroform'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FormInput className="w-4 h-4" />
          Preenchedor de Formulários PDF (AcroForms)
        </button>
      </div>

      {/* Mode 1: Digital Signer PAdES */}
      {activeSubTab === 'signer' && (
        <>
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-900/40 hover:bg-slate-900/60 rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-4 group-hover:scale-110 transition-transform">
                <FileCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Selecione ou arraste o arquivo PDF para assinar</h3>
              <p className="text-xs text-slate-400">Validação instantânea de assinaturas e carimbo PAdES com selo de autenticidade</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* File & Inspection Summary Column */}
              <div className="md:col-span-1 glass-panel p-5 rounded-2xl space-y-4">
                <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
                  <FileText className="w-8 h-8 text-indigo-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white truncate">{file.name}</h4>
                    <span className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block mb-1">Status da Assinatura no Arquivo:</span>
                  {signatureInfo?.hasSignature ? (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        Assinatura Existente Válida!
                      </div>
                      <p><strong>Assinante:</strong> {signatureInfo.signerName}</p>
                      <p><strong>Emissor:</strong> {signatureInfo.issuer}</p>
                      <p><strong>Data:</strong> {signatureInfo.signedAt}</p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Arquivo ainda sem assinatura digital gravada.</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { setFile(null); setSignedBlobUrl(null); }}
                  className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-800 transition-colors"
                >
                  Trocar de Arquivo PDF
                </button>
              </div>

              {/* Signer Options & Execution Column */}
              <div className="md:col-span-2 glass-panel p-6 rounded-2xl space-y-5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-400" />
                  Configurações de Assinatura PAdES & Trilha de Auditoria
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Nome do Assinante / Razão Social:</label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">CPF ou CNPJ do Certificado:</label>
                    <input
                      type="text"
                      value={cpfCnpj}
                      onChange={(e) => setCpfCnpj(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Posição do Carimbo Visual PAdES:</label>
                    <select
                      value={stampPosition}
                      onChange={(e) => setStampPosition(e.target.value as StampPositionType)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 outline-none font-semibold text-emerald-300"
                    >
                      <option value="auto">✨ Automático Jurídico Anti-Sobreposição (Página Dedicada - 0% Colisão)</option>
                      <option value="dedicated_page">Página Dedicada: Termo de Encerramento e Assinatura Digital</option>
                      <option value="bottom_last_page">Rodapé da Última Página</option>
                      <option value="top_last_page">Cabeçalho da Última Página</option>
                      <option value="bottom_all_pages">Rodapé de TODAS as Páginas</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Motivo / Declaração Jurídica:</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {isProcessing && (
                  <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/40 flex items-center space-x-3 text-indigo-300 text-xs animate-pulse">
                    <Cpu className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>{statusMessage}</span>
                  </div>
                )}

                {!signedBlobUrl ? (
                  <button
                    onClick={handleSign}
                    disabled={isProcessing}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-indigo-950 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <FileCheck className="w-4 h-4" />
                    Assinar PDF Localmente com Carimbo PAdES
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                      PDF Assinado com Trilha de Auditoria Gravada na Memória RAM!
                    </div>
                    <a
                      href={signedBlobUrl}
                      download={`${file.name.replace(/\.pdf$/i, '')}_assinado.pdf`}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition-all block text-center"
                    >
                      <Download className="w-4 h-4" />
                      Baixar Documento PDF Assinado (.pdf)
                    </a>
                  </div>
                )}

              </div>

            </div>
          )}
        </>
      )}

      {/* Mode 2: Interactive AcroForms Filler */}
      {activeSubTab === 'acroform' && (
        <div className="space-y-6">
          {!formFile ? (
            <div
              onClick={() => formFileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-900/40 hover:bg-slate-900/60 rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 group"
            >
              <input
                ref={formFileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFormFileSelect}
              />
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-4 group-hover:scale-110 transition-transform">
                <FormInput className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Selecione o PDF com Formulário Interativo</h3>
              <p className="text-xs text-slate-400">Detecção automática de campos de texto, checkboxes e menus suspensos</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Form File Column */}
              <div className="md:col-span-1 glass-panel p-5 rounded-2xl space-y-4">
                <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
                  <FileText className="w-8 h-8 text-indigo-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white truncate">{formFile.name}</h4>
                    <span className="text-xs text-slate-400">{(formFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <p className="font-bold text-indigo-400">{formStatusMessage}</p>
                  <p className="text-[10px] text-slate-400">Total de campos detectados: {detectedFields.length}</p>
                </div>

                <div className="pt-2 space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flattenForm}
                      onChange={(e) => setFlattenForm(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                    />
                    <span>Achatar formulário (Flatten) ao salvar</span>
                  </label>
                  <p className="text-[10px] text-slate-500">Impede a edição posterior dos dados preenchidos no PDF.</p>
                </div>

                <button
                  onClick={() => { setFormFile(null); setFilledBlobUrl(null); }}
                  className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-800 transition-colors"
                >
                  Trocar de PDF
                </button>
              </div>

              {/* Interactive Dynamic Form Column */}
              <div className="md:col-span-2 glass-panel p-6 rounded-2xl space-y-5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-indigo-400" />
                  Preenchimento dos Campos de Formulário
                </h3>

                {detectedFields.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                    <p className="text-xs text-slate-300 font-bold">Nenhum campo interativo de AcroForm foi encontrado neste arquivo.</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Se este for um formulário escaneado, utilize a aba de IA Local ou Redação para aplicar carimbos e textos sobre o PDF.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                    {detectedFields.map((field, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                        <label className="text-xs font-bold text-indigo-300 block font-mono">{field.name}:</label>

                        {field.type === 'checkbox' ? (
                          <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={Boolean(formValues[field.name])}
                              onChange={(e) => setFormValues((prev) => ({ ...prev, [field.name]: e.target.checked }))}
                              className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                            />
                            <span>Marcar caixa de seleção</span>
                          </label>
                        ) : field.type === 'dropdown' && field.options && field.options.length > 0 ? (
                          <select
                            value={String(formValues[field.name] || '')}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs outline-none"
                          >
                            <option value="">Selecione uma opção...</option>
                            {field.options.map((opt, oIdx) => (
                              <option key={oIdx} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={String(formValues[field.name] || '')}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs outline-none"
                            placeholder="Preencha o valor..."
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isFillingForm && (
                  <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/40 flex items-center space-x-3 text-indigo-300 text-xs animate-pulse">
                    <Cpu className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>{formStatusMessage}</span>
                  </div>
                )}

                {detectedFields.length > 0 && (!filledBlobUrl ? (
                  <button
                    onClick={handleFillForm}
                    disabled={isFillingForm}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-950 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    Preencher e Gerar PDF Modificado
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                      Formulário Preenchido e Salvo na Memória RAM!
                    </div>
                    <a
                      href={filledBlobUrl}
                      download={`${formFile.name.replace(/\.pdf$/i, '')}_preenchido.pdf`}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition-all block text-center"
                    >
                      <Download className="w-4 h-4" />
                      Baixar PDF Preenchido (.pdf)
                    </a>
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
