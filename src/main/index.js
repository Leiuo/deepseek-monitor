import { app, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { loadConfig } from './config'
import { setupIpcHandlers } from './ipc'
import { createWindow, getMainWindow } from './window'

let tray = null

app.whenReady().then(() => {
    // 创建托盘图标
    const trayIcon = nativeImage.createFromPath(join(__dirname, '../../resources/tray-icon.png'))
    tray = new Tray(trayIcon)

    const contextMenu = Menu.buildFromTemplate([
        {
            label: '显示窗口',
            click: () => {
                let win = getMainWindow()
                if (!win) { win = createWindow() }
                win.show(); win.focus()
            }
        },
        {
            label: '刷新数据',
            click: () => {
                let win = getMainWindow()
                if (!win) { win = createWindow() }
                win.show(); win.focus(); win.webContents.send('tray-refresh')
            }
        },
        { type: 'separator' },
        {
            label: '设置',
            click: () => {
                let win = getMainWindow()
                if (!win) { win = createWindow() }
                win.show(); win.focus(); win.webContents.send('tray-settings')
            }
        },
        { type: 'separator' },
        {
            label: '退出',
            click: () => {
                app.isQuitting = true
                app.quit()
            }
        }
    ])

    tray.setToolTip('DeepSeek Monitor')
    tray.setContextMenu(contextMenu)

    tray.on('click', () => {
        let win = getMainWindow()
        if (!win) { win = createWindow() }
        win.show(); win.focus()
    })

    // 设置应用用户模型ID
    electronApp.setAppUserModelId('com.deepseek.monitor')

    // 应用开机自启配置
    const initialConfig = loadConfig()
    app.setLoginItemSettings({ openAtLogin: !!initialConfig.auto_start })

    // 开机自启时不打开主窗口，仅显示托盘图标
    const openedAtLogin = app.getLoginItemSettings().wasOpenedAtLogin

    // 开发快捷键
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    // 设置 IPC handlers
    setupIpcHandlers()

    if (!openedAtLogin) {
        createWindow()
    }

    app.on('activate', function () {
        if (!getMainWindow()) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
