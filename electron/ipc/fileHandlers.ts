/**
 * KovaxFiles Desktop — Electron File Export & Atomic Save IPC Handlers
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { validateIpcSender } from './ipcValidator';
import {
  ALLOWED_EXTENSIONS,
  DANGEROUS_EXTENSIONS,
  authorizeSessionPath,
  validateFileContentMatchesType,
  validateBufferContentMatchesType
} from '../pathSecurity';

const MAX_EXPORT_BUFFER_BYTES = 500 * 1024 * 1024;

export function registerFileHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('file:saveExportedFile', async (event, options: { defaultName?: string; buffer: Uint8Array | number[] | ArrayBuffer }) => {
    validateIpcSender(event, 'file:saveExportedFile', getMainWindow());

    // 1. Validação estrutural do buffer em memória
    if (!options || options.buffer === undefined || options.buffer === null) {
      return { success: false, error: 'Parâmetro de buffer de exportação ausente.' };
    }

    let nodeBuf: Buffer;
    try {
      nodeBuf = Buffer.isBuffer(options.buffer) ? options.buffer : Buffer.from(options.buffer as any);
    } catch (err: any) {
      return { success: false, error: `Buffer de exportação malformado ou inválido: ${err?.message || 'Erro de conversão'}` };
    }

    // 2. Validação do tamanho do buffer
    if (nodeBuf.length === 0) {
      return { success: false, error: 'O buffer de arquivo a ser exportado está vazio (0 bytes).' };
    }
    if (nodeBuf.length > MAX_EXPORT_BUFFER_BYTES) {
      return {
        success: false,
        error: `O tamanho do arquivo (${Math.round(nodeBuf.length / (1024 * 1024))} MB) excede o limite máximo permitido de 500 MB.`
      };
    }

    // 3. Sanitização do nome sugerido e extensão
    let safeDefaultName = 'documento_exportado.pdf';
    if (typeof options?.defaultName === 'string' && options.defaultName.trim().length > 0) {
      const base = path.basename(options.defaultName.trim()).replace(/[/\\?%*:|"<>]/g, '_');
      const ext = path.extname(base).toLowerCase();
      if (ext && !DANGEROUS_EXTENSIONS.has(ext) && ALLOWED_EXTENSIONS.has(ext)) {
        safeDefaultName = base;
      } else {
        const nameWithoutExt = ext ? base.slice(0, -ext.length) : base;
        safeDefaultName = `${nameWithoutExt || 'documento_exportado'}.pdf`;
      }
    }

    const suggestedExt = path.extname(safeDefaultName).toLowerCase() || '.pdf';
    if (DANGEROUS_EXTENSIONS.has(suggestedExt) || !ALLOWED_EXTENSIONS.has(suggestedExt)) {
      return { success: false, error: `Extensão de arquivo sugerida não permitida (${suggestedExt}).` };
    }

    // 4. Validação Prévia da Assinatura Mágica de Conteúdo em Memória
    const memCheck = validateBufferContentMatchesType(nodeBuf, suggestedExt);
    if (!memCheck.valid) {
      return { success: false, error: memCheck.error || 'O conteúdo do buffer não corresponde ao formato especificado.' };
    }

    // 5. Diálogo nativo do sistema para escolha de destino
    const win = getMainWindow();
    if (!win) {
      return { success: false, error: 'Janela principal não inicializada.' };
    }

    const extWithoutDot = suggestedExt.replace(/^\./, '');
    const saveResult = await dialog.showSaveDialog(win, {
      defaultPath: safeDefaultName,
      filters: [
        { name: 'Documento Exportado', extensions: [extWithoutDot] },
        { name: 'Todos os Arquivos', extensions: ['*'] }
      ]
    });

    if (saveResult.canceled || !saveResult.filePath) {
      return { canceled: true };
    }

    const targetPath = path.resolve(saveResult.filePath);
    const targetExt = path.extname(targetPath).toLowerCase();

    // Validar extensão escolhida pelo usuário
    if (DANGEROUS_EXTENSIONS.has(targetExt) || !ALLOWED_EXTENSIONS.has(targetExt)) {
      return { success: false, error: `Extensão de arquivo não permitida (${targetExt}).` };
    }

    // Re-validar se a extensão final coincide com o buffer
    const finalContentCheck = validateBufferContentMatchesType(nodeBuf, targetExt);
    if (!finalContentCheck.valid) {
      return { success: false, error: finalContentCheck.error || 'Assinatura mágica do conteúdo incompatível com a extensão escolhida.' };
    }

    // 6. Gravação Atômica com Arquivo Temporário
    const targetDir = path.dirname(targetPath);
    const tempFileName = `.${path.basename(targetPath)}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`;
    const tempFilePath = path.join(targetDir, tempFileName);

    try {
      // Escreve no arquivo temporário com permissões restritas (0o600)
      fs.writeFileSync(tempFilePath, nodeBuf, { mode: 0o600 });

      // Verifica que o arquivo gravado possui o tamanho exato esperado
      const tempStat = fs.statSync(tempFilePath);
      if (tempStat.size !== nodeBuf.length) {
        throw new Error(`Inconsistência de tamanho gravado: esperado ${nodeBuf.length} bytes, gravado ${tempStat.size} bytes.`);
      }

      // Valida assinatura física do arquivo temporário antes de mover
      const diskCheck = validateFileContentMatchesType(tempFilePath, targetExt);
      if (!diskCheck.valid) {
        throw new Error(diskCheck.error || 'Assinatura mágica no arquivo temporário divergente.');
      }

      // Substituição atômica no destino final
      fs.renameSync(tempFilePath, targetPath);

      // Autorização de sessão do arquivo recém-gravado
      authorizeSessionPath(targetPath);

      return {
        success: true,
        filePath: targetPath
      };
    } catch (err: any) {
      return { success: false, error: `Falha na gravação atômica: ${err?.message || 'Erro de E/S'}` };
    } finally {
      if (fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch {}
      }
    }
  });
}
