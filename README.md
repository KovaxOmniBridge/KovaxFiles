# KovaxFiles Desktop — Engenharia Documental 100% Local

[![GitHub Pages](https://img.shields.io/badge/Website-GitHub%20Pages-0284c7?style=for-the-badge&logo=github)](https://KovaxOmniBridge.github.io/KovaxFiles/)
[![Platform](https://img.shields.io/badge/Plataforma-Windows%20%7C%20macOS%20%7C%20Linux-blueviolet?style=for-the-badge)](https://github.com/KovaxOmniBridge/KovaxFiles)
[![Security](https://img.shields.io/badge/Seguran%C3%A7a-100%25%20Offline%20%2F%20LGPD-059669?style=for-the-badge)](https://github.com/KovaxOmniBridge/KovaxFiles#-%EF%B8%8F-seguran%C3%A7a-e-privacidade)

Plataforma universal de alta performance sob licenciamento para escritórios de advocacia, departamentos jurídicos e órgãos de gestão pública (prefeituras). Operação **100% Client-Side / Offline**, garantindo total sigilo de dados (segredo de justiça) e conformidade estrita com a **LGPD (Lei Geral de Proteção de Dados)**.

---

## 🌐 Página de Apresentação (GitHub Pages)

O repositório inclui a página estática de apresentação e solicitação de planos na pasta [`/docs`](./docs).

* **Acesse o site ao vivo:** [https://KovaxOmniBridge.github.io/KovaxFiles/](https://KovaxOmniBridge.github.io/KovaxFiles/)

> ⚠️ **Nota:** Os downloads diretos de instaladores estão temporariamente indisponíveis no site. Para solicitar licença corporativa ou demonstração, utilize os canais de contato da plataforma.

---

## 🛡️ Princípios de Segurança e Privacidade

1. **Zero Server Upload**: Todos os arquivos processados (PDFs, petições, anexos e escaneamentos) permanecem exclusivamente na memória RAM e CPU do computador do usuário.
2. **Processamento em Memória & WASM**: Motores de manipulação de PDF (`pdf-lib`), anonimização e OCR (`tesseract.js`) executam localmente via WebAssembly.
3. **Censura LGPD Definitiva (*Burn-In*)**: As tarjas pretas aplicadas sobre CPFs, CNPJs e dados sigilosos são queimadas diretamente no vetor do PDF, impedindo seleção ou recuperação de dados por cópia de texto.

---

## ⚡ Módulos e Funcionalidades

### 1. 🔍 Pesquisa Jurídica LEXML
- Consulta integrada à Rede de Informação Legislativa e Jurídica do Brasil.
- Acesso rápido a leis, decretos, acórdãos e jurisprudência diretamente no workflow de edição.

### 2. 📄 Compressor de PDF para Portais Judiciais e Públicos
- Presets predefinidos para limites de upload sem perda de legibilidade:
  - **PJe Nacional (CNJ)** (Máx 3.0 MB)
  - **e-SAJ TJSP** (Máx 10.0 MB)
  - **TRF / e-Proc** (Máx 5.0 MB)
  - **Sistemas Municipais de Prefeitura** (Máx 15.0 MB)

### 3. 🛡️ Tarjador & Anonimizador LGPD Local
- Identificação e tarjamento automático de CPFs, CNPJs, RGs, e-mails e termos customizados.
- Aplicação de tarjas pretas definitivas com eliminação do texto subjacente.

### 4. 🏷️ Juntada & Carimbo de Autos
- Chancela automática de numeração sequencial de folhas (`Fl. 001/2026`, `Fl. 002/2026`).
- Adição de número de processo (`Proc. Nº 12.345/2026`) e carimbo institucional nos quatro cantos das páginas.

### 5. 👁️ OCR Local & Scanner de Texto
- Leitura óptica offline via WebAssembly (Tesseract.js) para transformar cópias escaneadas antigas em texto pesquisável e selecionável.

### 6. 🧹 Sanitizador de Metadados PDF
- Remoção completa de propriedades ocultas (autor, software de criação, tags EXIF e histórico de edições) antes de protocolar em juízo.

### 7. ✂️ Manipulador de PDF (Fusão & Divisão)
- Mescla de petição inicial + procuração + comprovantes + guias em um único PDF otimizado.
- Divisão de autos judiciais extensos em volumes ou páginas individuais.

---

## 📂 Estrutura do Repositório

```text
KovaxFiles/
├── .github/
│   └── workflows/
│       ├── deploy-pages.yml     # Workflow de publicação automática no GitHub Pages
│       └── build-release.yml    # Workflow de geração dos instaladores .exe / .dmg / .AppImage
├── docs/                        # Site Estático de Apresentação e Planos (GitHub Pages)
│   ├── index.html               # Landing page responsiva com suporte a Dark Glassmorphism
│   ├── style.css                # Estilos e tokens de design
│   └── app.js                   # Interatividade e menu mobile
├── electron/                    # Código do Processo Principal Electron & Preload
│   ├── main.ts                  # Gerenciamento de Janelas nativas e IPC Dialogs
│   └── preload.ts               # Bridge de segurança para a UI React
├── src/                         # Aplicação React + TypeScript (UI Desktop)
│   ├── components/              # Componentes de interface e ferramentas
│   ├── services/                # Motores de processamento de PDF local
│   ├── App.tsx                  # Contêiner Principal
│   └── index.css                # Design System com TailwindCSS
├── compilar-desktop.bat         # Script de compilação rápida para Windows
├── compilar-desktop.sh          # Script de compilação rápida para macOS / Linux
├── package.json                 # Configurações do electron-builder e scripts
└── README.md                    # Documentação principal
```

---

## 💻 Requisitos e Execução em Desenvolvimento

### Requisitos:
* **Node.js**: `v18.0.0` ou superior.
* **NPM**: `v9.0.0` ou superior.

### Como Iniciar em Modo de Desenvolvimento:
```bash
# 1. Instalar dependências do projeto
npm install

# 2. Executar em ambiente de desenvolvimento (Vite + Electron)
npm run dev
```

---

## 📦 Compilando os Instaladores Desktop

### No Windows:
Dê dois cliques no arquivo `compilar-desktop.bat` ou execute no terminal:
```cmd
compilar-desktop.bat
```
Os executáveis (`.exe` NSIS e versão portátil) serão gerados na pasta `release/`.

### No macOS / Linux:
Execute o script bash:
```bash
chmod +x compilar-desktop.sh
./compilar-desktop.sh
```
Os pacotes `.dmg` (Mac) e `.AppImage` (Linux) serão gerados na pasta `release/`.
