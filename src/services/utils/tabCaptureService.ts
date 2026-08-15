/**
 * SERVIÇO DE CAPTURA DE ABA ABERTA OU TELA (TAB CAPTURE API)
 * Permite ao usuário capturar o visual de qualquer aba aberta no navegador (extratos, dashboards, notas)
 * e injetar a imagem HD na fila de conversão para PDF Executivo A4 ou imagem otimizada.
 */

export async function captureActiveTabFrame(): Promise<File | null> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    throw new Error('O seu navegador não possui suporte para a API de captura de abas/telas.');
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'browser',
      } as any,
      audio: false,
    });

    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();

    // Aguarda 300ms para estabilização do frame do vídeo
    await new Promise((resolve) => setTimeout(resolve, 300));

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error('Falha ao inicializar o Canvas para captura de tela.');
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Encerra a transmissão da captura de tela
    stream.getTracks().forEach((track) => track.stop());

    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return new File([blob], `captura_aba_${timestamp}.png`, { type: 'image/png' });
  } catch (err: any) {
    if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
      return null; // Usuário cancelou a janela de seleção de aba
    }
    throw new Error(`Erro ao capturar aba do navegador: ${err.message || err}`);
  }
}
