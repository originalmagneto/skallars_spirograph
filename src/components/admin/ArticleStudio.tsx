"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AILab from "@/components/admin/AILab";
import ArticleEditor from "@/components/admin/ArticleEditor";
import { AdminActionBar, AdminPanelHeader, AdminSectionCard } from "@/components/admin/AdminPrimitives";

type Stage = "generate" | "edit";

export default function ArticleStudio() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("edit");
    const [stage, setStage] = useState<Stage>("generate");

    useEffect(() => {
        if (editId) {
            setStage("edit");
        }
    }, [editId]);

    const badgeLabel = useMemo(() => {
        if (!editId) return null;
        return `Draft ${editId.slice(0, 8)}…`;
    }, [editId]);

    return (
        <div className="space-y-6">
            <AdminPanelHeader
                title="Article Studio"
                description="Generate, refine, and publish articles from one workspace."
                actions={
                    <>
                    <Button
                        variant="outline"
                        onClick={() => router.push("/admin?workspace=publishing&tab=articles")}
                    >
                        Open Articles List
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/admin?workspace=publishing&tab=ai-lab")}
                    >
                        Advanced AI Lab
                    </Button>
                    </>
                }
            />

            <AdminActionBar>
                <Button
                    size="sm"
                    variant={stage === "generate" ? "default" : "outline"}
                    onClick={() => setStage("generate")}
                >
                    1. Generate
                </Button>
                <Button
                    size="sm"
                    variant={stage === "edit" ? "default" : "outline"}
                    onClick={() => setStage("edit")}
                    disabled={!editId}
                >
                    2. Edit & Publish
                </Button>
                {badgeLabel && <Badge variant="secondary">{badgeLabel}</Badge>}
            </AdminActionBar>

            {stage === "generate" && (
                <AILab
                    redirectTab="article-studio"
                    onDraftSaved={() => setStage("edit")}
                />
            )}

            {stage === "edit" && (
                editId ? (
                    <ArticleEditor
                        articleId={editId}
                        onClose={() => {
                            setStage("generate");
                            router.replace("/admin?workspace=publishing&tab=article-studio");
                        }}
                    />
                ) : (
                    <AdminSectionCard className="text-sm text-muted-foreground">
                        Generate an article first to begin editing, or open one from the Articles list.
                    </AdminSectionCard>
                )
            )}
        </div>
    );
}
