import { useAuth } from "@/providers/auth-provider";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import { useRouter } from "next/navigation";

interface UseCanvasOperationsOptions {
  folderId?: string;
}

export function useCanvasOperations(options: UseCanvasOperationsOptions = {}) {
  const { user } = useAuth();
  const router = useRouter();
  const { folderId } = options;

  const createCanvas = async () => {
    if (!user) {
      console.error("No user found - cannot create canvas");
      return;
    }

    try {
      const projectId = id();
      const txs = [
        db.tx.canvasProjects[projectId].update({
          name: "Untitled Canvas",
          viewportX: 0,
          viewportY: 0,
          viewportScale: 1,
          lastModified: new Date(),
        }),
        db.tx.canvasProjects[projectId].link({ user: user.id }),
      ];

      // Link to folder if folderId is provided
      if (folderId) {
        txs.push(db.tx.canvasProjects[projectId].link({ folder: folderId }));
      }
      await db.transact(txs);
      const verifyResult = await db.queryOnce({
        canvasProjects: {
          $: {
            where: {
              id: projectId,
              "user.id": user.id,
            },
          },
          user: {}, // Include user to verify the link
        },
      });

      if (verifyResult.data.canvasProjects.length === 0) {
        console.error(
          "❌ [CREATE] Project was not created successfully or not linked to user",
        );
        console.error("❌ [CREATE] User ID:", user.id);
        console.error("❌ [CREATE] Project ID:", projectId);
        throw new Error("Failed to create canvas project");
      }

      const project = verifyResult.data.canvasProjects[0];

      if (!project.user) {
        throw new Error("Canvas project not properly linked to user");
      }
      // Navigate to the new canvas
      router.push(`/canvas/${projectId}`);
    } catch (error) {
      console.error("Error creating canvas:", error);
      alert("Failed to create canvas. Please try again.");
    }
  };

  const deleteCanvas = async (projectId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent navigation when clicking delete
    }

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

  return {
    createCanvas,
    deleteCanvas,
  };
}
