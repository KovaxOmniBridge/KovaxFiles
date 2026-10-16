# Política de Versões e Ciclo de Vida — KovaxFiles Desktop

Este documento define os canais de distribuição, a taxonomia de versões e as regras de transição entre estágios de desenvolvimento, homologação e estabilidade no **KovaxFiles Desktop**.

---

## 1. Canais e Estágios de Versão

O projeto adota o **Versionamento Semântico 2.0.0 (SemVer)** com divisão estrita em três canais:

```
[Desenvolvimento: Alpha / Dev] ➔ [Homologação: Beta / RC] ➔ [Distribuição Institucional: Stable]
```

### 1.1. Canal de Desenvolvimento (`alpha` / `dev`)
- **Identificação:** Branches de feature ou commits diretos na `main` (`ex: 1.1.0-alpha.1`).
- **Público:** Desenvolvedores e mantenedores internos.
- **Assinatura:** Binários podem ser gerados com flags de desenvolvimento (`allow_unsigned_dev: true`).
- **Garantias:** Sujeito a instabilidade. **NUNCA** publicado como release oficial nem disponibilizado para download em órgãos públicos.

### 1.2. Canal de Teste e Homologação (`beta` / `rc`)
- **Identificação:** Tags no formato `vX.Y.Z-beta.N` ou `vX.Y.Z-rc.N` (Release Candidate).
- **Público:** Operadores de teste, auditores forenses e usuários piloto.
- **Assinatura:** Assinatura digital mandatória com certificado de desenvolvimento/homologação.
- **Objetivo:** Validação do instalador em máquinas limpas (Windows Sandbox, VMs macOS isoladas), testes com arquivos reais e medição de desempenho sob estresse.

### 1.3. Canal Estável Oficial (`stable`)
- **Identificação:** Tags formais de versão no formato `vX.Y.Z` (ex: `v1.0.0`).
- **Público:** Tribunais, procuradorias, prefeituras e escritórios de advocacia.
- **Assinatura:** **OBRIGATÓRIA** via certificados ICP-Brasil / Authenticode no Windows (`forceCodeSigning=true`) e Apple Developer ID Notarized no macOS.
- **Garantias:** CI 100% aprovado, manifesto `SHA256SUMS.txt` consolidado e homologação completa contra o [docs/RELEASE_CHECKLIST.md](file:///d:/KovaxOminiBridge/KovaxFilesApp/docs/RELEASE_CHECKLIST.md).

---

## 2. Critérios de Promoção de Versão

| Transição | Critérios Obrigatórios para Promoção |
| :--- | :--- |
| **Dev ➔ Beta** | - 100% de aprovação na Bateria de PR (`npm run test:pr`).<br>- Tipagem TypeScript estrita sem erros (`tsc --noEmit`).<br>- Nenhuma vulnerabilidade de dependências em aberto (`npm audit`). |
| **Beta ➔ RC** | - Execução bem-sucedida dos testes de carga e desempenho (`npm run test:load`).<br>- Ausência de relatos de corrupção ou travamento em lote.<br>- Validação da integridade dos assets offline (`por.traineddata`, fontes locais). |
| **RC ➔ Stable** | - Aprovação irrestrita no [RELEASE_CHECKLIST.md](file:///d:/KovaxOminiBridge/KovaxFilesApp/docs/RELEASE_CHECKLIST.md).<br>- Assinatura digital válida comprovada por `Get-AuthenticodeSignature` no Windows.<br>- Manifesto `SHA256SUMS.txt` gerado sem supressão de erros para todas as 3 plataformas.<br>- Homologação física do instalador final em ambiente Windows Sandbox e macOS limpos. |

---

## 3. Classificação de Atualizações SemVer

- **MAJOR (vX.0.0):** Alterações incompatíveis em formatos de dados, reestruturação profunda da arquitetura de isolamento ou descontinuação de suporte a sistemas operacionais obsoletos.
- **MINOR (v1.X.0):** Novas ferramentas documentais, suporte a novos tribunais no módulo de protocolo ou melhorias substanciais no motor de OCR e compressão, preservando compatibilidade retroativa.
- **PATCH (v1.0.X):** Correções de bugs, ajustes de sanitização de texto, atualização de acórdãos/súmulas do acervo ou melhorias de estabilidade sem alteração de contratos.
