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

type WorkspaceId = "site" | "publishing";
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

    const paramTab = searchParams.get("tab");
    const paramWorkspace = searchParams.get("workspace") as WorkspaceId | null;

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

    useEffect(() => {
        const nextWorkspace = inferWorkspace();
        const nextTab = inferTab(nextWorkspace);
        setActiveWorkspace(nextWorkspace);
        setActiveTab(nextTab);
    }, [paramWorkspace, paramTab, isAdmin, isEditor, tabLookup]);

    const updateQuery = (nextWorkspace: WorkspaceId, nextTab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("workspace", nextWorkspace);
        params.set("tab", nextTab);
        router.replace(`/admin?${params.toString()}`);
    };

    const handleWorkspaceChange = (nextWorkspace: WorkspaceId) => {
        if (nextWorkspace === activeWorkspace) return;
        const nextTab = inferTab(nextWorkspace);
        setActiveWorkspace(nextWorkspace);
        setActiveTab(nextTab);
        updateQuery(nextWorkspace, nextTab);
    };

    const handleTabChange = (nextTab: string) => {
        if (nextTab === activeTab) return;
        setActiveTab(nextTab);
        updateQuery(activeWorkspace, nextTab);
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
                    <div className="space-y-6">
                        <AISettings />
                        <LinkedInSettings />
                        <PageSEOSettings />
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
            <div className="grid grid-cols-1 xl:grid-cols-[320px,minmax(0,1fr)] gap-6">
                <aside className="space-y-4">
                    <div className="rounded-2xl border bg-white p-4 space-y-3">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Workspace</div>
                        <div className="grid gap-2">
                            {(Object.keys(workspaceConfig) as WorkspaceId[]).map((workspaceId) => {
                                const isActive = workspaceId === activeWorkspace;
                                return (
                                    <Button
                                        key={workspaceId}
                                        variant={isActive ? "default" : "outline"}
                                        className="h-auto justify-start px-4 py-3"
                                        onClick={() => handleWorkspaceChange(workspaceId)}
                                    >
                                        <span className="flex flex-col items-start">
                                            <span className="text-sm font-semibold leading-tight">{workspaceConfig[workspaceId].label}</span>
                                            <span className={cn("text-xs leading-snug", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>{workspaceConfig[workspaceId].description}</span>
                                        </span>
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {workspaceConfig[activeWorkspace].sections.map((section) => (
                        <div key={section.title} className="rounded-2xl border bg-white p-4 space-y-3">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{section.title}</div>
                            <div className="space-y-2">
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
                                                className={cn(
                                                    "w-full rounded-xl border px-3.5 py-3 text-left transition-colors",
                                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                                    isActive
                                                        ? "border-primary/30 bg-primary/10 text-primary"
                                                        : "border-border bg-white hover:bg-muted/30"
                                                )}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <Icon size={16} className={cn("mt-0.5", isActive ? "text-primary" : "text-muted-foreground")} />
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold leading-tight">{item.label}</div>
                                                        <div className="mt-1 text-xs text-muted-foreground leading-snug">{item.description}</div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                            </div>
                        </div>
                    ))}
                </aside>

                <section className="space-y-4">
                    <div className="rounded-2xl border bg-white px-5 py-4 lg:px-6">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">{workspaceConfig[activeWorkspace].label}</div>
                        <h1 className="mt-1 text-xl font-semibold leading-tight">{activeMeta?.item.label ?? "Admin"}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">{activeMeta?.item.description ?? "Manage this section."}</p>
                    </div>

                    <div className="space-y-6">{renderActiveTab()}</div>
                </section>
            </div>
        </div>
    );
}
