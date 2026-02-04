"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AILab from "@/components/admin/AILab";
import ArticleEditor from "@/components/admin/ArticleEditor";

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
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Article Studio</h2>
                    <p className="text-sm text-muted-foreground">
                        Generate, refine, and publish articles from one workspace.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
            </div>

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
                    <div className="rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
                        Generate an article first to begin editing, or open one from the Articles list.
                    </div>
                )
            )}
        </div>
    );
}
