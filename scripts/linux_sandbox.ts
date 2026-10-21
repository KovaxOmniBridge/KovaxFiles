import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export interface LinuxSandboxStatus {
  helperPath: string;
  exists: boolean;
  uid?: number;
  mode?: number;
  isRoot?: boolean;
  isSetuid?: boolean;
  isExactMode?: boolean;
  valid: boolean;
  reason?: string;
}

/**
 * Inspeciona o estado do binário auxiliar SUID sandbox helper do Chromium (chrome-sandbox).
 * No Chromium (setuid_sandbox_host.cc), se chrome-sandbox existir no diretório da aplicação,
 * ele OBRIGATORIAMENTE deve ser de propriedade do root (uid: 0) e possuir permissões EXATAMENTE 4755.
 * Permissões adicionais (como 4777 com escrita para grupo/outros) são expressamente rejeitadas
 * por constituírem vulnerabilidade crítica de segurança.
 */
export function inspectLinuxSandboxHelper(helperPath: string): LinuxSandboxStatus {
  if (!fs.existsSync(helperPath)) {
    return {
      helperPath,
      exists: false,
      valid: false,
      reason: `Auxiliar SUID sandbox helper ausente: ${helperPath}`
    };
  }
  const stat = fs.statSync(helperPath);
  const isRoot = stat.uid === 0;
  const permissionMode = stat.mode & 0o7777;
  const isSetuid = (permissionMode & 0o4000) === 0o4000;
  // Permissões DEVEM ser exatamente 4755 (rwsr-xr-x), sem permissões adicionais (ex: 4777, 4775) nem insuficientes (ex: 4700, 0755)
  const isExactMode = permissionMode === 0o4755;
  const valid = isRoot && isExactMode;

  let reason: string | undefined;
  if (!isRoot) {
    reason = `chrome-sandbox não pertence ao root (proprietário atual UID: ${stat.uid}). Requer chown root:root.`;
  } else if (!isSetuid) {
    reason = `chrome-sandbox não possui bit SUID 4755 (modo atual: 0${permissionMode.toString(8)}). Requer chmod 4755.`;
  } else if (!isExactMode) {
    reason = `chrome-sandbox possui permissões divergentes de 4755 (modo atual: 0${permissionMode.toString(8)}). Permissões adicionais inseguras (ex: 4777) ou insuficientes são expressamente rejeitadas; requer exatamente chmod 4755.`;
  }

  return {
    helperPath,
    exists: true,
    uid: stat.uid,
    mode: stat.mode,
    isRoot,
    isSetuid,
    isExactMode,
    valid,
    reason
  };
}

/**
 * Verifica se a configuração privilegiada automática da sandbox está autorizada.
 * Restrita estritamente ao ambiente CI oficial autorizado ou quando a variável
 * KOVAX_ALLOW_SANDBOX_ELEVATION estiver explicitamente configurada como 'true'.
 */
export function isPrivilegedSandboxConfigurationAllowed(): boolean {
  if (process.env.KOVAX_ALLOW_SANDBOX_ELEVATION === 'true') {
    return true;
  }
  if (process.env.KOVAX_ALLOW_SANDBOX_ELEVATION === 'false') {
    return false;
  }
  // No CI GitHub Actions oficial
  return Boolean(process.env.CI && process.env.GITHUB_ACTIONS);
}

/**
 * Configura as permissões do chrome-sandbox no ambiente de execução do runner CI.
 * No CI, o runner possui privilégios de sudo sem senha, permitindo configurar o SUID
 * helper para execução de testes empacotados com sandbox nativo 100% ativado (sem --no-sandbox).
 */
export function configureLinuxSandboxHelper(helperPath: string): boolean {
  if (!fs.existsSync(helperPath)) {
    throw new Error(`chrome-sandbox não encontrado em: ${helperPath}`);
  }
  try {
    execFileSync('sudo', ['chown', 'root:root', helperPath], { stdio: 'pipe' });
    execFileSync('sudo', ['chmod', '4755', helperPath], { stdio: 'pipe' });
    const verified = inspectLinuxSandboxHelper(helperPath);
    if (!verified.valid) {
      throw new Error(`Falha ao validar permissões após configuração: ${verified.reason}`);
    }
    return true;
  } catch (error) {
    throw new Error(`Erro ao configurar SUID sandbox helper no Linux: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Garante que o ambiente de execução Linux esteja com a sandbox configurada
 * adequadamente para execução do executável empacotado.
 *
 * Regras:
 * - Restringe a configuração privilegiada automática ao ambiente de teste explicitamente autorizado.
 * - No CI, qualquer falha de configuração ou conformidade aborta imediatamente o teste, sem virar apenas aviso.
 */
export function ensureLinuxSandboxConfigured(
  executablePath: string,
  options?: { allowPrivilegedConfiguration?: boolean }
): void {
  if (process.platform !== 'linux') return;
  const sandboxHelper = path.join(path.dirname(executablePath), 'chrome-sandbox');
  if (!fs.existsSync(sandboxHelper)) return;

  const isCI = Boolean(process.env.CI);
  const status = inspectLinuxSandboxHelper(sandboxHelper);
  if (status.valid) return;

  const isAllowed = options?.allowPrivilegedConfiguration ?? isPrivilegedSandboxConfigurationAllowed();
  if (!isAllowed) {
    const errorMsg = `[LinuxSandbox] SUID sandbox helper inválido (${status.reason}) e a configuração privilegiada automática não está autorizada neste ambiente.`;
    if (isCI) {
      throw new Error(errorMsg);
    } else {
      console.warn(errorMsg);
      return;
    }
  }

  try {
    configureLinuxSandboxHelper(sandboxHelper);
    console.log(`[LinuxSandbox] SUID sandbox helper configurado com sucesso: ${sandboxHelper} (root:root 4755)`);
  } catch (err) {
    const errorMsg = `[LinuxSandbox] Falha na configuração do SUID sandbox helper: ${err instanceof Error ? err.message : String(err)}`;
    if (isCI) {
      throw new Error(errorMsg);
    } else {
      console.warn(errorMsg);
    }
  }
}

/**
 * Retorna as distinções técnicas entre o ambiente de CI e a máquina do usuário final.
 */
export function getLinuxSandboxArchitectureExplanation(): {
  ciEnvironment: string;
  endUserAppImage: string;
  securityGuarantee: string;
} {
  return {
    ciEnvironment:
      'No CI (GitHub Actions runner ubuntu-latest), o teste automatizado executa o executável desempacotado ' +
      '(linux-unpacked/kovax-files-desktop) diretamente sobre o sistema de arquivos ext4 nativo. ' +
      'Como o electron-builder roda como usuário não-privilegiado (runner), o binário chrome-sandbox é desempacotado ' +
      'com UID do runner e permissão 0755. A preparação do CI via sudo chown root:root e chmod 4755 configura o ' +
      'SUID sandbox helper do Chromium com permissões estritas 4755 (rejeitando permissões adicionais como 4777), ' +
      'permitindo executar os testes empacotados com o sandbox nativo ativado sem qualquer uso de --no-sandbox e sem ' +
      'desativar proteções de produção.',
    endUserAppImage:
      'Na máquina do usuário final, a distribuição Linux é realizada exclusivamente via AppImage ' +
      '(KovaxFiles Desktop-1.0.0-linux-x86_64.AppImage). O AppImage é montado via FUSE por um usuário comum sem ' +
      'elevação de privilégios. Por segurança, montagens FUSE possuem nativamente a flag nosuid, o que significa que ' +
      'binários SUID não operam como root dentro do AppImage. No desktop do usuário final, o Chromium/Electron ' +
      'utiliza o isolamento via unprivileged user namespaces (CLONE_NEWUSER) suportado pelo kernel da distribuição. ' +
      'Para distribuições com restrição de user namespaces (como Ubuntu 24.04 via AppArmor), o usuário final utiliza ' +
      'o perfil AppArmor do sistema ou instalação de pacote nativo (.deb/.rpm) onde o instalador gerencia o chrome-sandbox.',
    securityGuarantee:
      'Nenhuma flag --no-sandbox é permitida na distribuição de produção. A preparação via SUID helper no CI ' +
      'é estritamente restrita ao ambiente de teste do executável desempacotado e não altera nem compromete a ' +
      'integridade e os requisitos de execução do AppImage distribuído ao usuário final.'
  };
}
