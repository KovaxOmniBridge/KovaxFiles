/// <reference types="vite/client" />

declare module 'lucide-react';
declare module 'pdfjs-dist';

interface Window {
  electronAPI?: {
    openFileDialog: (options?: { multi?: boolean; extensions?: string[] }) => Promise<string[] | null>;
    saveFileDialog: (defaultName?: string) => Promise<string | null>;
    saveExportedFile?: (defaultName: string, buffer: Uint8Array | ArrayBuffer) => Promise<{ canceled?: boolean; success?: boolean; filePath?: string; error?: string }>;
    openPath: (filePath: string) => Promise<string>;
    showItemInFolder: (filePath: string) => Promise<boolean>;
    isElectron?: boolean;
  };
}
