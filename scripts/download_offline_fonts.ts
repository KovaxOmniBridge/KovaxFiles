import fs from 'fs';
import path from 'path';

async function downloadOfflineFonts() {
  const fontsDir = path.resolve('public/fonts');
  fs.mkdirSync(fontsDir, { recursive: true });

  const cssUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap';
  console.log('Baixando manifesto de fontes de:', cssUrl);

  const res = await fetch(cssUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!res.ok) {
    throw new Error(`Falha ao obter CSS de fontes: ${res.statusText}`);
  }

  const css = await res.text();
  const fontFaceRegex = /@font-face\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  let count = 0;
  let localCss = '/* Fontes locais e offline empacotadas para KovaxFiles */\n\n';

  while ((match = fontFaceRegex.exec(css)) !== null) {
    const block = match[1];
    const famMatch = block.match(/font-family:\s*['"]?([^'";]+)/);
    const weightMatch = block.match(/font-weight:\s*([^;]+)/);
    const styleMatch = block.match(/font-style:\s*([^;]+)/);
    const urlMatch = block.match(/url\((https:\/\/[^)]+)\)/);

    if (famMatch && weightMatch && urlMatch) {
      const fam = famMatch[1].trim();
      const weight = weightMatch[1].trim();
      const style = styleMatch ? styleMatch[1].trim() : 'normal';
      const remoteUrl = urlMatch[1].trim();

      const ext = remoteUrl.endsWith('.ttf') ? 'ttf' : 'woff2';
      const fileName = `${fam.toLowerCase().replace(/\s+/g, '_')}_${weight}${style !== 'normal' ? '_' + style : ''}.${ext}`;
      const filePath = path.join(fontsDir, fileName);

      if (!fs.existsSync(filePath)) {
        console.log(`Baixando fonte offline [${fam} ${weight}]: ${fileName}...`);
        const fontRes = await fetch(remoteUrl);
        const fontBuf = Buffer.from(await fontRes.arrayBuffer());
        fs.writeFileSync(filePath, fontBuf);
      }

      localCss += `@font-face {\n  font-family: '${fam}';\n  font-style: ${style};\n  font-weight: ${weight};\n  font-display: swap;\n  src: url('/fonts/${fileName}') format('${ext}');\n}\n\n`;
      count++;
    }
  }

  const cssOutPath = path.join(fontsDir, 'fonts.css');
  fs.writeFileSync(cssOutPath, localCss, 'utf-8');
  console.log(`✓ ${count} arquivos de fonte offline baixados e salvos em: ${fontsDir}`);
  console.log(`✓ Manifesto local gerado em: ${cssOutPath}`);
}

downloadOfflineFonts().catch(err => {
  console.error('Erro ao empacotar fontes:', err);
  process.exit(1);
});
