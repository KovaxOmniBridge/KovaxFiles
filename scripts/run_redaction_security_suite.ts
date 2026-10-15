import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

console.log('================================================================');
console.log('  KOVAXFILES — SUÍTE DE TESTES FORENSES DE ANONIMIZAÇÃO LGPD   ');
console.log('================================================================\n');

// 0. Higienização inicial de ambiente limpo
console.log('[0/4] Higienizando diretórios de saída para teste em ambiente limpo...');
const dirsToClean = ['test_output/battery', 'test_output/realistic_corpus'];
for (const dir of dirsToClean) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

// 1. Executa o teste do motor atual do aplicativo (LocalPdfEngine)
console.log('\n[1/4] Gerando artefatos de teste através do LocalPdfEngine...');
const engineTest = spawnSync('npx', ['tsx', 'scripts/test_engine_behavior.ts'], {
  stdio: 'inherit',
  shell: true
});

if (engineTest.status !== 0) {
  console.error('[ERRO] Falha ao executar scripts/test_engine_behavior.ts');
  process.exit(engineTest.status || 1);
}

// 2. Valida o modo de falha de segurança (interrupção obrigatória caso a sanitização não seja comprovada)
console.log('\n[2/4] Validando garantia de interrupção estrita (sem fallback silencioso inseguro)...');
const failureModeTest = spawnSync('npx', ['tsx', 'scripts/test_sanitization_failure_mode.ts'], {
  stdio: 'inherit',
  shell: true
});

if (failureModeTest.status !== 0) {
  console.error('[ERRO] Falha na validação do modo de falha de segurança!');
  process.exit(failureModeTest.status || 1);
}

// 3. Executa a bateria forense independente em Python (PyMuPDF, pypdf, pdfminer.six, Pillow)
console.log('\n[3/4] Executando Auditoria Forense em 5 Vetores de Ataque (Sintéticos + Corpus Realista)...');
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

// 4. Verificação física estrita dos artefatos produzidos, relatório JSON e aviso metodológico
console.log('\n[4/4] Verificando artefatos gerados, integridade do relatório JSON e resiliência dos controles...');
const reportPath = path.resolve('test_output/battery/relatorio_forense_anonimizacao.json');
if (!fs.existsSync(reportPath)) {
  console.error('[ERRO FATAL] O relatório JSON test_output/battery/relatorio_forense_anonimizacao.json não foi gerado!');
  process.exit(1);
}

const reportContent = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

// Validação de Metodologia e Disclaimer de Limitações
const disclaimer = reportContent?.metadata?.safety_score_methodology?.scope_and_limitations_disclaimer;
if (!disclaimer || typeof disclaimer !== 'string' || disclaimer.length < 50) {
  console.error('[FALHA DE AUDITORIA] O relatório forense carece de Aviso Metodológico de Escopo e Limitações formal!');
  process.exit(1);
}
console.log('  -> Aviso Metodológico de Escopo e Limitações verificado com sucesso.');

// Validação dos Documentos Auditados
const auditedDocs = reportContent.audited_documents;
if (!Array.isArray(auditedDocs) || auditedDocs.length < 9) {
  console.error(`[ERRO FATAL] O relatório JSON deve conter ao menos 9 documentos auditados (encontrados: ${auditedDocs?.length || 0})!`);
  process.exit(1);
}

const summary = reportContent.summary;
if (!summary || !summary.forensic_integrity_passed) {
  console.error('[FALHA DE VALIDAÇÃO] A integridade forense geral da suíte não foi homologada como conforme!');
  process.exit(1);
}

// 1. Verifica que todos os controles negativos acusaram vazamento (prova irrefutável de sensibilidade da bateria)
if (summary.negative_controls_detected_leaks !== summary.negative_controls_evaluated) {
  console.error(`[FALHA DE VALIDAÇÃO] Controles negativos falharam em detectar vazamentos (${summary.negative_controls_detected_leaks}/${summary.negative_controls_evaluated}). Bateria perdeu sensibilidade!`);
  process.exit(1);
}
console.log(`  -> Controles negativos validados: ${summary.negative_controls_detected_leaks}/${summary.negative_controls_evaluated} detectaram vazamento com precisão.`);

// 2. Verifica que todos os documentos sanitizados alcançaram score 100 e 0 vazamentos
if (summary.sanitized_documents_passed !== summary.sanitized_documents_evaluated) {
  console.error(`[FALHA DE VALIDAÇÃO] Documentos sanitizados reprovados (${summary.sanitized_documents_passed}/${summary.sanitized_documents_evaluated})!`);
  process.exit(1);
}
console.log(`  -> Documentos sanitizados validados: ${summary.sanitized_documents_passed}/${summary.sanitized_documents_evaluated} atingiram safety_score = 100.`);

// 3. Verifica a existência física dos arquivos e tamanhos consistentes
const requiredArtifacts = [
  'test_output/test_original.pdf',
  'test_output/test_redacted_engine.pdf',
  'test_output/battery/doc_original.pdf',
  'test_output/battery/doc_vector_overlay.pdf',
  'test_output/battery/doc_raster_flattened.pdf',
  'test_output/realistic_corpus/01_acordao_tribunal_justica.pdf',
  'test_output/realistic_corpus/01_acordao_tribunal_justica_anonimizado.pdf',
  'test_output/realistic_corpus/02_contrato_social_empresarial.pdf',
  'test_output/realistic_corpus/02_contrato_social_empresarial_anonimizado.pdf',
  'test_output/realistic_corpus/03_laudo_medico_trabalhista.pdf',
  'test_output/realistic_corpus/03_laudo_medico_trabalhista_anonimizado.pdf',
  'test_output/battery/relatorio_forense_anonimizacao.json',
  'test_output/battery/relatorio_forense_resumo.md'
];

for (const artifact of requiredArtifacts) {
  if (!fs.existsSync(artifact) || fs.statSync(artifact).size === 0) {
    console.error(`[ERRO FATAL] Artefato obrigatório ausente ou vazio: ${artifact}`);
    process.exit(1);
  }
  console.log(`  -> Artefato verificado: ${artifact} (${fs.statSync(artifact).size} bytes)`);
}

console.log('\n================================================================');
console.log('  SUCESSO COMPROVADO: BATERIA FORENSE COMPLETA HOMOLOGADA');
console.log('  (10 DOCUMENTOS EVALUADOS — CONTROLES SENSÍVEIS E SANITIZADOS 100%)');
console.log('================================================================\n');
process.exit(0);
