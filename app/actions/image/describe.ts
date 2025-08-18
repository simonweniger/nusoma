'use server';

import OpenAI from 'openai';
import { requireAuth } from '@/lib/auth';
import { parseError } from '@/lib/error/parse';
import { adminDb } from '@/lib/instantdb-admin';
import { visionModels } from '@/lib/models/vision';

export const describeAction = async (
  url: string,
  projectId: string
): Promise<
  | {
      description: string;
    }
  | {
      error: string;
    }
> => {
  try {
    await requireAuth();

    const openai = new OpenAI();

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

    const model = visionModels[project.visionModel];

    if (!model) {
      throw new Error('Model not found');
    }

    let parsedUrl = url;

    if (process.env.NODE_ENV !== 'production') {
      const response = await fetch(url);
      const blob = await response.blob();

      parsedUrl = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;
    }

    const response = await openai.chat.completions.create({
      model: model.providers[0].model as string,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this image.' },
            {
              type: 'image_url',
              image_url: {
                url: parsedUrl,
              },
            },
          ],
        },
      ],
    });

    const description = response.choices.at(0)?.message.content;

    if (!description) {
      throw new Error('No description found');
    }

    return {
      description,
    };
  } catch (error) {
    const message = parseError(error);

    return { error: message };
  }
};
