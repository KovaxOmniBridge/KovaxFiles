import path from 'path';
import fs from 'fs';

// Extensões de arquivos expressamente autorizadas para manipulação e visualização documental
export const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.heic',
  '.docx', '.txt', '.md', '.json', '.zip', '.csv'
]);

// Lista de extensões perigosas ou executáveis bloqueadas incondicionalmente
export const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh',
  '.ps1', '.ps1xml', '.ps2', '.ps2xml', '.psc1', '.psc2', '.msh', '.msh1', '.msh2',
  '.msi', '.msp', '.com', '.scr', '.pif', '.reg', '.dll', '.cpl', '.hta', '.jar', '.lnk',
  '.scf', '.inf', '.sys', '.sh', '.bash', '.app', '.dmg', '.pkg'
]);

/**
 * Whitelist de arquivos e diretórios explicitamente autorizados durante a sessão ativa.
 * Previne que o renderer acesse ou manipule arquivos/pastas arbitrárias do sistema (Princípio do Menor Privilégio).
 */
export const sessionAuthorizedFiles = new Set<string>();
export const sessionAuthorizedDirectories = new Set<string>();

export function normalizeSessionKey(p: string): string {
  try {
    const resolved = path.resolve(p);
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  } catch {
    return p;
  }
}

/**
 * Registra um caminho explicitamente autorizado na sessão.
 * Princípio do Menor Privilégio: Se o caminho for um arquivo, autoriza estritamente o arquivo.
 * O diretório pai NÃO é registrado automaticamente em sessionAuthorizedDirectories,
 * impedindo a ampliação indevida de privilégio para abertura do diretório via IPC.
 */
export function authorizeSessionPath(rawPath: string) {
  try {
    const resolved = path.resolve(rawPath);
    if (fs.existsSync(resolved)) {
      const canonical = fs.realpathSync(resolved);
      const stat = fs.statSync(canonical);
      if (stat.isDirectory()) {
        sessionAuthorizedDirectories.add(normalizeSessionKey(canonical));
      } else {
        sessionAuthorizedFiles.add(normalizeSessionKey(canonical));
      }
    } else {
      // Caminho de destino sugerido que ainda será gravado (ex: saveFileDialog)
      sessionAuthorizedFiles.add(normalizeSessionKey(resolved));
    }
  } catch {}
}

/**
 * Registra um diretório expressamente autorizado na sessão (ex: quando o usuário
 * seleciona uma pasta de destino para exportação em lote).
 */
export function authorizeSessionDirectory(rawDirPath: string) {
  try {
    const resolved = path.resolve(rawDirPath);
    if (fs.existsSync(resolved)) {
      const canonical = fs.realpathSync(resolved);
      const stat = fs.statSync(canonical);
      if (stat.isDirectory()) {
        sessionAuthorizedDirectories.add(normalizeSessionKey(canonical));
      }
    } else {
      sessionAuthorizedDirectories.add(normalizeSessionKey(resolved));
    }
  } catch {}
}

/**
 * Limpa as autorizações da sessão ativa (utilizado em testes e encerramento de sessão).
 */
export function clearSessionAuthorizations() {
  sessionAuthorizedFiles.clear();
  sessionAuthorizedDirectories.clear();
}

/**
 * Validação estrutural de assinatura mágica de conteúdo (Magic Bytes).
 * Comprova que o conteúdo real do arquivo corresponde à extensão declarada,
 * impedindo a execução ou abertura de binários executáveis ou scripts camuflados como documentos.
 */
export function validateFileContentMatchesType(filePath: string, ext: string): { valid: boolean; error?: string } {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(1024);
    const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
    fs.closeSync(fd);

    if (bytesRead === 0) {
      // Arquivo vazio recém-alocado para escrita
      return { valid: true };
    }

    // Bloqueio incondicional de executáveis binários disfarçados de documentos:
    // 1. Windows Portable Executable (MZ = 0x4D, 0x5A)
    if (bytesRead >= 2 && buffer[0] === 0x4D && buffer[1] === 0x5A) {
      return { valid: false, error: 'Violação de tipo: Assinatura de executável Windows PE (MZ) detectada no arquivo.' };
    }
    // 2. Linux ELF (0x7F, 0x45, 0x4C, 0x46)
    if (bytesRead >= 4 && buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
      return { valid: false, error: 'Violação de tipo: Assinatura de binário executável ELF detectada no arquivo.' };
    }
    // 3. Mach-O Executable
    if (bytesRead >= 4 && (
      (buffer[0] === 0xFE && buffer[1] === 0xED && buffer[2] === 0xFA && (buffer[3] === 0xCE || buffer[3] === 0xCF)) ||
      (buffer[0] === 0xCF && buffer[1] === 0xFA && buffer[2] === 0xED && buffer[3] === 0xFE)
    )) {
      return { valid: false, error: 'Violação de tipo: Assinatura de binário Mach-O detectada no arquivo.' };
    }
    // 4. Scripts executáveis iniciados com Shebang ('#!')
    if (bytesRead >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21) {
      return { valid: false, error: 'Violação de tipo: Assinatura de script executável (Shebang #!) detectada no arquivo.' };
    }

    // Validação de correspondência entre extensão declarada e assinatura real
    switch (ext) {
      case '.pdf': {
        const headerStr = buffer.toString('latin1', 0, bytesRead);
        if (!headerStr.includes('%PDF-')) {
          return { valid: false, error: 'Arquivo inválido: Assinatura mágica de documento PDF (%PDF-) não encontrada nos cabeçalhos.' };
        }
        break;
      }
      case '.png': {
        const isPng = bytesRead >= 8 &&
          buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
          buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A;
        if (!isPng) {
          return { valid: false, error: 'Arquivo inválido: Assinatura mágica de imagem PNG não encontrada.' };
        }
        break;
      }
      case '.jpg':
      case '.jpeg': {
        const isJpg = bytesRead >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
        if (!isJpg) {
          return { valid: false, error: 'Arquivo inválido: Assinatura mágica de imagem JPEG não encontrada.' };
        }
        break;
      }
      case '.webp': {
        const isWebp = bytesRead >= 12 &&
          buffer.toString('ascii', 0, 4) === 'RIFF' &&
          buffer.toString('ascii', 8, 12) === 'WEBP';
        if (!isWebp) {
          return { valid: false, error: 'Arquivo inválido: Assinatura mágica de imagem WebP não encontrada.' };
        }
        break;
      }
      case '.heic': {
        const isFtyp = bytesRead >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp';
        if (!isFtyp) {
          return { valid: false, error: 'Arquivo inválido: Assinatura de container HEIC (ftyp) não encontrada.' };
        }
        break;
      }
      case '.docx':
      case '.zip': {
        const isZip = bytesRead >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B &&
          (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
          (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08);
        if (!isZip) {
          return { valid: false, error: 'Arquivo inválido: Assinatura de container compactado (PK) não encontrada.' };
        }
        break;
      }
      case '.txt':
      case '.md':
      case '.json':
      case '.csv': {
        let nullCount = 0;
        for (let i = 0; i < bytesRead; i++) {
          if (buffer[i] === 0x00) nullCount++;
        }
        if (nullCount > 0) {
          return { valid: false, error: 'Arquivo de texto documental corrompido: bytes nulos binários detectados.' };
        }
        break;
      }
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: `Falha na verificação de assinatura de arquivo: ${err?.message || 'Erro de E/S'}` };
  }
}

/**
 * Validador estrito de caminhos de arquivos e diretórios:
 * Mitiga riscos de Path Traversal, injeção de executáveis, acesso indevido ao sistema operacional
 * e restringe operações sensíveis estritamente a caminhos explicitamente autorizados na sessão.
 */
export function validateSafeFilePath(
  inputPath: unknown,
  options?: { requireSessionAuthorization?: boolean }
): { valid: boolean; normalizedPath?: string; error?: string } {
  if (typeof inputPath !== 'string' || inputPath.trim().length === 0) {
    return { valid: false, error: 'Caminho de arquivo inválido ou vazio.' };
  }

  // Previne injeção de byte nulo (\0 poisoning)
  if (inputPath.includes('\0')) {
    return { valid: false, error: 'Tentativa de injeção de caractere nulo detectada.' };
  }

  // Previne caminhos UNC remotos (ex: \\malicious.com\share ou //smb/...)
  if (inputPath.startsWith('\\\\') || inputPath.startsWith('//')) {
    return { valid: false, error: 'Caminhos de rede UNC remotos não são permitidos por segurança.' };
  }

  // Previne esquemas de protocolos perigosos (javascript:, data:, vbscript:, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(inputPath) && !/^[a-zA-Z]:[\\\/]/.test(inputPath)) {
    return { valid: false, error: 'Esquemas de protocolo de URL não são autorizados em caminhos locais.' };
  }

  try {
    const resolved = path.resolve(inputPath);

    // Exige caminho canônico e absoluto
    if (!path.isAbsolute(resolved)) {
      return { valid: false, error: 'O caminho do arquivo deve ser absoluto.' };
    }

    // Valida existência física no disco
    if (!fs.existsSync(resolved)) {
      return { valid: false, error: 'O arquivo ou diretório especificado não foi encontrado.' };
    }

    // Resolve links simbólicos (symlinks / junctions) para inspecionar o arquivo real de destino
    const canonical = fs.realpathSync(resolved);
    const stat = fs.statSync(canonical);
    const isDir = stat.isDirectory();

    // 1. Verificação de Autorização de Sessão (Princípio do Menor Privilégio e Capability-Based Security)
    const enforceSession = options?.requireSessionAuthorization !== false;
    if (enforceSession) {
      const key = normalizeSessionKey(canonical);
      const isAuthorized = isDir
        ? sessionAuthorizedDirectories.has(key)
        : sessionAuthorizedFiles.has(key);

      if (!isAuthorized) {
        return {
          valid: false,
          error: `Acesso negado: O caminho '${path.basename(canonical)}' não foi explicitamente autorizado ou selecionado pelo usuário durante esta sessão.`
        };
      }
    }

    // Se for diretório, apenas diretórios explicitamente autorizados na sessão são permitidos
    if (isDir) {
      return { valid: true, normalizedPath: canonical };
    }

    // 2. Validação da extensão real
    const ext = path.extname(canonical).toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      return { valid: false, error: `Abertura bloqueada: extensões executáveis (${ext}) são proibidas por segurança.` };
    }

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return { valid: false, error: `Extensão não autorizada (${ext}). Apenas documentos e imagens permitidos.` };
    }

    // 3. Validação de Conteúdo Real vs Extensão Declarada (Magic Bytes)
    const contentCheck = validateFileContentMatchesType(canonical, ext);
    if (!contentCheck.valid) {
      return { valid: false, error: contentCheck.error };
    }

    return { valid: true, normalizedPath: canonical };
  } catch (err: any) {
    return { valid: false, error: `Falha na sanitização de caminho: ${err?.message || 'Caminho malformado'}` };
  }
}
