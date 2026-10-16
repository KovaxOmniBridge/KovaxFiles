# Política de Segurança e Modelo de Ameaças — KovaxFiles Desktop

A segurança, o sigilo forense e a proteção de dados processuais são requisitos inegociáveis do **KovaxFiles Desktop**. Este documento define nosso modelo formal de ameaças, salvaguardas de arquitetura e o procedimento de reporte responsável de vulnerabilidades.

---

## 1. Modelo de Ameaças (Threat Model)

O aplicativo opera sob a premissa de que **todo arquivo fornecido pelo usuário (PDF, DOCX, imagens, ZIPs) é potencialmente hostil e não confiável**. Nossos componentes foram projetados para mitigar as seguintes categorias de ataque:

| Vetor de Ameaça | Cenário de Risco | Mitigação Implementada |
| :--- | :--- | :--- |
| **Injeção de Código no Electron** | Arquivos maliciosos tentando injetar scripts no DOM ou acessar APIs do Node.js. | `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, e Content Security Policy (CSP) rigoroso sem `unsafe-eval`. |
| **Zip Slip / Path Traversal** | Arquivos DOCX ou ZIP contendo caminhos como `../../evil.sh` para sobrescrever arquivos do sistema. | Validador `safeUnzipDocx` que bloqueia travessia de diretório com `DocxSecurityError` antes de qualquer escrita. |
| **Bombas de Descompressão (Zip Bombs)** | Arquivos minúsculos que se expandem para gigabytes em memória. | Limite estrito de descompressão (máximo 500 MB) e limite de entradas (máximo 10.000 arquivos). |
| **Ataque de Negação de Serviço por Memória (OOM)** | PDFs com milhares de páginas ou laços infinitos de dicionários xref. | Fatiamento adaptativo com `MemoryBudgetService` (teto de Heap < 512 MB) e cancelamento cooperativo. |
| **Vazamento de Credenciais NTLM (UNC Paths)** | Nomes de arquivos referenciando servidores remotos SMB (`\\host\share`). | Bloqueio imediato de caminhos de rede UNC e caracteres de injeção nula (`\0`). |
| **Vazamento Acidental de Dados Sensíveis (LGPD)** | Tarjamento superficial (apenas retângulos pretos sobre o texto original recuperável). | Sanitização por achatamento rasterizado a 300 DPI nominais, destruindo fisicamente os fluxos vetoriais e metadados. |
| **Certificados Falsos e Assinaturas Corrompidas** | Arquivos assinados com certificados autoassinados declarando autoridade de tribunal. | Validação estrita de raiz ICP-Brasil, inspeção do `/ByteRange` e laudo explícito com aviso de serviço oficial VALIDAR do ITI. |

---

## 2. Tratamento de Arquivos Não Confiáveis

Antes de qualquer processamento, as entradas passam por verificações sanitárias obrigatórias:

1. **Magic Bytes Verification:** Arquivos com extensão `.pdf` são inspecionados para a presença do cabeçalho `%PDF-` nos primeiros 1024 bytes. Arquivos executáveis ou binários renomeados são rejeitados de imediato.
2. **Sanitização de Nomes e Caminhos:**
   - Proibição de caracteres nulos (`\0`).
   - Bloqueio de caminhos absolutos fora dos limites de diretório temporário autorizado.
   - Bloqueio de nomes de dispositivos reservados no Windows (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`).
3. **Neutralização de XSS em Metadados:** Strings de título, autor, assunto e conteúdo HTML em minutas são sanitizadas via [src/shared/validation/htmlSanitizer.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/src/shared/validation/htmlSanitizer.ts), que expurga tags `<script>`, `<iframe>`, `onload`, `onerror` e esquemas `javascript:`.

---

## 3. Isolamento do Runtime e Permissões do Electron

O processo principal do Electron impõe restrições ativas de sistema operacional:

- **Bloqueio de Navegação:** O evento `will-navigate` cancela qualquer tentativa do frontend de navegar para URLs externas não homologadas.
- **Bloqueio de Janelas Filhas:** `setWindowOpenHandler` nega a abertura de novas janelas do navegador por scripts não confiáveis.
- **Negação de Permissões de Periféricos:** O manipulador `setPermissionRequestHandler` rejeita sistematicamente requisições de acesso a câmera, microfone, geolocalização, área de transferência remota e notificações.
- **Isolamento de IPC:** Em [electron/ipc/ipcValidator.ts](file:///d:/KovaxOminiBridge/KovaxFilesApp/electron/ipc/ipcValidator.ts), todo remetente IPC é inspecionado contra `window.webContents.getURL()`. Requisições oriundas de origens externas ou frames não controlados são sumariamente descartadas com log de segurança.

---

## 4. Reporte Responsável de Vulnerabilidades

Se você identificar uma falha de segurança, vulnerabilidade de memória ou risco de vazamento de dados no KovaxFiles Desktop:

1. **Não abra uma Issue pública no GitHub.**
2. Envie os detalhes técnicos completos, passos de reprodução e arquivo de prova de conceito (PoC) para:
   - **E-mail de Segurança:** `security@kovaxfiles.com.br` ou via mensagem criptografada ao mantenedor do repositório.
3. **SLA de Resposta:**
   - Confirmação de recebimento: em até **48 horas**.
   - Análise de impacto e reprodução: em até **5 dias úteis**.
   - Liberação de correção (patch de segurança): prioridade máxima, com emissão de comunicado e nova versão em até **15 dias corridos**.
