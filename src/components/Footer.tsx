import React from 'react';
import { ShieldCheck, Code2, Cpu, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md mt-20 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-slate-800/60">
          
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">Privacidade e Segurança Absoluta</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nenhum arquivo enviado sai do seu computador. Todas as conversões e compactações acontecem 100% no seu navegador através de JavaScript e WebAssembly local.
            </p>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <h4 className="text-sm font-bold text-white">Web Workers Multi-Core</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Aproveita ao máximo a capacidade do seu processador local para converter até 50 arquivos simultaneamente sem travar a tela ou causar lentidão.
            </p>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Code2 className="w-5 h-5 text-purple-400" />
              <h4 className="text-sm font-bold text-white">Hospedado no GitHub Pages</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Aplicação estática completa. Sem dependência de APIs pagas ou servidores externos. Funciona perfeitamente em qualquer servidor web estático.
            </p>
          </div>

        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span>© 2026 ManipuladorLocal. Criado para Peticionamento Eletrônico & Conversões Rápidas.</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1 text-slate-400">
              <Lock className="w-3.5 h-3.5 text-emerald-400" /> 100% Client-Side
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};
