<template>
    <div class="settings-page">
        <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 24px;">设置</h2>

        <!-- API Key -->
        <div class="settings-group">
            <label>API Key</label>
            <div class="desc">你的 DeepSeek API 密钥，用于查询余额和用量数据</div>
            <div style="display: flex; gap: 8px;">
                <input class="settings-input" v-model="form.api_key" placeholder="sk-..."
                    :type="showKey ? 'text' : 'password'" />
                <button class="btn btn-secondary" @click="showKey = !showKey" style="flex-shrink: 0;">
                    {{ showKey ? '隐藏' : '显示' }}
                </button>
            </div>
        </div>

        <!-- Session Token -->
        <div class="settings-group">
            <label>Session Token（可选）</label>
            <div class="desc">从浏览器开发者工具复制的 Bearer Token，用于获取用量明细</div>
            <div style="display: flex; gap: 8px;">
                <input class="settings-input" v-model="form.session_token"
                    placeholder="从浏览器 Network 请求头中复制 Authorization: Bearer xxx"
                    :type="showSessionToken ? 'text' : 'password'" />
                <button class="btn btn-secondary" @click="showSessionToken = !showSessionToken" style="flex-shrink: 0;">
                    {{ showSessionToken ? '隐藏' : '显示' }}
                </button>
            </div>
        </div>

        <!-- Refresh Interval -->
        <div class="settings-group">
            <label>刷新间隔</label>
            <div class="desc">自动刷新数据的间隔时间</div>
            <select class="settings-input" v-model.number="form.refresh_interval_secs"
                style="width: auto; min-width: 200px;">
                <option :value="30">30 秒</option>
                <option :value="60">1 分钟</option>
                <option :value="120">2 分钟</option>
                <option :value="300">5 分钟</option>
                <option :value="600">10 分钟</option>
            </select>
        </div>

        <!-- Low Balance Threshold -->
        <div class="settings-group">
            <label>余额告警阈值 (¥)</label>
            <div class="desc">当余额低于此值时发送通知提醒</div>
            <input class="settings-input" type="number" v-model.number="form.low_balance_threshold" min="1" max="1000"
                step="1" style="width: 150px;" />
        </div>

        <!-- Notifications -->
        <div class="settings-group">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" v-model="form.notifications_enabled" />
                启用通知
            </label>
            <div class="desc" style="margin-left: 24px;">余额不足或 API 异常时发送系统通知</div>
        </div>

        <!-- Auto Start -->
        <div class="settings-group">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" v-model="form.auto_start" />
                开机自启动
            </label>
            <div class="desc" style="margin-left: 24px;">Windows 登录后自动启动</div>
        </div>

        <!-- Save Button -->
        <div style="display: flex; gap: 8px; margin-top: 32px;">
            <button class="btn btn-primary" @click="save">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                </svg>
                保存配置
            </button>
            <button class="btn btn-secondary" @click="testConnection" :disabled="testing">
                {{ testing ? '测试中...' : '测试连接' }}
            </button>
        </div>

        <!-- Save feedback -->
        <div v-if="saveMessage"
            style="margin-top: 12px; padding: 8px 12px; border-radius: var(--radius-sm); font-size: 13px;"
            :style="{ background: saveSuccess ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: saveSuccess ? 'var(--accent-green)' : 'var(--accent-red)' }">
            {{ saveMessage }}
        </div>

        <!-- API Diagnostic -->
        <div class="settings-group" style="margin-top: 32px; border-top: 1px solid var(--border); padding-top: 24px;">
            <label>API 诊断</label>
            <div class="desc">查看接口原始响应，用于排查用量数据为空的问题</div>
            <button class="btn btn-secondary" @click="runDiagnose" :disabled="diagnosing" style="margin-top: 8px;">
                {{ diagnosing ? '诊断中...' : '运行诊断' }}
            </button>

            <div v-if="diagResult" style="margin-top: 12px;">
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <button class="btn btn-secondary" @click="copyAllDiag" style="font-size: 12px;">
                        {{ copied ? '已复制 ✓' : '复制全部' }}
                    </button>
                    <button class="btn btn-secondary" @click="diagResult = null" style="font-size: 12px;">清除</button>
                </div>
                <div v-for="(item, idx) in diagResult" :key="idx"
                    style="margin-bottom: 12px; padding: 12px; border-radius: var(--radius-sm); background: rgba(255,255,255,0.03); font-size: 12px; font-family: var(--font-mono); word-break: break-all; overflow-x: auto;">
                    <div><strong>端点:</strong> {{ item.endpoint }}</div>
                    <div><strong>状态码:</strong>
                        <span :style="{ color: item.status === 200 ? 'var(--accent-green)' : 'var(--accent-red)' }">
                            {{ item.status }}
                        </span>
                    </div>
                    <div v-if="item.url" style="margin-top: 4px; font-size: 11px; color: var(--text-muted);">
                        {{ item.url }}
                    </div>
                    <div v-if="item.preview" style="margin-top: 4px;">
                        <textarea readonly :value="item.preview"
                            style="width: 100%; min-height: 80px; resize: vertical; font-family: var(--font-mono); font-size: 11px; line-height: 1.5; background: rgba(0,0,0,0.3); color: var(--text-primary); border: 1px solid var(--border); border-radius: 4px; padding: 8px; white-space: pre; overflow-x: auto;"
                            @click="$event.target.select()"></textarea>
                    </div>
                    <div v-if="item.error" style="margin-top: 4px; color: var(--accent-red);">{{ item.error }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useApiStore } from '../stores/api.js'

const { fetchDashboard } = useApiStore()

const form = ref({
    api_key: '',
    session_token: '',
    refresh_interval_secs: 60,
    low_balance_threshold: 10.0,
    notifications_enabled: true,
    auto_start: false
})

const showKey = ref(false)
const showSessionToken = ref(false)
const testing = ref(false)
const saveMessage = ref('')
const saveSuccess = ref(false)
const diagnosing = ref(false)
const diagResult = ref(null)
const copied = ref(false)

onMounted(async () => {
    try {
        const config = await window.api.loadAppConfig()
        form.value.api_key = config.api_key || ''
        form.value.session_token = config.session_token || ''
        form.value.refresh_interval_secs = config.refresh_interval_secs || 60
        form.value.low_balance_threshold = config.low_balance_threshold || 10.0
        form.value.notifications_enabled = config.notifications_enabled !== false
        form.value.auto_start = config.auto_start || false
    } catch (err) {
        console.error('Failed to load config:', err)
    }
})

async function save() {
    try {
        await window.api.saveAppConfig({
            api_key: form.value.api_key,
            session_token: form.value.session_token,
            refresh_interval_secs: form.value.refresh_interval_secs,
            low_balance_threshold: form.value.low_balance_threshold,
            notifications_enabled: form.value.notifications_enabled,
            auto_start: form.value.auto_start
        })
        saveSuccess.value = true
        saveMessage.value = '配置已保存 ✓'
        // Refresh dashboard with new key
        fetchDashboard()
    } catch (err) {
        saveSuccess.value = false
        saveMessage.value = typeof err === 'string' ? err : '保存失败'
    }
}

async function testConnection() {
    testing.value = true
    saveMessage.value = ''
    try {
        const ok = await window.api.verifyKey(form.value.api_key)
        if (ok) {
            saveSuccess.value = true
            saveMessage.value = '连接成功！API Key 有效 ✓'
        }
    } catch (err) {
        saveSuccess.value = false
        saveMessage.value = typeof err === 'string' ? err : '连接失败，请检查 API Key'
    } finally {
        testing.value = false
    }
}

async function runDiagnose() {
    diagnosing.value = true
    diagResult.value = null
    // Auto-save session token so dashboard can use it immediately
    try {
        await window.api.saveAppConfig({
            api_key: form.value.api_key,
            session_token: form.value.session_token,
            refresh_interval_secs: form.value.refresh_interval_secs,
            low_balance_threshold: form.value.low_balance_threshold,
            notifications_enabled: form.value.notifications_enabled,
            auto_start: form.value.auto_start
        })
    } catch (_) { /* ignore save error during diagnose */ }
    try {
        const result = await window.api.diagnoseApi(form.value.api_key, form.value.session_token || '')
        diagResult.value = result
        // Also refresh dashboard so usage data shows immediately
        fetchDashboard()
    } catch (err) {
        diagResult.value = [{ endpoint: 'diagnose_api', error: typeof err === 'string' ? err : '诊断请求失败' }]
    } finally {
        diagnosing.value = false
    }
}

async function copyAllDiag() {
    if (!diagResult.value) return
    const text = JSON.stringify(diagResult.value, null, 2)
    try {
        await navigator.clipboard.writeText(text)
        copied.value = true
        setTimeout(() => { copied.value = false }, 2000)
    } catch {
        // fallback for environments without clipboard API
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        copied.value = true
        setTimeout(() => { copied.value = false }, 2000)
    }
}
</script>
