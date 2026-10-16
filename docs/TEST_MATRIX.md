# Matriz de Testes e Documentos Cobertos — KovaxFiles Desktop

Este documento detalha os ambientes de execução, sistemas operacionais e as tipologias de documentos cobertos pelas baterias de testes automatizados do **KovaxFiles Desktop**.

---

## 1. Matriz de Ambientes e Sistemas Operacionais

| Plataforma / SO | Arquitetura | Ambiente de Execução | Frequência de Teste | Finalidade |
| :--- | :---: | :---: | :---: | :--- |
| **Windows 11 / 10** | `x64` | GitHub Actions (`windows-latest`) e Local | Todo PR / Commit | Validação de instalador NSIS, Portable, Authenticode e Windows Sandbox. |
| **macOS (Sonoma / Ventura)** | `x64` e `arm64` | GitHub Actions (`macos-latest`) | Todo PR / Commit | Validação de pacotes DMG/ZIP, Hardened Runtime e integridade Apple Silicon. |
| **Ubuntu Linux (22.04 / 24.04)** | `x64` | GitHub Actions (`ubuntu-latest`) | Todo PR / Commit | Validação de compilação sem cabeça (headless), AppImage e DEB. |

---

## 2. Tipologias Documentais e Cenários Cobertos

### 2.1. Documentos PDF
- **PDFs Padrão e Íntegros:** Documentos judiciais e administrativos com fluxos de texto vetorial, fontes embutidas (TrueType/Type1), imagens JPEG e formulários interativos.
- **PDFs Corrompidos e Truncados:** Fluxos de bytes cortados na metade do stream, arquivos com cabeçalhos ausentes ou danificados e ponteiros de tabela cruzada (`xref`) inválidos.
- **PDFs Protegidos por Senha:** Documentos criptografados com algoritmo AES-256 (ISO 32000), validação de senhas corretas, rejeição de senhas erradas e resiliência a senhas anômalas com mais de 50.000 caracteres.
- **Documentos de Volume Extremo:** Simulação de processos de **5.000 páginas** sob controle estrito do `MemoryBudgetService`, comprovando estabilidade de consumo de Heap (< 512 MB) e ausência de travamentos por *Out of Memory*.

### 2.2. Arquivos DOCX e Estruturas OOXML
- **Modelos Contratuais e Petições:** Documentos formatados com cabeçalhos hierárquicos, tabelas complexas e estilos semânticos.
- **DOCX Adversariais (Zip Slip):** Arquivos manipulados contendo caminhos maliciosos (`../../evil.sh` ou caminhos absolutos) para testar a contenção pelo descompactador `safeUnzipDocx`.
- **Bombas Estruturais de Descompressão:** Arquivos ZIP com contagem abusiva de entradas (> 10.000 arquivos) bloqueados por cota de segurança.

### 2.3. Assinaturas Digitais e Certificados PAdES
- **Assinaturas PAdES-BES Válidas:** Documentos com assinatura digital PKCS#7 embutida em `/ByteRange`, verificando digest SHA-256 e emissor ICP-Brasil.
- **Documentos Adulterados:** PDFs modificados em 1 único byte pós-assinatura, comprovando que a verificação acusa violação de integridade.
- **Certificados Não Confiáveis:** Certificados autoassinados fora da cadeia oficial brasileira, classificados com ressalva no laudo técnico.
- **Buffers ASN.1 Danificados:** Cargas de certificados intencionalmente corrompidas para validar que o motor emite erro tratado sem quebrar o processo principal.

### 2.4. Entradas Maliciosas e Injeções de Script (XSS)
- **Metadados Hostis:** Nomes de arquivos, títulos e campos de minutas contendo payloads polimórficos de script (`<script>alert(1)</script>`, `onerror=`, `javascript:`), neutralizados pelo `HtmlSanitizer`.
- **Nomes de Arquivos Perigosos:** Injeções de caractere nulo (`\0`) e caminhos de rede UNC (`\\servidor-hostil\share`) bloqueados na camada de sanitização de caminhos.

---

## 3. Resumo das Suítes Automatizadas

| Suíte | Implementação | Frequência | Tempo Médio |
| :--- | :--- | :---: | :---: |
| **1. Build** | [tests/suites/build.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/build.test.ts) | Todo PR / Commit | ~24s |
| **2. Segurança Electron** | [tests/suites/electron_security.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/electron_security.test.ts) | Todo PR | ~2s |
| **3. PDF** | [tests/suites/pdf.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/pdf.test.ts) | Todo PR | ~3s |
| **4. LGPD** | [tests/suites/lgpd.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/lgpd.test.ts) | Todo PR | ~2s |
| **5. Criptografia** | [tests/suites/crypto.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/crypto.test.ts) | Todo PR | ~3s |
| **6. DOCX** | [tests/suites/docx.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/docx.test.ts) | Todo PR | ~2s |
| **7. OCR** | [tests/suites/ocr.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/ocr.test.ts) | Todo PR | ~3s |
| **8. PAdES** | [tests/suites/pades.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/pades.test.ts) | Todo PR | ~3s |
| **9. Protocolo Judicial** | [tests/suites/protocolo.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/protocolo.test.ts) | Todo PR | ~2.5s |
| **10. Acervo Jurídico** | [tests/suites/acervo.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/acervo.test.ts) | Todo PR | ~2s |
| **11. Adversarial (Fuzzing/Chaos)** | [tests/suites/adversarial.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/adversarial.test.ts) | Todo PR | ~3s |
| **12. Desktop Empacotado** | [tests/suites/desktop_packaged.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/desktop_packaged.test.ts) | Antes de Release | ~2s |
| **13. Desempenho e Carga** | [tests/suites/performance_load.test.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/suites/performance_load.test.ts) | Periódica e Release | ~1s |
