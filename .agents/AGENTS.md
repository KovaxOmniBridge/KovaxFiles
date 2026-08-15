# Diretrizes do Projeto - Manipulador de Arquivos

## Regras de Conversão de Documentos (PDF, Word, DOC, DOCX, etc.)
- **Padrão Google Drive / Google Docs**: Toda conversão de arquivo (Word, DOC, DOCX, RTF, ODT, PDF, HTML, Markdown) deve ser rigorosamente inspirada na fidelidade e comportamento das ferramentas oficiais do **Google Drive / Google Docs**.
- **Fidelidade Estrita ao Documento Original**:
  1. **Sem Banners ou Badges Sintéticos**: NUNCA inserir banners fictícios no topo, marcas d'água artificiais, crachás ("DOCUMENTO PROCESSADO", "INSTRUMENTO JURÍDICO") ou caixas/cards de fundo colorido que alterem a estética do documento original.
  2. **Métricas e Tipografia Padrão Google Docs**:
     - Fonte primária: `Arial, Helvetica, sans-serif` (ou a fonte original do arquivo).
     - Tamanho do texto base: `11pt` (14.6px).
     - Altura de linha (Line Height): `1.25` a `1.35`.
     - Espaçamento entre parágrafos: `6pt` após cada parágrafo.
     - Cor do texto: Preto absoluto (`#000000` / `#1E293B`).
  3. **Preservação de Estrutura**:
     - Título centralizado e em negrito (`12pt`).
     - Cláusulas e subseções com rótulo em negrito embutido no próprio parágrafo (`<b>Cláusula 1ª</b> - ...`).
     - Blocos de assinatura em colunas paralelas (`Contratante` e `Contratado`) com linhas superiores.
     - Listas com marcadores alinhados (`-` / `•`).
  4. **Decodificação e Acentuação Perfeita**:
     - Suporte nativo a buffers binários legados (`windows-1252` / `latin1`), preservando 100% da acentuação em Português (`á, é, í, ó, ú, ç, ã, õ, Â, É, Ô`).
