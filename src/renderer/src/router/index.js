import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
    {
        path: '/',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue')
    },
    {
        path: '/settings',
        name: 'Settings',
        component: () => import('../views/Settings.vue')
    },
    {
        path: '/model/:name',
        name: 'ModelDetail',
        component: () => import('../views/ModelDetail.vue')
    }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

export default router
