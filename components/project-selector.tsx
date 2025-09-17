'use client';

import Fuse from 'fuse.js';
import { CheckIcon, PlusIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  type FormEventHandler,
  Fragment,
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
} from '@/components/ui/kibo-ui/combobox';
import { createProject } from '@/data/mutations/create-project';
import { useAuth } from '@/hooks/use-auth';
import { handleError } from '@/lib/error/handle';
import db from '@/lib/instantdb';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';

type ProjectSelectorProps = {
  currentProject: string;
};

export const ProjectSelector = ({ currentProject }: ProjectSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentProject);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  // Get the current InstantDB user
  const instantUser = db.useAuth();

  // Debug: Let's see what we're working with first
  console.log('ProjectSelector Debug:', {
    isSignedIn,
    isLoaded,
    instantUser: instantUser.user,
    currentProject,
  });

  // Alternative approach: Query all projects with owner info, then filter client-side
  // This follows the pattern used in the server-side code that works
  const {
    data: projectData,
    isLoading,
    error,
  } = db.useQuery(
    isSignedIn && isLoaded && instantUser.user
      ? {
          projects: {
            owner: {},
            members: {},
          },
        }
      : {}
  );

  // Debug the query results
  console.log('Query results:', {
    projectData,
    isLoading,
    error,
  });

  const allProjectsFromDB = projectData?.projects || [];

  console.log('All projects from DB:', allProjectsFromDB);

  // Filter and categorize projects based on user relationship
  const allProjects = useMemo(() => {
    if (!instantUser.user?.id || allProjectsFromDB.length === 0) {
      return [];
    }

    const currentUserId = instantUser.user.id;
    const userProjects: Array<
      (typeof allProjectsFromDB)[0] & { isOwner: boolean }
    > = [];

    for (const project of allProjectsFromDB) {
      console.log(`Checking project ${project.name}:`, {
        project,
        hasOwner: Boolean(project.owner),
        ownerId: project.owner?.id,
        currentUserId,
        members: project.members,
      });

      // Check if user owns the project
      const isOwner = project.owner?.id === currentUserId;

      // Check if user is a member of the project
      const isMember = project.members?.some(
        (member) => member.id === currentUserId
      );

      const shouldInclude = isOwner || isMember || !project.owner;

      console.log(`Project ${project.name} relationship:`, {
        isOwner,
        isMember,
        hasOwnerData: Boolean(project.owner),
        shouldInclude,
      });

      // TEMPORARY FIX: Since owner relationships aren't being populated,
      // include all projects for now (you're the only user)
      // TODO: Fix the owner relationship query issue

      if (shouldInclude) {
        userProjects.push({
          ...project,
          isOwner: isOwner || !project.owner, // Assume ownership if no owner data
        });
      }
    }

    console.log('Filtered user projects:', userProjects);
    return userProjects;
  }, [allProjectsFromDB, instantUser.user?.id]);

  const fuse = useMemo(
    () =>
      new Fuse(allProjects, {
        keys: ['name'],
        minMatchCharLength: 1,
        threshold: 0.3,
      }),
    [allProjects]
  );

  const handleCreateProject = useCallback<FormEventHandler<HTMLFormElement>>(
    async (event) => {
      event.preventDefault();

      if (isCreating) {
        return;
      }

      setIsCreating(true);

      try {
        const result = await createProject(name.trim());

        if ('error' in result) {
          throw new Error(result.error);
        }

        setOpen(false);
        setName('');
        router.push(`/projects/${result.id}`);
      } catch (error) {
        handleError('Error creating project', error);
      } finally {
        setIsCreating(false);
      }
    },
    [isCreating, name, router]
  );

  const handleSelect = useCallback(
    (projectId: string) => {
      if (projectId === 'new') {
        setCreateOpen(true);
        return;
      }

      setValue(projectId);
      setOpen(false);
      router.push(`/projects/${projectId}`);
    },
    [router]
  );

  const projectGroups = useMemo(() => {
    if (!instantUser.user?.id || allProjects.length === 0) {
      return [];
    }

    const owned = allProjects.filter((project) => project.isOwner);
    const shared = allProjects.filter((project) => !project.isOwner);

    return [
      {
        label: 'My Projects',
        data: owned,
      },
      {
        label: 'Shared Projects',
        data: shared,
      },
    ];
  }, [allProjects, instantUser.user?.id]);

  const filterByFuse = useCallback(
    (currentValue: string, search: string) => {
      return fuse
        .search(search)
        .find((result) => result.item.id === currentValue)
        ? 1
        : 0;
    },
    [fuse]
  );

  return (
    <>
      <Combobox
        data={allProjects.map((project) => ({
          label: project.name,
          value: project.id,
        }))}
        onOpenChange={setOpen}
        onValueChange={handleSelect}
        open={open}
        type="project"
        value={value}
      >
        <ComboboxTrigger className="w-[200px] rounded-full border-none bg-transparent shadow-none" />
        <ComboboxContent
          className="p-0"
          filter={filterByFuse}
          popoverOptions={{
            sideOffset: 8,
          }}
        >
          <ComboboxInput />
          <ComboboxList>
            <ComboboxEmpty />
            {projectGroups
              .filter((group) => group.data.length > 0)
              .map((group) => (
                <Fragment key={group.label}>
                  <ComboboxGroup heading={group.label}>
                    {group.data.map((project) => (
                      <ComboboxItem key={project.id} value={project.id}>
                        {project.name}
                        <CheckIcon
                          className={cn(
                            'ml-auto',
                            value === project.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                      </ComboboxItem>
                    ))}
                  </ComboboxGroup>
                  <ComboboxSeparator />
                </Fragment>
              ))}
            <ComboboxGroup>
              <ComboboxItem value="new">
                <PlusIcon size={16} />
                Create new project
              </ComboboxItem>
            </ComboboxGroup>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <Dialog modal={false} onOpenChange={setCreateOpen} open={createOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new project</DialogTitle>
            <DialogDescription>
              What would you like to call your new project?
            </DialogDescription>
            <form
              aria-disabled={isCreating}
              className="mt-2 flex items-center gap-2"
              onSubmit={handleCreateProject}
            >
              <Input
                onChange={({ target }) => setName(target.value)}
                placeholder="My new project"
                value={name}
              />
              <Button disabled={isCreating || !name.trim()} type="submit">
                Create
              </Button>
            </form>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};
