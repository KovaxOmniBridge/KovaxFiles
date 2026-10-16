# Arquitetura e Organização Técnica — KovaxFiles Desktop

Este documento descreve a organização estrutural, o modelo de camadas, os contratos fundamentais e as garantias de isolamento do **KovaxFiles Desktop**.

---

## 1. Visão Geral e Princípios Arquiteturais

O **KovaxFiles Desktop** é uma plataforma de engenharia documental desenvolvida para operar exclusivamente em ambientes locais (tribunais, procuradorias, prefeituras e escritórios de advocacia), orientada pelos seguintes pilares:

1. **Privacidade e Isolamento Total (Air-Gapped por Padrão):** O processamento de dados confidenciais, peças judiciais e segredos de justiça ocorre 100% no dispositivo do usuário, sem dependência de nuvem, APIs externas ou envio de telemetria remota.
2. **Separação Rígida de Responsabilidades:** O núcleo do sistema é independente da interface gráfica e do framework de apresentação.
3. **Resiliência a Falhas e Cancelamento Cooperativo:** Operações em lote suportam interrupção em tempo real via tokens cooperativos sem corrupção de saídas parciais.
4. **Precisão Epistêmica e Rigor Forense:** Nenhuma conclusão jurídica ou criptográfica é declarada sem correspondência estrita com as evidências efetivamente verificadas pelo motor local.

---

## 2. Mapa Estrutural do Repositório

```
KovaxFilesApp/
├── src/
│   ├── core/                      # Regras de negócio puras (agnósticas de framework)
│   │   ├── documents/             # Manipulação e estruturação de documentos
│   │   ├── redaction/             # Motores de tarjamento LGPD e detecção de PII
│   │   ├── compression/           # Otimização e re-amostragem de fluxos PDF
│   │   ├── ocr/                   # Reconhecimento óptico e geração de PDF pesquisável
│   │   ├── signatures/            # Validação e aposição de assinaturas PAdES-BES
│   │   ├── court-filing/          # Divisão de volumes, paginação e protocolos judiciais
│   │   └── legal-corpus/          # Repositório jurisprudencial, súmulas e proveniência
│   ├── infrastructure/            # Adaptadores de sistema, persistência e motores criptográficos
│   │   ├── filesystem/            # Abstrações de sistema de arquivos e sanitização de paths
│   │   ├── storage/               # Persistência IndexedDB e cofre forte local (.kvx)
│   │   ├── crypto/                # Implementação WebCrypto, chaves PBKDF2 e AES-GCM
│   │   ├── pdf/                   # Adaptadores sobre pdf-lib e pdfjs-dist
│   │   └── ocr-runtime/           # Orquestração do Tesseract WASM offline e workers
│   ├── features/                  # Orquestração de casos de uso vinculados à interface
│   │   ├── editor/                # Edição de minutas e exportação profissional
│   │   ├── redactor/              # Anonimização em lote e revisão humana
│   │   ├── compressor/            # Otimização com preservação de custódia
│   │   ├── court-filing/          # Montagem de autos e chancela forense
│   │   ├── legal-search/          # Busca factual em súmulas e legislação
│   │   └── digital-signature/     # Inspeção criptográfica PAdES
│   ├── shared/                    # Tipos universais, validação e contratos
│   │   ├── contracts/             # Interfaces de operação, cancelamento e progresso
│   │   ├── errors/                # Hierarquia de erros tipados do sistema
│   │   ├── validation/            # Validadores de entrada e sanitização HTML/path
│   │   └── telemetry/             # Métricas de execução locais (sem transmissão)
│   └── components/                # Componentes de apresentação React e UI
├── electron/
│   ├── main/                      # Ciclo de vida do processo principal do Electron
│   ├── preload/                   # Scripts de contexto seguro (contextBridge)
│   └── ipc/                       # Handlers de IPC e validadores de remetente
├── public/                        # Assets estáticos empacotados offline (tessdata, fontes)
├── tests/
│   ├── suites/                    # 13 Baterias de testes automatizados (PR, Carga, Release)
│   ├── unit/                      # Testes unitários de contratos e persistência
│   ├── security/                  # Testes de isolamento de rede e sandbox
│   └── fixtures/                  # Documentos sintéticos para testes determinísticos
└── docs/                          # Governança técnica, matriz de testes e proveniência
```

---

## 3. As Quatro Camadas do Sistema

### 3.1. Núcleo de Domínio (`src/core/`)
- Contém a lógica de negócio pura, determinística e livre de dependências de UI (React) ou Electron.
- Exemplo: `CoreRedactionEngine` localiza e substitui dados sensíveis com base em expressões forenses e coordenadas físicas de caixas delimitadoras (*bounding boxes*).
- Não realiza chamadas diretas a APIs de disco ou rede; consome apenas abstrações injetadas.

### 3.2. Infraestrutura e Adaptadores (`src/infrastructure/`)
- Implementa os contratos de acesso a recursos físicos:
  - **PDF:** Manipulação de baixo nível de dicionários e objetos via `pdf-lib` e rasterização via `pdfjs-dist`.
  - **Criptografia:** Derivação de chave PBKDF2 com 100.000 iterações e encriptação AES-GCM 256 bits via `@peculiar/webcrypto` / WebCrypto nativo.
  - **OCR Local:** Tesseract WASM carregado a partir de arquivos locais empacotados em `public/tessdata/`.

### 3.3. Interface e Casos de Uso (`src/features/` & `src/components/`)
- Componentes React responsáveis pela apresentação visual, feedback de progresso e revisão humana.
- Mantêm estados transitórios de tela sem poluir o núcleo de processamento.
- Nunca declaram "sucesso absoluto" ou "validade jurídica irrefutável": reportam rigorosamente as evidências técnicas retornadas pela camada de infraestrutura.

### 3.4. Processo Electron e Segurança de IPC (`electron/`)
- **Isolamento de Renderização:** `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
- **Preload Seguro:** Expõe estritamente as funções autorizadas via `contextBridge` (`openPath`, `showItemInFolder`, `saveFile`).
- **Validação de Remetente IPC:** Em [electron/ipc/ipcValidator.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/electron/ipc/ipcValidator.ts), todo evento IPC tem sua URL de origem inspecionada para garantir que provém unicamente do bundle estático empacotado.

---

## 4. Ciclo de Vida e Contratos de Operação

Todas as operações documentais intensivas seguem o contrato formal definido em [src/shared/contracts/operation.types.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/src/shared/contracts/operation.types.ts):

```typescript
export interface IOperationContext {
  readonly operationId: string;
  readonly cancellationToken: ICancellationToken;
  readonly progress: IProgressReporter;
  readonly memoryBudget: IMemoryBudget;
}
```

1. **Cancelamento Cooperativo em Tempo Real:** Cada fatia ou página processada verifica `cancellationToken.isCancelled`. Se o usuário interromper a operação, o lote é finalizado imediatamente sem registrar saídas corrompidas.
2. **Tolerância a Falhas em Lote:** Se 2 de 10 documentos falharem por corrupção estrutural, a operação resulta em status `"partial"`, preservando integralmente os 8 documentos válidos com laudo detalhado.
3. **Gestão de Memória:** O `MemoryBudgetService` divide documentos volumosos (acima de 50 páginas ou 50 MB) em blocos processados sequencialmente, forçando a reciclagem de buffers para manter o Heap do Chromium abaixo de 512 MB.
