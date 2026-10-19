import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

// Single Instance Lock only in production, allow multiple/fresh instances in dev mode
if (!is.dev) {
  const gotTheLock = app.requestSingleInstanceLock()
  if (!gotTheLock) {
    app.quit()
  } else {
    app.on('second-instance', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
      }
    })
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.andopages.dashboard')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC Handlers
  ipcMain.on('window-minimize', () => mainWindow?.minimize())
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow?.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.on('window-close', () => {
    if (is.dev) {
      isQuitting = true
      app.quit()
    } else {
      mainWindow?.close()
    }
  }) 

  ipcMain.on('show-notification', (_, { title, body }) => {
    new Notification({ title, body, icon: nativeImage.createFromPath(icon) }).show()
  })

  ipcMain.on('toggle-fullscreen', (event) => {
    const webContents = event.sender;
    const window = BrowserWindow.fromWebContents(webContents);
    if (window) {
      window.setFullScreen(!window.isFullScreen());
    }
  });

  ipcMain.on('renderer-log', (_, { type, message }) => {
    try {
      const logPath = 'c:\\Users\\duvan\\OneDrive\\Escritorio\\proyectos\\andoPages-Escritorio\\andopages_debug.log'
      const timestamp = new Date().toISOString()
      const formattedLog = `[${timestamp}] [RENDERER-${type.toUpperCase()}] ${message}\n`
      fs.appendFileSync(logPath, formattedLog, 'utf8')
      console.log(formattedLog.trim())
    } catch (e) {
      console.error("Error writing renderer log:", e)
    }
  })

  // POPUP PARA OAUTH
  ipcMain.on('open-auth-window', (_event, url) => {
    const authWindow = new BrowserWindow({
      width: 500,
      height: 700,
      title: 'Iniciar sesión con Google',
      autoHideMenuBar: true,
      webPreferences: {
        partition: 'persist:andopages',
        webSecurity: false
      }
    })

    authWindow.loadURL(url)

    authWindow.webContents.on('will-redirect', (e, redirectUrl) => {
      console.log("Detectada redirección en popup:", redirectUrl);
      
      const hasCode = redirectUrl.includes('code=');
      const hasToken = redirectUrl.includes('access_token=');
      const isTarget = redirectUrl.includes('desarrollandoando.fun/admin');

      if ((hasCode || hasToken) && isTarget) {
        e.preventDefault()
        authWindow.close()
        mainWindow?.webContents.send('oauth-callback', redirectUrl)
      }
    })
  })

  createWindow()
  createTray()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    show: false,
    frame: false,
    resizable: true,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      partition: 'persist:andopages',
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    // In dev mode, open DevTools to inspect renderer errors easily
    if (is.dev) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' })
    }
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting && !is.dev) {
      event.preventDefault()
      mainWindow?.hide()
    }
    return false
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray() {
  const trayIcon = nativeImage.createFromPath(icon)
  tray = new Tray(trayIcon)
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Mostrar Dashboard', click: () => mainWindow?.show() },
    { type: 'separator' },
    { 
      label: 'Salir completamente', 
      click: () => {
        isQuitting = true
        app.quit()
      } 
    }
  ])
  
  tray.setToolTip('AndoPages Dashboard')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => mainWindow?.show())
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
