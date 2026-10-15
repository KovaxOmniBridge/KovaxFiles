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
| `forceCodeSigning` | *Obrigatório em Release* | No script `npm run package:release`, a flag `--config.win.forceCodeSigning=true` impede a geração de instaladores caso um certificado digital válido não seja fornecido. |

---

## 3. Pipeline de Integração Contínua (CI/CD) e Segredos de Build

No fluxo de trabalho do GitHub Actions (`.github/workflows/build-release.yml`), os instaladores oficiais utilizam as credenciais institucionais:

* `WIN_CSC_LINK`: Conteúdo do certificado digital (.pfx) codificado em Base64.
* `WIN_CSC_KEY_PASSWORD`: Senha de proteção da chave privada do certificado.

Quando uma nova tag de versão (`v*`) é publicada, a pipeline:
1. Detecta a presença do certificado corporativo e aciona `npm run package:release`.
2. Assina o binário NSIS (`.exe`) e o pacote Portable.
3. Gera o manifesto criptográfico de integridade `SHA256SUMS.txt`.
4. Publica os instaladores juntamente com os hashes no GitHub Releases.

---

## 4. Guia de Verificação para Departamentos de TI e Órgãos Públicos

Antes de autorizar a implantação na rede institucional, os analistas de segurança podem validar os artefatos através dos seguintes procedimentos:

### 4.1. Verificação de Integridade Criptográfica (SHA-256)

No PowerShell:
```powershell
# Comparar com o valor publicado no arquivo SHA256SUMS.txt da release
Get-FileHash -Path ".\KovaxFiles-Setup-1.0.0.exe" -Algorithm SHA256
```

No prompt de comando tradicional:
```cmd
certutil -hashfile KovaxFiles-Setup-1.0.0.exe SHA256
```

### 4.2. Verificação de Assinatura Digital Authenticode

No PowerShell:
```powershell
Get-AuthenticodeSignature -FilePath ".\KovaxFiles-Setup-1.0.0.exe" | Format-List
```
*O status deve retornar `Status: Valid` acompanhado do nome da Autoridade Certificadora.*

Via Windows SDK (`signtool`):
```cmd
signtool verify /pa /v KovaxFiles-Setup-1.0.0.exe
```

---

## 5. Recomendações para Certificação Digital

Para distribuição em órgãos do Poder Judiciário brasileiro e prefeituras:
1. **Certificado de Assinatura de Código EV (Extended Validation)**: Oferece reputação imediata no Microsoft SmartScreen e exige armazenamento da chave privada em token HSM / hardware seguro (FIPS 140-2 Level 2).
2. **Certificado ICP-Brasil (Tipo A3/A4 PJ)**: Recomendado quando o software for homologado ou distribuído sob encomenda direta de órgãos da administração pública.
