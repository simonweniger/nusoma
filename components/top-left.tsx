'use client';

import { useAuth } from '@/hooks/use-auth';
import db from '@/lib/instantdb';
import { ProjectSelector } from './project-selector';
import { ProjectSettings } from './project-settings';

type TopLeftProps = {
  id: string;
};

export const TopLeft = ({ id }: TopLeftProps) => {
  const { isSignedIn, isLoaded } = useAuth();
  const instantUser = db.useAuth();

  // Query projects that the user owns
  const { data, isLoading } = db.useQuery(
    isSignedIn && isLoaded && instantUser.user
      ? {
          projects: {
            $: { where: {} },
            owner: {},
          },
        }
      : {}
  );

  // Don't render anything if still loading or not signed in
  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return null;
  }

  if (isLoading) {
    return null;
  }

  const allProjects = data?.projects || [];

  if (!allProjects.length) {
    return null;
  }

  const currentProject = allProjects.find((project) => project.id === id);

  if (!currentProject) {
    return null;
  }

  return (
    <div className="absolute top-16 right-0 left-0 z-[50] m-4 flex items-center gap-2 sm:top-0 sm:right-auto">
      <div className="flex flex-1 items-center rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
        <ProjectSelector currentProject={currentProject.id} />
      </div>
      <div className="flex shrink-0 items-center rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
        <ProjectSettings data={currentProject} />
      </div>
    </div>
  );
};
