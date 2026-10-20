export function assertJourneyContent(result: { pages: number; texts: string[] }): void {
  if (result.pages !== 2 || result.texts.length !== 2) throw new Error('Jornada: quantidade de páginas divergente');
  for (const [index, expected] of ['M01 REFERENCE ALPHA', 'M01 REFERENCE BETA'].entries()) {
    if (!result.texts[index].includes(expected)) throw new Error(`Jornada: conteúdo esperado ausente na página ${index + 1}`);
  }
}
export async function waitForCondition(probe: () => Promise<boolean>, label: string, timeout = 15000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!(await probe())) {
    if (Date.now() >= deadline) throw new Error(`Timeout: ${label}`);
    await new Promise(resolve => setTimeout(resolve, Math.min(50, timeout)));
  }
}
