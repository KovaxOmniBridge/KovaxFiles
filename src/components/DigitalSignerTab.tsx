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
      <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start justify-between relative z-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold mb-3">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              PAdES / ICP-Brasil • Formulários AcroForms • Trilha de Auditoria Criptográfica
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              Assinador Digital & Formulários Interativos
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Assine digitalmente PDFs com carimbo PAdES e integridade SHA-256 ou preencha formulários interativos (AcroForms) 100% localmente sem expor dados.
            </p>
          </div>
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <Lock className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab('signer')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'signer'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Assinador PAdES & Carimbo ICP-Brasil
        </button>

        <button
          onClick={() => setActiveSubTab('acroform')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'acroform'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-slate-50 rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-300 group shadow-xs"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                <FileCheck className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mb-1">Selecione ou arraste o arquivo PDF para assinar</h3>
              <p className="text-xs text-slate-500">Validação instantânea de assinaturas e carimbo PAdES com selo de autenticidade</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* File & Inspection Summary Column */}
              <div className="md:col-span-1 bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
                  <FileText className="w-8 h-8 text-blue-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{file.name}</h4>
                    <span className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500 block mb-1">Status da Assinatura no Arquivo:</span>
                  {signatureInfo?.hasSignature ? (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Assinatura Existente Válida!
                      </div>
                      <p><strong>Assinante:</strong> {signatureInfo.signerName}</p>
                      <p><strong>Emissor:</strong> {signatureInfo.issuer}</p>
                      <p><strong>Data:</strong> {signatureInfo.signedAt}</p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Arquivo ainda sem assinatura digital gravada.</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { setFile(null); setSignedBlobUrl(null); }}
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                >
                  Trocar de Arquivo PDF
                </button>
              </div>

              {/* Signer Options & Execution Column */}
              <div className="md:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl space-y-5 shadow-xs">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-blue-600" />
                  Configurações de Assinatura PAdES & Trilha de Auditoria
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-600 block mb-1 font-semibold">Nome do Assinante / Razão Social:</label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 block mb-1 font-semibold">CPF ou CNPJ do Certificado:</label>
                    <input
                      type="text"
                      value={cpfCnpj}
                      onChange={(e) => setCpfCnpj(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-600 block mb-1 font-semibold">Posição do Carimbo Visual PAdES:</label>
                    <select
                      value={stampPosition}
                      onChange={(e) => setStampPosition(e.target.value as StampPositionType)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:border-blue-500 outline-none font-semibold text-blue-700"
                    >
                      <option value="auto">✨ Automático Jurídico Anti-Sobreposição (Página Dedicada - 0% Colisão)</option>
                      <option value="dedicated_page">Página Dedicada: Termo de Encerramento e Assinatura Digital</option>
                      <option value="bottom_last_page">Rodapé da Última Página</option>
                      <option value="top_last_page">Cabeçalho da Última Página</option>
                      <option value="bottom_all_pages">Rodapé de TODAS as Páginas</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-600 block mb-1 font-semibold">Motivo / Declaração Jurídica:</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {isProcessing && (
                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center space-x-3 text-blue-800 text-xs animate-pulse">
                    <Cpu className="w-4 h-4 animate-spin text-blue-600" />
                    <span>{statusMessage}</span>
                  </div>
                )}

                {!signedBlobUrl ? (
                  <button
                    onClick={handleSign}
                    disabled={isProcessing}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <FileCheck className="w-4 h-4" />
                    Assinar PDF Localmente com Carimbo PAdES
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      PDF Assinado com Trilha de Auditoria Gravada na Memória RAM!
                    </div>
                    <a
                      href={signedBlobUrl}
                      download={`${file.name.replace(/\.pdf$/i, '')}_assinado.pdf`}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all block text-center"
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
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-slate-50 rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-300 group shadow-xs"
            >
              <input
                ref={formFileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFormFileSelect}
              />
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                <FormInput className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mb-1">Selecione o PDF com Formulário Interativo</h3>
              <p className="text-xs text-slate-500">Detecção automática de campos de texto, checkboxes e menus suspensos</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Form File Column */}
              <div className="md:col-span-1 bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
                  <FileText className="w-8 h-8 text-blue-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{formFile.name}</h4>
                    <span className="text-xs text-slate-500">{(formFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-slate-700 space-y-1">
                  <p className="font-bold text-blue-800">{formStatusMessage}</p>
                  <p className="text-[10px] text-slate-500">Total de campos detectados: {detectedFields.length}</p>
                </div>

                <div className="pt-2 space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flattenForm}
                      onChange={(e) => setFlattenForm(e.target.checked)}
                      className="rounded bg-white border-slate-300 text-blue-600 focus:ring-0"
                    />
                    <span className="font-semibold">Achatar formulário (Flatten) ao salvar</span>
                  </label>
                  <p className="text-[10px] text-slate-500">Impede a edição posterior dos dados preenchidos no PDF.</p>
                </div>

                <button
                  onClick={() => { setFormFile(null); setFilledBlobUrl(null); }}
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                >
                  Trocar de PDF
                </button>
              </div>

              {/* Interactive Dynamic Form Column */}
              <div className="md:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl space-y-5 shadow-xs">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-600" />
                  Preenchimento dos Campos de Formulário
                </h3>

                {detectedFields.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                    <p className="text-xs text-slate-900 font-bold">Nenhum campo interativo de AcroForm foi encontrado neste arquivo.</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Se este for um formulário escaneado, utilize a aba de IA Local ou Redação para aplicar carimbos e textos sobre o PDF.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                    {detectedFields.map((field, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <label className="text-xs font-bold text-blue-800 block font-mono">{field.name}:</label>

                        {field.type === 'checkbox' ? (
                          <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={Boolean(formValues[field.name])}
                              onChange={(e) => setFormValues((prev) => ({ ...prev, [field.name]: e.target.checked }))}
                              className="rounded bg-white border-slate-300 text-blue-600"
                            />
                            <span>Marcar caixa de seleção</span>
                          </label>
                        ) : field.type === 'dropdown' && field.options && field.options.length > 0 ? (
                          <select
                            value={String(formValues[field.name] || '')}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none"
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
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none"
                            placeholder="Preencha o valor..."
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isFillingForm && (
                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center space-x-3 text-blue-800 text-xs animate-pulse">
                    <Cpu className="w-4 h-4 animate-spin text-blue-600" />
                    <span>{formStatusMessage}</span>
                  </div>
                )}

                {detectedFields.length > 0 && (!filledBlobUrl ? (
                  <button
                    onClick={handleFillForm}
                    disabled={isFillingForm}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    Preencher e Gerar PDF Modificado
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      Formulário Preenchido e Salvo na Memória RAM!
                    </div>
                    <a
                      href={filledBlobUrl}
                      download={`${formFile.name.replace(/\.pdf$/i, '')}_preenchido.pdf`}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all block text-center"
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
