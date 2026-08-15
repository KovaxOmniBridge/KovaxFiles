/**
 * SERVICE DE GERAÇÃO DE ARQUIVOS DE AMOSTRA DE TESTE (MULTIFORMATOS)
 * Cria arquivos de teste reais em memória (File Blobs) para validação rápida de conversão.
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';

const SAMPLE_MARKDOWN = `# Relatório de Desempenho e Tecnologia 2026

Documento de demonstração gerado para teste de conversão de **Markdown (.md)** em **PDF Executivo**, **Word (.docx)** e **HTML**.

---

## 📌 Principais Métricas de Segurança

> [!NOTE]
> Todas as operações nesta plataforma ocorrem **100% no navegador do cliente (Client-Side)**. Nenhum byte é enviado para servidores externos.

---

## 📊 Tabela de Desempenho por Módulo

| Módulo de Conversão | Formato Nativo | Velocidade Média | Status de Conformidade |
| :--- | :--- | :--- | :--- |
| **PDF de Alta Fidelidade** | PDF / OpenXML | 130 ms / pág | 🟢 100% Concluído |
| **Word (.docx) Nativo** | OpenXML | 85 ms / doc | 🟢 100% Concluído |
| **Planilhas Excel / CSV** | XLSX / CSV | 45 ms / aba | 🟢 100% Concluído |

---

- [x] Otimização de PDF para PJe / TJSP
- [x] Conversão de imagens HEIC do iPhone
- [x] Assinatura PAdES e Tarjamento NSA/DOJ
`;

const SAMPLE_CSV = `Mês;Categoria;Receita Bruta;Despesas;Lucro Líquido;Status
Janeiro/2026;Serviços de TI;R$ 45.800,00;R$ 12.300,00;R$ 33.500,00;Aprovado
Fevereiro/2026;Consultoria;R$ 52.400,00;R$ 14.100,00;R$ 38.300,00;Aprovado
Março/2026;Licenças de Software;R$ 68.900,00;R$ 18.500,00;R$ 50.400,00;Aprovado
Abril/2026;Treinamentos;R$ 29.500,00;R$ 8.200,00;R$ 21.300,00;Pendente
Maio/2026;Suporte Técnico;R$ 41.200,00;R$ 11.000,00;R$ 30.200,00;Aprovado
`;

const SAMPLE_JSON = JSON.stringify(
  {
    empresa: 'ManipuladorArquivos Soluções Locais',
    versao: '2.5.0',
    dataRelatorio: '2026-08-12',
    indicadores: {
      totalArquivosProcessados: 1420,
      taxaSucesso: '100%',
      privacidadeGarantida: true,
    },
    equipe: [
      { id: 1, nome: 'Carlos Silva', cargo: 'Engenheiro de Segurança', departamento: 'Tecnologia' },
      { id: 2, nome: 'Ana Oliveira', cargo: 'Analista de Privacidade', departamento: 'Jurídico' },
      { id: 3, nome: 'Roberto Souza', cargo: 'Arquiteto WebAssembly', departamento: 'Desenvolvimento' },
    ],
  },
  null,
  2
);

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <rect width="800" height="500" rx="16" fill="#0F172A"/>
  <circle cx="400" cy="200" r="120" fill="none" stroke="#0284C7" stroke-width="12" stroke-dasharray="10 15"/>
  <circle cx="400" cy="200" r="80" fill="#1E293B" stroke="#38BDF8" stroke-width="4"/>
  <path d="M 360 200 L 390 230 L 450 170" fill="none" stroke="#4ADE80" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="400" y="370" font-family="Inter, sans-serif" font-size="26" font-weight="bold" fill="#F8FAFC" text-anchor="middle">Plataforma 100% Local &amp; Segura</text>
  <text x="400" y="410" font-family="Inter, sans-serif" font-size="16" fill="#94A3B8" text-anchor="middle">Teste de Conversão de Vetor SVG para PNG e PDF</text>
</svg>`;

const SAMPLE_TXT = `MANISFESTO DE TECNOLOGIA E PRIVACIDADE LOCAL

1. OBJETIVO
Este documento de texto simples (.txt) demonstra a conversão automática para documento PDF normatizado nos padrões ABNT NBR 14724 e Executivo 1:1.

2. ESPECIFICAÇÕES TÉCNICAS
- Processamento 100% Client-Side no Navegador
- Limpeza de Memória RAM com zeramento de buffers (0x00)
- Suporte a peticionamento eletrônico (PJe, TJSP, TRF, STJ)

Data da Amostra: 12 de Agosto de 2026
Status: Amostra Verificada
`;

const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Página de Amostra HTML</title>
  <style>
    body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
    h1 { color: #38bdf8; }
    .card { background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Demonstração Web HTML5</h1>
    <p>Este arquivo HTML de amostra serve para testar a conversão para PDF responsivo e documento Word.</p>
  </div>
</body>
</html>`;

function createSampleWavAudioFile(): File {
  const sampleRate = 44100;
  const numChannels = 1;
  const bitsPerSample = 16;
  const durationSeconds = 2;
  const numSamples = sampleRate * durationSeconds;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * 440 * t) * 20000;
    view.setInt16(offset, sample, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return new File([blob], 'amostra_audio_teste.wav', { type: 'audio/wav' });
}

function createSamplePngImageFile(): File {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, '#1B365D');
  gradient.addColorStop(0.5, '#0284C7');
  gradient.addColorStop(1, '#0F172A');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AMOSTRA DE IMAGEM HD', 256, 230);
  ctx.fillStyle = '#38BDF8';
  ctx.font = '18px sans-serif';
  ctx.fillText('Teste PNG/JPG/WebP/ICO/PDF', 256, 280);

  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: 'image/png' });
  return new File([blob], 'amostra_imagem.png', { type: 'image/png' });
}

export async function createSampleDocxFile(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: 'Documento Word de Amostra (.docx)', bold: true, color: '1B365D', size: 28 })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Este é um documento do Microsoft Word nativo em OpenXML para testar a conversão de Word (.docx) para PDF e Markdown.',
                size: 20,
              }),
            ],
            spacing: { before: 120, after: 120 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Recurso', bold: true, color: 'FFFFFF' })] })], shading: { fill: '1B365D' } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true, color: 'FFFFFF' })] })], shading: { fill: '1B365D' } }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Conversão p/ PDF' })] }),
                  new TableCell({ children: [new Paragraph({ text: '🟢 Suportado' })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Conversão p/ Markdown' })] }),
                  new TableCell({ children: [new Paragraph({ text: '🟢 Suportado' })] }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return new File([blob], 'amostra_documento.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

export async function getSampleFiles(): Promise<File[]> {
  const mdFile = new File([SAMPLE_MARKDOWN], 'amostra_markdown.md', { type: 'text/markdown' });
  const csvFile = new File([SAMPLE_CSV], 'amostra_financeiro.csv', { type: 'text/csv' });
  const jsonFile = new File([SAMPLE_JSON], 'amostra_estrutura.json', { type: 'application/json' });
  const svgFile = new File([SAMPLE_SVG], 'amostra_grafico.svg', { type: 'image/svg+xml' });
  const txtFile = new File([SAMPLE_TXT], 'amostra_relatorio.txt', { type: 'text/plain' });
  const pngFile = createSamplePngImageFile();
  const wavFile = createSampleWavAudioFile();
  const docxFile = await createSampleDocxFile();

  return [mdFile, docxFile, csvFile, jsonFile, svgFile, pngFile, wavFile, txtFile];
}
