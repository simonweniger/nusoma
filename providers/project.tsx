'use client';

import type { InstaQLEntity } from '@instantdb/react';
import { createContext, type ReactNode, useContext } from 'react';
import type { AppSchema } from '@/lib/instantdb';
import db from '@/lib/instantdb';

type Project = InstaQLEntity<AppSchema, 'projects'>;

type ProjectContextType = {
  project: Project | null;
  isLoading: boolean;
  error: { message: string } | undefined;
  updateProject: (updates: Partial<Project>) => void;
};

export const ProjectContext = createContext<ProjectContextType>({
  project: null,
  isLoading: true,
  error: undefined,
  // biome-ignore lint/suspicious/noEmptyBlockStatements: best solution here
  updateProject: () => {},
});

export const useProject = () => {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }

  return context;
};

export const ProjectProvider = ({
  children,
  projectId,
}: {
  children: ReactNode;
  projectId: string;
}) => {
  // Use InstantDB's real-time query
  const { isLoading, error, data } = db.useQuery({
    projects: {
      $: { where: { id: projectId } },
    },
  });

  const project = data?.projects?.[0] || null;

  const updateProject = (updates: Partial<Project>) => {
    // biome-ignore lint/style/useBlockStatements: best solution here
    if (!project?.id) return;

    db.transact(db.tx.projects[project.id].update(updates));
  };

  return (
    <ProjectContext.Provider
      value={{
        project,
        isLoading,
        error,
        updateProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
