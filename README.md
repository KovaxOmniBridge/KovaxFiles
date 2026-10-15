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
3. **Anonimização LGPD & Sanitização Documental**: A plataforma oferece detecção inteligente de dados sensíveis e sanitização documental. A anonimização efetiva contra extração forense exige o descarte físico de fluxos de texto (Achatamento Rasterizado / Flattening 300 DPI), uma vez que a simples sobreposição de retângulos visuais preserva os dados no fluxo vetorial original. Expressões de anonimização irreversível estão sujeitas aos limites e diretrizes da bateria forense de testes integrada.

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
- Identificação de CPFs, CNPJs, RGs, e-mails e termos customizados via Regex e IA local.
- Cobertura de termos com tarjas e opção de sanitização profunda por Achatamento Rasterizado (Flattening 300 DPI) para destruição física de camadas de texto, anotações e formulários.
- Bateria de testes de segurança automatizada para validação contra extração de texto, inspeção de objetos e análise forense de pixels.

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

## 🔬 Auditoria Forense de Anonimização (Bateria de Testes em 5 Vetores)

A garantia de anonimização exige mais do que desenhar um retângulo preto sobre o documento. Um arquivo PDF convencional pode preservar texto subjacente, anotações (`/Annots`), formulários (`/AcroForm`), árvores de acessibilidade (`/StructTreeRoot`) e metadados XMP mesmo sob tarjas visuais.

Para validar a integridade dos dados tarjados, o repositório disponibiliza uma suíte de testes de estresse forense:

```bash
npm run test:security-redaction
```

A bateria submete o documento a **5 vetores de ataque independentes**:
1. **Extração de Texto**: Tenta recuperar dados por múltiplos motores independentes (`pypdf`, `pdfminer.six`, `pymupdf`).
2. **Inspeção de Objetos e Streams**: Analisa streams `/Contents` descomprimidos, dicionários de anotações (`/Annots`), campos de formulário (`/AcroForm`) e metadados.
3. **Renderização e Forense de Pixels**: Renderiza a 300 DPI e faz amostragem RGB dentro das caixas delimitadoras para certificar 100% de cobertura sólida (ausência de vazamento de contornos ou canal alfa).
4. **Pesquisa e Pattern Matching**: Executa buscas por regex de PIIs e busca literal de caracteres (`Ctrl+F`).
5. **Ferramentas Independentes & Byte-Level Carving**: Varre o binário bruto do arquivo PDF e decodifica streams zlib em busca de ocorrências de dados.

### Matriz de Resiliência Validada

| Método de Anonimização | Extração de Texto | Inspeção de Streams/Objetos | Pixels / Bleed | Pesquisa / Ctrl+F | Carving Binário | Veredito |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Tarja Vetorial Simples** (Apenas retângulo preto) | ❌ FAIL (Recuperável) | ❌ FAIL (Recuperável) | ⚠️ OK (Visual) | ❌ FAIL (Recuperável) | ❌ FAIL (Recuperável) | **Vulnerável** |
| **Sanitização por Achatamento** (Raster 300 DPI) | ✅ OK (Destruído) | ✅ OK (Destruído) | ✅ OK (Sólido) | ✅ OK (Zero ocorrências) | ✅ OK (Zero ocorrências) | **Protegido** |

> ⚠️ **Aviso de Segurança:** A expressão *anonimização irreversível* refere-se exclusivamente ao modo de sanitização por achatamento rasterizado auditado. O tarjamento vetorial simples é uma sobreposição visual e não deve ser utilizado isoladamente quando houver risco de extração técnica por terceiros.

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
