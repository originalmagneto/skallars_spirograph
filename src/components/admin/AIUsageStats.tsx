"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Coins, Users, BarChart } from "lucide-react";
import { format } from 'date-fns';

export default function AIUsageStats() {
    // Fetch aggregated stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['ai-usage-stats'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ai_usage_logs')
                .select('total_tokens, input_tokens, output_tokens, action');

            if (error) throw error;

            const totalTokens = data.reduce((acc, log) => acc + (log.total_tokens || 0), 0);
            const totalInput = data.reduce((acc, log) => acc + (log.input_tokens || 0), 0);
            const totalOutput = data.reduce((acc, log) => acc + (log.output_tokens || 0), 0);
            const totalGenerations = data.length;

            return { totalTokens, totalInput, totalOutput, totalGenerations };
        }
    });

    // Fetch detailed logs
    const { data: logs, isLoading: logsLoading } = useQuery({
        queryKey: ['ai-usage-logs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ai_usage_logs')
                .select(`
                    *,
                    user:user_id (email)
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data;
        }
    });

    if (statsLoading || logsLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-[#210059] to-[#3a0099] text-white border-none shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-white/80">Total Tokens Used</CardTitle>
                        <Coins className="h-4 w-4 text-white/60" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats?.totalTokens.toLocaleString()}</div>
                        <p className="text-xs text-white/60 mt-1">
                            Input: {stats?.totalInput.toLocaleString()} | Output: {stats?.totalOutput.toLocaleString()}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Generations</CardTitle>
                        <BarChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-[#210059]">{stats?.totalGenerations}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Articles & Images
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Cost</CardTitle>
                        <Coins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-[#210059]">
                            ${((stats?.totalInput || 0) / 1000000 * 0.15 + (stats?.totalOutput || 0) / 1000000 * 0.60).toFixed(4)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Based on Gemini 1.5 Pro pricing
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Logs */}
            <Card className="shadow-md border-muted">
                <CardHeader>
                    <CardTitle className="text-xl text-[#210059]">Detailed Usage Records</CardTitle>
                    <CardDescription>Recent AI generation activity by users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Model</TableHead>
                                <TableHead className="text-right">Input</TableHead>
                                <TableHead className="text-right">Output</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs?.map((log: any) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium text-xs">
                                        {format(new Date(log.created_at), 'MMM d, HH:mm')}
                                    </TableCell>
                                    <TableCell>{log.user?.email || 'Unknown User'}</TableCell>
                                    <TableCell className="capitalize">{log.action.replace('_', ' ')}</TableCell>
                                    <TableCell className="text-xs font-mono text-muted-foreground">{log.model}</TableCell>
                                    <TableCell className="text-right font-mono text-xs">{log.input_tokens}</TableCell>
                                    <TableCell className="text-right font-mono text-xs">{log.output_tokens}</TableCell>
                                    <TableCell className="text-right font-mono font-bold">{log.total_tokens}</TableCell>
                                </TableRow>
                            ))}
                            {(!logs || logs.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No usage records found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
