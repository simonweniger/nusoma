'use server';

import { id } from '@instantdb/react';
import type { Edge, Node, Viewport } from '@xyflow/react';
import {
  type Experimental_GenerateImageResult,
  experimental_generateImage as generateImage,
} from 'ai';
import { nanoid } from 'nanoid';
import OpenAI, { toFile } from 'openai';
import { requireAuth } from '@/lib/auth';
import { parseError } from '@/lib/error/parse';
import { adminDb } from '@/lib/instantdb-admin';
import { imageModels } from '@/lib/models/image';
import { uploadFile } from '@/lib/storage';
import { trackCreditUsage } from '@/lib/stripe';

type EditImageActionProps = {
  images: {
    url: string;
    type: string;
  }[];
  modelId: string;
  instructions?: string;
  nodeId: string;
  projectId: string;
  size?: string;
};

const generateGptImage1Image = async ({
  prompt,
  size,
  images,
}: {
  prompt: string;
  size?: string;
  images: {
    url: string;
    type: string;
  }[];
}) => {
  const openai = new OpenAI();
  const promptImages = await Promise.all(
    images.map(async (image) => {
      const response = await fetch(image.url);
      const blob = await response.blob();

      return toFile(blob, nanoid(), {
        type: image.type,
      });
    })
  );

  const response = await openai.images.edit({
    model: 'gpt-image-1',
    image: promptImages,
    prompt,
    size: size as never | undefined,
    quality: 'high',
  });

  const json = response.data?.at(0)?.b64_json;

  if (!json) {
    throw new Error('No response JSON found');
  }

  const image: Experimental_GenerateImageResult['image'] = {
    base64: json,
    uint8Array: Buffer.from(json, 'base64'),
    mediaType: 'image/png',
  };

  return {
    image,
    usage: {
      textInput: response.usage?.input_tokens_details.text_tokens,
      imageInput: response.usage?.input_tokens_details.image_tokens,
      output: response.usage?.output_tokens,
    },
  };
};

export const editImageAction = async ({
  images,
  instructions,
  modelId,
  nodeId,
  projectId,
  size,
}: EditImageActionProps): Promise<
  | {
      nodeData: object;
    }
  | {
      error: string;
    }
> => {
  try {
    const userId = await requireAuth();

    const model = imageModels[modelId];

    if (!model) {
      throw new Error('Model not found');
    }

    if (!model.supportsEdit) {
      throw new Error('Model does not support editing');
    }

    const provider = model.providers[0];

    let image: Experimental_GenerateImageResult['image'] | undefined;

    const defaultPrompt =
      images.length > 1
        ? 'Create a variant of the image.'
        : 'Create a single variant of the images.';

    const prompt =
      !instructions || instructions === '' ? defaultPrompt : instructions;

    if (provider.model.modelId === 'gpt-image-1') {
      const generatedImageResponse = await generateGptImage1Image({
        prompt,
        images,
        size,
      });

      await trackCreditUsage({
        action: 'generate_image',
        cost: provider.getCost({
          ...generatedImageResponse.usage,
          size,
        }),
      });

      image = generatedImageResponse.image;
    } else {
      const base64Image = await fetch(images[0].url)
        .then((res) => res.arrayBuffer())
        .then((buffer) => Buffer.from(buffer).toString('base64'));

      const generatedImageResponse = await generateImage({
        model: provider.model,
        prompt,
        size: size as never,
        providerOptions: {
          bfl: {
            image: base64Image,
          },
        },
      });

      await trackCreditUsage({
        action: 'generate_image',
        cost: provider.getCost({
          size,
        }),
      });

      image = generatedImageResponse.image;
    }

    const bytes = Buffer.from(image.base64, 'base64');
    const contentType = 'image/png';
    const fileName = `${nanoid()}.png`;

    // Upload to InstantDB Storage
    const { url: instantUrl } = await uploadFile(
      bytes,
      userId,
      fileName,
      contentType
    );

    const { projects: projectResults } = await adminDb.query({
      projects: {
        $: {
          where: { id: projectId },
        },
      },
    });

    const project = projectResults[0];

    if (!project) {
      throw new Error('Project not found');
    }

    const content = project.content as {
      nodes: Node[];
      edges: Edge[];
      viewport: Viewport;
    };

    const existingNode = content.nodes.find((n) => n.id === nodeId);

    if (!existingNode) {
      throw new Error('Node not found');
    }

    // Create media item in InstantDB for the gallery
    const mediaItemId = id();

    await adminDb.transact([
      // Create the media item
      adminDb.tx.mediaItems[mediaItemId]
        .update({
          kind: 'generated',
          nodeId,
          mediaType: 'image',
          status: 'completed',
          url: instantUrl,
          input: {
            prompt: instructions ?? defaultPrompt,
            instructions,
            modelId,
            size: size || undefined,
            images: images.map((img) => img.url),
          },
          output: {
            url: instantUrl,
            type: contentType,
            description: instructions ?? defaultPrompt,
          },
          metadata: {
            provider: provider.model.modelId,
            size: size || undefined,
            editType: 'variant',
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .link({ project: projectId }),
    ]);

    const newData = {
      ...(existingNode.data ?? {}),
      updatedAt: new Date().toISOString(),
      generated: {
        url: instantUrl,
        type: contentType,
      },
      description: instructions ?? defaultPrompt,
    };

    const updatedNodes = content.nodes.map((existingNode) => {
      if (existingNode.id === nodeId) {
        return {
          ...existingNode,
          data: newData,
        };
      }

      return existingNode;
    });

    await adminDb.transact([
      adminDb.tx.projects[projectId].update({
        content: { ...content, nodes: updatedNodes },
        updatedAt: Date.now(),
      }),
    ]);

    return {
      nodeData: newData,
    };
  } catch (error) {
    const message = parseError(error);

    return { error: message };
  }
};
