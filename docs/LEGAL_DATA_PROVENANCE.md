# Proveniência, Autenticidade e Versionamento do Acervo Jurídico — KovaxFiles Desktop

Este documento formaliza as regras de custódia, proveniência documental, auditoria de fontes oficiais e versionamento de normas e enunciados jurídicos integrados ao **KovaxFiles Desktop**.

---

## 1. Princípios de Custódia e Não-Repúdio

No ambiente forense, a citação de enunciados sumulares ou dispositivos legais exige ancoragem em publicações autênticas do Diário da Justiça Eletrônico (DJe) ou Diário Oficial da União (DOU). Para evitar contaminação ou desatualização:

1. **Cadeia de Proveniência Obrigatória:** Cada registro de jurisprudência ou legislação mantém um registro de proveniência com autoridade emissora, URL exata de publicação, data de captura, versão canônica e hashes criptográficos.
2. **Rejeição de Domínios Não Oficiais:** Um domínio comercial (`.com`, `.net`, `.org`, `.adv.br`) não é aceito como fonte oficial de publicação. Somente domínios institucionais sob as zonas `.jus.br`, `.gov.br` ou `.leg.br` são admitidos para atestar autenticidade.
3. **Segregação de Hashes:** O hash do conteúdo local (`contentHash`) não pode ser reutilizado como se fosse o hash da fonte externa (`sourceHash`). Ambos são calculados e registrados de forma segregada.
4. **Distinção de URNs LexML:** URNs geradas localmente pelo aplicativo são marcadas explicitamente como *provisórias* (`urn:lex:br:federal:...:provisorio`) e não comprovam que o texto foi indexado pelo catálogo LexML do Senado Federal.

---

## 2. Fontes Oficiais Homologadas

| Órgão / Tribunal | Esfera | Domínio Autorizado | Acervo Coberto |
| :--- | :---: | :--- | :--- |
| **Supremo Tribunal Federal (STF)** | Judiciário Federal | `portal.stf.jus.br` | Súmulas Vinculantes (1 a 62), Súmulas da Jurisprudência Predominante e DJe. |
| **Superior Tribunal de Justiça (STJ)** | Judiciário Federal | `scon.stj.jus.br` | Súmulas Predominantes e Temas Repetitivos. |
| **Tribunal Superior do Trabalho (TST)** | Judiciário Trabalhista | `jurisprudencia.tst.jus.br` | Súmulas e Orientações Jurisprudenciais (OJ). |
| **Presidência da República (Planalto)** | Executivo Federal | `www.planalto.gov.br` | CF/88, Códigos (CPC, CC, CP, CLT, CTN), Estatutos e Leis Ordinárias. |
| **Portal LexML Brasil** | Intergovernamental | `www.lexml.gov.br` | Metadados oficiais de publicação e identificadores universais URN. |

---

## 3. Estados de Autenticidade

A classificação de um registro jurídico corresponde estritamente às evidências técnicas verificadas no repositório:

- **`COMPROVADO_COM_EVIDENCIA` / `VERIFICADO_COM_FONTE_OFICIAL`:**
  - Publicação oficial identificada com URL governamental exata.
  - Captura física com hash da fonte externa registrado.
  - Comparação do texto canônico 100% coincidente com o texto publicado.
- **`EM_REVISAO`:**
  - Registro incluído no acervo, porém pendente de checagem do hash externo ou capturado durante sessões plenárias recentes antes da publicação do acórdão.
- **`SUSPENSO_NAO_COMPROVADO`:**
  - Ocorrência de divergência textual, suspensão por decisão liminar ou ausência de evidência comprovável de publicação oficial.
  - **Exemplo Prático (Súmula Vinculante 30):** O STF suspendeu liminarmente a aplicação da SV 30 na Reclamação 22.384. O KovaxFiles classifica este enunciado como `SUSPENSO_NAO_COMPROVADO`, emitindo alerta visual obrigatório na interface e impedindo sua citação inadvertida como precedente vinculante ativo.

---

## 4. Política de Atualização e Versionamento

1. **Imutabilidade Histórica:** A alteração ou cancelamento de uma súmula ou dispositivo legal nunca sobrescreve o registro original. Uma nova versão é gerada com incremento do número de revisão (`version: 2`), mantendo a data de vigência do texto anterior e os metadados do acórdão revisor.
2. **Auditoria Automatizada:** O script [scripts/test_auditable_legal_corpus.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/scripts/test_auditable_legal_corpus.ts) e a Suíte 10 de testes executam auditoria contínua em todo o acervo, garantindo que nenhum registro suspenso seja promovido indevidamente.
