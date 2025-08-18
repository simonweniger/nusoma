'use server';

import { experimental_transcribe as transcribe } from 'ai';
import { requireAuth } from '@/lib/auth';
import { parseError } from '@/lib/error/parse';
import { adminDb } from '@/lib/instantdb-admin';
import { transcriptionModels } from '@/lib/models/transcription';

export const transcribeAction = async (
  url: string,
  projectId: string
): Promise<
  | {
      transcript: string;
    }
  | {
      error: string;
    }
> => {
  try {
    await requireAuth();

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

    const model = transcriptionModels[project.transcriptionModel];

    if (!model) {
      throw new Error('Model not found');
    }

    const provider = model.providers[0];
    const transcript = await transcribe({
      model: provider.model,
      audio: new URL(url),
    });

    return {
      transcript: transcript.text,
    };
  } catch (error) {
    const message = parseError(error);

    return { error: message };
  }
};
