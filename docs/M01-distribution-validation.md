# M01 — Empacotamento e validação interna

Os resultados iniciais abaixo são o registro histórico da rodada do commit `6b3c686`. As seções “Rodada 2”, “Rodada 3” e “Rodada 4” registram as correções anteriores e evidências das bases `471971f` e `ab66a3f`. A seção “Rodada 5” consolida a identidade canônica das fontes multiplataforma, a extração do contrato de provas de produção e a validação interna completa na base `aed1309`. A seção “Rodada 6” documenta a auditoria de commit obrigatório e a falha global da execução `39516147493`. A seção “Rodada 7” consolida a resolução técnica definitiva da sandbox Linux (sem `--no-sandbox`), a reexecução do workflow interno com aprovação 100% multiplataforma na base `d8d1911` (Run `39520761216`) e a auditoria por plataforma. Os registros históricos anteriores foram rigorosamente preservados.

Baseline inspecionada: `main`, `c23754d018c792b49f5daa659431f93014c87409`, checkout sem alterações rastreadas. A pasta ignorada `release/` já continha artefatos antigos; eles não comprovam a implementação atual.

## Achados confirmados e alterações

- Release e nightly exigiam executável antes do empacotamento. O smoke agora fica depois do builder, na plataforma correspondente; Linux usa Xvfb sem desativar a sandbox.
- A suíte tinha `os` sem importação, nomes fixos e fallback de manifesto com fixture. Agora resolve nome, arquitetura e diretório do pacote; ausência ou falta de evidência obrigatória reprova. Fixtures ficam nos testes unitários.
- O runner aceitava `<body>`, existência de modelo e escrita de texto com cabeçalho PDF. Agora exige montagem React, navegação para editor, bridge isolado, versão via IPC, assets no próprio pacote, reconhecimento OCR por worker local, processamento/exportação/reabertura de PDF com duas páginas e leitura física do resultado.
- Erros de preload, renderer, carregamento, rejeições e timeout encerram o diagnóstico com erro.
- O primeiro smoke real revelou bloqueio de WebAssembly pela CSP. A regressão falhou antes da correção; header e meta CSP agora permitem somente `wasm-unsafe-eval`, preservando a proibição de `unsafe-eval` JavaScript, a sandbox e o isolamento.
- Todos os comandos builder incluem `--publish never`. A opção `package:internal` seleciona geração interna explicitamente. Publicação do workflow existente continua restrita a tags oficiais sem opção unsigned; nenhuma tag ou publicação foi efetuada nesta tarefa.
- `test:release` testa o aplicativo; `test:installers` verifica instaladores e assinatura nativa no canal oficial; o manifesto é gerado depois. A presença de tabela PE ou de certificado no ambiente não aprova assinatura.
- `typecheck:tools` aplica a mesma tipagem estrita ao fluxo de distribuição. `typecheck:tools:all` também inclui scripts/testes legados e revela dívida preexistente, sem supressões nem alteração do `tsconfig.json` original.

## Reprodução

Arquivos de implementação: `.github/workflows/build-release.yml`, `.github/workflows/ci.yml`, `package.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/packagedSmoke.ts`, `electron/main.ts`, `electron/main/windowManager.ts`, `electron/main/sessionSecurity.ts`, `electron/main/cleanEnvironmentRunner.ts` e `electron/main/packagedSmokeChecks.ts`.

Gates e regressões: `scripts/distribution_contract.ts`, `scripts/verify_distribution_bundle.ts`, `scripts/verify_packaged_installers.ts`, `scripts/verify_release_distribution_package.ts`, `tests/suites/desktop_packaged.test.ts`, `tests/unit/distribution_contract.test.ts`, `tests/unit/distribution_gates.test.ts`, `tsconfig.tools.json` e `tsconfig.tools-audit.json`.

Em checkout limpo, com Node e ferramentas de build apenas na máquina de preparação:

```powershell
npm ci
npm run prepare:tessdata
npm run typecheck:tools
npm run test:distribution
npm test
npm run package:internal -- --x64
$env:DISTRIBUTION_CHANNEL = 'internal'
$env:ALLOW_UNSIGNED_INTERNAL = 'true'
npm run test:release
npm run test:installers
npx tsx scripts/generate_release_manifest.ts --dir=release --require=win
```

Não usar `npx electron` nem `--no-sandbox` para homologar o pacote. Linux requer display/Xvfb. Para assinatura oficial, selecionar `DISTRIBUTION_CHANNEL=official`; o gate consulta Authenticode no Windows e codesign/Gatekeeper no macOS, independentemente das variáveis de certificado.

Evidências locais: `npm-test.log`, `distribution-contract.log`, `tools-typecheck.log`, `scoped-typecheck.log`, `package-internal.log`, `release-test.log` e `release/evidence/`. Os workflows disponibilizam artefatos/evidências pelo upload interno do Actions. Arquivos ignorados não são incluídos no Git.

## Resultados comprovados

- `npm test`: 11/11 suítes aprovadas; repetido após a correção da CSP (`docs/evidence/m01/npm-test.txt`).
- Regressões de distribuição: aprovadas, incluindo ausência de binário, resolução com versão 9.8.7, ausência de evidências/React/preload, assets OCR, PDF inválido, assinatura inválida, política de publicação e digest independente SHA-256 de `abc`.
- `tsc --noEmit` e `tsc -p tsconfig.tools.json`: aprovados. YAML dos dois workflows analisado com `js-yaml`.
- Auditoria ampla de scripts/testes legados: reprovada com 48 diagnósticos; inclui import para serviço inexistente e contratos antigos de PDF/protocolo. Evidência em `docs/evidence/m01/legacy-typecheck.txt`. Esse resultado não é apresentado como aprovado.
- `test:release` com `RELEASE_DIR=release/m01-intentionally-absent`: reprovado, código 1, como exigido.
- Smoke anterior à correção de CSP: reprovado, código 1, após React/preload/IPC; OCR falhou por bloqueio de WebAssembly. Evidência em `docs/evidence/m01/ocr-csp-before.txt`.

O pacote corrigido é gerado em `release/m01-validation` com `npm run package:internal -- --x64 --config.directories.output=release/m01-validation`. Usar `RELEASE_DIR=release/m01-validation` nos gates e `--dir=release/m01-validation --require=win` no manifesto. Esse diretório separa a execução atual dos artefatos antigos na raiz de `release/`.

- Pacote Windows x64 corrigido: geração concluída com código 0; NSIS e portable disponíveis em `release/m01-validation`.
- Smoke do executável corrigido: código 0, com todas as seis evidências obrigatórias, incluindo reconhecimento real offline e reabertura do PDF (`docs/evidence/m01/packaged-smoke.txt`).
- `test:installers` no canal interno: código 0. Authenticode nativo do executável: `NotSigned`. Classificação: **NÃO HOMOLOGADO**.
- `test:installers` com o mesmo pacote no canal oficial: reprovado, código 1, `Authenticode inválido`; evidência em `docs/evidence/m01/official-signature-rejected.txt`.
- O verificador Windows remove `PSModulePath` herdado e usa erros terminantes: o host Windows PowerShell não deve carregar módulos incompatíveis do PowerShell 7. A primeira tentativa expôs essa incompatibilidade; após o isolamento, o resultado negativo foi especificamente `Authenticode inválido: NotSigned`.
- Manifesto final: `release/m01-validation/SHA256SUMS.txt`, dois instaladores; geração concluída com código 0. Evidências completas em `release/m01-validation/evidence/` e `docs/evidence/m01/`.
- `test:bundle`: aprovado separadamente sobre o mesmo bundle; preserva verificações de assets, fontes, entitlements, política de assinatura e ausência de runtimes de desenvolvimento.
- Scripts oficiais macOS também exigem assinatura do DMG (`dmg.sign=true`), além do aplicativo. Verificação nativa de assinatura/notarização permanece pendente em macOS; nenhuma aprovação foi inferida de configuração ou segredos.

Permanecem pendentes: homologação de instalação em Windows limpo, execução nativa de pacote em macOS/Linux, certificados oficiais/notarização e correção da dívida de tipagem legada. O próximo bloqueio para homologação de distribuição institucional é executar o roteiro em VM limpa com artefato assinado; o pacote interno atual não pode ser promovido como release oficial.

## Homologação manual em Windows limpo — pendente

1. Usar VM Windows x64 sem Node.js, Python ou ferramentas de desenvolvimento; registrar versão do SO, arquitetura e snapshot.
2. Transferir instalador e manifesto por canal interno, conferir SHA-256. Registrar que o pacote interno não é homologado e pode ser não assinado.
3. Desconectar rede, instalar pelo NSIS, iniciar pelo menu/atalho e confirmar ausência de mensagens de dependências.
4. Abrir PDF de referência, processar, exportar, fechar e reabrir o arquivo; comparar páginas, texto e renderização.
5. Executar OCR de imagem de referência em português; conferir conteúdo esperado e ausência de conexões externas.
6. Reiniciar aplicativo, verificar persistência, desinstalar e registrar logs/capturas e resultados por etapa.

O smoke automatizado do executável não atesta instalação em máquina limpa. Segurança de dependências, acervo jurídico e continuidade de dados continuam frentes próprias; M01 não declara prontidão para lançamento.

## Rodada 2 — base 6b3c686, 20/10/2026

A execução remota `39353737562` confirmou falha Windows no job `118403680777` antes das 11 suítes; Linux e macOS passaram naquela execução. O comparador literal de permissões aceitava LF e rejeitava CRLF para o mesmo documento YAML (`round2-base-6b3c686/crlf-before.json`). Essa aprovação local anterior não comprovava portabilidade Windows no CI.

### Alterações desta rodada

- `scripts/workflow_policy.ts` interpreta YAML com `js-yaml`, agora dependência de desenvolvimento explícita, com tipos e lockfile. A política valida permissões globais, permissões de cada job, publicação restrita ao job autorizado, dependências e ordem dos comandos de pacote/smoke/jornada. Fixtures incluem CRLF, LF, reordenação de propriedades, indentação, publicação indevida e falhas mascaradas.
- `scripts/package_distribution.ts` cria uma saída nova por execução, impede reuso de diretório e chama o builder com `publish: never`. Configuração e metadados reais do callback `artifactBuildCompleted` identificam produto, versão, arquitetura e targets. `distribution_artifacts.ts` rejeita ausência, duplicação, mistura, versões/arquiteturas divergentes, truncamento e hashes alterados. Dois EXEs arbitrários não são aceitos como NSIS e portable.
- Os workflows preservam macOS/Linux, usam Node 24 compatível com o Electron instalado e executam jornada depois do pacote. Instalação em máquina limpa, assinatura e notarização não são inferidas dessas configurações.
- A fusão em `PdfManipulator` usa `LocalPdfEngine.mergePdfs` e o `fileSystemAdapter` existente. No desktop, o botão de exportação agora percorre o mesmo IPC seguro e a gravação atômica usados pelo editor. Falhas de gravação são apresentadas como erro, sem fallback silencioso para download.
- `documentJourneyRunner.ts` importa dois PDFs pelo input real, aciona o botão de fusão, exporta pela interface/IPC, lê a saída física e a reimporta. O parser PDF.js confere duas páginas e os textos `M01 REFERENCE ALPHA` e `M01 REFERENCE BETA`, na ordem. A automação utiliza CDP somente no diagnóstico e substitui somente a escolha do destino no diálogo nativo; remetente IPC, validações e escrita continuam no código de produção.
- Esperas acompanham condições observáveis com timeout. O smoke rápido existente continua separado da jornada. Cenários de diagnóstico negativos cobrem importação, processamento, gravação e reabertura.
- `distribution:finalize` exige provas de smoke e jornada da mesma execução, verifica novamente o executável e `app.asar`, compara hashes dos instaladores e então gera o manifesto final. O relatório distingue commit-base da compilação e impressão SHA-256 dos arquivos-fonte efetivamente usados; a associação ao commit enviado é registrada nas evidências finais.

### Procedimento vigente

```powershell
npm ci
npm run prepare:tessdata
npx tsc --noEmit
npm run typecheck:tools
npm run test:distribution
npm test
$env:DISTRIBUTION_CHANNEL = 'internal'
$env:ALLOW_UNSIGNED_INTERNAL = 'true'
npm run package:internal -- --x64
# A saída exclusiva está indicada em release/last-run.json.
npm run test:release
npm run test:journey
npm run test:installers
npm run distribution:finalize
```

O diretório exclusivo contém `build-run.json`, `artifacts.json`, `SHA256SUMS.txt` e `evidence/`. Os novos registros textuais ficam em `docs/evidence/m01/round2-base-6b3c686/`; os arquivos da rodada anterior permanecem históricos. A auditoria ampla de tipagem legada continua sendo dívida separada, sem supressão de diagnósticos nem aprovação presumida.

### Verificações adicionais da rodada

Os auditores `verify_distribution_security.ts`, `verify_distribution_prerequisites.ts` e `verify_release_distribution_package.ts` usam a mesma política estrutural. Os dois primeiros passaram; o terceiro expôs um probe nativo afetado pelo `PSModulePath` herdado/vazio sob tsx. O ambiente isolado foi centralizado em `nativeSignatureEnvironment`, com regressões para valores vazios, herdados e variação de caixa. O auditor passou em 16/16 verificações após a correção; sua falha anterior permanece em `static-release-before-native-fix.txt` e `native-probe-before-fix.txt`.

A identificação da saída por plataforma usa `matrix.os` em `env` do job. A regressão rejeita `runner.os` nesse nível, onde esse contexto ainda não está disponível ([referência de contextos do GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts)). Expressões nos steps continuam usando os contextos permitidos nessa fase.

Os arquivos na raiz de `round2-base-6b3c686/` documentam as reproduções e a primeira execução de pacote aprovada. As evidências definitivas são identificadas separadamente em `final-run/`. Os reempacotamentos para vincular a versão final dos auditores reutilizaram o bundle de aplicativo já compilado e verificado, sem mudanças no runtime; `payload-continuity.json` registra a igualdade dos bytes de `app.asar`. Isso não transforma os resultados locais em aprovação de CI: após o envio, o resultado de cada job deve ser consultado na execução do commit e preservado em `evidence/remote-ci.json` junto ao pacote.

### Resultado local definitivo da rodada 2

| Camada | Resultado e limite da prova |
| --- | --- |
| Verificações estáticas | Tipagem do aplicativo, `typecheck:tools`, bundle e auditores estruturais aprovados. YAML LF/CRLF e estilos equivalentes passam; permissões, publicação, contexto inválido e gates fora de ordem são rejeitados. |
| Testes unitários e PR | `npm test`: 11/11 suítes, com as regressões de distribuição. Fixtures de instaladores são exclusivamente testes do verificador. |
| Smoke do pacote | Aprovado no executável Windows x64 final: React, preload isolado, IPC, OCR offline e operações sintéticas. |
| Jornada documental real | Aprovada: dois arquivos no input da ferramenta, fusão por `LocalPdfEngine`, exportação pelo adaptador/IPC com escrita atômica, reimportação e conferência independente de páginas/textos via PDF.js. |
| Falhas obrigatórias | Os quatro cenários reais de importação, processamento, gravação e reabertura retornaram código 1. A saída positiva permanece em evidência separada. |
| Instaladores | NSIS e portable atuais identificados pelo builder; metadados, targets, versão, arquitetura e hashes finais conferidos. Essa prova não é teste de instalação. |
| Instalação em máquina limpa | Pendente; roteiro acima. Nenhuma VM limpa foi homologada nesta rodada. |
| Assinatura/notarização oficiais | Pendente. O executável e os dois instaladores internos retornaram `NotSigned` e foram rejeitados pelo gate Authenticode nativo. Não há aprovação de cadeia oficial nem de notarização Apple. |
| Tipagem legada ampla | Dívida separada; a reprovação histórica com 48 diagnósticos continua registrada, sem supressões ou alegação de aprovação. |

Saída final interna: `release/runs/1792488999373-6b3c6868-65772dfe`, classificação **NÃO HOMOLOGADO**. `final-run/distribution.json` e `final-run/SHA256SUMS.txt` contêm a associação à execução, commit-base `6b3c686`, versão `1.0.0`, arquitetura `x64`, canal interno e impressão de fonte `03652ac5c3ecd489c46b6877880fb4a99ab37e4d4cd755582c73566422d4d5af`.

| Artefato final | SHA-256 |
| --- | --- |
| `KovaxFiles Desktop-1.0.0-win-x64-setup.exe` | `ecff94fbfee0699896af5cf80c1f4e1594ad23f18a3e809023bc998a7bf0c647` |
| `KovaxFiles Desktop-1.0.0-win-x64-portable.exe` | `22bc229fb2ca264e2d519d4a085873b4750a24e5f4df3d09fa583d97b8748609` |

O próximo passo após a verificação do CI do commit enviado é executar pacote nativo em macOS/Linux e a homologação de instalação em VM limpa, usando artefatos oficialmente assinados quando aplicável. A rodada não autoriza lançamento público nem encerra integralmente a homologação M01.

### Resultado remoto de 38caad5 e correção do gatilho de Pages

O commit `38caad5c337d00ed9e36afa3494fdc9fd80e1084` foi enviado e os jobs de qualidade Windows (`118562611353`), Linux (`118562611111`) e macOS (`118562610850`) passaram na execução `39403168110`. A nightly de pacote ficou pulada nesse evento de push; não é evidência de pacote nativo nessas outras plataformas.

O mesmo push acionou indevidamente o workflow preexistente de GitHub Pages, que aceitava `docs/**` e publicava a pasta inteira. O deploy `39403168065`, job `118562611045`, foi concluído, contrariando a restrição desta tarefa. Esse resultado permanece registrado; não houve release de instaladores ou tag. O deploy de Pages já concluído não é apresentado como inexistente ou revertido.

A correção adicional restringe o gatilho automático aos quatro arquivos da landing page: `docs/index.html`, `docs/app.js`, `docs/style.css` e `docs/favicon.svg`. Alterações do próprio workflow, relatórios e evidências internas ficam fora desse gatilho. `prepare_landing_artifact.ts` prepara somente esses quatro arquivos para publicações futuras, preservando a opção manual de Pages. A regressão falhou com a configuração anterior e passou após o ajuste; também confere que relatórios e a pasta de evidências não entram no artefato do site. O próximo push desta correção deve produzir CI de código sem execução de Pages.

### Validação final da proteção de Pages

A rodada adicional usa `release/runs/1792489903110-38caad5c-929fac36`, commit-base `38caad5`, impressão de fonte `a6a7064faaa66e5cfab5734df10fb82f789642e998d31d0fb029c194b395d350`. Evidências separadas estão em `docs/evidence/m01/round2-pages-followup/`; as rodadas anteriores foram preservadas.

Passaram a tipagem do aplicativo e das ferramentas, `npm test` (11/11), smoke e jornada documental no pacote Windows, verificação dos dois instaladores e geração de manifesto. Os quatro cenários negativos retornaram código 1. A verificação Authenticode nativa rejeitou executável e instaladores com `NotSigned`. `npm run test:release` passou com as variáveis explícitas do canal interno; a tentativa sem essas variáveis foi corretamente recusada pelo contrato de distribuição.

SHA-256 portable: `a2e82bdabcbcaca858c649d0e0adc05972e194282e58c2921949b863ca578957`. SHA-256 NSIS: `b439d78e1cc7d4c0f59e19bdc96a7ee4282e097cc3b3735014b6e0cfcacdbac6`. Permanecem a classificação **NÃO HOMOLOGADO**, os limites de instalação em máquina limpa, assinatura oficial/notarização e pacotes nativos macOS/Linux. O acompanhamento remoto do commit adicional será associado à execução local em `evidence/remote-ci.json`, sem alterar esta evidência histórica ou provocar um novo push apenas documental.

## Rodada 3 — base 471971f, 20/10/2026

Nesta rodada, a baseline inspecionada foi o commit `471971f5258f3ba4f556411b708bc336464b6862`. Os achados anteriores foram reconfirmados e duas frentes críticas foram corrigidas e homologadas: a seleção segura e orientada por manifesto dos artefatos de publicação e a complementação dos cenários negativos com tratamento observável de erros e recuperação real pela interface.

### Problemas confirmados e causas raízes

1. **Seleção genérica de artefatos de publicação (`publish_release`):**
   - *Causa:* O step `Baixar Todos os Instaladores Compilados` baixava a árvore completa dos artefatos de cada job (`installers-${{ matrix.os }}`), contendo os diretórios de executáveis descompactados (`win-unpacked/`, etc.). Em seguida, o step `Mover Artefatos para Diretório de Release` executava uma busca recursiva ampla por extensões (`find release-downloads -type f \( -name "*.exe" ... \)`).
   - *Impacto:* Esse comando copiava indevidamente o executável descompactado interno `win-unpacked/KovaxFiles Desktop.exe` e quaisquer arquivos auxiliares com extensões permitidas para o diretório de publicação pública, corrompendo o manifesto SHA-256 e violando a política de publicação estrita.
2. **Cenários negativos incompletos na jornada documental:**
   - *Causa:* Os testes negativos de importação e reabertura terminavam prematuramente no processo runner antes de exercitar o produto: o teste de importação verificava `!fs.statSync(file).isFile()` e falhava no Node antes de entregar o arquivo ao input DOM; e o teste de reabertura invocava `PDFDocument.load` diretamente no runner, detectando corrupção antes de entregar a saída corrompida à interface da aplicação.
   - *Impacto:* Os testes comprovavam apenas que o runner interceptava anomalias, mas não demonstravam o tratamento de erros do próprio produto (banner de erro visível, ausência de falso sucesso, preservação de arquivos e possibilidade de recuperação/retry pelo usuário).

### Implementação e correções realizadas

1. **Seleção orientada por manifesto (`scripts/prepare_release_publication.ts`):**
   - Substituição da busca genérica por leitura estrita e estruturada dos registros `artifacts.json` gerados pelo processo de empacotamento.
   - Validação prévia de inventário: confrontação de produto (`pkg.build.productName`), versão (`pkg.version`), plataforma, arquitetura (`x64`/`arm64`) e alinhamento exato com `expectedArtifacts`.
   - Sanitização de caminhos: rejeição mandatória de caminhos absolutos, travessia de diretório (`..`) e separadores de pasta (`/` e `\`). O nome deve ser estritamente local (`path.basename(file) === file`).
   - Confrontação física estrita: após localizar o arquivo declarado, o tamanho e o hash SHA-256 são recalculados contra o arquivo físico em disco. Divergências reprovam imediatamente a preparação.
   - Prevenção de misturas e colisões: rejeição de colisões de nomes globais, duplicação de targets e divergência de commits/versões entre plataformas.
   - Isolamento de publicação: apenas os instaladores declarados e validados são copiados para a pasta limpa de release. `win-unpacked/`, evidências, logs e arquivos extras permanecem estritamente fora da publicação.
   - Geração de manifesto: o arquivo `SHA256SUMS.txt` é gerado exclusivamente sobre os instaladores validados e sua leitura de volta é verificada de ponta a ponta.
   - Suporte ao modo `--validate-only` para ensaios locais sem mutação de arquivos.
   - Atualização do workflow `.github/workflows/build-release.yml` para utilizar `npx tsx scripts/prepare_release_publication.ts --downloads=release-downloads --output=release --require=win,mac,linux`.
2. **Tratamento de erros e recuperação real no aplicativo empacotado:**
   - `src/components/tools/PdfManipulator.tsx`: aprimoramento de `handleAddFiles` para identificar arquivos com formato inválido e apresentar mensagem de erro visível em `[data-testid="pdf-error"]` (`Apenas arquivos PDF são aceitos...`), sem aceitar itens espúrios e sem confirmação falsa de sucesso. Inclusão de `data-testid="dismiss-error"`, `data-testid="clear-file-list"` e `data-testid="remove-file-${idx}"` para permitir limpeza, substituição e redefinição cirúrgica pelo usuário.
   - Preservação de arquivos: em falhas de processamento (`LocalPdfEngine.mergePdfs`) ou gravação (`saveExportedFile`), a lista de arquivos originais permanece intacta, o estado de exportação transiciona para `'error'`, nenhuma mensagem de sucesso indevido é disparada, e o botão de exportação é mantido ativo para tentativas posteriores.
   - `electron/main/documentJourneyRunner.ts`: implementação da suíte `--document-journey-negative` no executável empacotado real, utilizando automação CDP via depurador Chromium com condições observáveis (`waitForCondition`) e timeout, sem esperas fixas frágeis:
     - *Cenário 1 (Importação Inválida & Recuperação):* entrega arquivo `.txt` real ao input `[data-testid="merge-input"]`, verifica erro visível na interface, comprova ausência de sucesso, aciona botão de dispensa de erro, entrega dois PDFs de referência válidos e conclui a fusão com sucesso (`[DocumentJourney:Negative:ImportRecovery]`).
     - *Cenário 2 (Processamento Corrompido & Recuperação):* entrega um PDF válido e um arquivo corrompido em sintaxe binária, dispara `merge-process`, verifica erro de processamento visível, comprova que a exportação não foi liberada e que os arquivos originais foram preservados, remove o arquivo inválido pelo botão de exclusão unitária, insere substituto válido e conclui a fusão (`[DocumentJourney:Negative:ProcessRecovery]`).
     - *Cenário 3 (Gravação/IPC com Falha & Retry):* injeta falha de caminho no diálogo de gravação do sistema operacional, clica em exportar, verifica transição observável para `data-export-state="error"` e erro visível, confirma ausência de arquivo físico espúrio e preservação do botão de exportação, restaura caminho válido, retenta e obtém `data-export-state="saved"` com gravação física atômica comprovada (`[DocumentJourney:Negative:SaveRecovery]`).
     - *Cenário 4 (Reabertura Corrompida & Recuperação):* limpa a interface, entrega arquivo de saída corrompido ao input real, comprova que a inspeção na camada de leitura/PDF.js rejeita o documento com erro estrutural, remove o item, entrega o PDF legítimo gerado na etapa 3 e valida duas páginas com os textos `M01 REFERENCE ALPHA` e `M01 REFERENCE BETA` (`[DocumentJourney:Negative:ReopenRecovery]`).
   - Os quatro diagnósticos de falha originais (`--journey-fault=import`, `process`, `save`, `reopen`) continuam preservados e retornam código 1.

### Resultados comprovados

- `npm run typecheck:tools` e `npx tsc --noEmit`: 100% aprovados sem qualquer erro ou supressão de tipos.
- `npm test`: 11/11 suítes de Pull Request aprovadas com 100% de sucesso.
- Suíte de regressão de publicação (`tests/unit/distribution_publication.test.ts`): 8/8 regressões aprovadas:
  1. Executável dentro de `win-unpacked` rejeitado e excluído da publicação.
  2. Arquivos extras com extensões permitidas (`.exe`, `.zip`) rejeitados.
  3. Caminhos absolutos e travessia de diretórios (`..`) estritamente rejeitados.
  4. Tamanho ou hash divergentes reprovam a preparação.
  5. Colisões de nomes e targets duplicados reprovam.
  6. Artefatos obrigatórios ou plataformas ausentes reprovam.
  7. Mistura indevida de versões ou execuções reprova.
  8. Conjunto válido gera exatamente os assets esperados e o manifesto estrito.
- Suíte de contratos de jornada (`tests/unit/distribution_journey.test.ts`): contratos positivos e de recuperação negativa aprovados.
- Isolamento de Pages (`tests/unit/distribution_pages.test.ts`): aprovado; alterações internas não tocam os arquivos do site nem acionam o workflow.
- Empacotamento Windows x64: executado com sucesso em diretório novo e exclusivo.
- Smoke do executável empacotado (`npm run test:release`): 6/6 estágios aprovados.
- Jornada documental positiva (`npm run test:journey`): 5/5 estágios aprovados.
- Jornada documental negativa com recuperação (`npm run test:journey:negative`): 5/5 estágios aprovados no aplicativo empacotado real.
- Diagnósticos de falha: os quatro cenários (`import`, `process`, `save`, `reopen`) confirmaram código 1.
- Instaladores e assinaturas (`npm run test:installers`): targets NSIS e Portable validados no canal interno. Authenticode: `NotSigned` (**NÃO HOMOLOGADO**).
- Finalização e manifesto (`npm run distribution:finalize`): aprovado com consolidação de provas de smoke, jornada positiva e jornada negativa.
- Ensaio de publicação em modo validação (`npx tsx scripts/prepare_release_publication.ts --validate-only`): executado com sucesso sobre a saída da rodada.

### Artefatos e evidências da rodada

- Diretório exclusivo da execução: `release/runs/1792511955599-471971f5-68a75582`
- Commit-base: `471971f5258f3ba4f556411b708bc336464b6862`
- Versão: `1.0.0`
- Arquitetura: `x64`
- Canal: `internal`
- Classificação: **NÃO HOMOLOGADO** (compilação de desenvolvimento não assinada)
- Digest de fontes (`sourceDigest`): `3a685d92933656e120dbb96c338e57c2c9ee7d961137a92a4fb83739f07a39dd`

| Artefato interno gerado | Tamanho físico | SHA-256 |
| :--- | :---: | :--- |
| `KovaxFiles Desktop-1.0.0-win-x64-setup.exe` | 136.74 MB (143.385.799 bytes) | `628439aa60bdee2dff9b7538877b30ac12befb805e3ae5aaf05262f755fe2640` |
| `KovaxFiles Desktop-1.0.0-win-x64-portable.exe` | 136.53 MB (143.157.858 bytes) | `65be0371c3478edf74c4d14dc147d94479aecfe46741a4b5e346a5f83d80a2fd` |

Evidências geradas no diretório da execução:
- `evidence/distribution.json`
- `evidence/installers.json`
- `evidence/smoke/result.json` e `evidence/smoke/smoke.log`
- `evidence/journey/result.json` e `evidence/journey/journey.log`
- `evidence/journey-negative/result.json` e `evidence/journey-negative/journey-negative.log`
- `evidence/journey-negative-import/`
- `evidence/journey-negative-process/`
- `evidence/journey-negative-save/`
- `evidence/journey-negative-reopen/`
- `SHA256SUMS.txt`

### Roteiro de homologação em Windows limpo (VM Windows x64) — Procedimento formal

O procedimento abaixo destina-se a uma máquina virtual Windows 10/11 x64 limpa, sem Node.js, Python, Visual Studio, Git ou ferramentas de desenvolvimento. O pacote interno não assinado (`1792511955599-471971f5-68a75582`) é classificado expressamente como **NÃO HOMOLOGADO** e serve para auditoria forense funcional pré-assinatura.

1. **Recepção e integridade:**
   - Transferir `KovaxFiles Desktop-1.0.0-win-x64-setup.exe` e `SHA256SUMS.txt` por canal seguro.
   - Abrir PowerShell nativo e confrontar o digest SHA-256:
     ```powershell
     Get-FileHash .\KovaxFiles\ Desktop-1.0.0-win-x64-setup.exe -Algorithm SHA256
     ```
   - Confirmar que o hash coincide estritamente com `628439aa60bdee2dff9b7538877b30ac12befb805e3ae5aaf05262f755fe2640`.
2. **Instalação via NSIS:**
   - Executar o instalador. Notar que o SmartScreen pode exibir alerta devido à ausência de certificado Authenticode comercial (pacote interno não assinado).
   - Concluir o assistente de instalação padrão e registrar o diretório de destino (`%LocalAppData%\Programs\kovax-files-desktop` ou `Program Files`).
3. **Inicialização e operação offline:**
   - Desconectar a rede (modo avião ou desconexão do adaptador de rede da VM).
   - Iniciar o KovaxFiles Desktop pelo atalho na Área de Trabalho ou Menu Iniciar.
   - Confirmar carregamento imediato da interface sem erros de DLLs faltantes, dependências do Visual C++ ou mensagens de rede.
4. **Jornada documental principal:**
   - Navegar até o "Manipulador de PDF".
   - Importar dois arquivos PDF legítimos.
   - Executar a união ("Unir Todos os PDFs").
   - Exportar o arquivo unificado e salvar no disco.
   - Reabrir o PDF resultante na ferramenta e validar o número de páginas e visualização.
5. **OCR Documental 100% local:**
   - Importar imagem ou documento digitalizado contendo texto em português.
   - Executar OCR e conferir que o reconhecimento textual ocorre localmente pelos workers WebAssembly offline sem qualquer tentativa de conexão externa.
6. **Cenários negativos e recuperação:**
   - Tentar importar arquivo com extensão inválida (`.txt`, `.docx`) e conferir o banner de erro visível.
   - Dispensar o erro e confirmar estado íntegro da ferramenta.
   - Tentar processar PDF propositalmente truncado e confirmar que a aplicação exibe mensagem de erro e não encerra abruptamente.
   - Remover o arquivo com problema e concluir a operação com arquivo válido.
7. **Persistência e desinstalação:**
   - Fechar o aplicativo e reabri-lo; confirmar estabilidade de preferências locais.
   - Executar o desinstalador via Painel de Controle / Configurações.
   - Confirmar remoção completa dos binários em `Program Files` / `AppData`, verificando a política de preservação de dados do usuário em `%AppData%\kovax-files-desktop`.

*Estado da homologação em máquina limpa:* **PENDENTE**. Não há VM limpa externa autorizada conectada nesta sessão de automação. A homologação em máquina limpa permanece pendente de execução pelo operador no ambiente de teste isolado.

### Limites e Próximos Bloqueios Concretos

1. **Assinatura digital institucional:** O executável e os instaladores gerados são internos e não assinados (`NotSigned`). A distribuição oficial para tribunais, prefeituras e advocacia permanece bloqueada até a integração formal com certificado digital Authenticode corporativo (A1/HSM) no Windows e Apple Developer ID no macOS.
2. **Pacotes nativos macOS e Linux:** O ambiente local executou e homologou os instaladores e o runtime Windows x64. As compilações nativas de macOS (`.dmg`, `.zip`) e Linux (`.AppImage` — target configurado em `package.json`) continuam dependentes dos respectivos runners do GitHub Actions com os certificados aplicáveis.
3. **Dívida técnica de tipagem legada:** Permanece isolada a auditoria ampla de scripts e testes legados (`tsconfig.tools-audit.json`, 48 diagnósticos preexistentes). O escopo do produto e das ferramentas de distribuição vigentes (`tsconfig.tools.json`) possui 0 erros de tipagem.
4. **Encerramento da rodada:** M01 não é declarada como integralmente homologada para lançamento público institucional, permanecendo os gates de assinatura e máquina limpa como pendências explícitas.

## Rodada 4 — base ab66a3f, 20/10/2026

Nesta rodada, a baseline inspecionada foi o commit `ab66a3fc74d37b32811af77ab9f295b5b11fc18e`. Foram corrigidas as fragilidades contratuais da preparação de publicação, a obrigatoriedade da jornada negativa em todas as esteiras e a validação de reabertura corrompida via comportamento normal da interface do produto.

### Diferenciação Metodológica Obrigatória

Para preservar a honestidade técnica exigida pelo repositório (`AGENTS.md`):
- **Implementação e Teste Local:** Execução em ambiente de desenvolvimento Windows x64 com binários empacotados reais, automação CDP e asserções criptográficas. Demonstra viabilidade e ausência de regressões no código.
- **Integração Contínua (CI):** Execução remota no GitHub Actions em runners Ubuntu, macOS e Windows. Demonstra portabilidade e conformidade estrutural.
- **Homologação Formal:** Requer máquina limpa (VM isolada sem Node/Python) e assinatura digital oficial (Authenticode/Apple Developer ID). **Permanece PENDENTE**. Os pacotes gerados continuam estritamente como **NÃO HOMOLOGADO**.

### Problemas confirmados e causas raízes

1. **Evidências opcionais e falta de vínculo com a execução oficial em `prepare_release_publication.ts`:**
   - *Causa:* As provas de smoke e jornada eram inspecionadas apenas condicionalmente (`if (fs.existsSync(smokeResultPath))`). Não se exigia canal `official` nem vínculo com o commit ou a identidade da execução do workflow fornecida pelo contexto seguro do CI.
   - *Impacto:* Um pacote interno não assinado ou evidências incompletas poderiam ser aceitos pelo preparador de publicação se apresentados diretamente.
2. **Jornada negativa opcional em `finalize_distribution.ts`:**
   - *Causa:* A prova de jornada negativa era anexada apenas se o arquivo existisse (`negativeJourney: exists ? 'passed' : 'not-run'`), sem verificação do campo `mode` contra substituição de provas.
   - *Impacto:* Permitir `not-run` abria brecha para que artefatos fossem finalizados sem comprovar capacidade de recuperação de erros pelo produto.
3. **Cenário de reabertura dependente de função diagnóstica interna:**
   - *Causa:* O teste negativo de reabertura inspecionava a rejeição exclusivamente via `window.inspectReopenedJourneyFile()`, sem acionar a operação de processamento normal nem comprovar banner visível de erro ao usuário.
   - *Impacto:* Não havia prova de que um documento corrompido reimportado gerava mensagem compreensível na interface e impedia a exportação.

### Implementação e correções realizadas

1. **Contrato Estrito de Publicação Oficial (`scripts/prepare_release_publication.ts`):**
   - Exigência de canal `official`, parâmetro `--expected-commit` e identidade de workflow `--expected-run-id` fornecidos pelo contexto confiável do GitHub Actions (`${{ github.sha }}` e `${{ github.run_id }}`).
   - Confrontação mandatória de todas as 5 evidências da plataforma: `smoke/result.json`, `journey/result.json`, `journey-negative/result.json`, `installers.json` e `distribution.json`.
   - Exigência de `OFFICIAL_SIGNATURE_VERIFIED` em `installers.json` e `SIGNED_ARTIFACTS_VERIFIED` em `distribution.json` para Windows e macOS.
   - Rejeição expressa de pacotes internos (`channel: internal`), divergências de hash, tamanho, commit, arquitetura, targets ou run ID.
   - Criação de modo explícito de ensaio interno (`--channel=internal`) para testes locais sem publicação.
   - `--validate-only` atua exclusivamente como trava de escrita em disco, sem relaxar as regras do modo oficial.
2. **Obrigatoriedade da Jornada Negativa (`scripts/finalize_distribution.ts` e Workflows):**
   - Inclusão incondicional de `journey-negative` no array de provas obrigatórias. Provas ausentes ou com status diferente de `'passed'` abortam a finalização com erro fatal.
   - Verificação do tipo de prova (`proof.mode === mode`), impedindo a substituição de uma prova por outra (ex.: reaproveitar smoke no lugar de jornada).
   - Atualização da política estrutural (`scripts/workflow_policy.ts`) e dos workflows (`build-release.yml` e `ci.yml`), exigindo a sequência rigorosa: `package:*` -> `test:release` -> `test:journey` -> `test:journey:negative` -> `test:installers` -> `distribution:finalize`.
3. **Validação de Reabertura pelo Comportamento Normal do Produto (`electron/main/documentJourneyRunner.ts`):**
   - Entrega do PDF corrompido ao input real `[data-testid="merge-input"]` junto com referência válida.
   - Disparo da operação normal de leitura e processamento (`[data-testid="merge-process"]`).
   - Verificação observável do banner de erro em `[data-testid="pdf-error"]` e comprovação de que o botão de exportação `[data-testid="merge-export"]` NÃO é liberado.
   - Remoção do arquivo corrompido pelo botão normal da interface (`[data-testid="remove-file-0"]`), dispensa do alerta e inserção do PDF legítimo.
   - Reprocessamento bem-sucedido, exportação atômica pelo IPC e validação física das páginas do documento gerado.
4. **Alinhamento dos Targets Linux:**
   - Alinhamento de todos os contratos e referências ao único formato Linux configurado no `package.json`: `AppImage`.

### Resultados Comprovados na Rodada

- **Tipagem Estática:** `npx tsc --noEmit` e `npm run typecheck:tools` aprovados com 0 erros.
- **Regressões de Distribuição:** 7/7 suítes aprovadas (`npm run test:distribution`), cobrindo as 12 regressões de publicação e integridade de jornada.
- **Bateria de PR:** 11/11 suítes aprovadas com 100% de sucesso (`npm test`).
- **Bundle de Produção:** Compilado e verificado com sucesso (`npm run build`).
- **Pacote Interno:** Gerado em diretório exclusivo `release/runs/1792531030001-ab66a3fc-66323a64`.
- **Smoke no Aplicativo Real:** 6/6 fases aprovadas (`npm run test:release`).
- **Jornada Positiva Real:** 5/5 estágios aprovados (`npm run test:journey`).
- **Jornada Negativa e Recuperação Real:** 5/5 estágios aprovados (`npm run test:journey:negative`): `ImportRecovery`, `ProcessRecovery`, `SaveRecovery`, `ReopenRecovery`, `Complete`.
- **Diagnósticos de Falha:** Os 4 cenários (`import`, `process`, `save`, `reopen`) confirmaram retorno de código 1.
- **Instaladores e Finalização:** `test:installers` e `distribution:finalize` homologaram os artefatos com `negativeJourney: passed`.
- **Ensaio de Publicação Interno:** `prepare_release_publication.ts --validate-only --channel=internal` aprovado.
- **Rejeição do Contrato Oficial:** Execução de `prepare_release_publication.ts` com `--channel=official` sobre o pacote interno foi imediatamente abortada com `[ERRO DE PUBLICAÇÃO] Pacote com canal "internal" rejeitado no modo de publicação oficial`.

### Artefatos e Evidências da Rodada 4

- Diretório exclusivo: `release/runs/1792531030001-ab66a3fc-66323a64`
- Commit-base: `ab66a3fc74d37b32811af77ab9f295b5b11fc18e`
- Versão: `1.0.0` | Arquitetura: `x64` | Canal: `internal`
- Classificação: **NÃO HOMOLOGADO**
- Digest de fontes (`sourceDigest`): `37c95574c83fa9c90ebba4dafead7fb3b2554746f38efd8eb83713054f4ba0d1`

| Artefato Interno | Tamanho Físico | Digest SHA-256 (FIPS 180-4) |
| :--- | :---: | :--- |
| `KovaxFiles Desktop-1.0.0-win-x64-setup.exe` | 137.19 MB (143.856.126 bytes) | `b13707930e723f603672c5e93c8b3c10bd89ad354fa3b7eacb148b6206233d95` |
| `KovaxFiles Desktop-1.0.0-win-x64-portable.exe` | 136.97 MB (143.626.658 bytes) | `7cc98bbde3307cb3f9edfc6a7b3f34ce3d97c84396d680b1c4a873d45a6fecd7` |

### Pendências Formais e Próximos Bloqueios da Rodada 4

1. **Assinatura Digital Corporativa (Authenticode / Apple Developer ID):** Sem credenciais de assinatura comercial provisionadas, os instaladores permanecem classificados como `NAO_HOMOLOGADO`. O canal oficial de release bloqueia publicações não assinadas.
2. **Homologação em Máquina Limpa (VM Isolada):** O roteiro de 7 passos definido na Rodada 3 permanece pendente de realização pelo operador técnico em VM Windows x64 sem ferramentas de desenvolvimento.
3. **Distribuição Nativa Multiplataforma:** As esteiras para geração de pacotes em macOS (`.dmg`, `.zip`) e Linux (`.AppImage`) dependem dos certificados e runners adequados no GitHub Actions.

---

## Rodada 5 — base aed1309, 20/10/2026: Identidade Canônica de Fontes, Contrato Compartilhado de Provas e Validação Multiplataforma

A base inspecionada desta rodada é o commit `aed1309e6f5e24c41d9bd8c6c4372a8c248c7126`. As correções das rodadas anteriores (seleção guiada por manifesto, contrato estrito de publicação oficial, obrigatoriedade de jornada negativa e recuperação real na UI) permanecem íntegras e validadas.

### Problemas Confirmados e Causas-Raízes

1. **Sensibilidade do `sourceDigest` a Finais de Linha de Checkout (LF vs CRLF):**
   - *Causa:* O cálculo de proveniência em `scripts/distribution_provenance.ts` lia os bytes brutos do checkout via `fs.readFileSync(file)`. Em ambientes Windows com checkout padrão do Git (conversão para CRLF), arquivos de código e configuração (`src/`, `electron/`, `scripts/`, etc.) apresentavam quebras de linha `\r\n`, enquanto no Linux e macOS tinham `\n`. Como a preparação de publicação exige identidade estrita do `sourceDigest` entre plataformas para o mesmo commit, builds legítimos de plataformas distintas eram indevidamente rejeitados. Além disso, arquivos críticos de build (como o `index.html` raiz e assets estáticos de `public/`) não estavam cobertos no regex de proveniência.
   - *Impacto:* Risco de falsos positivos na rejeição de compilações multiplataforma limpas e lacuna na cobertura de arquivos que afetam diretamente o bundle gerado.
2. **Duplicação e Desacoplamento do Contrato de Provas nos Testes Unitários:**
   - *Causa:* O arquivo `tests/unit/distribution_journey.test.ts` continha uma função local isolada (`validateProofContract`) de apenas 3 linhas, em vez de importar e testar o código real de validação de provas de execução.
   - *Impacto:* Caso uma verificação de segurança fosse enfraquecida ou removida em `finalize_distribution.ts` ou `prepare_release_publication.ts`, os testes continuariam passando falsamente sobre a cópia local, violando o princípio anti-regressão do `AGENTS.md`.

---

### Implementação Arquitetural e Governança Técnica

#### 1. Dupla Garantia de Distribuição: Identidade Canônica vs Integridade Física

Para resolver a portabilidade multiplataforma sem comprometer a segurança da distribuição, o KovaxFiles Desktop define duas garantias criptográficas distintas e complementares:

1. **Identidade Canônica das Fontes (`sourceDigest`):**
   - **Resistência a LF/CRLF:** Em arquivos textuais (`.ts`, `.tsx`, `.js`, `.jsx`, `.cjs`, `.mjs`, `.json`, `.html`, `.css`, `.yaml`, `.yml`, `.md`, `.plist`, `.svg`), o conteúdo é normalizado substituindo `\r\n` por `\n` antes do hash SHA-256.
   - **Intocabilidade de Arquivos Binários:** Arquivos binários (`.traineddata`, `.woff2`, `.woff`, `.ttf`, `.otf`, `.wasm`, `.png`, `.jpg`, `.jpeg`, `.ico`, `.icns`, `.bin`, `.pdf`) e arquivos com bytes nulos (`0x00`) **NUNCA** são normalizados; seus bytes físicos exatos são alimentados diretamente no digest.
   - **Cobertura Completa de Entradas de Build:** A proveniência rastreia todas as fontes que influenciam o produto: `src/`, `electron/`, `scripts/`, `.github/workflows/`, `public/`, `index.html`, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*.json`, `tailwind.config.js`, `postcss.config.js`, `.gitattributes` e `por.traineddata`.
   - **Detecção de Alterações Locais, Adições, Remoções e Renomeações:** A listagem utiliza `git ls-files --cached --others --exclude-standard`, garantindo que alterações locais não comitadas, novos arquivos não rastreados e exclusões ou renomeações alterem imediatamente a identidade canônica.
   - **Padronização Declarativa via `.gitattributes`:** Implementação de `.gitattributes` na raiz do repositório fixando `text=auto eol=lf` e declarando explicitamente binários e scripts, evitando qualquer renormalização massiva indiscriminada do repositório.
   - **Versionamento de Esquema:** Identificado pelo prefixo canônico `kovax-canonical-source-v2\0`.
2. **Integridade Exata dos Bytes Produzidos:**
   - Os arquivos finais distribuíveis (`app.asar`, executável descompactado e instaladores `.exe`, `.portable.exe`, `.AppImage`, `.dmg`) são verificados por seus digests SHA-256 (FIPS 180-4) exatos e tamanhos físicos em bytes. Qualquer alteração pós-teste é detectada e rejeitada sumariamente.

#### 2. Contrato Compartilhado de Provas de Produção (`scripts/distribution_contract.ts`)

O módulo `scripts/distribution_contract.ts` agora centraliza as funções oficiais de validação de provas e instaladores:
- `validateDistributionProof(proof, expectedMode, identity, expectedRecords, options)`: Valida modo (`smoke`, `journey`, `journey-negative`), status aprovado (`status: 'passed'`), identidade de execução (`runId`), commit, `sourceDigest`, plataforma, arquitetura, lista estrita de artefatos e integridade física de executável e payload (`checkExecutableAndPayload: true`).
- `readAndValidateDistributionProof(resultPath, expectedMode, identity, expectedRecords, options)`: Garante leitura segura e rejeição imediata se o arquivo de prova estiver ausente.
- `validateInstallersProof(installers, identity, expectedRecords)` e `readAndValidateInstallersProof(installersPath, identity, expectedRecords)`: Validam a prova unificada de instaladores.

Essas funções são importadas e consumidas de forma compartilhada por:
- `scripts/finalize_distribution.ts`: Bloqueia a consolidação e a geração do manifesto final caso qualquer evidência falhe.
- `scripts/prepare_release_publication.ts`: Garante que a esteira de publicação rejeite qualquer evidência divergente ou adulterada.
- `tests/unit/distribution_journey.test.ts`: Testa diretamente o código de produção contra todas as hipóteses de falha, demonstrando que enfraquecer o contrato real quebra a suíte de testes.

---

### Esclarecimentos Mandatórios de Governança e Segurança

#### 1. Diferenciação dos Três Níveis de Verificação da Plataforma

É terminantemente proibido confundir ou substituir estes três níveis:
1. **Testes de Pull Request (`npm test`):** Bateria de 11 suítes unitárias, de integração e auditoria forense executadas no ambiente de desenvolvimento Node.js/JSDOM. Comprovam a conformidade do código, sandbox, CSP, LGPD, integridade criptográfica AES-GCM, PAdES, DOCX e acervo de custódia. Não comprovam o empacotador nem o instalador.
2. **Testes de Pacote Nativo (`npm run test:release`, `test:journey`, `test:journey:negative`):** Execução do executável real gerado pelo Electron-Builder no diretório exclusivo da execução, sem runtimes de desenvolvimento no PATH. Testa a janela real do Chromium/Electron, IPC sanitizado, WebAssembly, OCR offline, gravação em disco e recuperação de erros na interface. Não atesta o comportamento de instalação no sistema operacional limpo.
3. **Homologação em Máquina Limpa (VM Isolada sem Node/Python):** Ensaio de instalação do setup NSIS em máquina Windows x64 pura sem ferramentas de desenvolvimento. Testa criação de atalhos, isolamento de diretórios de usuário, execução em privilégios restritos, operação 100% offline e desinstalação completa. **Permanece PENDENTE**.

#### 2. Linux AppImage Interno

O pipeline do KovaxFiles Desktop no Linux é plenamente autônomo. O build do target `AppImage` no canal interno (`DISTRIBUTION_CHANNEL=internal`, `ALLOW_UNSIGNED_INTERNAL=true`) pode ser gerado e testado com sucesso sob servidor X virtual (`xvfb-run`) sem desativar a sandbox do Chromium e sem qualquer necessidade de certificados da Apple (macOS) ou certificados Authenticode (Windows).

#### 3. Diferença entre Assinatura de Código (Authenticode) e Certificados ICP-Brasil/A1

- **Assinatura de Código de Software (Microsoft Authenticode / Apple Developer ID):** Assinatura criptográfica aplicada sobre o binário da aplicação (`.exe`, `.dmg`) antes da distribuição. Serve para que o Windows SmartScreen e o macOS Gatekeeper reconheçam a autenticidade do desenvolvedor e garantam que o executável não foi adulterado.
- **Certificados Digitais ICP-Brasil / A1:** Certificados X.509 utilizados internamente pelo KovaxFiles para assinar documentos e petições em formato PDF (`PAdES`), com valor legal para protocolo nos tribunais (PJe, Projudi, etc.).
- **Regra de Isolamento:** A presença de rotinas de assinatura ICP-Brasil ou a importação de certificados A1 pelo usuário no editor **NÃO** assina o software executável. A assinatura oficial de código do aplicativo permanece **PENDENTE** de certificado comercial Authenticode.

---

### Resultados Comprovados na Rodada 5

- **Tipagem Estática:** `npx tsc --noEmit` e `npm run typecheck:tools` aprovados com 0 erros.
- **Regressões de Distribuição:** 8/8 suítes aprovadas (`npm run test:distribution`), incluindo a nova suíte `distribution_provenance.test.ts`.
- **Bateria de PR:** 11/11 suítes homologadas com 100% de sucesso (`npm test`).
- **Bundle de Produção:** Compilado e auditado com sucesso (`npm run build`).
- **Pacote Interno:** Gerado em diretório exclusivo `release/runs/1792535051086-aed1309e-bd2effd1`.
- **Smoke no Aplicativo Real:** 6/6 fases aprovadas (`npm run test:release`).
- **Jornada Positiva Real:** 5/5 etapas aprovadas (`npm run test:journey`).
- **Jornada Negativa Real com Recuperação:** 5/5 estágios aprovados (`npm run test:journey:negative`): `ImportRecovery`, `ProcessRecovery`, `SaveRecovery`, `ReopenRecovery`, `Complete`.
- **Instaladores e Finalização:** `test:installers` e `distribution:finalize` homologaram os artefatos com `cleanMachineAcceptance: pending` e `classification: NAO_HOMOLOGADO`.
- **Ensaio de Publicação Interno:** `prepare_release_publication.ts --downloads=... --validate-only --channel=internal` aprovado com 2 instaladores selecionados.
- **Rejeição do Contrato Oficial:** Execução sobre o pacote interno com `--channel=official` abortada imediatamente com `[ERRO DE PUBLICAÇÃO] Pacote com canal "internal" rejeitado no modo de publicação oficial`.

---

### Artefatos e Evidências da Rodada 5

- Diretório exclusivo: `release/runs/1792535051086-aed1309e-bd2effd1`
- Commit-base: `aed1309e6f5e24c41d9bd8c6c4372a8c248c7126`
- Versão: `1.0.0` | Arquitetura: `x64` | Canal: `internal`
- Classificação: **NÃO HOMOLOGADO**
- Identidade canônica das fontes (`sourceDigest`): `2a2345b9ca20e7d2b06e93aab6a071b2c39f4ed00a5633abdf0f3299b419b663`

| Artefato Interno | Tamanho Físico | Digest SHA-256 (FIPS 180-4) |
| :--- | :---: | :--- |
| `KovaxFiles Desktop-1.0.0-win-x64-setup.exe` | 137.19 MB (143.852.152 bytes) | `06f07dcf4cef011609ccee56f4e1b6935c11b35e0384af91184b82779c34ac4b` |
| `KovaxFiles Desktop-1.0.0-win-x64-portable.exe` | 136.97 MB (143.624.210 bytes) | `03ff55ed7ff22b121f33ea0d5e75aeab075be1ff74e265f03c3d089843e257d5` |

---

### Roteiro de Homologação em Windows Limpo (Status: PENDENTE)

Para garantir que o instalador funcione perfeitamente para advogados e servidores sem ferramentas de desenvolvimento instaladas, o seguinte roteiro em VM Windows x64 limpa deve ser executado pelo operador homologador:

1. **Preparação da VM:**
   - Provisionar uma máquina virtual Windows 10/11 x64 limpa (sem Node.js, Python, Git, VSCode ou compiladores C++).
   - Tirar um snapshot limpo antes de qualquer teste.
2. **Transferência Segura e Verificação Criptográfica:**
   - Copiar o instalador `KovaxFiles Desktop-1.0.0-win-x64-setup.exe` e o `SHA256SUMS.txt` para a VM via compartilhamento interno ou mídia isolada.
   - No PowerShell da VM, verificar a integridade física:
     ```powershell
     Get-FileHash -Algorithm SHA256 "KovaxFiles Desktop-1.0.0-win-x64-setup.exe"
     ```
   - Confirmar se o digest coincide exatamente com `06f07dcf4cef011609ccee56f4e1b6935c11b35e0384af91184b82779c34ac4b`.
   - Notar que o instalador exibirá o aviso do SmartScreen ("Editor Desconhecido") por se tratar de build interno **NÃO HOMOLOGADO** sem certificado Authenticode comercial.
3. **Instalação pelo NSIS:**
   - Executar o instalador com usuário padrão (não-administrador).
   - Escolher diretório padrão (`%LOCALAPPDATA%\Programs\kovax-files-desktop`).
   - Confirmar a criação bem-sucedida de atalhos no Menu Iniciar e na Área de Trabalho.
4. **Operação 100% Offline:**
   - Desconectar a placa de rede da VM.
   - Abrir o KovaxFiles Desktop pelo atalho da Área de Trabalho.
   - Confirmar carregamento imediato da interface sem erros de rede, sem travamento de fontes (fontes locais do pacote) e sem avisos de dependências ausentes.
5. **Teste Funcional de PDF e OCR Local:**
   - Importar dois arquivos PDF de teste na ferramenta de manipulação/fusão.
   - Realizar a fusão, aplicar numeração/chancela e exportar o arquivo resultante.
   - Reabrir o PDF exportado no aplicativo e confirmar visualização correta das páginas.
   - Executar OCR sobre uma imagem contendo texto em português; confirmar que o worker Tesseract local processa sem falhas e sem conexões externas.
6. **Recuperação de Erros e Reinicialização:**
   - Tentar importar um arquivo PDF deliberadamente corrompido; confirmar exibição do alerta na UI e bloqueio do botão de exportação.
   - Fechar o aplicativo e reiniciar o sistema operacional da VM.
   - Reabrir o KovaxFiles Desktop e verificar integridade da aplicação e preferências locais.
7. **Desinstalação:**
   - Executar a desinstalação via "Configurações > Aplicativos" do Windows.
   - Confirmar remoção de atalhos, executáveis e chaves de registro.
   - Registrar evidências e capturas de tela.

**Status:** **PENDENTE** de execução pelo operador em ambiente de VM isolada.



---

## Rodada 6 — base c10d767, 20/10/2026: Contrato Obrigatório de Commit, Execução Remota Multiplataforma e Auditoria por Plataforma

Esta rodada consolida a implementação estrita do campo obrigatório de commit nas provas de distribuição, a execução e acompanhamento do fluxo interno de empacotamento via `workflow_dispatch` (Run `39516147493`), a auditoria detalhada dos resultados por plataforma (Windows, macOS e Linux) e o diagnóstico e roteiro para homologação em VM Windows limpa.

### 1. Ponto 1: Commit Obrigatório nas Provas de Distribuição

- **Regra e Contrato Estrito:** Em `scripts/distribution_contract.ts`, as interfaces `DistributionProof` e `InstallersProof` agora exigem estritamente `commit: string;`. Tanto `validateDistributionProof` quanto `validateInstallersProof` foram atualizados para rejeitar sumariamente:
  - Campo ausente (`undefined` ou omitido do JSON de evidência).
  - Campo vazio (`""` ou `"   "` com espaços em branco).
  - Campo divergente (commit presente, mas não idêntico ao `expected.commit`).
- **Validação com o Validador Real (Testes Unitários):**
  - Em `tests/unit/distribution_contract.test.ts`: Adicionadas baterias de testes testando diretamente o validador real contra provas reais de smoke, jornada, jornada negativa e instaladores, comprovando a rejeição com erro descritivo em todos os cenários negativos (ausente, vazio e divergente).
  - Em `tests/unit/distribution_journey.test.ts`: Adicionada verificação cruzada de rejeição em contratos de jornada documental.
- **Homologação:** Execução de `npm run test:distribution` aprovada com 100% de sucesso em todos os gates.

### 2. Ponto 2: Workflow Interno Completo (`workflow_dispatch`)

- **Workflow:** `.github/workflows/build-release.yml`.
- **Garantia de Isolamento Prévio:** Confirmado previamente que o acionamento interno via `workflow_dispatch` com `allow_unsigned_dev: true` não cria nem publica qualquer release no GitHub (0 releases existentes), não cria tags Git (0 tags existentes) e não aciona o deploy do GitHub Pages (o job `🚀 Homologação do Manifesto e Publicação` é protegido por `if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v') && needs.build.outputs.allow_unsigned != 'true'`).
- **Acompanhamento da Execução até a Conclusão:**
  - **Run ID:** [`39516147493`](https://github.com/KovaxOmniBridge/KovaxFiles/actions/runs/39516147493)
  - **Commit-base:** `c10d7670bdbb25d0a4ceb3d92b262869e7fd1380`
  - **Job Pré-vôo / Portão de CI:** [118948657800](https://github.com/KovaxOmniBridge/KovaxFiles/actions/runs/39516147493/job/118948657800) — **SUCESSO** (executou as 11 suítes de PR, load test, benchmark e auditoria de redação).
  - **Job Publicação:** [118952052018](https://github.com/KovaxOmniBridge/KovaxFiles/actions/runs/39516147493/job/118952052018) — **SKIPPED** (nenhuma tag, release ou deploy de Pages criado).

### 3. Ponto 3: Resultados por Plataforma (Windows, macOS e Linux)

Os resultados do workflow `39516147493` foram inspecionados individualmente via API e logs brutos de execução:

| Plataforma | Runner GitHub | Job ID & Link | Geração Pacote | Smoke Test | Jornada Positiva | Jornada Negativa | Instaladores | Manifesto SHA-256 | Status Consolidado |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Windows** | `windows-latest` | [118949377899](https://github.com/KovaxOmniBridge/KovaxFiles/actions/runs/39516147493/job/118949377899) | ✅ APROVADO | ✅ APROVADO | ✅ APROVADO | ✅ APROVADO | ✅ APROVADO | ✅ APROVADO | **CONCLUÍDO (NÃO HOMOLOGADO)** |
| **macOS** | `macos-latest` | [118949377738](https://github.com/KovaxOmniBridge/KovaxFiles/actions/runs/39516147493/job/118949377738) | ✅ APROVADO | ✅ APROVADO | ✅ APROVADO | ✅ APROVADO | ✅ APROVADO | ✅ APROVADO | **CONCLUÍDO (NÃO HOMOLOGADO)** |
| **Linux** | `ubuntu-latest` | [118949377779](https://github.com/KovaxOmniBridge/KovaxFiles/actions/runs/39516147493/job/118949377779) | ✅ APROVADO | ❌ FALHOU | ⏳ PENDENTE | ⏳ PENDENTE | ⏳ PENDENTE | ⏳ PENDENTE | **PENDENTE (Falha no Smoke)** |

#### Detalhamento Técnico Comprovado:

1. **Windows (`windows-latest`):**
   - **Artefatos Gerados:**
     - `KovaxFiles Desktop-1.0.0-win-x64-setup.exe` (142.537.487 bytes | 135.93 MB) — SHA-256: `d18e3fb1c960a085f54ba0a8799aec0646398f024125449bedd6e5a746418758`
     - `KovaxFiles Desktop-1.0.0-win-x64-portable.exe` (142.309.577 bytes | 135.72 MB) — SHA-256: `fea7ddf44822a5f857dc60ed70093496118363e7c71e5d6ba72006bd8ba96131`
   - **Provas de Execução:** `evidence/smoke/result.json`, `evidence/journey/result.json`, `evidence/journey-negative/result.json`, `evidence/installers.json` e `evidence/distribution.json` validados com `status: "passed"` e `commit: "c10d7670bdbb25d0a4ceb3d92b262869e7fd1380"`.
   - **Classificação:** **NÃO HOMOLOGADO** (canal interno, sem assinatura comercial Authenticode).

2. **macOS (`macos-latest`):**
   - **Artefatos Gerados:**
     - `KovaxFiles Desktop-1.0.0-mac-arm64.dmg` (172.854.769 bytes | 164.85 MB) — SHA-256: `c7d7cdf0f54c3b71ef24c2e29d4dcfa0c9cc72cea6e4f77352e6d443cf6ce2f0`
     - `KovaxFiles Desktop-1.0.0-mac-arm64.zip` (166.818.739 bytes | 159.09 MB) — SHA-256: `6d7fba1c55ff26f5a2e6f154c8f66653a886c643807c7618f65e38e808a2f87b`
   - **Provas de Execução:** Smoke, jornada documental, jornada negativa, instaladores e manifesto validados com sucesso no runner ARM64.
   - **Classificação:** **NÃO HOMOLOGADO** (canal interno, sem assinatura Apple Developer ID / Notarização).

3. **Linux (`ubuntu-latest`):**
   - **Geração do Pacote:** Concluída com sucesso (`KovaxFiles Desktop-1.0.0-linux-x86_64.AppImage` e `linux-unpacked/kovax-files-desktop`).
   - **Falha no Smoke:** O Chromium/Electron abortou com erro de setuid sandbox:
     `FATAL:setuid_sandbox_host.cc:166] The SUID sandbox helper binary was found, but is not configured correctly. You need to make sure that /home/runner/work/KovaxFiles/KovaxFiles/release/runs/39516147493-1-ubuntu-latest/linux-unpacked/chrome-sandbox is owned by root and has mode 4755.`
   - **Etapas Seguintes:** Conforme a regra mandatória ("Job pulado ou não executado deve permanecer pendente"), jornadas positiva, negativa, instaladores e manifesto permanecem estritamente como **PENDENTES**.

### 4. Ponto 4: Homologação em Windows em VM Limpa

- **Diagnóstico do Ambiente Local:**
  - Foi verificado que o sistema host de desenvolvimento possui ferramentas instaladas (Node.js v24.22.0, Python 3.15, Git, VS Code).
  - O host não possui motor de virtualização disponível ou configurado: Hyper-V (`Get-VM`) inativo, VirtualBox (`VBoxManage`) ausente, VMware (`vmrun`) ausente e Windows Sandbox (`WindowsSandbox.exe`) não instalado na edição do Windows local.
  - **O que falta para execução automatizada:**
    1. Instalação e habilitação do recurso Windows Sandbox (`Enable-WindowsOptionalFeature -FeatureName "Containers-DisposableClientVM" -All`) ou provisionamento de uma VM Hyper-V/VirtualBox isolada.
    2. Provisionamento de imagem Windows 10/11 limpa (sem PATH de Node, Python ou compiladores).
    3. Mecanismo de isolamento de rede (virtual switch offline).

- **Roteiro Curto de Execução Manual em VM Limpa (8 Passos):**
  1. **Conferência de Hash:** Na VM limpa, verificar o digest SHA-256 do instalador baixado:
     ```powershell
     (Get-FileHash "KovaxFiles Desktop-1.0.0-win-x64-setup.exe" -Algorithm SHA256).Hash
     ```
     Conferir se é exatamente `d18e3fb1c960a085f54ba0a8799aec0646398f024125449bedd6e5a746418758`.
  2. **Instalação:** Executar o instalador com usuário comum (não-elevado), instalar no `%LOCALAPPDATA%` padrão e verificar criação dos atalhos no Menu Iniciar e Desktop.
  3. **Abertura Offline:** Desconectar os adaptadores de rede da VM. Iniciar o KovaxFiles Desktop pelo atalho. Confirmar que a janela abre sem exigir conexões externas e sem erros de dependências ausentes (ex.: VCRedist).
  4. **Operação PDF:** Importar dois PDFs de teste, executar a fusão/numeração e salvar/exportar o arquivo resultante.
  5. **OCR Documental:** Carregar uma imagem contendo texto em português e disparar o reconhecimento. Confirmar que o worker Tesseract local embutido conclui o OCR offline com sucesso.
  6. **Recuperação de Erros:** Fornecer um arquivo PDF truncado/corrompido. Confirmar que o aplicativo exibe toast/alerta de erro na UI e desabilita exportação sem travamento da aplicação.
  7. **Reinício do Aplicativo:** Fechar o KovaxFiles Desktop, reiniciar o sistema operacional da VM, reabrir o aplicativo e verificar integridade da interface e retenção de configurações locais.
  8. **Desinstalação Limpa:** Acessar "Configurações > Aplicativos > Aplicativos Instalados", desinstalar o KovaxFiles Desktop e verificar a remoção completa de executáveis, pastas em `%LOCALAPPDATA%\Programs` e atalhos.

### 5. Auditoria de Governança e Regressões

- **Bateria Local (`npm test`):** 11 de 11 suítes de PR homologadas com 100% de aprovação (Build, Segurança Electron, PDF, LGPD, Criptografia AES-GCM, DOCX, OCR, PAdES, Protocolo Judicial, Acervo Jurídico e Testes Adversariais).
- **Classificação Mandatória:** Todos os pacotes internos gerados nesta rodada continuam classificados expressamente como **NÃO HOMOLOGADOS**. Nenhuma prontidão para lançamento oficial é declarada.

---

## Rodada 7 — base d8d1911, 20/10/2026: Correção de Sandbox Linux, Reexecução do Workflow Interno Multiplataforma (Aprovação Global) e Auditoria por Plataforma

Esta rodada consolida a resolução técnica definitiva da sandbox Chromium no Linux sem uso de `--no-sandbox`, a reexecução do workflow de empacotamento interno via `workflow_dispatch` (Run `39520761216`) com **100% de aprovação em todas as plataformas (Linux, Windows e macOS)**, a auditoria detalhada dos novos artefatos e hashes gerados, e a manutenção da pendência de aceitação manual em VM Windows limpa.

### 1. Diagnóstico da Execução Anterior (Falha Global na Rodada 6)

- **Resultado Global da Execução 39516147493:** Conforme auditado, embora os jobs de Windows (`118949377899`) e macOS (`118949377738`) tenham sido aprovados, a execução remota global terminou com **`conclusion: failure`**.
- **Causa Raiz da Falha no Linux (Job 118949377779):**
  Ao invocar `xvfb-run -a npm run test:release`, o executável empacotado (`release/runs/.../linux-unpacked/kovax-files-desktop`) abortou prematuramente com a seguinte mensagem fatal do Chromium:
  ```text
  FATAL:setuid_sandbox_host.cc:166] The SUID sandbox helper binary was found, but is not configured correctly. You need to make sure that /home/runner/work/KovaxFiles/KovaxFiles/release/runs/39516147493-1-ubuntu-latest/linux-unpacked/chrome-sandbox is owned by root and has mode 4755.
  ```
  Devido a esse abort, as etapas subsequentes do runner Linux (Jornada Documental, Jornada Negativa, Validação de Instaladores e Manifesto) foram puladas (`skipped`), impedindo a consolidação do pipeline interno.

### 2. Correção da Sandbox Linux (Sem `--no-sandbox` e Sem Mascarar Falhas)

- **Mecanismos de Sandboxing do Chromium no Linux:**
  O Chromium suporta dois mecanismos de isolamento de processos no Linux:
  1. **SUID Sandbox Helper (`chrome-sandbox`):** Um binário dedicado que necessita pertencer ao `root` com bit SUID (`4755`). Ele permite criar namespaces de isolamento e rebaixar privilégios para o usuário sem privilégios.
  2. **Unprivileged User Namespaces (`CLONE_NEWUSER`):** Isolamento via kernel para usuários não-root.
  No entanto, pela implementação estrita do Chromium (`setuid_sandbox_host.cc`), se o arquivo `chrome-sandbox` existir no diretório da aplicação, o Chromium inspeciona obrigatoriamente se ele é de propriedade do `root` (`uid == 0`) e possui permissão `04755`. Caso exista mas pertença ao usuário comum (como criado pelo `electron-builder` sob o usuário `runner`), o Chromium aborta imediatamente por razões de segurança para não executar de forma degradada.

- **Proibição Estrita de `--no-sandbox`:**
  A diretriz mandatória proíbe expressamente o uso da flag `--no-sandbox` no empacotamento e nos testes do executável de produção, pois desabilitar a sandbox exporia o renderer a vetores de comprometimento de memória e violações de segurança.
- **Preparação Cirúrgica no CI:**
  No runner do GitHub Actions (`ubuntu-latest`), o usuário `runner` possui privilégios de `sudo` sem senha. A correção foi implementada em duas camadas complementares:
  1. **No Workflow CI (`.github/workflows/build-release.yml` e `ci.yml`):** Adicionada a etapa `Configurar sandbox SUID do Chromium no Linux (CI)` logo após a compilação do pacote e antes do smoke:
     ```bash
     CHROME_SANDBOX=$(find "${RELEASE_DIR}" -name "chrome-sandbox" -type f | head -n 1)
     sudo chown root:root "$CHROME_SANDBOX"
     sudo chmod 4755 "$CHROME_SANDBOX"
     ```
  2. **No Runner de Testes Packaged (`tests/suites/desktop_packaged.test.ts` e `scripts/linux_sandbox.ts`):** Invocação de `ensureLinuxSandboxConfigured(executable)`, que valida a integridade do helper e realiza o ajuste caso o ambiente possua elevação disponível.
- **Diferenciação Arquitetural Estrita (CI vs AppImage do Usuário Final):**
  - **Ambiente de CI (Executável Desempacotado):** O teste automatizado executa o executável desempacotado (`linux-unpacked/kovax-files-desktop`) diretamente sobre o sistema de arquivos ext4 nativo do runner. O ajuste SUID helper (`root:root 4755`) é a abordagem correta e segura para testar a aplicação empacotada com sandbox Chromium 100% ativo.
  - **Máquina do Usuário Final (AppImage):** O pacote distribuído aos usuários no Linux é o AppImage (`KovaxFiles Desktop-1.0.0-linux-x86_64.AppImage`). Os AppImages são executados por usuários comuns montados via FUSE (ou extraídos para `/tmp`). O subsistema FUSE do kernel Linux impõe obrigatoriamente a flag de montagem `nosuid` por segurança, o que impede que qualquer binário SUID interno atue com elevação. Na máquina do usuário final, o Electron/Chromium utiliza o mecanismo nativo de **unprivileged user namespaces** (`CLONE_NEWUSER`) suportado pelo kernel da distribuição. Em sistemas com restrições AppArmor (como Ubuntu 24.04), os usuários utilizam o perfil AppArmor do sistema ou pacotes nativos (.deb/.rpm) onde o gerenciador de pacotes configura o SUID helper do sistema.
  - **Garantia:** A preparação no CI é exclusiva do ambiente de validação automatizada e não corrompe nem altera os requisitos do AppImage na máquina do usuário.

### 3. Reexecução do Workflow Interno Completo (`workflow_dispatch`)

- **Workflow:** `.github/workflows/build-release.yml`.
- **Canal Interno Explícito:** Acionamento manual via `workflow_dispatch` com `allow_unsigned_dev: true`.
- **Garantias de Não-Publicação:** Confirmado previamente que 0 tags, 0 releases e 0 deploys de Pages foram criados. O job de publicação permaneceu `skipped`.
- **Acompanhamento da Execução:**
  - **Run ID:** [`39520761216`](https://github.com/KovaxOmniBridge/KovaxFiles/actions/runs/39520761216)
  - **Status:** `completed`
  - **Conclusion:** **`success`** (Aprovação Global do Workflow!)
  - **Commit-base:** [`d8d1911776f9c89482bda9f893e915ba40a464f1`](https://github.com/KovaxOmniBridge/KovaxFiles/commit/d8d1911776f9c89482bda9f893e915ba40a464f1)
  - **Job Pré-vôo / Portão de CI:** [118963755617](https://github.com/KovaxOmniBridge/KovaxFiles/actions/runs/39520761216/job/118963755617) — **SUCESSO** (11 suítes de PR, testes de carga, benchmark e auditoria de redação).
  - **Job Publicação:** [118966930241](https://github.com/KovaxOmniBridge/KovaxFiles/actions/runs/39520761216/job/118966930241) — **SKIPPED** (proteção de canal interno mantida).

### 4. Tabela de Resultados por Plataforma (Run 39520761216)

| Plataforma | Runner GitHub | Job ID & Link | Geração Pacote | Sandbox Config | Smoke Test | Jornada Positiva | Jornada Negativa | Instaladores | Manifesto SHA-256 | Status Consolidado |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Linux** | `ubuntu-latest` | [118964476567](https://github.com/KovaxOmniBridge/KovaxFiles/actions/runs/39520761216/job/118964476567) | ✅ APROVADO | ✅ APROVADO (root:root 4755) | ✅ APROVADO | ✅ APROVADO | ✅ APROVADO | ✅ APROVADO | ✅ APROVADO | **CONCLUÍDO (NÃO HOMOLOGADO)** |
| **Windows** | `windows-latest` | [118964476628](https://github.com/KovaxOmniBridge/KovaxFiles/actions/runs/39520761216/job/118964476628) | ✅ APROVADO | N/A (Windows OS) | ✅ APROVADO | ✅ APROVADO | ✅ APROVADO | ✅ APROVADO | ✅ APROVADO | **CONCLUÍDO (NÃO HOMOLOGADO)** |
| **macOS** | `macos-latest` | [118964476627](https://github.com/KovaxOmniBridge/KovaxFiles/actions/runs/39520761216/job/118964476627) | ✅ APROVADO | N/A (macOS Seatbelt) | ✅ APROVADO | ✅ APROVADO | ✅ APROVADO | ✅ APROVADO | ✅ APROVADO | **CONCLUÍDO (NÃO HOMOLOGADO)** |

#### Detalhamento Técnico dos Artefatos Gerados e Hashes Auditados:

1. **Linux (`ubuntu-latest` / Job 118964476567):**
   - **Artefatos:**
     - `KovaxFiles Desktop-1.0.0-linux-x86_64.AppImage` (182.136.006 bytes | 173.70 MB)
       - SHA-256: `44b59795147c0538a79a32c250d4022c4fbcfa001eb70f7cfcb95eeb8e94fa00`
   - **Evidências de Execução:** Provas de sandbox SUID helper, smoke, jornada positiva, jornada negativa, instaladores e manifesto validadas com sucesso (`commit: "d8d1911776f9c89482bda9f893e915ba40a464f1"`).
   - **Classificação:** **NÃO HOMOLOGADO** (canal interno, artefato de desenvolvimento).

2. **Windows (`windows-latest` / Job 118964476628):**
   - **Artefatos:**
     - `KovaxFiles Desktop-1.0.0-win-x64-setup.exe` (142.541.295 bytes | 135.93 MB)
       - SHA-256: `a03a8b84d5b7a4a7548c2670e9a59c78ca5e80718fc898e0b67484d29e7195c6`
     - `KovaxFiles Desktop-1.0.0-win-x64-portable.exe` (142.313.385 bytes | 135.72 MB)
       - SHA-256: `4c9aef98af4a54564c7d0d0f592671520630b14c330df30b6f17c4943f60f607`
   - **Evidências de Execução:** Smoke, jornada documental, jornada negativa, instaladores e manifesto validados com sucesso no runner x64.
   - **Classificação:** **NÃO HOMOLOGADO** (canal interno, sem assinatura comercial Authenticode).

3. **macOS (`macos-latest` / Job 118964476627):**
   - **Artefatos:**
     - `KovaxFiles Desktop-1.0.0-mac-arm64.dmg` (172.883.393 bytes | 164.87 MB)
       - SHA-256: `2b947e4bab2f06bd9e011746f366112ff75a5933bead8e5bdf67eb53bb4da422`
     - `KovaxFiles Desktop-1.0.0-mac-arm64.zip` (166.822.818 bytes | 159.09 MB)
       - SHA-256: `488b27ce0547c9c0f99767664ca9ee093fbb1c28c899ca101fcf2ea57fc46cfa`
   - **Evidências de Execução:** Smoke, jornada documental, jornada negativa, instaladores e manifesto validados com sucesso no runner ARM64.
   - **Classificação:** **NÃO HOMOLOGADO** (canal interno, sem assinatura Apple Developer ID / Notarização).

### 5. Windows em VM Limpa — Diagnóstico e Instruções ao Operador

- **Diagnóstico do Host:**
  - Foi verificado que o sistema host de desenvolvimento possui ferramentas instaladas (Node.js v24.22.0, Python 3.15, Git, VS Code).
  - O host não possui motor de virtualização disponível ou configurado: Hyper-V (`Get-VM`) inativo, VirtualBox (`VBoxManage`) ausente, VMware (`vmrun`) ausente e Windows Sandbox (`WindowsSandbox.exe`) não instalado na edição do Windows local.
  - Conforme diretriz estrita ("Não use o host de desenvolvimento como substituto"), a homologação manual em máquina limpa permanece como **PENDENTE**.

- **Roteiro Curto de Execução Manual em VM Limpa (8 Passos):**
  1. **Conferência de Hash:** Na VM limpa (sem Node.js, Python ou Git), verificar o digest SHA-256 do instalador baixado:
     ```powershell
     (Get-FileHash "KovaxFiles Desktop-1.0.0-win-x64-setup.exe" -Algorithm SHA256).Hash
     ```
     Conferir se é exatamente `a03a8b84d5b7a4a7548c2670e9a59c78ca5e80718fc898e0b67484d29e7195c6`.
  2. **Instalação:** Executar o instalador com usuário comum (não-elevado), instalar no `%LOCALAPPDATA%` padrão e verificar criação dos atalhos no Menu Iniciar e Desktop.
  3. **Abertura Offline:** Desconectar os adaptadores de rede da VM. Iniciar o KovaxFiles Desktop pelo atalho. Confirmar que a janela abre sem exigir conexões externas e sem erros de dependências ausentes (ex.: VCRedist).
  4. **Operação PDF:** Importar dois PDFs de teste, executar a fusão/numeração e salvar/exportar o arquivo resultante.
  5. **OCR Documental:** Carregar uma imagem contendo texto em português e disparar o reconhecimento. Confirmar que o worker Tesseract local embutido conclui o OCR offline com sucesso.
  6. **Recuperação de Erros:** Fornecer um arquivo PDF truncado/corrompido. Confirmar que o aplicativo exibe toast/alerta de erro na UI e desabilita exportação sem travamento da aplicação.
  7. **Reinício do Aplicativo:** Fechar o KovaxFiles Desktop, reiniciar o sistema operacional da VM, reabrir o aplicativo e verificar integridade da interface e retenção de configurações locais.
  8. **Desinstalação Limpa:** Acessar "Configurações > Aplicativos > Aplicativos Instalados", desinstalar o KovaxFiles Desktop e verificar a remoção completa de executáveis, pastas em `%LOCALAPPDATA%\Programs` e atalhos.

### 6. Auditoria de Governança e Regressões

- **Bateria Local (`npm test`):** 11 de 11 suítes de PR homologadas com 100% de aprovação (Build, Segurança Electron, PDF, LGPD, Criptografia AES-GCM, DOCX, OCR, PAdES, Protocolo Judicial, Acervo Jurídico e Testes Adversariais).
- **Anti-Regressão de Sandbox Linux (`tests/unit/distribution_sandbox.test.ts`):** Adicionada suíte mandatória que comprova:
  - Detecção e rejeição de binários `chrome-sandbox` ausentes, não pertencentes a root ou sem permissão `4755`.
  - Proibição de `--no-sandbox` no runner empacotado (`desktop_packaged.test.ts`) e nos workflows (`build-release.yml` e `ci.yml`).
  - Presença obrigatória da etapa de configuração do SUID helper no workflow do Linux.
  - Conformidade das garantias de segurança e diferenciação entre CI e AppImage.
- **Classificação Mandatória:** Todos os pacotes internos gerados nesta rodada continuam classificados expressamente como **NÃO HOMOLOGADOS**. Nenhuma prontidão para lançamento oficial é declarada.





