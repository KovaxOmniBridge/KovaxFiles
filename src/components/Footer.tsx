import React from 'react';
import { ShieldCheck, Code2, Cpu, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200 bg-white mt-16 py-10">
      <div className="w-[96vw] max-w-[96vw] mx-auto px-2 sm:px-4 lg:px-6">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-8 pb-8 border-b border-slate-100">
          
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center space-x-2 mb-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <h4 className="text-sm font-bold text-slate-900">Privacidade e Segurança Absoluta</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Nenhum arquivo enviado sai do seu computador. Todas as conversões e compactações acontecem 100% no seu navegador através de JavaScript e WebAssembly local.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center space-x-2 mb-2.5">
              <Cpu className="w-5 h-5 text-blue-600 shrink-0" />
              <h4 className="text-sm font-bold text-slate-900">Web Workers Multi-Core</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Aproveita ao máximo a capacidade do seu processador local para converter até 50 arquivos simultaneamente sem travar a tela ou causar lentidão.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center space-x-2 mb-2.5">
              <Code2 className="w-5 h-5 text-indigo-600 shrink-0" />
              <h4 className="text-sm font-bold text-slate-900">Hospedado no GitHub Pages</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Aplicação estática completa. Sem dependência de APIs pagas ou servidores externos. Funciona perfeitamente em qualquer servidor web estático.
            </p>
          </div>

        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center space-x-2 text-center sm:text-left">
            <span>© 2026 Kovax Files. Criado para Peticionamento Eletrônico & Conversões Rápidas.</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
              <Lock className="w-3.5 h-3.5 text-emerald-600" /> 100% Client-Side
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};
