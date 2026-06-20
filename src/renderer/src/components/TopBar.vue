<template>
    <div class="top-bar">
        <div class="drag-region">
            <span class="app-title">
                <span class="accent">DeepSeek</span> Monitor
            </span>
            <span class="status-dot" :class="statusClass"></span>
            <button class="theme-btn" @click="toggleTheme" :title="isLight ? '切换到深色模式' : '切换到浅色模式'">
                <!-- 太阳图标（浅色模式） -->
                                <svg v-if="isLight" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <path
                        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
                <!-- 月亮图标（深色模式） -->
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
            </button>
        </div>
        <div class="window-controls">
            <button class="window-btn" @click="minimize" title="最小化">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
            </button>
            <button class="window-btn" @click="toggleMaximize" :title="isMaximized ? '还原' : '最大化'">
                <!-- 最大化图标（单框） -->
                <svg v-if="!isMaximized" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke="currentColor" stroke-width="1.5" />
                </svg>
                <!-- 还原图标（两个重叠框：后面的框右上，前面的框左下） -->
                <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <!-- 后面的框（右上，仅描边） -->
                    <rect x="4.5" y="1.5" width="10" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5" />
                    <!-- 前面的框（左下，填充背景色遮住重叠部分） -->
                    <rect x="1.5" y="4.5" width="10" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="var(--bg-secondary)" />
                </svg>
            </button>
            <button class="window-btn close" @click="closeWindow" title="关闭">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
            </button>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useApiStore } from '../stores/api.js'
import { useTheme } from '../composables/useTheme.js'

const { state } = useApiStore()
const { isLight, toggle: toggleTheme } = useTheme()

const isMaximized = ref(false)

const statusClass = computed(() => {
    if (!state.apiKeyConfigured) return 'offline'
    return state.isAvailable ? 'online' : 'warning'
})

onMounted(async () => {
    // 获取当前窗口是否已最大化
    isMaximized.value = await window.windowControls.isMaximized()
    // 监听窗口最大化/还原事件
    window.windowControls.onStateChange((maximized) => {
        isMaximized.value = maximized
    })
})

function minimize() {
    window.windowControls.minimize()
}

function toggleMaximize() {
    window.windowControls.maximize()
}

function closeWindow() {
    window.windowControls.close()
}
</script>
