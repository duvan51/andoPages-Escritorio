import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    desktopAPI: {
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      showNotification: (title: string, body: string) => void;
      openAuthWindow: (url: string) => void;
      onOAuthCallback: (callback: (url: string) => void) => () => void;
      toggleFullscreen: () => void;
      logToServer: (type: string, message: string) => void;
    }
  }
}
