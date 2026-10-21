import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  inspectLinuxSandboxHelper,
  getLinuxSandboxArchitectureExplanation,
  isPrivilegedSandboxConfigurationAllowed,
  ensureLinuxSandboxConfigured
} from '../../scripts/linux_sandbox';

// ==============================================================================
// 1. Testes do Inspecionador de SUID Sandbox Helper
// ==============================================================================

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kovax-sandbox-test-'));

try {
  // Cenário 1: Arquivo não existe
  const nonExistent = path.join(tempDir, 'non-existent-chrome-sandbox');
  const nonExistentResult = inspectLinuxSandboxHelper(nonExistent);
  assert.equal(nonExistentResult.exists, false, 'Deve identificar que chrome-sandbox não existe');
  assert.equal(nonExistentResult.valid, false, 'Deve marcar como inválido quando ausente');
  assert.ok(nonExistentResult.reason?.includes('ausente'), 'Deve conter mensagem descritiva de ausência');

  // Cenário 2: Arquivo existe mas pertence a usuário não-root (ex: runner do CI / usuário de desenvolvimento)
  const dummySandbox = path.join(tempDir, 'chrome-sandbox');
  fs.writeFileSync(dummySandbox, 'binary mock');
  const nonRootResult = inspectLinuxSandboxHelper(dummySandbox);
  assert.equal(nonRootResult.exists, true, 'Deve identificar existência do arquivo');
  // No Windows ou em ambiente de desenvolvimento sem sudo, uid não é 0 (ou no Windows stat.uid é 0 em algumas APIs, mas testamos a lógica estrita)
  if (process.platform === 'linux') {
    // No Linux real de desenvolvimento sem sudo, o usuário não é root
    if (process.getuid && process.getuid() !== 0) {
      assert.equal(nonRootResult.valid, false, 'Não deve validar quando proprietário não for root');
      assert.ok(nonRootResult.reason?.includes('root'), 'Deve instruir chown root:root');
    }
  }

  // Cenário 3: Anti-Regressão Crítica de Permissões Estritas 4755 vs 4777 / permissões adicionais
  const origStat = fs.statSync;
  const fsAny = fs as unknown as { statSync: (path: fs.PathLike, options?: any) => any };
  try {
    // 3A: Arquivo do root com permissão 4777 (permissões adicionais de escrita para grupo/outros) - DEVE SER REJEITADO
    fsAny.statSync = (p: fs.PathLike) => {
      if (p === dummySandbox) {
        return { uid: 0, mode: 0o104777 };
      }
      return origStat(p);
    };
    const res4777 = inspectLinuxSandboxHelper(dummySandbox);
    assert.equal(res4777.valid, false, 'Deve rejeitar terminantemente permissão 4777');
    assert.equal(res4777.isExactMode, false, 'Deve marcar isExactMode como false para 4777');
    assert.ok(
      res4777.reason?.includes('4777') || res4777.reason?.includes('divergentes'),
      'Deve apontar rejeição expressa de permissões inseguras/adicionais como 4777'
    );

    // 3B: Arquivo do root com permissão 4775 (escrita de grupo adicional) - DEVE SER REJEITADO
    fsAny.statSync = (p: fs.PathLike) => {
      if (p === dummySandbox) {
        return { uid: 0, mode: 0o104775 };
      }
      return origStat(p);
    };
    const res4775 = inspectLinuxSandboxHelper(dummySandbox);
    assert.equal(res4775.valid, false, 'Deve rejeitar permissão 4775');
    assert.equal(res4775.isExactMode, false, 'Deve marcar isExactMode como false para 4775');

    // 3C: Arquivo do root com permissão 0755 (sem bit SUID) - DEVE SER REJEITADO
    fsAny.statSync = (p: fs.PathLike) => {
      if (p === dummySandbox) {
        return { uid: 0, mode: 0o100755 };
      }
      return origStat(p);
    };
    const res0755 = inspectLinuxSandboxHelper(dummySandbox);
    assert.equal(res0755.valid, false, 'Deve rejeitar quando bit SUID estiver ausente');
    assert.equal(res0755.isSetuid, false, 'Deve marcar isSetuid como false para 0755');
    assert.ok(res0755.reason?.includes('SUID'), 'Deve apontar ausência do bit SUID');

    // 3D: Arquivo não-root mesmo com 4755 - DEVE SER REJEITADO
    fsAny.statSync = (p: fs.PathLike) => {
      if (p === dummySandbox) {
        return { uid: 1000, mode: 0o104755 };
      }
      return origStat(p);
    };
    const resNonRoot4755 = inspectLinuxSandboxHelper(dummySandbox);
    assert.equal(resNonRoot4755.valid, false, 'Não-root com 4755 deve ser rejeitado');
    assert.equal(resNonRoot4755.isRoot, false, 'isRoot deve ser false');
    assert.ok(resNonRoot4755.reason?.includes('root'), 'Deve instruir chown root:root');

    // 3E: Arquivo do root com permissão EXATA 4755 - DEVE SER APROVADO
    fsAny.statSync = (p: fs.PathLike) => {
      if (p === dummySandbox) {
        return { uid: 0, mode: 0o104755 };
      }
      return origStat(p);
    };
    const res4755 = inspectLinuxSandboxHelper(dummySandbox);
    assert.equal(res4755.valid, true, 'Deve aprovar permissões exatamente 4755 pertencentes ao root');
    assert.equal(res4755.isRoot, true, 'isRoot deve ser true');
    assert.equal(res4755.isSetuid, true, 'isSetuid deve ser true');
    assert.equal(res4755.isExactMode, true, 'isExactMode deve ser true');
    assert.equal(res4755.reason, undefined, 'reason deve ser undefined para configuração válida');
  } finally {
    fsAny.statSync = origStat;
  }

  // ==============================================================================
  // 2. Autorização Estrita de Configuração Privilegiada Automática (Matriz Completa)
  // ==============================================================================
  const savedCI = process.env.CI;
  const savedGA = process.env.GITHUB_ACTIONS;
  const savedElevation = process.env.KOVAX_ALLOW_SANDBOX_ELEVATION;

  try {
    // 2A: Fora do CI (ausentes) e sem flag explícita -> NÃO AUTORIZADO
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.KOVAX_ALLOW_SANDBOX_ELEVATION;
    assert.equal(
      isPrivilegedSandboxConfigurationAllowed(),
      false,
      'Não deve autorizar quando CI, GITHUB_ACTIONS e KOVAX_ALLOW_SANDBOX_ELEVATION forem ausentes'
    );

    // 2B: KOVAX_ALLOW_SANDBOX_ELEVATION com 'true' -> SEMPRE AUTORIZADO
    process.env.KOVAX_ALLOW_SANDBOX_ELEVATION = 'true';
    assert.equal(isPrivilegedSandboxConfigurationAllowed(), true, 'Deve autorizar quando KOVAX_ALLOW_SANDBOX_ELEVATION=true (mesmo sem CI)');
    process.env.CI = 'false';
    process.env.GITHUB_ACTIONS = 'false';
    assert.equal(isPrivilegedSandboxConfigurationAllowed(), true, 'KOVAX_ALLOW_SANDBOX_ELEVATION=true sobrepõe CI/GA false');
    process.env.CI = '';
    process.env.GITHUB_ACTIONS = '';
    assert.equal(isPrivilegedSandboxConfigurationAllowed(), true, 'KOVAX_ALLOW_SANDBOX_ELEVATION=true sobrepõe CI/GA vazios');

    // 2C: KOVAX_ALLOW_SANDBOX_ELEVATION com 'false' -> SEMPRE BLOQUEADO
    process.env.KOVAX_ALLOW_SANDBOX_ELEVATION = 'false';
    process.env.CI = 'true';
    process.env.GITHUB_ACTIONS = 'true';
    assert.equal(isPrivilegedSandboxConfigurationAllowed(), false, 'KOVAX_ALLOW_SANDBOX_ELEVATION=false bloqueia mesmo com CI=true e GA=true');

    // 2D: KOVAX_ALLOW_SANDBOX_ELEVATION vazio ('') -> cai para a avaliação estrita de CI/GA
    process.env.KOVAX_ALLOW_SANDBOX_ELEVATION = '';
    process.env.CI = 'true';
    process.env.GITHUB_ACTIONS = 'true';
    assert.equal(isPrivilegedSandboxConfigurationAllowed(), true, 'KOVAX_ALLOW_SANDBOX_ELEVATION vazio cai para CI=true e GA=true');

    process.env.KOVAX_ALLOW_SANDBOX_ELEVATION = '';
    process.env.CI = 'false';
    process.env.GITHUB_ACTIONS = 'true';
    assert.equal(isPrivilegedSandboxConfigurationAllowed(), false, 'KOVAX_ALLOW_SANDBOX_ELEVATION vazio com CI false bloqueia');

    // 2E: Matriz estrita de CI e GITHUB_ACTIONS (KOVAX_ALLOW_SANDBOX_ELEVATION ausente)
    delete process.env.KOVAX_ALLOW_SANDBOX_ELEVATION;

    // Ambos 'true' -> AUTORIZADO
    process.env.CI = 'true';
    process.env.GITHUB_ACTIONS = 'true';
    assert.equal(isPrivilegedSandboxConfigurationAllowed(), true, 'CI=true e GITHUB_ACTIONS=true deve autorizar');

    // CI 'false'
    process.env.CI = 'false';
    process.env.GITHUB_ACTIONS = 'true';
    assert.equal(isPrivilegedSandboxConfigurationAllowed(), false, 'CI=false e GA=true deve rejeitar');

    process.env.CI = 'true';
    process.env.GITHUB_ACTIONS = 'false';
    assert.equal(isPrivilegedSandboxConfigurationAllowed(), false, 'CI=true e GA=false deve rejeitar');

    process.env.CI = 'false';
    process.env.GITHUB_ACTIONS = 'false';
    assert.equal(isPrivilegedSandboxConfigurationAllowed(), false, 'CI=false e GA=false deve rejeitar');

    // Valores vazios ('')
    process.env.CI = '';
    process.env.GITHUB_ACTIONS = 'true';
    assert.equal(isPrivilegedSandboxConfigurationAllowed(), false, 'CI vazio e GA=true deve rejeitar (não usar Boolean)');

    process.env.CI = 'true';
    process.env.GITHUB_ACTIONS = '';
    assert.equal(isPrivilegedSandboxConfigurationAllowed(), false, 'CI=true e GA vazio deve rejeitar (não usar Boolean)');

    process.env.CI = '';
    process.env.GITHUB_ACTIONS = '';
    assert.equal(isPrivilegedSandboxConfigurationAllowed(), false, 'CI vazio e GA vazio deve rejeitar');

    // Valores ausentes (undefined)
    delete process.env.CI;
    process.env.GITHUB_ACTIONS = 'true';
    assert.equal(isPrivilegedSandboxConfigurationAllowed(), false, 'CI ausente e GA=true deve rejeitar');

    process.env.CI = 'true';
    delete process.env.GITHUB_ACTIONS;
    assert.equal(isPrivilegedSandboxConfigurationAllowed(), false, 'CI=true e GA ausente deve rejeitar');

    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    assert.equal(isPrivilegedSandboxConfigurationAllowed(), false, 'Ambos ausentes deve rejeitar');

    // Valores truthy arbitrários não estritos (rejeitados pela comparação estrita === 'true')
    process.env.CI = '1';
    process.env.GITHUB_ACTIONS = '1';
    assert.equal(isPrivilegedSandboxConfigurationAllowed(), false, 'CI=1 e GA=1 deve rejeitar (não é string true)');

    process.env.CI = 'yes';
    process.env.GITHUB_ACTIONS = 'yes';
    assert.equal(isPrivilegedSandboxConfigurationAllowed(), false, 'CI=yes e GA=yes deve rejeitar (não é string true)');
  } finally {
    if (savedCI !== undefined) process.env.CI = savedCI; else delete process.env.CI;
    if (savedGA !== undefined) process.env.GITHUB_ACTIONS = savedGA; else delete process.env.GITHUB_ACTIONS;
    if (savedElevation !== undefined) process.env.KOVAX_ALLOW_SANDBOX_ELEVATION = savedElevation; else delete process.env.KOVAX_ALLOW_SANDBOX_ELEVATION;
  }

  // ==============================================================================
  // 3. Comportamento do ensureLinuxSandboxConfigured no Caminho de CI (Interrupção)
  // ==============================================================================
  const origPlatform = process.platform;
  try {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    process.env.CI = 'true';

    // Se estiver no CI e o helper estiver inválido e não autorizado, DEVE LANÇAR ERRO e não apenas avisar
    assert.throws(
      () => {
        ensureLinuxSandboxConfigured(path.join(tempDir, 'dummy-exec'), { allowPrivilegedConfiguration: false });
      },
      (err: any) => {
        return err instanceof Error && err.message.includes('SUID sandbox helper inválido');
      },
      'No CI, falha de autorização da sandbox deve abortar o teste com exceção'
    );
  } finally {
    Object.defineProperty(process, 'platform', { value: origPlatform, configurable: true });
    if (savedCI !== undefined) process.env.CI = savedCI; else delete process.env.CI;
  }

  // ==============================================================================
  // 2. Anti-Regressão Mandatória: Proibição de --no-sandbox no Pacote de Produção
  // ==============================================================================

  // A: O runner de testes do executável empacotado NUNCA pode invocar com --no-sandbox
  const desktopPackagedSource = fs.readFileSync('tests/suites/desktop_packaged.test.ts', 'utf8');
  assert.ok(
    !desktopPackagedSource.includes("'--no-sandbox'") && !desktopPackagedSource.includes('"--no-sandbox"'),
    'Regressão Crítica: tests/suites/desktop_packaged.test.ts não pode conter a flag --no-sandbox'
  );

  // B: O workflow build-release.yml NUNCA pode usar --no-sandbox nas chamadas do aplicativo empacotado
  const buildReleaseSource = fs.readFileSync('.github/workflows/build-release.yml', 'utf8');
  assert.ok(
    !buildReleaseSource.includes('--no-sandbox'),
    'Regressão Crítica: .github/workflows/build-release.yml não pode utilizar --no-sandbox para mascarar falhas de sandbox'
  );

  // C: O workflow build-release.yml DEVE conter a etapa obrigatória de configuração do SUID sandbox helper no Linux
  assert.ok(
    buildReleaseSource.includes('Configurar sandbox SUID do Chromium no Linux (CI)'),
    'build-release.yml deve conter a etapa explícita de configuração do SUID sandbox helper no Linux'
  );
  assert.ok(
    buildReleaseSource.includes('chmod 4755') && buildReleaseSource.includes('chown root:root'),
    'build-release.yml deve aplicar chown root:root e chmod 4755 ao chrome-sandbox no CI'
  );

  // D: O workflow ci.yml também deve conter a etapa de configuração da sandbox no Linux
  const ciSource = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
  assert.ok(
    ciSource.includes('Configurar sandbox SUID do Chromium no Linux (CI)'),
    'ci.yml deve conter a etapa de configuração do SUID sandbox helper no Linux'
  );

  // ==============================================================================
  // 3. Diferenciação Arquitetural Estrita: CI vs AppImage do Usuário Final
  // ==============================================================================
  const explanation = getLinuxSandboxArchitectureExplanation();
  assert.ok(explanation.ciEnvironment.includes('linux-unpacked'), 'Deve documentar ambiente de CI executando o pacote desempacotado');
  assert.ok(explanation.ciEnvironment.includes('4755'), 'Deve documentar exigência do SUID 4755 no CI');
  assert.ok(explanation.endUserAppImage.includes('AppImage'), 'Deve documentar AppImage como veículo do usuário final');
  assert.ok(explanation.endUserAppImage.includes('FUSE'), 'Deve documentar FUSE e flag nosuid na máquina do usuário');
  assert.ok(explanation.endUserAppImage.includes('user namespaces'), 'Deve documentar unprivileged user namespaces na máquina do usuário');
  assert.ok(explanation.securityGuarantee.includes('--no-sandbox'), 'Deve atestar garantia de segurança proibindo --no-sandbox');

  console.log('Linux sandbox anti-regression and governance contracts passed successfully');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
