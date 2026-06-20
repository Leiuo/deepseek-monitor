# DeepSeek Monitor

[English](README.en.md) | [🇨🇳 中文](README.md)

DeepSeek API 用量及余额监测 Windows 桌面小工具，支持折叠到系统托盘。  
基于 Electron + Vue 3 构建，通过 API Key 查询余额，通过 Session Token（可选）获取缓存命中率、模型用量明细等详细数据。

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | [Electron](https://www.electronjs.org/) |
| 前端框架 | [Vue 3](https://vuejs.org/) |
| 前端路由 | [Vue Router](https://router.vuejs.org/) |
| 后端 | [Node.js](https://nodejs.org/zh-cn) |
| 数据可视化图表 | [Chart.js](https://www.chartjs.org/) + [vue-chartjs](https://vue-chartjs.org/) |
| 构建 | [Vite](https://vitejs.dev/) + [electron-builder](https://www.electron.build/) |

## 项目结构

```
deepseek-monitor-electron/
├── src/
│   ├── main/           # Electron 主进程
│   │   └── index.js    # 窗口管理、IPC、DeepSeek API 客户端
│   ├── preload/        # 预加载脚本 (contextBridge)
│   │   └── index.js    # 暴露 API / 窗口控制 / Electron API
│   └── renderer/       # Vue 渲染进程
│       └── src/
│           ├── views/       # 页面视图
│           │   ├── Dashboard.vue    # 仪表盘总览
│           │   ├── ModelDetail.vue   # 模型用量详情
│           │   └── Settings.vue      # 设置页
│           ├── components/ # 组件
│           │   ├── TopBar.vue        # 顶部标题栏 + 窗口控制
│           │   ├── SideBar.vue       # 侧边导航栏
│           │   ├── MetricCard.vue    # 指标卡片
│           │   ├── UsageChart.vue    # 用量趋势图
│           │   ├── CacheChart.vue    # 缓存分析图
│           │   └── ModelBreakdown.vue # 模型占比
│           ├── stores/    # 状态管理
│           │   └── api.js            # 响应式状态 + API 调用
│           ├── composables/          # 组合式函数
│           │   └── useTheme.js       # 主题切换
│           └── router/               # 路由
│               └── index.js
├── resources/         # 应用图标
├── build/             # 构建配置
├── electron-builder.yml  # 打包配置
└── package.json
```

## 运行方式

```bash
# 开发模式 (热更新)
cd deepseek-monitor-electron
npm install
npm run dev

# 打包为 Windows 安装程序
npm run build:win

# macOS
npm run build:mac

# Linux (AppImage / snap / deb)
npm run build:linux
```

## 核心功能

| 功能 | 实现方式 |
|---|---|
| 余额查询 | 总余额 / 赠送 / 充值 / 货币 |
| 缓存命中明细 | 近 7 天缓存命中/未命中/输出堆叠柱状图 |
| 模型用量拆分 | 自动识别并统计各模型（DeepSeek V4 Flash/Pro、DeepSeek Chat、DeepSeek Reasoner 等）的费用占比与 Token 消耗 |
| 当日消费 | 从缓存用量详情中提取当日费用 + Token 数 |
| 本月消费 | 从平台 API 汇总月度总费用 |
| 系统托盘 | 左键点击切换显隐 / 右键菜单 (显示/刷新数据/设置/退出) |
| 自定义窗口标题栏 | 无边框窗口，自定义最小化/最大化/关闭按钮 |
| 自动刷新 | 前端定时器 (默认 60s，可在设置中调整) |
| 余额告警 | 低于阈值时发送 Windows 系统通知 |
| API 诊断 | 内建诊断工具，逐一探测所有可用端点并返回原始响应 |
| 开机自启 | 可选 Windows 登录后自动启动 |
| 主题切换 | 支持深色/浅色主题 |

## 配置说明

应用依赖以下凭证连接到 DeepSeek API：

| 配置项 | 说明 | 必填 |
|--------|------|------|
| **API Key** | DeepSeek API 密钥，用于查询余额 | ✅ 是 |
| **Session Token** | 从浏览器开发者工具中复制的 Bearer Token，用于获取用量明细和缓存数据 | ❌ 可选（推荐填写以获得更准确的用量数据） |

## DeepSeek API 对接

### 余额端点 (需 API Key)

| 端点 | 用途 |
|---|---|
| `GET /user/balance` | 查询余额 (¥)，含赠送余额和充值余额 |

### 用量端点 (需 API Key + Session Token)

客户端会依次尝试多个 URL 模式和反序列化策略，自动适配 API 变更：

| 端点类型 | 用途 |
|---|---|
| `api.deepseek.com/dashboard/billing/usage` | OpenAI 兼容用量接口 |
| `platform.deepseek.com/api/v0/usage/amount` | 平台用量接口 (缓存命中/未命中 Token) |
| `platform.deepseek.com/api/v0/usage/cost` | 平台费用接口 (按模型拆分) |
| 其他 10 种备选路径 | 自动探测兼容 |

API Base URL: `https://api.deepseek.com`  
Platform URL: `https://platform.deepseek.com`

## 软件截图

*总览页面：包含账户余额、当日消费、本月消费、缓存命中明细以及当月模型用量明细*
![总览 Light](images/总览-light.png) ![总览 Dark](images/总览-dark.png)

*模型用量明细页面：按模型展示当月输入/输出 Token、费用*
![模型详情 Light](images/模型详情-light.png) ![模型详情 Dark](images/模型详情-dark.png)

*设置页面：提供 API Key、Session Token、刷新间隔、余额告警阈值，以及通知和开机自启开关*
![设置 Light](images/设置-light.png) ![设置 Dark](images/设置-dark.png)

## 使用说明

1. 启动应用后，点击左侧导航进入「设置」
2. 在设置页填入你的 DeepSeek API Key
3. （可选）从浏览器 DeepSeek 官网的 Network 请求中复制 `Authorization: Bearer xxx` 填入 Session Token，以获取缓存命中率等详细用量数据
4. 点击「测试连接」验证 API Key 是否有效
5. 点击「保存配置」— 数据将自动刷新并显示在总览面板
6. 点击右上角「—」按钮可将窗口折叠到系统托盘
7. 在系统托盘图标上右键可唤出菜单（刷新数据 / 设置 / 退出）
8. 左键单击托盘图标同样可切换窗口显隐
9. 如果用量数据为空，可使用设置页的「API 诊断」工具排查接口状态

## UI 配色方案（深色主题）

| 用途 | 色值 |
|---|---|
| 背景 | `#0f0f0a` / `#1a1a0e` |
| 卡片 | `#242418` |
| 蓝色主色 (余额) | `#3b82f6` |
| 橙色 (当日消费) | `#f97316` |
| 紫色 (本月消费 / V4 Pro) | `#a855f7` |
| 青色 (缓存命中 / V4 Flash) | `#22d3ee` |
| 绿色 (缓存未命中) | `#22c55e` |
| 黄色 (输出 Token) | `#eab308` |
| 红色 (余额低警告) | `#ef4444` |

## 已知限制

以下功能的 UI 和设置存储已就绪，后端逻辑尚在实现中：

| 功能 | 说明 |
|------|------|
| **余额告警** | 告警阈值已保存至配置文件，但 Windows 系统通知尚未接入 |
| **自动刷新间隔** | 设置页可调整刷新间隔（30s–10min），但定时器当前固定为 60 秒 |
| **开机自启** | 开机自启开关已保存，但尚未注册到 Windows 登录项 |

## 贡献指南

欢迎通过 Issue 或 Pull Request 参与贡献！

1. Fork 本仓库
2. 创建特性分支
3. 提交改动
4. 发起 Pull Request