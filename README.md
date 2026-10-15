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
| **Marcação Visual** (`applyVisualOverlay`) | ❌ FAIL (Recuperável) | ❌ FAIL (Recuperável) | ⚠️ OK (Visual) | ❌ FAIL (Recuperável) | ❌ FAIL (Recuperável) | **Vulnerável (Rascunho)** |
| **Anonimização Segura** (`anonymizePdf`) | ✅ OK (Destruído) | ✅ OK (Destruído) | ✅ OK (Sólido) | ✅ OK (Zero ocorrências) | ✅ OK (Zero ocorrências) | **Protegido (Definitivo)** |

### 🔒 Separação Estrita de Contratos de API
* **Marcação Visual Preliminar (`applyVisualOverlay`)**: Aplica retângulos gráficos vetoriais sobre o documento original exclusivamente para conferência de layout na interface ou rascunho de conferência. Não destrói a camada de texto.
* **Anonimização Segura Definitiva (`anonymizePdf` / `redactPdf`)**: Destrói incondicionalmente todos os fluxos de texto sob as tarjas e expurga formulários (`/AcroForm`), assinaturas (`/SigFlags`), anexos (`/EmbeddedFiles`, `/Names`), camadas ocultas (`/OCProperties`) e metadados. **Nenhum chamador pode desativar a destruição de conteúdo nesta operação** (opções inseguras como `sanitizeFlatten: false` são expressamente rejeitadas).

### 📐 Resiliência a Documentos Complexos & Casos de Borda
Testado e homologado via `npm run test:pdf-edge-cases`:
* **Formulários Interativos (`AcroForm`)**: Expurgo completo de dicionários e widgets interativos, eliminando valores confidenciais armazenados em campos.
* **Assinaturas Digitais (`SigFlags` e `Perms`)**: Remoção de metadados de certificação de signatários anteriores para resguardar dados pessoais.
* **Camadas Ocultas (`OCG / OCProperties`) & Anexos Embutidos**: Purga total de anexos e fluxos invisíveis desligados.
* **Páginas com Rotações Variadas (0°, 90°, 180°, 270°)**: Preservação milimétrica da orientação visual de leitura.
* **Páginas Grandes (Plantas / Formato A0 / 2384x3370 pt)**: Resolução adaptativa dinâmica com teto de 25 megapixels, prevenindo estouro de memória (OOM) e controlando o tamanho do arquivo.

> 💡 **Nota sobre Pesquisabilidade (Ctrl+F) e Acessibilidade:** A destruição física da camada vetorial de texto é o único método tecnicamente infalível contra extração forense sob tarjas. Contudo, essa operação remove a capacidade de pesquisa por texto na página anonimizada. Para processos judiciais que exigem conformidade estrita com indexação textual e acessibilidade sem comprometer o sigilo LGPD, submeta o documento anonimizado final ao módulo **OCR Local & Scanner**, que recriará uma camada de texto limpa apenas sobre os dados remanescentes não tarjados.

### 🛡️ Controle Estrito de Caminhos e Exportação de Sessão (Princípio do Menor Privilégio)

O sistema de segurança do Electron implementa controle estrito baseado em capacidades (`npm run test:path-security` e `npm run test:path-integration`):

* **Eliminação de Ampliação de Privilégio**: A seleção de um arquivo autoriza estritamente o arquivo em si (`sessionAuthorizedFiles`). Seu diretório pai **não** é adicionado a `sessionAuthorizedDirectories`. Requisições IPC para abrir ou navegar em diretórios arbitrários via `system:openPath` são sumariamente rejeitadas.
* **Ciclo de Exportação com Autorização Nativa**: A rotina `file:saveExportedFile` no processo principal grava o buffer em disco, valida os Magic Bytes reais do arquivo exportado (impedindo qualquer camuflagem de binários) e autoriza imediatamente o novo arquivo na sessão.
* **Abertura e Revelação Seguras**: Arquivos recém-exportados podem ser abertos (`system:openPath`) ou revelados no explorador de arquivos (`system:showItemInFolder`) diretamente pela interface React sem qualquer bloqueio de permissão.
* **Proteção Pós-Exportação e Isolamento**: Arquivos irmãos não selecionados no mesmo diretório permanecem inacessíveis e qualquer adulteração física no disco (tampering com binários PE/ELF) é imediatamente detectada e bloqueada por inspeção de cabeçalhos.

### 🤖 Diagnóstico e Homologação de IA Local em 4 Níveis

Para certificar que a inteligência artificial local não apenas está respondendo na rede, mas é funcional e apta a processar documentos jurídicos, o sistema adota uma esteira de diagnóstico em 4 níveis (`npm run test:ai-diagnostics`):

1. **Nível 1 — Disponibilidade do Servidor HTTP (`serverAvailable`)**: Checagem de socket em `/health` na porta local 18888.
2. **Nível 2 — Modelo Carregado em Memória (`modelLoaded`)**: Consulta a `/v1/models` para confirmar que os pesos neurais estão alocados na memória RAM/VRAM.
3. **Nível 3 — Inferência Funcional & Obediência a Instrução (`inferenceFunctional`)**: Envio de prompt de controle exigindo estritamente a palavra `PRONTO`. Rejeita qualquer resposta que não cumpra a restrição negativa/formato solicitado.
4. **Nível 4 — Qualidade e Competência Jurídica Homologada (`legalQualityValidated`)**: Submissão de caso sintético sobre verbas rescisórias e jornada de trabalho, avaliando se a resposta do modelo identifica corretamente o ramo (**Direito Trabalhista**) e o diploma normativo (**CLT**).

#### ⏱️ Tolerância a Cold-Start e Aquecimento Inicial
Modelos locais de 8B parâmetros em CPU/GPU podem apresentar latência elevada na primeira inferência (alocação de tensores mmap e compilação de cache KV). O diagnóstico agora detecta esse estado com janela estendida (8s) e classifica a máquina como `warming_up` (**Modelo em Aquecimento Inicial**), sem derrubar falsamente o status para "Servidor Offline".

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

---

## 🛡️ Assinatura Digital e Procedência Institucional

Para implantação em órgãos públicos, tribunais e escritórios de advocacia, o KovaxFiles segue padrões rigorosos de distribuição:
* **Assinatura Digital Obrigatória em Release**: Compilações oficiais no canal de release exigem certificado digital corporativo (`WIN_CSC_LINK` com `forceCodeSigning=true`). O pipeline de CI/CD aborta automaticamente caso a assinatura não esteja configurada, impedindo a publicação acidental de binários não assinados.
* **Validação Criptográfica de Atualizações**: A diretiva `verifyUpdateCodeSignature: true` está rigorosamente habilitada no empacotador, impedindo que o mecanismo de atualização receba ou execute binários que não provenham da chave criptográfica do publicador original.
* **Distinção entre Integridade (SHA-256) e Autoria (Assinatura Digital)**: A lista de hashes `SHA256SUMS.txt` atesta apenas a integridade física de transporte do download. A autenticidade da autoria, reputação do SmartScreen e não-repúdio são garantidos exclusivamente pela assinatura digital Authenticode embutida no `.exe`.
* **Homologação Corporativa**: Consulte [docs/SECURITY_DISTRIBUTION.md](docs/SECURITY_DISTRIBUTION.md) para o guia completo de auditoria forense via PowerShell (`Get-AuthenticodeSignature`, `Get-FileHash`), requisitos para certificados EV / ICP-Brasil e parâmetros de whitelist para AppLocker e Windows Defender Application Control (WDAC).

