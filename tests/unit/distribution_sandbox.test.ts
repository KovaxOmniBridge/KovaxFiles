import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  inspectLinuxSandboxHelper,
  getLinuxSandboxArchitectureExplanation
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
