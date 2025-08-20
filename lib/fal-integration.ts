'use client';

import { id } from '@instantdb/react';
import { AVAILABLE_ENDPOINTS, fal } from '@/lib/fal';
import db from '@/lib/instantdb';
import type { NusomaModel } from '@/lib/providers';

// Convert FAL endpoints to NusomaModel format for use with ModelSelector
export const convertFalEndpointsToModels = (
  category: 'image' | 'video' | 'music' | 'voiceover'
): Record<string, NusomaModel> => {
  const endpoints = AVAILABLE_ENDPOINTS.filter(
    (endpoint) => endpoint.category === category
  );

  return endpoints.reduce(
    (acc, endpoint) => {
      acc[endpoint.endpointId] = {
        label: endpoint.label,
        description: endpoint.description,
        chef: {
          id: 'fal',
          name: 'FAL AI',
          icon: () => null as any, // We can add an icon later
        },
        providers: [
          {
            id: 'fal',
            icon: () => null as any,
          },
        ],
        priceIndicator: 'low', // Default, can be customized per endpoint
        disabled: false,
      };
      return acc;
    },
    {} as Record<string, NusomaModel>
  );
};

export type FalJobParams = {
  endpointId: string;
  prompt?: string;
  modelId?: string;
  projectId: string;
  nodeId: string;
  instructions?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  voice?: string;
  size?: string;
  duration?: number;
  images?: Array<{ start_frame_num: number; image_url: string }>;
  advanced_camera_control?: {
    movement_value: number;
    movement_type: string;
  };
};

export const createFalJob = async (params: FalJobParams) => {
  const {
    endpointId,
    prompt,
    projectId,
    instructions,
    imageUrl,
    videoUrl,
    audioUrl,
    voice,
    size,
    duration,
    images,
    advanced_camera_control,
  } = params;

  // Find the endpoint configuration
  const endpoint = AVAILABLE_ENDPOINTS.find(
    (ep) => ep.endpointId === endpointId
  );
  if (!endpoint) {
    throw new Error(`Endpoint ${endpointId} not found`);
  }

  // Build input based on endpoint requirements
  const input: Record<string, unknown> = {
    ...endpoint.initialInput,
  };

  // Add prompt if supported
  if (endpoint.prompt !== false) {
    const promptKey = endpoint.inputMap?.prompt || 'prompt';
    const finalPrompt = instructions
      ? `${instructions}\n\n${prompt || ''}`
      : prompt || '';
    if (finalPrompt.trim()) {
      input[promptKey] = finalPrompt;
    }
  }

  // Add assets
  if (imageUrl) {
    const imageKey = endpoint.inputMap?.image_url || 'image_url';
    input[imageKey] = imageUrl;
  }

  if (videoUrl) {
    const videoKey = endpoint.inputMap?.video_url || 'video_url';
    input[videoKey] = videoUrl;
  }

  if (audioUrl) {
    const audioKey = endpoint.inputMap?.audio_url || 'reference_audio_url';
    input[audioKey] = audioUrl;
  }

  // Add other parameters
  if (voice) {
    input.voice = voice;
  }
  if (size) {
    // Map common size formats to FAL's expected values
    const sizeMapping: Record<string, string> = {
      '1024x1024': 'square_hd',
      '512x512': 'square',
      '768x1024': 'portrait_4_3',
      '576x1024': 'portrait_16_9',
      '1024x768': 'landscape_4_3',
      '1024x576': 'landscape_16_9',
    };
    input.image_size = sizeMapping[size] || size;
  }
  if (duration) {
    input.seconds_total = duration;
  }
  if (images) {
    input.images = images;
  }
  if (advanced_camera_control) {
    input.advanced_camera_control = advanced_camera_control;
  }

  // Create media item in InstantDB
  const mediaItemId = id();

  await db.transact([
    db.tx.mediaItems[mediaItemId]
      .update({
        kind: 'generated',
        endpointId,
        mediaType: endpoint.category,
        status: 'pending',
        input,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      .link({ project: projectId }),
  ]);

  // Submit job to FAL
  console.log('Submitting FAL job with:', { endpointId, input });
  const job = await fal.queue.submit(endpointId, { input });

  // Update media item with request ID
  await db.transact([
    db.tx.mediaItems[mediaItemId].update({
      requestId: job.request_id,
      status: 'running',
      updatedAt: Date.now(),
    }),
  ]);

  return {
    mediaItemId,
    requestId: job.request_id,
    endpoint,
  };
};

export const pollFalJob = async (
  requestId: string,
  mediaItemId: string,
  endpointId: string,
  options: { interval?: number; maxAttempts?: number } = {}
): Promise<unknown> => {
  const { interval = 1000, maxAttempts = 120 } = options;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const status = await fal.queue.status(endpointId, { requestId });

      if ((status as any).status === 'COMPLETED') {
        const result = await fal.queue.result(endpointId, { requestId });

        // Extract the media URL from the result
        // Find the endpoint to get the media type
        const endpoint = AVAILABLE_ENDPOINTS.find(
          (ep) => ep.endpointId === endpointId
        );
        const mediaType = endpoint?.category || 'image';
        const mediaUrl = getMediaUrlFromOutput(result, mediaType);

        // Update media item with result and extracted URL
        await db.transact([
          db.tx.mediaItems[mediaItemId].update({
            status: 'completed',
            output: result,
            url: mediaUrl,
            updatedAt: Date.now(),
          }),
        ]);

        return result;
      }

      if ((status as any).status === 'FAILED') {
        await db.transact([
          db.tx.mediaItems[mediaItemId].update({
            status: 'failed',
            updatedAt: Date.now(),
          }),
        ]);
        throw new Error(
          `FAL job failed: ${(status as any).logs || 'Unknown error'}`
        );
      }

      // Update status in database for UI updates
      await db.transact([
        db.tx.mediaItems[mediaItemId].update({
          status: 'running',
          updatedAt: Date.now(),
        }),
      ]);

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (error) {
      if (i === maxAttempts - 1) {
        // Final attempt failed
        await db.transact([
          db.tx.mediaItems[mediaItemId].update({
            status: 'failed',
            updatedAt: Date.now(),
          }),
        ]);
        throw error;
      }
      // Continue polling on error (might be temporary)
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  // Timeout
  await db.transact([
    db.tx.mediaItems[mediaItemId].update({
      status: 'failed',
      updatedAt: Date.now(),
    }),
  ]);
  throw new Error('FAL job polling timed out');
};

export const getMediaUrlFromOutput = (
  output: unknown,
  mediaType: string
): string | null => {
  console.log('getMediaUrlFromOutput called with:', { output, mediaType });

  if (!output || typeof output !== 'object') {
    console.log('Output is not an object:', output);
    return null;
  }

  const data = output as Record<string, unknown>;

  // Check if we have a nested data structure from FAL
  const actualData = data.data ? (data.data as Record<string, unknown>) : data;

  // Handle different output formats based on media type
  switch (mediaType) {
    case 'image': {
      console.log('Processing image output:', actualData);
      if (
        actualData.images &&
        Array.isArray(actualData.images) &&
        actualData.images.length > 0
      ) {
        const firstImage = actualData.images[0] as Record<string, unknown>;
        console.log('Found image URL:', firstImage.url);
        return typeof firstImage.url === 'string' ? firstImage.url : null;
      }
      if (actualData.image && typeof actualData.image === 'object') {
        const image = actualData.image as Record<string, unknown>;
        return typeof image.url === 'string' ? image.url : null;
      }
      if (typeof actualData.url === 'string') {
        return actualData.url;
      }
      break;
    }

    case 'video': {
      if (actualData.video && typeof actualData.video === 'object') {
        const video = actualData.video as Record<string, unknown>;
        return typeof video.url === 'string' ? video.url : null;
      }
      if (typeof actualData.url === 'string') {
        return actualData.url;
      }
      break;
    }

    case 'music':
    case 'voiceover': {
      if (actualData.audio_file && typeof actualData.audio_file === 'object') {
        const audioFile = actualData.audio_file as Record<string, unknown>;
        return typeof audioFile.url === 'string' ? audioFile.url : null;
      }
      if (actualData.audio && typeof actualData.audio === 'object') {
        const audio = actualData.audio as Record<string, unknown>;
        return typeof audio.url === 'string' ? audio.url : null;
      }
      if (typeof actualData.url === 'string') {
        return actualData.url;
      }
      break;
    }

    default: {
      break;
    }
  }

  return null;
};

// This function should be called from within a React component context where useAuth is available
export const createUploadFileFunction = () => {
  // This should be called within a component where useAuth hook is available
  const { user } = db.useAuth();

  return async (
    file: File,
    bucket: 'avatars' | 'files' | 'screenshots' = 'files'
  ): Promise<{ url: string; type: string; path: string }> => {
    if (!user) {
      throw new Error('User must be authenticated to upload files');
    }

    const extension = file.name.split('.').pop();
    const filename = `${id()}.${extension}`;
    const path = `${bucket}/${user.id}/${filename}`;

    try {
      // Upload to InstantDB storage
      const { data } = await db.storage.uploadFile(path, file, {
        contentType: file.type,
      });

      return {
        url: (data as unknown as { url: string; path: string }).url,
        type: file.type,
        path: (data as unknown as { url: string; path: string }).path,
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error(`Failed to upload file: ${error}`);
    }
  };
};

// Alternative approach: direct upload with user passed as parameter
export const uploadFileToInstantDB = async (
  file: File,
  userId: string,
  bucket: 'avatars' | 'files' | 'screenshots' = 'files'
): Promise<{ url: string; type: string; path: string }> => {
  const extension = file.name.split('.').pop();
  const filename = `${id()}.${extension}`;
  const path = `${bucket}/${userId}/${filename}`;

  try {
    // Upload to InstantDB storage
    const { data } = await db.storage.uploadFile(path, file, {
      contentType: file.type,
    });

    return {
      url: (data as unknown as { url: string; path: string }).url,
      type: file.type,
      path: (data as unknown as { url: string; path: string }).path,
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error(`Failed to upload file: ${error}`);
  }
};
