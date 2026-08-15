# 🛡️ ManipuladorArquivos — Plataforma Enterprise Client-Side de Engenharia de Documentos

> **Plataforma Universal 100% Client-Side / Zero Upload para Engenharia, Conversão, Assinatura Digital PAdES, Tarjamento LGPD com IA Local e Otimização para Portais Judiciais (PJe, TJSP, TRF).**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6.svg)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg)](https://tailwindcss.com/)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-green.svg)](#-publicando-no-github-pages)

---

## 📌 Visão Geral

O **ManipuladorArquivos** é um ecossistema de software de alta performance projetado para processamento de documentos confidenciais com **garantia absoluta de privacidade**.

Diferente das soluções SaaS tradicionais do mercado, todos os algoritmos de visão computacional, tarjamento com inteligência artificial, parsing de arquivos Word/PDF, transcodificação de mídias e otimização binária são executados **exclusivamente na memória RAM e na GPU local do navegador do usuário**. Nenhum dado ou arquivo é transmitido para servidores externos.

---

## ✨ Principais Funcionalidades

### ⚖️ 1. Presets Judiciais & Compressão de PDF
* **Perfis Oficiais**: Presets calibrados para os limites dos tribunais brasileiros:
  * **PJe Nacional**: 1.5 MB
  * **TJSP / TJRJ / TJMG**: 3.0 MB
  * **TRF / TRT / STJ**: 5.0 MB, 10.0 MB e 25.0 MB
* **Redução Inteligente**: Algoritmos de re-amostragem vetorial e otimização de imagens mantendo legibilidade total para peticionamento eletrônico.

### 📝 2. Conversor Universal de Documentos
* **Word (.docx / .doc) para PDF**: Conversão com fidelidade métrica e tipográfica idêntica ao Google Docs (Arial 11pt, altura de linha 1.35, margens estáticas de 1.9 cm).
* **Markdown (.md) para PDF**: Renderização executiva unificada sem sobreposição de textos, com suporte a tabelas comparativas, blocos de código e diagramas.
* **Extração de Tabelas para Excel**: Converte tabelas de PDFs em planilhas `.xlsx` e `.csv`.
* **Conversão de Mídias**: Suporte a imagens HEIC (iPhone), AVIF, WebP, PNG, JPG, MP4 e áudio WAV.

### 🖋️ 3. Assinatura Digital PAdES / ICP-Brasil
* **Termo de Encerramento Automático**: Adiciona uma folha A4 dedicada de encerramento criptográfico em conformidade com a **MP nº 2.200-2/2001** e **Lei nº 14.063/2020**.
* **Audit Trail**: Injeção de metadados SHA-256 com zero sobreposição visual sobre o conteúdo do documento original.

### 🕵️‍♂️ 4. Tarjamento LGPD com IA Local (NER)
* **Reconhecimento de Entidades Sensíveis**: Localização e tarjamento automático por IA local de CPFs (com validação Módulo 11), CNPJs, e-mails, telefones, nomes de pessoas físicas e dados LGPD.
* **Rasterização de Segurança Máxima (Padrão NSA/DOJ)**: Converte páginas tarjadas em imagens de alta definição e remove os caracteres ocultos do código binário do PDF.

---

## 🏛️ Arquitetura Tecnológica

```
ManipuladorArquivos Client-Side Architecture
├── Layer de Interface: React 19, TypeScript 6.0, TailwindCSS v4, Lucide Icons
├── Bundler & Build: Esbuild, Oxlint, Vite
├── PDF Engine: pdf-lib, pdfjs-dist, jsPDF
├── Document Engine: mammoth, docx, docx-preview, XLSX / SheetJS
├── Local AI & Storage: WebGPU, Transformers.js, IndexedDB Vector Store
└── Media & Vision: WebAssembly FFmpeg, Tesseract.js OCR
```

---

## 🚀 Instalação e Execução Local

### Pré-requisitos
* Node.js v18+ e npm v9+

### Passos

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/ManipuladorArquivos.git

# Acesse o diretório do projeto
cd ManipuladorArquivos

# Instale as dependências
npm install

# Execute o servidor de desenvolvimento
npm run watch

# Compilar para produção
npm run build
```

---

## 🌐 Publicando no GitHub Pages

Este projeto foi construído com rotas e caminhos de assets relativos (`./dist/app.js`, `./dist/styles.css`), estando **100% pronto para rodar no GitHub Pages**.

### Método 1: Deploy Direto via GitHub Actions (Recomendado)

1. Suba o projeto para seu repositório no GitHub.
2. No repositório, acesse **Settings** > **Pages**.
3. Em **Source**, selecione **GitHub Actions**.
4. O workflow automático em `.github/workflows/deploy.yml` fará o build e publicará a aplicação automaticamente a cada `git push`.

### Método 2: Deploy Manual

```bash
# Execute o build de produção
npm run build

# Envie as pastas dist/, public/ e index.html para o seu repositório
git add .
git commit -m "feat: release build para GitHub Pages"
git push origin main
```

---

## 📄 Licença e Conformidade Comercial

Este projeto está licenciado sob a **Licença MIT** (veja o arquivo [LICENSE](LICENSE) para mais detalhes).

Todas as dependências utilizadas no projeto (`React`, `jsPDF`, `pdf-lib`, `pdfjs-dist`, `html2canvas`, `mammoth`, `docx`, `xlsx`, `jszip`, `lucide-react`) são bibliotecas de **código aberto permissivas** (MIT, Apache 2.0, BSD e ISC). O uso comercial enterprise ou SaaS é **100% legal e em inteira conformidade jurídica**.

---

## ✉️ Suporte e Contato

Desenvolvido para engenharia documental de alta criticidade e privacidade absoluta.
