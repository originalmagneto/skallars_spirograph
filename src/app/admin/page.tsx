"use client";

import { type ComponentType, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    AiMagicIcon,
    File01Icon,
    FileBlockIcon,
    Image01Icon,
    LayoutGridIcon,
    ListViewIcon,
    Location01Icon,
    Mail01Icon,
    NewsIcon,
    Settings01Icon,
    TextIcon,
    UserMultipleIcon,
} from "hugeicons-react";
import { BarChart3, CalendarDays } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import MapCitiesManager from "@/components/admin/MapCitiesManager";
import TeamMembersManager from "@/components/admin/TeamMembersManager";
import ContentManager from "@/components/admin/ContentManager";
import UserManagement from "@/components/admin/UserManagement";
import ArticlesManager from "@/components/admin/ArticlesManager";
import AILab from "@/components/admin/AILab";
import AISettings from "@/components/admin/AISettings";
import PageSEOSettings from "@/components/admin/PageSEOSettings";
import ClientLogosManager from "@/components/admin/ClientLogosManager";
import PageLayoutManager from "@/components/admin/PageLayoutManager";
import ServiceItemsManager from "@/components/admin/ServiceItemsManager";
import NewsSettingsManager from "@/components/admin/NewsSettingsManager";
import FooterSettingsManager from "@/components/admin/FooterSettingsManager";
import PageBlocksManager from "@/components/admin/PageBlocksManager";
import MediaLibraryManager from "@/components/admin/MediaLibraryManager";
import SectionTemplatesPanel from "@/components/admin/SectionTemplatesPanel";
import ImageStudio from "@/components/admin/ImageStudio";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import PublishingCalendar from "@/components/admin/PublishingCalendar";
import ArticleStudio from "@/components/admin/ArticleStudio";
import LinkedInSettings from "@/components/admin/LinkedInSettings";
import { useAdminDirtyRegistry } from "@/hooks/use-admin-dirty-state";

type WorkspaceId = "site" | "publishing";
type SettingsPanelId = "ai" | "linkedin" | "seo";
type AccessLevel = "all" | "editor" | "admin";
type IconComponent = ComponentType<{ size?: number | string; className?: string }>;

interface NavItem {
    value: string;
    label: string;
    icon: IconComponent;
    description: string;
    visibility: AccessLevel;
    hidden?: boolean;
}

interface NavSection {
    title: string;
    items: NavItem[];
}

interface WorkspaceConfig {
    label: string;
    description: string;
    defaultTab: string;
    sections: NavSection[];
}

export default function AdminPage() {
    const { user, isAdmin, isEditor } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { hasDirtyChanges, dirtyLabels, confirmDirtyNavigation } = useAdminDirtyRegistry();

    const paramTab = searchParams.get("tab");
    const paramWorkspace = searchParams.get("workspace") as WorkspaceId | null;
    const paramSettingsPanel = searchParams.get("settingsPanel") as SettingsPanelId | null;

    const workspaceConfig = useMemo<Record<WorkspaceId, WorkspaceConfig>>(
        () => ({
            site: {
                label: "Site Editor",
                description: "Public pages, structure, and website modules.",
                defaultTab: "content",
                sections: [
                    {
                        title: "Website",
                        items: [
                            { value: "content", label: "Content", icon: TextIcon, description: "Edit multilingual copy and section text.", visibility: "editor" },
                            { value: "layout", label: "Layout", icon: LayoutGridIcon, description: "Control homepage order and visibility.", visibility: "admin" },
                            { value: "services", label: "Services", icon: ListViewIcon, description: "Manage service cards and ordering.", visibility: "admin" },
                            { value: "team", label: "Team", icon: UserMultipleIcon, description: "Manage team profiles and roles on page.", visibility: "admin" },
                            { value: "clients", label: "Clients", icon: UserMultipleIcon, description: "Manage client logos and display settings.", visibility: "admin" },
                            { value: "news-settings", label: "News", icon: NewsIcon, description: "Configure homepage news carousel behavior.", visibility: "admin" },
                            { value: "footer", label: "Footer", icon: Mail01Icon, description: "Configure footer sections and links.", visibility: "admin" },
                            { value: "blocks", label: "Blocks", icon: FileBlockIcon, description: "Edit reusable content blocks and templates.", visibility: "admin" },
                            { value: "media", label: "Media", icon: Image01Icon, description: "Upload and manage media library assets.", visibility: "admin" },
                            { value: "map", label: "Map Cities", icon: Location01Icon, description: "Manage city records for the world map.", visibility: "admin" },
                        ],
                    },
                ],
            },
            publishing: {
                label: "Publishing & AI",
                description: "Article generation, publishing, and distribution.",
                defaultTab: "article-studio",
                sections: [
                    {
                        title: "Publishing",
                        items: [
                            { value: "article-studio", label: "Article Studio", icon: AiMagicIcon, description: "Generate, edit, and publish from one flow.", visibility: "editor" },
                            { value: "articles", label: "Articles", icon: File01Icon, description: "Browse and manage all saved articles.", visibility: "editor" },
                            { value: "calendar", label: "Calendar", icon: CalendarDays, description: "Review planned and scheduled publishing.", visibility: "admin" },
                            { value: "analytics", label: "Analytics", icon: BarChart3, description: "Track performance and engagement.", visibility: "admin" },
                        ],
                    },
                    {
                        title: "AI Tools",
                        items: [
                            { value: "image-studio", label: "Image Studio", icon: AiMagicIcon, description: "Generate and refine article imagery.", visibility: "editor" },
                            { value: "ai-lab", label: "AI Lab (Advanced)", icon: AiMagicIcon, description: "Full advanced article prompt lab.", visibility: "editor", hidden: true },
                        ],
                    },
                    {
                        title: "System",
                        items: [
                            { value: "settings", label: "Settings", icon: Settings01Icon, description: "AI providers, LinkedIn, and SEO controls.", visibility: "admin" },
                            { value: "users", label: "Users", icon: UserMultipleIcon, description: "Manage admin/editor access and profiles.", visibility: "admin" },
                        ],
                    },
                ],
            },
        }),
        [],
    );

    const tabLookup = useMemo(() => {
        const map = new Map<string, { workspace: WorkspaceId; item: NavItem }>();
        (Object.keys(workspaceConfig) as WorkspaceId[]).forEach((workspaceId) => {
            workspaceConfig[workspaceId].sections.forEach((section) => {
                section.items.forEach((item) => {
                    map.set(item.value, { workspace: workspaceId, item });
                });
            });
        });
        return map;
    }, [workspaceConfig]);

    const canAccess = (level: AccessLevel) => {
        if (level === "all") return true;
        if (level === "editor") return isAdmin || isEditor;
        return isAdmin;
    };

    const inferWorkspace = (): WorkspaceId => {
        if (paramWorkspace === "site" || paramWorkspace === "publishing") return paramWorkspace;
        if (paramTab && tabLookup.has(paramTab)) return tabLookup.get(paramTab)!.workspace;
        return "site";
    };

    const inferTab = (workspaceId: WorkspaceId) => {
        const fromQuery = paramTab;
        const allTabs = workspaceConfig[workspaceId].sections.flatMap((s) => s.items);
        const availableTabs = allTabs.filter((item) => canAccess(item.visibility));
        const availableValues = new Set(availableTabs.map((item) => item.value));

        if (fromQuery && availableValues.has(fromQuery)) return fromQuery;
        if (availableValues.has(workspaceConfig[workspaceId].defaultTab)) return workspaceConfig[workspaceId].defaultTab;
        return availableTabs[0]?.value ?? workspaceConfig[workspaceId].defaultTab;
    };

    const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>(inferWorkspace());
    const [activeTab, setActiveTab] = useState<string>(inferTab(inferWorkspace()));
    const [activeSettingsPanel, setActiveSettingsPanel] = useState<SettingsPanelId>(paramSettingsPanel || "ai");

    useEffect(() => {
        const nextWorkspace = inferWorkspace();
        const nextTab = inferTab(nextWorkspace);
        setActiveWorkspace(nextWorkspace);
        setActiveTab(nextTab);
    }, [paramWorkspace, paramTab, isAdmin, isEditor, tabLookup]);

    useEffect(() => {
        if (paramSettingsPanel === "ai" || paramSettingsPanel === "linkedin" || paramSettingsPanel === "seo") {
            setActiveSettingsPanel(paramSettingsPanel);
            return;
        }
        setActiveSettingsPanel("ai");
    }, [paramSettingsPanel]);

    const updateQuery = (nextWorkspace: WorkspaceId, nextTab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("workspace", nextWorkspace);
        params.set("tab", nextTab);
        router.replace(`/admin?${params.toString()}`);
    };

    const handleWorkspaceChange = (nextWorkspace: WorkspaceId) => {
        if (nextWorkspace === activeWorkspace) return;
        if (!confirmDirtyNavigation(`switch to the ${workspaceConfig[nextWorkspace].label} workspace`)) return;
        const nextTab = inferTab(nextWorkspace);
        setActiveWorkspace(nextWorkspace);
        setActiveTab(nextTab);
        updateQuery(nextWorkspace, nextTab);
    };

    const handleTabChange = (nextTab: string) => {
        if (nextTab === activeTab) return;
        const nextMeta = tabLookup.get(nextTab);
        if (!confirmDirtyNavigation(`open ${nextMeta?.item.label || "another admin section"}`)) return;
        setActiveTab(nextTab);
        updateQuery(activeWorkspace, nextTab);
    };

    const handleSettingsPanelChange = (panel: SettingsPanelId) => {
        if (activeSettingsPanel === panel) return;
        if (!confirmDirtyNavigation(`switch to the ${panel.toUpperCase()} settings panel`)) return;
        setActiveSettingsPanel(panel);
        const params = new URLSearchParams(searchParams.toString());
        params.set("workspace", activeWorkspace);
        params.set("tab", activeTab);
        params.set("settingsPanel", panel);
        router.replace(`/admin?${params.toString()}`);
    };

    const activeMeta = tabLookup.get(activeTab);

    const renderActiveTab = () => {
        switch (activeTab) {
            case "map":
                return <MapCitiesManager />;
            case "content":
                return <ContentManager />;
            case "layout":
                return (
                    <div className="space-y-6">
                        <PageLayoutManager />
                        <SectionTemplatesPanel />
                    </div>
                );
            case "services":
                return <ServiceItemsManager />;
            case "news-settings":
                return <NewsSettingsManager />;
            case "footer":
                return <FooterSettingsManager />;
            case "blocks":
                return <PageBlocksManager />;
            case "media":
                return <MediaLibraryManager />;
            case "image-studio":
                return <ImageStudio />;
            case "analytics":
                return <AnalyticsDashboard />;
            case "calendar":
                return <PublishingCalendar />;
            case "team":
                return <TeamMembersManager />;
            case "articles":
                return <ArticlesManager />;
            case "article-studio":
                return <ArticleStudio />;
            case "clients":
                return <ClientLogosManager />;
            case "ai-lab":
                return <AILab />;
            case "settings":
                return (
                    <div className="mx-auto w-full max-w-[1480px]">
                        <div className="space-y-5">
                            <div className="rounded-2xl border bg-white p-3">
                                <div className="inline-flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant={activeSettingsPanel === "ai" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleSettingsPanelChange("ai")}
                                    >
                                        AI Usage & Config
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={activeSettingsPanel === "linkedin" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleSettingsPanelChange("linkedin")}
                                    >
                                        LinkedIn
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={activeSettingsPanel === "seo" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleSettingsPanelChange("seo")}
                                    >
                                        SEO
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {activeSettingsPanel === "ai" && <AISettings />}
                                {activeSettingsPanel === "linkedin" && <LinkedInSettings />}
                                {activeSettingsPanel === "seo" && <PageSEOSettings />}
                            </div>
                        </div>
                    </div>
                );
            case "users":
                return <UserManagement />;
            default:
                return <div className="rounded-xl border bg-white p-6 text-sm text-muted-foreground">Section not found.</div>;
        }
    };

    if (!user) return null;

    return (
        <div className="space-y-6">
            {hasDirtyChanges && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-[0_16px_34px_-30px_rgba(146,64,14,0.35)]">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="text-sm font-semibold text-amber-900">Unsaved Changes</div>
                            <p className="text-xs text-amber-800">
                                Save before switching sections or confirm navigation to discard changes in{" "}
                                {Array.from(new Set(dirtyLabels)).join(", ")}.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px,minmax(0,1fr)]">
                <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                    <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.18)] backdrop-blur-sm space-y-3">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Workspace</div>
                        <div className="grid grid-cols-2 gap-2">
                            {(Object.keys(workspaceConfig) as WorkspaceId[]).map((workspaceId) => {
                                const isActive = workspaceId === activeWorkspace;
                                return (
                                    <Button
                                        key={workspaceId}
                                        variant={isActive ? "default" : "outline"}
                                        className="h-auto min-h-[64px] justify-start px-3 py-3 text-left"
                                        onClick={() => handleWorkspaceChange(workspaceId)}
                                    >
                                        <span className="flex flex-col items-start">
                                            <span className="text-sm font-semibold leading-tight">{workspaceConfig[workspaceId].label}</span>
                                            <span className={cn("mt-1 text-[11px] leading-snug", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                                {workspaceId === "site" ? "Website" : "Publishing"}
                                            </span>
                                        </span>
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {workspaceConfig[activeWorkspace].sections.map((section) => (
                        <nav
                            key={section.title}
                            aria-label={section.title}
                            className="rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.18)] backdrop-blur-sm space-y-2"
                        >
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{section.title}</div>
                            <div className="space-y-1.5">
                                {section.items
                                    .filter((item) => canAccess(item.visibility))
                                    .filter((item) => !item.hidden || item.value === activeTab)
                                    .map((item) => {
                                        const Icon = item.icon;
                                        const isActive = item.value === activeTab;
                                        return (
                                            <button
                                                key={item.value}
                                                type="button"
                                                onClick={() => handleTabChange(item.value)}
                                                aria-current={isActive ? "page" : undefined}
                                                className={cn(
                                                    "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                                    isActive
                                                        ? "border-primary/25 bg-primary/10 text-primary shadow-[0_16px_36px_-30px_rgba(93,0,255,0.4)]"
                                                        : "border-transparent bg-white hover:border-slate-200 hover:bg-muted/20"
                                                )}
                                            >
                                                <div className="flex items-start gap-2.5">
                                                    <Icon size={16} className={cn("mt-0.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold leading-tight">{item.label}</div>
                                                        {isActive && (
                                                            <div className="mt-1 text-[11px] leading-snug text-primary/80">{item.description}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                            </div>
                        </nav>
                    ))}
                </aside>

                <section className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2 px-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        <span>{workspaceConfig[activeWorkspace].label}</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-[#5d00ff]">{activeMeta?.item.label ?? "Admin"}</span>
                    </div>

                    <div className="space-y-6">{renderActiveTab()}</div>
                </section>
            </div>
        </div>
    );
}
