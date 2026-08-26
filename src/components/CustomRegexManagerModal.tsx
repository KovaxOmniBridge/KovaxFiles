import React, { useState, useEffect } from 'react';
import { X, Code2, Plus, Trash2, Save } from 'lucide-react';

export interface CustomPatternRule {
  id: string;
  name: string;
  pattern: string; // Ex: "\b[A-Z]{2}-\d{4}\b"
  isRegex: boolean;
  enabled: boolean;
}

interface CustomRegexManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRulesChanged?: (rules: CustomPatternRule[]) => void;
}

const STORAGE_KEY = 'kovax_custom_pii_rules';

export const CustomRegexManagerModal: React.FC<CustomRegexManagerModalProps> = ({
  isOpen,
  onClose,
  onRulesChanged,
}) => {
  const [rules, setRules] = useState<CustomPatternRule[]>([]);
  const [newName, setNewName] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [newIsRegex, setNewIsRegex] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRules(JSON.parse(stored));
      } else {
        // Regras default de exemplo
        const defaultRules: CustomPatternRule[] = [
          {
            id: 'rule_1',
            name: 'Matrícula Funcional',
            pattern: 'Matrícula:\\s*\\d{5,8}',
            isRegex: true,
            enabled: true,
          },
          {
            id: 'rule_2',
            name: 'Termo Restrito',
            pattern: 'SEGREDO DE JUSTIÇA',
            isRegex: false,
            enabled: true,
          },
        ];
        setRules(defaultRules);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultRules));
      }
    } catch {}
  }, [isOpen]);

  if (!isOpen) return null;

  const saveRulesToStorage = (updatedRules: CustomPatternRule[]) => {
    setRules(updatedRules);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRules));
    if (onRulesChanged) {
      onRulesChanged(updatedRules);
    }
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPattern.trim()) {
      setError('Preencha o nome e o padrão do termo/regex.');
      return;
    }

    if (newIsRegex) {
      try {
        new RegExp(newPattern);
      } catch (err: any) {
        setError('Expressão Regular inválida: ' + err?.message);
        return;
      }
    }

    const newRule: CustomPatternRule = {
      id: `custom_rule_${Date.now()}`,
      name: newName.trim(),
      pattern: newPattern.trim(),
      isRegex: newIsRegex,
      enabled: true,
    };

    const updated = [...rules, newRule];
    saveRulesToStorage(updated);

    setNewName('');
    setNewPattern('');
    setNewIsRegex(false);
    setError(null);
  };

  const handleToggleRule = (id: string) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    saveRulesToStorage(updated);
  };

  const handleDeleteRule = (id: string) => {
    const updated = rules.filter((r) => r.id !== id);
    saveRulesToStorage(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-violet-100 text-violet-700">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Gerenciador de Padrões PII & Regex</h3>
              <p className="text-xs text-slate-500">Cadastre termos ou expressões regulares salvas localmente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          {/* Form para Nova Regra */}
          <form onSubmit={handleAddRule} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-violet-600" />
              Adicionar Novo Padrão de Tarjamento
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nome da Regra</label>
                <input
                  type="text"
                  placeholder="Ex: Código de Contrato"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Padrão / Termo / Regex</label>
                <input
                  type="text"
                  placeholder="Ex: CT-\\d{6}"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="inline-flex items-center space-x-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={newIsRegex}
                  onChange={(e) => setNewIsRegex(e.target.checked)}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 w-4 h-4"
                />
                <span>Usar Expressão Regular (Regex)</span>
              </label>

              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar Regra
              </button>
            </div>
          </form>

          {/* Lista de Regras Existentes */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Regras Ativas ({rules.length})
            </h4>

            {rules.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Nenhuma regra personalizada cadastrada.
              </div>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => handleToggleRule(rule.id)}
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 w-4 h-4"
                    />
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-800">{rule.name}</span>
                        {rule.isRegex && (
                          <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 text-[9px] font-mono font-semibold">
                            REGEX
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 truncate">{rule.pattern}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Excluir regra"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md"
          >
            Concluído
          </button>
        </div>

      </div>
    </div>
  );
};
