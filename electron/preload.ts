import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: (options?: { multi?: boolean; extensions?: string[] }): Promise<string[] | null> => {
    return ipcRenderer.invoke('dialog:openFile', options);
  },
  saveFileDialog: (defaultName?: string): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:saveFile', defaultName);
  },
  saveExportedFile: (defaultName: string, buffer: Uint8Array | ArrayBuffer): Promise<{ canceled?: boolean; success?: boolean; filePath?: string; error?: string }> => {
    return ipcRenderer.invoke('file:saveExportedFile', { defaultName, buffer });
  },
  openPath: (filePath: string): Promise<string> => {
    return ipcRenderer.invoke('system:openPath', filePath);
  },
  showItemInFolder: (filePath: string): Promise<boolean> => {
    return ipcRenderer.invoke('system:showItemInFolder', filePath);
  },
  isElectron: true
});
