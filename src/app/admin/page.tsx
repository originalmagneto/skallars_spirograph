"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { File01Icon, UserMultipleIcon, TextIcon, Location01Icon, AiMagicIcon, Settings01Icon, LayoutGridIcon, ListViewIcon, NewsIcon, Mail01Icon, FileBlockIcon, Image01Icon } from "hugeicons-react";
import { BarChart3, CalendarDays } from "lucide-react";

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

export default function AdminPage() {
    const { user, isAdmin } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const paramTab = searchParams.get("tab");
    const paramSection = searchParams.get("section");
    const paramWorkspace = searchParams.get("workspace");

    const workspaceConfig = useMemo(() => ({
        site: {
            label: "Site Editor",
            description: "Content, layout, and public-facing sections.",
            sections: [
                {
                    title: "Website",
                    items: [
                        { value: "content", label: "Content", icon: TextIcon, adminOnly: true },
                        { value: "layout", label: "Layout", icon: LayoutGridIcon, adminOnly: true },
                        { value: "services", label: "Services", icon: ListViewIcon, adminOnly: true },
                        { value: "team", label: "Team", icon: UserMultipleIcon, adminOnly: true },
                        { value: "clients", label: "Clients", icon: UserMultipleIcon, adminOnly: true },
                        { value: "news-settings", label: "News", icon: NewsIcon, adminOnly: true },
                        { value: "footer", label: "Footer", icon: Mail01Icon, adminOnly: true },
                        { value: "blocks", label: "Blocks", icon: FileBlockIcon, adminOnly: true },
                        { value: "media", label: "Media", icon: Image01Icon, adminOnly: true },
                        { value: "map", label: "Map Cities", icon: Location01Icon, adminOnly: true },
                    ],
                },
            ],
            defaultTab: "content",
        },
        publishing: {
            label: "Publishing & AI",
            description: "Articles, AI tools, scheduling, and analytics.",
            sections: [
                {
                    title: "Articles",
                    items: [
                        { value: "article-studio", label: "Article Studio", icon: AiMagicIcon, adminOnly: true },
                        { value: "articles", label: "Articles", icon: File01Icon, adminOnly: false },
                        { value: "calendar", label: "Calendar", icon: CalendarDays, adminOnly: true },
                        { value: "analytics", label: "Analytics", icon: BarChart3, adminOnly: true },
                    ],
                },
                {
                    title: "AI Tools",
                    items: [
                        { value: "ai-lab", label: "AI Lab", icon: AiMagicIcon, adminOnly: true },
                        { value: "image-studio", label: "Image Studio", icon: AiMagicIcon, adminOnly: true },
                    ],
                },
                {
                    title: "Admin",
                    items: [
                        { value: "settings", label: "Settings", icon: Settings01Icon, adminOnly: true },
                        { value: "users", label: "Users", icon: UserMultipleIcon, adminOnly: true },
                    ],
                },
            ],
            defaultTab: "articles",
        },
    }), []);

    const tabWorkspace = useMemo(() => {
        const map: Record<string, "site" | "publishing"> = {};
        Object.entries(workspaceConfig).forEach(([workspaceId, workspace]) => {
            workspace.sections.forEach((section) => {
                section.items.forEach((item) => {
                    map[item.value] = workspaceId as "site" | "publishing";
                });
            });
        });
        return map;
    }, [workspaceConfig]);

    const inferWorkspace = () => {
        if (paramWorkspace === "site" || paramWorkspace === "publishing") return paramWorkspace;
        if (paramTab && tabWorkspace[paramTab]) return tabWorkspace[paramTab];
        if (paramSection) return "site";
        return "site";
    };

    const initialWorkspace = inferWorkspace();
    const [activeWorkspace, setActiveWorkspace] = useState<"site" | "publishing">(initialWorkspace);
    const initialTab = paramTab ?? (paramSection ? "content" : workspaceConfig[initialWorkspace].defaultTab);
    const [activeTab, setActiveTab] = useState(initialTab);

    useEffect(() => {
        const nextWorkspace = inferWorkspace();
        const nextTab = paramTab ?? (paramSection ? "content" : workspaceConfig[nextWorkspace].defaultTab);
        const validTabs = new Set(
            workspaceConfig[nextWorkspace].sections.flatMap((section) => section.items.map((item) => item.value))
        );
        const resolvedTab = validTabs.has(nextTab) ? nextTab : workspaceConfig[nextWorkspace].defaultTab;
        setActiveWorkspace(nextWorkspace);
        setActiveTab(resolvedTab);
    }, [paramTab, paramSection, paramWorkspace, workspaceConfig, tabWorkspace]);

    const updateQuery = (nextTab: string, nextWorkspace: "site" | "publishing") => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", nextTab);
        params.set("workspace", nextWorkspace);
        router.replace(`/admin?${params.toString()}`);
    };

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        updateQuery(value, activeWorkspace);
    };

    const handleWorkspaceChange = (nextWorkspace: "site" | "publishing") => {
        if (nextWorkspace === activeWorkspace) return;
        const nextTab = workspaceConfig[nextWorkspace].defaultTab;
        setActiveWorkspace(nextWorkspace);
        setActiveTab(nextTab);
        updateQuery(nextTab, nextWorkspace);
    };

    // Layout handles redirect and loading, but we keep a safety check
    if (!user) return null;

    return (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-6">
                <aside className="space-y-4">
                    <div className="rounded-xl border bg-white p-4 space-y-2">
                        <div className="text-xs uppercase text-muted-foreground">Workspace</div>
                        <div className="grid gap-2">
                            {(["site", "publishing"] as const).map((workspaceId) => (
                                <Button
                                    key={workspaceId}
                                    size="sm"
                                    variant={activeWorkspace === workspaceId ? "default" : "outline"}
                                    className="justify-start"
                                    onClick={() => handleWorkspaceChange(workspaceId)}
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="text-sm font-semibold">
                                            {workspaceConfig[workspaceId].label}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {workspaceConfig[workspaceId].description}
                                        </span>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </div>

                    {workspaceConfig[activeWorkspace].sections.map((section) => (
                        <div key={section.title} className="rounded-xl border bg-white p-4 space-y-2">
                            <div className="text-xs uppercase text-muted-foreground">{section.title}</div>
                            <TabsList className="flex flex-col items-stretch gap-2 h-auto bg-transparent p-0">
                                {section.items
                                    .filter((item) => (item.adminOnly ? isAdmin : true))
                                    .map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <TabsTrigger key={item.value} value={item.value} className="justify-start gap-2">
                                                <Icon size={14} />
                                                {item.label}
                                            </TabsTrigger>
                                        );
                                    })}
                            </TabsList>
                        </div>
                    ))}
                </aside>

                <div className="space-y-6">
                    <TabsContent value="map">
                        <MapCitiesManager />
                    </TabsContent>

                    <TabsContent value="content">
                        <ContentManager />
                    </TabsContent>

                    <TabsContent value="layout">
                        <div className="space-y-6">
                            <PageLayoutManager />
                            <SectionTemplatesPanel />
                        </div>
                    </TabsContent>

                    <TabsContent value="services">
                        <ServiceItemsManager />
                    </TabsContent>

                    <TabsContent value="news-settings">
                        <NewsSettingsManager />
                    </TabsContent>

                    <TabsContent value="footer">
                        <FooterSettingsManager />
                    </TabsContent>

                    <TabsContent value="blocks">
                        <PageBlocksManager />
                    </TabsContent>

                    <TabsContent value="media">
                        <MediaLibraryManager />
                    </TabsContent>

                    <TabsContent value="image-studio">
                        <ImageStudio />
                    </TabsContent>

                    <TabsContent value="analytics">
                        <AnalyticsDashboard />
                    </TabsContent>

                    <TabsContent value="calendar">
                        <PublishingCalendar />
                    </TabsContent>

                    <TabsContent value="team">
                        <TeamMembersManager />
                    </TabsContent>

                    <TabsContent value="articles">
                        <ArticlesManager />
                    </TabsContent>

                    <TabsContent value="article-studio">
                        <ArticleStudio />
                    </TabsContent>

                    <TabsContent value="clients">
                        <ClientLogosManager />
                    </TabsContent>

                    <TabsContent value="ai-lab">
                        <AILab />
                    </TabsContent>

                    <TabsContent value="settings">
                        <div className="space-y-6">
                            <AISettings />
                            <PageSEOSettings />
                        </div>
                    </TabsContent>

                    <TabsContent value="users">
                        <UserManagement />
                    </TabsContent>
                </div>
            </div>
        </Tabs>
    );
}
