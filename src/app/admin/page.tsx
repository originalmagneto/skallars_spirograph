"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { File01Icon, UserMultipleIcon, TextIcon, Location01Icon, AiMagicIcon, Settings01Icon, LayoutGridIcon, ListViewIcon } from "hugeicons-react";

import MapCitiesManager from "@/components/admin/MapCitiesManager";
import TeamMembersManager from "@/components/admin/TeamMembersManager";
import ContentManager from "@/components/admin/ContentManager";
import UserManagement from "@/components/admin/UserManagement";
import ArticlesManager from "@/components/admin/ArticlesManager";
import AILab from "@/components/admin/AILab";
import AISettings from "@/components/admin/AISettings";
import ClientLogosManager from "@/components/admin/ClientLogosManager";
import PageLayoutManager from "@/components/admin/PageLayoutManager";
import ServiceItemsManager from "@/components/admin/ServiceItemsManager";

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
                <PageLayoutManager />
            </TabsContent>

            <TabsContent value="services">
                <ServiceItemsManager />
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
                <AISettings />
            </TabsContent>

            <TabsContent value="users">
                <UserManagement />
            </TabsContent>
        </Tabs>
    );
}
