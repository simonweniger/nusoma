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
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Plus, Image } from "lucide-react";
import { useCanvasOperations } from "@/hooks/useCanvasOperations";
import { CanvasCard } from "@/components/CanvasCard";

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { createCanvas, deleteCanvas } = useCanvasOperations();

  // Query all canvas projects with their folders
  const { data, isLoading } = db.useQuery({
    canvasProjects: {
      $: {
        where: { "user.id": user?.id },
        order: { lastModified: "desc" },
      },
      elements: {},
      folder: {},
    },
  });

  const canvasProjects = data?.canvasProjects || [];

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

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-start gap-3">
            <div>
              <h1 className="text-3xl font-bold">All Projects</h1>
              <p className="text-muted-foreground">
                {canvasProjects.length} canvas
                {canvasProjects.length === 1 ? "" : "es"} across all folders
              </p>
            </div>
          </div>
          <Button onClick={createCanvas}>
            <Plus className="h-4 w-4 mr-2" />
            New Canvas
          </Button>
        </div>

        {/* Canvas Projects Section */}
        <div className="mb-8">
          {canvasProjects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Image className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No canvases yet</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Create your first canvas to get started
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
                  showFolder={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
