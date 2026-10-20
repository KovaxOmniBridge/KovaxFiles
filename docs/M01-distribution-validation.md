# M01 — Empacotamento e validação interna

Os resultados iniciais abaixo são o registro histórico da rodada do commit `6b3c686`. A seção “Rodada 2” registra as correções posteriores e o procedimento vigente; os registros anteriores não foram substituídos.

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
