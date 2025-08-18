'use server';

import type { Edge, Node, Viewport } from '@xyflow/react';
import { experimental_generateSpeech as generateSpeech } from 'ai';

import { nanoid } from 'nanoid';
import { requireAuth } from '@/lib/auth';
import { parseError } from '@/lib/error/parse';
import { adminDb } from '@/lib/instantdb-admin';
import { speechModels } from '@/lib/models/speech';
import { uploadFile } from '@/lib/storage';
import { trackCreditUsage } from '@/lib/stripe';

type GenerateSpeechActionProps = {
  text: string;
  modelId: string;
  nodeId: string;
  projectId: string;
  instructions?: string;
  voice?: string;
};

export const generateSpeechAction = async ({
  text,
  nodeId,
  modelId,
  projectId,
  instructions,
  voice,
}: GenerateSpeechActionProps): Promise<
  | {
      nodeData: object;
    }
  | {
      error: string;
    }
> => {
  try {
    const userId = await requireAuth();

    const model = speechModels[modelId];

    if (!model) {
      throw new Error('Model not found');
    }

    const provider = model.providers[0];

    const { audio } = await generateSpeech({
      model: provider.model,
      text,
      outputFormat: 'mp3',
      instructions,
      voice,
    });

    await trackCreditUsage({
      action: 'generate_speech',
      cost: provider.getCost(text.length),
    });

    const fileName = `${nanoid()}.mp3`;

    // Upload to InstantDB Storage
    const { url: instantUrl } = await uploadFile(
      audio.uint8Array,
      userId,
      fileName,
      audio.mediaType
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
        type: audio.mediaType,
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
