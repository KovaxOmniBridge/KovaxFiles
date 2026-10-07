import React, { useState } from 'react';
import { FileStack, Plus, Trash2, ArrowUp, ArrowDown, Download, CheckCircle2, RefreshCw, Layers, FolderArchive } from 'lucide-react';
import { LocalPdfEngine } from '../../services/pdfEngine';
import { CompressionEngine } from '../../services/compressionEngine';

interface SelectedPdfItem {
  id: string;
  file: File;
  name: string;
  size: number;
}

export const PdfManipulator: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'merge' | 'split'>('merge');
  const [fileList, setFileList] = useState<SelectedPdfItem[]>([]);
  const [singleFile, setSingleFile] = useState<File | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [mergeResult, setMergeResult] = useState<{ data: Uint8Array; fileName: string } | null>(null);
  const [splitResult, setSplitResult] = useState<{ pageIndex: number; data: Uint8Array }[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
      const newItems: SelectedPdfItem[] = filesArray.map((f, idx) => ({
        id: Math.random().toString(36).substring(7) + idx,
        file: f,
        name: f.name,
        size: f.size
      }));
      setFileList(prev => [...prev, ...newItems]);
      setMergeResult(null);
      setErrorMessage(null);
    }
  };

  const handleRemoveFile = (id: string) => {
    setFileList(prev => prev.filter(item => item.id !== id));
  };

  const handleClearFileList = () => {
    setFileList([]);
    setMergeResult(null);
    setErrorMessage(null);
  };

  const handleMoveFile = (index: number, direction: 'up' | 'down') => {
    const newList = [...fileList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newList.length) {
      const temp = newList[index];
      newList[index] = newList[targetIndex];
      newList[targetIndex] = temp;
      setFileList(newList);
    }
  };

  const handleMerge = async () => {
    if (fileList.length < 2) {
      setErrorMessage('Por favor, adicione pelo menos 2 arquivos PDF para mesclar.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const buffers = await Promise.all(fileList.map(item => item.file.arrayBuffer()));
      const mergedBytes = await LocalPdfEngine.mergePdfs(buffers);

      setMergeResult({
        data: mergedBytes,
        fileName: 'documentos_mesclados_juntada.pdf'
      });
    } catch (err: any) {
      setErrorMessage('Erro ao unir arquivos PDF: ' + (err?.message || 'Arquivo corrompido.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSplit = async () => {
    if (!singleFile) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const buffer = await singleFile.arrayBuffer();
      const splitPages = await LocalPdfEngine.splitPdf(buffer);
      setSplitResult(splitPages);
    } catch (err: any) {
      setErrorMessage('Erro ao dividir PDF: ' + (err?.message || 'Erro desconhecido.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = (data: Uint8Array, fileName: string) => {
    const blob = new Blob([new Uint8Array(data)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAllSplitZip = () => {
    if (!splitResult || splitResult.length === 0) return;
    const baseName = singleFile ? singleFile.name.replace(/\.pdf$/i, '') : 'Pagina';
    const zipFiles = splitResult.map(item => ({
      name: `${baseName}_Pagina_${String(item.pageIndex).padStart(3, '0')}.pdf`,
      data: item.data
    }));
    const zipBytes = CompressionEngine.createZipArchive(zipFiles);
    const blob = new Blob([new Uint8Array(zipBytes)], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_Paginas_Separadas.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Tool Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-100">Manipulador de PDF (Fusão & Divisão)</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Processamento em Lote
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Unifique peças jurídicas com comprovantes e anexos, ou separe volumes de processos extensos em lote.
          </p>
        </div>

        {/* Subtab Toggle */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('merge')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'merge' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Unir PDFs (Fusão em Lote)
          </button>
          <button
            onClick={() => setActiveSubTab('split')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'split' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Separar Páginas (Divisão)
          </button>
        </div>
      </div>

      {activeSubTab === 'merge' ? (
        <div className="space-y-4">
          {/* File Selection Box */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-200 block">Arquivos Selecionados ({fileList.length})</span>
              <span className="text-[11px] text-slate-500">Defina a ordem exata de juntada dos documentos</span>
            </div>

            <div className="flex items-center gap-2">
              {fileList.length > 0 && (
                <button
                  onClick={handleClearFileList}
                  className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Tudo</span>
                </button>
              )}

              <label className="btn-action px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer transition-all">
                <Plus className="w-4 h-4" />
                <span>Adicionar PDFs</span>
                <input type="file" accept=".pdf" multiple onChange={handleAddFiles} className="hidden" />
              </label>
            </div>
          </div>

          {/* List of PDFs */}
          {fileList.length > 0 ? (
            <div className="space-y-2">
              {fileList.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-blue-400 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{item.name}</div>
                      <div className="text-[10px] text-slate-500">{(item.size / (1024 * 1024)).toFixed(2)} MB</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveFile(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 disabled:opacity-30"
                      title="Mover para cima"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveFile(idx, 'down')}
                      disabled={idx === fileList.length - 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 disabled:opacity-30"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveFile(item.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      title="Excluir da lista"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center border-2 dashed border-slate-800 rounded-2xl bg-slate-950/40">
              <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-400">Nenhum arquivo adicionado ainda.</p>
              <p className="text-[11px] text-slate-600 mt-1">Clique em "Adicionar PDFs" para selecionar petições e anexos.</p>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Merge Action Button */}
          {fileList.length >= 2 && !mergeResult && (
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handleClearFileList}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Limpar Lista ({fileList.length})</span>
              </button>

              <button
                onClick={handleMerge}
                disabled={isProcessing}
                className="btn-action px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-50 transition-all"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Unindo {fileList.length} PDFs...</span>
                  </>
                ) : (
                  <>
                    <FileStack className="w-4 h-4" />
                    <span>Unir Todos os {fileList.length} PDFs em Lote</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Merge Result */}
          {mergeResult && (
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100">PDFs Unificados com Sucesso!</h3>
                  <p className="text-xs text-slate-400">O documento combinado está pronto para download.</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  onClick={() => { setFileList([]); setMergeResult(null); }}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Mesclar Outros Arquivos
                </button>

                <button
                  onClick={() => downloadFile(mergeResult.data, mergeResult.fileName)}
                  className="btn-action px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar PDF Unificado</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* SPLIT SUBTAB */
        <div className="space-y-4">
          <div className="dropzone p-8 text-center cursor-pointer relative rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-900/40 transition-all">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSingleFile(e.target.files[0]);
                  setSplitResult(null);
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
                <Layers className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {singleFile ? singleFile.name : 'Selecione o PDF que deseja dividir em páginas avulsas'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Extrai cada página do documento como um PDF individual.
                </p>
              </div>
            </div>
          </div>

          {singleFile && !splitResult && (
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => { setSingleFile(null); setSplitResult(null); }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Limpar Seleção</span>
              </button>

              <button
                onClick={handleSplit}
                disabled={isProcessing}
                className="btn-action px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dividindo Páginas...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    <span>Dividir PDF em Páginas Individuais</span>
                  </>
                )}
              </button>
            </div>
          )}

          {splitResult && (
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{splitResult.length} Página(s) Separada(s) com Sucesso!</h3>
                    <p className="text-xs text-slate-400">Baixe individualmente ou faça o download de todas as páginas em um arquivo ZIP.</p>
                  </div>
                </div>

                <button
                  onClick={downloadAllSplitZip}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-purple-600/20 transition-all"
                >
                  <FolderArchive className="w-4 h-4" />
                  <span>Baixar Todas em ZIP ({splitResult.length})</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {splitResult.map((item) => (
                  <button
                    key={item.pageIndex}
                    onClick={() => downloadFile(item.data, `Pagina_${item.pageIndex}.pdf`)}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500 text-left text-xs flex items-center justify-between transition-all"
                  >
                    <div>
                      <div className="font-bold text-slate-200">Página {item.pageIndex}</div>
                      <div className="text-[10px] text-slate-500">{(item.data.byteLength / 1024).toFixed(1)} KB</div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <button
                  onClick={() => { setSingleFile(null); setSplitResult(null); }}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Dividir Outro Documento
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
