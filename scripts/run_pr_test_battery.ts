/**
 * =============================================================================
 * ORQUESTRADOR CENTRAL DE TESTES DE INTEGRAÇÃO CONTÍNUA (CI / PR BATTERY)
 * =============================================================================
 * Executa as 11 suítes críticas de Pull Request em sequência com medição
 * de tempo, captura de logs e sumário executivo para GitHub Actions.
 * =============================================================================
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface SuiteDef {
  id: string;
  name: string;
  file: string;
  mandatoryForPr: boolean;
}

const SUITES: SuiteDef[] = [
  { id: 'build', name: '1. Build & Integridade de Assets', file: 'tests/suites/build.test.ts', mandatoryForPr: true },
  { id: 'security', name: '2. Segurança Electron (Sandbox, IPC, CSP)', file: 'tests/suites/electron_security.test.ts', mandatoryForPr: true },
  { id: 'pdf', name: '3. PDF (Abrir, Manipular, Salvar, Reabrir)', file: 'tests/suites/pdf.test.ts', mandatoryForPr: true },
  { id: 'lgpd', name: '4. LGPD (Privacidade, Isolamento e Revisão)', file: 'tests/suites/lgpd.test.ts', mandatoryForPr: true },
  { id: 'crypto', name: '5. Criptografia & Cofre Forte AES-GCM', file: 'tests/suites/crypto.test.ts', mandatoryForPr: true },
  { id: 'docx', name: '6. DOCX (OOXML e Preservação Semântica)', file: 'tests/suites/docx.test.ts', mandatoryForPr: true },
  { id: 'ocr', name: '7. OCR Documental & PDF Pesquisável', file: 'tests/suites/ocr.test.ts', mandatoryForPr: true },
  { id: 'pades', name: '8. PAdES (Assinatura, Adulteração e Cadeia)', file: 'tests/suites/pades.test.ts', mandatoryForPr: true },
  { id: 'protocolo', name: '9. Protocolo Judicial (Divisão e Manifesto)', file: 'tests/suites/protocolo.test.ts', mandatoryForPr: true },
  { id: 'acervo', name: '10. Acervo Jurídico (Fontes e Autenticidade)', file: 'tests/suites/acervo.test.ts', mandatoryForPr: true },
  { id: 'adversarial', name: '11. Testes Adversariais (Fuzzing e Chaos)', file: 'tests/suites/adversarial.test.ts', mandatoryForPr: true }
];

async function runPrBattery() {
  console.log('='.repeat(80));
  console.log('  KOVAXFILES DESKTOP — BATERIA DE INTEGRAÇÃO CONTÍNUA (PULL REQUEST SUITE)');
  console.log('='.repeat(80));
  console.log(`Início: ${new Date().toISOString()}\n`);

  const results: Array<{ id: string; name: string; durationMs: number; passed: boolean; output: string }> = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of SUITES) {
    process.stdout.write(`⏳ Executando [${suite.name}]... `);
    const start = performance.now();

    const proc = spawnSync('npx', ['tsx', suite.file], {
      shell: true,
      encoding: 'utf-8',
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    const durationMs = Math.round(performance.now() - start);
    const passed = proc.status === 0;

    if (passed) {
      console.log(`✅ APROVADO (${(durationMs / 1000).toFixed(2)}s)`);
      totalPassed++;
    } else {
      console.log(`❌ FALHOU (${(durationMs / 1000).toFixed(2)}s)`);
      totalFailed++;
    }

    results.push({
      id: suite.id,
      name: suite.name,
      durationMs,
      passed,
      output: (proc.stdout || '') + (proc.stderr || '')
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('  SUMÁRIO EXECUTIVO DA BATERIA DE PULL REQUEST');
  console.log('='.repeat(80));
  console.log('| Suíte | Status | Duração |');
  console.log('| :--- | :---: | :---: |');
  for (const r of results) {
    console.log(`| ${r.name} | ${r.passed ? '✅ APROVADO' : '❌ REPROVADO'} | ${(r.durationMs / 1000).toFixed(2)}s |`);
  }
  console.log('='.repeat(80));
  console.log(`Total: ${SUITES.length} | Aprovados: ${totalPassed} | Falhados: ${totalFailed}`);

  // Se houver falhas, imprimir logs da suíte reprovada
  if (totalFailed > 0) {
    console.log('\n❌ DETALHES DAS FALHAS:');
    for (const r of results.filter(x => !x.passed)) {
      console.log(`\n--- Falha em: ${r.name} ---`);
      console.log(r.output);
    }
    process.exit(1);
  }

  console.log('\n🎉 TODAS AS SUÍTES DE PR FORAM HOMOLOGADAS COM SUCESSO!\n');
}

runPrBattery().catch(err => {
  console.error('Erro fatal no orquestrador de PR:', err);
  process.exit(1);
});
