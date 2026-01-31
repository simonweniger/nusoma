// =============================================================================
// Models Configuration
// =============================================================================
// Centralized configuration for all AI model endpoints used in generation.
// This file defines the available models for different generation types:
// - Image generation (text-to-image, image-to-image, with/without LoRA)
// - Video generation (text-to-video, image-to-video, video-to-video, etc.)
// =============================================================================

// -----------------------------------------------------------------------------
// Image Model Types
// -----------------------------------------------------------------------------

export type ImageGenerationType =
  | "text-to-image"
  | "image-to-image"
  | "text-to-image-lora"
  | "image-to-image-lora";

export type ImageSizeEnum =
  | "square_hd"
  | "square"
  | "portrait_4_3"
  | "portrait_16_9"
  | "landscape_4_3"
  | "landscape_16_9"
  | "auto";

export type SafetyToleranceEnum = "1" | "2" | "3" | "4" | "5";

export type OutputFormatEnum = "jpeg" | "png" | "webp";

export type AccelerationEnum = "none" | "regular" | "high";

export interface LoRAInput {
  path: string;
  scale?: number;
}

export interface ImageModelOption {
  name: string;
  type: "select" | "boolean" | "number" | "text" | "lora";
  label: string;
  description?: string;
  required?: boolean;
  default?: any;
  options?: Array<{ value: string | number; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export interface ImageModelConfig {
  id: string;
  name: string;
  endpoint: string;
  type: ImageGenerationType;
  options: Record<string, ImageModelOption>;
  defaults: Record<string, any>;
}

export const IMAGE_MODELS: Record<string, ImageModelConfig> = {
  // ---------------------------------------------------------------------------
  // FLUX.2 [pro] - Text to Image
  // https://fal.ai/models/fal-ai/flux-2-pro/api
  // ---------------------------------------------------------------------------
  "flux-2-pro": {
    id: "flux-2-pro",
    name: "Flux 2 Pro",
    endpoint: "fal-ai/flux-2-pro",
    type: "text-to-image",
    options: {
      prompt: {
        name: "prompt",
        type: "text",
        label: "Prompt",
        description: "The prompt to generate an image from",
        required: true,
        placeholder: "Describe what you want to generate...",
      },
      image_size: {
        name: "image_size",
        type: "select",
        label: "Image Size",
        description: "The size of the generated image",
        default: "landscape_4_3",
        options: [
          { value: "square_hd", label: "Square HD (1024x1024)" },
          { value: "square", label: "Square (512x512)" },
          { value: "portrait_4_3", label: "Portrait 4:3" },
          { value: "portrait_16_9", label: "Portrait 16:9" },
          { value: "landscape_4_3", label: "Landscape 4:3" },
          { value: "landscape_16_9", label: "Landscape 16:9" },
        ],
      },
      seed: {
        name: "seed",
        type: "number",
        label: "Seed",
        description: "The seed to use for the generation",
        placeholder: "Random",
      },
      safety_tolerance: {
        name: "safety_tolerance",
        type: "select",
        label: "Safety Tolerance",
        description: "Safety tolerance level; 1 most strict, 5 most permissive",
        default: "2",
        options: [
          { value: "1", label: "1 - Most Strict" },
          { value: "2", label: "2 - Strict" },
          { value: "3", label: "3 - Moderate" },
          { value: "4", label: "4 - Permissive" },
          { value: "5", label: "5 - Most Permissive" },
        ],
      },
      enable_safety_checker: {
        name: "enable_safety_checker",
        type: "boolean",
        label: "Enable Safety Checker",
        description: "Whether to enable the safety checker",
        default: true,
      },
      output_format: {
        name: "output_format",
        type: "select",
        label: "Output Format",
        description: "The format of the output image",
        default: "jpeg",
        options: [
          { value: "jpeg", label: "JPEG" },
          { value: "png", label: "PNG" },
        ],
      },
    },
    defaults: {
      image_size: "landscape_4_3",
      safety_tolerance: "2",
      enable_safety_checker: true,
      output_format: "jpeg",
    },
  },

  // ---------------------------------------------------------------------------
  // FLUX.2 [pro] Edit - Image to Image
  // https://fal.ai/models/fal-ai/flux-2-pro/edit/api
  // ---------------------------------------------------------------------------
  "flux-2-pro-edit": {
    id: "flux-2-pro-edit",
    name: "Flux 2 Pro Edit",
    endpoint: "fal-ai/flux-2-pro/edit",
    type: "image-to-image",
    options: {
      prompt: {
        name: "prompt",
        type: "text",
        label: "Prompt",
        description: "The prompt to generate an image from",
        required: true,
        placeholder: "Describe the edit you want to make...",
      },
      image_urls: {
        name: "image_urls",
        type: "text",
        label: "Image URLs",
        description: "List of URLs of input images for editing",
        required: true,
      },
      image_size: {
        name: "image_size",
        type: "select",
        label: "Image Size",
        description: "The size of the generated image",
        default: "auto",
        options: [
          { value: "auto", label: "Auto (from input)" },
          { value: "square_hd", label: "Square HD (1024x1024)" },
          { value: "square", label: "Square (512x512)" },
          { value: "portrait_4_3", label: "Portrait 4:3" },
          { value: "portrait_16_9", label: "Portrait 16:9" },
          { value: "landscape_4_3", label: "Landscape 4:3" },
          { value: "landscape_16_9", label: "Landscape 16:9" },
        ],
      },
      seed: {
        name: "seed",
        type: "number",
        label: "Seed",
        description: "The seed to use for the generation",
        placeholder: "Random",
      },
      safety_tolerance: {
        name: "safety_tolerance",
        type: "select",
        label: "Safety Tolerance",
        description: "Safety tolerance level; 1 most strict, 5 most permissive",
        default: "2",
        options: [
          { value: "1", label: "1 - Most Strict" },
          { value: "2", label: "2 - Strict" },
          { value: "3", label: "3 - Moderate" },
          { value: "4", label: "4 - Permissive" },
          { value: "5", label: "5 - Most Permissive" },
        ],
      },
      enable_safety_checker: {
        name: "enable_safety_checker",
        type: "boolean",
        label: "Enable Safety Checker",
        description: "Whether to enable the safety checker",
        default: true,
      },
      output_format: {
        name: "output_format",
        type: "select",
        label: "Output Format",
        description: "The format of the output image",
        default: "jpeg",
        options: [
          { value: "jpeg", label: "JPEG" },
          { value: "png", label: "PNG" },
        ],
      },
    },
    defaults: {
      image_size: "auto",
      safety_tolerance: "2",
      enable_safety_checker: true,
      output_format: "jpeg",
    },
  },

  // ---------------------------------------------------------------------------
  // FLUX.2 [dev] LoRA - Text to Image with LoRA
  // https://fal.ai/models/fal-ai/flux-2/lora/api
  // ---------------------------------------------------------------------------
  "flux-2-pro-lora": {
    id: "flux-2-pro-lora",
    name: "Flux 2 with LoRA",
    endpoint: "fal-ai/flux-2/lora",
    type: "text-to-image-lora",
    options: {
      prompt: {
        name: "prompt",
        type: "text",
        label: "Prompt",
        description: "The prompt to generate an image from",
        required: true,
        placeholder: "Describe what you want to generate...",
      },
      loras: {
        name: "loras",
        type: "lora",
        label: "LoRA Weights",
        description: "List of LoRA weights to apply (maximum 3)",
      },
      guidance_scale: {
        name: "guidance_scale",
        type: "number",
        label: "Guidance Scale",
        description: "How closely the model adheres to your prompt (0-20)",
        default: 2.5,
        min: 0,
        max: 20,
        step: 0.1,
      },
      num_inference_steps: {
        name: "num_inference_steps",
        type: "number",
        label: "Inference Steps",
        description: "Number of inference steps to perform (4-50)",
        default: 28,
        min: 4,
        max: 50,
        step: 1,
      },
      image_size: {
        name: "image_size",
        type: "select",
        label: "Image Size",
        description: "The size of the generated image (512-2048 pixels)",
        default: "landscape_4_3",
        options: [
          { value: "square_hd", label: "Square HD (1024x1024)" },
          { value: "square", label: "Square (512x512)" },
          { value: "portrait_4_3", label: "Portrait 4:3" },
          { value: "portrait_16_9", label: "Portrait 16:9" },
          { value: "landscape_4_3", label: "Landscape 4:3" },
          { value: "landscape_16_9", label: "Landscape 16:9" },
        ],
      },
      num_images: {
        name: "num_images",
        type: "number",
        label: "Number of Images",
        description: "Number of images to generate (1-4)",
        default: 1,
        min: 1,
        max: 4,
        step: 1,
      },
      seed: {
        name: "seed",
        type: "number",
        label: "Seed",
        description: "Random seed for generation",
        placeholder: "Random",
      },
      acceleration: {
        name: "acceleration",
        type: "select",
        label: "Acceleration",
        description: "Speed optimization level",
        default: "regular",
        options: [
          { value: "none", label: "None" },
          { value: "regular", label: "Regular" },
          { value: "high", label: "High" },
        ],
      },
      enable_prompt_expansion: {
        name: "enable_prompt_expansion",
        type: "boolean",
        label: "Enable Prompt Expansion",
        description: "Expand prompt for better results",
        default: false,
      },
      enable_safety_checker: {
        name: "enable_safety_checker",
        type: "boolean",
        label: "Enable Safety Checker",
        description: "Enable NSFW content filtering",
        default: true,
      },
      output_format: {
        name: "output_format",
        type: "select",
        label: "Output Format",
        description: "Image format",
        default: "png",
        options: [
          { value: "jpeg", label: "JPEG" },
          { value: "png", label: "PNG" },
          { value: "webp", label: "WebP" },
        ],
      },
    },
    defaults: {
      guidance_scale: 2.5,
      num_inference_steps: 28,
      image_size: "landscape_4_3",
      num_images: 1,
      acceleration: "regular",
      enable_prompt_expansion: false,
      enable_safety_checker: true,
      output_format: "png",
    },
  },

  // ---------------------------------------------------------------------------
  // FLUX.2 [dev] LoRA Edit - Image to Image with LoRA
  // https://fal.ai/models/fal-ai/flux-2/lora/edit
  // ---------------------------------------------------------------------------
  "flux-2-edit-lora": {
    id: "flux-2-edit-lora",
    name: "Flux 2 Edit with LoRA",
    endpoint: "fal-ai/flux-2/lora/edit",
    type: "image-to-image-lora",
    options: {
      prompt: {
        name: "prompt",
        type: "text",
        label: "Prompt",
        description: "The prompt to generate an image from",
        required: true,
        placeholder: "Describe the edit you want to make...",
      },
      image_urls: {
        name: "image_urls",
        type: "text",
        label: "Image URLs",
        description: "The URLs of the images for editing (max 3)",
        required: true,
      },
      loras: {
        name: "loras",
        type: "lora",
        label: "LoRA Weights",
        description: "List of LoRA weights to apply (maximum 3)",
      },
      guidance_scale: {
        name: "guidance_scale",
        type: "number",
        label: "Guidance Scale",
        description: "How closely the model adheres to your prompt (0-20)",
        default: 2.5,
        min: 0,
        max: 20,
        step: 0.1,
      },
      num_inference_steps: {
        name: "num_inference_steps",
        type: "number",
        label: "Inference Steps",
        description: "Number of inference steps to perform (4-50)",
        default: 28,
        min: 4,
        max: 50,
        step: 1,
      },
      image_size: {
        name: "image_size",
        type: "select",
        label: "Image Size",
        description: "The size of the generated image (512-2048 pixels)",
        default: "landscape_4_3",
        options: [
          { value: "square_hd", label: "Square HD (1024x1024)" },
          { value: "square", label: "Square (512x512)" },
          { value: "portrait_4_3", label: "Portrait 4:3" },
          { value: "portrait_16_9", label: "Portrait 16:9" },
          { value: "landscape_4_3", label: "Landscape 4:3" },
          { value: "landscape_16_9", label: "Landscape 16:9" },
        ],
      },
      num_images: {
        name: "num_images",
        type: "number",
        label: "Number of Images",
        description: "Number of images to generate (1-4)",
        default: 1,
        min: 1,
        max: 4,
        step: 1,
      },
      seed: {
        name: "seed",
        type: "number",
        label: "Seed",
        description: "Random seed for generation",
        placeholder: "Random",
      },
      acceleration: {
        name: "acceleration",
        type: "select",
        label: "Acceleration",
        description: "Speed optimization level",
        default: "regular",
        options: [
          { value: "none", label: "None" },
          { value: "regular", label: "Regular" },
          { value: "high", label: "High" },
        ],
      },
      enable_prompt_expansion: {
        name: "enable_prompt_expansion",
        type: "boolean",
        label: "Enable Prompt Expansion",
        description: "Expand prompt for enhanced results",
        default: false,
      },
      enable_safety_checker: {
        name: "enable_safety_checker",
        type: "boolean",
        label: "Enable Safety Checker",
        description: "Activate safety filtering",
        default: true,
      },
      output_format: {
        name: "output_format",
        type: "select",
        label: "Output Format",
        description: "Image format",
        default: "png",
        options: [
          { value: "jpeg", label: "JPEG" },
          { value: "png", label: "PNG" },
          { value: "webp", label: "WebP" },
        ],
      },
    },
    defaults: {
      guidance_scale: 2.5,
      num_inference_steps: 28,
      image_size: "landscape_4_3",
      num_images: 1,
      acceleration: "regular",
      enable_prompt_expansion: false,
      enable_safety_checker: true,
      output_format: "png",
    },
  },
};

// -----------------------------------------------------------------------------
// Utility Model Types (Background Removal, Object Isolation, etc.)
// -----------------------------------------------------------------------------

export type UtilityModelType = "background-removal" | "object-isolation";

export interface UtilityModelConfig {
  id: string;
  name: string;
  endpoint: string;
  type: UtilityModelType;
  pricing: {
    costPerUnit: number;
    currency: string;
    unit: string;
  };
}

export const UTILITY_MODELS: Record<string, UtilityModelConfig> = {
  backgroundRemoval: {
    id: "bria-background-remove",
    name: "Bria Background Removal",
    endpoint: "fal-ai/bria/background/remove",
    type: "background-removal",
    pricing: {
      costPerUnit: 0.01,
      currency: "USD",
      unit: "image",
    },
  },
  objectIsolation: {
    id: "evf-sam-object-isolation",
    name: "EVF-SAM Object Isolation",
    endpoint: "fal-ai/evf-sam",
    type: "object-isolation",
    pricing: {
      costPerUnit: 0.02,
      currency: "USD",
      unit: "image",
    },
  },
};

export function getUtilityModelById(
  id: string,
): UtilityModelConfig | undefined {
  return UTILITY_MODELS[id];
}

// -----------------------------------------------------------------------------
// Video Model Types
// -----------------------------------------------------------------------------

export type VideoGenerationType =
  | "text-to-video"
  | "image-to-video"
  | "video-to-video"
  | "multiconditioning"
  | "video-extension";

export interface VideoModelOption {
  name: string;
  type: "select" | "boolean" | "number" | "text";
  label: string;
  description?: string;
  required?: boolean;
  default?: any;
  options?: Array<{ value: string | number; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export interface ModelConstraints {
  resolutionsByModel?: Record<string, string[]>;
  conditionalOptions?: Array<{
    when: { field: string; value: any };
    then: { field: string; value: any };
  }>;
}

export interface VideoModelPricing {
  costPerVideo: number;
  currency: string;
  unit: string;
}

export interface VideoModelConfig {
  id: string;
  name: string;
  endpoint: string;
  category: VideoGenerationType;
  pricing: VideoModelPricing;
  options: Record<string, VideoModelOption>;
  defaults: Record<string, any>;
  constraints?: ModelConstraints;
  isDefault?: boolean;
  supportsMultipleCategories?: boolean;
}

export const VIDEO_MODELS: Record<string, VideoModelConfig> = {
  // ---------------------------------------------------------------------------
  // Kling 2.6 Pro - Text to Video
  // https://fal.ai/models/fal-ai/kling-video/v2.6/pro/text-to-video/api
  // ---------------------------------------------------------------------------
  "kling-video-v2.6-pro-text-to-video": {
    id: "kling-video-v2.6-pro-text-to-video",
    name: "Kling 2.6 Pro (Text to Video)",
    endpoint: "fal-ai/kling-video/v2.6/pro/text-to-video",
    category: "text-to-video",
    pricing: {
      costPerVideo: 0.15, // Approximate
      currency: "USD",
      unit: "video",
    },
    isDefault: true,
    options: {
      prompt: {
        name: "prompt",
        type: "text",
        label: "Prompt",
        description: "Text description of the video to generate",
        required: true,
        placeholder: "Describe the video...",
      },
      negative_prompt: {
        name: "negative_prompt",
        type: "text",
        label: "Negative Prompt",
        description: "What to avoid in the generation",
        default: "blur, distort, and low quality",
      },
      duration: {
        name: "duration",
        type: "select",
        label: "Duration",
        description: "Video duration in seconds",
        default: "5",
        options: [
          { value: "5", label: "5 seconds" },
          { value: "10", label: "10 seconds" },
        ],
      },
      aspect_ratio: {
        name: "aspect_ratio",
        type: "select",
        label: "Aspect Ratio",
        description: "The aspect ratio of the video",
        default: "16:9",
        options: [
          { value: "16:9", label: "16:9 Landscape" },
          { value: "9:16", label: "9:16 Portrait" },
          { value: "1:1", label: "1:1 Square" },
        ],
      },
      cfg_scale: {
        name: "cfg_scale",
        type: "number",
        label: "CFG Scale",
        description: "Guidance scale (0.1 - 1.0)",
        default: 0.5,
        min: 0.1,
        max: 1.0,
        step: 0.1,
      },
      generate_audio: {
        name: "generate_audio",
        type: "boolean",
        label: "Generate Audio",
        description: "Whether to generate matching audio",
        default: true,
      },
    },
    defaults: {
      duration: "5",
      aspect_ratio: "16:9",
      negative_prompt: "blur, distort, and low quality",
      cfg_scale: 0.5,
      generate_audio: true,
    },
  },

  // ---------------------------------------------------------------------------
  // Kling 2.6 Pro - Image to Video
  // https://fal.ai/models/fal-ai/kling-video/v2.6/pro/image-to-video/api
  // ---------------------------------------------------------------------------
  "kling-video-v2.6-pro-image-to-video": {
    id: "kling-video-v2.6-pro-image-to-video",
    name: "Kling 2.6 Pro (Image to Video)",
    endpoint: "fal-ai/kling-video/v2.6/pro/image-to-video",
    category: "image-to-video",
    pricing: {
      costPerVideo: 0.15, // Approximate
      currency: "USD",
      unit: "video",
    },
    isDefault: true,
    options: {
      prompt: {
        name: "prompt",
        type: "text",
        label: "Prompt",
        description: "Text description of the video movement",
        required: true,
      },
      start_image_url: {
        name: "start_image_url",
        type: "text",
        label: "Start Image",
        description: "The starting image for the video",
        required: true,
      },
      end_image_url: {
        name: "end_image_url",
        type: "text",
        label: "End Image (Optional)",
        description: "The ending image for the video",
      },
      duration: {
        name: "duration",
        type: "select",
        label: "Duration",
        description: "Video duration in seconds",
        default: "5",
        options: [
          { value: "5", label: "5 seconds" },
          { value: "10", label: "10 seconds" },
        ],
      },
      negative_prompt: {
        name: "negative_prompt",
        type: "text",
        label: "Negative Prompt",
        description: "What to avoid in the generation",
        default: "blur, distort, and low quality",
      },
      generate_audio: {
        name: "generate_audio",
        type: "boolean",
        label: "Generate Audio",
        description: "Whether to generate matching audio",
        default: true,
      },
    },
    defaults: {
      duration: "5",
      negative_prompt: "blur, distort, and low quality",
      generate_audio: true,
    },
  },

  // ---------------------------------------------------------------------------
  // Kling 2.6 Pro - Motion Control (Image + Video)
  // https://fal.ai/models/fal-ai/kling-video/v2.6/pro/motion-control/api
  // ---------------------------------------------------------------------------
  "kling-video-v2.6-pro-motion-control": {
    id: "kling-video-v2.6-pro-motion-control",
    name: "Kling 2.6 Pro (Motion Control)",
    endpoint: "fal-ai/kling-video/v2.6/pro/motion-control",
    category: "image-to-video", // Categorized as image-to-video but uses video ref too
    pricing: {
      costPerVideo: 0.2, // Approximate
      currency: "USD",
      unit: "video",
    },
    isDefault: false,
    options: {
      prompt: {
        name: "prompt",
        type: "text",
        label: "Prompt",
        description: "Description of the character and action",
        required: true,
      },
      image_url: {
        name: "image_url",
        type: "text",
        label: "Character Image",
        description: "Reference image for the character",
        required: true,
      },
      video_url: {
        name: "video_url",
        type: "text",
        label: "Motion Video",
        description: "Reference video for the motion",
        required: true,
      },
      character_orientation: {
        name: "character_orientation",
        type: "select",
        label: "Character Orientation",
        description: "Match orientation of image or video",
        default: "video",
        options: [
          { value: "image", label: "Match Image (Max 10s)" },
          { value: "video", label: "Match Video (Max 30s)" },
        ],
      },
      keep_original_sound: {
        name: "keep_original_sound",
        type: "boolean",
        label: "Keep Original Sound",
        description: "Keep sound from the reference video",
        default: true,
      },
    },
    defaults: {
      character_orientation: "video",
      keep_original_sound: true,
    },
  },

  // ---------------------------------------------------------------------------
  // Utility: Background Removal
  // ---------------------------------------------------------------------------
  "bria-video-background-removal": {
    id: "bria-video-background-removal",
    name: "Bria Video Background Removal",
    endpoint: "bria/video/background-removal",
    category: "video-to-video",
    pricing: {
      costPerVideo: 0.14,
      currency: "USD",
      unit: "second",
    },
    options: {
      backgroundColor: {
        name: "backgroundColor",
        type: "select",
        label: "Background Color",
        description: "The color to replace the removed background with",
        default: "Black",
        options: [
          { value: "Transparent", label: "Transparent" },
          { value: "Black", label: "Black" },
          { value: "White", label: "White" },
          { value: "Gray", label: "Gray" },
          { value: "Red", label: "Red" },
          { value: "Green", label: "Green" },
          { value: "Blue", label: "Blue" },
          { value: "Yellow", label: "Yellow" },
          { value: "Cyan", label: "Cyan" },
          { value: "Magenta", label: "Magenta" },
          { value: "Orange", label: "Orange" },
        ],
      },
    },
    defaults: {
      backgroundColor: "Black",
    },
  },
};

// -----------------------------------------------------------------------------
// Helper Functions - Image Models
// -----------------------------------------------------------------------------

export function getImageModelById(id: string): ImageModelConfig | undefined {
  return IMAGE_MODELS[id];
}

export function getImageModelsByType(
  type: ImageGenerationType,
): ImageModelConfig[] {
  return Object.values(IMAGE_MODELS).filter((model) => model.type === type);
}

/**
 * Get the appropriate image model based on context.
 * @param hasImageSelected - Whether an input image is selected
 * @param hasLora - Whether the prompt action includes a LoRA URL
 * @returns The appropriate ImageModelConfig for the context
 */
export function getImageModelForContext(
  hasImageSelected: boolean,
  hasLora: boolean,
): ImageModelConfig {
  if (hasImageSelected) {
    // Image-to-image modes
    return hasLora
      ? IMAGE_MODELS["flux-2-edit-lora"]
      : IMAGE_MODELS["flux-2-pro-edit"];
  } else {
    // Text-to-image modes
    return hasLora
      ? IMAGE_MODELS["flux-2-pro-lora"]
      : IMAGE_MODELS["flux-2-pro"];
  }
}

/**
 * Determine the generation type based on context.
 * @param hasImageSelected - Whether an input image is selected
 * @param hasLora - Whether the prompt action includes a LoRA URL
 * @returns The ImageGenerationType for the context
 */
export function getImageGenerationType(
  hasImageSelected: boolean,
  hasLora: boolean,
): ImageGenerationType {
  if (hasImageSelected) {
    return hasLora ? "image-to-image-lora" : "image-to-image";
  } else {
    return hasLora ? "text-to-image-lora" : "text-to-image";
  }
}

/**
 * Build the input parameters for an image generation API call.
 * Uses the model's defaults and overrides with provided options.
 * @param model - The image model configuration
 * @param options - Override options (prompt, imageUrl, imageUrls, loraUrl, seed, imageSize)
 * @returns The formatted input object for the FAL API
 */
export function buildImageModelInput(
  model: ImageModelConfig,
  options: {
    prompt: string;
    imageUrl?: string;
    imageUrls?: string[]; // Multiple images for @ references
    loraUrl?: string;
    seed?: number;
    imageSize?: string;
  },
): Record<string, any> {
  const input: Record<string, any> = {
    prompt: options.prompt,
  };

  // Apply model defaults
  for (const [key, value] of Object.entries(model.defaults)) {
    input[key] = value;
  }

  // Override with provided options
  if (options.seed !== undefined) {
    input.seed = options.seed;
  }

  if (options.imageSize) {
    input.image_size = options.imageSize;
  }

  // Handle image-to-image models (flux-2-pro-edit, flux-2-edit-lora)
  if (model.type === "image-to-image" || model.type === "image-to-image-lora") {
    console.log("Building input for image-to-image:", {
      type: model.type,
      imageUrl: options.imageUrl,
      imageUrls: options.imageUrls,
    });
    // Prefer imageUrls array, fall back to single imageUrl
    if (options.imageUrls && options.imageUrls.length > 0) {
      input.image_urls = options.imageUrls.slice(0, 3); // Max 3 per fal.ai
    } else if (options.imageUrl) {
      input.image_urls = [options.imageUrl];
    }
  }

  // Handle LoRA models (flux-2-pro-lora, flux-2-edit-lora)
  if (
    model.type === "text-to-image-lora" ||
    model.type === "image-to-image-lora"
  ) {
    if (options.loraUrl) {
      input.loras = [{ path: options.loraUrl, scale: 1 }];
    }
  }

  return input;
}

// -----------------------------------------------------------------------------
// Helper Functions - Video Models
// -----------------------------------------------------------------------------

export function getVideoModelById(id: string): VideoModelConfig | undefined {
  return VIDEO_MODELS[id];
}

export function getVideoModelsByCategory(
  category: VideoGenerationType,
): VideoModelConfig[] {
  return Object.values(VIDEO_MODELS).filter(
    (model) =>
      model.category === category ||
      (model.supportsMultipleCategories &&
        category !== "text-to-video" &&
        category !== "video-extension"),
  );
}

export function getVideoModelForCategory(
  category: VideoGenerationType,
): VideoModelConfig | undefined {
  const models = getVideoModelsByCategory(category);
  return models[0];
}

export function calculateVideoGenerations(
  model: VideoModelConfig,
  budget: number = 1,
): number {
  return Math.floor(budget / model.pricing.costPerVideo);
}

export function formatPricingMessage(model: VideoModelConfig): string {
  const approximateTimes = calculateVideoGenerations(model);
  return `Your request will cost $${model.pricing.costPerVideo.toFixed(2)} per ${
    model.pricing.unit
  }. For $1 you can run this model approximately ${approximateTimes} times.`;
}
