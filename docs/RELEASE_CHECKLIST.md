# Checklist Obrigatório de Release e Distribuição — KovaxFiles Desktop

Este checklist define os critérios formais de bloqueio que devem ser satisfeitos antes da publicação de qualquer versão oficial do **KovaxFiles Desktop**.

---

## 1. Critérios de Portão de CI e Testes Automatizados (Bloqueio Nível 1)

Antes de iniciar a compilação de qualquer pacote de distribuição, o pipeline deve comprovar:

- [ ] **Bateria Completa de Pull Request Aprovada:** As 11 suítes de teste de PR executaram com 100% de sucesso via `npm run test:pr`:
  - 1. Build & Tipagem (`tsc --noEmit`).
  - 2. Segurança Electron (Sandbox, CSP, IPC Validator).
  - 3. PDF Lifecycle (Abrir, Rotacionar, Remover, Salvar, Reabrir).
  - 4. LGPD & Tarjamento (Detecção de PII, Isolamento de Lote).
  - 5. Criptografia & Cofre Forte AES-GCM.
  - 6. DOCX OOXML (Conformidade ISO/IEC 29500).
  - 7. OCR Local (Sandwich PDF, Camada Textual Pesquisável).
  - 8. PAdES-BES (Assinatura, /ByteRange, Adulteração).
  - 9. Protocolo Judicial (Divisão de Volumes, Chancela, Manifesto).
  - 10. Acervo Jurídico (Proveniência, Hash da Fonte, SV 30 suspensa).
  - 11. Testes Adversariais (PDF truncado, Zip Slip, Fuzzing, XSS).
- [ ] **Suíte de Desempenho e Carga:** Teste sob estresse de 500 itens executado com sucesso e estabilidade de Heap comprovada via `npm run test:load`.
- [ ] **Auditoria de Distribuição Aprovada:** Todas as 14 regras de conformidade estática validadas com sucesso via `npx tsx scripts/verify_release_distribution_package.ts`.

---

## 2. Critérios de Assinatura Digital e Identidade (Bloqueio Nível 2)

É expressamente proibido publicar instaladores desprovidos de assinatura digital oficial para distribuição institucional:

- [ ] **Windows Authenticode:**
  - Segredos configurados no GitHub Actions: `WIN_CSC_LINK` e `WIN_CSC_KEY_PASSWORD`.
  - Script parametrizado incondicionalmente com `--config.win.forceCodeSigning=true`.
  - Verificação de autenticidade executada no executável gerado: `Get-AuthenticodeSignature .\KovaxFiles-Setup-*.exe` com status `Valid`.
- [ ] **macOS Apple Developer ID & Hardened Runtime:**
  - Segredos configurados: `MAC_CSC_LINK` e `MAC_CSC_KEY_PASSWORD`.
  - Configurações ativas no electron-builder: `hardenedRuntime: true`, `gatekeeperAssess: true` e `entitlements.mac.plist`.
  - Notarização concluída com sucesso junto à Apple.

---

## 3. Critérios de Execução em Máquinas Limpas (Zero-Dev Runtime)

A instalação do aplicativo final não pode exigir nenhum ambiente prévio na máquina do usuário:

- [ ] **Independência de Interpretadores Externos:**
  - O aplicativo não exige Node.js, npm, npx, Python ou pip instalados no sistema operacional.
  - Nenhum script `.py` está incluído no pacote compilado (`dist/` e `dist-electron/`).
  - O processamento documental roda 100% sobre os motores transpilados embutidos no pacote ASAR do Electron.
- [ ] **Integridade dos Assets Offline:**
  - O modelo oficial [por.traineddata](file:///d:/KovaxOminiBridge/KovaxFilesApp/public/tessdata/por.traineddata) (2.42 MB) está presente em `dist/tessdata/`.
  - Os binários Tesseract WASM e fontes locais estão presentes e íntegros.

---

## 4. Critérios do Manifesto Criptográfico e Publicação (Bloqueio Nível 3)

- [ ] **Geração Estrita de SHA256SUMS.txt:**
  - O manifesto foi gerado via [scripts/generate_release_manifest.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/scripts/generate_release_manifest.ts) com o parâmetro `--require=win,mac,linux`.
  - O comando **NÃO utilizou mascaramento por `|| true`**.
  - Todos os instaladores esperados (Windows `.exe`, macOS `.dmg`/`.zip`, Linux `.AppImage`/`.deb`) estão fisicamente presentes e com hashes SHA-256 não nulos.
  - A releitura do manifesto confirmou que todos os hashes coincidem estritamente com os arquivos em disco.
- [ ] **Homologação Operacional Humana:**
  - O instalador oficial foi aberto em uma máquina limpa de teste (Windows Sandbox ou máquina virtual isolada).
  - Foram realizados testes reais de abertura de PDF, aplicação de tarja LGPD, compressão e visualização de súmula sem erros de inicialização.
