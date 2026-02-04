"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { File01Icon, UserMultipleIcon, TextIcon, Location01Icon, AiMagicIcon, Settings01Icon, LayoutGridIcon, ListViewIcon, NewsIcon, Mail01Icon, FileBlockIcon, Image01Icon } from "hugeicons-react";

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

export default function AdminPage() {
    const { user, isAdmin } = useAuth();
    const searchParams = useSearchParams();
    const paramTab = searchParams.get("tab");
    const paramSection = searchParams.get("section");
    const initialTab = paramTab ?? (paramSection ? "content" : "map");
    const [activeTab, setActiveTab] = useState(initialTab);

    useEffect(() => {
        const nextTab = paramTab ?? (paramSection ? "content" : "map");
        setActiveTab(nextTab);
    }, [paramTab, paramSection]);

    // Layout handles redirect and loading, but we keep a safety check
    if (!user) return null;

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex-wrap h-auto">
                {isAdmin && (
                    <TabsTrigger value="map" className="gap-2">
                        <Location01Icon size={14} />
                        Map Cities
                    </TabsTrigger>
                )}
                {isAdmin && (
                    <TabsTrigger value="content" className="gap-2">
                        <TextIcon size={14} />
                        Content
                    </TabsTrigger>
                )}
                {isAdmin && (
                    <TabsTrigger value="layout" className="gap-2">
                        <LayoutGridIcon size={14} />
                        Layout
                    </TabsTrigger>
                )}
                {isAdmin && (
                    <TabsTrigger value="services" className="gap-2">
                        <ListViewIcon size={14} />
                        Services
                    </TabsTrigger>
                )}
                {isAdmin && (
                    <TabsTrigger value="news-settings" className="gap-2">
                        <NewsIcon size={14} />
                        News
                    </TabsTrigger>
                )}
                {isAdmin && (
                    <TabsTrigger value="footer" className="gap-2">
                        <Mail01Icon size={14} />
                        Footer
                    </TabsTrigger>
                )}
                {isAdmin && (
                    <TabsTrigger value="blocks" className="gap-2">
                        <FileBlockIcon size={14} />
                        Blocks
                    </TabsTrigger>
                )}
                {isAdmin && (
                    <TabsTrigger value="media" className="gap-2">
                        <Image01Icon size={14} />
                        Media
                    </TabsTrigger>
                )}
                {isAdmin && (
                    <TabsTrigger value="image-studio" className="gap-2">
                        <AiMagicIcon size={14} />
                        Image Studio
                    </TabsTrigger>
                )}
                {isAdmin && (
                    <TabsTrigger value="team" className="gap-2">
                        <UserMultipleIcon size={14} />
                        Team
                    </TabsTrigger>
                )}
                <TabsTrigger value="articles" className="gap-2">
                    <File01Icon size={14} />
                    Articles
                </TabsTrigger>
                {isAdmin && (
                    <TabsTrigger value="clients" className="gap-2">
                        <UserMultipleIcon size={14} />
                        Clients
                    </TabsTrigger>
                )}
                {isAdmin && (
                    <TabsTrigger value="ai-lab" className="gap-2">
                        <AiMagicIcon size={14} />
                        AI Lab
                    </TabsTrigger>
                )}
                {isAdmin && (
                    <TabsTrigger value="settings" className="gap-2">
                        <Settings01Icon size={14} />
                        Settings
                    </TabsTrigger>
                )}
                {isAdmin && (
                    <TabsTrigger value="users" className="gap-2">
                        <UserMultipleIcon size={14} />
                        Users
                    </TabsTrigger>
                )}
            </TabsList>

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

            <TabsContent value="team">
                <TeamMembersManager />
            </TabsContent>

            <TabsContent value="articles">
                <ArticlesManager />
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
        </Tabs>
    );
}
