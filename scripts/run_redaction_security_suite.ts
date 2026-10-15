import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

console.log('================================================================');
console.log('  KOVAXFILES — SUÍTE DE TESTES FORENSES DE ANONIMIZAÇÃO LGPD   ');
console.log('================================================================\n');

// 1. Executa o teste do motor atual do aplicativo
console.log('[1/3] Gerando artefatos de teste através do LocalPdfEngine...');
const engineTest = spawnSync('npx', ['tsx', 'scripts/test_engine_behavior.ts'], {
  stdio: 'inherit',
  shell: true
});

if (engineTest.status !== 0) {
  console.error('[ERRO] Falha ao executar scripts/test_engine_behavior.ts');
  process.exit(engineTest.status || 1);
}

// 2. Valida o modo de falha de segurança (interrupção obrigatória caso a sanitização não seja comprovada)
console.log('\n[2/3] Validando garantia de interrupção estrita (sem fallback silencioso inseguro)...');
const failureModeTest = spawnSync('npx', ['tsx', 'scripts/test_sanitization_failure_mode.ts'], {
  stdio: 'inherit',
  shell: true
});

if (failureModeTest.status !== 0) {
  console.error('[ERRO] Falha na validação do modo de falha de segurança!');
  process.exit(failureModeTest.status || 1);
}

// 3. Executa a bateria forense independente em Python (PyMuPDF, pypdf, pdfminer.six, Pillow)
console.log('\n[3/3] Executando Auditoria Forense em 5 Vetores de Ataque...');
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

// 4. Verificação física estrita dos artefatos produzidos e relatório JSON
console.log('\n[4/4] Verificando artefatos gerados e integridade do relatório JSON...');
const reportPath = path.resolve('test_output/battery/relatorio_forense_anonimizacao.json');
if (!fs.existsSync(reportPath)) {
  console.error('[ERRO FATAL] O relatório JSON test_output/battery/relatorio_forense_anonimizacao.json não foi gerado!');
  process.exit(1);
}

const reportContent = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
if (!Array.isArray(reportContent) || reportContent.length < 4) {
  console.error('[ERRO FATAL] O relatório JSON não contém os 4 documentos auditados!');
  process.exit(1);
}

// 1. Verifica que os controles negativos detectaram vulnerabilidades (prova de sensibilidade)
if (reportContent[0].total_leaks_found === 0 || reportContent[1].total_leaks_found === 0) {
  console.error('[FALHA DE VALIDAÇÃO] Os controles negativos (original ou tarja vetorial) não detectaram vazamentos. A auditoria perdeu sensibilidade!');
  process.exit(1);
}

// 2. Verifica que o motor e o documento sanitizado possuem 0 vazamentos e score 100
for (const doc of reportContent.slice(2)) {
  if (doc.total_leaks_found !== 0 || doc.safety_score !== 100) {
    console.error(`[FALHA DE VALIDAÇÃO] ${doc.label} possui vazamentos (${doc.total_leaks_found}) ou score inferior a 100 (${doc.safety_score})!`);
    process.exit(1);
  }
}

// Verifica a existência física dos arquivos de saída
const requiredArtifacts = [
  'test_output/test_original.pdf',
  'test_output/test_redacted_engine.pdf',
  'test_output/battery/doc_original.pdf',
  'test_output/battery/doc_vector_overlay.pdf',
  'test_output/battery/doc_raster_flattened.pdf',
  'test_output/battery/relatorio_forense_anonimizacao.json'
];

for (const artifact of requiredArtifacts) {
  if (!fs.existsSync(artifact) || fs.statSync(artifact).size === 0) {
    console.error(`[ERRO FATAL] Artefato obrigatório ausente ou vazio: ${artifact}`);
    process.exit(1);
  }
  console.log(`  -> Artefato verificado: ${artifact} (${fs.statSync(artifact).size} bytes)`);
}

console.log('\n================================================================');
console.log('  SUCESSO COMPROVADO: TODOS OS TESTES E ARTEFATOS FORAM HOMOLOGADOS');
console.log('================================================================\n');
process.exit(0);
