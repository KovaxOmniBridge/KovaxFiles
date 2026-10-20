import * as pdfjs from 'pdfjs-dist';

// Diagnostic reads the file selected again through the actual product input.
export async function inspectReopenedJourneyFile() {
  const input = document.querySelector<HTMLInputElement>('[data-testid="merge-input"]');
  const file = input?.files?.[0];
  if (!file) throw new Error('Reabertura: arquivo não importado');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  try {
    const texts: string[] = [];
    for (let page = 1; page <= doc.numPages; page++) {
      const content = await (await doc.getPage(page)).getTextContent();
      texts.push(content.items.map((item: { str?: string }) => item.str || '').join(' '));
    }
    return { pages: doc.numPages, texts };
  } finally { await doc.destroy(); }
}
