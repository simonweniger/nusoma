import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createProjectAction } from '@/app/actions/project/create';
import { currentUser } from '@/lib/auth';
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
  const user = await currentUser();

  if (!user) {
    return redirect('/sign-in');
  }

  const { projects: welcomeProjects } = await adminDb.query({
    projects: {
      $: {
        where: {
          and: [{ 'owner.id': user.id }, { welcomeProject: true }],
        },
      },
    },
  });

  let welcomeProject = welcomeProjects?.[0];

  if (!welcomeProject) {
    const response = await createProjectAction('Welcome', true);

    if ('error' in response) {
      return <div>Error: {response.error}</div>;
    }

    const { projects: newProjects } = await adminDb.query({
      projects: {
        $: { where: { id: response.id } },
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
