# M01 — Empacotamento e validação interna

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
