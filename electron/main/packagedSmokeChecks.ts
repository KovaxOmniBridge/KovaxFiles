export function assertRendererReady(snapshot: { mounted: boolean; interactive: boolean; preload: boolean; isolated: boolean }): void {
  if (!snapshot.mounted || !snapshot.interactive) throw new Error('Interface React não montou ou não funciona');
  if (!snapshot.preload || !snapshot.isolated) throw new Error('Preload ausente ou isolamento violado');
}

export function assertOcrAssets(sizeOf: (file: string) => number): void {
  for (const file of ['por.traineddata', 'worker.min.js', 'tesseract-core-lstm.wasm', 'tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm', 'tesseract-core-simd-lstm.wasm.js']) {
    if (sizeOf(file) < (file === 'por.traineddata' ? 2_000_000 : 1)) throw new Error(`Asset OCR ausente ou inválido: ${file}`);
  }
}

export function assertPdfExport(pageCount: number): void {
  if (pageCount !== 2) throw new Error('PDF processado/exportado inválido');
}
