# Diretrizes de Segurança Comercial, Assinatura de Código e Distribuição Institucional

Este documento estabelece os padrões e controles criptográficos aplicados ao ciclo de vida de compilação, empacotamento e distribuição do **KovaxFiles Desktop**, com ênfase no atendimento a escritórios de advocacia, procuradorias, tribunais e administrações públicas.

---

## 1. Contexto e Motivação Institucional

Em ambientes jurídicos e corporativos de missão crítica, a distribuição de arquivos binários não assinados acarreta riscos severos:
* **Falso-positivos de EDR/Antivírus**: Mecanismos heurísticos e filtros como o Microsoft Defender SmartScreen bloqueiam a execução de executáveis sem reputação ou sem certificado Authenticode válido.
* **Políticas de Whitelist (AppLocker e WDAC)**: Redes governamentais e de tribunais utilizam *Software Restriction Policies* baseadas em assinaturas digitais e regras de publicador (*Publisher Rules*).
* **Ataques à Cadeia de Suprimentos (Supply-Chain / MitM)**: Se o canal de atualização aceitar binários sem verificação de assinatura, invasores podem forjar atualizações maliciosas.

---

## 2. Configurações de Assinatura no `package.json`

O arquivo `package.json` está parametrizado para garantir a integridade dos binários distribuídos:

```json
"win": {
  "target": [
    "nsis",
    "portable"
  ],
  "signAndEditExecutable": true,
  "verifyUpdateCodeSignature": true
}
```

### Explicação Técnica dos Parâmetros

| Parâmetro | Valor | Função e Impacto de Segurança |
|---|:---:|---|
| `signAndEditExecutable` | `true` | Habilita a edição dos cabeçalhos de recursos PE (versão, copyright, descrição) e a execução do `signtool.exe` para assinar o instalador principal e o desinstalador. |
| `verifyUpdateCodeSignature` | `true` | **Crítico**: Exige que qualquer atualização recebida pelo Electron Updater possua a mesma assinatura digital e publicador da versão instalada, bloqueando sequestro de canal de atualização (MitM). |
| `forceCodeSigning` | *Obrigatório em Release* | Nas configurações de release institucional (`npm run package:release:win` e `npm run package:release:all`), a flag `--config.win.forceCodeSigning=true` impede incondicionalmente a geração de instaladores caso um certificado digital válido não seja fornecido. |

---

## 3. Pipeline de Integração Contínua (CI/CD) e Segregação de Canais

No fluxo de trabalho do GitHub Actions (`.github/workflows/build-release.yml`), a política de segurança impõe **tolerância zero para binários sem assinatura no canal institucional**:

1. **Canal Oficial de Releases (`refs/tags/v*`)**:
   - A presença das credenciais corporativas (`WIN_CSC_LINK` e `WIN_CSC_KEY_PASSWORD`) é **estritamente obrigatória**.
   - Se o certificado digital não estiver configurado no repositório, o pipeline **aborta a execução imediatamente com erro fatal (`exit 1`)**, impedindo a geração e a publicação de artefatos desprovidos de assinatura.
   - Não há fallback silencioso para empacotamento não assinado em builds de release.

2. **Canal de Testes Internos / Desenvolvimento (`workflow_dispatch`)**:
   - Builds manuais de desenvolvimento sem assinatura exigem a ativação explícita do parâmetro booleano `allow_unsigned_dev: true`.
   - Esses binários são identificados como itens de teste interno e **nunca** são publicados como lançamentos oficiais de produção.

---

## 4. Distinção Criptográfica Fundamental: SHA-256 vs. Assinatura Digital

É imperativo distinguir as finalidades e o alcance de segurança de cada mecanismo:

```
+--------------------------------------------------------------------------------------------------+
| COMPARAÇÃO CRIPTOGRÁFICA DE SEGURANÇA NA DISTRIBUIÇÃO INSTITUCIONAL                             |
+------------------------------+----------------------------------+--------------------------------+
| Aspecto de Segurança         | Hash Criptográfico (SHA-256)     | Assinatura Digital de Código   |
+------------------------------+----------------------------------+--------------------------------+
| Objetivo Principal           | Integridade física de transporte | Autenticidade e Não-Repúdio    |
| Comprova Autoria/Publicador? | NÃO (qualquer um gera o hash)    | SIM (vinculado a CA confiável) |
| Protege contra MitM no repo? | NÃO (se repo for invadido,       | SIM (chave privada corporativa |
|                              | ambos os arquivos são trocados)  | é mantida fora do repositório) |
| Compatível com SmartScreen?  | NÃO                              | SIM (Gera reputação imediata)  |
| Habilita Regras AppLocker?   | Apenas via Hash (frágil a updates| SIM (Regra de Publicador/O=)   |
| Mecanismo de Verificação     | Comparação externa via .txt      | Validação PE no kernel do SO   |
+------------------------------+----------------------------------+--------------------------------+
```

### 4.1. O Papel do Hash SHA-256
* **O que faz**: Permite ao destinatário confirmar que o arquivo baixado não sofreu corrupção física de pacotes ou truncamento acidental durante a transferência de rede.
* **O que NÃO faz**: **Uma lista de hashes (`SHA256SUMS.txt`) publicada junto aos próprios executáveis NÃO substitui a assinatura digital**. Caso o repositório ou o servidor de hospedagem seja comprometido, o invasor pode alterar o binário e recalcular o arquivo de hash simultaneamente. O hash apenas verifica consistência com a lista fornecida, mas não atesta quem gerou aquela lista.

### 4.2. O Papel da Assinatura Digital (Authenticode / X.509)
* **O que faz**: Vincula matematicamente o binário executável à identidade jurídica e fiscal do publicador do software, através de um certificado emitido por uma Autoridade Certificadora (CA) de raiz confiável (ex: Microsoft Root Authority ou ICP-Brasil).
* **Proteção Criptográfica Intrínseca**: A assinatura é incrustada no diretório de segurança da estrutura PE do executável. Qualquer modificação subsequente de um único byte no executável corrompe a assinatura e faz com que o Windows recuse sua execução antes mesmo de carregar na memória.

---

## 5. Guia de Verificação para Departamentos de TI e Órgãos Públicos

Antes de autorizar a implantação na rede institucional, os analistas de segurança devem validar os artefatos através dos seguintes procedimentos:

### 5.1. Verificação Obrigatória da Assinatura Digital Authenticode

No PowerShell:
```powershell
Get-AuthenticodeSignature -FilePath ".\KovaxFiles-Setup-1.0.0.exe" | Format-List
```
*O status deve retornar `Status: Valid` acompanhado do nome da Autoridade Certificadora e do publicador oficial.*

Via Windows SDK (`signtool`):
```cmd
signtool verify /pa /v KovaxFiles-Setup-1.0.0.exe
```

### 5.2. Verificação Complementar de Integridade (SHA-256)

Após confirmar a validade da assinatura digital, o hash pode ser verificado para atestar download íntegro:

No PowerShell:
```powershell
Get-FileHash -Path ".\KovaxFiles-Setup-1.0.0.exe" -Algorithm SHA256
```

No prompt de comando tradicional:
```cmd
certutil -hashfile KovaxFiles-Setup-1.0.0.exe SHA256
```

---

## 6. Recomendações para Certificação Digital

Para distribuição em órgãos do Poder Judiciário brasileiro e prefeituras:
1. **Certificado de Assinatura de Código EV (Extended Validation)**: Oferece reputação imediata no Microsoft SmartScreen e exige armazenamento da chave privada em token HSM / hardware seguro (FIPS 140-2 Level 2).
2. **Certificado ICP-Brasil (Tipo A3/A4 PJ)**: Recomendado quando o software for homologado ou distribuído sob encomenda direta de órgãos da administração pública.
