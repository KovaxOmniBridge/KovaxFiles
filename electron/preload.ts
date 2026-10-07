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
  isElectron: true
});
