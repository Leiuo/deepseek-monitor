<template>
    <div class="metric-card">
        <div class="label">
            <slot name="icon"></slot>
            {{ label }}
        </div>
        <div class="value" :style="{ color: valueColor || undefined }">
            {{ prefix }}{{ value }}
        </div>
        <div class="sub" v-if="sub">{{ sub }}</div>
        <div class="trend" v-if="trend" :class="trendDir">
            <span v-if="trendDir === 'up'">↑</span>
            <span v-else>↓</span>
            {{ trend }}
        </div>
    </div>
</template>

<script setup>
defineProps({
    label: { type: String, required: true },
    value: { type: [String, Number], required: true },
    prefix: { type: String, default: '' },
    sub: { type: String, default: '' },
    trend: { type: String, default: '' },
    trendDir: { type: String, default: 'up' },
    valueColor: { type: String, default: '' }
})
</script>
