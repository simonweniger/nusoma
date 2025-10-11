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

      // Convert blob to File
      const file = new File([blob], `${assetId}.png`, { type: blob.type });
      const uploadResult = await db.storage.upload(path, file);
      const url = uploadResult ? (uploadResult as any).url : "";

      // Create asset record
      const txs = [
        db.tx.canvasAssets[assetId].update({
          type: "image",
          filePath: path,
          fileUrl: url,
          createdAt: new Date(),
        }),
      ];

      if (this.userId) {
        txs.push(db.tx.canvasAssets[assetId].link({ user: this.userId }));
      }

      await db.transact(txs);

      // Remove from temporary storage
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
        },
      });

      const asset = result.data.canvasAssets[0];
      if (!asset) return undefined;

      return {
        id: asset.id,
        originalDataUrl: asset.fileUrl,
        uploadedUrl: asset.fileUrl,
        createdAt: new Date(asset.createdAt).getTime(),
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
      const uploadResult = await db.storage.upload(path, file);
      const url = uploadResult ? (uploadResult as any).url : "";

      // Create asset record
      const txs = [
        db.tx.canvasAssets[assetId].update({
          type: "video",
          filePath: path,
          fileUrl: url,
          duration,
          createdAt: new Date(),
        }),
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
        },
      });

      const asset = result.data.canvasAssets[0];
      if (!asset) return undefined;

      return {
        id: asset.id,
        originalDataUrl: asset.fileUrl,
        uploadedUrl: asset.fileUrl,
        duration: asset.duration || 0,
        createdAt: new Date(asset.createdAt).getTime(),
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

      // Delete existing elements
      const existingElements = await db.queryOnce({
        canvasElements: {
          $: {
            where: {
              "project.id": projectId,
            },
          },
        },
      });

      const deleteTxs = existingElements.data.canvasElements.map((el) =>
        db.tx.canvasElements[el.id].delete(),
      );

      if (deleteTxs.length > 0) {
        await db.transact(deleteTxs);
      }

      // Create new elements
      const elementTxs = state.elements.flatMap((element) => {
        const elementId = element.id;
        const txs = [
          db.tx.canvasElements[elementId].update({
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
          }),
          db.tx.canvasElements[elementId].link({ project: projectId }),
        ];

        // Link to asset if it exists
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
        return null;
      }

      const result = await db.queryOnce({
        canvasProjects: {
          $: {
            where: whereClause,
            limit: 1,
          },
          elements: {
            asset: {},
          },
        },
      });

      const projects = result.data.canvasProjects || [];
      const project = projects[0];
      if (!project) return null;

      this.currentProjectId = project.id;

      const elements: CanvasElement[] = (project.elements || []).map(
        (el: any) => ({
          id: el.id,
          type: el.type,
          imageId: el.type === "image" ? el.asset?.id : undefined,
          videoId: el.type === "video" ? el.asset?.id : undefined,
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
        }),
      );

      return {
        elements,
        backgroundColor: project.backgroundColor,
        lastModified: new Date(project.lastModified).getTime(),
        viewport: {
          x: project.viewportX,
          y: project.viewportY,
          scale: project.viewportScale,
        },
      };
    } catch (error) {
      console.error("Failed to get canvas state:", error);
      return null;
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
      const result = await db.queryOnce({
        canvasProjects: {
          $: {
            where: whereClause,
          },
          elements: {},
        },
      });

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
      const result = await db.queryOnce({
        canvasProjects: {
          $: {
            where: whereClause,
            order: { lastModified: "desc" },
          },
        },
      });

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
