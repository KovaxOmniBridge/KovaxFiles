# Operação Offline e Ambientes Desconectados (Air-Gapped) — KovaxFiles Desktop

Este documento descreve as garantias de funcionamento autônomo, os recursos empacotados localmente e o comportamento do **KovaxFiles Desktop** em computadores sem conexão à internet.

---

## 1. Princípio do Isolamento Local Total (Air-Gapped)

O **KovaxFiles Desktop** foi concebido para atender órgãos de segurança pública, gabinetes judiciais e bancas de advocacia que lidam com segredos de justiça em redes corporativas desconectadas da internet.

- **Primeira Execução 100% Funcional:** O aplicativo não requer download de componentes adicionais após a instalação. Ao ser aberto pela primeira vez em um computador sem placa de rede ou sem acesso à web, todas as funcionalidades operam imediatamente.
- **Ausência de Telemetria Remota:** Não há rastreadores, scripts do Google Analytics, Sentry ou beacons de telemetria. Logs de erro e métricas de desempenho ficam restritos à memória da sessão do usuário.
- **Bloqueio de Requisições Externas:** O teste automatizado [tests/security/offline_network_guard.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/security/offline_network_guard.test.ts) comprova que o sistema não realiza chamadas não autorizadas via `fetch`, `XMLHttpRequest` ou `WebSocket` durante o processamento documental.

---

## 2. Inventário de Recursos Empacotados Offline

O processo de compilação empacota previamente todos os motores e modelos necessários para as operações:

| Recurso / Ativo | Localização no Pacote | Finalidade | Comportamento Offline |
| :--- | :--- | :--- | :--- |
| **por.traineddata** | `dist/tessdata/por.traineddata` (2.42 MB) | Reconhecimento óptico de caracteres em português (Tesseract). | Carregado diretamente do disco local via Web Worker; sem requisições ao GitHub ou CDN. |
| **Tesseract Core WASM** | `dist/tessdata/tesseract-core-*.wasm` | Motor compilado C++ em WebAssembly para execução de OCR. | Execução nativa no motor Chromium em sandbox sem chamada externa. |
| **PDF.js Worker** | `dist/assets/pdf.worker.*.js` | Parsing, extração de texto e renderização gráfica de PDFs. | Bundled pelo Vite diretamente nos assets de produção locais. |
| **Fontes Tipográficas** | `public/fonts/` e `dist/fonts/` | Renderização visual e exportação de relatórios PDF/DOCX. | Fontes da família Liberation empacotadas para garantir fidelidade visual independente das fontes do SO. |
| **Acervo Jurisprudencial** | `src/data/*.ts` (compilado em `dist/`) | Súmulas Vinculantes do STF, Súmulas do STJ/TST e Legislação Federal. | Base vetorial indexada localmente, disponível instantaneamente para consulta e cópia de citações. |

---

## 3. Comportamento em Redes Desconectadas

1. **OCR Local:** Opera sem latência de rede. O worker carrega o modelo de idioma do disco e processa as imagens diretamente na memória RAM.
2. **Compressão e Higienização de PDF:** A re-amostragem de imagens via Canvas HTML5 e a remontagem de objetos com `pdf-lib` utilizam apenas o motor gráfico do Chromium empacotado no Electron.
3. **Cofre Forte e Criptografia:** A chave PBKDF2 e o algoritmo AES-GCM são processados via WebCrypto do navegador, sem envio de chaves para servidores de autenticação.
4. **Assinatura Digital PAdES:** A verificação estrutural (/ByteRange, digest SHA-256 e decodificação PKCS#7) ocorre offline. Quando o computador estiver desconectado, o sistema emite o laudo técnico informando que a verificação de revogação LCR/OCSP em tempo real requer consulta externa e orienta a validação pelo portal oficial VALIDAR do ITI.
