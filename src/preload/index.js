import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 窗口控制 API
const windowControls = {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onStateChange: (callback) => {
    ipcRenderer.on('window-state-changed', (_event, isMaximized) => callback(isMaximized))
  }
}

// DeepSeek Monitor API — 对应 Tauri invoke 命令
const api = {
  // 配置
  loadAppConfig: () => ipcRenderer.invoke('load-config'),
  saveAppConfig: (config) => ipcRenderer.invoke('save-config', config),

  // 验证
  verifyKey: (apiKey) => ipcRenderer.invoke('verify-key', apiKey),

  // 仪表盘
  getDashboard: (apiKey, sessionToken) =>
    ipcRenderer.invoke('get-dashboard', { apiKey, sessionToken }),

  // 模型历史
  getModelHistory: (apiKey, sessionToken, modelName) =>
    ipcRenderer.invoke('get-model-history', { apiKey, sessionToken, modelName }),

  // 缓存用量
  getCacheUsage: (sessionToken, month, year) =>
    ipcRenderer.invoke('get-cache-usage', { sessionToken, month, year }),

  // API 诊断
  diagnoseApi: (apiKey, sessionToken) =>
    ipcRenderer.invoke('diagnose-api', { apiKey, sessionToken }),

  // 事件监听
  onTrayRefresh: (callback) => {
    ipcRenderer.on('tray-refresh', () => callback())
  },
  onTraySettings: (callback) => {
    ipcRenderer.on('tray-settings', () => callback())
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('windowControls', windowControls)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
  window.windowControls = windowControls
}
