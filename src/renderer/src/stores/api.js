import { reactive } from 'vue'

// ── Reactive State ──

const state = reactive({
    // Dashboard data
    balance: '—',
    grantedBalance: '—',
    toppedUpBalance: '—',
    currency: 'CNY',
    isAvailable: false,
    usageAvailable: false,

    todayCost: 0,
    todayInputTokens: 0,
    todayOutputTokens: 0,

    dailyHistory: [],
    modelBreakdown: [],

    // UI state
    loading: false,
    error: null,
    lastUpdated: null,
    apiKeyConfigured: false
})

// ── Actions ──

async function fetchDashboard() {
    state.loading = true
    state.error = null

    try {
        const config = await window.api.loadAppConfig()
        if (!config.api_key) {
            state.apiKeyConfigured = false
            state.loading = false
            state.error = '请先在设置中配置 API Key'
            return
        }
        state.apiKeyConfigured = true

        const data = await window.api.getDashboard(config.api_key, config.session_token || '')

        state.balance = data.balance
        state.grantedBalance = data.granted_balance
        state.toppedUpBalance = data.topped_up_balance
        state.currency = data.currency
        state.isAvailable = data.is_available
        state.usageAvailable = data.usage_available

        state.todayCost = data.today_usage?.total_cost ?? 0
        state.todayInputTokens = data.today_usage?.input_tokens ?? 0
        state.todayOutputTokens = data.today_usage?.output_tokens ?? 0

        state.dailyHistory = data.daily_history || []
        state.modelBreakdown = data.model_breakdown || []

        state.lastUpdated = new Date()
    } catch (err) {
        state.error = typeof err === 'string' ? err : '获取数据失败'
        console.error('Dashboard fetch error:', err)
    } finally {
        state.loading = false
    }
}

function formatBalance(val) {
    const num = parseFloat(val)
    if (isNaN(num)) return '—'
    return num.toFixed(2)
}

function formatTokens(val) {
    if (!val) return '0'
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K'
    return val.toString()
}

function formatCost(val) {
    if (!val) return '0.0000'
    return val.toFixed(4)
}

function formatTime(date) {
    if (!date) return ''
    const d = date instanceof Date ? date : new Date(date)
    return d.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })
}

export function useApiStore() {
    return {
        state,
        fetchDashboard,
        formatBalance,
        formatTokens,
        formatCost,
        formatTime
    }
}
