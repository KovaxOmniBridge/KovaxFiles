import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: (options?: { multi?: boolean; extensions?: string[] }): Promise<string[] | null> => {
    return ipcRenderer.invoke('dialog:openFile', options);
  },
  saveFileDialog: (defaultName?: string): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:saveFile', defaultName);
  },
  openPath: (filePath: string): Promise<string> => {
    return ipcRenderer.invoke('system:openPath', filePath);
  },
  showItemInFolder: (filePath: string): Promise<boolean> => {
    return ipcRenderer.invoke('system:showItemInFolder', filePath);
  },
  getAiStatus: (): Promise<{
    running: boolean;
    port: number;
    cpuCores: number;
    modelName: string;
    isGpuAccelerated: boolean;
    serverAvailable?: boolean;
    modelLoaded?: boolean;
    inferenceFunctional?: boolean;
    legalQualityValidated?: boolean;
    tier?: 'offline' | 'server_available' | 'model_loaded' | 'warming_up' | 'inference_functional' | 'fully_validated';
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
  }> => {
    return ipcRenderer.invoke('ai:getStatus');
  },
  isElectron: true
});
