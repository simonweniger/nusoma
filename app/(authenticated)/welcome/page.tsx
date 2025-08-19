import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentUserProfile } from '@/lib/auth';
import { adminDb } from '@/lib/instantdb-admin';
import { createProject } from '@/lib/mutations/create-project';
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
    const projectId = await createProject('Welcome', true);

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
