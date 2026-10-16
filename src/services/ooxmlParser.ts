import * as fflate from 'fflate';
import path from 'path';

/**
 * Erro de segurança disparado quando um arquivo DOCX viola limites de descompressão
 * (por exemplo, suspeita de Zip Bomb, arquivos excessivamente grandes ou contagem abusiva de entradas).
 */
export class DocxSecurityError extends Error {
  constructor(message: string) {
    super(`[Segurança DOCX] ${message}`);
    this.name = 'DocxSecurityError';
  }
}

/**
 * Erro disparado quando o arquivo DOCX ou seu conteúdo XML interno é inválido ou malformado.
 */
export class MalformedDocxError extends Error {
  constructor(message: string) {
    super(`[DOCX Malformado] ${message}`);
    this.name = 'MalformedDocxError';
  }
}

export interface DocxDecompressionLimits {
  maxTotalBytes?: number; // Padrão: 50 MB
  maxSingleFileBytes?: number; // Padrão: 25 MB
  maxFileCount?: number; // Padrão: 500 arquivos
  maxCompressionRatio?: number; // Padrão: 100x
}

export const DEFAULT_DOCX_LIMITS: Required<DocxDecompressionLimits> = {
  maxTotalBytes: 50 * 1024 * 1024, // 50 MB
  maxSingleFileBytes: 25 * 1024 * 1024, // 25 MB
  maxFileCount: 500,
  maxCompressionRatio: 100
};

export class XmlNode {
  public name: string;
  public attributes: Record<string, string>;
  public children: (XmlNode | string)[];

  constructor(name: string, attributes: Record<string, string> = {}) {
    this.name = name;
    this.attributes = attributes;
    this.children = [];
  }

  getAttribute(attrName: string): string | null {
    if (this.attributes[attrName] !== undefined) {
      return this.attributes[attrName];
    }
    // Suporte a busca sem namespace se necessário
    const simpleName = attrName.includes(':') ? attrName.split(':')[1] : attrName;
    for (const [key, val] of Object.entries(this.attributes)) {
      const kSimple = key.includes(':') ? key.split(':')[1] : key;
      if (kSimple === simpleName) {
        return val;
      }
    }
    return null;
  }

  findChildren(tagName: string): XmlNode[] {
    return this.children.filter(
      (c): c is XmlNode => typeof c !== 'string' && (c.name === tagName || this.matchTag(c.name, tagName))
    );
  }

  findDescendants(tagName: string): XmlNode[] {
    const results: XmlNode[] = [];
    for (const child of this.children) {
      if (typeof child !== 'string') {
        if (child.name === tagName || this.matchTag(child.name, tagName)) {
          results.push(child);
        }
        results.push(...child.findDescendants(tagName));
      }
    }
    return results;
  }

  findFirstDescendant(tagName: string): XmlNode | null {
    for (const child of this.children) {
      if (typeof child !== 'string') {
        if (child.name === tagName || this.matchTag(child.name, tagName)) {
          return child;
        }
        const found = child.findFirstDescendant(tagName);
        if (found) return found;
      }
    }
    return null;
  }

  getTextContent(): string {
    let text = '';
    for (const child of this.children) {
      if (typeof child === 'string') {
        text += child;
      } else {
        text += child.getTextContent();
      }
    }
    return text;
  }

  private matchTag(actual: string, expected: string): boolean {
    const actSimple = actual.includes(':') ? actual.split(':')[1] : actual;
    const expSimple = expected.includes(':') ? expected.split(':')[1] : expected;
    return actSimple.toLowerCase() === expSimple.toLowerCase();
  }
}

/**
 * Parser XML com validação estrita de tags malformadas e balanceamento de pilha.
 */
export function parseXml(xmlString: string): XmlNode {
  if (!xmlString || typeof xmlString !== 'string') {
    throw new MalformedDocxError('Conteúdo XML vazio ou inválido.');
  }

  // Remove declarações <?xml ... ?> e comentários <!-- ... -->
  let src = xmlString
    .replace(/<\?xml[^>]*\?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  if (!src) {
    throw new MalformedDocxError('Documento XML não contém elementos.');
  }

  const stack: XmlNode[] = [];
  let root: XmlNode | null = null;
  let pos = 0;
  const len = src.length;

  while (pos < len) {
    const nextLt = src.indexOf('<', pos);
    if (nextLt === -1) {
      // Texto final
      const text = decodeXmlEntities(src.substring(pos).trim());
      if (text && stack.length > 0) {
        stack[stack.length - 1].children.push(text);
      }
      break;
    }

    // Texto antes da próxima tag
    if (nextLt > pos) {
      const text = decodeXmlEntities(src.substring(pos, nextLt));
      if (text && stack.length > 0) {
        stack[stack.length - 1].children.push(text);
      }
    }

    const nextGt = src.indexOf('>', nextLt);
    if (nextGt === -1) {
      throw new MalformedDocxError(`Tag não fechada com '>' na posição ${nextLt}.`);
    }

    const tagContent = src.substring(nextLt + 1, nextGt).trim();
    pos = nextGt + 1;

    // 1. Tag de fechamento </w:p>
    if (tagContent.startsWith('/')) {
      const closingName = tagContent.substring(1).trim();
      if (stack.length === 0) {
        throw new MalformedDocxError(`Tag de fechamento inesperada </${closingName}>.`);
      }
      const top = stack.pop()!;
      if (top.name !== closingName) {
        throw new MalformedDocxError(
          `Erro de balanceamento XML: esperado </${top.name}>, mas encontrado </${closingName}>.`
        );
      }
      continue;
    }

    // 2. Tag de abertura ou auto-fechamento <w:b/>
    const isSelfClosing = tagContent.endsWith('/');
    const cleanTag = isSelfClosing ? tagContent.slice(0, -1).trim() : tagContent;

    const parts = parseTagParts(cleanTag);
    const tagName = parts.name;
    const attributes = parts.attributes;

    const newNode = new XmlNode(tagName, attributes);

    if (stack.length > 0) {
      stack[stack.length - 1].children.push(newNode);
    } else {
      if (!root) {
        root = newNode;
      } else {
        // Múltiplos nós raiz fora de wrapper
      }
    }

    if (!isSelfClosing) {
      stack.push(newNode);
    }
  }

  if (stack.length > 0) {
    const unclosed = stack.map(n => n.name).join(' -> ');
    throw new MalformedDocxError(`XML malformado: tags não fechadas (${unclosed}).`);
  }

  if (!root) {
    throw new MalformedDocxError('Nenhum elemento raiz válido encontrado no XML.');
  }

  return root;
}

function parseTagParts(tagContent: string): { name: string; attributes: Record<string, string> } {
  const match = tagContent.match(/^([^\s]+)([\s\S]*)$/);
  if (!match) {
    return { name: tagContent, attributes: {} };
  }
  const name = match[1];
  const attrStr = match[2];
  const attributes: Record<string, string> = {};

  const attrRegex = /([a-zA-Z0-9_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = attrRegex.exec(attrStr)) !== null) {
    const key = m[1];
    const val = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] || '';
    attributes[key] = decodeXmlEntities(val);
  }

  return { name, attributes };
}

function decodeXmlEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Descompacta com segurança um pacote DOCX (ZIP), impondo limites estritos
 * de descompressão contra Zip Bombs e arquivos maliciosos.
 */
export function safeUnzipDocx(
  bytes: Uint8Array,
  limits: DocxDecompressionLimits = DEFAULT_DOCX_LIMITS
): Record<string, Uint8Array> {
  const effectiveLimits = { ...DEFAULT_DOCX_LIMITS, ...limits };

  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = fflate.unzipSync(bytes);
  } catch (err: any) {
    throw new MalformedDocxError(`Arquivo DOCX corrompido ou compactação inválida (${err?.message || 'erro de leitura'})`);
  }

  const entries = Object.keys(unzipped);

  // 1. Limite de contagem de arquivos
  if (entries.length > effectiveLimits.maxFileCount) {
    throw new DocxSecurityError(
      `O arquivo contém ${entries.length} entradas, excedendo o limite de segurança de ${effectiveLimits.maxFileCount} arquivos.`
    );
  }

  let totalUncompressedBytes = 0;
  for (const name of entries) {
    // 1.5 Prevenção estrita de Zip Slip (Path Traversal)
    if (name.includes('..') || name.startsWith('/') || name.startsWith('\\') || path.isAbsolute(name)) {
      throw new DocxSecurityError(
        `Tentativa de Zip Slip ou Path Traversal detectada na entrada interna: "${name}".`
      );
    }

    const fileBytes = unzipped[name];
    const fileSize = fileBytes.byteLength;

    // 2. Limite por arquivo individual
    if (fileSize > effectiveLimits.maxSingleFileBytes) {
      throw new DocxSecurityError(
        `O arquivo interno "${name}" possui ${(fileSize / (1024 * 1024)).toFixed(1)} MB, excedendo o limite por arquivo de ${(effectiveLimits.maxSingleFileBytes / (1024 * 1024)).toFixed(1)} MB.`
      );
    }

    totalUncompressedBytes += fileSize;

    // 3. Limite total descompactado
    if (totalUncompressedBytes > effectiveLimits.maxTotalBytes) {
      throw new DocxSecurityError(
        `O tamanho total descompactado do DOCX ultrapassa o limite seguro de ${(effectiveLimits.maxTotalBytes / (1024 * 1024)).toFixed(1)} MB.`
      );
    }
  }

  // 4. Verificação de taxa de compressão (anti-zip bomb)
  if (bytes.byteLength > 0) {
    const ratio = totalUncompressedBytes / bytes.byteLength;
    if (ratio > effectiveLimits.maxCompressionRatio && totalUncompressedBytes > 5 * 1024 * 1024) {
      throw new DocxSecurityError(
        `Taxa de descompressão suspeita (${ratio.toFixed(1)}:1), potencial ataque de Zip Bomb.`
      );
    }
  }

  return unzipped;
}
