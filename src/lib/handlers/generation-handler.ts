import type {
  PlacedImage,
  PlacedVideo,
  GenerationSettings,
  ActiveGeneration,
} from "@/types/canvas";
import type { FalClient } from "@fal-ai/client";
import { id } from "@instantdb/react";

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GenerationHandlerDeps {
  images: PlacedImage[];
  videos: PlacedVideo[];
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

/**
 * Check if two bounding boxes overlap
 */
const boxesOverlap = (
  a: BoundingBox,
  b: BoundingBox,
  padding = 10,
): boolean => {
  return !(
    a.x + a.width + padding <= b.x ||
    b.x + b.width + padding <= a.x ||
    a.y + a.height + padding <= b.y ||
    b.y + b.height + padding <= a.y
  );
};

/**
 * Find a non-overlapping position for a new asset
 * Starts at the preferred position and searches for a free spot
 */
const findNonOverlappingPosition = (
  preferredX: number,
  preferredY: number,
  width: number,
  height: number,
  existingAssets: BoundingBox[],
  maxAttempts = 50,
): { x: number; y: number } => {
  const newBox: BoundingBox = { x: preferredX, y: preferredY, width, height };

  // Check if preferred position is free
  const hasOverlap = existingAssets.some((asset) =>
    boxesOverlap(newBox, asset),
  );
  if (!hasOverlap) {
    return { x: preferredX, y: preferredY };
  }

  // Try positions in a spiral pattern: right, down, left, up
  const gap = 20;
  let attempt = 0;
  let offsetX = 0;
  let offsetY = 0;
  let direction = 0; // 0=right, 1=down, 2=left, 3=up
  let stepsInDirection = 1;
  let stepsTaken = 0;
  let directionChanges = 0;

  while (attempt < maxAttempts) {
    // Move in current direction
    switch (direction) {
      case 0:
        offsetX += width + gap;
        break; // right
      case 1:
        offsetY += height + gap;
        break; // down
      case 2:
        offsetX -= width + gap;
        break; // left
      case 3:
        offsetY -= height + gap;
        break; // up
    }
    stepsTaken++;
    attempt++;

    const testBox: BoundingBox = {
      x: preferredX + offsetX,
      y: preferredY + offsetY,
      width,
      height,
    };

    const overlaps = existingAssets.some((asset) =>
      boxesOverlap(testBox, asset),
    );
    if (!overlaps) {
      return { x: testBox.x, y: testBox.y };
    }

    // Change direction after completing steps
    if (stepsTaken >= stepsInDirection) {
      stepsTaken = 0;
      direction = (direction + 1) % 4;
      directionChanges++;
      // Increase steps every 2 direction changes (completing a half-spiral)
      if (directionChanges % 2 === 0) {
        stepsInDirection++;
      }
    }
  }

  // Fallback: just offset down if no free spot found
  return { x: preferredX, y: preferredY + height + gap };
};

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
  imageUrl: string | undefined,
  preferredX: number,
  preferredY: number,
  groupId: string,
  generationSettings: GenerationSettings,
  setImages: GenerationHandlerDeps["setImages"],
  setActiveGenerations: GenerationHandlerDeps["setActiveGenerations"],
  width: number = 300,
  height: number = 300,
  existingAssets: BoundingBox[] = [],
  imageUrls?: string[], // Optional array for multi-image generation
) => {
  // Find a non-overlapping position
  const { x, y } = findNonOverlappingPosition(
    preferredX,
    preferredY,
    width,
    height,
    existingAssets,
  );

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
      imageUrls, // Multiple images for @ references
      prompt: generationSettings.prompt,
      loraUrl: generationSettings.loraUrl,
      state: "submitting", // Initial state
    }),
  );
};

export const handleRun = async (deps: GenerationHandlerDeps) => {
  const {
    images,
    videos,
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
  } = deps;

  if (!generationSettings.prompt) {
    toast({
      title: "No Prompt",
      description: "Please enter a prompt to generate an image",
      variant: "destructive",
    });
    return;
  }

  // Collect all existing assets as bounding boxes for collision detection
  const existingAssets: BoundingBox[] = [
    ...images.map((img) => ({
      x: img.x,
      y: img.y,
      width: img.width,
      height: img.height,
    })),
    ...videos.map((vid) => ({
      x: vid.x,
      y: vid.y,
      width: vid.width,
      height: vid.height,
    })),
  ];

  setIsGenerating(true);
  const selectedImages = images.filter((img) => selectedIds.includes(img.id));

  // Check if there are referenced images via @ syntax
  const referencedImageIds = generationSettings.referencedImageIds || [];
  const referencedImages = referencedImageIds
    .map((refId) => images.find((img) => img.id === refId))
    .filter((img): img is PlacedImage => !!img);

  // If there are @ referenced images, handle multi-image generation
  // Server will fetch images directly (no CORS issues on backend)
  if (referencedImages.length > 0) {
    // Create placeholder image
    const imageId = id();

    // Place at center of viewport
    const viewportCenterX =
      (canvasSize.width / 2 - viewport.x) / viewport.scale;
    const viewportCenterY =
      (canvasSize.height / 2 - viewport.y) / viewport.scale;

    // Use first referenced image dimensions as base
    const firstImg = referencedImages[0];
    const width = firstImg.width;
    const height = firstImg.height;

    const preferredX = viewportCenterX - width / 2;
    const preferredY = viewportCenterY - height / 2;
    const { x, y } = findNonOverlappingPosition(
      preferredX,
      preferredY,
      width,
      height,
      existingAssets,
    );

    setImages((prev) => [
      ...prev,
      {
        id: imageId,
        src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        x,
        y,
        width,
        height,
        rotation: 0,
        isGenerated: true,
        generationPrompt: generationSettings.prompt,
        creditsConsumed: undefined,
      },
    ]);

    // Pass image source URLs - server will fetch them (no CORS on backend)
    const imageSrcs = referencedImages.map((img) => img.src);

    // Add to active generations - server handles fetching and uploading
    setActiveGenerations((prev) =>
      new Map(prev).set(imageId, {
        imageSrcs, // Server will fetch these URLs directly
        prompt: generationSettings.prompt,
        loraUrl: generationSettings.loraUrl,
        imageSize: generationSettings.imageSize,
        state: "submitting",
      }),
    );

    setSelectedIds([imageId]);
    return;
  }

  // If no images are selected, do text-to-image generation
  if (selectedImages.length === 0) {
    // Create placeholder image immediately
    const imageId = id(); // Use UUID from InstantDB

    // Place at center of viewport
    const viewportCenterX =
      (canvasSize.width / 2 - viewport.x) / viewport.scale;
    const viewportCenterY =
      (canvasSize.height / 2 - viewport.y) / viewport.scale;

    // Calculate dimensions based on selected image size
    const baseSize = 512;
    let width = baseSize;
    let height = baseSize;

    const imageSize = generationSettings.imageSize || "landscape_16_9";
    switch (imageSize) {
      case "landscape_16_9":
        width = baseSize;
        height = Math.round(baseSize * (9 / 16));
        break;
      case "landscape_4_3":
        width = baseSize;
        height = Math.round(baseSize * (3 / 4));
        break;
      case "square_hd":
      case "square":
        width = baseSize;
        height = baseSize;
        break;
      case "portrait_4_3":
        width = Math.round(baseSize * (3 / 4));
        height = baseSize;
        break;
      case "portrait_16_9":
        width = Math.round(baseSize * (9 / 16));
        height = baseSize;
        break;
    }

    // Find non-overlapping position for text-to-image
    const preferredX = viewportCenterX - width / 2;
    const preferredY = viewportCenterY - height / 2;
    const { x, y } = findNonOverlappingPosition(
      preferredX,
      preferredY,
      width,
      height,
      existingAssets,
    );

    // Add placeholder image
    setImages((prev) => [
      ...prev,
      {
        id: imageId,
        src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        x,
        y,
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
        imageSize: generationSettings.imageSize,
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

      // Load the image - use proxy for S3 URLs to bypass CORS
      const imgElement = new window.Image();
      imgElement.crossOrigin = "anonymous"; // Enable CORS

      // Check if the image is from S3 (InstantDB storage) and needs proxying
      const needsProxy =
        img.src.includes("instant-storage.s3.amazonaws.com") ||
        img.src.includes("storage.googleapis.com");

      imgElement.src = needsProxy
        ? `/api/proxy-image?url=${encodeURIComponent(img.src)}`
        : img.src;
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

      // Find non-overlapping position for the new image
      const preferredX = img.x + img.width + 20;
      const preferredY = img.y;
      const { x: newX, y: newY } = findNonOverlappingPosition(
        preferredX,
        preferredY,
        img.width,
        img.height,
        existingAssets,
      );

      // Add the new position to existingAssets so subsequent generations don't overlap
      existingAssets.push({
        x: newX,
        y: newY,
        width: img.width,
        height: img.height,
      });

      generateImage(
        uploadResult.url,
        newX,
        newY,
        groupId,
        generationSettings,
        setImages,
        setActiveGenerations,
        img.width,
        img.height,
        existingAssets,
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
