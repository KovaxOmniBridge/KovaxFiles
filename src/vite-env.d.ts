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
    getAiStatus?: () => Promise<{
      running: boolean;
      port: number;
      cpuCores: number;
      modelName: string;
      isGpuAccelerated: boolean;
      serverAvailable?: boolean;
      modelLoaded?: boolean;
      inferenceFunctional?: boolean;
      basicLegalSmokeTestPassed?: boolean;
      legalQualityValidated?: boolean;
      tier?: 'offline' | 'server_available' | 'model_loaded' | 'warming_up' | 'inference_functional' | 'basic_legal_smoke_test_passed';
      isWarmingUp?: boolean;
      inferenceVerified?: boolean;
      inferenceLatencyMs?: number;
      instructionTest?: {
        expectedWord: string;
        response: string;
        exactMatch: boolean;
        containsWord: boolean;
        followed: boolean;
        latencyMs: number;
      };
      legalBenchmark?: {
        score: number;
        passed: boolean;
        testPrompt: string;
        response: string;
        expectedConcepts: string[];
        foundConcepts: string[];
        missingConcepts: string[];
        latencyMs: number;
      };
      statusMessage?: string;
    }>;
    startAiServer?: (targetModelName?: string) => Promise<{ running: boolean; port: number; cpuCores: number; modelName: string; isGpuAccelerated: boolean }>;
    isElectron?: boolean;
  };
}
