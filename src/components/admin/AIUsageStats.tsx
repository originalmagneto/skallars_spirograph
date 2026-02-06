"use client";


import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAISettings } from '@/lib/aiSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    AnalyticsUpIcon,
    UserIcon,
    Calendar01Icon,
    Coins01Icon,
    FlashIcon,
    CpuIcon,
    Clock01Icon,
    BubbleChatIcon
} from 'hugeicons-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';

interface UsageLog {
    id: string;
    created_at: string;
    user_id: string;
    action: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    profiles?: {
        full_name: string | null;
        avatar_url: string | null;
        email: string | null;
    } | null;
}

interface UserStat {
    userId: string;
    fullName: string;
    avatarUrl: string | null;
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
}

interface MonthlyStat {
    month: string;
    displayMonth: string;
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
}

interface ModelStat {
    model: string;
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
}

interface ActionStat {
    action: string;
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
}

interface UsageTotals {
    cost: number;
    tokens: number;
    requests: number;
    todayTokens: number;
    todayCost: number;
    monthTokens: number;
    monthCost: number;
}

interface QuotaSettings {
    dailyTokens: number;
    monthlyTokens: number;
    dailyUsd: number;
    monthlyUsd: number;
}

const AIUsageStats = () => {
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [userStats, setUserStats] = useState<UserStat[]>([]);
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
    const [modelStats, setModelStats] = useState<ModelStat[]>([]);
    const [actionStats, setActionStats] = useState<ActionStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [prices, setPrices] = useState({ input: 0, output: 0 });
    const [quotas, setQuotas] = useState<QuotaSettings>({
        dailyTokens: 0,
        monthlyTokens: 0,
        dailyUsd: 0,
        monthlyUsd: 0
    });
    const [totals, setTotals] = useState<UsageTotals>({
        cost: 0,
        tokens: 0,
        requests: 0,
        todayTokens: 0,
        todayCost: 0,
        monthTokens: 0,
        monthCost: 0
    });

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const settings = await fetchAISettings();
                const priceInput = Number(settings.priceInputPerM) || 0;
                const priceOutput = Number(settings.priceOutputPerM) || 0;
                setPrices({ input: priceInput, output: priceOutput });
                setQuotas({
                    dailyTokens: Number(settings.geminiQuotaDailyTokens) || 0,
                    monthlyTokens: Number(settings.geminiQuotaMonthlyTokens) || 0,
                    dailyUsd: Number(settings.geminiQuotaDailyUsd) || 0,
                    monthlyUsd: Number(settings.geminiQuotaMonthlyUsd) || 0,
                });

                // Fetch Logs with Profiles server-side
                const { data: logsData, error } = await supabase
                    .from('ai_usage_logs')
                    .select('*, profiles(full_name, avatar_url, email)')
                    .order('created_at', { ascending: false })
                    .limit(500);

                if (error) throw error;
                const fetchedLogs = (logsData || []) as UsageLog[];
                setLogs(fetchedLogs);
                processStats(fetchedLogs, priceInput, priceOutput);

            } catch (err) {
                console.error('Failed to load usage stats:', err);
                // Fallback or empty state could be set here
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const processStats = (data: UsageLog[], priceIn: number, priceOut: number) => {
        const userMap = new Map<string, UserStat>();
        const monthMap = new Map<string, MonthlyStat>();
        const modelMap = new Map<string, ModelStat>();
        const actionMap = new Map<string, ActionStat>();
        let grandTotalCost = 0;
        let grandTotalTokens = 0;
        const now = new Date();
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        let todayTokens = 0;
        let todayCost = 0;
        let monthTokens = 0;
        let monthCost = 0;

        data.forEach(log => {
            const cost = ((log.input_tokens / 1_000_000) * priceIn) +
                ((log.output_tokens / 1_000_000) * priceOut);
            const createdAtMs = new Date(log.created_at).getTime();

            grandTotalCost += cost;
            grandTotalTokens += log.total_tokens;
            if (createdAtMs >= monthStart) {
                monthTokens += log.total_tokens;
                monthCost += cost;
            }
            if (createdAtMs >= dayStart) {
                todayTokens += log.total_tokens;
                todayCost += cost;
            }

            // User Stats
            const userId = log.user_id || 'unknown';
            const userProfile = log.profiles;
            const uStat = userMap.get(userId) || {
                userId,
                fullName: userProfile?.full_name || userProfile?.email || 'Unknown User',
                avatarUrl: userProfile?.avatar_url || null,
                totalRequests: 0, totalTokens: 0, totalCost: 0
            };
            uStat.totalRequests++;
            uStat.totalTokens += log.total_tokens;
            uStat.totalCost += cost;
            userMap.set(userId, uStat);

            // Model stats
            const model = log.model || 'unknown';
            const mStat = modelMap.get(model) || {
                model,
                totalRequests: 0,
                totalTokens: 0,
                totalCost: 0
            };
            mStat.totalRequests++;
            mStat.totalTokens += log.total_tokens;
            mStat.totalCost += cost;
            modelMap.set(model, mStat);

            // Action stats
            const action = log.action || 'unknown';
            const aStat = actionMap.get(action) || {
                action,
                totalRequests: 0,
                totalTokens: 0,
                totalCost: 0
            };
            aStat.totalRequests++;
            aStat.totalTokens += log.total_tokens;
            aStat.totalCost += cost;
            actionMap.set(action, aStat);

            // Monthly Stats
            const date = new Date(log.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

            const monthStat = monthMap.get(monthKey) || { month: monthKey, displayMonth: monthName, totalRequests: 0, totalTokens: 0, totalCost: 0 };
            monthStat.totalRequests++;
            monthStat.totalTokens += log.total_tokens;
            monthStat.totalCost += cost;
            monthMap.set(monthKey, monthStat);
        });

        setTotals({
            cost: grandTotalCost,
            tokens: grandTotalTokens,
            requests: data.length,
            todayTokens,
            todayCost,
            monthTokens,
            monthCost,
        });
        setUserStats(Array.from(userMap.values()).sort((a, b) => b.totalTokens - a.totalTokens));
        setMonthlyStats(Array.from(monthMap.values()).sort((a, b) => b.month.localeCompare(a.month)));
        setModelStats(Array.from(modelMap.values()).sort((a, b) => b.totalTokens - a.totalTokens));
        setActionStats(Array.from(actionMap.values()).sort((a, b) => b.totalTokens - a.totalTokens));
    };

    const formatActionLabel = (value: string) => {
        if (!value) return 'Unknown';
        if (value.startsWith('Article: ')) return 'Article Generation';
        return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading analytics...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-100 shadow-sm relative overflow-hidden group">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 font-medium text-indigo-600">
                            <Coins01Icon size={16} /> Est. Cost (Total)
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold tracking-tight text-indigo-950">
                            ${totals.cost.toFixed(4)}
                        </CardTitle>
                    </CardHeader>
                    <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:opacity-20 transition-opacity">
                        <Coins01Icon size={120} />
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-100 shadow-sm relative overflow-hidden group">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 font-medium text-emerald-600">
                            <CpuIcon size={16} /> Total Tokens
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold tracking-tight text-emerald-950">
                            {(totals.tokens / 1000).toFixed(1)}k
                        </CardTitle>
                    </CardHeader>
                    <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:opacity-20 transition-opacity">
                        <CpuIcon size={120} />
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-100 shadow-sm relative overflow-hidden group">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 font-medium text-blue-600">
                            <FlashIcon size={16} /> Total Generations
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold tracking-tight text-blue-950">
                            {totals.requests}
                        </CardTitle>
                    </CardHeader>
                    <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:opacity-20 transition-opacity">
                        <FlashIcon size={120} />
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-100 shadow-sm relative overflow-hidden group">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 font-medium text-amber-600">
                            <UserIcon size={16} /> Active Users
                        </CardDescription>
                        <CardTitle className="text-3xl font-bold tracking-tight text-amber-950">
                            {userStats.length}
                        </CardTitle>
                    </CardHeader>
                    <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:opacity-20 transition-opacity">
                        <UserIcon size={120} />
                    </div>
                </Card>
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">

                {/* Main Content: Usage Trends (Months) */}
                <Card className="col-span-1 lg:col-span-2 row-span-2 shadow-sm border-border/60">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <AnalyticsUpIcon size={20} className="text-primary" />
                                    Usage Trends
                                </CardTitle>
                                <CardDescription>Monthly token consumption and costs.</CardDescription>
                            </div>
                            <div className="hidden md:flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-[10px] uppercase">Last 12 Months</Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {monthlyStats.length > 0 ? (
                                monthlyStats.map(stat => (
                                    <div key={stat.month} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="font-medium flex items-center gap-2">
                                                <Calendar01Icon size={14} className="text-muted-foreground" />
                                                {stat.displayMonth}
                                            </div>
                                            <div className="font-mono text-muted-foreground">${stat.totalCost.toFixed(3)}</div>
                                        </div>
                                        <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full"
                                                style={{ width: `${Math.min(100, (stat.totalTokens / (totals.tokens || 1)) * 100 * (monthlyStats.length))}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-muted-foreground">
                                            <span>{stat.totalRequests} reqs</span>
                                            <span className="font-mono">{stat.totalTokens.toLocaleString()} tokens</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-muted-foreground text-sm">No monthly data available yet.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Sidebar Top: Top Users */}
                <Card className="col-span-1 shadow-sm border-border/60">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <UserIcon size={14} /> Top Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-4">
                            {userStats.slice(0, 3).map(user => (
                                <div key={user.userId} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-2.5">
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt={user.fullName} className="h-8 w-8 rounded-full object-cover ring-1 ring-border" />
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                                {user.fullName.slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold leading-tight">{user.fullName}</span>
                                            <span className="text-[10px] text-muted-foreground">{user.totalRequests} articles</span>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="font-mono text-[10px] bg-muted/50 group-hover:bg-primary/5 transition-colors">
                                        {(user.totalTokens / 1000).toFixed(1)}k
                                    </Badge>
                                </div>
                            ))}
                            {userStats.length === 0 && <div className="text-xs text-muted-foreground">No users active.</div>}
                        </div>
                    </CardContent>
                </Card>

                {/* Sidebar Bottom: Recent Activity Log */}
                <Card className="col-span-1 shadow-sm border-border/60 flex flex-col overflow-hidden">
                    <CardHeader className="pb-3 bg-muted/20 border-b">
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Clock01Icon size={14} /> Live Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 relative min-h-[200px]">
                        <ScrollArea className="h-full absolute inset-0">
                            <div className="p-4 space-y-4">
                                {logs.slice(0, 10).map((log) => (
                                    <div key={log.id} className="flex flex-col gap-2 pb-3 border-b border-border/40 last:border-0 last:pb-0 group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {log.profiles?.avatar_url ? (
                                                    <img src={log.profiles.avatar_url} className="w-4 h-4 rounded-full" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px]">{log.profiles?.full_name?.slice(0, 1) || '?'}</div>
                                                )}
                                                <span className="text-[10px] text-muted-foreground font-medium">
                                                    {log.profiles?.full_name || 'Unknown'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-mono text-muted-foreground">
                                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                            </span>
                                        </div>

                                        <div className="flex items-start gap-2">
                                            <BubbleChatIcon size={12} className="mt-0.5 text-primary/60 shrink-0" />
                                            <p className="text-xs font-medium leading-tight line-clamp-2 text-slate-800" title={log.action}>
                                                {log.action.replace('generate_article', 'Article Generation').replace(/^Article: /, '')}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-50">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 border-border/60 text-slate-500">{log.model}</Badge>
                                            </div>
                                            <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400">
                                                <span className="text-indigo-600 font-semibold">{log.total_tokens.toLocaleString()}</span> tok
                                                <span className="text-slate-300">(${(((log.input_tokens * prices.input) + (log.output_tokens * prices.output)) / 1_000_000).toFixed(4)})</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Rollups + Quotas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="shadow-sm border-border/60">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <CpuIcon size={14} /> By Model
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                        {modelStats.slice(0, 6).map((model) => (
                            <div key={model.model} className="flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-xs font-medium truncate" title={model.model}>{model.model}</p>
                                    <p className="text-[10px] text-muted-foreground">{model.totalRequests} requests</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-mono">{(model.totalTokens / 1000).toFixed(1)}k</p>
                                    <p className="text-[10px] text-muted-foreground">${model.totalCost.toFixed(3)}</p>
                                </div>
                            </div>
                        ))}
                        {modelStats.length === 0 && <p className="text-xs text-muted-foreground">No model usage yet.</p>}
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-border/60">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <BubbleChatIcon size={14} /> By Action
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                        {actionStats.slice(0, 6).map((action) => (
                            <div key={action.action} className="flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-xs font-medium truncate" title={action.action}>{formatActionLabel(action.action)}</p>
                                    <p className="text-[10px] text-muted-foreground">{action.totalRequests} requests</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-mono">{(action.totalTokens / 1000).toFixed(1)}k</p>
                                    <p className="text-[10px] text-muted-foreground">${action.totalCost.toFixed(3)}</p>
                                </div>
                            </div>
                        ))}
                        {actionStats.length === 0 && <p className="text-xs text-muted-foreground">No action usage yet.</p>}
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-border/60">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <FlashIcon size={14} /> Quota Overview
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Current usage vs configured limits.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-4">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span>Today Tokens</span>
                                <span className="font-mono">
                                    {totals.todayTokens.toLocaleString()} / {quotas.dailyTokens > 0 ? quotas.dailyTokens.toLocaleString() : 'off'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span>Month Tokens</span>
                                <span className="font-mono">
                                    {totals.monthTokens.toLocaleString()} / {quotas.monthlyTokens > 0 ? quotas.monthlyTokens.toLocaleString() : 'off'}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span>Today USD</span>
                                <span className="font-mono">
                                    ${totals.todayCost.toFixed(4)} / {quotas.dailyUsd > 0 ? `$${quotas.dailyUsd.toFixed(2)}` : 'off'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span>Month USD</span>
                                <span className="font-mono">
                                    ${totals.monthCost.toFixed(4)} / {quotas.monthlyUsd > 0 ? `$${quotas.monthlyUsd.toFixed(2)}` : 'off'}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AIUsageStats;
