import { id } from '@instantdb/react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentInstantUser, currentUserProfile } from '@/lib/auth';
import { adminDb } from '@/lib/instantdb-admin';
import { ProjectProvider } from '@/providers/project';
import { WelcomeDemo } from './components/welcome-demo';

const title = 'Welcome to nusoma!';
const description =
  "nusoma is a platform for creating and sharing AI-powered projects. Let's get started by creating a flow, together.";

export const metadata: Metadata = {
  title,
  description,
};

const Welcome = async () => {
  const userProfile = await currentUserProfile();

  if (!userProfile) {
    return redirect('/sign-in');
  }

  const instantUser = await currentInstantUser();

  const { projects: welcomeProjects } = await adminDb.query({
    projects: {
      $: {
        where: {
          and: [{ 'owner.id': userProfile.id }, { welcomeProject: true }],
        },
      },
    },
  });

  let welcomeProject = welcomeProjects?.[0];

  if (!welcomeProject) {
    // Create project directly using adminDb for server-side creation
    const projectId = id();

    await adminDb.transact([
      adminDb.tx.projects[projectId]
        .update({
          name: 'Welcome',
          transcriptionModel: 'openai-whisper-large-v3',
          visionModel: 'anthropic-claude-3-5-sonnet-20241022',
          welcomeProject: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .link({ owner: instantUser.id }),
    ]);

    const { projects: newProjects } = await adminDb.query({
      projects: {
        $: { where: { id: projectId } },
      },
    });

    welcomeProject = newProjects[0];
  }

  if (!welcomeProject) {
    throw new Error('Failed to create welcome project');
  }

  return (
    <div className="flex flex-col gap-4">
      <ProjectProvider projectId={welcomeProject.id}>
        <WelcomeDemo description={description} title={title} />
      </ProjectProvider>
    </div>
  );
};

export default Welcome;
