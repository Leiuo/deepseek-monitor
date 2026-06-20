<template>
    <div>
        <!-- Header with back button -->
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
            <button class="btn btn-secondary" @click="$router.push('/')" style="padding: 6px 10px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                </svg>
            </button>
            <div>
                <h2 style="font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                    <span class="dot" :style="{ background: modelColor(modelName) }"
                        style="width: 10px; height: 10px; display: inline-block; border-radius: 50%;"></span>
                    {{ modelLabel(modelName) }}
                    <span
                        style="font-size: 12px; font-weight: 400; color: var(--text-muted); font-family: var(--font-mono);">{{
                        modelName }}</span>
                </h2>
                <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                    <template v-if="state.lastUpdated">
                        最后更新: {{ formatTime(state.lastUpdated) }}
                    </template>
                </p>
            </div>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="loading-container" style="height: 300px;">
            <div class="spinner"></div>
            <span>正在加载模型数据...</span>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="panel"
            style="padding: 16px 20px; border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px; color: var(--accent-red);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span style="font-size: 13px;">{{ error }}</span>
            </div>
        </div>

        <!-- Data Content -->
        <template v-if="!loading && modelData">
            <!-- Summary cards -->
            <div class="cards-row">
                <div class="metric-card">
                    <div class="label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                        本月总费用
                    </div>
                    <div class="value" style="color: var(--accent-blue);">¥ {{ modelData.total_cost.toFixed(4) }}</div>
                </div>
                <div class="metric-card">
                    <div class="label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        输入 Token
                    </div>
                    <div class="value" style="color: var(--accent-cyan); font-size: 24px;">{{
                        (modelData.total_input_tokens || 0).toLocaleString() }}</div>
                </div>
                <div class="metric-card">
                    <div class="label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        输出 Token
                    </div>
                    <div class="value" style="color: var(--accent-purple); font-size: 24px;">{{
                        (modelData.total_output_tokens || 0).toLocaleString() }}</div>
                </div>
            </div>

            <!-- Trend Chart -->
            <div class="panel" style="margin-bottom: 20px;">
                <div class="panel-header">
                    <h3>每日用量趋势</h3>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <label
                            style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-muted); cursor: pointer;">
                            <input type="radio" v-model="chartDayRange" value="7" @change="updateChart" /> 7天
                        </label>
                        <label
                            style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-muted); cursor: pointer;">
                            <input type="radio" v-model="chartDayRange" value="30" @change="updateChart" /> 30天
                        </label>
                        <span style="color: var(--border-light); user-select: none;">|</span>
                        <label
                            style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-muted); cursor: pointer;">
                            <input type="radio" v-model="chartMode" value="cost" @change="updateChart" /> 费用
                        </label>
                        <label
                            style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-muted); cursor: pointer;">
                            <input type="radio" v-model="chartMode" value="tokens" @change="updateChart" /> Token
                        </label>
                    </div>
                </div>
                <div class="panel-body">
                    <div v-if="chartHasData" class="chart-container">
                        <canvas ref="chartRef"></canvas>
                    </div>
                    <div v-else
                        style="height: 240px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--text-muted);">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 20V10M12 20V4M6 20v-6" />
                        </svg>
                        <span style="font-size: 13px;">暂无该模型的每日用量数据</span>
                    </div>
                </div>
            </div>

            <!-- Daily breakdown table -->
            <div class="panel">
                <div class="panel-header">
                    <h3>逐日明细</h3>
                </div>
                <div class="panel-body" style="padding: 0;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>日期</th>
                                <th style="text-align: right">费用 (¥)</th>
                                <th style="text-align: right">输入 Token</th>
                                <th style="text-align: right">输出 Token</th>
                                <th style="text-align: right">合计 Token</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="d in sortedDailyHistory" :key="d.date">
                                <td style="font-family: var(--font-mono); font-size: 12px;">{{ d.date }}</td>
                                <td style="text-align: right; font-family: var(--font-mono); font-size: 12px;">
                                    {{ (d.cost || 0).toFixed(4) }}
                                </td>
                                <td style="text-align: right; font-family: var(--font-mono); font-size: 12px;">
                                    {{ (d.input_tokens || 0).toLocaleString() }}
                                </td>
                                <td style="text-align: right; font-family: var(--font-mono); font-size: 12px;">
                                    {{ (d.output_tokens || 0).toLocaleString() }}
                                </td>
                                <td style="text-align: right; font-family: var(--font-mono); font-size: 12px;">
                                    {{ ((d.input_tokens || 0) + (d.output_tokens || 0)).toLocaleString() }}
                                </td>
                            </tr>
                            <tr v-if="sortedDailyHistory.length === 0">
                                <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">
                                    暂无逐日数据
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </template>

        <!-- No data -->
        <div v-else-if="!loading && !error" class="panel" style="padding: 32px; text-align: center;">
            <p style="color: var(--text-muted); font-size: 13px;">未找到该模型的数据</p>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { Chart, registerables } from 'chart.js'
import { useApiStore } from '../stores/api.js'
import { useTheme } from '../composables/useTheme.js'

Chart.register(...registerables)

const route = useRoute()
const { state, formatTime } = useApiStore()
const { isLight } = useTheme()

const modelName = computed(() => route.params.name)

const loading = ref(false)
const error = ref(null)
const modelData = ref(null)

const chartRef = ref(null)
const chartMode = ref('cost')
const chartDayRange = ref('7')
let chartInstance = null

const chartColors = {
    cost: {
        bg: 'rgba(59, 130, 246, 0.15)',
        border: 'rgba(59, 130, 246, 0.8)',
        point: 'rgba(59, 130, 246, 1)'
    },
    tokens: {
        bg: 'rgba(34, 211, 238, 0.15)',
        border: 'rgba(34, 211, 238, 0.8)',
        point: 'rgba(34, 211, 238, 1)'
    },
    grid: 'rgba(255, 255, 255, 0.05)',
    text: 'rgba(160, 160, 152, 0.7)'
}

function getTooltipColors() {
    if (isLight.value) {
        return {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#1a1a18',
            bodyColor: '#6a6a62',
            borderColor: '#d4d4d0'
        }
    }
    return {
        backgroundColor: 'rgba(15, 15, 10, 0.95)',
        titleColor: '#e8e8e0',
        bodyColor: '#a0a098',
        borderColor: '#2a2a1e'
    }
}

const modelColors = {
    'deepseek-v4-flash': '#22d3ee',
    'deepseek-v4-pro': '#a855f7',
    'deepseek-chat': '#3b82f6',
    'deepseek-reasoner': '#f97316'
}

const modelLabels = {
    'deepseek-v4-flash': 'V4 Flash',
    'deepseek-v4-pro': 'V4 Pro',
    'deepseek-chat': 'DeepSeek Chat',
    'deepseek-reasoner': 'DeepSeek Reasoner'
}

function modelColor(name) {
    return modelColors[name] || '#707068'
}
function modelLabel(name) {
    return modelLabels[name] || name
}

const chartHasData = computed(() => (modelData.value?.daily_history?.length || 0) > 0)

const sortedDailyHistory = computed(() => {
    if (!modelData.value) return []
    return [...modelData.value.daily_history].sort((a, b) => b.date.localeCompare(a.date))
})

function buildChartData() {
    const history = modelData.value?.daily_history || []
    if (history.length === 0) return { labels: [], values: [] }

    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
    const days = parseInt(chartDayRange.value)
    const recent = sorted.slice(-days)

    const labels = recent.map((d) => {
        const parts = d.date.split('-')
        return parts[1] + '/' + parts[2]
    })

    const values = recent.map((d) => {
        if (chartMode.value === 'cost') return d.cost || 0
        return (d.input_tokens || 0) + (d.output_tokens || 0)
    })

    return { labels, values }
}

function updateChart() {
    if (!chartRef.value) return
    const { labels, values } = buildChartData()
    if (values.length === 0) return

    const colors = chartColors[chartMode.value]
    const tc = getTooltipColors()

    if (chartInstance) {
        chartInstance.data.labels = labels
        chartInstance.data.datasets[0].data = values
        chartInstance.data.datasets[0].backgroundColor = colors.bg
        chartInstance.data.datasets[0].borderColor = colors.border
        chartInstance.data.datasets[0].pointBackgroundColor = colors.point
        chartInstance.options.plugins.tooltip.backgroundColor = tc.backgroundColor
        chartInstance.options.plugins.tooltip.titleColor = tc.titleColor
        chartInstance.options.plugins.tooltip.bodyColor = tc.bodyColor
        chartInstance.options.plugins.tooltip.borderColor = tc.borderColor
        chartInstance.update()
        return
    }

    chartInstance = new Chart(chartRef.value, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: chartMode.value === 'cost' ? '费用 (¥)' : 'Token 用量',
                    data: values,
                    fill: true,
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    borderWidth: 2,
                    pointBackgroundColor: colors.point,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: tc.backgroundColor,
                    titleColor: tc.titleColor,
                    bodyColor: tc.bodyColor,
                    borderColor: tc.borderColor,
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: (ctx) => {
                            if (chartMode.value === 'cost') {
                                return `¥${ctx.parsed.y.toFixed(4)}`
                            }
                            return `${ctx.parsed.y.toLocaleString()} tokens`
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: chartColors.grid, drawBorder: false },
                    ticks: { color: chartColors.text, maxRotation: 45, font: { size: 10 } }
                },
                y: {
                    grid: { color: chartColors.grid, drawBorder: false },
                    ticks: { color: chartColors.text, font: { size: 10 } },
                    beginAtZero: true
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    })
}

async function fetchModelData() {
    loading.value = true
    error.value = null
    modelData.value = null

    try {
        const config = await window.api.loadAppConfig()
        if (!config.api_key) {
            error.value = '请先在设置中配置 API Key'
            loading.value = false
            return
        }

        const data = await window.api.getModelHistory(config.api_key, config.session_token || '', modelName.value)
        modelData.value = data
    } catch (err) {
        error.value = typeof err === 'string' ? err : '获取模型数据失败'
        console.error('Model detail fetch error:', err)
    } finally {
        loading.value = false
    }
}

watch(() => modelData.value?.daily_history, () => {
    nextTick(updateChart)
}, { deep: true })

watch(modelName, () => {
    if (chartInstance) {
        chartInstance.destroy()
        chartInstance = null
    }
    fetchModelData()
})

watch(isLight, () => {
    if (chartInstance) updateChart()
})

onMounted(() => {
    fetchModelData()
})
</script>
