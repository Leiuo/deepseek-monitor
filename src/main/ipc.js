import { ipcMain, app, Notification, BrowserWindow } from 'electron'
import { join } from 'path'
import { loadConfig, saveConfig } from './config'
import { fetchBalance, fetchDashboardData, fetchModelHistory, fetchPlatformCacheUsage, diagnoseAPI } from './api'
import { getMainWindow } from './window'

function setupIpcHandlers() {
    // 配置
    ipcMain.handle('load-config', () => loadConfig())

    ipcMain.handle('save-config', (_event, config) => {
        saveConfig(config)
        app.setLoginItemSettings({ openAtLogin: !!config.auto_start, args: ['--hidden'] })
    })

    // 验证 API Key
    ipcMain.handle('verify-key', async (_event, apiKey) => {
        if (!apiKey || !apiKey.trim()) {
            throw new Error('请先配置 API Key')
        }
        const balance = await fetchBalance(apiKey.trim())
        return balance !== null
    })

    // 获取仪表盘数据
    ipcMain.handle('get-dashboard', async (_event, { apiKey, sessionToken }) => {
        if (!apiKey || !apiKey.trim()) {
            throw new Error('请先配置 API Key')
        }
        return fetchDashboardData(apiKey.trim(), sessionToken || '')
    })

    // 获取特定模型历史
    ipcMain.handle('get-model-history', async (_event, { apiKey, sessionToken, modelName }) => {
        if (!apiKey || !apiKey.trim()) {
            throw new Error('请先配置 API Key')
        }
        return fetchModelHistory(apiKey.trim(), sessionToken || '', modelName)
    })

    // 获取缓存用量
    ipcMain.handle('get-cache-usage', async (_event, { sessionToken, month, year }) => {
        if (!sessionToken || !sessionToken.trim()) {
            throw new Error('请先配置 Session Token')
        }
        return fetchPlatformCacheUsage(sessionToken.trim(), month, year)
    })

    // API 诊断
    ipcMain.handle('diagnose-api', async (_event, { apiKey, sessionToken }) => {
        if (!apiKey || !apiKey.trim()) {
            throw new Error('请先配置 API Key')
        }
        return diagnoseAPI(apiKey.trim(), sessionToken || '')
    })

    // 系统通知
    ipcMain.handle('show-notification', (_event, { title, body }) => {
        const win = getMainWindow() || BrowserWindow.getAllWindows()[0]
        const notification = new Notification({
            title: title || 'DeepSeek Monitor',
            body: body || '',
            icon: join(__dirname, '../../resources/icon.png')
        })
        notification.on('click', () => {
            if (win) { win.show(); win.focus() }
        })
        notification.show()
    })

    // 托盘事件转发到渲染进程
    ipcMain.handle('tray-refresh', () => {
        const win = getMainWindow() || BrowserWindow.getAllWindows()[0]
        if (win) win.webContents.send('tray-refresh')
    })

    ipcMain.handle('tray-settings', () => {
        const win = getMainWindow() || BrowserWindow.getAllWindows()[0]
        if (win) win.webContents.send('tray-settings')
    })
}

export { setupIpcHandlers }
