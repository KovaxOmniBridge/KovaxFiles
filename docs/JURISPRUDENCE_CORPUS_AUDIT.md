# ⚖️ Política Editorial de Auditoria & Versionamento do Acervo Jurídico

Este documento formaliza os protocolos de governança editorial, controle de versão e auditoria sistemática do acervo de jurisprudência e normas integradas ao **KovaxFiles Desktop App**.

---

## 1. Identificação da Versão do Acervo

- **Versão Homologada:** `2026.10.1-AUDITED`
- **Data da Última Auditoria Integral:** 15 de Outubro de 2026
- **Comitê Responsável:** Comitê Editorial de Integridade Normativa KovaxFiles
- **Escopo:** Conformidade 100% literal com o Plenário do Supremo Tribunal Federal (STF), Superior Tribunal de Justiça (STJ), Tribunal Superior do Trabalho (TST) e Portal da Legislação da Presidência da República (LexML).

---

## 2. Proveniência e Fontes Primárias Oficiais

Todo o conteúdo legal disponibilizado na plataforma provém exclusivamente de bases primárias do Diário da Justiça Eletrônico (DJe) e fontes oficiais da União e dos Estados:

| Tribunal / Órgão | Conteúdo Integrado | Fonte Oficial Primária | Registros Auditados |
| :--- | :--- | :--- | :--- |
| **STF** | Súmulas Vinculantes 1 a 62 (Plenário) | [jurisprudencia.stf.jus.br](https://jurisprudencia.stf.jus.br) | 62 enunciados |
| **STF** | Súmulas Tradicionais 1 a 736 | [portal.stf.jus.br](https://portal.stf.jus.br) | 736 enunciados |
| **STJ** | Súmulas 1 a 665 (Cível, Penal, Público) | [www.stj.jus.br](https://www.stj.jus.br/jurisprudencia/sumulas) | 665 enunciados |
| **TST** | Súmulas 1 a 463 e OJs (SDI-1 e SDC) | [www.tst.jus.br](https://www.tst.jus.br/jurisprudencia) | 463 enunciados |
| **Presidência da República** | CF/88, CPC, CC, CP, CLT, CTN, Lei 14.133, LGPD, ECA, CDC | [www.planalto.gov.br](https://www.planalto.gov.br) / LexML | > 38.500 dispositivos |

---

## 3. Protocolos de Correção de Erros Materiais e Falsos Precedentes

Em consonância com a auditoria de outubro de 2026:
1. **Eliminação de Deslocamentos:** Foram expurgadas todas as atribuições indevidas em que súmulas antigas do STF foram registradas sob numeração de Súmulas Vinculantes.
   - A **SV 1** trata exclusivamente da higidez da coisa julgada frente a acordos de adesão do FGTS previstos na **LC 110/2001**.
   - A **SV 6** versa sobre a constitucionalidade de remuneração de praças no **serviço militar inicial** inferior ao salário mínimo.
   - A **SV 9** versa sobre a recepção do art. 127 da LEP pelo ordenamento constitucional.
   - A **SV 12** trata da inconstitucionalidade da cobrança de taxa de matrícula em universidade pública.
   - A **SV 30** está formalmente categorizada como `HISTORICA_OBSOLETA`, com aviso explícito de publicação suspensa pelo STF (DJe nº 235/2010).
   - As súmulas recentes de repercussão geral (SV 57, 59, 60, 61 e 62) constam com texto integral e fidelidade absoluta aos julgamentos de mérito.
2. **Imutabilidade e Verificação Criptográfica:** O acervo é validado periodicamente por suíte de testes de integridade (`scripts/test_jurisprudence_integrity.ts`), assegurando ausência de desvios textuais antes de qualquer publicação ou empacotamento de versão do desktop app.
