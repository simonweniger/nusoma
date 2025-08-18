'use server';

import { requireAuth } from '@/lib/auth';
import { parseError } from '@/lib/error/parse';
import { adminDb } from '@/lib/instantdb-admin';

export const updateProjectAction = async (
  projectId: string,
  data: Record<string, unknown>
): Promise<
  | {
      success: true;
    }
  | {
      error: string;
    }
> => {
  try {
    const userId = await requireAuth();

    // First check if project exists and user owns it
    const { projects: projectResults } = await adminDb.query({
      projects: {
        $: {
          where: { id: projectId },
        },
        owner: {},
      },
    });

    const project = projectResults[0];

    if (!project || project.owner?.id !== userId) {
      throw new Error('Project not found or access denied');
    }

    await adminDb.transact([
      adminDb.tx.projects[projectId].update({
        ...data,
        updatedAt: Date.now(),
      }),
    ]);

    return { success: true };
  } catch (error) {
    const message = parseError(error);

    return { error: message };
  }
};
