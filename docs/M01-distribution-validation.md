# M01 — Empacotamento e validação interna

Os resultados iniciais abaixo são o registro histórico da rodada do commit `6b3c686`. A seção “Rodada 2” registra as correções posteriores e o procedimento da base `38caad5`/`471971f`; a seção “Rodada 3” consolida a correção de seleção de artefatos de publicação e os cenários negativos da jornada real na base `471971f`. Os registros anteriores não foram substituídos.

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

### Pendências Formais e Próximos Bloqueios

1. **Assinatura Digital Corporativa (Authenticode / Apple Developer ID):** Sem credenciais de assinatura comercial provisionadas, os instaladores permanecem classificados como `NAO_HOMOLOGADO`. O canal oficial de release bloqueia publicações não assinadas.
2. **Homologação em Máquina Limpa (VM Isolada):** O roteiro de 7 passos definido na Rodada 3 permanece pendente de realização pelo operador técnico em VM Windows x64 sem ferramentas de desenvolvimento.
3. **Distribuição Nativa Multiplataforma:** As esteiras para geração de pacotes em macOS (`.dmg`, `.zip`) e Linux (`.AppImage`) dependem dos certificados e runners adequados no GitHub Actions.


