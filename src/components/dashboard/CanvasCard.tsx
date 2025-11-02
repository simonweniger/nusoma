import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Image, Trash2, FolderIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface CanvasCardProps {
  canvas: {
    id: string;
    name?: string;
    lastModified: number;
    elements?: any[];
    folder?: {
      name: string;
    };
  };
  onDelete: (canvasId: string, event: React.MouseEvent) => void;
  showFolder?: boolean;
}

export function CanvasCard({
  canvas,
  onDelete,
  showFolder = false,
}: CanvasCardProps) {
  const router = useRouter();

  return (
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
      className="rounded-xl cursor-grab active:cursor-grabbing hover:ring-1 hover:ring-primary transition-all duration-200 group p-0"
      onClick={() => router.push(`/canvas/${canvas.id}`)}
    >
      <CardHeader className="p-0">
        <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center">
          <div className="text-center">
            <Image className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              {canvas.elements?.length || 0} element
              {canvas.elements?.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between pt-6">
          <div className="flex-1 min-w-0 space-y-1">
            <CardTitle className="truncate">
              {canvas.name || "Untitled Canvas"}
            </CardTitle>
            <CardDescription className="font-mono leading-tight text-xs flex items-center">
              {showFolder && canvas.folder && (
                <span className="flex items-center gap-1 text-sage-11">
                  <FolderIcon className="h-3 w-3" />
                  {canvas.folder.name} •{" "}
                </span>
              )}
              {formatDistanceToNow(new Date(canvas.lastModified), {
                addSuffix: true,
              })}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => onDelete(canvas.id, e)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
