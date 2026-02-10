"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, RefreshCw, XCircle } from "lucide-react";
import { AdminActionBar, AdminPanelHeader, AdminSectionCard } from "@/components/admin/AdminPrimitives";

type LinkedInStatus = {
    connected: boolean;
    member_name?: string | null;
    member_urn?: string | null;
    expires_at?: string | null;
    expired?: boolean;
    scopes?: string[];
    organization_urns?: string[];
    default_org_urn?: string | null;
    updated_at?: string | null;
};

type LinkedInOrg = { urn: string; name: string };

type LinkedInLog = {
    id: string;
    article_id?: string | null;
    article_title?: string | null;
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
    uniqueImpressionsCount?: number;
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

const normalizeOrgUrn = (value?: string | null) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("urn:li:organization:")) return trimmed;
    if (/^\d+$/.test(trimmed)) return `urn:li:organization:${trimmed}`;
    const match = trimmed.match(/organization:(\d+)|company\/(\d+)/i);
    const extracted = match?.[1] || match?.[2];
    return extracted ? `urn:li:organization:${extracted}` : "";
};

export default function LinkedInSettings() {
    const { session } = useAuth();
    const [settingsMode, setSettingsMode] = useState<"simple" | "power">("simple");
    const [status, setStatus] = useState<LinkedInStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [defaultOrgUrn, setDefaultOrgUrn] = useState("");
    const [orgsLoading, setOrgsLoading] = useState(false);
    const [organizations, setOrganizations] = useState<LinkedInOrg[]>([]);
    const [orgsNotice, setOrgsNotice] = useState<string | null>(null);
    const [savingDefaults, setSavingDefaults] = useState(false);
    const [logs, setLogs] = useState<LinkedInLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [scheduled, setScheduled] = useState<LinkedInScheduled[]>([]);
    const [scheduledLoading, setScheduledLoading] = useState(false);
    const [analytics, setAnalytics] = useState<LinkedInAnalyticsEntry[]>([]);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsNote, setAnalyticsNote] = useState<string | null>(null);
    const [statusNotice, setStatusNotice] = useState<string | null>(null);
    const [analyticsOrgUrn, setAnalyticsOrgUrn] = useState<string | null>(null);
    const [memberAnalyticsEnabled, setMemberAnalyticsEnabled] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState<string[]>([]);
    const [orgAutoLoadAttempted, setOrgAutoLoadAttempted] = useState(false);
    const connected = Boolean(status?.connected);
    const scopeBadges = status?.scopes || [];
    const hasOrgScope = scopeBadges.some((scope) =>
        ['w_organization_social', 'r_organization_social', 'r_organization_admin', 'rw_organization_admin'].includes(scope)
    );
    const hasDefaultOrganization = Boolean(defaultOrgUrn.trim());
    const companyShareReady = connected && hasOrgScope && hasDefaultOrganization;

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
    const successfulShareCount = logs.filter((log) => log.status === "success").length;
    const failedShareCount = logs.filter((log) => log.status !== "success").length;
    const queuedShareCount = scheduled.filter((item) =>
        ["scheduled", "retry", "processing"].includes(item.status)
    ).length;
    const logsWithMetricsCount = logs.filter((log) => {
        const metrics = analyticsByLogId.get(log.id)?.metrics;
        return Boolean(metrics);
    }).length;

    const parseJsonSafe = async (res: Response) => {
        try {
            return await res.json();
        } catch {
            return {};
        }
    };

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
            setOrgAutoLoadAttempted(false);
            return;
        }
        loadLogs();
        loadScheduled();
    }, [session?.access_token, status?.connected]);

    useEffect(() => {
        if (!session?.access_token) return;
        if (!status?.connected) return;
        if (settingsMode !== "power") return;
        loadAnalytics();
    }, [session?.access_token, status?.connected, settingsMode]);

    useEffect(() => {
        if (!session?.access_token) return;
        if (!connected) return;
        if (!hasOrgScope) return;
        if (orgAutoLoadAttempted) return;
        if (organizations.length > 0 || orgsLoading) return;
        setOrgAutoLoadAttempted(true);
        loadOrganizations();
    }, [session?.access_token, connected, hasOrgScope, organizations.length, orgsLoading, orgAutoLoadAttempted]);

    useEffect(() => {
        if (settingsMode === "power") {
            setAdvancedOpen(["analytics", "schedule"]);
            return;
        }
        setAdvancedOpen([]);
    }, [settingsMode]);

    const loadStatus = async () => {
        if (!session?.access_token) return;
        setStatusLoading(true);
        try {
            const res = await fetch("/api/linkedin/status", {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await parseJsonSafe(res);
            if (res.ok) {
                setStatus(data);
                setStatusNotice(data?.error || null);
                if (!defaultOrgUrn) {
                    if (data?.default_org_urn) {
                        setDefaultOrgUrn(data.default_org_urn);
                    } else if (Array.isArray(data?.organization_urns) && data.organization_urns.length > 0) {
                        setDefaultOrgUrn(data.organization_urns[0]);
                    }
                }
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
        setOrgsNotice(null);
        try {
            const res = await fetch("/api/linkedin/organizations", {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await parseJsonSafe(res);
            const fallbackOrgs = [
                ...(defaultOrgUrn ? [{ urn: defaultOrgUrn, name: "Default Organization" }] : []),
                ...((status?.organization_urns || []).map((urn) => ({ urn, name: urn }))),
            ];
            const dedup = new Map<string, LinkedInOrg>();
            fallbackOrgs.forEach((org) => dedup.set(org.urn, org));
            const fallbackList = Array.from(dedup.values());

            if (Array.isArray(data.organizations)) {
                const baseList = data.organizations.length > 0 ? data.organizations : fallbackList;
                setOrganizations(baseList);
                let detectedDefault = "";
                if (!defaultOrgUrn && data?.default_org_urn) {
                    detectedDefault = data.default_org_urn;
                    setDefaultOrgUrn(data.default_org_urn);
                }
                if (!defaultOrgUrn && baseList.length === 1) {
                    detectedDefault = baseList[0].urn;
                    setDefaultOrgUrn(baseList[0].urn);
                } else if (!defaultOrgUrn && Array.isArray(status?.organization_urns) && status.organization_urns.length > 0) {
                    detectedDefault = status.organization_urns[0];
                    setDefaultOrgUrn(status.organization_urns[0]);
                }
                if (detectedDefault) {
                    void persistDefaultOrg(detectedDefault, { silent: true });
                }
            }
            if (!res.ok) {
                if (fallbackList.length > 0) {
                    setOrganizations(fallbackList);
                }
                if (data?.error) {
                    setOrgsNotice(data.error);
                } else {
                    setOrgsNotice("LinkedIn org API is temporarily unavailable. Using fallback organizations.");
                }
                return;
            }

            if (data?.error) {
                const hintSuffix = data?.hint ? ` ${data.hint}` : "";
                if (Array.isArray(data.organizations) || fallbackList.length > 0) {
                    setOrgsNotice(`${data.error}${hintSuffix} Using fallback organization list.`);
                } else {
                    setOrgsNotice(`${data.error}${hintSuffix}`);
                }
            }
        } catch {
            const fallback = [
                ...(defaultOrgUrn ? [{ urn: defaultOrgUrn, name: "Default Organization" }] : []),
                ...((status?.organization_urns || []).map((urn) => ({ urn, name: urn }))),
            ];
            const dedup = new Map<string, LinkedInOrg>();
            fallback.forEach((org) => dedup.set(org.urn, org));
            const fallbackList = Array.from(dedup.values());
            if (fallbackList.length > 0) {
                setOrganizations(fallbackList);
                setOrgsNotice("LinkedIn org API failed. Fallback organizations loaded.");
                return;
            }
            setOrgsNotice("Failed to load LinkedIn organizations.");
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
            const data = await parseJsonSafe(res);
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
            const data = await parseJsonSafe(res);
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
        if (!connected) return;
        setAnalyticsLoading(true);
        try {
            const res = await fetch("/api/linkedin/analytics", {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await parseJsonSafe(res);
            if (res.ok && Array.isArray(data.analytics)) {
                setAnalytics(data.analytics);
                setAnalyticsNote(data.note || data.error || null);
                setAnalyticsOrgUrn(data.org_urn || null);
                setMemberAnalyticsEnabled(Boolean(data.memberAnalyticsEnabled));
            } else if (data?.note || data?.error) {
                setAnalytics([]);
                setAnalyticsNote(data.note || data.error);
            } else if (!res.ok) {
                setAnalytics([]);
                setAnalyticsNote("LinkedIn analytics is temporarily unavailable.");
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

    const persistDefaultOrg = async (rawValue: string, opts?: { silent?: boolean }) => {
        try {
            const normalized = normalizeOrgUrn(rawValue);
            if (rawValue.trim() && !normalized) {
                if (!opts?.silent) {
                    toast.error("Use an organization URN, numeric ID, or LinkedIn company URL.");
                }
                return false;
            }
            const payload = { key: "linkedin_default_org_urn", value: normalized };
            const { error } = await supabase.from("settings").upsert(payload, { onConflict: "key" });
            if (error) throw error;
            setDefaultOrgUrn(normalized);
            if (!opts?.silent) {
                toast.success("LinkedIn defaults saved.");
            }
            return true;
        } catch (error: any) {
            if (!opts?.silent) {
                toast.error(error?.message || "Failed to save LinkedIn settings.");
            }
            return false;
        }
    };

    const handleSaveDefaults = async () => {
        setSavingDefaults(true);
        try {
            await persistDefaultOrg(defaultOrgUrn);
        } finally {
            setSavingDefaults(false);
        }
    };

    return (
        <div className="space-y-4">
            <AdminPanelHeader
                title="LinkedIn Settings"
                description="Connect account and set default organization. Advanced logs and metrics are optional."
            />
            <AdminSectionCard className="space-y-8">
                <div className="rounded-lg border border-primary/10 bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold">Control Mode</div>
                            <p className="text-xs text-muted-foreground">
                                Basic mode keeps setup compact. Power mode reveals diagnostics and queue details.
                            </p>
                        </div>
                        <div className="inline-flex rounded-md border bg-white p-1">
                            <Button
                                type="button"
                                size="sm"
                                variant={settingsMode === "simple" ? "default" : "ghost"}
                                className="h-7 px-3 text-xs"
                                onClick={() => setSettingsMode("simple")}
                            >
                                Basic
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={settingsMode === "power" ? "default" : "ghost"}
                                className="h-7 px-3 text-xs"
                                onClick={() => setSettingsMode("power")}
                            >
                                Power
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
                        {statusNotice && (
                            <p className="text-xs text-amber-700">{statusNotice}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                            <Badge variant={connected ? "secondary" : "outline"}>
                                {connected ? "Connected" : "Disconnected"}
                            </Badge>
                            <Badge variant={hasOrgScope ? "secondary" : "outline"}>
                                {hasOrgScope ? "Org scopes ready" : "Org scopes missing"}
                            </Badge>
                            <Badge variant={hasDefaultOrganization ? "secondary" : "outline"}>
                                {hasDefaultOrganization ? "Default org set" : "Default org missing"}
                            </Badge>
                            <Badge variant={companyShareReady ? "secondary" : "outline"}>
                                {companyShareReady ? "Company sharing ready" : "Company sharing incomplete"}
                            </Badge>
                        </div>
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
                                <Select
                                    value={defaultOrgUrn || undefined}
                                    onValueChange={(value) => {
                                        setDefaultOrgUrn(value);
                                        void persistDefaultOrg(value, { silent: true });
                                    }}
                                >
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
                                placeholder="urn:li:organization:123456 or 123456"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Paste the URN if the list is empty or you need a specific organization.
                            </p>
                            {orgsNotice && (
                                <p className="text-[10px] text-amber-700">{orgsNotice}</p>
                            )}
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
                </div>
                <AdminActionBar>
                    <span className="text-sm text-muted-foreground">
                        Primary flow: connect LinkedIn, load organizations, save default URN.
                    </span>
                </AdminActionBar>
            </AdminSectionCard>

            <AdminSectionCard className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold">LinkedIn Metrics & Activity</div>
                        <p className="text-xs text-muted-foreground">
                            Share logs, article-level context, and engagement metrics.
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="rounded-lg border bg-white px-3 py-2">
                        <div className="text-[11px] text-muted-foreground">Successful Shares</div>
                        <div className="text-lg font-semibold">{successfulShareCount}</div>
                    </div>
                    <div className="rounded-lg border bg-white px-3 py-2">
                        <div className="text-[11px] text-muted-foreground">Failed Shares</div>
                        <div className="text-lg font-semibold">{failedShareCount}</div>
                    </div>
                    <div className="rounded-lg border bg-white px-3 py-2">
                        <div className="text-[11px] text-muted-foreground">Queued Shares</div>
                        <div className="text-lg font-semibold">{queuedShareCount}</div>
                    </div>
                    <div className="rounded-lg border bg-white px-3 py-2">
                        <div className="text-[11px] text-muted-foreground">Rows With Metrics</div>
                        <div className="text-lg font-semibold">{logsWithMetricsCount}</div>
                    </div>
                </div>
                <div className="rounded-lg border bg-white p-2">
                    {settingsMode === "simple" ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                            Switch to <strong>Power</strong> mode for share logs, analytics sync, and scheduled queue details.
                        </div>
                    ) : (
                    <Accordion type="multiple" value={advancedOpen} onValueChange={setAdvancedOpen}>
                        <AccordionItem value="analytics">
                            <AccordionTrigger className="px-3 py-2 text-sm font-semibold">
                                Advanced: Share Logs & Analytics
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 px-3 pb-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            Latest LinkedIn shares with synced metrics.
                                        </p>
                                        {analyticsNote && (
                                            <p className="text-[11px] text-muted-foreground mt-1">{analyticsNote}</p>
                                        )}
                                        {!analyticsOrgUrn && (
                                            <p className="text-[11px] text-muted-foreground mt-1">
                                                Set a default organization URN to pull company analytics.
                                            </p>
                                        )}
                                        {analyticsOrgUrn && !memberAnalyticsEnabled && (
                                            <p className="text-[11px] text-muted-foreground mt-1">
                                                Member post analytics require `r_member_postAnalytics`.
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
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Article</TableHead>
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
                                                    <TableCell colSpan={10} className="text-muted-foreground">
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
                                                            {log.article_id ? (
                                                                <a
                                                                    href={`/admin?workspace=publishing&tab=article-studio&edit=${log.article_id}`}
                                                                    className="text-primary hover:underline"
                                                                >
                                                                    {log.article_title || `Article ${log.article_id.slice(0, 8)}…`}
                                                                </a>
                                                            ) : (
                                                                <span className="text-muted-foreground">—</span>
                                                            )}
                                                        </TableCell>
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
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="schedule">
                            <AccordionTrigger className="px-3 py-2 text-sm font-semibold">
                                Advanced: Scheduled Shares Queue
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 px-3 pb-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-xs text-muted-foreground">
                                        Upcoming LinkedIn posts queued by your team.
                                    </p>
                                    <Button type="button" variant="outline" size="sm" onClick={loadScheduled} disabled={!connected || scheduledLoading}>
                                        {scheduledLoading ? "Refreshing…" : "Refresh schedule"}
                                    </Button>
                                </div>
                                <div className="overflow-x-auto">
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
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                    )}
                </div>
            </AdminSectionCard>
        </div>
    );
}
