import { useAuth } from "@/providers/auth-provider";
import { db } from "@/lib/db";
import { id } from "@instantdb/react";
import { useRouter } from "next/navigation";

interface UseCanvasOperationsOptions {
  folderId?: string;
}

export function useCanvasOperations(options: UseCanvasOperationsOptions = {}) {
  const { user, sessionId } = useAuth();
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
      console.log(`[DELETE] Starting deletion of canvas ${projectId}...`);
      const startTime = performance.now();

      // Step 1: Get all elements and their assets for this project
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

      const elementsCount = result.data.canvasElements.length;
      const assetIds = new Set<string>();
      const filePaths = new Set<string>();

      result.data.canvasElements.forEach((el: any) => {
        if (el.asset) {
          assetIds.add(el.asset.id);
          if (el.asset.file?.path) {
            filePaths.add(el.asset.file.path);
          }
        }
      });

      console.log(
        `[DELETE] Found ${elementsCount} elements using ${assetIds.size} assets with ${filePaths.size} storage files`,
      );

      // Step 2: Check which assets will be orphaned after deleting this project's elements
      const assetsCheck = await db.queryOnce({
        canvasAssets: {
          $: {
            where: { id: { $in: Array.from(assetIds) } },
          },
          elements: {}, // Get all linked elements (from all projects)
          file: {}, // Get file info for storage cleanup
        },
      });

      // Find assets that are ONLY used by this project (will be orphaned after deletion)
      const orphanedAssets = assetsCheck.data.canvasAssets.filter(
        (asset: any) => {
          if (!asset.elements || asset.elements.length === 0) return true;
          // Check if all elements belong to this project
          return asset.elements.every((el: any) =>
            result.data.canvasElements.some(
              (projectEl: any) => projectEl.id === el.id,
            ),
          );
        },
      );

      console.log(
        `[DELETE] Found ${orphanedAssets.length}/${assetIds.size} assets that will be orphaned`,
      );

      // Step 3: Build single optimized transaction to delete everything
      // CRITICAL: Delete orphaned assets BEFORE deleting elements
      // This way the permission check can still verify via elements.project.user.id
      const deleteTxs = [
        // Delete orphaned assets first (while elements still exist for permission check)
        ...orphanedAssets.map((asset: any) =>
          db.tx.canvasAssets[asset.id].delete(),
        ),
        // Delete all elements
        ...result.data.canvasElements.map((el: any) =>
          db.tx.canvasElements[el.id].delete(),
        ),
        // Delete the project (history will cascade delete)
        db.tx.canvasProjects[projectId].delete(),
      ];

      // Execute transaction - permission checks use auth.id from authenticated session
      console.log(
        `[DELETE] Executing transaction to delete database records...`,
      );
      await db.transact(deleteTxs);
      console.log(
        `[DELETE] Deleted ${orphanedAssets.length} assets, ${elementsCount} elements, and project`,
      );

      // Step 4: Delete physical storage files in parallel (AFTER successful DB transaction)
      if (orphanedAssets.length > 0 && filePaths.size > 0) {
        console.log(`[DELETE] Deleting ${filePaths.size} storage files...`);
        const storageDeletePromises = Array.from(filePaths).map(
          async (filePath: string) => {
            try {
              await db.storage.delete(filePath);
              return { success: true, filePath };
            } catch (error) {
              console.error(`Failed to delete file ${filePath}:`, error);
              return { success: false, filePath, error };
            }
          },
        );

        const results = await Promise.allSettled(storageDeletePromises);
        const failed = results.filter(
          (r) => r.status === "fulfilled" && !r.value.success,
        ).length;

        if (failed > 0) {
          console.warn(
            `[DELETE] Failed to delete ${failed}/${filePaths.size} storage files`,
          );
        } else {
          console.log(`[DELETE] Successfully deleted all storage files`);
        }
      }

      const endTime = performance.now();
      console.log(
        `[DELETE] Successfully deleted canvas ${projectId} in ${Math.round(endTime - startTime)}ms`,
      );
    } catch (error) {
      console.error("[DELETE] Error deleting canvas:", error);
      alert("Failed to delete canvas. Please try again.");
      throw error;
    }
  };

  return {
    createCanvas,
    deleteCanvas,
  };
}
