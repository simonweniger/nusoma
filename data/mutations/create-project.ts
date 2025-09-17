'use server';

import { id } from '@instantdb/admin';
import { currentUserProfile } from '@/lib/auth';
import { parseError } from '@/lib/error/parse';
import { adminDb } from '@/lib/instantdb-admin';
import { transcriptionModels } from '@/lib/models/transcription';
import { visionModels } from '@/lib/models/vision';

export const createProject = async (
  name: string,
  welcomeProject = false
): Promise<
  | {
      success: true;
      id: string;
    }
  | {
      error: string;
    }
> => {
  try {
    const profile = await currentUserProfile();

    if (!profile?.user) {
      throw new Error('User profile not found or not linked');
    }

    const defaultTranscriptionModel = Object.entries(transcriptionModels).find(
      ([_, model]) => model.default
    );
    const defaultVisionModel = Object.entries(visionModels).find(
      ([_, model]) => model.default
    );

    if (!(defaultTranscriptionModel && defaultVisionModel)) {
      throw new Error('Default models not found');
    }

    const projectId = id();

    await adminDb.transact([
      adminDb.tx.projects[projectId]
        .update({
          name,
          transcriptionModel: defaultTranscriptionModel[0],
          visionModel: defaultVisionModel[0],
          welcomeProject,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .link({ owner: profile.user.id }), // Link to the user
    ]);

    return {
      success: true,
      id: projectId,
    };
  } catch (error) {
    const message = parseError(error);
    return { error: message };
  }
};
