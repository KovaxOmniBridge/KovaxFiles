# Changelog — KovaxFiles Desktop

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [1.0.0] - 2026-10-16

### Adicionado
- **Nova Organização das Baterias de Testes Automatizados:**
  - 13 suítes formais cobrindo Build, Segurança Electron, PDF Lifecycle, LGPD, Criptografia, DOCX OOXML, OCR Documental, PAdES-BES, Protocolo Judicial, Acervo Jurídico, Testes Adversariais, Desktop Empacotado e Desempenho/Carga.
  - Script orquestrador de Pull Request ([scripts/run_pr_test_battery.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/scripts/run_pr_test_battery.ts)) com sumário executivo em tabela formatada (~45s de execução).
- **Suíte de Testes Adversariais e Chaos Testing:**
  - Resiliência contra 8 vetores hostis: PDFs truncados, arquivos de fuzzing binário, ataques Zip Slip (`../../`), bombas estruturais de descompressão, documentos de 5.000 páginas sob `MemoryBudget`, colisão de nomes de arquivos, certificados ASN.1 danificados e injeções polimórficas de XSS em metadados.
- **Estabilização de Release e Governança de Distribuição:**
  - Portão obrigatório de CI preliminar no workflow de publicação ([.github/workflows/build-release.yml](file:///d:/KovaxOminiBridge/KovaxFilesApp/.github/workflows/build-release.yml)), impedindo o build de instaladores caso qualquer suíte reprove.
  - Gerador e validador estrito de manifesto criptográfico ([scripts/generate_release_manifest.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/scripts/generate_release_manifest.ts)) com exigência mandatória das três plataformas (`--require=win,mac,linux`) e eliminação total de mascaramento por `|| true`.
  - Script de auditoria estática pré-release ([scripts/verify_release_distribution_package.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/scripts/verify_release_distribution_package.ts)) cobrindo 14 critérios de assinatura, arquitetura, assets offline e computadores limpos.
- **Rigor Epistêmico na Linguagem da Interface e Laudos:**
  - Substituição de termos de garantia absoluta ("100% homologado", "plenamente válida", "autêntico comprovado") por estados descritivos correspondentes às evidências técnicas verificadas.
- **Documentação Técnica e Governança:**
  - Publicação de `ARCHITECTURE.md`, `SECURITY.md`, `SUPPORTED_FORMATS.md`, `LEGAL_DATA_PROVENANCE.md`, `OFFLINE_OPERATION.md`, `RELEASE_CHECKLIST.md`, `TEST_MATRIX.md` e `VERSIONING_POLICY.md`.

### Corrigido
- **Defeito Crítico no Cancelamento Cooperativo (`CancellationTokenSource`):**
  - O getter `token` em [src/shared/contracts/operation.types.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/src/shared/contracts/operation.types.ts) retornava um objeto avaliado estaticamente no momento da instanciação (`isCancelled: false`). Foi refatorado para avaliar dinamicamente a propriedade interna via getter, permitindo a interrupção de operações em lote em tempo real sem deixar arquivos corrompidos declarados como concluídos.
- **Vulnerabilidade de Travessia de Diretório (Zip Slip):**
  - O descompactador `safeUnzipDocx` em [src/services/ooxmlParser.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/src/services/ooxmlParser.ts) agora intercepta e bloqueia expressamente qualquer arquivo com sequências `..` ou caminhos absolutos, disparando `DocxSecurityError`.
- **Independência de Interpretadores de Desenvolvimento (Zero-Dev Runtime):**
  - Removidas todas as referências hardcoded a caminhos locais de desenvolvimento (`.venv/Scripts/python.exe`) em `pdfTextExtractor.ts`, `pdfEngine.ts` e `compressionEngine.ts`. O processamento desktop roda 100% sobre as APIs nativas do Chromium do Electron (HTML5 Canvas, PDF.js, WebCrypto, Web Workers e Tesseract WASM). O usuário final não necessita de Python ou Node.js instalados.
- **Compatibilidade de Buffers no WebCrypto (`encryptionEngine.ts`):**
  - Corrigida a distorção de `byteOffset` e incompatibilidade de tipos de buffers Node.js com WebCrypto através de fatiamento seguro `new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)`.
- **Isolamento de Tipos em `ipcValidator.ts`:**
  - Convertido o import runtime de `app` do `'electron'` para `import type`, prevenindo exceções `SyntaxError` ao executar testes fora do processo Electron.

### Alterações Incompatíveis (Breaking Changes)
- **Bloqueio de Release sem Certificado:** Tags de versão oficial (`v*`) abortam imediatamente com código 1 caso os certificados digitais oficiais (`WIN_CSC_LINK` ou `MAC_CSC_LINK`) não estejam configurados no pipeline.
- **Rejeição Estrita de DOCX com Nomes Malformados:** Documentos OOXML compactados contendo entradas que tentem escapar do diretório raiz do pacote são rejeitados de imediato com erro fatal de segurança.

### Limitações Documentadas
- **Validação de Revogação PAdES em Modo Desconectado:** Quando executado sem acesso à internet, o sistema não consulta LCR/OCSP em tempo real. O laudo gerado declara essa limitação e orienta o envio do arquivo ao serviço oficial VALIDAR do ITI (`https://validar.iti.gov.br`).
- **Achatamento LGPD e Camada Textual:** A anonimização por rasterização física a 300 DPI elimina os fluxos vetoriais de texto por questões de segurança forense. Para que o documento resultante seja pesquisável nos tribunais, é necessário reprocessá-lo pelo módulo de OCR Local.
