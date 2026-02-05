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
}

interface UserStat {
    userId: string;
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

const AIUsageStats = () => {
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [userStats, setUserStats] = useState<UserStat[]>([]);
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [prices, setPrices] = useState({ input: 0, output: 0 });
    const [totals, setTotals] = useState({ cost: 0, tokens: 0, requests: 0 });

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const settings = await fetchAISettings();
                const priceInput = Number(settings.priceInputPerM) || 0;
                const priceOutput = Number(settings.priceOutputPerM) || 0;
                setPrices({ input: priceInput, output: priceOutput });

                const { data: logsData, error } = await supabase
                    .from('ai_usage_logs')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(500);

                if (error) throw error;
                const fetchedLogs = (logsData || []) as UsageLog[];
                setLogs(fetchedLogs);
                processStats(fetchedLogs, priceInput, priceOutput);

            } catch (err) {
                console.error('Failed to load usage stats:', err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const processStats = (data: UsageLog[], priceIn: number, priceOut: number) => {
        const userMap = new Map<string, UserStat>();
        const monthMap = new Map<string, MonthlyStat>();
        let grandTotalCost = 0;
        let grandTotalTokens = 0;

        data.forEach(log => {
            const cost = ((log.input_tokens / 1_000_000) * priceIn) +
                ((log.output_tokens / 1_000_000) * priceOut);

            grandTotalCost += cost;
            grandTotalTokens += log.total_tokens;

            // User Stats
            const userId = log.user_id || 'unknown';
            const uStat = userMap.get(userId) || { userId, totalRequests: 0, totalTokens: 0, totalCost: 0 };
            uStat.totalRequests++;
            uStat.totalTokens += log.total_tokens;
            uStat.totalCost += cost;
            userMap.set(userId, uStat);

            // Monthly Stats
            const date = new Date(log.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

            const mStat = monthMap.get(monthKey) || { month: monthKey, displayMonth: monthName, totalRequests: 0, totalTokens: 0, totalCost: 0 };
            mStat.totalRequests++;
            mStat.totalTokens += log.total_tokens;
            mStat.totalCost += cost;
            monthMap.set(monthKey, mStat);
        });

        setTotals({
            cost: grandTotalCost,
            tokens: grandTotalTokens,
            requests: data.length
        });
        setUserStats(Array.from(userMap.values()).sort((a, b) => b.totalTokens - a.totalTokens));
        setMonthlyStats(Array.from(monthMap.values()).sort((a, b) => b.month.localeCompare(a.month)));
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
                            {totals.tokens.toLocaleString()}
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
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                            {user.userId.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold leading-tight">{user.userId.slice(0, 8)}...</span>
                                            <span className="text-[10px] text-muted-foreground">{user.totalRequests} calls</span>
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
                                    <div key={log.id} className="flex flex-col gap-1 pb-3 border-b border-border/40 last:border-0 last:pb-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                            </span>
                                            <span className="text-[10px] font-medium text-emerald-600">
                                                ${(((log.input_tokens * prices.input) + (log.output_tokens * prices.output)) / 1_000_000).toFixed(5)}
                                            </span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <BubbleChatIcon size={12} className="mt-0.5 text-primary/60 shrink-0" />
                                            <p className="text-xs font-medium leading-tight line-clamp-2" title={log.action}>
                                                {log.action.replace('generate_article', 'Article Generation').replace(/^Article: /, '')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 border-border/60">{log.model}</Badge>
                                            <span className="text-[9px] text-muted-foreground ml-auto">
                                                {log.total_tokens.toLocaleString()} tok
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AIUsageStats;
