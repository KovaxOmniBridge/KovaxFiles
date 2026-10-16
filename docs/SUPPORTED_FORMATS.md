# Formatos Suportados e Limitações Comprovadas — KovaxFiles Desktop

Este documento especifica os tipos de arquivos suportados pelo **KovaxFiles Desktop**, os comportamentos garantidos e as **limitações técnicas comprovadas** de cada conversão e operação de engenharia documental.

---

## 1. Matriz Geral de Formatos

| Formato | Extensão | Leitura / Importação | Escrita / Exportação | Motor de Processamento |
| :--- | :---: | :---: | :---: | :--- |
| **PDF (Documento Portável)** | `.pdf` | ✅ Sim (v1.3 a 2.0) | ✅ Sim (v1.7 / ISO 32000) | `pdf-lib` + `pdfjs-dist` nativo |
| **DOCX (Word OpenXML)** | `.docx` | ✅ Sim (ISO/IEC 29500) | ✅ Sim (ISO/IEC 29500) | Parser OOXML próprio + `docx` + `fflate` |
| **Imagens Rasterizadas** | `.png`, `.jpg`, `.jpeg`, `.webp` | ✅ Sim | ✅ Sim | HTML5 Canvas do Chromium / STB Image |
| **Cofre Forte Criptografado** | `.kvx` | ✅ Sim (Custódia) | ✅ Sim (Custódia) | WebCrypto (PBKDF2 100.000 iter + AES-GCM) |
| **Texto Puro / Markdown** | `.txt`, `.md` | ✅ Sim | ✅ Sim | Parser UTF-8 nativo com detecção de BOM |

---

## 2. Limitações e Comportamentos Específicos por Módulo

### 2.1. Conversão e Exportação DOCX ⟷ PDF
- **O que é preservado com fidelidade comprovada:**
  - Hierarquia de títulos (`Heading 1`, `Heading 2`, `Heading 3`).
  - Formatação tipográfica básica (negrito, itálico, sublinhado, cores de texto, espaçamento entre linhas e recuos de parágrafo).
  - Tabelas regulares com células mescladas simples, larguras proporcionais e bordas padronizadas.
  - Imagens estáticas embutidas com redimensionamento proporcional.
- **Limitações comprovadas:**
  - *Elementos Flutuantes:* Caixas de texto posicionadas de forma absoluta e arte gráfica flutuante complexa (WordArt) são convertidas em blocos sequenciais para evitar sobreposição ilegível.
  - *Formulários Ativos:* Campos de formulário com scripts legados em VBA/Macro são convertidos em texto estático por razões de segurança.
  - *Comentários e Revisões:* Não são incluídos na versão final exportada para protocolo forense.

### 2.2. Motor de OCR Local (Tesseract WASM)
- **O que é garantido:**
  - Reconhecimento óptico em língua portuguesa usando o modelo oficial [por.traineddata](file:///d:/KovaxOminiBridge/KovaxFilesApp/public/tessdata/por.traineddata) (2.42 MB).
  - Geração de *Sandwich PDF* (camada de texto invisível sobreposta com coordenadas exatas de caixas delimitadoras à imagem escaneada).
  - Indexabilidade por ferramentas de busca processual (Ctrl+F em leitores de PDF e indexadores de tribunais).
- **Limitações comprovadas:**
  - *Resoluções Abaixo de 150 DPI:* Em documentos digitalizados com baixa densidade de pixels ou ruído de scanner analógico, a taxa de confiança de reconhecimento cai. O sistema alerta o usuário com o número de páginas com reconhecimento incompleto e exige revisão visual.
  - *Texto Manuscrito:* O modelo treinado é otimizado para caracteres tipográficos e impressos; manuscritos livres e assinaturas cursivas não possuem garantia de transcrição fidedigna.

### 2.3. Tarjamento LGPD e Sanitização Rasterizada
- **O que é garantido:**
  - Destruição física absoluta do fluxo vetorial de texto e formulários subjacentes na área tarjada através de rasterização a 300 DPI nominais.
  - Ausência de vetores de recuperação forense por seleção de texto ou inspeção do stream do PDF.
- **Limitações comprovadas:**
  - *Perda de Pesquisa Imediata:* Como o texto vetorial é intencionalmente eliminado, o PDF resultante torna-se uma imagem pura. Para torná-lo pesquisável sem reintroduzir os dados sigilosos eliminados, é obrigatório reprocessá-lo pelo módulo de OCR Local.
  - *Páginas de Formato Gigante (Plantas de Engenharia / A0):* Para evitar estouro de memória Heap do Chromium (acima de 512 MB), o `MemoryBudgetService` reduz adaptativamente a densidade dessas páginas específicas, garantindo um piso mínimo de 150 DPI para preservar a legibilidade de carimbos.

### 2.4. Assinatura Digital PAdES e Auditoria ICP-Brasil
- **O que é garantido:**
  - Validação da integridade dos bytes declarados no `/ByteRange` contra adulterações físicas pós-assinatura.
  - Verificação de certificados da hierarquia ICP-Brasil e distinção de certificados autoassinados.
- **Limitações comprovadas:**
  - *Validação de Revogação Offline:* Em computadores sem conexão à internet (*air-gapped*), o sistema não realiza consulta em tempo real a Listas de Certificados Revogados (LCR) ou OCSP. O laudo gerado declara expressamente essa limitação e instrui o usuário a submeter o arquivo ao serviço governamental oficial VALIDAR do ITI (`https://validar.iti.gov.br`) quando a verificação online de revogação for exigida.

### 2.5. Cofre Forte Local (`.kvx`) vs Senha de PDF Convencional
- **O que é garantido:**
  - Proteção por chave simétrica AES-GCM 256 bits com derivação PBKDF2 (100.000 iterações e sal criptográfico único por arquivo).
- **Limitações comprovadas:**
  - O invólucro `.kvx` é um formato proprietário seguro para custódia interna de peças e backups; **não é compatível com leitores comuns de PDF (Adobe Reader, Foxit)** até que o documento seja expressamente destrancado pelo aplicativo.
