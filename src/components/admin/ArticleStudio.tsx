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

    const handleOpenAdvancedLab = () => {
        if (!confirmDirtyNavigation("open the Advanced AI Lab")) return;
        router.push("/admin?workspace=publishing&tab=ai-lab");
    };

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
                        onClick={handleOpenArticles}
                    >
                        Open Articles List
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleOpenAdvancedLab}
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
                    onClick={() => handleStageChange("generate")}
                >
                    1. Generate
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
            </AdminActionBar>

            <div className="grid gap-4 md:grid-cols-3">
                <AdminSectionCard className="space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step 1</div>
                    <div className="text-base font-semibold text-[#210059]">Brief & Generate</div>
                    <p className="text-sm text-muted-foreground">
                        Prepare topic, research depth, languages, and review the AI preview before saving.
                    </p>
                </AdminSectionCard>
                <AdminSectionCard className="space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step 2</div>
                    <div className="text-base font-semibold text-[#210059]">Edit & Publish</div>
                    <p className="text-sm text-muted-foreground">
                        Finalize article content, workflow status, SEO data, and schedule publishing.
                    </p>
                </AdminSectionCard>
                <AdminSectionCard className="space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step 3</div>
                    <div className="text-base font-semibold text-[#210059]">Distribute</div>
                    <p className="text-sm text-muted-foreground">
                        Share instantly or queue LinkedIn distribution once the article URL and assets are ready.
                    </p>
                </AdminSectionCard>
            </div>

            {stage === "generate" && (
                <AILab
                    redirectTab="article-studio"
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
