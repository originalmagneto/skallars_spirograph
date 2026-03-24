"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AILab from "@/components/admin/AILab";
import ArticleEditor from "@/components/admin/ArticleEditor";
import { AdminActionBar, AdminPanelHeader, AdminSectionCard } from "@/components/admin/AdminPrimitives";
import { useAdminDirtyRegistry } from "@/hooks/use-admin-dirty-state";

type Stage = "generate" | "edit";

export default function ArticleStudio() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("edit");
    const stageParam = searchParams.get("stage");
    const [stage, setStage] = useState<Stage>("generate");
    const { confirmDirtyNavigation } = useAdminDirtyRegistry();

    useEffect(() => {
        if (stageParam === "edit" && editId) {
            setStage("edit");
            return;
        }

        if (stageParam === "generate") {
            setStage("generate");
            return;
        }

        if (editId) {
            setStage("edit");
            return;
        }
        setStage("generate");
    }, [editId, stageParam]);

    const replaceStudioState = (nextStage: Stage, nextEditId?: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("workspace", "publishing");
        params.set("tab", "article-studio");
        params.set("stage", nextStage);
        if (nextEditId) {
            params.set("edit", nextEditId);
        } else if (nextStage === "generate") {
            params.delete("edit");
        }
        router.replace(`/admin?${params.toString()}`);
    };

    const handleStageChange = (nextStage: Stage) => {
        if (nextStage === stage) return;
        if (!confirmDirtyNavigation(`switch to the ${nextStage === "generate" ? "Generate" : "Edit & Publish"} step`)) return;
        setStage(nextStage);
        replaceStudioState(nextStage, editId);
    };

    const handleOpenArticles = () => {
        if (!confirmDirtyNavigation("open the Articles list")) return;
        router.push("/admin?workspace=publishing&tab=articles");
    };

    const badgeLabel = useMemo(() => {
        if (!editId) return null;
        return `Draft ${editId.slice(0, 8)}…`;
    }, [editId]);

    return (
        <div className="space-y-6">
            <AdminPanelHeader
                title="Article Studio"
                description="One focused workflow for drafting, editing, publishing, and distribution."
                actions={
                    <Button
                        variant="outline"
                        onClick={handleOpenArticles}
                    >
                        Open Articles List
                    </Button>
                }
            />

            <AdminActionBar>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                    <Button
                        size="sm"
                        variant={stage === "generate" ? "default" : "outline"}
                        onClick={() => handleStageChange("generate")}
                    >
                        1. Generate Draft
                    </Button>
                    <Button
                        size="sm"
                        variant={stage === "edit" ? "default" : "outline"}
                        onClick={() => handleStageChange("edit")}
                        disabled={!editId}
                    >
                        2. Edit & Publish
                    </Button>
                    {badgeLabel && <Badge variant="secondary">{badgeLabel}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                    {stage === "generate"
                        ? "Set the brief, generate, and review before saving to the editor."
                        : "Finalize content, publishing status, SEO, and LinkedIn distribution."}
                </div>
            </AdminActionBar>

            {!editId && stage === "edit" && (
                <AdminSectionCard className="text-sm text-muted-foreground">
                    Generate a draft first, then continue to editing and publishing.
                </AdminSectionCard>
            )}

            {stage === "generate" && (
                <AILab
                    redirectTab="article-studio"
                    embedded
                    onDraftSaved={(newArticleId) => {
                        setStage("edit");
                        replaceStudioState("edit", newArticleId);
                    }}
                />
            )}

            {stage === "edit" && (
                editId ? (
                    <ArticleEditor
                        articleId={editId}
                        embedded
                        onClose={() => {
                            setStage("generate");
                            replaceStudioState("generate", null);
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
