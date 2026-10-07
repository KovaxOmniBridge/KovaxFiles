import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Cpu, 
  Lock, 
  Calculator, 
  Search, 
  Globe, 
  HelpCircle,
  BookOpen
} from 'lucide-react';

interface PlatformCapabilitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlatformCapabilitiesModal: React.FC<PlatformCapabilitiesModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'capabilities' | 'limitations' | 'tips'>('capabilities');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Capacidades & Limitações da Plataforma
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold px-2 py-0.5 rounded-full">
                  100% Local & Privado
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Transparência completa sobre os pontos fortes e os limites operacionais do KovaxFiles Desktop.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegação por Abas */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('capabilities')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-t border-x ${
              activeTab === 'capabilities'
                ? 'bg-slate-900 border-slate-700 text-emerald-400 border-b-2 border-b-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            O que a IA Faz com Excelência ({'8 Capacidades'})
          </button>

          <button
            onClick={() => setActiveTab('limitations')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-t border-x ${
              activeTab === 'limitations'
                ? 'bg-slate-900 border-slate-700 text-amber-400 border-b-2 border-b-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <XCircle className="w-4 h-4 text-amber-400" />
            Limitações & O que Não Faz ({'5 Escopos'})
          </button>

          <button
            onClick={() => setActiveTab('tips')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-t border-x ${
              activeTab === 'tips'
                ? 'bg-slate-900 border-slate-700 text-blue-400 border-b-2 border-b-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            Guia de Uso & Boas Práticas
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">

          {/* ABA 1: CAPACIDADES REAIS */}
          {activeTab === 'capabilities' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Lock className="w-4 h-4" />
                  100% Offline & Privacidade LGPD
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Todos os arquivos e dados de chat são processados localmente na sua máquina (porta 18888). Nenhum byte de informação é enviado para servidores externos.
                </p>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <FileText className="w-4 h-4" />
                  Extração Espacial de Tabelas (Spatial Grid)
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Reconstrói tabelas complexas, contracheques e demonstrativos financeiros mantendo a separação exata entre colunas sem misturar valores de linhas vizinhas.
                </p>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  Tarjamento Definitivo LGPD (Raster 300 DPI)
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Combina caixas pretas vetoriais com queimadura rasterizada em 300 DPI, destruindo fisicamente a camada de texto subjacente para impedir cópia de dados sensíveis.
                </p>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Search className="w-4 h-4" />
                  Busca BM25 & Normalização CNJ
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Encontra artigos de leis, jurisprudências e processos judiciais no formato canônico do CNJ (20 dígitos), independente da pontuação ou máscara aplicada.
                </p>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Cpu className="w-4 h-4" />
                  Classificação de Regime Jurídico
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Diferencia automaticamente se o documento é de Direito Público (convênios, licitações) ou Privado, bloqueando a aplicação de leis inadequadas.
                </p>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <BookOpen className="w-4 h-4" />
                  Auditoria de Cláusulas Abusivas
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Identifica cláusulas nulas ou desproporcionais em contratos de prestação de serviços, termos de banco de horas e permissões indevidas de dados.
                </p>
              </div>

            </div>
          )}

          {/* ABA 2: LIMITAÇÕES */}
          {activeTab === 'limitations' && (
            <div className="space-y-3">

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                <Globe className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-300">Sem Consulta na Web sem Opt-in Explicito</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    A plataforma opera offline por padrão. Ela não pesquisa notícias de hoje, dólar atualizado nem andamentos de processos na internet sem que você forneça uma chave de API ou ative a busca externa.
                  </p>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                <Calculator className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-300">Sem Cálculos Atuariais / Financeiros Complexos</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Modelos de linguagem não são calculadoras contábeis. Para liquidar sentenças com juros regressivos, FGTS e DSR, a IA extrai as premissas, mas o cálculo matemático final deve ser feito no PJe-Calc ou em planilhas.
                  </p>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                <FileText className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-300">Sem Leitura de Manuscritos Cursivos Ilegíveis</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    O OCR local é otimizado para documentos impressos, digitados ou escaneados em alta resolução. Rabiscos manuscritos ou assinaturas ilegíveis feitas à mão não são convertidos com acurácia.
                  </p>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-300">Sem Previsão de Vitória / Especulação Judicial</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    A IA analisa a fundamentação dos pareceres e normas aplicáveis, mas não prevê probabilidade percentual (ex: "80% de chance de ganhar") nem antecipa decisões subjetivas de magistrados.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* ABA 3: DICAS & BOAS PRÁTICAS */}
          {activeTab === 'tips' && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
                <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  Como Obter as Melhores Respostas da IA Kovax
                </h4>
                <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
                  <li><strong>Formule Perguntas Objetivas:</strong> Em vez de perguntar *"Analise tudo"*, pergunte *"Quais são as partes, vigência e penalidades estipuladas no Documento X?"*.</li>
                  <li><strong>Anexe PDFs Legíveis:</strong> PDFs pesquisáveis diretamente do PJe/e-SAJ produzem resultados 100% precisos.</li>
                  <li><strong>Use os Módulos Adequados:</strong> Alterne entre *Auditor de Documentos*, *IA Geral Interdisciplinar* e *Consultor Livre* conforme a tarefa.</li>
                  <li><strong>Inspecione as Fontes Grifadas:</strong> Clique nos botões de citação abaixo das respostas para verificar o trecho exato extraído do documento.</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            Conformidade LGPD & Segurança Privada Garantidas
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all"
          >
            Compreendido
          </button>
        </div>

      </div>
    </div>
  );
};
