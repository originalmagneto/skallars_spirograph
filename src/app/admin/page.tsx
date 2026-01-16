"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { File01Icon, UserMultipleIcon, TextIcon, Location01Icon } from "hugeicons-react";

import MapCitiesManager from "@/components/admin/MapCitiesManager";
import TeamMembersManager from "@/components/admin/TeamMembersManager";
import ContentManager from "@/components/admin/ContentManager";
import UserManagement from "@/components/admin/UserManagement";
import ArticlesManager from "@/components/admin/ArticlesManager";

export default function AdminPage() {
    const { user, isAdmin, isEditor } = useAuth();

    if (!user) return null;

    return (
        <Tabs defaultValue="map" className="space-y-6">
            <TabsList>
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

            <TabsContent value="users">
                <UserManagement />
            </TabsContent>
        </Tabs>
    );
}
