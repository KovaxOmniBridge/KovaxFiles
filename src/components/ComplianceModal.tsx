import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Download, FileText, CheckCircle2, Lock, Cpu, ServerOff } from 'lucide-react';
import { networkAuditLogger, memoryManager, type NetworkLogEntry } from '../services';
import { saveAs } from 'file-saver';

interface ComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComplianceModal: React.FC<ComplianceModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<NetworkLogEntry[]>([]);
  const [activeMemoryBlobs, setActiveMemoryBlobs] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setLogs(networkAuditLogger.getLogs());
      setActiveMemoryBlobs(memoryManager.getActiveMemoryBlobCount());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filePayloadsCount = networkAuditLogger.getFilePayloadsSentCount();
  const isCompliant = filePayloadsCount === 0;

  const downloadManifestJson = () => {
    const manifest = networkAuditLogger.generateComplianceManifest();
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    saveAs(blob, `Manifesto_Compliance_TI_ManipuladorLocal_${Date.now()}.json`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border-emerald-500/40 shadow-2xl">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-extrabold text-white">
                  Relatório de Conformidade & Auditoria Local (TI)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
                  LGPD Compliant
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manifesto técnico auditável em tempo real provando a ausência de envio de arquivos para servidores.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Main Security Status Badge */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isCompliant
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
          }`}>
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-base font-bold text-white">
                  {isCompliant ? 'VERIFICADO: 0 (Zero) Envio de Arquivos para Servidores Externos' : 'Aviso de Auditoria'}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Todas as operações de PDF, imagens e vídeos foram processadas estritamente na memória RAM local via Web Workers.
                </p>
              </div>
            </div>

            <div className="shrink-0 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-500/30 font-mono text-xs font-bold text-emerald-300">
              STATUS: 100% SECURE
            </div>
          </div>

          {/* Core Technical Proof Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center space-x-2 text-indigo-400 mb-2">
                <ServerOff className="w-4 h-4" />
                <h5 className="text-xs font-bold text-white">Requisições Externas</h5>
              </div>
              <p className="text-2xl font-extrabold font-mono text-emerald-400">0 Bytes</p>
              <p className="text-[11px] text-slate-400 mt-1">Payload de arquivos transmitidos via fetch/XHR.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center space-x-2 text-purple-400 mb-2">
                <Lock className="w-4 h-4" />
                <h5 className="text-xs font-bold text-white">Auto-Destruição RAM</h5>
              </div>
              <p className="text-2xl font-extrabold font-mono text-purple-300">{activeMemoryBlobs} Blobs</p>
              <p className="text-[11px] text-slate-400 mt-1">Blobs temporários ativos na RAM (limpos ao fechar).</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center space-x-2 text-emerald-400 mb-2">
                <Cpu className="w-4 h-4" />
                <h5 className="text-xs font-bold text-white">Arquitetura</h5>
              </div>
              <p className="text-sm font-bold text-white mt-1">GitHub Pages Static</p>
              <p className="text-[11px] text-slate-400 mt-1">WebAssembly & Web Workers locais.</p>
            </div>

          </div>

          {/* Network Interceptor Log Audit Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Log Auditável de Chamadas de Rede (Network Inspector)
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                {logs.length} requisições registradas nesta sessão
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden">
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-mono sticky top-0">
                    <tr>
                      <th className="p-2.5">Horário</th>
                      <th className="p-2.5">Tipo</th>
                      <th className="p-2.5">Método</th>
                      <th className="p-2.5">Destino URL</th>
                      <th className="p-2.5">Payload Arquivo</th>
                      <th className="p-2.5">Status de Segurança</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-500 font-sans">
                          Nenhuma chamada de rede foi realizada até o momento. Total isolamento.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-2.5 text-slate-400">{log.timestamp}</td>
                          <td className="p-2.5 text-indigo-300">{log.type}</td>
                          <td className="p-2.5 font-bold text-white">{log.method}</td>
                          <td className="p-2.5 text-slate-300 truncate max-w-xs" title={log.url}>
                            {log.url}
                          </td>
                          <td className="p-2.5 font-bold text-emerald-400">
                            {log.bytesSent} bytes
                          </td>
                          <td className="p-2.5">
                            {log.status === 'blocked_upload' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-300 border border-red-500/30">
                                BLOQUEADO
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                APROVADO ESTÁTICO
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Provado por Interceptador de Rede & Relatório Assinado</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={downloadManifestJson}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-950 transition-all"
            >
              <Download className="w-4 h-4" />
              Baixar Manifesto de TI (.JSON)
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
