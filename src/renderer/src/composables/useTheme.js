import { ref, watch } from 'vue'

const STORAGE_KEY = 'deepseek-monitor-theme'

/** 当前是否为浅色模式 */
const isLight = ref(false)

/** 已初始化标记 */
let _initialized = false

function apply(light) {
    document.documentElement.classList.toggle('light-theme', light)
}

export function useTheme() {
    if (!_initialized) {
        const stored = localStorage.getItem(STORAGE_KEY)
        isLight.value = stored === 'light'
        apply(isLight.value)
        _initialized = true
    }

    function toggle() {
        isLight.value = !isLight.value
    }

    // 自动同步到 DOM 和 localStorage
    watch(isLight, (val) => {
        apply(val)
        localStorage.setItem(STORAGE_KEY, val ? 'light' : 'dark')
    })

    return { isLight, toggle }
}
