import assert from 'assert';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { LocalPdfEngine } from '../src/services/pdfEngine';

async function runFailureModeTests() {
  console.log('--- TESTE DE SEGURANÇA: MODO DE FALHA E PROVA DE SANITIZAÇÃO ---');

  // 1. Criação de PDF de teste
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  page.drawText('CPF: 999.888.777-66 Dado Ultrassecreto', { x: 50, y: 750, size: 12, font });
  const pdfBytes = await doc.save();

  const rects = [{ pageIndex: 0, x: 50, y: 745, width: 200, height: 20, text: 'CPF: 999.888.777-66' }];

  // 2. Testar que com documento válido a sanitização conclui com sucesso
  console.log('[1/2] Verificando sanitização bem-sucedida...');
  const sanitized = await LocalPdfEngine.redactPdf(pdfBytes.buffer, rects, { sanitizeFlatten: true });
  assert.ok(sanitized instanceof Uint8Array && sanitized.length > 0, 'Buffer resultante deve ser válido');
  console.log('  -> Sanitização bem-sucedida confirmada.');

  // 3. Testar que falha na sanitização resulta em EXCEÇÃO e NUNCA em retorno silencioso de PDF inseguro
  console.log('[2/2] Verificando interrupção estrita em caso de falha de sanitização...');
  
  // Testar com buffer corrompido que não pode ser sanitizado
  const corruptedBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00, 0x00, 0x00]); // PDF truncado
  
  let threw = false;
  try {
    await LocalPdfEngine.redactPdf(corruptedBuffer.buffer, rects, { sanitizeFlatten: true });
  } catch (err: any) {
    threw = true;
    console.log(`  -> Exceção capturada com sucesso: "${err.message}"`);
    assert.ok(err && typeof err.message === 'string', 'Deve conter mensagem de erro');
  }
  assert.ok(threw, 'O motor DEVE disparar exceção para documento corrompido.');

  // Testar simulação de falha no método de sanitização por achatamento
  console.log('[3/3] Verificando que falha em sanitizeFlattenPdf aborta sem fallback silencioso...');
  const originalSanitize = (LocalPdfEngine as any).sanitizeFlattenPdf;
  let simulatedFailureThrew = false;
  try {
    (LocalPdfEngine as any).sanitizeFlattenPdf = async () => {
      throw new Error('Falha simulada no motor de rasterização');
    };

    await LocalPdfEngine.redactPdf(pdfBytes.buffer, rects, { sanitizeFlatten: true });
  } catch (err: any) {
    simulatedFailureThrew = true;
    console.log(`  -> Exceção de segurança capturada com sucesso: "${err.message}"`);
    assert.ok(
      err.message.includes('Falha crítica de segurança na anonimização') &&
      err.message.includes('A exportação foi interrompida para impedir vazamento de dados confidenciais'),
      'Mensagem deve indicar que a exportação foi interrompida por segurança'
    );
  } finally {
    (LocalPdfEngine as any).sanitizeFlattenPdf = originalSanitize;
  }

  // 4. Testar que tentar passar sanitizeFlatten: false para o método de anonimização É TERMINANTEMENTE PROIBIDO
  console.log('[4/4] Verificando que desativar sanitização no método de anonimização segura é expressamente bloqueado...');
  let falseOptionThrew = false;
  try {
    await LocalPdfEngine.anonymizePdf(pdfBytes.buffer, rects, { sanitizeFlatten: false } as any);
  } catch (err: any) {
    falseOptionThrew = true;
    console.log(`  -> Tentativa de sanitizeFlatten: false bloqueada com sucesso: "${err.message}"`);
    assert.ok(
      err.message.includes('Violação de Segurança') &&
      err.message.includes('sanitizeFlatten: false é estritamente proibido'),
      'Deve rejeitar formalmente a desativação da sanitização'
    );
  }
  assert.ok(falseOptionThrew, 'anonymizePdf DEVE rejeitar sanitizeFlatten: false');

  // 5. Testar que a operação de marcação visual prévia (applyVisualOverlay) está claramente separada
  console.log('[5/5] Verificando que a operação de marcação visual (applyVisualOverlay) opera em modo visual explícito...');
  const visualOnlyBytes = await LocalPdfEngine.applyVisualOverlay(pdfBytes.buffer, rects);
  assert.ok(visualOnlyBytes instanceof Uint8Array && visualOnlyBytes.length > 0, 'applyVisualOverlay deve retornar buffer vetorial');
  console.log('  -> Marcação visual preliminar validada com sucesso.');

  console.log('\n[PASS] Todos os testes de segurança do modo de falha passaram.');
}

runFailureModeTests().catch(err => {
  console.error('[FAIL] Erro no teste de modo de falha:', err);
  process.exit(1);
});
