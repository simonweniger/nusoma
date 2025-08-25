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

  // Query all projects with their owners and members (only when authenticated)
  const { data: projectData } = db.useQuery(
    isSignedIn && isLoaded && instantUser.user
      ? {
          projects: {
            owner: {},
            members: {},
          },
        }
      : {}
  );
  const allProjects = projectData?.projects || [];

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
        const projectId = await createProject(
          name.trim(),
          instantUser.user?.id
        );

        setOpen(false);
        setName('');
        router.push(`/projects/${projectId}`);
      } catch (error) {
        handleError('Error creating project', error);
      } finally {
        setIsCreating(false);
      }
    },
    [isCreating, name, router, instantUser.user?.id]
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

    const currentUserId = instantUser.user.id;

    const ownedProjects = allProjects.filter((project) => {
      return project.owner?.id === currentUserId;
    });

    const sharedProjects = allProjects.filter((project) => {
      if (project.owner?.id === currentUserId) {
        return false;
      }

      // Check if current user is in the members relationship
      return (
        project.members?.some((member) => member.id === currentUserId) ?? false
      );
    });

    return [
      {
        label: 'My Projects',
        data: ownedProjects,
      },
      {
        label: 'Shared Projects',
        data: sharedProjects,
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
