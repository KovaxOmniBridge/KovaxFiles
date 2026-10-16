# Diretrizes de Segurança, Isolamento e Confiança Jurídica
## Diferenciação Estrita entre Integridade Técnica e Eficácia Jurídica Documental

Este documento estabelece as diretrizes normativas, arquiteturais e criptográficas do **KovaxFiles Desktop**, com ênfase na segregação formal entre a **integridade computacional de bytes** e a **validade e eficácia jurídica** perante o Poder Judiciário, órgãos de controle e a administração pública brasileira.

---

## 1. O Princípio Reitor: Integridade Técnica vs. Validade Jurídica

Em sistemas de tecnologia documental, incorre-se em grave equívoco ao presumir que um arquivo computacionalmente íntegro possui, por si só, validade jurídica plena.

* **Integridade Técnica (Mundo Computacional)**:
  - Comprova matematicamente que uma sequência de bytes não foi alterada, truncada ou corrompida entre dois momentos no tempo (ex.: cálculo de hash SHA-256, correspondência de `ByteRange` e assinatura RSA).
  - Um documento adulterado por um terceiro tem sua integridade técnica quebrada.
  - **Limitação intrínseca**: Um documento com hash SHA-256 perfeito pode ter sido assinado por uma chave privada autoassinada sem qualquer valor jurídico perante um tribunal, ou conter declarações sem presunção de autoria legal.

* **Validade e Eficácia Jurídica (Mundo Normativo e Processual)**:
  - Diz respeito à **força probatória**, **presunção legal de veracidade**, **tempestividade processual** e **conformidade regulatória** atribuídas pelo ordenamento jurídico aos atos praticados em meio eletrônico.
  - No Brasil, é regida fundamentalmente pela **Medida Provisória nº 2.200-2/2001**, pela **Lei nº 14.063/2020**, pela **Lei nº 11.419/2006** (Processo Judicial Eletrônico), pelo **Código de Processo Civil (CPC/2015, arts. 411 e 441)** e pela **LGPD (Lei nº 13.709/2018)**.

---

## 2. Matriz Comparativa de Confiança

```
+-------------------------------------------------------------------------------------------------------------------+
| DIMENSÕES DE CONFIANÇA DOCUMENTAL NO KOVAXFILES DESKTOP                                                          |
+--------------------------+----------------------------------------------+-----------------------------------------+
| Elemento                 | O que Atesta Tecnicamente                    | Eficácia e Limitação Jurídica           |
+--------------------------+----------------------------------------------+-----------------------------------------+
| Hash SHA-256             | Imutabilidade física da cadeia de bytes.     | Não prova autoria, emissor ou aceite.   |
|                          | Permite auditoria forense de custódia.       | Apenas atesta transporte e integridade. |
+--------------------------+----------------------------------------------+-----------------------------------------+
| Assinatura Qualificada   | Integridade de bytes + chave privada emitida | Presunção LEGAL ABSOLUTA de veracidade  |
| ICP-Brasil (PAdES)       | por AC credenciada pelo ITI/ICP-Brasil.      | (MP 2.200-2/2001, art. 10, § 1º). Exigida|
|                          |                                              | para peticionamento judicial formal.    |
+--------------------------+----------------------------------------------+-----------------------------------------+
| Assinatura Avançada      | Criptografia assimétrica válida (RSA/ECDSA), | Eficácia condicionada à aceitação prévia|
| Não-ICP (Lei 14.063/20)  | porém emitida por AC privada/corporativa.    | das partes (MP 2.200-2/2001, art. 10, § |
|                          |                                              | 2º). NÃO atende tribunais estritos.     |
+--------------------------+----------------------------------------------+-----------------------------------------+
| Chancela / Paginação     | Sequencialização administrativa de folhas e  | Instrumento interno de organização. NÃO |
| (ProcessStamper)         | registro visual de marca d'água no PDF.      | é protocolo judicial nem gera efeito    |
|                          |                                              | interruptivo de prazos processuais.     |
+--------------------------+----------------------------------------------+-----------------------------------------+
| Tarja com Rasterização   | Destruição irreversível dos glifos e         | Anonimização técnica de bytes. Não      |
| (LgpdRedactor)           | camadas vetoriais subjacentes.               | exime o operador de avaliar reidentifi- |
|                          |                                              | cação contextual (LGPD, art. 12).       |
+--------------------------+----------------------------------------------+-----------------------------------------+
```

---

## 3. Classificação Normativa das Assinaturas Digitais (PAdES)

O serviço `PadesSignatureService` do KovaxFiles Desktop analisa tanto a física criptográfica quanto a cadeia de confiança do certificado digital X.509, classificando-os estritamente sob as categorias da **Lei nº 14.063/2020**:

### 3.1. Assinatura Eletrônica Qualificada (ICP-Brasil)
* **Requisito Técnico**: Utiliza chave privada associada a certificado digital emitido por Autoridade Certificadora credenciada na Infraestrutura de Chaves Públicas Brasileira (ICP-Brasil), sob a Autoridade Certificadora Raiz Brasileira do Instituto Nacional de Tecnologia da Informação (ITI).
* **Efeito Jurídico**: Presunção legal de veracidade em relação aos signatários, nos termos do **art. 10, § 1º, da Medida Provisória nº 2.200-2/2001**.
* **Aplicação Processual**: Obrigatória para a prática de atos processuais no âmbito dos sistemas informatizados do Poder Judiciário (Lei nº 11.419/2006, art. 1º, § 2º, III, "a") e emissão de notas fiscais eletrônicas, salvo exceções legais expressas.

### 3.2. Assinatura Eletrônica Avançada (Não-ICP-Brasil)
* **Requisito Técnico**: Utiliza criptografia assimétrica de alto padrão (RSA 2048/4096 bits ou ECDSA) e contêiner PKCS#7 destacado com formato PAdES (ISO 32000-1), com certificado emitido por autoridade privada (ex.: DocuSign, Adobe Sign, Let's Encrypt ou certificados corporativos internos).
* **Efeito Jurídico**: Válida e aceita **exclusivamente se as partes acordarem previamente ou aceitarem sua utilização**, nos termos do **art. 10, § 2º, da Medida Provisória nº 2.200-2/2001** e **art. 4º, II, da Lei nº 14.063/2020**.
* **Alerta no Aplicativo**: O KovaxFiles **não rotula assinaturas avançadas privadas como ICP-Brasil**, alertando explicitamente o operador quanto à necessidade de concordância entre as partes e inadequação para peticionamentos judiciais que exijam certificado ICP-Brasil.

### 3.3. Assinatura Inválida ou Adulterada
* **Requisito Técnico**: Falha na verificação da assinatura RSA da chave pública, divergência no digest SHA-256 do arquivo ou cobertura incompleta do `ByteRange` (indicando injeção de dados pós-assinatura).
* **Efeito Jurídico**: Desprovida de qualquer eficácia jurídica ou presunção probatória.

---

## 4. Protocolo e Montagem de Autos: Distinção entre Organização e Recibo Judicial

O assistente de montagem e protocolização (`CourtFilingWizard` e `ProcessStamper`):
1. **Atuação Técnica**: Compila volumes conforme limites paramétricos de tribunais (PJe, e-SAJ, Projudi, Eproc), aplica numeração sequencial de folhas e gera certidões de imutabilidade com manifesto SHA-256.
2. **Delimitação Jurídica Inafastável**:
   - O carimbo, chancela ou certidão gerada pelo aplicativo constitui **instrumento de organização técnico-administrativa interna** do escritório ou órgão público.
   - **NÃO constitui Recibo Oficial de Protocolo Judicial**.
   - Apenas o sistema eletrônico do tribunal competente (PJe, e-SAJ, Projudi, Eproc, etc.), após a transmissão bem-sucedida pelo advogado ou procurador, tem competência legal para emitir o **Recibo de Protocolo com chave de autenticidade**, único documento hábil a comprovar tempestividade processual (Lei nº 11.419/2006, art. 10).

---

## 5. Isolamento Operacional e Sigilo de Documentos Locais

Em consonância com as exigências de sigilo profissional (Estatuto da OAB, art. 7º, II; Código de Ética e Disciplina da OAB) e proteção de dados em processos sob segredo de justiça (CPC/2015, art. 189):

1. **Zero-Exfiltration (100% Offline)**:
   - Nenhum documento, página, texto OCR, chave privada, assinatura ou termo confidencial é transmitido para servidores remotos, serviços de telemetria ou nuvem.
   - Todo o processamento (renderização PDF, motor OCR Tesseract com pesos locais `por.traineddata`, criptografia PAdES e anonimização LGPD) ocorre estritamente na CPU/memória da máquina local.

2. **Princípio do Menor Privilégio no Electron**:
   - `webPreferences.contextIsolation = true`, `webPreferences.nodeIntegration = false`, `webPreferences.sandbox = true`.
   - Módulo `pathSecurity.ts` restringe qualquer tentativa de acesso ao sistema de arquivos exclusivamente aos arquivos autorizados pelo usuário através dos diálogos nativos do sistema operacional (`sessionAuthorizedFiles`).
   - Bloqueio incondicional de extensões executáveis e validação de Magic Bytes para neutralizar ataques de arquivos disfarçados.

3. **Não-Persistência de Credenciais e Senhas**:
   - Senhas de certificados digitais (`.pfx` / `.p12`) residem temporariamente em variáveis voláteis de curta duração durante a assinatura, sendo imediatamente descartadas.
   - Nenhuma senha de certificado é gravada em disco, `localStorage`, `IndexedDB` ou exposta em payloads de IPC.

---

## 6. Anonimização Forense e Minimização LGPD (Lei nº 13.709/2018)

1. **Irreversibilidade Criptográfica**:
   - O tarjamento documental implementado em `LgpdRedactor` realiza a **rasterização destrutiva dos pixels** da região selecionada, eliminando a tabela vetorial de glifos. Uma tarja preta não é uma sobreposição vetorial removível, mas a substituição física dos pixels originais.

2. **Minimização Estrita de Dados em Relatórios (Privacy by Design)**:
   - Os relatórios forenses de anonimização registram:
     - `fileId` único e imutável.
     - Categoria de dado pessoal (ex.: CPF, Nome, Dados Bancários).
     - Localização (página e coordenadas de bounding box).
     - Regra ou padrão de detecção aplicado.
     - Hash criptográfico SHA-256 do documento gerado.
   - **Regra de Ouro**: O relatório **NUNCA expõe o `originalTerm` (o dado confidencial que foi tarjado)** em texto claro, impedindo que a certidão de auditoria se torne um vetor secundário de vazamento de dados.

---

## 7. Conformidade e Checklist para Departamentos de TI

Ao auditar o KovaxFiles Desktop, o analista de segurança e conformidade jurídica pode verificar:
* [x] **Suíte de Testes de Confiança Jurídica**: `npm run test:legal-trust` homologa a diferenciação de assinaturas ICP-Brasil vs. Avançadas.
* [x] **Isolamento de Sandbox**: `npm run test:sandbox-isolation` comprova que o renderer não possui acesso direto ao kernel ou módulos nativos.
* [x] **Segurança de Caminhos**: `npm run test:path-security` e `npm run test:path-integration` validam autorização de arquivos por sessão.
* [x] **Integridade Forense de Redação**: `npm run test:security-redaction` valida a ausência de texto residual sob as tarjas.
* [x] **Conformidade OOXML / PDF**: `npm run test:docx-fidelity` e `npm run test:rich-pdf-export` validam fidelidade técnica de exportação e paridade visual.
