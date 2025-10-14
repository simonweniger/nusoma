"use client";

import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import { useRouter, useParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Plus, Image, Trash2, Edit, FolderOpen } from "lucide-react";
import { useState } from "react";
import FolderDialog from "@/components/FolderDialog";

export default function FolderPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const folderId = params.id as string;

  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);

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

  const handleCreateCanvas = async () => {
    if (!user || !folder) return;

    try {
      const projectId = id();
      await db.transact([
        db.tx.canvasProjects[projectId].update({
          name: "Untitled Canvas",
          viewportX: 0,
          viewportY: 0,
          viewportScale: 1,
          lastModified: new Date(),
        }),
        db.tx.canvasProjects[projectId].link({ user: user.id }),
        db.tx.canvasProjects[projectId].link({ folder: folderId }),
      ]);

      // Navigate to the new canvas
      router.push(`/canvas/${projectId}`);
    } catch (error) {
      console.error("Error creating canvas:", error);
    }
  };

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

  const handleDeleteCanvas = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking delete

    if (
      !confirm(
        "Are you sure you want to delete this canvas? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      // Get all elements with their assets for this project
      const result = await db.queryOnce({
        canvasElements: {
          $: {
            where: { "project.id": projectId },
          },
          asset: {
            file: {}, // Include the linked file to get the path
          },
        },
      });

      // Collect all unique asset IDs and their file paths
      const assetMap = new Map<string, string>();
      result.data.canvasElements.forEach((el: any) => {
        if (el.asset?.file) {
          assetMap.set(el.asset.id, el.asset.file.path);
        }
      });

      // Delete files from storage first
      for (const [assetId, filePath] of assetMap.entries()) {
        try {
          if (filePath) {
            await db.storage.delete(filePath);
          }
        } catch (error) {
          console.error(`Failed to delete file ${filePath}:`, error);
        }
      }

      // Delete all elements and assets
      const elementTxs = result.data.canvasElements.map((el: any) =>
        db.tx.canvasElements[el.id].delete(),
      );
      const assetTxs = Array.from(assetMap.keys()).map((assetId) =>
        db.tx.canvasAssets[assetId].delete(),
      );

      // Then delete the project
      await db.transact([
        ...elementTxs,
        ...assetTxs,
        db.tx.canvasProjects[projectId].delete(),
      ]);
    } catch (error) {
      console.error("Error deleting canvas:", error);
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
            <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Folder not found</h2>
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
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Folder Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-start gap-3">
            <FolderOpen className="h-8 w-8 text-sage-11 mt-1" />
            <div>
              <h1 className="text-3xl font-bold">{folder.name}</h1>
              <p className="text-muted-foreground">
                {canvasProjects.length} canvas
                {canvasProjects.length === 1 ? "" : "es"} in this folder
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsFolderDialogOpen(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Rename
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteFolder}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Folder
            </Button>
          </div>
        </div>

        {/* Canvas Projects Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Canvases</h2>
            <Button onClick={handleCreateCanvas}>
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
                <Button onClick={handleCreateCanvas}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Canvas
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {canvasProjects.map((canvas: any) => (
                <Card
                  key={canvas.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("projectId", canvas.id);
                    e.dataTransfer.effectAllowed = "move";
                    const target = e.currentTarget as HTMLElement;
                    target.style.opacity = "0.5";
                  }}
                  onDragEnd={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    target.style.opacity = "1";
                  }}
                  className="cursor-grab active:cursor-grabbing hover:border-primary transition-all duration-200 group"
                  onClick={() => router.push(`/canvas/${canvas.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="truncate">
                          {canvas.name || "Untitled Canvas"}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {formatDistanceToNow(new Date(canvas.lastModified), {
                            addSuffix: true,
                          })}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDeleteCanvas(canvas.id, e)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Image className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">
                          {canvas.elements?.length || 0} element
                          {canvas.elements?.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
    </div>
  );
}
