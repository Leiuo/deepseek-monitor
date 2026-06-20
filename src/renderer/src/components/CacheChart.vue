<template>
    <div class="panel">
        <div class="panel-header">
            <div style="display: flex; align-items: center; gap: 8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-blue);">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <h3>缓存命中明细</h3>
            </div>
            <span v-if="hasData" class="chart-summary">
                命中率 {{ hitRate }}% · 合计 {{ fmtShort(totalTokens) }}
            </span>
            <span v-else class="chart-summary" style="color: var(--text-muted);">—</span>
        </div>
        <div class="panel-body">
            <!-- No data -->
            <div v-if="!hasData" class="chart-placeholder">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;">
                    <path d="M18 20V10M12 20V4M6 20v-6" />
                </svg>
                暂无缓存数据
            </div>
            <!-- Chart -->
            <template v-else>
                <div class="cache-bars" @mouseleave="hoveredIdx = -1">
                    <div v-for="(point, idx) in points" :key="point.date" class="cache-bar-column">
                        <!-- Tooltip -->
                        <div v-if="hoveredIdx === idx && point.total > 0" class="cache-bar-tooltip" :class="{
                            'align-left': idx <= 1,
                            'align-right': idx >= points.length - 2,
                        }">
                            <div class="tooltip-head">
                                <span class="tooltip-date">{{ point.date }}</span>
                                <strong>{{ fmtInt(point.total) }} tokens</strong>
                            </div>
                            <span class="tooltip-row">
                                <i class="dot hit" />输入（缓存命中）
                                <strong>{{ fmtInt(point.hit) }}</strong>
                            </span>
                            <span class="tooltip-row">
                                <i class="dot miss" />输入（缓存未命中）
                                <strong>{{ fmtInt(point.miss) }}</strong>
                            </span>
                            <span class="tooltip-row">
                                <i class="dot response" />输出
                                <strong>{{ fmtInt(point.response) }}</strong>
                            </span>
                        </div>
                        <!-- Value label -->
                        <span class="cache-bar-value">
                            {{ point.total > 0 ? fmtShort(point.total) : '0' }}
                        </span>
                        <!-- Stacked bar -->
                        <div class="cache-bar-slot">
                            <div class="cache-bar-stacked" :style="{ height: barHeight(point.total) + '%' }"
                                @mouseenter="hoveredIdx = idx">
                                <i v-if="point.total > 0">
                                    <i v-if="point.hit > 0" class="seg hit" :style="{ flexGrow: point.hit }" />
                                    <i v-if="point.miss > 0" class="seg miss" :style="{ flexGrow: point.miss }" />
                                    <i v-if="point.response > 0" class="seg response"
                                        :style="{ flexGrow: point.response }" />
                                </i>
                                <i v-else class="seg empty" />
                            </div>
                        </div>
                        <!-- Date label -->
                        <span class="cache-bar-day">{{ mmdd(point.date) }}</span>
                    </div>
                </div>
                <!-- Legend -->
                <div class="cache-legend">
                    <span class="legend-item"><i class="dot hit" />命中</span>
                    <span class="legend-item"><i class="dot miss" />未命中</span>
                    <span class="legend-item"><i class="dot response" />输出</span>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
    days: {
        type: Array,
        default: () => []
    }
})

const hoveredIdx = ref(-1)
const MIN_BAR = 3

// ── 最近 7 天补零 ──
const todayStr = () => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

const dateKey = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

const addDays = (date, offset) => {
    const next = new Date(date)
    next.setDate(next.getDate() + offset)
    return next
}

const zeroDay = (date) => ({
    date,
    cacheHitTokens: 0,
    cacheMissTokens: 0,
    responseTokens: 0,
    totalTokens: 0,
    totalCost: 0
})

const recentDays = computed(() => {
    const source = new Map(
        props.days
            .filter((d) => d.date <= todayStr())
            .map((d) => [d.date, d])
    )
    const today = new Date()
    return Array.from({ length: 7 }, (_, i) => {
        const date = dateKey(addDays(today, i - 6))
        return source.get(date) || zeroDay(date)
    })
})

const hasData = computed(() => recentDays.value.some((d) => d.totalTokens > 0))

const points = computed(() =>
    recentDays.value.map((d) => ({
        date: d.date,
        hit: d.cacheHitTokens || 0,
        miss: d.cacheMissTokens || 0,
        response: d.responseTokens || 0,
        total:
            (d.cacheHitTokens || 0) + (d.cacheMissTokens || 0) + (d.responseTokens || 0)
    }))
)

const maxVal = computed(() => Math.max(...points.value.map((p) => p.total), 1))
const sumHit = computed(() => points.value.reduce((s, p) => s + p.hit, 0))
const sumMiss = computed(() => points.value.reduce((s, p) => s + p.miss, 0))
const totalTokens = computed(() => points.value.reduce((s, p) => s + p.total, 0))
const hitRate = computed(() => {
    const total = sumHit.value + sumMiss.value
    return total > 0 ? ((sumHit.value / total) * 100).toFixed(0) : '0'
})

function barHeight(total) {
    return total > 0
        ? Math.max(MIN_BAR, (total / maxVal.value) * 100)
        : MIN_BAR
}

function fmtInt(n) {
    return Math.round(n).toLocaleString('en-US')
}
function fmtShort(n) {
    n = Math.round(n)
    if (n >= 1e8) return (n / 1e6).toFixed(0) + 'M'
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
    return String(n)
}
function mmdd(date) {
    const parts = date.split('-')
    return parts.length === 3 ? `${Number(parts[1])}/${Number(parts[2])}` : date
}
</script>
