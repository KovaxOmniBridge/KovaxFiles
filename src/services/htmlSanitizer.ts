/**
 * HtmlSanitizer - Sanitização rigorosa de HTML documental para o editor
 * Previne ataques de injeção XSS, tags maliciosas e scripts, preservando
 * integralmente a formatação, imagens, tabelas, estilos e quebras de página.
 */

export class HtmlSanitizer {
  private static readonly ALLOWED_TAGS = new Set([
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'div', 'span',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup', 'mark',
    'blockquote', 'pre', 'code',
    'hr', 'br',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'ul', 'ol', 'li',
    'img',
    'header', 'footer', 'section', 'article',
    'a'
  ]);

  private static readonly ALLOWED_ATTRS = new Set([
    'style', 'class', 'id',
    'src', 'alt', 'title',
    'width', 'height',
    'href', 'target',
    'colspan', 'rowspan',
    'data-page-break', 'data-numid', 'data-ilvl'
  ]);

  private static readonly ALLOWED_CSS_PROPERTIES = new Set([
    'color', 'background-color',
    'font-family', 'font-size', 'font-weight', 'font-style', 'text-decoration',
    'text-align', 'text-indent', 'line-height',
    'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
    'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
    'border', 'border-top', 'border-bottom', 'border-left', 'border-right',
    'border-collapse', 'border-width', 'border-style', 'border-color',
    'width', 'max-width', 'min-width',
    'height', 'max-height', 'min-height',
    'display', 'page-break-after', 'page-break-before', 'break-after', 'break-before'
  ]);

  /**
   * Sanitiza uma string HTML removendo tags executáveis e atributos perigosos.
   */
  static sanitize(html: string): string {
    if (!html || typeof html !== 'string') return '';

    // Se estiver em ambiente com DOM (Browser / Electron Renderer)
    if (typeof document !== 'undefined' && typeof DOMParser !== 'undefined') {
      return this.sanitizeWithDom(html);
    }

    // Fallback universal para Node.js / CLI
    return this.sanitizeStringFallback(html);
  }

  private static sanitizeWithDom(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;

    const sanitizeNode = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        // 1. Remover tag se não permitida
        if (!this.ALLOWED_TAGS.has(tag)) {
          // Substitui por seus nós filhos
          while (el.firstChild) {
            el.parentNode?.insertBefore(el.firstChild, el);
          }
          el.parentNode?.removeChild(el);
          return;
        }

        // 2. Filtrar atributos
        const attrNames = Array.from(el.attributes).map(a => a.name);
        for (const attr of attrNames) {
          const lowerAttr = attr.toLowerCase();

          // Remover handlers de eventos (on*)
          if (lowerAttr.startsWith('on') || !this.ALLOWED_ATTRS.has(lowerAttr)) {
            el.removeAttribute(attr);
            continue;
          }

          const val = el.getAttribute(attr) || '';

          // Validação de URLs seguras
          if (lowerAttr === 'href' || lowerAttr === 'src') {
            const cleanVal = val.trim().toLowerCase();
            const isSafeUrl =
              cleanVal.startsWith('http://') ||
              cleanVal.startsWith('https://') ||
              cleanVal.startsWith('data:image/') ||
              cleanVal.startsWith('#') ||
              cleanVal.startsWith('mailto:');

            if (!isSafeUrl) {
              el.removeAttribute(attr);
            }
          }

          // Validação de estilo inline
          if (lowerAttr === 'style') {
            const cleanStyle = this.sanitizeCssStyle(val);
            if (cleanStyle) {
              el.setAttribute('style', cleanStyle);
            } else {
              el.removeAttribute('style');
            }
          }
        }

        // Recursão nos nós filhos
        Array.from(el.childNodes).forEach(child => sanitizeNode(child));
      } else if (node.nodeType === Node.COMMENT_NODE) {
        node.parentNode?.removeChild(node);
      }
    };

    Array.from(body.childNodes).forEach(child => sanitizeNode(child));
    return body.innerHTML;
  }

  private static sanitizeStringFallback(html: string): string {
    // 1. Remover scripts, iframes, objetos, embeds, svg, forms e tags de documento
    let clean = html
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '')
      .replace(/<object\b[\s\S]*?<\/object>/gi, '')
      .replace(/<object\b[^>]*\/?>/gi, '')
      .replace(/<embed\b[\s\S]*?<\/embed>/gi, '')
      .replace(/<embed\b[^>]*\/?>/gi, '')
      .replace(/<applet\b[\s\S]*?<\/applet>/gi, '')
      .replace(/<applet\b[^>]*\/?>/gi, '')
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, '')
      .replace(/<svg\b[^>]*\/?>/gi, '')
      .replace(/<form\b[\s\S]*?<\/form>/gi, '')
      .replace(/<form\b[^>]*\/?>/gi, '')
      .replace(/<style\b[\s\S]*?<\/style>/gi, '')
      .replace(/<link\b[^>]*\/?>/gi, '')
      .replace(/<base\b[^>]*\/?>/gi, '')
      .replace(/<meta\b[^>]*\/?>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // 2. Remover handlers on* e javascript:
    clean = clean
      .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"')
      .replace(/src\s*=\s*["']\s*javascript:[^"']*["']/gi, '');

    // 3. Sanitizar atributos de estilo inline
    clean = clean.replace(/\bstyle\s*=\s*(["'])([\s\S]*?)\1/gi, (_match, quote, val) => {
      const sanitized = this.sanitizeCssStyle(val);
      return sanitized ? `style=${quote}${sanitized}${quote}` : '';
    });

    return clean;
  }

  /**
   * Sanitiza propriedades CSS inline, bloqueando expression(), urls perigosas e comportamentos
   */
  private static sanitizeCssStyle(styleStr: string): string {
    if (!styleStr) return '';
    const cleanStyles: string[] = [];
    const declarations = styleStr.split(';');

    for (const decl of declarations) {
      const parts = decl.split(':');
      if (parts.length < 2) continue;
      const prop = parts[0].trim().toLowerCase();
      const val = parts.slice(1).join(':').trim();

      if (!this.ALLOWED_CSS_PROPERTIES.has(prop)) continue;

      // Bloquear scripts em CSS (incluindo variações com espaços ou quebras de linha)
      const normalized = val.toLowerCase().replace(/\s+/g, '');
      if (
        normalized.includes('expression(') ||
        normalized.includes('javascript:') ||
        normalized.includes('behavior') ||
        normalized.includes('-moz-binding') ||
        normalized.includes('@import')
      ) {
        continue;
      }

      cleanStyles.push(`${prop}: ${val}`);
    }

    return cleanStyles.join('; ');
  }
}
