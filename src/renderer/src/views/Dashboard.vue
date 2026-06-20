<template>
    <div>
        <!-- Header with refresh -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <div>
                <h2 style="font-size: 18px; font-weight: 600;">总览</h2>
                <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                    <template v-if="state.lastUpdated">
                        最后更新: {{ formatTime(state.lastUpdated) }}
                    </template>
                    <span :class="state.isAvailable ? 'status-dot online' : 'status-dot offline'"
                        style="margin: 0 4px 0 8px;"></span>
                    {{ state.isAvailable ? 'API 可用' : 'API 不可用' }}
                </p>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <span style="font-size: 12px; color: var(--text-muted);" v-if="state.loading || cacheLoading">
                    <span class="spinner"
                        style="width: 14px; height: 14px; border-width: 2px; display: inline-block; vertical-align: middle; margin-right: 4px;"></span>
                    刷新中...
                </span>
                <button class="btn btn-secondary" @click="refresh" :disabled="state.loading">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="23 4 23 10 17 10" />
                        <polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    刷新
                </button>
            </div>
        </div>

        <!-- Error state -->
        <div v-if="state.error && !state.loading" style="margin-bottom: 16px;">
            <div class="panel"
                style="padding: 16px 20px; border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05);">
                <div style="display: flex; align-items: center; gap: 8px; color: var(--accent-red);">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <span style="font-size: 13px;">{{ state.error }}</span>
                    <span v-if="!state.apiKeyConfigured" style="margin-left: auto;">
                        <router-link to="/settings" class="btn btn-primary"
                            style="text-decoration: none; font-size: 12px; padding: 4px 12px;">
                            去配置
                        </router-link>
                    </span>
                </div>
            </div>
        </div>

        <!-- Loading state -->
        <div v-if="state.loading && !state.lastUpdated" class="loading-container" style="height: 400px;">
            <div class="spinner"></div>
            <span>正在获取数据...</span>
        </div>

        <!-- Dashboard Content -->
        <template v-if="!state.loading || state.lastUpdated">
            <!-- Top Metric Cards -->
            <div class="cards-row">
                <MetricCard label="账户余额" :value="formatBalance(state.balance)" prefix="¥ "
                    :sub="state.currency === 'CNY' ? '人民币' : state.currency" :valueColor="balanceColor">
                    <template #icon>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v12M8 10h6a2 2 0 0 1 0 4H8" />
                        </svg>
                    </template>
                </MetricCard>

                <MetricCard label="当日消费" :value="todayCostDisplay" prefix="¥ " :sub="todaySub"
                    valueColor="var(--accent-orange)">
                    <template #icon>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path
                                d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                    </template>
                </MetricCard>

                <MetricCard label="本月消费" :value="monthCostDisplay" prefix="¥ " :sub="monthSub"
                    valueColor="var(--accent-purple)">
                    <template #icon>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    </template>
                </MetricCard>
            </div>

            <!-- Chart + Model Breakdown (or usage-unavailable message) -->
            <div v-if="state.usageAvailable" style="display: flex; flex-direction: column; gap: 20px;">
                <CacheChart :days="cacheDays" />
                <ModelBreakdown />
            </div>
            <div v-else class="panel" style="padding: 32px; text-align: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round"
                    style="color: var(--text-muted); margin-bottom: 8px;">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <p style="color: var(--text-muted); font-size: 13px; margin: 0;">用量数据暂不支持通过 API 获取</p>
                <p style="color: var(--text-muted); font-size: 12px; margin-top: 4px;">可前往 DeepSeek 官网查看详细用量</p>
            </div>
        </template>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApiStore } from '../stores/api.js'
import MetricCard from '../components/MetricCard.vue'
import CacheChart from '../components/CacheChart.vue'
import ModelBreakdown from '../components/ModelBreakdown.vue'

const router = useRouter()
const { state, fetchDashboard, formatBalance, formatTokens, formatCost, formatTime } = useApiStore()

const balanceColor = computed(() => {
    const val = parseFloat(state.balance)
    if (isNaN(val)) return 'var(--text-primary)'
    if (val < 5) return 'var(--accent-red)'
    if (val < 20) return 'var(--accent-yellow)'
    return 'var(--accent-blue)'
})

// ── 缓存用量数据 ──
const cacheDays = ref([])
const monthCost = ref(null)
const cacheLoading = ref(false)
const cacheError = ref(null)

const todayStr = () => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

const addDays = (date, offset) => {
    const next = new Date(date)
    next.setDate(next.getDate() + offset)
    return next
}

function previousMonth(date) {
    const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1)
    return { month: prev.getMonth() + 1, year: prev.getFullYear() }
}

async function fetchCacheData() {
    const config = await window.api.loadAppConfig()
    const sessionToken = config.session_token || ''
    if (!sessionToken) {
        cacheLoading.value = false
        return
    }

    cacheLoading.value = true
    try {
        const now = new Date()
        const currentMonth = now.getMonth() + 1
        const currentYear = now.getFullYear()

        const current = await window.api.getCacheUsage(sessionToken, currentMonth, currentYear)

        let allDays = [...(current.days || [])]
        monthCost.value = current.monthCost ?? 0

        // Handle month boundary for 7-day window
        const sevenDaysAgo = addDays(now, -6)
        if (sevenDaysAgo.getMonth() !== now.getMonth()) {
            try {
                const prev = previousMonth(now)
                const prevData = await window.api.getCacheUsage(sessionToken, prev.month, prev.year)
                allDays = [...(prevData.days || []), ...allDays]
            } catch {
                // Previous month fetch is optional
            }
        }

        cacheDays.value = allDays
        cacheError.value = null
    } catch (err) {
        cacheError.value = typeof err === 'string' ? err : '获取消费数据失败'
        console.error('Cache data error:', err)
    } finally {
        cacheLoading.value = false
    }
}

// ── 当日消费 ──
const todayCost = computed(() => {
    const today = todayStr()
    const day = cacheDays.value.find((d) => d.date === today)
    return day ? day.totalCost : null
})

const todayCostDisplay = computed(() => {
    if (cacheLoading.value && todayCost.value === null) return '…'
    if (todayCost.value !== null && todayCost.value !== undefined) return todayCost.value.toFixed(4)
    return '—'
})

const todaySub = computed(() => {
    if (todayCost.value !== null && todayCost.value !== undefined) {
        const tokens = cacheDays.value.find((d) => d.date === todayStr())
        if (tokens) {
            const total = (tokens.cacheHitTokens || 0) + (tokens.cacheMissTokens || 0) + (tokens.responseTokens || 0)
            return `${formatTokens(total)} Tokens`
        }
    }
    return !state.apiKeyConfigured ? '请配置 Session Token' : '暂无数据'
})

// ── 本月消费 ──
const monthCostDisplay = computed(() => {
    if (cacheLoading.value && monthCost.value === null) return '…'
    if (monthCost.value !== null && monthCost.value !== undefined) return monthCost.value.toFixed(4)
    return '—'
})

const monthSub = computed(() => {
    if (!state.apiKeyConfigured) return '请配置 Session Token'
    if (monthCost.value !== null && monthCost.value !== undefined) return `${formatCost(monthCost.value)} 累计`
    return '暂无数据'
})

// ── 刷新 ──
let refreshTimer = null

async function refresh() {
    await Promise.all([
        fetchDashboard(),
        fetchCacheData()
    ])
}

function startAutoRefresh(intervalSecs) {
    const ms = (intervalSecs || 60) * 1000
    refreshTimer = setInterval(() => {
        fetchDashboard()
        fetchCacheData()
    }, ms)
}

onMounted(async () => {
    // 加载配置以获取已保存的刷新间隔
    let intervalSecs = 60
    try {
        const config = await window.api.loadAppConfig()
        intervalSecs = config.refresh_interval_secs || 60
    } catch (err) {
        console.error('Failed to load config for refresh interval:', err)
    }

    await Promise.all([
        fetchDashboard(),
        fetchCacheData()
    ])
    startAutoRefresh(intervalSecs)

    window.api.onTrayRefresh(() => {
        refresh()
    })
    window.api.onTraySettings(() => {
        router.push('/settings')
    })
})

onUnmounted(() => {
    if (refreshTimer) clearInterval(refreshTimer)
})
</script>
