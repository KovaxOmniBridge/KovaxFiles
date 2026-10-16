# Organização das Baterias de Testes e Integração Contínua (CI/CD)

Este documento consolida a arquitetura completa de qualidade de software, testes automatizados e pipelines de integração contínua implementada no **KovaxFiles Desktop**.

---

## 1. Matriz de Baterias de Testes

| Suíte | Arquivo de Implementação | O Que Comprova | Quando Executar | Status |
| :--- | :--- | :--- | :---: | :---: |
| **1. Build** | [tests/suites/build.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/build.test.ts) | Tipagem estrita TypeScript (`tsc --noEmit`), imports, dependências e presença de assets offline (`tessdata`, fontes locais). | Todo commit / PR | ✅ 4/4 Passados |
| **2. Segurança Electron** | [tests/suites/electron_security.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/electron_security.test.ts) | Sandbox ativo, `contextIsolation: true`, bloqueio de `nodeIntegration`, Content Security Policy (CSP) estrito, bloqueio de navegação externa indevida e validação rigorosa de remetente IPC. | Todo PR | ✅ 4/4 Passados |
| **3. PDF** | [tests/suites/pdf.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/pdf.test.ts) | Ciclo de vida completo de documentos PDF: abrir, rotacionar 90°, remover páginas, adicionar novas páginas, salvar, reabrir e inspecionar conteúdo via `pdf-lib` e `pdfjs-dist`. | Todo PR | ✅ 4/4 Passados |
| **4. LGPD** | [tests/suites/lgpd.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/lgpd.test.ts) | Detecção e tarjamento de dados sensíveis (CPF, CNPJ, e-mails, processos CNJ), ausência total de vazamento textual residual, isolamento estrito sem contaminação entre lotes e relatórios revisáveis. | Todo PR | ✅ 3/3 Passados |
| **5. Criptografia** | [tests/suites/crypto.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/crypto.test.ts) | Criptografia ISO 32000 AES-256 de senhas corretas, rejeição de senhas incorretas/vazias, leitura reversível e Cofre Forte AES-GCM 256 bits com PBKDF2 (100.000 iterações). | Todo PR | ✅ 5/5 Passados |
| **6. DOCX** | [tests/suites/docx.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/docx.test.ts) | Validade estrita ISO/IEC 29500 (OOXML), integridade de arquivos obrigatórios (`[Content_Types].xml`, `_rels/.rels`, `word/document.xml`), sanitização HTML e preservação semântica de parágrafos e tabelas. | Todo PR | ✅ 3/3 Passados |
| **7. OCR** | [tests/suites/ocr.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/ocr.test.ts) | Reconhecimento óptico, geração de Sandwich PDF com camada de texto invisível sobreposta com coordenadas exatas, preservação visual da digitalização e pesquisa indexável. | Todo PR | ✅ 3/3 Passados |
| **8. PAdES** | [tests/suites/pades.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/pades.test.ts) | Assinatura digital PAdES-BES com estrutura `/ByteRange` e PKCS#7, detecção de certificado autoassinado (não-ICP), digest SHA-256 e detecção imediata de adulteração de bytes pós-assinatura. | Todo PR | ✅ 4/4 Passados |
| **9. Protocolo** | [tests/suites/protocolo.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/protocolo.test.ts) | Inspeção com SHA-256 por peça, divisão real de volumes respeitando cota máxima em bytes, montagem de autos, chancela de paginação e manifesto oficial de juntada com sumário. | Todo PR | ✅ 4/4 Passados |
| **10. Acervo** | [tests/suites/acervo.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/acervo.test.ts) | Restrição estrita a domínios governamentais (`*.jus.br`, `*.gov.br`), distinção de URN LexML provisória vs oficial, controle de histórico e versões de revogação/suspensão (SV 30) e 62 Súmulas Vinculantes. | Todo PR | ✅ 5/5 Passados |
| **11. Adversarial (Fuzzing/Chaos)** | [tests/suites/adversarial.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/adversarial.test.ts) | Suíte de resiliência a ataques e falhas extremas: PDFs corrompidos, Zip Slip, bombas ZIP, documentos de 5.000 páginas sob `MemoryBudget`, colisão de nomes, certificados forjados e XSS. | Todo PR | ✅ 12/12 Passados |
| **12. Desktop Empacotado** | [tests/suites/desktop_packaged.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/desktop_packaged.test.ts) | Validação de bundles de produção (`dist/`, `dist-electron/`), Zero-Dev Environment (ausência de referências a `src/` ou `node_modules` de desenvolvimento) e configuração segura do `electron-builder`. | Antes de Release | ✅ 4/4 Passados |
| **13. Desempenho e Carga** | [tests/suites/performance_load.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/performance_load.test.ts) | Processamento em lote sob carga pesada (500 itens), medição de estabilidade de memória Heap, tolerância a falhas parciais (status `"partial"`) e recuperação de sessão após queda. | Periódica e Antes de Release | ✅ 3/3 Passados |

---

## 2. Cobertura da Suíte Adversarial (Chaos & Fuzzing)

A suíte [tests/suites/adversarial.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/adversarial.test.ts) foi construída especificamente para neutralizar vetores hostis de entrada:

1. **PDFs Corrompidos e Truncados:**
   - Detecção de arquivos truncados no meio do stream e bloqueio por *magic bytes* (`%PDF-`) de arquivos arbitrários disfarçados de PDF.
2. **ZIPs Malformados e Ataques Zip Slip:**
   - Tentativas de travessia de diretório (`../../evil.sh`) dentro de arquivos `.docx` são interceptadas com `DocxSecurityError` antes de qualquer gravação em disco.
   - Detecção de bombas estruturais de descompressão (contagem abusiva de entradas).
3. **Documentos de Milhares de Páginas e Limites de Memória:**
   - Fatiamento cooperativo com `MemoryBudgetService` para processamento sequencial de até 5.000 páginas sem estourar o Heap de 512 MB.
   - Cancelamento limpo via `CancellationTokenSource`, interrompendo operações em andamento sem deixar resíduos declarados como concluídos.
4. **Criptografia com Entradas Extremas:**
   - Rejeição segura e sem estouro de buffer de senhas excessivamente longas (> 50.000 caracteres).
5. **Nomes de Arquivos Perigosos, Caracteres Nulos e Caminhos UNC:**
   - Bloqueio estrito de injeção de byte nulo (`\0`) que poderia burlar checagens de extensão no C++ do Node/OS.
   - Bloqueio imediato de caminhos de rede UNC (`\\malicious-host\share`) para impedir vazamento de credenciais NTLM.
   - Resolução determinística de colisão de nomes de arquivos idênticos no mesmo lote documental via identificadores imutáveis.
6. **Certificados Digitais Forjados e Assinaturas Corrompidas:**
   - Rejeição controlada de buffers ASN.1 e PKCS#7 inválidos sem travamento do processo principal.
7. **Documentos Digitalizados com Ruído Extremo:**
   - Disparo de `ImagePreservationError` quando a extração de rasterização falha, impedindo a geração de PDFs pesquisáveis em branco ou corrompidos.
8. **Injeção de Tags Maliciosas e Vetores XSS:**
   - Sanitização de HTML e estilos CSS incorporados via `HtmlSanitizer`, neutralizando vetores polimórficos de script em exportações DOCX/PDF.

---

## 3. Comandos de Execução no Terminal

```bash
# 1. Executar bateria rápida completa de Pull Request (11 suítes em ~45s)
npm run test:pr

# 2. Executar suíte de auditoria do pacote de produção (Desktop Empacotado)
npm run test:release

# 3. Executar suíte periódica de desempenho, memória e carga
npm run test:load

# 4. Executar suíte adversarial isolada
npm run test:adversarial

# 5. Executar suítes específicas individualmente
npm run test:suite:build
npm run test:suite:security
npm run test:suite:pdf
npm run test:suite:lgpd
npm run test:suite:crypto
npm run test:suite:docx
npm run test:suite:ocr
npm run test:suite:pades
npm run test:suite:protocolo
npm run test:suite:acervo
```

---

## 4. Pipeline de Integração Contínua (GitHub Actions)

O arquivo [.github/workflows/ci.yml](file:///d:/KovaxOminiBridge/KovaxFilesApp/.github/workflows/ci.yml) implementa uma estratégia de execução em camadas (*Tiered CI*):

### Tier 1: Fast PR Battery (Todo Commit e Pull Request)
- **Matriz Multiplataforma:** Ubuntu (`ubuntu-latest`), Windows (`windows-latest`) e macOS (`macos-latest`).
- **Gatilhos:** `push` em branches principais e abertura/atualização de `pull_request`.
- **Duração Total:** ~45 a 60 segundos por plataforma.
- **Passos:**
  1. Checkout do repositório.
  2. Setup de Node.js v20 com cache inteligente de dependências (`npm cache`).
  3. Verificação de assets offline essenciais (`npx tsx scripts/prepare_offline_tessdata.ts`).
  4. Execução da Bateria de PR unificada (`npx tsx scripts/run_pr_test_battery.ts`).
  5. Publicação de relatório com status detalhado das 11 suítes.

### Tier 2: Heavy Load, Packaging & Security (Agendado / Disparo Manual)
- **Gatilhos:** Agendamento noturno (`schedule: cron '0 3 * * *'`) e disparo manual sob demanda (`workflow_dispatch`).
- **Passos:**
  1. Build de distribuição de produção (`npm run build`).
  2. Testes de integridade do pacote desktop empacotado (`npm run test:release`).
  3. Testes de carga e estabilidade de Heap com documentos volumosos (`npm run test:load`).
  4. Execução dos testes de stress e benchmarks de throughput (`npm run test:stress`, `npm run benchmark`).
