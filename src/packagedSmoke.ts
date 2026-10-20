import { PDFDocument } from 'pdf-lib';
import { createOfflineWorker } from './services/tesseractOfflineConfig';

// Imported only by the diagnostic renderer entry; no additional IPC capability.
export async function runRendererSmoke(): Promise<{ pdf: number[]; text: string }> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200; canvas.height = 180;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black'; ctx.font = '64px sans-serif';
  ctx.fillText('DOCUMENTO LOCAL 12345', 30, 110);
  const worker = await createOfflineWorker('por', { cacheMethod: 'none' });
  let text: string;
  try { text = (await worker.recognize(canvas)).data.text; }
  finally { await worker.terminate(); }
  if (!text.includes('DOCUMENTO') || !text.includes('12345')) throw new Error(`Reconhecimento OCR falhou: ${text}`);
  const original = await PDFDocument.create();
  original.addPage([600, 800]).drawText('DOCUMENTO LOCAL 12345');
  const input = await PDFDocument.load(await original.save());
  input.addPage([600, 800]).drawText(text.trim());
  const exported = await input.save();
  const reopened = await PDFDocument.load(exported);
  if (reopened.getPageCount() !== 2) throw new Error('PDF processado/exportado inválido');
  return { pdf: Array.from(exported), text };
}
