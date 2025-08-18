import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Canvas } from '@/components/canvas';
import { Controls } from '@/components/controls';
import { Reasoning } from '@/components/reasoning';
import { SaveIndicator } from '@/components/save-indicator';
import { Toolbar } from '@/components/toolbar';
import { TopLeft } from '@/components/top-left';
import { TopRight } from '@/components/top-right';
import { currentUserProfile } from '@/lib/auth';
import { adminDb } from '@/lib/instantdb-admin';
import { ProjectProvider } from '@/providers/project';

export const metadata: Metadata = {
  title: 'nusoma',
  description: 'Create and share AI workflows',
};

export const maxDuration = 800; // 13 minutes

type ProjectProps = {
  params: Promise<{
    projectId: string;
  }>;
};

const Project = async ({ params }: ProjectProps) => {
  const { projectId } = await params;
  const profile = await currentUserProfile();

  if (!profile) {
    return null;
  }

  if (!profile.onboardedAt) {
    return redirect('/welcome');
  }

  // Query project from InstantDB to ensure it exists
  const { projects: projectsData } = await adminDb.query({
    projects: {
      $: { where: { id: projectId } },
    },
  });

  const project = projectsData[0];

  if (!project) {
    notFound();
  }

  return (
    <div className="flex h-screen w-screen items-stretch overflow-hidden">
      <div className="relative flex-1">
        <ProjectProvider projectId={projectId}>
          <Canvas>
            <Controls />
            <Toolbar />
            <SaveIndicator />
          </Canvas>
        </ProjectProvider>
        <Suspense fallback={null}>
          <TopLeft id={projectId} />
        </Suspense>
        <Suspense fallback={null}>
          <TopRight id={projectId} />
        </Suspense>
      </div>
      <Reasoning />
    </div>
  );
};

export default Project;
