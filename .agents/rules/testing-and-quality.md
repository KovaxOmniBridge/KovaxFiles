# Regras de Testes, Prevenção de Regressões e Confiabilidade Probatória

## 1. Regra Obrigatória Anti-Regressão
- Toda resolução de bug ou problema reportado DEVE ser acompanhada de um teste automatizado na suíte correspondente (`tests/suites/`).
- O teste deve capturar a condição de falha e comprovar que a plataforma não sofrerá reincidência da falha.

## 2. Auditoria e Não-Circularidade
- Não calcular valores de conferência com a mesma função sob teste.
- Utilizar fixtures com constantes FIPS 180-4 pré-computadas externamente (`tests/fixtures/officialLegalReferences.ts`).

## 3. Qualidade Contínua
- O comando `npm test` deve passar com 100% de aprovação (11/11 suítes) antes de qualquer push ou merge.
