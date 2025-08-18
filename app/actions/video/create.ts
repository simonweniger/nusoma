'use server';

import type { Edge, Node, Viewport } from '@xyflow/react';

import { nanoid } from 'nanoid';
import { requireAuth } from '@/lib/auth';
import { parseError } from '@/lib/error/parse';
import { adminDb } from '@/lib/instantdb-admin';
import { videoModels } from '@/lib/models/video';
import { uploadFile } from '@/lib/storage';
import { trackCreditUsage } from '@/lib/stripe';

type GenerateVideoActionProps = {
  modelId: string;
  prompt: string;
  images: {
    url: string;
    type: string;
  }[];
  nodeId: string;
  projectId: string;
};

export const generateVideoAction = async ({
  modelId,
  prompt,
  images,
  nodeId,
  projectId,
}: GenerateVideoActionProps): Promise<
  | {
      nodeData: object;
    }
  | {
      error: string;
    }
> => {
  try {
    const userId = await requireAuth();
    const model = videoModels[modelId];

    if (!model) {
      throw new Error('Model not found');
    }

    const provider = model.providers[0];

    let firstFrameImage = images.at(0)?.url;

    if (firstFrameImage && process.env.NODE_ENV !== 'production') {
      const response = await fetch(firstFrameImage);
      const blob = await response.blob();
      const uint8Array = new Uint8Array(await blob.arrayBuffer());
      const base64 = Buffer.from(uint8Array).toString('base64');

      firstFrameImage = `data:${images.at(0)?.type};base64,${base64}`;
    }

    const url = await provider.model.generate({
      prompt,
      imagePrompt: firstFrameImage,
      duration: 5,
      aspectRatio: '16:9',
    });

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();

    await trackCreditUsage({
      action: 'generate_video',
      cost: provider.getCost({ duration: 5 }),
    });

    const fileName = `${nanoid()}.mp4`;

    // Upload to InstantDB Storage
    const { url: instantUrl } = await uploadFile(
      new Uint8Array(arrayBuffer),
      userId,
      fileName,
      'video/mp4'
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

    const newData = {
      ...(existingNode.data ?? {}),
      updatedAt: new Date().toISOString(),
      generated: {
        url: instantUrl,
        type: 'video/mp4',
      },
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
