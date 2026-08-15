/**
 * Sanitiza o documento clonado pelo html2canvas antes de renderizar em PDF.
 * Remove folha de estilos do TailwindCSS v4 com instrucao 'oklch' e substitui
 * operacoes de cores modernas incompativeis por HEX/RGB compativeis com html2canvas.
 */
export function sanitizeClonedDocCss(clonedDoc: any): void {
  if (!clonedDoc) return;

  // 1. Remove links para CSS externo do Tailwind v4 que contem oklch/oklab
  const linkEls = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
  linkEls.forEach((link: any) => {
    const href = (link.href || '').toLowerCase();
    if (href.includes('styles.css') || href.includes('tailwind') || href.includes('index.css') || href.includes('app.css')) {
      link.remove();
    }
  });

  // 2. Limpa tags <style> contendo oklch, oklab, color-mix e light-dark
  const styleEls = clonedDoc.querySelectorAll('style');
  styleEls.forEach((st: any) => {
    if (st.textContent) {
      if (st.textContent.includes('oklch') || st.textContent.includes('oklab')) {
        st.textContent = st.textContent
          .replace(/oklch\([\s\S]*?\)/gi, '#1e293b')
          .replace(/oklab\([\s\S]*?\)/gi, '#1e293b')
          .replace(/color-mix\([\s\S]*?\)/gi, '#0284c7')
          .replace(/light-dark\(([^,]+),[\s\S]*?\)/gi, '$1');
      }
    }
  });

  // 3. Sanitiza atributos style inline de todos os elementos HTML
  const inlineStyleEls = clonedDoc.querySelectorAll('[style]');
  inlineStyleEls.forEach((el: any) => {
    const styleAttr = el.getAttribute('style') || '';
    if (styleAttr.includes('oklch') || styleAttr.includes('oklab') || styleAttr.includes('color-mix')) {
      const cleaned = styleAttr
        .replace(/oklch\([\s\S]*?\)/gi, '#1e293b')
        .replace(/oklab\([\s\S]*?\)/gi, '#1e293b')
        .replace(/color-mix\([\s\S]*?\)/gi, '#0284c7');
      el.setAttribute('style', cleaned);
    }
  });
}
