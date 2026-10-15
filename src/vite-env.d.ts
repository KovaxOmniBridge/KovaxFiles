/// <reference types="vite/client" />

declare module 'lucide-react';
declare module 'pdfjs-dist';

interface Window {
  electronAPI?: {
    openFileDialog: (options?: { multi?: boolean; extensions?: string[] }) => Promise<string[] | null>;
    saveFileDialog: (defaultName?: string) => Promise<string | null>;
    openPath: (filePath: string) => Promise<string>;
    showItemInFolder: (filePath: string) => Promise<boolean>;
    getAiStatus?: () => Promise<{
      running: boolean;
      port: number;
      cpuCores: number;
      modelName: string;
      isGpuAccelerated: boolean;
      inferenceVerified?: boolean;
      inferenceLatencyMs?: number;
      statusMessage?: string;
    }>;
    startAiServer?: (targetModelName?: string) => Promise<{ running: boolean; port: number; cpuCores: number; modelName: string; isGpuAccelerated: boolean }>;
    isElectron?: boolean;
  };
}
