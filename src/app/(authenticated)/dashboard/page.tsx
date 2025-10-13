"use client";

import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Plus, Image, Trash2 } from "lucide-react";

export default function Dashboard() {
  const { user, profile } = useAuth();
  const router = useRouter();

  // Query for user's canvas projects
  const { data: projectsData, isLoading } = db.useQuery({
    canvasProjects: {
      $: {
        where: { "user.id": user?.id },
        order: { lastModified: "desc" },
      },
      elements: {},
    },
  });

  const canvasProjects = projectsData?.canvasProjects || [];

  const handleSignOut = async () => {
    try {
      await db.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleCreateCanvas = async () => {
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
        db.tx.canvasProjects[projectId].link({ user: user?.id }),
      ]);

      // Navigate to the new canvas
      router.push(`/canvas/${projectId}`);
    } catch (error) {
      console.error("Error creating canvas:", error);
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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.email}</p>
          </div>
          <Button onClick={handleSignOut} variant="secondary">
            Sign Out
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>
                  <strong>Email:</strong> {user?.email}
                </p>
                <p>
                  <strong>User ID:</strong> {user?.id}
                </p>
                {profile && (
                  <>
                    <p>
                      <strong>Credits:</strong> {profile.credits || 0}
                    </p>
                    <p>
                      <strong>Theme:</strong> {profile.theme || "Default"}
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={handleCreateCanvas}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Canvas
                </Button>
                <Button className="w-full" variant="secondary">
                  Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>Your canvas stats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>
                  <strong>Total Canvases:</strong> {canvasProjects.length}
                </p>
                <p>
                  <strong>Total Elements:</strong>{" "}
                  {canvasProjects.reduce(
                    (acc: number, p: any) => acc + (p.elements?.length || 0),
                    0,
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Canvas Projects Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold">Your Canvases</h2>
              <p className="text-muted-foreground">
                {isLoading
                  ? "Loading..."
                  : canvasProjects.length === 0
                    ? "No canvases yet. Create your first one!"
                    : `${canvasProjects.length} canvas${canvasProjects.length === 1 ? "" : "es"}`}
              </p>
            </div>
            <Button onClick={handleCreateCanvas}>
              <Plus className="h-4 w-4 mr-2" />
              New Canvas
            </Button>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-5 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : canvasProjects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Image className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No canvases yet</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Create your first canvas to start designing
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
                  className="cursor-pointer hover:border-primary transition-colors group"
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
    </div>
  );
}
