<template>
    <div class="panel">
        <div class="panel-header">
            <h3>{{ dateRangeLabel }}用量趋势</h3>
            <div style="display: flex; gap: 12px; align-items: center;">
                <label
                    style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-muted); cursor: pointer;">
                    <input type="radio" v-model="dayRange" value="7" @change="updateChart" /> 7天
                </label>
                <label
                    style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-muted); cursor: pointer;">
                    <input type="radio" v-model="dayRange" value="30" @change="updateChart" /> 30天
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
            <div v-if="hasData" class="chart-container">
                <canvas ref="chartRef"></canvas>
            </div>
            <div v-else
                style="height: 240px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--text-muted);">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 20V10M12 20V4M6 20v-6" />
                </svg>
                <span style="font-size: 13px;">暂无每日用量数据</span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useApiStore } from '../stores/api.js'

Chart.register(...registerables)

const { state } = useApiStore()
const chartRef = ref(null)
const chartMode = ref('cost')
const dayRange = ref('7')
let chartInstance = null

const dateRangeLabel = computed(() => dayRange.value === '7' ? '近 7 天' : '近 30 天')

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

const hasData = computed(() => (state.dailyHistory || []).length > 0)

function buildChartData() {
    const history = state.dailyHistory || []
    if (history.length === 0) {
        return { labels: [], values: [] }
    }

    // Sort chronologically, then take last N days
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
    const days = parseInt(dayRange.value)
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

    if (chartInstance) {
        chartInstance.data.labels = labels
        chartInstance.data.datasets[0].data = values
        chartInstance.data.datasets[0].backgroundColor = colors.bg
        chartInstance.data.datasets[0].borderColor = colors.border
        chartInstance.data.datasets[0].pointBackgroundColor = colors.point
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
                    backgroundColor: 'rgba(15, 15, 10, 0.95)',
                    titleColor: '#e8e8e0',
                    bodyColor: '#a0a098',
                    borderColor: '#2a2a1e',
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

watch(hasData, (val) => {
    if (val) nextTick(updateChart)
})

watch(() => state.dailyHistory, () => {
    nextTick(updateChart)
}, { deep: true })

onMounted(() => {
    nextTick(updateChart)
})
</script>
