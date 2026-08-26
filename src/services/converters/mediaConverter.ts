import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let isLoaded = false;

async function getFFmpeg(onProgress?: (percent: number, status: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance && isLoaded) {
    return ffmpegInstance;
  }

  onProgress?.(10, 'Carregando motor FFmpeg WebAssembly...');
  ffmpegInstance = new FFmpeg();

  ffmpegInstance.on('progress', ({ progress }) => {
    const percent = Math.min(Math.round(progress * 100), 99);
    onProgress?.(20 + Math.floor(percent * 0.75), `Processando mídia... ${percent}%`);
  });

  const basePath = typeof window !== 'undefined'
    ? (window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1))
    : '/';
  const baseURL = typeof window !== 'undefined'
    ? new URL(`.${basePath}dist`, window.location.origin).href
    : './dist';

  await ffmpegInstance.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });


  isLoaded = true;
  return ffmpegInstance;
}

export interface MediaConversionOptions {
  outputFormat?: string;
  bitrate?: string;
  preset?: 'ultrafast' | 'balanced' | 'high_quality';
  onProgress?: (percent: number, status: string) => void;
}

export async function convertVideoUniversal(
  file: File,
  options?: MediaConversionOptions
): Promise<{ blob: Blob; size: number }> {
  const { outputFormat = 'mp4', preset = 'ultrafast', onProgress } = options || {};
  onProgress?.(5, 'Inicializando conversor universal de vídeo...');

  const ffmpeg = await getFFmpeg(onProgress);

  const inputName = `input_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const outputName = `output_${Date.now()}.${outputFormat}`;

  onProgress?.(20, 'Carregando arquivo de vídeo na memória...');
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  onProgress?.(30, `Processando transcodificação para ${outputFormat.toUpperCase()}...`);
  
  const crf = preset === 'high_quality' ? '22' : (preset === 'balanced' ? '26' : '30');

  await ffmpeg.exec([
    '-i', inputName,
    '-c:v', 'libx264',
    '-preset', preset,
    '-crf', crf,
    '-c:a', 'aac',
    '-b:a', '128k',
    outputName
  ]);

  onProgress?.(95, 'Leitura do arquivo gerado...');
  const data = await ffmpeg.readFile(outputName);
  const mimeType = outputFormat === 'webm' ? 'video/webm' : (outputFormat === 'mkv' ? 'video/x-matroska' : 'video/mp4');
  const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: mimeType });

  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  onProgress?.(100, `Vídeo convertido para ${outputFormat.toUpperCase()} com sucesso!`);
  return { blob, size: blob.size };
}

export async function convertAudioUniversal(
  file: File,
  options?: MediaConversionOptions
): Promise<{ blob: Blob; size: number }> {
  const { outputFormat = 'mp3', bitrate = '192k', onProgress } = options || {};
  onProgress?.(5, 'Inicializando conversor universal de áudio...');

  const ffmpeg = await getFFmpeg(onProgress);

  const inputName = `input_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const outputName = `output_${Date.now()}.${outputFormat}`;

  onProgress?.(20, 'Carregando mídia...');
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  onProgress?.(30, `Extraindo/Convertendo trilha de áudio para ${outputFormat.toUpperCase()} (${bitrate})...`);

  const codec = outputFormat === 'wav' ? 'pcm_s16le' : (outputFormat === 'ogg' ? 'libvorbis' : 'libmp3lame');

  const ffmpegArgs = [
    '-i', inputName,
    '-vn',
  ];

  if (outputFormat !== 'wav') {
    ffmpegArgs.push('-acodec', codec, '-ab', bitrate);
  }

  ffmpegArgs.push(outputName);

  await ffmpeg.exec(ffmpegArgs);

  onProgress?.(95, 'Finalizando arquivo de áudio...');
  const data = await ffmpeg.readFile(outputName);
  const mimeType = `audio/${outputFormat}`;
  const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: mimeType });

  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  onProgress?.(100, `Áudio ${outputFormat.toUpperCase()} gerado com sucesso!`);
  return { blob, size: blob.size };
}

export async function convertVideoToGif(
  file: File,
  options?: MediaConversionOptions
): Promise<{ blob: Blob; size: number }> {
  const { onProgress } = options || {};
  onProgress?.(5, 'Inicializando conversor de Vídeo para GIF...');

  const ffmpeg = await getFFmpeg(onProgress);

  const inputName = `input_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const outputName = `output_${Date.now()}.gif`;

  onProgress?.(20, 'Carregando arquivo de vídeo...');
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  onProgress?.(40, 'Gerando GIF animado com amostragem de cores (Lanczos)...');
  await ffmpeg.exec([
    '-i', inputName,
    '-vf', 'fps=10,scale=480:-1:flags=lanczos',
    outputName
  ]);

  onProgress?.(95, 'Leitura do arquivo GIF gerado...');
  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: 'image/gif' });

  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  onProgress?.(100, 'GIF animado gerado com sucesso!');
  return { blob, size: blob.size };
}

