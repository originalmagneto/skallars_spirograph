"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { File01Icon, UserMultipleIcon, TextIcon, Location01Icon, AiMagicIcon, Settings01Icon } from "hugeicons-react";

import MapCitiesManager from "@/components/admin/MapCitiesManager";
import TeamMembersManager from "@/components/admin/TeamMembersManager";
import ContentManager from "@/components/admin/ContentManager";
import UserManagement from "@/components/admin/UserManagement";
import ArticlesManager from "@/components/admin/ArticlesManager";
import AILab from "@/components/admin/AILab";
import AISettings from "@/components/admin/AISettings";
import ClientLogosManager from "@/components/admin/ClientLogosManager";

export default function AdminPage() {
    const { user, isAdmin, isEditor } = useAuth();

    if (!user) return null;

    return (
        <Tabs defaultValue="map" className="space-y-6">
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
