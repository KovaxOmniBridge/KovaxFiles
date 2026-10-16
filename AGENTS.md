# Diretrizes de Engenharia, Qualidade e Governança Técnica — KovaxFiles Desktop

Este documento define as regras mandatórias de desenvolvimento, governança técnica e prevenção de regressões para agentes de IA e desenvolvedores que atuam no repositório **KovaxFiles Desktop**.

---

## 1. Regra de Ouro: Correção de Bugs Exige Teste Obrigatório (Anti-Regressão)

> [!IMPORTANT]
> **Toda vez que surgir um bug ou regressão, é OBRIGATÓRIO criar ou atualizar uma suíte de teste automatizado antes de encerrar a tarefa.**

1. **Ciclo de Correção Obrigatório:**
   - **Passo 1 (Reprodução):** Escrever um teste unitário ou de integração que capture exatamente as condições que causaram o bug.
   - **Passo 2 (Comprovação da Falha):** O teste deve falhar na ausência da correção (demonstrando a sensibilidade da verificação).
   - **Passo 3 (Correção do Código):** Implementar a correção cirúrgica na camada adequada (Core, Services ou IPC).
   - **Passo 4 (Homologação):** Executar a bateria completa (`npm test`) garantindo que o novo teste passe e que nenhuma outra área da plataforma tenha sofrido regressão.
2. **Localização dos Testes:**
   - Adicionar o teste na suíte modular correspondente em `tests/suites/` ou nos testes unitários e de integração em `tests/unit/` e `tests/integration/`.

---

## 2. Princípios de Auditoria Jurídica e Não-Circularidade

1. **Proibição Absoluta de Autovalidação Circular:**
   - Nenhum teste de integridade jurídica pode verificar hashes calculados dinamicamente pela própria função que está sendo testada (`LegalCorpusAuditorService.computeCanonicalSha256(content)`).
   - Isso atesta apenas coerência interna, mas não conformidade com a realidade externa.
2. **Uso Obrigatório de Fixtures de Referência Independente:**
   - Todo teste de integridade normativa deve confrontar os dados contra as fixtures independentes em [`tests/fixtures/officialLegalReferences.ts`](file:///d:/KovaxOminiBridge/KovaxFilesApp/tests/fixtures/officialLegalReferences.ts).
   - As fixtures devem conter metadados e digests SHA-256 (FIPS 180-4) pré-computados externamente contra publicações reais do DJe do STF, STJ e DOU.
3. **Honestidade Probatória de Fontes:**
   - Dispositivos cadastrados no acervo sem arquivo de captura física bruta arquivado (`rawArtifactSha256`) devem permanecer expressamente como `NAO_VERIFICADO_EXTERNAMENTE`.
   - É terminantemente proibido replicar o hash do texto local no campo `externalSourceHash` sem captura física documentada.

---

## 3. Segurança Criptográfica e Integridade PAdES

1. **Isolamento de Chaves Privadas no IPC:**
   - Chaves privadas de certificados A1 (PFX/P12) NUNCA podem ser enviadas de volta ao processo de renderização (UI).
   - O IPC deve devolver estritamente informações públicas e sanitizadas (`certInfo`). A chave privada permanece no contexto criptográfico restrito do processo principal e deve ser descartada imediatamente após o uso.
2. **Classificação Rigorosa ICP-Brasil:**
   - Certificados com strings nominais ou OIDs de ICP-Brasil que não comprovem cadeia criptográfica completa ancorada na AC Raiz ICP-Brasil devem ser rotulados como `INDICIOS_DE_ICP_BRASIL_CADEIA_NAO_VALIDADA`.
   - O status `RECONHECIDO_ICP_BRASIL` é restrito a cadeias formalmente auditadas.
3. **Proibição de Relatórios de Rasterização Presumidos:**
   - O motor de achatamento de PDF nunca pode presumir DPI nominal, formato A4 ou qualidade ótima sem medições reais.
   - Na ausência de medições técnicas físicas, o resultado deve ser explicitado como `measurement_unavailable` ou a operação deve ser interrompida sob modo estrito.

---

## 4. Portabilidade e Runtimes Limpos (Zero-Dev Runtime)

1. **Independência de Ambientes de Desenvolvimento:**
   - O aplicativo compilado para o usuário final deve rodar exclusivamente sobre o runtime do Chromium/Electron.
   - É proibido empacotar scripts `.py`, diretórios `.venv` ou pastas de testes no instalador de produção (`dist/` e `dist-electron/` exclusivamente).
2. **Compatibilidade Multiplataforma dos Scripts de Teste:**
   - Todos os scripts de verificação e auditoria forense em `scripts/` devem resolver caminhos de interpretadores (Node, Python, PowerShell, shell) de forma portátil para Windows, Linux e macOS (ex.: função `resolvePythonCmd()`).
   - Evitar comandos exclusivos de um único sistema operacional em pipelines compartilhados.

---

## 5. Portão de Qualidade Pré-Commit / Pré-Push (Quality Gate)

Antes de realizar qualquer commit ou envio de alterações:
1. Executar a bateria de integração contínua:
   ```bash
   npm test
   ```
2. Garantir 100% de aprovação nas 11 suítes de PR:
   - `1. Build & Integridade de Assets`
   - `2. Segurança Electron (Sandbox, IPC, CSP)`
   - `3. PDF (Abrir, Manipular, Salvar, Reabrir)`
   - `4. LGPD (Privacidade, Isolamento e Revisão)`
   - `5. Criptografia & Cofre Forte AES-GCM`
   - `6. DOCX (OOXML e Preservação Semântica)`
   - `7. OCR Documental & PDF Pesquisável`
   - `8. PAdES (Assinatura, Adulteração e Cadeia)`
   - `9. Protocolo Judicial (Divisão e Manifesto)`
   - `10. Acervo Jurídico (Fontes e Autenticidade)`
   - `11. Testes Adversariais (Fuzzing e Chaos)`
3. Em alterações que impactem empacotamento ou releases, executar a Suíte 12:
   ```bash
   npm run test:release
   ```
