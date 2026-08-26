/**
 * Sanitiza o documento clonado pelo html2canvas antes de renderizar em PDF.
 * Remove folha de estilos do TailwindCSS v4 com instrução 'oklch' e substitui
 * operações de cores modernas incompatíveis por HEX/RGB compatíveis com html2canvas.
 */
export function sanitizeClonedDocCss(clonedDoc: any): void {
  if (!clonedDoc) return;

  // 1. Remove links para CSS externo do Tailwind v4 que contêm oklch/oklab
  const linkEls = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
  linkEls.forEach((link: any) => {
    const href = (link.href || '').toLowerCase();
    if (href.includes('styles.css') || href.includes('tailwind') || href.includes('index.css') || href.includes('app.css') || link.rel === 'stylesheet') {
      link.remove();
    }
  });

  // 2. Limpa tags <style> contendo oklch, oklab, color-mix e light-dark
  const styleEls = clonedDoc.querySelectorAll('style');
  styleEls.forEach((st: any) => {
    if (st.textContent) {
      if (st.textContent.includes('oklch') || st.textContent.includes('oklab') || st.textContent.includes('color-mix')) {
        st.textContent = st.textContent
          .replace(/oklch\([^)]+\)/gi, '#1e293b')
          .replace(/oklab\([^)]+\)/gi, '#1e293b')
          .replace(/color-mix\([^)]+\)/gi, '#0284c7')
          .replace(/light-dark\(([^,]+),[^)]+\)/gi, '$1');
      }
    }
  });

  // 3. Sanitiza atributos style inline de todos os elementos HTML
  const inlineStyleEls = clonedDoc.querySelectorAll('[style]');
  inlineStyleEls.forEach((el: any) => {
    const styleAttr = el.getAttribute('style') || '';
    if (styleAttr.includes('oklch') || styleAttr.includes('oklab') || styleAttr.includes('color-mix')) {
      const cleaned = styleAttr
        .replace(/oklch\([^)]+\)/gi, '#1e293b')
        .replace(/oklab\([^)]+\)/gi, '#1e293b')
        .replace(/color-mix\([^)]+\)/gi, '#0284c7');
      el.setAttribute('style', cleaned);
    }
  });
}
