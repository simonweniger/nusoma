import type {
  PlacedImage,
  GenerationSettings,
  ActiveGeneration,
} from "@/types/canvas";
import type { FalClient } from "@fal-ai/client";
import { id } from "@instantdb/react";

interface GenerationHandlerDeps {
  images: PlacedImage[];
  selectedIds: string[];
  generationSettings: GenerationSettings;
  canvasSize: { width: number; height: number };
  viewport: { x: number; y: number; scale: number };
  falClient: FalClient;
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, ActiveGeneration>>
  >;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  toast: (props: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => void;
  generateTextToImage: (params: any) => Promise<any>;
}

export const uploadImageDirect = async (
  dataUrl: string,
  falClient: FalClient,
  toast: GenerationHandlerDeps["toast"],
) => {
  // Convert data URL to blob first
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  try {
    // Check size before attempting upload
    if (blob.size > 10 * 1024 * 1024) {
      // 10MB warning
      console.warn(
        "Large image detected:",
        (blob.size / 1024 / 1024).toFixed(2) + "MB",
      );
    }

    // Upload directly to FAL through proxy (using the client instance)
    const uploadResult = await falClient.storage.upload(blob);

    return { url: uploadResult };
  } catch (error: any) {
    // Check for rate limit error
    const isRateLimit =
      error.status === 429 ||
      error.message?.includes("429") ||
      error.message?.includes("rate limit") ||
      error.message?.includes("Rate limit");

    if (isRateLimit) {
      toast({
        title: "Rate limit exceeded",
        description:
          "Add your FAL API key to bypass rate limits. Without an API key, uploads are limited.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Failed to upload image",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }

    // Re-throw the error so calling code knows upload failed
    throw error;
  }
};

export const generateImage = (
  imageUrl: string,
  x: number,
  y: number,
  groupId: string,
  generationSettings: GenerationSettings,
  setImages: GenerationHandlerDeps["setImages"],
  setActiveGenerations: GenerationHandlerDeps["setActiveGenerations"],
  width: number = 300,
  height: number = 300,
) => {
  const placeholderId = id(); // Use UUID from InstantDB
  setImages((prev) => [
    ...prev,
    {
      id: placeholderId,
      src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      x,
      y,
      width,
      height,
      rotation: 0,
      isGenerated: true,
      parentGroupId: groupId,
      generationPrompt: generationSettings.prompt,
      creditsConsumed: undefined,
    },
  ]);

  // Store generation params
  setActiveGenerations((prev) =>
    new Map(prev).set(placeholderId, {
      imageUrl,
      prompt: generationSettings.prompt,
      loraUrl: generationSettings.loraUrl,
      state: "submitting", // Initial state
    }),
  );
};

export const handleRun = async (deps: GenerationHandlerDeps) => {
  const {
    images,
    selectedIds,
    generationSettings,
    canvasSize,
    viewport,
    falClient,
    setImages,
    setSelectedIds,
    setActiveGenerations,
    setIsGenerating,
    toast,
    generateTextToImage,
  } = deps;

  if (!generationSettings.prompt) {
    toast({
      title: "No Prompt",
      description: "Please enter a prompt to generate an image",
      variant: "destructive",
    });
    return;
  }

  setIsGenerating(true);
  const selectedImages = images.filter((img) => selectedIds.includes(img.id));

  // If no images are selected, do text-to-image generation
  if (selectedImages.length === 0) {
    // Create placeholder image immediately
    const imageId = id(); // Use UUID from InstantDB

    // Place at center of viewport
    const viewportCenterX =
      (canvasSize.width / 2 - viewport.x) / viewport.scale;
    const viewportCenterY =
      (canvasSize.height / 2 - viewport.y) / viewport.scale;

    const width = 512;
    const height = 512;

    // Add placeholder image
    setImages((prev) => [
      ...prev,
      {
        id: imageId,
        src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        x: viewportCenterX - width / 2,
        y: viewportCenterY - height / 2,
        width,
        height,
        rotation: 0,
        isGenerated: true,
        generationPrompt: generationSettings.prompt,
        creditsConsumed: undefined,
      },
    ]);

    // Add to active generations - StreamingImage will handle the actual generation
    setActiveGenerations((prev) =>
      new Map(prev).set(imageId, {
        imageUrl: undefined, // No source image for text-to-image
        prompt: generationSettings.prompt,
        loraUrl: generationSettings.loraUrl,
        state: "submitting", // Initial state
      }),
    );

    // Select the new placeholder
    setSelectedIds([imageId]);

    // Note: setIsGenerating(false) will be called by StreamingImage onComplete/onError
    return;
  }

  // Process each selected image individually for image-to-image
  let successCount = 0;
  let failureCount = 0;

  for (const img of selectedImages) {
    try {
      // Get crop values
      const cropX = img.cropX || 0;
      const cropY = img.cropY || 0;
      const cropWidth = img.cropWidth || 1;
      const cropHeight = img.cropHeight || 1;

      // Load the image
      const imgElement = new window.Image();
      imgElement.crossOrigin = "anonymous"; // Enable CORS
      imgElement.src = img.src;
      await new Promise((resolve) => {
        imgElement.onload = resolve;
      });

      // Create a canvas for the image at original resolution
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get canvas context");

      // Calculate the effective original dimensions accounting for crops
      let effectiveWidth = imgElement.naturalWidth;
      let effectiveHeight = imgElement.naturalHeight;

      if (cropWidth !== 1 || cropHeight !== 1) {
        effectiveWidth = cropWidth * imgElement.naturalWidth;
        effectiveHeight = cropHeight * imgElement.naturalHeight;
      }

      // Set canvas size to the original resolution (not display size)
      canvas.width = effectiveWidth;
      canvas.height = effectiveHeight;

      console.log(
        `Processing image at ${canvas.width}x${canvas.height} (original res, display: ${img.width}x${img.height})`,
      );

      // Always use the crop values (default to full image if not set)
      ctx.drawImage(
        imgElement,
        cropX * imgElement.naturalWidth,
        cropY * imgElement.naturalHeight,
        cropWidth * imgElement.naturalWidth,
        cropHeight * imgElement.naturalHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      // Convert to blob and upload
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/png");
      });

      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(blob);
      });

      let uploadResult;
      try {
        uploadResult = await uploadImageDirect(dataUrl, falClient, toast);
      } catch (uploadError) {
        console.error("Failed to upload image:", uploadError);
        failureCount++;
        // Skip this image if upload fails
        continue;
      }

      // Only proceed with generation if upload succeeded
      if (!uploadResult?.url) {
        console.error("Upload succeeded but no URL returned");
        failureCount++;
        continue;
      }

      // Calculate output size maintaining aspect ratio
      const aspectRatio = canvas.width / canvas.height;
      const baseSize = 512;
      let outputWidth = baseSize;
      let outputHeight = baseSize;

      if (aspectRatio > 1) {
        outputHeight = Math.round(baseSize / aspectRatio);
      } else {
        outputWidth = Math.round(baseSize * aspectRatio);
      }

      const groupId = id(); // Use UUID from InstantDB
      generateImage(
        uploadResult.url,
        img.x + img.width + 20,
        img.y,
        groupId,
        generationSettings,
        setImages,
        setActiveGenerations,
        img.width,
        img.height,
      );
      successCount++;
    } catch (error) {
      console.error("Error processing image:", error);
      failureCount++;
      toast({
        title: "Failed to process image",
        description:
          error instanceof Error ? error.message : "Failed to process image",
        variant: "destructive",
      });
    }
  }

  // Done processing all images
  setIsGenerating(false);
};
