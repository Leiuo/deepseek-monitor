<template>
    <aside class="sidebar">
        <div class="nav-section">导航</div>

        <router-link to="/" class="nav-item" :class="{ active: $route.path === '/' }">
            <span class="icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                </svg>
            </span>
            总览
        </router-link>

        <router-link to="/settings" class="nav-item" :class="{ active: $route.path === '/settings' }">
            <span class="icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path
                        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
            </span>
            设置
        </router-link>

        <div class="nav-section" style="margin-top: 16px">模型用量</div>
        <div class="model-list">
            <router-link v-for="m in state.modelBreakdown" :key="m.model" :to="'/model/' + encodeURIComponent(m.model)"
                class="model-item" :class="{ active: $route.path === '/model/' + encodeURIComponent(m.model) }">
                <span class="dot" :style="{ background: modelColor(m.model) }"></span>
                <span class="truncate">{{ modelLabel(m.model) }}</span>
                <span style="margin-left: auto; font-family: var(--font-mono); font-size: 12px;">
                    {{ formatTokens(m.input_tokens + m.output_tokens) }}
                </span>
            </router-link>
            <div v-if="state.modelBreakdown.length === 0" class="model-item" style="color: var(--text-muted)">
                <span>暂无数据</span>
            </div>
        </div>
    </aside>
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
