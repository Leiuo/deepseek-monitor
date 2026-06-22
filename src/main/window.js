import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

let mainWindow = null

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1100,
        height: 720,
        show: false,
        autoHideMenuBar: true,
        frame: false,
        ...(process.platform === 'win32' || process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    // 拦截关闭事件：点击关闭按钮时隐藏到系统托盘，而非退出程序
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault()
            mainWindow.hide()
        }
    })

    // 窗口控制 IPC
    ipcMain.on('window-minimize', () => mainWindow.minimize())
    ipcMain.on('window-maximize', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize()
        } else {
            mainWindow.maximize()
        }
    })
    ipcMain.on('window-close', () => mainWindow.close())
    ipcMain.handle('window-is-maximized', () => mainWindow.isMaximized())

    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('window-state-changed', true)
    })
    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('window-state-changed', false)
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

    return mainWindow
}

function getMainWindow() {
    return mainWindow
}

export { createWindow, getMainWindow }
