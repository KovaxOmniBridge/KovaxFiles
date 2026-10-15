import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

console.log('================================================================');
console.log('  KOVAXFILES — SUÍTE DE TESTES FORENSES DE ANONIMIZAÇÃO LGPD   ');
console.log('================================================================\n');

// 1. Executa o teste do motor atual do aplicativo
console.log('[1/2] Gerando artefatos de teste através do LocalPdfEngine...');
const engineTest = spawnSync('npx', ['tsx', 'scripts/test_engine_behavior.ts'], {
  stdio: 'inherit',
  shell: true
});

if (engineTest.status !== 0) {
  console.error('[ERRO] Falha ao executar scripts/test_engine_behavior.ts');
  process.exit(engineTest.status || 1);
}

// 2. Executa a bateria forense independente em Python (PyMuPDF, pypdf, pdfminer.six, Pillow)
console.log('\n[2/2] Executando Auditoria Forense em 5 Vetores de Ataque...');
const venvPy = path.resolve('.venv/Scripts/python.exe');
const pythonCmd = fs.existsSync(venvPy) ? venvPy : 'python';

const auditTest = spawnSync(pythonCmd, ['scripts/audit_pdf_redaction_security.py'], {
  stdio: 'inherit',
  shell: true
});

if (auditTest.status !== 0) {
  console.error('\n[ALERTA DE SEGURANÇA] A auditoria forense identificou vulnerabilidades de recuperação de dados!');
  process.exit(auditTest.status || 1);
}

console.log('\n[SUCESSO] Todos os testes forenses foram concluídos com sucesso.');
process.exit(0);
