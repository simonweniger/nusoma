'use server';

import { id } from '@instantdb/react';
import { currentUserProfile, requireAuth } from '@/lib/auth';
import { parseError } from '@/lib/error/parse';
import { adminDb } from '@/lib/instantdb-admin';
import { transcriptionModels } from '@/lib/models/transcription';
import { visionModels } from '@/lib/models/vision';

const defaultTranscriptionModel = Object.entries(transcriptionModels).find(
  ([_, model]) => model.default
);

const defaultVisionModel = Object.entries(visionModels).find(
  ([_, model]) => model.default
);

if (!defaultTranscriptionModel) {
  throw new Error('No default transcription model found');
}

if (!defaultVisionModel) {
  throw new Error('No default vision model found');
}

export const createProjectAction = async (
  name: string,
  welcomeProject?: boolean
): Promise<
  | {
      id: string;
    }
  | {
      error: string;
    }
> => {
  try {
    await requireAuth();
    const userProfile = await currentUserProfile();

    const projectId = id();

    await adminDb.transact([
      adminDb.tx.projects[projectId]
        .update({
          name,
          transcriptionModel: defaultTranscriptionModel[0],
          visionModel: defaultVisionModel[0],
          welcomeProject: Boolean(welcomeProject),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .link({ owner: userProfile.id }), // Use InstantDB user UUID
    ]);

    return { id: projectId };
  } catch (error) {
    const message = parseError(error);

    return { error: message };
  }
};
