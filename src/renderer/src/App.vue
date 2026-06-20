<template>
    <div class="app-layout">
        <TopBar />
        <div class="app-body">
            <Sidebar />
            <main class="main-content">
                <router-view />
            </main>
        </div>
    </div>
</template>

<script setup>
import TopBar from './components/TopBar.vue'
import Sidebar from './components/Sidebar.vue'
</script>
