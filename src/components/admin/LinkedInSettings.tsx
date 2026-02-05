"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, RefreshCw, XCircle } from "lucide-react";

type LinkedInStatus = {
    connected: boolean;
    member_name?: string | null;
    member_urn?: string | null;
    expires_at?: string | null;
    expired?: boolean;
    scopes?: string[];
    organization_urns?: string[];
    updated_at?: string | null;
};

type LinkedInOrg = { urn: string; name: string };

type LinkedInLog = {
    id: string;
    status: string;
    share_target: string | null;
    visibility: string | null;
    share_url: string | null;
    error_message: string | null;
    created_at: string;
};

type LinkedInAnalyticsStats = {
    impressionCount?: number;
    likeCount?: number;
    commentCount?: number;
    shareCount?: number;
    clickCount?: number;
    engagement?: number;
    uniqueImpressionsCounts?: number;
};

type LinkedInAnalyticsEntry = {
    log_id: string;
    urn: string | null;
    metrics: LinkedInAnalyticsStats | null;
    source: "organization" | "member" | "unknown";
};

type LinkedInScheduled = {
    id: string;
    status: string;
    share_target: string | null;
    share_mode?: string | null;
    visibility: string | null;
    scheduled_at: string;
    error_message: string | null;
    created_at: string;
};

const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString();
};

export default function LinkedInSettings() {
    const { session } = useAuth();
    const [status, setStatus] = useState<LinkedInStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [defaultOrgUrn, setDefaultOrgUrn] = useState("");
    const [orgsLoading, setOrgsLoading] = useState(false);
    const [organizations, setOrganizations] = useState<LinkedInOrg[]>([]);
    const [savingDefaults, setSavingDefaults] = useState(false);
    const [logs, setLogs] = useState<LinkedInLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [scheduled, setScheduled] = useState<LinkedInScheduled[]>([]);
    const [scheduledLoading, setScheduledLoading] = useState(false);
    const [analytics, setAnalytics] = useState<LinkedInAnalyticsEntry[]>([]);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsNote, setAnalyticsNote] = useState<string | null>(null);
    const [analyticsOrgUrn, setAnalyticsOrgUrn] = useState<string | null>(null);
    const [memberAnalyticsEnabled, setMemberAnalyticsEnabled] = useState(false);

    const organizationOptions = useMemo(() => {
        const map = new Map<string, LinkedInOrg>();
        organizations.forEach((org) => map.set(org.urn, org));
        if (defaultOrgUrn && !map.has(defaultOrgUrn)) {
            map.set(defaultOrgUrn, { urn: defaultOrgUrn, name: "Default Organization" });
        }
        return Array.from(map.values());
    }, [organizations, defaultOrgUrn]);

    const analyticsByLogId = useMemo(() => {
        const map = new Map<string, LinkedInAnalyticsEntry>();
        analytics.forEach((entry) => {
            map.set(entry.log_id, entry);
        });
        return map;
    }, [analytics]);

    useEffect(() => {
        const loadDefaults = async () => {
            const { data, error } = await supabase
                .from("settings")
                .select("key, value")
                .eq("key", "linkedin_default_org_urn");
            if (error) return;
            const value = data?.[0]?.value || "";
            setDefaultOrgUrn(value);
        };
        loadDefaults();
    }, []);

    useEffect(() => {
        if (!session?.access_token) return;
        loadStatus();
    }, [session?.access_token]);

    useEffect(() => {
        if (!session?.access_token) return;
        if (!status?.connected) {
            setLogs([]);
            setScheduled([]);
            setAnalytics([]);
            setAnalyticsOrgUrn(null);
            setAnalyticsNote("Connect LinkedIn to load analytics.");
            return;
        }
        loadLogs();
        loadScheduled();
        loadAnalytics();
    }, [session?.access_token, status?.connected]);

    const loadStatus = async () => {
        if (!session?.access_token) return;
        setStatusLoading(true);
        try {
            const res = await fetch("/api/linkedin/status", {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await res.json();
            if (res.ok) {
                setStatus(data);
                return;
            } else {
                setStatus({ connected: false });
                return;
            }
        } catch {
            setStatus({ connected: false });
            return;
        } finally {
            setStatusLoading(false);
        }
    };

    const loadOrganizations = async () => {
        if (!session?.access_token) {
            toast.error("Missing session. Please sign in again.");
            return;
        }
        setOrgsLoading(true);
        try {
            const res = await fetch("/api/linkedin/organizations", {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await res.json();
            if (Array.isArray(data.organizations)) {
                setOrganizations(data.organizations);
                if (!defaultOrgUrn && data.organizations.length === 1) {
                    setDefaultOrgUrn(data.organizations[0].urn);
                }
            }
            if (!res.ok && data?.error && (!Array.isArray(data.organizations) || data.organizations.length === 0)) {
                toast.error(data.error);
            }
        } catch {
            toast.error("Failed to load LinkedIn organizations.");
        } finally {
            setOrgsLoading(false);
        }
    };

    const loadLogs = async () => {
        if (!session?.access_token) return;
        setLogsLoading(true);
        try {
            const res = await fetch("/api/linkedin/logs", {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await res.json();
            if (res.ok && Array.isArray(data.logs)) {
                setLogs(data.logs);
            }
        } catch {
            // ignore
        } finally {
            setLogsLoading(false);
        }
    };

    const loadScheduled = async () => {
        if (!session?.access_token) return;
        setScheduledLoading(true);
        try {
            const res = await fetch("/api/linkedin/scheduled", {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await res.json();
            if (res.ok && Array.isArray(data.scheduled)) {
                setScheduled(data.scheduled);
            }
        } catch {
            // ignore
        } finally {
            setScheduledLoading(false);
        }
    };

    const loadAnalytics = async () => {
        if (!session?.access_token) return;
        if (!status?.connected) return;
        setAnalyticsLoading(true);
        try {
            const res = await fetch("/api/linkedin/analytics", {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await res.json();
            if (res.ok && Array.isArray(data.analytics)) {
                setAnalytics(data.analytics);
                setAnalyticsNote(data.note || null);
                setAnalyticsOrgUrn(data.org_urn || null);
                setMemberAnalyticsEnabled(Boolean(data.memberAnalyticsEnabled));
            } else if (data?.error) {
                setAnalyticsNote(data.error);
            }
        } catch {
            setAnalyticsNote("Failed to load LinkedIn analytics.");
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const handleConnect = async () => {
        if (!session?.access_token) {
            toast.error("Missing session. Please sign in again.");
            return;
        }
        try {
            const res = await fetch("/api/linkedin/auth", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ redirectTo: "/admin?tab=settings" }),
            });
            const data = await res.json();
            if (!res.ok || !data?.url) {
                throw new Error(data?.error || "Failed to start LinkedIn connection.");
            }
            window.location.href = data.url;
        } catch (error: any) {
            toast.error(error?.message || "Failed to connect LinkedIn.");
        }
    };

    const handleDisconnect = async () => {
        if (!session?.access_token) return;
        try {
            await fetch("/api/linkedin/disconnect", {
                method: "POST",
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            setStatus({ connected: false });
            setOrganizations([]);
            toast.success("LinkedIn disconnected.");
        } catch {
            toast.error("Failed to disconnect LinkedIn.");
        }
    };

    const handleSaveDefaults = async () => {
        setSavingDefaults(true);
        try {
            const trimmed = defaultOrgUrn.trim();
            if (trimmed && !trimmed.startsWith("urn:li:organization:")) {
                toast.error("Organization URN must start with urn:li:organization:");
                return;
            }
            const payload = { key: "linkedin_default_org_urn", value: trimmed };
            const { error } = await supabase.from("settings").upsert(payload, { onConflict: "key" });
            if (error) throw error;
            toast.success("LinkedIn defaults saved.");
        } catch (error: any) {
            toast.error(error?.message || "Failed to save LinkedIn settings.");
        } finally {
            setSavingDefaults(false);
        }
    };

    const connected = status?.connected;
    const scopeBadges = status?.scopes || [];

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>LinkedIn Settings</CardTitle>
                <CardDescription>
                    Connect LinkedIn accounts, set default company URN, and review share activity.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="rounded-lg border bg-muted/10 p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                            <div className="text-sm font-semibold">Connection</div>
                            {statusLoading ? (
                                <p className="text-xs text-muted-foreground">Checking LinkedIn status…</p>
                            ) : connected ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    Connected as {status?.member_name || "LinkedIn Member"}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    Not connected
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={loadStatus}>
                                Refresh
                            </Button>
                            {connected ? (
                                <Button type="button" variant="destructive" size="sm" onClick={handleDisconnect}>
                                    Disconnect
                                </Button>
                            ) : (
                                <Button type="button" size="sm" onClick={handleConnect}>
                                    Connect LinkedIn
                                </Button>
                            )}
                        </div>
                    </div>

                    {connected && (
                        <div className="flex flex-wrap gap-2">
                            {scopeBadges.length === 0 && (
                                <Badge variant="outline">No scopes detected</Badge>
                            )}
                            {scopeBadges.map((scope) => (
                                <Badge key={scope} variant="secondary">
                                    {scope}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-lg border bg-white p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold">Default Organization</div>
                            <p className="text-xs text-muted-foreground">
                                Used for company shares when no organization is selected in Article Studio.
                            </p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={loadOrganizations} disabled={!connected || orgsLoading}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            {orgsLoading ? "Refreshing…" : "Load organizations"}
                        </Button>
                    </div>

                    {organizationOptions.length > 0 && (
                        <div className="space-y-2">
                            <Label>Organization list</Label>
                            <Select value={defaultOrgUrn || undefined} onValueChange={setDefaultOrgUrn}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select organization" />
                                </SelectTrigger>
                                <SelectContent>
                                    {organizationOptions.map((org) => (
                                        <SelectItem key={org.urn} value={org.urn}>
                                            {org.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Organization URN</Label>
                        <Input
                            value={defaultOrgUrn}
                            onChange={(e) => setDefaultOrgUrn(e.target.value)}
                            placeholder="urn:li:organization:123456"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Paste the URN if the list is empty or you need a specific organization.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button type="button" size="sm" onClick={handleSaveDefaults} disabled={savingDefaults}>
                            {savingDefaults ? "Saving…" : "Save defaults"}
                        </Button>
                        {defaultOrgUrn && (
                            <Badge variant="outline">Default saved</Badge>
                        )}
                    </div>
                </div>

                <div className="rounded-lg border bg-white p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold">Recent Shares</div>
                            <p className="text-xs text-muted-foreground">
                                Latest LinkedIn posts and status.
                            </p>
                            {analyticsNote && (
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    {analyticsNote}
                                </p>
                            )}
                            {!analyticsOrgUrn && (
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    Set a default organization URN to pull company analytics.
                                </p>
                            )}
                            {analyticsOrgUrn && !memberAnalyticsEnabled && (
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    Member post analytics require the LinkedIn scope r_member_postAnalytics.
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={loadLogs} disabled={!connected || logsLoading}>
                                {logsLoading ? "Refreshing…" : "Refresh log"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={loadAnalytics}
                                disabled={!connected || analyticsLoading}
                            >
                                {analyticsLoading ? "Syncing…" : "Sync metrics"}
                            </Button>
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Status</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Impr.</TableHead>
                                <TableHead>Reactions</TableHead>
                                <TableHead>Comments</TableHead>
                                <TableHead>Shares</TableHead>
                                <TableHead>Clicks</TableHead>
                                <TableHead>Post</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-muted-foreground">
                                        No LinkedIn shares yet.
                                    </TableCell>
                                </TableRow>
                            )}
                            {logs.map((log) => {
                                const entry = analyticsByLogId.get(log.id);
                                const metrics = entry?.metrics || null;
                                return (
                                    <TableRow key={log.id}>
                                        <TableCell>
                                            <Badge variant={log.status === "success" ? "secondary" : "destructive"}>
                                                {log.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{log.share_target || "member"}</TableCell>
                                        <TableCell>{formatDate(log.created_at)}</TableCell>
                                        <TableCell>{metrics?.impressionCount ?? "—"}</TableCell>
                                        <TableCell>{metrics?.likeCount ?? "—"}</TableCell>
                                        <TableCell>{metrics?.commentCount ?? "—"}</TableCell>
                                        <TableCell>{metrics?.shareCount ?? "—"}</TableCell>
                                        <TableCell>{metrics?.clickCount ?? "—"}</TableCell>
                                        <TableCell>
                                            {log.share_url ? (
                                                <a
                                                    href={log.share_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                                >
                                                    View
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                <div className="rounded-lg border bg-white p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold">Scheduled Shares</div>
                            <p className="text-xs text-muted-foreground">
                                Upcoming LinkedIn posts queued by your team.
                            </p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={loadScheduled} disabled={!connected || scheduledLoading}>
                            {scheduledLoading ? "Refreshing…" : "Refresh schedule"}
                        </Button>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Status</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead>Scheduled</TableHead>
                                <TableHead>Visibility</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {scheduled.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-muted-foreground">
                                        No scheduled LinkedIn shares.
                                    </TableCell>
                                </TableRow>
                            )}
                            {scheduled.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <Badge variant="outline">{item.status}</Badge>
                                    </TableCell>
                                    <TableCell>{item.share_target || "member"}</TableCell>
                                    <TableCell>{formatDate(item.scheduled_at)}</TableCell>
                                    <TableCell>{item.visibility || "PUBLIC"}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
