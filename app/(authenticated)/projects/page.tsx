import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createProject } from '@/data/mutations/create-project';
import { currentUser, currentUserProfile } from '@/lib/auth';
import { adminDb } from '@/lib/instantdb-admin';

export const metadata: Metadata = {
  title: 'nusoma',
  description: 'Create and share AI workflows',
};

export const maxDuration = 800; // 13 minutes

const Projects = async () => {
  const user = await currentUser();

  if (!user) {
    return redirect('/sign-in');
  }

  const profile = await currentUserProfile();

  if (!profile?.onboardedAt) {
    return redirect('/welcome');
  }

  const { projects: userProjects } = await adminDb.query({
    projects: {
      $: { where: { 'owner.id': profile.id } },
    },
  });

  let project = userProjects[0];

  if (!project) {
    const result = await createProject('Untitled Project');

    if ('error' in result) {
      throw new Error(result.error);
    }

    const { projects: newProjects } = await adminDb.query({
      projects: {
        $: { where: { id: result.id } },
      },
    });

    const newFetchedProject = newProjects[0];

    if (!newFetchedProject) {
      throw new Error('Failed to create project');
    }

    project = newFetchedProject;
  }

  redirect(`/projects/${project.id}`);
};

export default Projects;
