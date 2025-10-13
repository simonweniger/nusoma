import { db } from "./db";
import { id } from "@instantdb/react";

interface CanvasImage {
  id: string;
  originalDataUrl: string;
  uploadedUrl?: string;
  createdAt: number;
}

interface ImageTransform {
  scale: number;
  x: number;
  y: number;
  rotation: number;
  cropBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface CanvasElement {
  id: string;
  type: "image" | "text" | "shape" | "video";
  imageId?: string;
  videoId?: string;
  transform: ImageTransform;
  zIndex: number;
  width?: number;
  height?: number;
  // Video-specific properties
  duration?: number;
  currentTime?: number;
  isPlaying?: boolean;
  volume?: number;
  muted?: boolean;
}

export interface CanvasState {
  elements: CanvasElement[];
  backgroundColor?: string;
  lastModified: number;
  viewport?: {
    x: number;
    y: number;
    scale: number;
  };
}

interface CanvasVideo {
  id: string;
  originalDataUrl: string;
  uploadedUrl?: string;
  duration: number;
  createdAt: number;
}

class InstantCanvasStorage {
  private userId: string | null = null;
  private sessionId: string | null = null;
  private currentProjectId: string | null = null;

  // Map to store data URLs temporarily (before upload)
  private imageDataUrls: Map<string, string> = new Map();
  private videoDataUrls: Map<string, string> = new Map();

  /**
   * Initialize storage with user or session ID
   */
  setUser(userId: string | null, sessionId: string | null) {
    this.userId = userId;
    this.sessionId = sessionId;
  }

  /**
   * Set the current project ID (for loading a specific project)
   */
  setCurrentProject(projectId: string) {
    this.currentProjectId = projectId;
  }

  /**
   * Get or create the current project
   */
  private async getCurrentProject() {
    if (this.currentProjectId) {
      // Verify the project exists and belongs to this user
      const result = await db.queryOnce({
        canvasProjects: {
          $: {
            where: {
              id: this.currentProjectId,
            },
          },
        },
      });

      if (result.data.canvasProjects.length > 0) {
        return this.currentProjectId;
      }
      // If project doesn't exist, create it with this ID
      const txs = [
        db.tx.canvasProjects[this.currentProjectId].update({
          name: "Untitled Canvas",
          viewportX: 0,
          viewportY: 0,
          viewportScale: 1,
          lastModified: new Date(),
          ...(this.sessionId && { sessionId: this.sessionId }),
        }),
      ];

      if (this.userId) {
        txs.push(
          db.tx.canvasProjects[this.currentProjectId].link({
            user: this.userId,
          }),
        );
      }

      await db.transact(txs);
      return this.currentProjectId;
    }

    // Query for existing project
    const whereClause = this.userId
      ? { "user.id": this.userId }
      : this.sessionId
        ? { sessionId: this.sessionId }
        : undefined;

    if (!whereClause) {
      throw new Error("No user ID or session ID set");
    }

    const result = await db.queryOnce({
      canvasProjects: {
        $: {
          where: whereClause,
          limit: 1,
        },
      },
    });

    const projects = result.data.canvasProjects || [];
    if (projects.length > 0) {
      this.currentProjectId = projects[0].id;
      return this.currentProjectId;
    }

    // Create new project
    const projectId = id();
    const txs = [
      db.tx.canvasProjects[projectId].update({
        name: "Untitled Canvas",
        viewportX: 0,
        viewportY: 0,
        viewportScale: 1,
        lastModified: new Date(),
        ...(this.sessionId && { sessionId: this.sessionId }),
      }),
    ];

    if (this.userId) {
      txs.push(db.tx.canvasProjects[projectId].link({ user: this.userId }));
    }

    await db.transact(txs);
    this.currentProjectId = projectId;
    return projectId;
  }

  /**
   * Save an image to InstantDB storage
   */
  async saveImage(dataUrl: string, imageId?: string): Promise<string> {
    const assetId = imageId || id();

    // Store data URL temporarily
    this.imageDataUrls.set(assetId, dataUrl);

    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Upload to InstantDB storage
      const path = `canvas-images/${this.userId || this.sessionId}/${assetId}`;

      console.log(`Uploading image ${assetId} to path: ${path}`);

      // Convert blob to File
      const file = new File([blob], `${assetId}.png`, { type: blob.type });

      // Upload returns { data: { id, path } }
      const { data: fileData } = await db.storage.uploadFile(path, file);

      console.log("Upload successful! File ID:", fileData.id);

      // Create asset record and link to the file
      const txs = [
        db.tx.canvasAssets[assetId]
          .update({
            type: "image",
            createdAt: new Date(),
          })
          .link({ file: fileData.id }),
      ];

      if (this.userId) {
        txs.push(db.tx.canvasAssets[assetId].link({ user: this.userId }));
      }

      await db.transact(txs);

      // Clear temporary storage now that upload is successful
      this.imageDataUrls.delete(assetId);

      return assetId;
    } catch (error) {
      console.error("Failed to save image:", error);
      // Keep in temporary storage if upload fails
      return assetId;
    }
  }

  /**
   * Get an image from InstantDB
   */
  async getImage(assetId: string): Promise<CanvasImage | undefined> {
    // Check temporary storage first
    const dataUrl = this.imageDataUrls.get(assetId);
    if (dataUrl) {
      return {
        id: assetId,
        originalDataUrl: dataUrl,
        createdAt: Date.now(),
      };
    }

    try {
      const result = await db.queryOnce({
        canvasAssets: {
          $: {
            where: {
              id: assetId,
              type: "image",
            },
          },
          file: {}, // Query the linked file to get the URL
        },
      });

      const asset = result.data.canvasAssets[0];
      if (!asset) {
        console.warn(`Asset ${assetId} not found`);
        return undefined;
      }

      console.log(`Asset ${assetId}:`, {
        hasFile: !!asset.file,
        fileUrl: asset.file?.url,
      });

      return {
        id: asset.id,
        originalDataUrl: asset.file?.url || "",
        uploadedUrl: asset.file?.url || "",
        createdAt: asset.createdAt
          ? new Date(asset.createdAt).getTime()
          : Date.now(),
      };
    } catch (error) {
      console.error("Failed to get image:", error);
      return undefined;
    }
  }

  /**
   * Delete an image
   */
  async deleteImage(assetId: string): Promise<void> {
    this.imageDataUrls.delete(assetId);

    try {
      // Get the asset to find the file path
      const result = await db.queryOnce({
        canvasAssets: {
          $: { where: { id: assetId } },
          file: {},
        },
      });

      const asset = result.data.canvasAssets[0];
      if (asset?.file) {
        // Delete the actual file from storage
        await db.storage.delete(asset.file.path);
      }

      // Delete the asset record (this will also remove the link to the file)
      await db.transact(db.tx.canvasAssets[assetId].delete());
    } catch (error) {
      console.error("Failed to delete image:", error);
    }
  }

  /**
   * Save a video to InstantDB storage
   */
  async saveVideo(
    videoDataUrl: string,
    duration: number,
    videoId?: string,
  ): Promise<string> {
    const assetId = videoId || id();

    // Store data URL temporarily
    this.videoDataUrls.set(assetId, videoDataUrl);

    try {
      // Convert data URL to blob
      const response = await fetch(videoDataUrl);
      const blob = await response.blob();

      // Upload to InstantDB storage
      const path = `canvas-videos/${this.userId || this.sessionId}/${assetId}`;

      // Convert blob to File
      const file = new File([blob], `${assetId}.mp4`, { type: blob.type });

      // Upload returns { data: { id, path } }
      const { data: fileData } = await db.storage.uploadFile(path, file);

      // Create asset record and link to the file
      const txs = [
        db.tx.canvasAssets[assetId]
          .update({
            type: "video",
            duration,
            createdAt: new Date(),
          })
          .link({ file: fileData.id }),
      ];

      if (this.userId) {
        txs.push(db.tx.canvasAssets[assetId].link({ user: this.userId }));
      }

      await db.transact(txs);

      // Remove from temporary storage
      this.videoDataUrls.delete(assetId);

      return assetId;
    } catch (error) {
      console.error("Failed to save video:", error);
      // Keep in temporary storage if upload fails
      return assetId;
    }
  }

  /**
   * Get a video from InstantDB
   */
  async getVideo(assetId: string): Promise<CanvasVideo | undefined> {
    // Check temporary storage first
    const dataUrl = this.videoDataUrls.get(assetId);
    if (dataUrl) {
      return {
        id: assetId,
        originalDataUrl: dataUrl,
        duration: 0, // Will be updated when video loads
        createdAt: Date.now(),
      };
    }

    try {
      const result = await db.queryOnce({
        canvasAssets: {
          $: {
            where: {
              id: assetId,
              type: "video",
            },
          },
          file: {}, // Query the linked file to get the URL
        },
      });

      const asset = result.data.canvasAssets[0];
      if (!asset) return undefined;

      return {
        id: asset.id,
        originalDataUrl: asset.file?.url || "",
        uploadedUrl: asset.file?.url || "",
        duration: asset.duration || 0,
        createdAt: asset.createdAt
          ? new Date(asset.createdAt).getTime()
          : Date.now(),
      };
    } catch (error) {
      console.error("Failed to get video:", error);
      return undefined;
    }
  }

  /**
   * Delete a video
   */
  async deleteVideo(assetId: string): Promise<void> {
    this.videoDataUrls.delete(assetId);

    try {
      // Get the asset to find the file path
      const result = await db.queryOnce({
        canvasAssets: {
          $: { where: { id: assetId } },
          file: {},
        },
      });

      const asset = result.data.canvasAssets[0];
      if (asset?.file) {
        // Delete the actual file from storage
        await db.storage.delete(asset.file.path);
      }

      // Delete the asset record (this will also remove the link to the file)
      await db.transact(db.tx.canvasAssets[assetId].delete());
    } catch (error) {
      console.error("Failed to delete video:", error);
    }
  }

  /**
   * Save canvas state to InstantDB
   */
  async saveCanvasState(state: CanvasState): Promise<void> {
    try {
      const projectId = await this.getCurrentProject();

      // Update project viewport and metadata
      await db.transact([
        db.tx.canvasProjects[projectId].update({
          backgroundColor: state.backgroundColor,
          viewportX: state.viewport?.x || 0,
          viewportY: state.viewport?.y || 0,
          viewportScale: state.viewport?.scale || 1,
          lastModified: new Date(state.lastModified),
        }),
      ]);

      // Query existing elements
      const existingElements = await db.queryOnce({
        canvasElements: {
          $: {
            where: {
              "project.id": projectId,
            },
          },
        },
      });

      const existingIds = new Set(
        existingElements.data.canvasElements.map((el) => el.id),
      );
      const newElementIds = new Set(state.elements.map((el) => el.id));

      // Delete elements that are no longer in the state
      const deleteTxs = existingElements.data.canvasElements
        .filter((el) => !newElementIds.has(el.id))
        .map((el) => db.tx.canvasElements[el.id].delete());

      if (deleteTxs.length > 0) {
        await db.transact(deleteTxs);
      }

      // Update or create elements
      const elementTxs = state.elements.flatMap((element) => {
        const elementId = element.id;
        const exists = existingIds.has(elementId);

        // Build update transaction
        const updateTx = db.tx.canvasElements[elementId].update({
          type: element.type,
          x: element.transform.x,
          y: element.transform.y,
          width: element.width,
          height: element.height,
          rotation: element.transform.rotation,
          scale: element.transform.scale,
          zIndex: element.zIndex,
          cropX: element.transform.cropBox?.x,
          cropY: element.transform.cropBox?.y,
          cropWidth: element.transform.cropBox?.width,
          cropHeight: element.transform.cropBox?.height,
          duration: element.duration,
          currentTime: element.currentTime,
          isPlaying: element.isPlaying,
          volume: element.volume,
          muted: element.muted,
        });

        const txs: any[] = [updateTx];

        // Link to project if this is a new element
        if (!exists) {
          txs.push(
            db.tx.canvasElements[elementId].link({ project: projectId }),
          );
        }

        // Always ensure asset link is present (for both new and existing elements)
        if (element.imageId) {
          txs.push(
            db.tx.canvasElements[elementId].link({ asset: element.imageId }),
          );
        } else if (element.videoId) {
          txs.push(
            db.tx.canvasElements[elementId].link({ asset: element.videoId }),
          );
        }

        return txs;
      });

      if (elementTxs.length > 0) {
        await db.transact(elementTxs);
      }
    } catch (error) {
      console.error("Failed to save canvas state:", error);
      throw error;
    }
  }

  /**
   * Get canvas state from InstantDB
   */
  async getCanvasState(): Promise<CanvasState | null> {
    try {
      // If we have a specific project ID, use it
      const whereClause = this.currentProjectId
        ? { id: this.currentProjectId }
        : this.userId
          ? { "user.id": this.userId }
          : this.sessionId
            ? { sessionId: this.sessionId }
            : undefined;

      if (!whereClause) {
        console.log("No where clause - no user or session ID set");
        return null;
      }

      console.log("Querying canvas state with:", {
        currentProjectId: this.currentProjectId,
        userId: this.userId,
        sessionId: this.sessionId,
        whereClause,
      });

      const result = await db.queryOnce(
        {
          canvasProjects: {
            $: {
              where: whereClause,
              limit: 1,
            },
            elements: {
              asset: {
                file: {}, // Include the linked file to get URLs
              },
            },
          },
        },
        // Pass sessionId as a parameter for permission checks via ruleParams
        this.sessionId
          ? { ruleParams: { sessionId: this.sessionId } }
          : undefined,
      );

      console.log("Query result:", result);

      const projects = result.data.canvasProjects || [];
      const project = projects[0];

      if (!project) {
        console.log("No project found - returning null");
        return null;
      }

      this.currentProjectId = project.id;

      const elements: CanvasElement[] = (project.elements || []).map(
        (el: any) => {
          const imageId = el.type === "image" ? el.asset?.id : undefined;
          const videoId = el.type === "video" ? el.asset?.id : undefined;

          // Log if asset is missing
          if (el.type === "image" && !el.asset) {
            console.warn(`Element ${el.id} is missing asset link!`);
          }

          return {
            id: el.id,
            type: el.type,
            imageId,
            videoId,
            transform: {
              x: el.x,
              y: el.y,
              rotation: el.rotation,
              scale: el.scale,
              cropBox:
                el.cropX !== undefined
                  ? {
                      x: el.cropX,
                      y: el.cropY,
                      width: el.cropWidth,
                      height: el.cropHeight,
                    }
                  : undefined,
            },
            zIndex: el.zIndex,
            width: el.width,
            height: el.height,
            duration: el.duration,
            currentTime: el.currentTime,
            isPlaying: el.isPlaying,
            volume: el.volume,
            muted: el.muted,
          };
        },
      );

      console.log(
        "Successfully loaded canvas state with",
        elements.length,
        "elements",
      );
      console.log(
        "Elements with imageId:",
        elements.filter((e) => e.imageId).length,
      );
      console.log(
        "Elements without imageId:",
        elements.filter((e) => e.type === "image" && !e.imageId).length,
      );

      return {
        elements,
        backgroundColor: project.backgroundColor,
        lastModified: project.lastModified
          ? new Date(project.lastModified).getTime()
          : Date.now(),
        viewport: {
          x: project.viewportX ?? 0,
          y: project.viewportY ?? 0,
          scale: project.viewportScale ?? 1,
        },
      };
    } catch (error) {
      console.error("Failed to get canvas state:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return null;
    }
  }

  /**
   * Fix missing asset links for existing elements (one-time migration)
   */
  async fixMissingAssetLinks(): Promise<void> {
    try {
      console.log("Starting asset link fix...");

      const projectId = await this.getCurrentProject();

      // Get all elements for this project
      const result = await db.queryOnce({
        canvasElements: {
          $: {
            where: {
              "project.id": projectId,
            },
          },
          asset: {},
        },
      });

      const fixTxs: any[] = [];

      for (const element of result.data.canvasElements) {
        // If element has no asset link but should have one, add it
        if (!element.asset) {
          // Try to find asset by matching element ID with asset ID
          const assetResult = await db.queryOnce({
            canvasAssets: {
              $: {
                where: { id: element.id },
              },
            },
          });

          if (assetResult.data.canvasAssets.length > 0) {
            console.log(`Fixing asset link for element ${element.id}`);
            fixTxs.push(
              db.tx.canvasElements[element.id].link({
                asset: assetResult.data.canvasAssets[0].id,
              }),
            );
          }
        }
      }

      if (fixTxs.length > 0) {
        await db.transact(fixTxs);
        console.log(`Fixed ${fixTxs.length} missing asset links`);
      } else {
        console.log("No missing asset links found");
      }
    } catch (error) {
      console.error("Failed to fix asset links:", error);
    }
  }

  /**
   * Clear all canvas data
   */
  async clearAll(): Promise<void> {
    try {
      const whereClause = this.userId
        ? { "user.id": this.userId }
        : this.sessionId
          ? { sessionId: this.sessionId }
          : undefined;

      if (!whereClause) {
        return;
      }

      // Get all projects
      const result = await db.queryOnce(
        {
          canvasProjects: {
            $: {
              where: whereClause,
            },
            elements: {},
          },
        },
        // Pass sessionId as a parameter for permission checks via ruleParams
        this.sessionId
          ? { ruleParams: { sessionId: this.sessionId } }
          : undefined,
      );

      const projects = result.data.canvasProjects || [];

      // Delete all elements
      const elementTxs = projects.flatMap((project: any) =>
        (project.elements || []).map((el: any) =>
          db.tx.canvasElements[el.id].delete(),
        ),
      );

      // Delete all projects
      const projectTxs = projects.map((project: any) =>
        db.tx.canvasProjects[project.id].delete(),
      );

      // Get all assets
      const assetResult = await db.queryOnce({
        canvasAssets: {
          $: {
            where: this.userId ? { "user.id": this.userId } : {}, // For session-based, we'll need to track differently
          },
        },
      });

      // Delete all assets
      const assetTxs = assetResult.data.canvasAssets.map((asset: any) =>
        db.tx.canvasAssets[asset.id].delete(),
      );

      const allTxs = [...elementTxs, ...projectTxs, ...assetTxs];
      if (allTxs.length > 0) {
        await db.transact(allTxs);
      }

      // Clear temporary storage
      this.imageDataUrls.clear();
      this.videoDataUrls.clear();
      this.currentProjectId = null;
    } catch (error) {
      console.error("Failed to clear all data:", error);
      throw error;
    }
  }

  /**
   * Cleanup old data (keep only recent projects)
   */
  async cleanupOldData(): Promise<void> {
    try {
      const whereClause = this.userId
        ? { "user.id": this.userId }
        : this.sessionId
          ? { sessionId: this.sessionId }
          : undefined;

      if (!whereClause) {
        return;
      }

      // Get all projects sorted by last modified
      const result = await db.queryOnce(
        {
          canvasProjects: {
            $: {
              where: whereClause,
              order: { lastModified: "desc" },
            },
          },
        },
        // Pass sessionId as a parameter for permission checks via ruleParams
        this.sessionId
          ? { ruleParams: { sessionId: this.sessionId } }
          : undefined,
      );

      const projects = result.data.canvasProjects || [];
      // Keep only the most recent project, delete others
      const projectsToDelete = projects.slice(1);

      if (projectsToDelete.length > 0) {
        const txs = projectsToDelete.map((project: any) =>
          db.tx.canvasProjects[project.id].delete(),
        );
        await db.transact(txs);
      }
    } catch (error) {
      console.error("Failed to cleanup old data:", error);
    }
  }
}

// Export a singleton instance
export const canvasStorage = new InstantCanvasStorage();
