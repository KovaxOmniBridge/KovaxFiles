import React, { useState } from 'react';
import {
  Award,
  FileCheck2,
  FileSignature,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FolderArchive,
  Eye,
  EyeOff,
  UserCheck,
  Calendar,
  Lock,
  Search,
  ExternalLink,
  Printer
} from 'lucide-react';

import {
  PadesSignatureService,
  Pkcs12CertificateInfo,
  PadesSignatureValidationResult,
  PadesSignOptions
} from '../../services/padesSignatureService';

export const DigitalSignatureTool: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sign' | 'verify'>('sign');

  // ==========================================
  // ESTADOS DA ABA 1: ASSINADOR PAdES
  // ==========================================
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [isLoadingCert, setIsLoadingCert] = useState<boolean>(false);
  const [certInfo, setCertInfo] = useState<Pkcs12CertificateInfo | null>(null);
  const [certError, setCertError] = useState<string | null>(null);

  const [signatureReason, setSignatureReason] = useState<string>('Petição subscrita por Procurador Constituído');
  const [signatureLocation, setSignatureLocation] = useState<string>('Comarca do Foro Judicial');
  const [enableVisualStamp, setEnableVisualStamp] = useState<boolean>(true);
  const [stampPosition, setStampPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right'>('bottom-right');

  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [signedPdfResult, setSignedPdfResult] = useState<{
    fileName: string;
    data: Uint8Array;
    hashSha256: string;
    timestamp: string;
  } | null>(null);

  // ==========================================
  // ESTADOS DA ABA 2: VALIDADOR PAdES
  // ==========================================
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<PadesSignatureValidationResult | null>(null);

  // ==========================================
  // FUNÇÕES DO ASSINADOR
  // ==========================================
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setSignError('Por favor selecione um arquivo em formato PDF.');
        return;
      }
      setPdfFile(file);
      setSignedPdfResult(null);
      setSignError(null);
    }
  };

  const handleCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCertFile(file);
      setCertInfo(null);
      setCertError(null);
    }
  };

  const handleInspectCertificate = async () => {
    if (!certFile) {
      setCertError('Selecione o arquivo de certificado digital (.pfx ou .p12).');
      return;
    }
    if (!certPassword) {
      setCertError('Digite a senha de proteção do certificado digital.');
      return;
    }

    setIsLoadingCert(true);
    setCertError(null);

    try {
      const buffer = await certFile.arrayBuffer();
      const { certInfo: info } = PadesSignatureService.parseCertificate(buffer, certPassword);
      setCertInfo(info);
    } catch (err: any) {
      setCertInfo(null);
      setCertError(err.message || 'Falha ao autenticar certificado. Verifique a senha informada.');
    } finally {
      setIsLoadingCert(false);
    }
  };

  const handleExecuteSign = async () => {
    if (!pdfFile) {
      setSignError('Selecione o documento PDF a ser assinado.');
      return;
    }
    if (!certFile) {
      setSignError('Selecione o seu certificado digital A1 (.pfx ou .p12).');
      return;
    }
    if (!certPassword) {
      setSignError('Digite a senha do certificado digital.');
      return;
    }

    setIsSigning(true);
    setSignError(null);

    try {
      const pdfBuffer = await pdfFile.arrayBuffer();
      const certBuffer = await certFile.arrayBuffer();

      const options: PadesSignOptions = {
        reason: signatureReason,
        location: signatureLocation,
        visualAppearance: {
          enabled: enableVisualStamp,
          position: stampPosition
        }
      };

      const signedBytes = await PadesSignatureService.signPdf(pdfBuffer, certBuffer, certPassword, options);

      // Calcular hash SHA-256 do documento gerado
      const hashBuffer = await crypto.subtle.digest('SHA-256', signedBytes.buffer as ArrayBuffer);
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      const baseName = pdfFile.name.replace(/\.[^/.]+$/, '');
      setSignedPdfResult({
        fileName: `${baseName}_assinado_pades.pdf`,
        data: signedBytes,
        hashSha256: hashHex,
        timestamp: new Date().toLocaleString('pt-BR')
      });
    } catch (err: any) {
      setSignError(`Falha ao assinar documento: ${err.message || String(err)}`);
    } finally {
      setIsSigning(false);
    }
  };

  const handleDownloadSignedPdf = () => {
    if (!signedPdfResult) return;
    const blob = new Blob([signedPdfResult.data as unknown as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = signedPdfResult.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ==========================================
  // FUNÇÕES DO VALIDADOR
  // ==========================================
  const handleVerifyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setVerifyError('Por favor selecione um arquivo PDF.');
        return;
      }
      setVerifyFile(file);
      setValidationResult(null);
      setVerifyError(null);
    }
  };

  const handleExecuteVerify = async () => {
    if (!verifyFile) {
      setVerifyError('Selecione um arquivo PDF para auditar.');
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const buffer = await verifyFile.arrayBuffer();
      const result = PadesSignatureService.verifyPdf(buffer);
      setValidationResult(result);
    } catch (err: any) {
      setVerifyError(`Erro na validação do documento: ${err.message || String(err)}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExportValidationReport = () => {
    if (!validationResult || !verifyFile) return;

    const reportObj = {
      titulo: 'Laudo de Auditoria Criptográfica PAdES (Kovax Desktop)',
      arquivoAuditado: verifyFile.name,
      tamanhoBytes: verifyFile.size,
      dataAuditoria: new Date().toISOString(),
      resumo: validationResult.summaryText,
      totalAssinaturas: validationResult.signatureCount,
      plenamenteIntegro: validationResult.allValid,
      assinaturas: validationResult.signatures
    };

    const blob = new Blob([JSON.stringify(reportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laudo_criptografico_${verifyFile.name.replace(/\.[^/.]+$/, '')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full w-full space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-600/20 via-indigo-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl">
              <Award className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-100">Assinador & Validador Digital PAdES</h1>
                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">
                  Padrão ISO 32000 / ICP-Brasil
                </span>
                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  100% Offline
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Assinatura digital qualificada com certificado X.509 A1 (.pfx/.p12), contêiner PKCS#7 destacado e verificação matemática rigorosa contra adulteração.
              </p>
            </div>
          </div>

          {/* TOGGLE ENTRE AS DUAS ABAS */}
          <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('sign')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'sign'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileSignature className="w-3.5 h-3.5" />
              1. Assinar com Certificado A1
            </button>
            <button
              onClick={() => setActiveTab('verify')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'verify'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              2. Auditar / Validar PAdES
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ABA 1: ASSINADOR DIGITAL PAdES COM CERTIFICADO A1          */}
      {/* ========================================================= */}
      {activeTab === 'sign' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* PAINEL ESQUERDO: UPLOADS & CONFIGURAÇÃO */}
          <div className="lg:col-span-7 space-y-5">
            {/* ETAPA 1: DOCUMENTO PDF */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  Passo 1: Selecionar Petição ou Documento PDF
                </label>
                {pdfFile && (
                  <span className="text-[11px] text-emerald-400 font-medium">
                    {(pdfFile.size / 1024).toFixed(1)} KB selecionado
                  </span>
                )}
              </div>

              <div className="border border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-4 bg-slate-950/50 text-center transition-colors">
                <input
                  type="file"
                  id="pdf-upload"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                  <FileText className="w-7 h-7 text-blue-400" />
                  <span className="text-xs font-medium text-slate-200">
                    {pdfFile ? pdfFile.name : 'Clique para carregar o arquivo PDF que deseja assinar'}
                  </span>
                  <span className="text-[10px] text-slate-500">Documento original nunca é enviado para a nuvem</span>
                </label>
              </div>
            </div>

            {/* ETAPA 2: CERTIFICADO DIGITAL (.PFX / .P12) */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                Passo 2: Certificado Digital A1 (.pfx / .p12) & Senha
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Upload PFX */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Arquivo do Certificado</label>
                  <input
                    type="file"
                    id="cert-upload"
                    accept=".pfx,.p12"
                    onChange={handleCertUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="cert-upload"
                    className="cursor-pointer flex items-center justify-between px-3.5 py-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-200 transition-colors"
                  >
                    <span className="truncate">{certFile ? certFile.name : 'Selecionar .pfx / .p12...'}</span>
                    <KeyRound className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
                  </label>
                </div>

                {/* Senha do Certificado */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">Senha do Certificado (PIN)</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={certPassword}
                      onChange={(e) => setCertPassword(e.target.value)}
                      placeholder="Senha do arquivo .pfx..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Botão de Verificação Prévia do Certificado */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  Descriptografa a chave localmente em memória e checa a vigência
                </span>
                <button
                  onClick={handleInspectCertificate}
                  disabled={isLoadingCert || !certFile || !certPassword}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  {isLoadingCert ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Lendo...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                      Inspecionar Certificado
                    </>
                  )}
                </button>
              </div>

              {certError && (
                <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{certError}</span>
                </div>
              )}
            </div>

            {/* ETAPA 3: OPÇÕES DA ASSINATURA PAdES */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-400" />
                Passo 3: Metadados Jurídicos & Carimbo Visual
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Razão / Finalidade do Ato</label>
                  <input
                    type="text"
                    value={signatureReason}
                    onChange={(e) => setSignatureReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Comarca / Localidade</label>
                  <input
                    type="text"
                    value={signatureLocation}
                    onChange={(e) => setSignatureLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">Apor Chancela Visual na Página Final</span>
                    <span className="text-[10px] text-slate-500">Desenha retângulo com nome, CPF, data e conformidade legal.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableVisualStamp}
                    onChange={(e) => setEnableVisualStamp(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                </label>

                {enableVisualStamp && (
                  <div className="flex items-center gap-3 pl-1">
                    <span className="text-xs text-slate-400">Posicionamento:</span>
                    <div className="flex gap-2">
                      {(['bottom-right', 'bottom-left', 'top-right'] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setStampPosition(pos)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                            stampPosition === pos
                              ? 'bg-blue-600 text-white shadow'
                              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          {pos === 'bottom-right' ? 'Rodapé Direito' : pos === 'bottom-left' ? 'Rodapé Esquerdo' : 'Topo Direito'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {signError && (
                <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{signError}</span>
                </div>
              )}

              {/* BOTÃO ASSINAR */}
              <div className="pt-2">
                <button
                  onClick={handleExecuteSign}
                  disabled={isSigning || !pdfFile || !certFile || !certPassword}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
                >
                  {isSigning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Calculando Hash SHA-256 e Assinando nos Padrões PAdES...
                    </>
                  ) : (
                    <>
                      <FileSignature className="w-4 h-4" />
                      Assinar Documento Digitalmente (PAdES)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* PAINEL DIREITO: CARTÃO DE IDENTIDADE DO CERTIFICADO & RESULTADO */}
          <div className="lg:col-span-5 space-y-5">
            {/* CARTÃO DE IDENTIDADE DO CERTIFICADO DIGITAL */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                Identidade Digital do Certificado
              </h3>

              {certInfo ? (
                <div className="space-y-3 bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Titular / Razão Social</div>
                    <div className="text-xs font-bold text-slate-100">{certInfo.commonName}</div>
                    {certInfo.cpfCnpj && (
                      <div className="text-xs font-mono text-emerald-400 mt-0.5">{certInfo.cpfCnpj}</div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500">Autoridade Emissora</div>
                      <div className="text-[11px] text-slate-300 truncate" title={certInfo.issuer}>{certInfo.issuer}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Status de Vigência</div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        certInfo.isValidTemporal
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {certInfo.isValidTemporal ? '✓ Vigente' : '✕ Expirado'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-1">
                    <div><strong>Válido de:</strong> {certInfo.notBefore.toLocaleDateString('pt-BR')} até {certInfo.notAfter.toLocaleDateString('pt-BR')}</div>
                    <div><strong>Serial:</strong> {certInfo.serialNumber}</div>
                    <div className="truncate"><strong>Fingerprint SHA-256:</strong> <span className="font-mono">{certInfo.fingerprintSha256}</span></div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/50 space-y-2">
                  <KeyRound className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs">Nenhum certificado inspecionado no momento.</p>
                  <p className="text-[10px] text-slate-600">Selecione seu arquivo .pfx e digite a senha para visualizar os atributos.</p>
                </div>
              )}
            </div>

            {/* CARD DE RESULTADO DO PDF ASSINADO */}
            {signedPdfResult && (
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <h4 className="text-sm font-bold">Assinatura PAdES Concluída com Sucesso!</h4>
                </div>

                <div className="space-y-2 text-xs bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-slate-200 font-semibold">{signedPdfResult.fileName}</div>
                  <div className="text-[11px] text-slate-400">
                    Tamanho: {(signedPdfResult.data.length / 1024).toFixed(1)} KB | Data: {signedPdfResult.timestamp}
                  </div>
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">Hash SHA-256 do Documento Assinado:</span>
                    <span className="text-[10px] font-mono text-emerald-400 break-all">{signedPdfResult.hashSha256}</span>
                  </div>
                </div>

                <button
                  onClick={handleDownloadSignedPdf}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <Download className="w-4 h-4" />
                  Baixar PDF Assinado
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 2: VALIDADOR CRIPTOGRÁFICO DE ASSINATURAS PAdES       */}
      {/* ========================================================= */}
      {activeTab === 'verify' && (
        <div className="space-y-6">
          {/* UPLOAD DO DOCUMENTO A AUDITAR */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-400" />
                  Auditoria Forense de Assinaturas Digitais em PDF
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Audita a integridade matemática do ByteRange, a correspondência do hash do documento e a assinatura RSA da chave pública.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="file"
                  id="verify-upload"
                  accept=".pdf"
                  onChange={handleVerifyFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="verify-upload"
                  className="cursor-pointer px-4 py-2 bg-slate-950 border border-slate-700 hover:border-blue-500 rounded-xl text-xs font-semibold text-slate-200 transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-blue-400" />
                  {verifyFile ? verifyFile.name : 'Selecionar PDF Assinado...'}
                </label>

                <button
                  onClick={handleExecuteVerify}
                  disabled={isVerifying || !verifyFile}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Auditando...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Validar Criptograficamente
                    </>
                  )}
                </button>
              </div>
            </div>

            {verifyError && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}
          </div>

          {/* RESULTADOS DA AUDITORIA */}
          {validationResult && (
            <div className="space-y-4">
              {/* BANNER DE STATUS GERAL */}
              <div className={`p-5 rounded-2xl border flex items-start justify-between gap-4 shadow-xl ${
                validationResult.hasSignatures && validationResult.allValid
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                  : validationResult.hasSignatures && !validationResult.allValid
                  ? 'bg-red-950/30 border-red-500/30 text-red-200'
                  : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
              }`}>
                <div className="flex items-start gap-3">
                  {validationResult.hasSignatures && validationResult.allValid ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  ) : validationResult.hasSignatures ? (
                    <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="text-sm font-bold">
                      {validationResult.hasSignatures && validationResult.allValid
                        ? 'Assinaturas Digitais Autênticas e Íntegras'
                        : validationResult.hasSignatures
                        ? 'Assinaturas com Alerta de Invalidação ou Adulteração'
                        : 'Nenhuma Assinatura Digital Detectada'}
                    </h4>
                    <p className="text-xs mt-1 text-slate-300">
                      {validationResult.summaryText}
                    </p>
                  </div>
                </div>

                {validationResult.hasSignatures && (
                  <button
                    onClick={handleExportValidationReport}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 flex items-center gap-1.5 shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exportar Laudo JSON
                  </button>
                )}
              </div>

              {/* LISTA INDIVIDUAL DE ASSINATURAS */}
              {validationResult.signatures.map((sig, idx) => (
                <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-xs font-bold">
                        {sig.index}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">{sig.signerName}</span>
                        {sig.signerCpfCnpj && (
                          <span className="text-[11px] font-mono text-emerald-400">{sig.signerCpfCnpj}</span>
                        )}
                      </div>
                    </div>

                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                      sig.status === 'VALIDA'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : sig.status === 'EXPIRADA'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>
                      {sig.status === 'VALIDA' ? '✓ ASSINATURA ÍNTEGRA' : sig.status === 'EXPIRADA' ? '⚠️ CERTIFICADO EXPIRADO' : '✕ ADULTERADA / INVÁLIDA'}
                    </span>
                  </div>

                  {/* CRITÉRIOS DE AUDITORIA CRIPTOGRÁFICA */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block">Cobertura ByteRange</span>
                      <span className={`font-semibold ${sig.byteRangeCoversEntireFile ? 'text-emerald-400' : 'text-red-400'}`}>
                        {sig.byteRangeCoversEntireFile ? '✓ 100% Coberto' : '✕ Incompleto / Adições'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block">Digest SHA-256</span>
                      <span className={`font-semibold ${sig.digestMatches ? 'text-emerald-400' : 'text-red-400'}`}>
                        {sig.digestMatches ? '✓ Hash Conforme' : '✕ Hash Divergente'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block">Assinatura RSA</span>
                      <span className={`font-semibold ${sig.rsaSignatureValid ? 'text-emerald-400' : 'text-red-400'}`}>
                        {sig.rsaSignatureValid ? '✓ Criptografia Íntegra' : '✕ Falha Criptográfica'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block">Vigência Temporal</span>
                      <span className={`font-semibold ${sig.certValidTemporal ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {sig.certValidTemporal ? '✓ Certificado Vigente' : '⚠️ Fora da Vigência'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                    <div><strong>Autoridade Emissora:</strong> {sig.issuer}</div>
                    <div><strong>SubFiltro:</strong> <span className="font-mono">{sig.subFilter}</span></div>
                    {sig.reason && <div><strong>Motivo Declarado:</strong> {sig.reason}</div>}
                    <div><strong>Parecer Técnico:</strong> {sig.statusDescription}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
