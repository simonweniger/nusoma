import { currentUser } from '@/lib/auth';
import { adminDb } from '@/lib/instantdb-admin';
import { ProjectSelector } from './project-selector';
import { ProjectSettings } from './project-settings';

type TopLeftProps = {
  id: string;
};

export const TopLeft = async ({ id }: TopLeftProps) => {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  const { projects: allProjects } = await adminDb.query({
    projects: {
      $: { where: { 'owner.id': user.id } },
    },
  });

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
        <ProjectSelector
          currentProject={currentProject.id}
          projects={allProjects}
        />
      </div>
      <div className="flex shrink-0 items-center rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
        <ProjectSettings data={currentProject} />
      </div>
    </div>
  );
};
