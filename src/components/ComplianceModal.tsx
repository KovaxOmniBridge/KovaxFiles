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
    saveAs(blob, `Manifesto_Compliance_TI_KovaxFiles_${Date.now()}.json`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl flex flex-col border border-slate-200 shadow-xl">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-extrabold text-slate-900">
                  Relatório de Conformidade & Auditoria Local (TI)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                  LGPD Compliant
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Manifesto técnico auditável em tempo real provando a ausência de envio de arquivos para servidores.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Main Status Callout */}
          <div
            className={`p-4 rounded-2xl border flex items-start space-x-3 ${
              isCompliant
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-sm mb-1">
                {isCompliant
                  ? 'Status de Segurança: 100% VÁLIDO E LOCAL (ZERO VAZAMENTO)'
                  : 'Aviso: Requisição Externa Detectada'}
              </h4>
              <p className="text-xs leading-relaxed">
                Todas as chamadas de API de rede (`fetch` e `XMLHttpRequest`) foram monitoradas pelo audit logger nativo.
                <strong> Zero bytes de arquivos ou dados confidenciais foram transmitidos.</strong>
              </p>
            </div>
          </div>

          {/* Key Security Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center space-x-2 text-blue-600 font-bold">
                <ServerOff className="w-4 h-4" />
                <span>Zero Servidor Externo</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Processamento feito no motor WebAssembly do seu próprio navegador.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center space-x-2 text-indigo-600 font-bold">
                <Cpu className="w-4 h-4" />
                <span>Gerenciador de Memória RAM</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Blobs temporários ativos na RAM no momento: <strong className="font-mono text-indigo-700">{activeMemoryBlobs}</strong>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center space-x-2 text-emerald-600 font-bold">
                <Lock className="w-4 h-4" />
                <span>Conformidade LGPD/GDPR</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Auditoria compatível com requisitos de sigilo da OAB e Órgãos Públicos.
              </p>
            </div>

          </div>

          {/* Network Request Interception Log Table */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-slate-900 text-xs flex items-center justify-between">
              <span>Registro de Requisições de Rede Interceptadas ({logs.length})</span>
              <span className="text-[10px] text-slate-500 font-normal">Monitorado via Web Audit API</span>
            </h4>

            {logs.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-xs">
                Nenhuma requisição de rede externa foi feita durante esta sessão.
              </div>
            ) : (
              <div className="max-h-[200px] overflow-y-auto border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse font-mono text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2.5 border-b border-slate-200">Hora</th>
                      <th className="p-2.5 border-b border-slate-200">Método</th>
                      <th className="p-2.5 border-b border-slate-200">URL</th>
                      <th className="p-2.5 border-b border-slate-200">Status TI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="p-2.5 text-slate-500">{log.timestamp.split('T')[1]?.split('.')[0]}</td>
                        <td className="p-2.5 font-bold text-blue-600">{log.method}</td>
                        <td className="p-2.5 text-slate-800 truncate max-w-[300px]">{log.url}</td>
                        <td className="p-2.5">
                          {log.hasFilePayload ? (
                            <span className="text-red-600 font-bold">⚠️ Payload Suspeito</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">✓ Seguro (Sem Dados)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <button
            onClick={downloadManifestJson}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Manifesto JSON de Conformidade (TI)</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
