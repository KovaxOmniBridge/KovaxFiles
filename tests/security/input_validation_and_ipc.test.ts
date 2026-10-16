/**
 * KovaxFiles Desktop — Security Tests: Input Validation, Anti-Spoofing & Magic Bytes
 */

import {
  validateFileBuffer,
  validateCnjProcessNumber,
  validateOfficialDomainUrl
} from '../../src/shared/validation/validator';
import { ValidationError, SecurityViolationError } from '../../src/shared/errors/kovaxErrors';
import { createSamplePdfBytes } from '../fixtures/sample_doc';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  [FAIL] ${msg}`);
    failed++;
    throw new Error(msg);
  } else {
    console.log(`  [PASS] ${msg}`);
    passed++;
  }
}

async function runSecurityTests() {
  console.log('\n================================================================================');
  console.log('  TESTES DE SEGURANÇA: VALIDAÇÃO DE ENTRADA, MAGIC BYTES E DOMÍNIOS OFICIAIS');
  console.log('================================================================================\n');

  console.log('[1/4] Testando Validação de Assinatura Mágica (Magic Bytes)...');
  const validPdfBytes = createSamplePdfBytes('Teste de Segurança');
  const pdfCheck = validateFileBuffer(validPdfBytes, 'documento.pdf', { enforceMagicBytes: true });
  assert(pdfCheck.isValid && pdfCheck.detectedType === 'pdf', 'Buffer com cabeçalho %PDF- deve ser homologado como pdf');

  // Arquivo malicioso: script HTML disfarçado com extensão .pdf
  const fakePdfBytes = new TextEncoder().encode('<script>alert("xss")</script>');
  let blockedFake = false;
  try {
    validateFileBuffer(fakePdfBytes, 'ataque.pdf', { enforceMagicBytes: true });
  } catch (err) {
    blockedFake = true;
    assert(err instanceof SecurityViolationError, 'Falso PDF deve disparar SecurityViolationError');
  }
  assert(blockedFake, 'Arquivo com extensão .pdf e bytes inválidos deve ser rigorosamente bloqueado');

  console.log('\n[2/4] Testando Limites de Tamanho e Buffer Vazio...');
  let blockedEmpty = false;
  try {
    validateFileBuffer(new Uint8Array(0), 'vazio.pdf');
  } catch (err) {
    blockedEmpty = true;
    assert(err instanceof ValidationError, 'Buffer de 0 bytes deve disparar ValidationError');
  }
  assert(blockedEmpty, 'Buffer vazio deve ser rejeitado');

  console.log('\n[3/4] Testando Validação Algorítmica de Processo CNJ (Módulo 97)...');
  // Processo legítimo do STF: 0000001-18.2008.1.00.0000 (Dígitos verificadores calculados pelo Módulo 97)
  const cnjValid = validateCnjProcessNumber('0000001-18.2008.1.00.0000');
  assert(cnjValid.isValid, 'Processo CNJ válido deve ser aprovado pelo algoritmo de módulo 97');

  // Dígito verificador adulterado (trocando 18 por 99)
  const cnjTampered = validateCnjProcessNumber('0000001-99.2008.1.00.0000');
  assert(!cnjTampered.isValid, 'Processo CNJ com dígito verificador errado deve ser rejeitado');

  console.log('\n[4/4] Testando Validação Estrita de Hostnames Governamentais e Judiciais...');
  // Hostname legítimo
  const stfUrl = validateOfficialDomainUrl('https://portal.stf.jus.br/jurisprudencia/sumula.asp?id=1');
  assert(stfUrl.isValid && stfUrl.isJudicial, 'stf.jus.br deve ser homologado como oficial judicial');

  const planaltoUrl = validateOfficialDomainUrl('https://www.planalto.gov.br/ccivil_03/leis/l8069.htm');
  assert(planaltoUrl.isValid && planaltoUrl.isExecutive, 'planalto.gov.br deve ser homologado como oficial executivo');

  // Tentativa de spoofing com domínio oficial em path
  const spoofUrl = validateOfficialDomainUrl('https://attacker.com/planalto.gov.br/fake.html');
  assert(!spoofUrl.isValid, 'URL com domínio governamental em path deve ser REJEITADA');

  // Subdomínio de atacante
  const subdomSpoof = validateOfficialDomainUrl('https://stf.jus.br.evil-domain.com');
  assert(!subdomSpoof.isValid, 'Subdomínio forjado com sufixo malicioso deve ser REJEITADO');

  console.log('\n================================================================================');
  console.log(`RESULTADO DOS TESTES DE SEGURANÇA:`);
  console.log(`  Testes Passados: ${passed}`);
  console.log(`  Testes Falhados: ${failed}`);
  console.log('================================================================================\n');

  if (failed > 0) process.exit(1);
}

runSecurityTests().catch(err => {
  console.error('Erro fatal nos testes de segurança:', err);
  process.exit(1);
});
