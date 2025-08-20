import { id } from '@instantdb/react';
import db from '@/lib/instantdb';
import { transcriptionModels } from '@/lib/models/transcription';
import { visionModels } from '@/lib/models/vision';

export const createProject = async (
  name: string,
  welcomeProject = false
): Promise<string> => {
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

  await db.transact([
    db.tx.projects[projectId].update({
      name,
      transcriptionModel: defaultTranscriptionModel[0],
      visionModel: defaultVisionModel[0],
      welcomeProject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  ]);

  return projectId;
};
