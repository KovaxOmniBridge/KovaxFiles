const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  console.log('='.repeat(70));
  console.log('🖥️ TESTE DE ISOLAMENTO ELECTRON: OCR 100% OFFLINE EM SANDBOX');
  console.log('='.repeat(70));

  const interceptedExternalUrls = [];

  // Interceptar e auditar todas as requisições de rede
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (details.url.startsWith('http:') || details.url.startsWith('https:')) {
      interceptedExternalUrls.push(details.url);
      console.error(`[BLOQUEADO] Tentativa de acesso externo: ${details.url}`);
      callback({ cancel: true });
      return;
    }
    callback({});
  });

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      webSecurity: true,
    }
  });

  const testHtml = path.join(__dirname, 'test_electron_ocr.html');
  const tessdataUrl = 'file:///' + path.resolve(__dirname, '../public/tessdata').replace(/\\/g, '/');

  // Criar página HTML de teste que executa o Tesseract no Renderer do Electron
  fs.writeFileSync(testHtml, `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="../node_modules/tesseract.js/dist/tesseract.min.js"></script>
</head>
<body>
  <h1>Teste OCR Electron</h1>
  <script>
    window.testResult = null;
    async function runTest() {
      try {
        const basePath = "${tessdataUrl}";
        const worker = await Tesseract.createWorker('por', 1, {
          workerPath: basePath + '/worker.min.js',
          corePath: basePath,
          langPath: basePath,
          gzip: false,
        });

        // Criar um canvas com texto para OCR
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 400, 100);
        ctx.fillStyle = '#000000';
        ctx.font = '20px sans-serif';
        ctx.fillText('PROCESSO ELETRONICO 2026', 20, 50);

        const res = await worker.recognize(canvas);
        await worker.terminate();

        window.testResult = {
          success: true,
          text: res.data.text.trim(),
        };
      } catch (err) {
        window.testResult = {
          success: false,
          error: err.message || String(err)
        };
      }
    }
    runTest();
  </script>
</body>
</html>`);

  await win.loadFile(testHtml);

  // Aguardar a execução do OCR no renderer
  let attempts = 0;
  let result = null;
  while (attempts < 30) {
    await new Promise(r => setTimeout(r, 500));
    result = await win.webContents.executeJavaScript('window.testResult');
    if (result !== null) break;
    attempts++;
  }

  console.log('Resultado do OCR no Renderer Electron:', JSON.stringify(result));
  console.log('Total de requisições externas interceptadas:', interceptedExternalUrls.length);

  try { fs.unlinkSync(testHtml); } catch {}

  if (!result || !result.success) {
    console.error('❌ Falha na execução do OCR no Electron:', result?.error);
    app.exit(1);
    return;
  }

  if (interceptedExternalUrls.length > 0) {
    console.error('❌ Violação de isolamento offline detectada!');
    app.exit(1);
    return;
  }

  console.log('✅ OCR NO ELECTRON EXECUTADO COM SUCESSO 100% OFFLINE E ZERO EXTERNAL CALLS!');
  app.quit();
});
