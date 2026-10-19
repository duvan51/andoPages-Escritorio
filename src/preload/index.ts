import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Exponemos las funciones específicas que React podrá usar
const desktopAPI = {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  showNotification: (title: string, body: string) => ipcRenderer.send('show-notification', { title, body }),
  openAuthWindow: (url: string) => ipcRenderer.send('open-auth-window', url),
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  logToServer: (type: string, message: string) => ipcRenderer.send('renderer-log', { type, message }),
  onOAuthCallback: (callback: (url: string) => void) => {
    const subscription = (_event: any, url: string) => callback(url);
    ipcRenderer.on('oauth-callback', subscription);
    return () => ipcRenderer.removeListener('oauth-callback', subscription);
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    // Exponemos nuestra API bajo el objeto "window.desktopAPI"
    contextBridge.exposeInMainWorld('desktopAPI', desktopAPI) 
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.desktopAPI = desktopAPI
}
