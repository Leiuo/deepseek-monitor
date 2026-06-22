import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

function configPath() {
    const dir = app.getPath('userData')
    return join(dir, 'config.json')
}

function loadConfig() {
    const path = configPath()
    if (existsSync(path)) {
        try {
            const raw = readFileSync(path, 'utf-8')
            return JSON.parse(raw)
        } catch { /* ignore */ }
    }
    return {
        api_key: '',
        session_token: '',
        refresh_interval_secs: 60,
        low_balance_threshold: 10.0,
        notifications_enabled: true,
        auto_start: false
    }
}

function saveConfig(config) {
    const path = configPath()
    const dir = join(path, '..')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(path, JSON.stringify(config, null, 2), 'utf-8')
}

export { loadConfig, saveConfig }
