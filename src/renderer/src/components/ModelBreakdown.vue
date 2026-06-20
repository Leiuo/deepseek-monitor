<template>
    <div class="panel">
        <div class="panel-header">
            <h3>当月模型用量明细</h3>
        </div>
        <div class="panel-body" style="padding: 0">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>模型</th>
                        <th style="text-align: right">输入 Token</th>
                        <th style="text-align: right">输出 Token</th>
                        <th style="text-align: right">费用 (¥)</th>
                        <th style="text-align: right">占比</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="m in state.modelBreakdown" :key="m.model">
                        <td>
                            <span class="model-badge">
                                <span class="dot" :style="{ background: modelColor(m.model) }"></span>
                                {{ modelLabel(m.model) }}
                            </span>
                        </td>
                        <td style="text-align: right; font-family: var(--font-mono); font-size: 12px;">
                            {{ formatTokens(m.input_tokens) }}
                        </td>
                        <td style="text-align: right; font-family: var(--font-mono); font-size: 12px;">
                            {{ formatTokens(m.output_tokens) }}
                        </td>
                        <td style="text-align: right; font-family: var(--font-mono); font-size: 12px;">
                            {{ m.cost.toFixed(4) }}
                        </td>
                        <td style="text-align: right">
                            <div style="display: flex; align-items: center; gap: 8px; justify-content: flex-end;">
                                <div
                                    style="width: 60px; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden;">
                                    <div
                                        :style="{ width: m.percentage + '%', height: '100%', background: modelColor(m.model), borderRadius: '3px' }">
                                    </div>
                                </div>
                                <span style="font-size: 12px; color: var(--text-muted);">{{ m.percentage.toFixed(1)
                                    }}%</span>
                            </div>
                        </td>
                    </tr>
                    <tr v-if="state.modelBreakdown.length === 0">
                        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">
                            暂无用量数据
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup>
import { useApiStore } from '../stores/api.js'

const { state, formatTokens } = useApiStore()

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
</script>
