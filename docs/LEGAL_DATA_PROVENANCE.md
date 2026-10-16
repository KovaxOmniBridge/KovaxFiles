# Proveniência, Autenticidade e Versionamento do Acervo Jurídico — KovaxFiles Desktop

Este documento formaliza as regras de custódia, proveniência documental, auditoria de fontes oficiais e versionamento de normas e enunciados jurídicos integrados ao **KovaxFiles Desktop**.

---

## 1. Princípios de Custódia e Não-Repúdio

No ambiente forense, a citação de enunciados sumulares ou dispositivos legais exige ancoragem em publicações autênticas do Diário da Justiça Eletrônico (DJe) ou Diário Oficial da União (DOU). Para evitar contaminação ou desatualização:

1. **Cadeia de Proveniência Obrigatória:** Cada registro de jurisprudência ou legislação mantém um registro de proveniência com autoridade emissora, URL exata de publicação, data de captura real, versão canônica e hashes criptográficos segregados.
2. **Rejeição de Domínios Não Oficiais:** Um domínio comercial (`.com`, `.net`, `.org`, `.adv.br`) não é aceito como fonte oficial de publicação. Somente domínios institucionais sob as zonas `.jus.br`, `.gov.br` ou `.leg.br` são admitidos para atestar autenticidade.
3. **Segregação de Hashes e Bloqueio de Autovalidação:** O hash do conteúdo local (`storedContentHash`) NUNCA pode ser reutilizado como se fosse o hash da fonte externa (`externalSourceHash`). Clonar o hash local para o campo externo sem captura física documental é categorizado como fraude técnica de autovalidação e é automaticamente rejeitado pelo `LegalCorpusAuditorService`.
4. **Eliminação de Datas Presumidas:** A data de promulgação ou publicação de uma súmula (ex: 2007) NUNCA é tratada como a data de captura do aplicativo. Registros sem timestamp de rede real documentado têm o campo `capturedAt` obrigatoriamente definido como nulo/indefinido.
5. **Distinção de URNs LexML:** URNs geradas localmente pelo aplicativo são marcadas explicitamente como *provisórias* (`urn:lex:br:federal:...:provisorio`) e não comprovam que o texto foi indexado pelo catálogo LexML do Senado Federal.

---

## 2. Fontes Oficiais Homologadas

| Órgão / Tribunal | Esfera | Domínio Autorizado | Acervo Coberto |
| :--- | :---: | :--- | :--- |
| **Supremo Tribunal Federal (STF)** | Judiciário Federal | `jurisprudencia.stf.jus.br` | Súmulas Vinculantes (1 a 62), Súmulas Predominantes e DJe. |
| **Superior Tribunal de Justiça (STJ)** | Judiciário Federal | `scon.stj.jus.br` | Súmulas Predominantes e Temas Repetitivos. |
| **Tribunal Superior do Trabalho (TST)** | Judiciário Trabalhista | `jurisprudencia.tst.jus.br` | Súmulas e Orientações Jurisprudenciais (OJ). |
| **Presidência da República (Planalto)** | Executivo Federal | `www.planalto.gov.br` | CF/88, Códigos (CPC, CC, CP, CLT, CTN), Estatutos e Leis Ordinárias. |
| **Portal LexML Brasil** | Intergovernamental | `www.lexml.gov.br` | Metadados oficiais de publicação e identificadores universais URN. |

---

## 3. Estados de Autenticidade e Custódia

A classificação de um registro jurídico corresponde estritamente às evidências técnicas verificadas no repositório:

- **`COMPROVADO_COM_EVIDENCIA`:**
  - Publicação oficial identificada com URL governamental exata.
  - Captura física independente documentada com arquivo bruto arquivado (`hasDocumentedSnapshot = true`).
  - Hash SHA-256 do arquivo bruto externo registrado (`rawArtifactSha256`).
  - Timestamp real da requisição registrado (`capturedAt`).
  - Comparação do texto canônico extraído 100% coincidente com o texto local (`contentMatch = true`).
- **`NAO_VERIFICADO_EXTERNAMENTE` (Padrão de Acervo Local):**
  - Dispositivo cadastrado no acervo do aplicativo, com redação factual íntegra, porém cuja captura física automatizada perante a autoridade governamental ainda não foi executada ou arquivada.
  - Não recebe selo de comprovação oficial nem hashes forjados.
- **`DIVERGENCIA_DETECTADA`:**
  - Ocorrência de divergência material entre o texto armazenado localmente e o texto extraído da publicação oficial capturada. Suspenso preventivamente para uso forense.
- **`SUSPENSO_PREVENTIVAMENTE`:**
  - Processo de edição suspenso por decisão do Tribunal ou ausência de publicação no Diário Oficial.
  - **Exemplo Prático (Súmula Vinculante 30):** O Plenário do STF suspendeu o processo de edição no PSV 30 (DJe nº 235/2010), e o enunciado não chegou a ser publicado no DJe. O KovaxFiles classifica este enunciado como `SUSPENSO_PREVENTIVAMENTE`, emitindo alerta visual obrigatório na interface e impedindo sua citação inadvertida como precedente vinculante ativo.

---

## 4. Política de Atualização e Versionamento

1. **Imutabilidade Histórica:** A alteração ou cancelamento de uma súmula ou dispositivo legal nunca sobrescreve o registro original. Uma nova versão é gerada com incremento do número de revisão (`version: 2`), mantendo a data de vigência do texto anterior e os metadados do acórdão revisor.
2. **Auditoria Automatizada:** O script [scripts/test_auditable_legal_corpus.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/scripts/test_auditable_legal_corpus.ts) e a Suíte 10 de testes executam auditoria contínua em todo o acervo, garantindo que nenhum registro suspenso seja promovido indevidamente.
