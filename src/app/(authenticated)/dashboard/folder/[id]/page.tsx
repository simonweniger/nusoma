"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { useRouter, useParams } from "next/navigation";
import { Plus, Image, Settings, ChevronDown } from "lucide-react";
import { useState } from "react";
import FolderDialog from "@/components/FolderDialog";
import FolderSettingsDialog from "@/components/FolderSettingsDialog";
import { useCanvasOperations } from "@/hooks/useCanvasOperations";
import { CanvasCard } from "@/components/CanvasCard";

export default function FolderPage() {
  const router = useRouter();
  const params = useParams();
  const folderId = params.id as string;

  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  const { createCanvas, deleteCanvas } = useCanvasOperations({ folderId });

  // Query the specific folder with its projects
  const { data, isLoading } = db.useQuery({
    folders: {
      $: {
        where: { id: folderId },
      },
      projects: {
        elements: {},
      },
    },
  });

  const folder = data?.folders?.[0];
  const canvasProjects = folder?.projects || [];

  const handleRenameFolder = async (name: string) => {
    if (!folder) return;

    await db.transact([db.tx.folders[folderId].update({ name })]);
    setIsFolderDialogOpen(false);
  };

  const handleDeleteFolder = async () => {
    if (!folder) return;

    if (
      !confirm(
        "Delete this folder? All canvases will be moved to Drafts. This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      // Unlink all projects from this folder
      if (folder.projects && folder.projects.length > 0) {
        const unlinkTxs = folder.projects.map((project: any) =>
          db.tx.canvasProjects[project.id].unlink({ folder: folderId }),
        );
        await db.transact(unlinkTxs);
      }

      // Delete the folder
      await db.transact([db.tx.folders[folderId].delete()]);

      // Navigate back to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error deleting folder:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/4 mb-8"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Folder not found</h2>
            <p className="text-muted-foreground mb-4">
              This folder doesn&apos;t exist or you don&apos;t have access to
              it.
            </p>
            <Button onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Folder Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-start gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{folder.name}</h1>
              <p className="text-muted-foreground">
                {canvasProjects.length} canvas
                {canvasProjects.length === 1 ? "" : "es"} in this folder
              </p>
            </div>
          </div>

          {/* Figma-style Action Panel */}
          <div className="flex items-center gap-2">
            <Button onClick={createCanvas} className="gap-2">
              <Plus className="h-4 w-4" />
              Create
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setIsSettingsDialogOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Canvas Projects Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Canvases</h2>
            <Button onClick={createCanvas}>
              <Plus className="h-4 w-4 mr-2" />
              New Canvas
            </Button>
          </div>

          {canvasProjects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Image className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No canvases in this folder
                </h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Create your first canvas in this folder
                </p>
                <Button onClick={createCanvas}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Canvas
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {canvasProjects.map((canvas: any) => (
                <CanvasCard
                  key={canvas.id}
                  canvas={canvas}
                  onDelete={deleteCanvas}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rename Folder Dialog */}
      <FolderDialog
        isOpen={isFolderDialogOpen}
        onClose={() => setIsFolderDialogOpen(false)}
        onSubmit={handleRenameFolder}
        initialName={folder.name}
        mode="rename"
      />

      {/* Settings Dialog */}
      <FolderSettingsDialog
        isOpen={isSettingsDialogOpen}
        onClose={() => setIsSettingsDialogOpen(false)}
        onRename={handleRenameFolder}
        onDelete={handleDeleteFolder}
        initialName={folder.name}
      />
    </div>
  );
}
