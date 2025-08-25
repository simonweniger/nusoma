'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { createProject } from '@/data/mutations/create-project';
import db from '@/lib/instantdb';

const Projects = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();

  // Query user's projects
  const { data, isLoading: dataLoading } = db.useQuery(
    user
      ? {
          projects: {
            $: { where: { 'owner.id': user.id } },
          },
        }
      : {}
  );

  const userProjects = data?.projects || [];

  useEffect(() => {
    if (authLoading || dataLoading) {
      return;
    }

    if (!user) {
      router.push('/sign-in');
      return;
    }

    const handleProjectNavigation = async () => {
      const project = userProjects[0];

      if (!project) {
        try {
          const projectId = await createProject('Untitled Project', user.id);
          router.push(`/projects/${projectId}`);
          return;
        } catch (error) {
          console.error('Failed to create project:', error);
          return;
        }
      }

      router.push(`/projects/${project.id}`);
    };

    handleProjectNavigation();
  }, [user, userProjects, authLoading, dataLoading, router]);

  // Show loading state
  if (authLoading || dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
          <p className="mt-4 text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  return null; // This component only handles navigation
};

export default Projects;
