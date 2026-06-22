// ── DeepSeek API 客户端 ──

const DEEPSEEK_BASE = 'https://api.deepseek.com'
const DEEPSEEK_PLATFORM = 'https://platform.deepseek.com'

async function apiFetch(url, options = {}) {
    const resp = await fetch(url, {
        ...options,
        headers: {
            Accept: 'application/json',
            ...options.headers
        }
    })
    return resp
}

// 尝试多种 URL 模式获取用量数据
function usageUrls(startDate, endDate) {
    return [
        `${DEEPSEEK_BASE}/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`,
        `${DEEPSEEK_BASE}/dashboard/billing/usage?startDate=${startDate}&endDate=${endDate}`,
        `${DEEPSEEK_BASE}/v1/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`,
        `${DEEPSEEK_BASE}/billing/usage?start_date=${startDate}&end_date=${endDate}`,
        `${DEEPSEEK_BASE}/user/usage?start_date=${startDate}&end_date=${endDate}`,
        `${DEEPSEEK_BASE}/user/usage?startDate=${startDate}&endDate=${endDate}`,
        `${DEEPSEEK_BASE}/usage?start_date=${startDate}&end_date=${endDate}`,
        `${DEEPSEEK_BASE}/v1/usage?start_date=${startDate}&end_date=${endDate}`,
        `${DEEPSEEK_BASE}/dashboard/usage?start_date=${startDate}&end_date=${endDate}`,
        `${DEEPSEEK_BASE}/api/usage?start_date=${startDate}&end_date=${endDate}`,
        `${DEEPSEEK_BASE}/dashboard/billing/credit_grants`,
        `${DEEPSEEK_BASE}/v1/dashboard/billing/credit_grants`,
    ]
}

async function fetchBalance(apiKey) {
    const url = `${DEEPSEEK_BASE}/user/balance`
    const resp = await apiFetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` }
    })
    if (resp.status === 404) return null
    if (!resp.ok) {
        const body = await resp.text().catch(() => '')
        throw new Error(`API 返回错误 (${resp.status}): ${body}`)
    }
    return resp.json()
}

async function fetchUsage(apiKey, sessionToken, startDate, endDate) {
    const urls = usageUrls(startDate, endDate)
    for (const url of urls) {
        const useSession = url.includes('platform.deepseek.com')
        const bearerToken = useSession && sessionToken ? sessionToken : apiKey
        const headers = {
            Authorization: `Bearer ${bearerToken}`,
            'X-App-Version': '1.0.0'
        }
        if (useSession) {
            headers['Referer'] = 'https://platform.deepseek.com/usage'
            headers['Origin'] = 'https://platform.deepseek.com'
        }
        try {
            const resp = await apiFetch(url, { headers })
            if (resp.status === 404) continue
            if (!resp.ok) {
                const body = await resp.text().catch(() => '')
                throw new Error(`API 返回错误 (${resp.status}): ${body}`)
            }
            const text = await resp.text()
            const parsed = parseUsageResponse(text)
            if (parsed) return parsed
        } catch (e) {
            if (e.message && e.message.includes('API 返回错误')) throw e
            continue
        }
    }
    return null
}

function parseUsageResponse(text) {
    // 尝试直接解析
    try {
        const data = JSON.parse(text)
        // 策略1: 平铺 snake_case
        if (data.daily_costs || data.total_usage != null || data.usage) {
            return data
        }
        // 策略2: 信封包装 {code, data}
        if (data.code != null && data.data) {
            if (data.data.daily_costs || data.data.total_usage != null || data.data.usage) {
                return data.data
            }
        }
        // 策略3: camelCase
        const camel = {
            total_usage: data.totalUsage ?? data.total_usage,
            daily_costs: data.dailyCosts ?? data.daily_costs,
            usage: data.usage
        }
        if (camel.daily_costs || camel.total_usage != null || camel.usage) {
            return camel
        }
        // 策略4: 信封 + camelCase
        if (data.data && (data.data.dailyCosts || data.data.totalUsage != null)) {
            return {
                total_usage: data.data.totalUsage,
                daily_costs: data.data.dailyCosts,
                usage: data.data.usage
            }
        }
        // 策略5: 递归探测
        const candidates = [data.data, data.result, data].filter(Boolean)
        for (const node of candidates) {
            const dailyCosts = node.daily_costs || node.dailyCosts || node.costs || node.records
            const totalUsage = node.total_usage ?? node.totalUsage
            const usage = node.usage || node.modelUsage || node.model_breakdown
            if (dailyCosts || usage || totalUsage != null) {
                return { total_usage: totalUsage, daily_costs: dailyCosts, usage }
            }
        }
        // 策略6: platform.deepseek.com 格式
        if (data.code === 0 && data.data) {
            const bizData = data.data.biz_data
            if (bizData) {
                const totalArr = Array.isArray(bizData) ? bizData[0]?.total : bizData.total
                if (totalArr && Array.isArray(totalArr)) {
                    const modelUsage = totalArr.map(entry => {
                        const model = entry.model || 'unknown'
                        const usageArr = entry.usage || []
                        let inputTokens = 0, outputTokens = 0, cost = 0
                        for (const item of usageArr) {
                            const amt = parseFloat(item.amount) || 0
                            const type = item.type || ''
                            if (type === 'PROMPT_TOKEN' || type === 'PROMPT_CACHE_MISS_TOKEN' || type === 'PROMPT_CACHE_HIT_TOKEN') {
                                inputTokens += Math.round(amt)
                            } else if (type === 'RESPONSE_TOKEN') {
                                outputTokens += Math.round(amt)
                            } else if (type.includes('COST') || type.includes('cost') || String(amt).includes('.')) {
                                cost += amt
                            }
                        }
                        if (cost === 0) {
                            for (const item of usageArr) {
                                if (!(item.type || '').includes('TOKEN')) {
                                    cost += parseFloat(item.amount) || 0
                                }
                            }
                        }
                        return { model, input_tokens: inputTokens, output_tokens: outputTokens, cost, percentage: 0 }
                    })
                    const totalCost = modelUsage.reduce((s, m) => s + m.cost, 0)
                    if (totalCost > 0) {
                        modelUsage.forEach(m => { m.percentage = Math.round(m.cost / totalCost * 10000) / 100 })
                    }
                    return { total_usage: totalCost, daily_costs: null, usage: modelUsage }
                }
            }
        }
    } catch { /* ignore parse errors */ }
    return null
}

// ── 获取平台用量明细 (Session Token) ──

async function fetchPlatformCacheUsage(sessionToken, month, year) {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
    const headers = {
        Authorization: `Bearer ${sessionToken}`,
        'x-app-version': '1.0.0',
        Accept: '*/*',
        Referer: 'https://platform.deepseek.com/usage',
        Origin: 'https://platform.deepseek.com',
        'User-Agent': ua
    }

    const amountUrl = `${DEEPSEEK_PLATFORM}/api/v0/usage/amount?month=${month}&year=${year}`
    const costUrl = `${DEEPSEEK_PLATFORM}/api/v0/usage/cost?month=${month}&year=${year}`

    async function getJson(url) {
        const resp = await fetch(url, { headers })
        if (resp.status === 401) throw new Error('Session Token 无效或已过期，请重新获取')
        if (resp.status === 429) throw new Error('请求过于频繁，请稍后再试')
        if (!resp.ok) throw new Error(`用量接口错误：HTTP ${resp.status}`)
        return resp.json()
    }

    const [amountResp, costResp] = await Promise.all([
        getJson(amountUrl),
        getJson(costUrl)
    ])

    // Build cost by date map and per-model per-date cost map
    const costByDate = {}
    const costByModelByDate = {}
    const costBizData = costResp?.data?.biz_data?.[0]
    if (costBizData) {
        for (const day of (costBizData.days || [])) {
            const dayCost = (day.data || []).reduce((sum, m) => {
                return sum + (m.usage || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
            }, 0)
            costByDate[day.date] = dayCost
            // Per-model cost breakdown
            const modelCosts = {}
            for (const mu of (day.data || [])) {
                const modelCost = (mu.usage || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
                if (modelCost > 0) modelCosts[mu.model] = modelCost
            }
            costByModelByDate[day.date] = modelCosts
        }
    }

    // Parse daily cache breakdown
    const days = []
    const amountBizDataRaw = amountResp?.data?.biz_data
    const amountBizData = Array.isArray(amountBizDataRaw) ? amountBizDataRaw[0] : amountBizDataRaw
    if (amountBizData && amountBizData.days) {
        for (const day of amountBizData.days) {
            let hit = 0, miss = 0, resp = 0
            for (const mu of (day.data || [])) {
                for (const entry of (mu.usage || [])) {
                    const val = Math.round(parseFloat(entry.amount) || 0)
                    if (entry.type === 'PROMPT_CACHE_HIT_TOKEN') hit += val
                    else if (entry.type === 'PROMPT_CACHE_MISS_TOKEN') miss += val
                    else if (entry.type === 'RESPONSE_TOKEN') resp += val
                }
            }
            const total = hit + miss + resp
            days.push({
                date: day.date,
                cacheHitTokens: hit,
                cacheMissTokens: miss,
                responseTokens: resp,
                totalTokens: total,
                totalCost: costByDate[day.date] || 0
            })
        }
    }

    // Month total cost
    let monthCost = 0
    if (costBizData) {
        monthCost = (costBizData.total || []).reduce((sum, m) => {
            return sum + (m.usage || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
        }, 0)
    }

    return { days, monthCost, costByModelByDate }
}

// ── 通过平台 API 获取仪表盘用量数据 (Session Token 回退) ──

async function fetchPlatformDashboardUsage(sessionToken) {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
    const headers = {
        Authorization: `Bearer ${sessionToken}`,
        'x-app-version': '1.0.0',
        Accept: '*/*',
        Referer: 'https://platform.deepseek.com/usage',
        Origin: 'https://platform.deepseek.com',
        'User-Agent': ua
    }

    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    async function fetchMonth(m, y) {
        const amountUrl = `${DEEPSEEK_PLATFORM}/api/v0/usage/amount?month=${m}&year=${y}`
        const costUrl = `${DEEPSEEK_PLATFORM}/api/v0/usage/cost?month=${m}&year=${y}`

        const [amountResp, costResp] = await Promise.all([
            fetch(amountUrl, { headers }).then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))),
            fetch(costUrl, { headers }).then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
        ])

        const amountBizDataRaw = amountResp?.data?.biz_data
        const amountBizData = Array.isArray(amountBizDataRaw) ? amountBizDataRaw[0] : amountBizDataRaw
        if (!amountBizData || !amountBizData.days) return null

        const costBizDataRaw = costResp?.data?.biz_data
        const costBizData = Array.isArray(costBizDataRaw) ? costBizDataRaw[0] : costBizDataRaw

        // Cost by date map + per-model per-date cost map
        const costByDate = {}
        const costByModelByDate = {}
        if (costBizData && costBizData.days) {
            for (const day of costBizData.days) {
                costByDate[day.date] = (day.data || []).reduce((sum, m) => {
                    return sum + (m.usage || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
                }, 0)
                // Per-model cost breakdown
                const modelCosts = {}
                for (const mu of (day.data || [])) {
                    const modelCost = (mu.usage || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
                    if (modelCost > 0) modelCosts[mu.model] = modelCost
                }
                costByModelByDate[day.date] = modelCosts
            }
        }

        return { days: amountBizData.days, costByDate, costByModelByDate }
    }

    // Fetch current month; if 30-day window crosses boundary, also fetch previous month
    let monthlyData = await fetchMonth(month, year)
    if (!monthlyData) return null

    const { days: allDays, costByDate, costByModelByDate } = monthlyData

    // Filter out future dates (platform API returns all days of the month)
    const todayStr = now.toISOString().split('T')[0]
    const filteredDays = allDays.filter(d => d.date <= todayStr)

    // Build daily history & per-model totals
    const dailyCosts = []
    const modelTotals = new Map()

    for (const day of filteredDays) {
        let dayInput = 0, dayOutput = 0

        for (const mu of (day.data || [])) {
            const model = mu.model || 'unknown'
            let inputTokens = 0, outputTokens = 0
            for (const entry of (mu.usage || [])) {
                const val = Math.round(parseFloat(entry.amount) || 0)
                if (entry.type === 'PROMPT_TOKEN' || entry.type === 'PROMPT_CACHE_MISS_TOKEN' || entry.type === 'PROMPT_CACHE_HIT_TOKEN') {
                    inputTokens += val; dayInput += val
                } else if (entry.type === 'RESPONSE_TOKEN') {
                    outputTokens += val; dayOutput += val
                }
            }
            const existing = modelTotals.get(model) || { model, input_tokens: 0, output_tokens: 0, cost: 0 }
            existing.input_tokens += inputTokens
            existing.output_tokens += outputTokens
            modelTotals.set(model, existing)
        }

        const dayCost = costByDate[day.date] || 0
        const modelCostsForDay = costByModelByDate[day.date] || {}
        // Use actual per-model cost from cost API when available,
        // fall back to token-proportion allocation
        const dayTotal = dayInput + dayOutput
        for (const mu of (day.data || [])) {
            const model = mu.model || 'unknown'
            const existing = modelTotals.get(model)
            if (existing) {
                const actualCost = modelCostsForDay[model]
                if (actualCost != null) {
                    existing.cost += actualCost
                } else if (dayTotal > 0) {
                    let modelTokens = 0
                    for (const entry of (mu.usage || [])) {
                        modelTokens += Math.round(parseFloat(entry.amount) || 0)
                    }
                    existing.cost += dayCost * (modelTokens / dayTotal)
                }
            }
        }

        dailyCosts.push({
            date: day.date,
            cost: dayCost,
            input_tokens: dayInput,
            output_tokens: dayOutput,
            model: ''
        })
    }

    const usage = Array.from(modelTotals.values()).map(m => ({
        ...m,
        cost: Math.round(m.cost * 10000) / 10000,
        percentage: 0
    }))
    const totalCost = usage.reduce((s, m) => s + m.cost, 0)
    if (totalCost > 0) {
        usage.forEach(m => { m.percentage = Math.round(m.cost / totalCost * 10000) / 100 })
    }

    return { total_usage: totalCost, daily_costs: dailyCosts, usage }
}

// ── 获取模型历史 ──

async function fetchModelHistory(apiKey, sessionToken, modelName) {
    const now = new Date()
    const endDate = now.toISOString().split('T')[0]
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    let usageData = await fetchUsage(apiKey, sessionToken, startDate, endDate)

    // Fallback: try platform API if api.deepseek.com endpoints fail
    if (!usageData && sessionToken) {
        try { usageData = await fetchPlatformDashboardUsage(sessionToken) } catch { /* optional */ }
    }

    // Try platform API for per-model daily breakdown
    let platformDaily = []
    if (sessionToken) {
        try {
            const month = now.getMonth() + 1
            const year = now.getFullYear()

            // Fetch cache data for cost allocation (with month boundary)
            let cacheDays = []
            let modelCostMap = {}  // date → modelName → cost (from cost API)
            const currentCache = await fetchPlatformCacheUsage(sessionToken, month, year)
            cacheDays = [...(currentCache.days || [])]
            if (currentCache.costByModelByDate) {
                Object.assign(modelCostMap, currentCache.costByModelByDate)
            }
            const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
            if (sevenDaysAgo.getMonth() !== now.getMonth()) {
                try {
                    const prevMonth = sevenDaysAgo.getMonth() + 1
                    const prevYear = sevenDaysAgo.getFullYear()
                    const prevCache = await fetchPlatformCacheUsage(sessionToken, prevMonth, prevYear)
                    cacheDays = [...(prevCache.days || []), ...cacheDays]
                    if (prevCache.costByModelByDate) {
                        Object.assign(modelCostMap, prevCache.costByModelByDate)
                    }
                } catch { /* optional */ }
            }

            // Fetch amount API for per-model daily tokens (with month boundary)
            const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            const headers = {
                Authorization: `Bearer ${sessionToken}`,
                'x-app-version': '1.0.0',
                Accept: '*/*',
                Referer: 'https://platform.deepseek.com/usage',
                Origin: 'https://platform.deepseek.com',
                'User-Agent': ua
            }

            async function fetchMonthAmount(m, y) {
                const url = `${DEEPSEEK_PLATFORM}/api/v0/usage/amount?month=${m}&year=${y}`
                const resp = await (await fetch(url, { headers })).json()
                const raw = resp?.data?.biz_data
                return Array.isArray(raw) ? raw[0] : raw
            }

            let allBizDays = []
            const currentBiz = await fetchMonthAmount(month, year)
            if (currentBiz && currentBiz.days) allBizDays = [...currentBiz.days]

            if (sevenDaysAgo.getMonth() !== now.getMonth()) {
                try {
                    const prevMonth = sevenDaysAgo.getMonth() + 1
                    const prevYear = sevenDaysAgo.getFullYear()
                    const prevBiz = await fetchMonthAmount(prevMonth, prevYear)
                    if (prevBiz && prevBiz.days) {
                        allBizDays = [...prevBiz.days, ...allBizDays]
                    }
                } catch { /* optional */ }
            }

            // Filter out future dates (platform API returns all days of the month)
            const todayStr = now.toISOString().split('T')[0]
            allBizDays = allBizDays.filter(d => d.date <= todayStr)

            // Extract model-specific daily data
            for (const day of allBizDays) {
                for (const mu of (day.data || [])) {
                    if (mu.model === modelName) {
                        let inputTokens = 0, outputTokens = 0
                        for (const entry of (mu.usage || [])) {
                            const val = Math.round(parseFloat(entry.amount) || 0)
                            if (entry.type === 'PROMPT_TOKEN' || entry.type === 'PROMPT_CACHE_MISS_TOKEN' || entry.type === 'PROMPT_CACHE_HIT_TOKEN') {
                                inputTokens += val
                            } else if (entry.type === 'RESPONSE_TOKEN') {
                                outputTokens += val
                            }
                        }
                        const cacheDay = cacheDays.find(d => d.date === day.date)
                        const dayTotalTokens = cacheDay?.totalTokens || 0
                        const dayTotalCost = cacheDay?.totalCost || 0
                        const modelTokens = inputTokens + outputTokens
                        // Use actual per-model cost from cost API when available,
                        // fall back to token-proportion estimation
                        const actualModelCost = modelCostMap[day.date]?.[modelName]
                        platformDaily.push({
                            date: day.date,
                            input_tokens: inputTokens,
                            output_tokens: outputTokens,
                            cost: actualModelCost ?? (dayTotalCost > 0 && dayTotalTokens > 0
                                ? dayTotalCost * modelTokens / dayTotalTokens
                                : 0)
                        })
                    }
                }
            }
        } catch { /* platform API optional */ }
    }

    // Aggregate from usage data (may come from api.deepseek.com or platform fallback)
    let totalInput = 0, totalOutput = 0, totalCost = 0
    const dailyMap = new Map()

    if (usageData?.daily_costs) {
        for (const d of usageData.daily_costs) {
            if (!d.model || d.model === modelName) {
                const key = d.date
                const existing = dailyMap.get(key) || { date: key, input_tokens: 0, output_tokens: 0, cost: 0 }
                existing.input_tokens += (typeof d.input_tokens === 'string' ? parseInt(d.input_tokens) || 0 : d.input_tokens || 0)
                existing.output_tokens += (typeof d.output_tokens === 'string' ? parseInt(d.output_tokens) || 0 : d.output_tokens || 0)
                existing.cost += (typeof d.cost === 'string' ? parseFloat(d.cost) || 0 : d.cost || 0)
                dailyMap.set(key, existing)
            }
        }
    }

    if (usageData?.usage) {
        for (const u of usageData.usage) {
            if (u.model === modelName) {
                const input = typeof u.input_tokens === 'string' ? parseInt(u.input_tokens) || 0 : u.input_tokens || 0
                const output = typeof u.output_tokens === 'string' ? parseInt(u.output_tokens) || 0 : u.output_tokens || 0
                const cost = typeof u.cost === 'string' ? parseFloat(u.cost) || 0 : u.cost || 0
                totalInput += input
                totalOutput += output
                totalCost += cost
                if (u.date) {
                    const key = u.date
                    const existing = dailyMap.get(key) || { date: key, input_tokens: 0, output_tokens: 0, cost: 0 }
                    existing.input_tokens += input
                    existing.output_tokens += output
                    existing.cost += cost
                    dailyMap.set(key, existing)
                }
            }
        }
    }

    const dailyHistory = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

    // Use dailyHistory when it has model-specific cost data from the billing API (accurate);
    // fall back to platformDaily (estimated by token-proportion) only when the billing API
    // didn't provide per-model breakdown
    const hasModelCost = usageData?.daily_costs?.some(d => d.model === modelName)
    const dailyHistoryData = hasModelCost ? dailyHistory : (platformDaily.length > 0 ? platformDaily : dailyHistory)

    // Derive summary totals from the same daily_history data
    // to keep the three cards consistent with the chart
    const totalFromDaily = dailyHistoryData.reduce((s, d) => ({
        cost: s.cost + (d.cost || 0),
        input: s.input + (d.input_tokens || 0),
        output: s.output + (d.output_tokens || 0)
    }), { cost: 0, input: 0, output: 0 })

    return {
        model: modelName,
        total_cost: totalFromDaily.cost,
        total_input_tokens: totalFromDaily.input,
        total_output_tokens: totalFromDaily.output,
        daily_history: dailyHistoryData
    }
}

// ── 获取仪表盘数据 ──

async function fetchDashboardData(apiKey, sessionToken) {
    const [balanceResult, usageResult] = await Promise.allSettled([
        fetchBalance(apiKey),
        (async () => {
            const now = new Date()
            const endDate = now.toISOString().split('T')[0]
            const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
            let usage = await fetchUsage(apiKey, sessionToken, startDate, endDate)

            // Fallback: try platform API with session token if api.deepseek.com endpoints fail
            if (!usage && sessionToken) {
                try { usage = await fetchPlatformDashboardUsage(sessionToken) } catch { /* optional */ }
            }

            return usage
        })()
    ])

    // Parse balance
    let balance = '0', grantedBalance = '0', toppedUpBalance = '0', currency = 'CNY', isAvailable = false
    if (balanceResult.status === 'fulfilled' && balanceResult.value) {
        const balData = balanceResult.value
        const info = balData.balance_infos?.[0]
        if (info) {
            balance = info.total_balance || '0'
            grantedBalance = info.granted_balance || '0'
            toppedUpBalance = info.topped_up_balance || '0'
            currency = info.currency || 'CNY'
        }
        isAvailable = balData.is_available !== false
    }

    // Parse usage
    let usageAvailable = false
    let todayUsage = { total_cost: 0, input_tokens: 0, output_tokens: 0 }
    let dailyHistory = []
    let modelBreakdown = []

    if (usageResult.status === 'fulfilled' && usageResult.value) {
        usageAvailable = true
        const usageData = usageResult.value

        // Daily history
        if (usageData.daily_costs) {
            dailyHistory = usageData.daily_costs.map(d => ({
                date: d.date,
                cost: typeof d.cost === 'string' ? parseFloat(d.cost) || 0 : d.cost || 0,
                input_tokens: typeof d.input_tokens === 'string' ? parseInt(d.input_tokens) || 0 : d.input_tokens || 0,
                output_tokens: typeof d.output_tokens === 'string' ? parseInt(d.output_tokens) || 0 : d.output_tokens || 0,
                model: d.model || ''
            }))
        }

        // Model breakdown
        if (usageData.usage) {
            modelBreakdown = usageData.usage.map(u => ({
                model: u.model,
                input_tokens: typeof u.input_tokens === 'string' ? parseInt(u.input_tokens) || 0 : u.input_tokens || 0,
                output_tokens: typeof u.output_tokens === 'string' ? parseInt(u.output_tokens) || 0 : u.output_tokens || 0,
                cost: typeof u.cost === 'string' ? parseFloat(u.cost) || 0 : u.cost || 0,
                percentage: 0
            }))
            const totalCost = modelBreakdown.reduce((s, m) => s + m.cost, 0)
            if (totalCost > 0) {
                modelBreakdown.forEach(m => { m.percentage = Math.round(m.cost / totalCost * 10000) / 100 })
            }
        }

        // Fallback: derive model breakdown from dailyHistory if usage is not available
        if (!modelBreakdown.length && dailyHistory.length > 0) {
            const modelMap = new Map()
            for (const d of dailyHistory) {
                if (!d.model) continue
                const existing = modelMap.get(d.model) || { model: d.model, input_tokens: 0, output_tokens: 0, cost: 0 }
                existing.input_tokens += d.input_tokens
                existing.output_tokens += d.output_tokens
                existing.cost += d.cost
                modelMap.set(d.model, existing)
            }
            if (modelMap.size > 0) {
                modelBreakdown = Array.from(modelMap.values())
                const totalCost = modelBreakdown.reduce((s, m) => s + m.cost, 0)
                if (totalCost > 0) {
                    modelBreakdown.forEach(m => { m.percentage = Math.round(m.cost / totalCost * 10000) / 100 })
                }
            }
        }

        // Today's usage
        if (usageData.total_usage != null) {
            todayUsage.total_cost = typeof usageData.total_usage === 'string' ? parseFloat(usageData.total_usage) || 0 : usageData.total_usage || 0
        }
        const today = new Date().toISOString().split('T')[0]
        const todayData = dailyHistory.find(d => d.date === today)
        if (todayData) {
            todayUsage = {
                total_cost: todayData.cost || 0,
                input_tokens: todayData.input_tokens || 0,
                output_tokens: todayData.output_tokens || 0
            }
        }
    }

    return {
        balance,
        granted_balance: grantedBalance,
        topped_up_balance: toppedUpBalance,
        currency,
        is_available: isAvailable,
        usage_available: usageAvailable,
        today_usage: todayUsage,
        daily_history: dailyHistory,
        model_breakdown: modelBreakdown
    }
}

// ── 诊断 API ──

async function diagnoseAPI(apiKey, sessionToken) {
    const results = []

    // Test balance
    try {
        const resp = await apiFetch(`${DEEPSEEK_BASE}/user/balance`, {
            headers: { Authorization: `Bearer ${apiKey}` }
        })
        const body = await resp.text().catch(() => '')
        results.push({
            endpoint: '/user/balance',
            status: resp.status,
            preview: body.substring(0, 500)
        })
    } catch (e) {
        results.push({ endpoint: '/user/balance', error: e.message })
    }

    // Test usage URLs
    const now = new Date()
    const endDate = now.toISOString().split('T')[0]
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const urls = usageUrls(startDate, endDate)

    for (const url of urls) {
        const useSession = url.includes('platform.deepseek.com')
        const bearerToken = useSession && sessionToken ? sessionToken : apiKey
        const headers = {
            Authorization: `Bearer ${bearerToken}`,
            Accept: 'application/json',
            'X-App-Version': '1.0.0'
        }
        if (useSession) {
            headers['Referer'] = 'https://platform.deepseek.com/usage'
            headers['Origin'] = 'https://platform.deepseek.com'
        }
        try {
            const resp = await apiFetch(url, { headers })
            const body = await resp.text().catch(() => '')
            const endpoint = url.split('?')[0].replace(DEEPSEEK_BASE, '')
            const entry = {
                endpoint,
                url,
                status: resp.status,
                preview: body.substring(0, 300)
            }
            if (url.includes('platform.deepseek.com') && resp.ok) {
                const parsed = parseUsageResponse(body)
                entry.parsed = !!parsed
                try {
                    const probe = JSON.parse(body)
                    entry.debug_code = probe.code
                    entry.debug_has_biz_data = !!probe.data?.biz_data
                    entry.debug_total_count = probe.data?.biz_data?.total?.length
                } catch { }
                if (parsed) {
                    entry.parsed_total_usage = parsed.total_usage
                    entry.parsed_models = parsed.usage?.map(u => u.model)
                }
            }
            results.push(entry)
        } catch (e) {
            const endpoint = url.split('?')[0].replace(DEEPSEEK_BASE, '')
            results.push({ endpoint, url, error: e.message })
        }
    }

    return results
}

export {
    fetchBalance,
    fetchUsage,
    fetchPlatformCacheUsage,
    fetchPlatformDashboardUsage,
    fetchModelHistory,
    fetchDashboardData,
    diagnoseAPI
}
