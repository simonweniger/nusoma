"use client";

import Logo from "./Logo";
import {
  PlusIcon,
  MoonStarsIcon,
  SunIcon,
  SignOutIcon,
  SignInIcon,
  DiamondsFourIcon,
  GithubLogoIcon,
  FolderIcon,
  FolderPlusIcon,
  CaretRightIcon,
  FolderOpenIcon,
  GridFourIcon,
} from "@phosphor-icons/react";
import { useAuth } from "@/providers/auth-provider";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import hotkeys from "hotkeys-js";
import { AppSchema } from "@/instant.schema";
import { InstaQLEntity, id } from "@instantdb/react";
import NumberFlow from "@number-flow/react";
import { DateTime } from "luxon";
import PlansDialog from "./PlansDialog";
import FolderDialog from "./FolderDialog";
import { Reorder, useDragControls } from "framer-motion";
type Project = InstaQLEntity<AppSchema, "canvasProjects", { folder: {} }>;
type Folder = InstaQLEntity<AppSchema, "folders", { projects: {} }>;

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, profile, db, sessionId } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const currentProjectId = pathname.startsWith("/canvas/")
    ? pathname.split("/")[2]
    : null;
  const currentFolderId = pathname.startsWith("/folder/")
    ? pathname.split("/")[2]
    : null;

  // State for folder management
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [folderDialogMode, setFolderDialogMode] = useState<"create" | "rename">(
    "create",
  );
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  // Query folders and projects
  const {
    data: foldersData,
    isLoading: foldersLoading,
    error: foldersError,
  } = db.useQuery(
    user
      ? {
          folders: {
            $: {
              where: { "user.id": user.id },
              order: { order: "asc" },
            },
            projects: {},
          },
        }
      : (null as any),
  );

  const { data: projectsData } = db.useQuery(
    user || sessionId
      ? {
          canvasProjects: {
            $: {
              where: user ? { "user.id": user.id } : { sessionId: sessionId! },
              order: { lastModified: "desc" },
            },
            folder: {},
          },
        }
      : (null as any),
  );

  const folders = (foldersData?.folders || []) as Folder[];
  const allProjects = (projectsData?.canvasProjects || []) as Project[];

  // Separate projects into those with folders and those without
  const projectsWithoutFolder = allProjects.filter((p) => !p.folder);

  // Use folders directly for display, only track reorder state separately
  const [isReordering, setIsReordering] = useState(false);
  const [tempOrderedFolders, setTempOrderedFolders] = useState<Folder[]>([]);

  // Use the actual folders from the query, unless we're actively reordering
  const displayFolders = isReordering ? tempOrderedFolders : folders;

  // Folder operations
  const createFolder = async (name: string) => {
    if (!user) return;

    const folderId = id();
    await db.transact([
      db.tx.folders[folderId]
        .update({
          name,
          order: folders.length,
          createdAt: new Date(),
        })
        .link({ user: user.id }),
    ]);
  };

  const renameFolder = async (name: string) => {
    if (!editingFolder) return;

    await db.transact([db.tx.folders[editingFolder.id].update({ name })]);
  };

  const deleteFolder = async (folderId: string) => {
    if (!confirm("Delete this folder? Projects will be moved to the root.")) {
      return;
    }

    // Get projects in this folder and unlink them
    const folder = folders.find((f) => f.id === folderId);
    if (folder?.projects) {
      const unlinkTxs = folder.projects.map((project: any) =>
        db.tx.canvasProjects[project.id].unlink({ folder: folderId }),
      );
      await db.transact(unlinkTxs);
    }

    // Delete the folder
    await db.transact([db.tx.folders[folderId].delete()]);
  };

  const moveProjectToFolder = async (
    projectId: string,
    folderId: string | null,
  ) => {
    const project = allProjects.find((p) => p.id === projectId);
    if (!project) return;

    const txs = [];

    // Unlink from current folder if exists
    if (project.folder) {
      txs.push(
        db.tx.canvasProjects[projectId].unlink({ folder: project.folder.id }),
      );
    }

    // Link to new folder if provided
    if (folderId) {
      txs.push(db.tx.canvasProjects[projectId].link({ folder: folderId }));
    }

    if (txs.length > 0) {
      await db.transact(txs);
    }
  };

  const handleReorderFolders = (newOrder: Folder[]) => {
    setIsReordering(true);
    setTempOrderedFolders(newOrder);
  };

  const handleReorderComplete = async () => {
    if (!isReordering) return;

    // Update order in database
    const txs = tempOrderedFolders.map((folder, index) =>
      db.tx.folders[folder.id].update({ order: index }),
    );
    await db.transact(txs);

    setIsReordering(false);
  };

  // Drag and drop state
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  // Drag and drop handlers for projects from dashboard
  const handleDrop = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDragOverFolder(null);
    const projectId = e.dataTransfer.getData("projectId");
    if (projectId) {
      await moveProjectToFolder(projectId, folderId);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (folderId: string | null) => {
    setDragOverFolder(folderId === null ? "drafts" : folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolder(null);
  };

  // Set up keyboard shortcuts
  useEffect(() => {
    // Shortcut 'n' to create a new conversation
    hotkeys("n", (event) => {
      // Prevent triggering shortcut if focus is inside an input or textarea
      if (
        !(
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLInputElement
        )
      ) {
        event.preventDefault();
        router.push("/");
      }
    });

    return () => {
      hotkeys.unbind("n");
    };
  }, [router]);

  const signOut = () => {
    db.auth.signOut();
  };

  const setTheme = async (theme: string) => {
    await db.transact(db.tx.userProfiles[profile?.id].update({ theme: theme }));
  };

  const url = db.auth.createAuthorizationURL({
    clientName: "google-web",
    redirectURL: window.location.href,
  });

  return (
    <div
      className={`flex flex-col md:flex-row h-dvh w-full overflow-hidden bg-background`}
    >
      {/* Sidebar */}
      <div className="flex-col p-2 items-start w-full max-w-64 overflow-hidden hidden md:flex">
        <div className="flex flex-row gap-2 justify-between w-full items-center">
          <Logo
            style="small"
            className="my-2 ml-1"
            color={profile?.theme === "dark" ? "white" : "black"}
          />

          <div className="flex flex-row gap-1">
            {profile && (
              <button
                onClick={() =>
                  setTheme(profile?.theme === "dark" ? "light" : "dark")
                }
                className="p-1 hover:bg-sage-3 dark:hover:bg-sage-4 rounded-md group transition-colors duration-300"
                aria-label={`Switch to ${profile?.theme === "light" ? "dark" : "light"} theme`}
              >
                {profile?.theme === "light" ? (
                  <MoonStarsIcon
                    size={16}
                    weight="bold"
                    className="text-sage-10 group-hover:text-sage-12 dark:text-sage-9 dark:group-hover:text-sage-11 transition-colors duration-300"
                  />
                ) : (
                  <SunIcon
                    size={16}
                    weight="bold"
                    className="text-sage-10 group-hover:text-sage-12 dark:text-sage-9 dark:group-hover:text-sage-11 transition-colors duration-300"
                  />
                )}
              </button>
            )}

            {user ? (
              <button
                onClick={() => signOut()}
                className="p-1 hover:bg-sage-3 dark:hover:bg-sage-4 rounded-md group transition-colors duration-300"
              >
                <SignOutIcon
                  size={16}
                  weight="bold"
                  className="text-sage-10 group-hover:text-sage-12 dark:text-sage-9 dark:group-hover:text-sage-11 transition-colors duration-300"
                />
              </button>
            ) : (
              <Link
                href={url}
                className="p-1 hover:bg-sage-3 dark:hover:bg-sage-4 rounded-md group transition-colors duration-300"
              >
                <SignInIcon
                  size={16}
                  weight="bold"
                  className="text-sage-10 group-hover:text-sage-12 dark:text-sage-9 dark:group-hover:text-sage-11 transition-colors duration-300"
                />
              </Link>
            )}
          </div>
        </div>
        {/* <Button onClick={createConversationAndRedirect} size="small" className="mt-2 w-full bg-sage-3 text-sage-11 hover:bg-sage-4 dark:bg-sage-3 dark:text-sage-11 dark:hover:bg-sage-4 duration-300 border border-sage-6 dark:border-sage-6" icon={<Plus size={16} weight="bold" />}>New Conversation</Button> */}

        {/* Folder List */}
        <div className="w-full flex flex-col h-full relative">
          <div className="flex flex-row items-center justify-between gap-2 py-4">
            <p className="text-xs font-mono px-2 text-sage-11 dark:text-sage-11">
              Folders
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setFolderDialogMode("create");
                  setEditingFolder(null);
                  setIsFolderDialogOpen(true);
                }}
                className="w-max bg-sage-3 text-sage-11 hover:bg-sage-4 dark:bg-sage-3 dark:text-sage-11 dark:hover:bg-sage-4 duration-300 border border-sage-6 dark:border-sage-6 rounded p-1 hover:cursor-pointer"
                title="New Folder"
              >
                <FolderPlusIcon size={12} weight="bold" />
              </button>
            </div>
          </div>
          <div className="flex flex-col w-full overflow-y-auto gap-1 relative">
            {/* All Projects Link */}
            <AllProjectsLink />

            {/* Virtual Drafts Folder */}
            <div
              onDrop={(e) => handleDrop(e, null)}
              onDragOver={handleDragOver}
              onDragEnter={() => handleDragEnter(null)}
              onDragLeave={handleDragLeave}
              className={`transition-all duration-200 rounded-md ${
                dragOverFolder === "drafts"
                  ? "bg-blue-50 dark:bg-blue-950 ring-2 ring-blue-500 dark:ring-blue-400 scale-[1.02] shadow-lg"
                  : ""
              }`}
            >
              <DraftsFolder
                projects={projectsWithoutFolder}
                currentProjectId={currentProjectId}
              />
            </div>

            {/* User Folders */}
            {displayFolders.length > 0 && (
              <Reorder.Group
                axis="y"
                values={displayFolders}
                onReorder={handleReorderFolders}
                className="flex flex-col gap-1"
              >
                {displayFolders.map((folder) => (
                  <div
                    key={folder.id}
                    onDrop={(e) => handleDrop(e, folder.id)}
                    onDragOver={handleDragOver}
                    onDragEnter={() => handleDragEnter(folder.id)}
                    onDragLeave={handleDragLeave}
                    className={`transition-all duration-200 rounded-md ${
                      dragOverFolder === folder.id
                        ? "bg-blue-50 dark:bg-blue-950 ring-2 ring-blue-500 dark:ring-blue-400 scale-[1.02] shadow-lg"
                        : ""
                    }`}
                  >
                    <FolderItem
                      folder={folder}
                      isActive={folder.id === currentFolderId}
                      onDragEnd={handleReorderComplete}
                    />
                  </div>
                ))}
              </Reorder.Group>
            )}
          </div>
        </div>

        {/* Credits section */}
        <div className="flex flex-col gap-2 border border-border bg-muted/50 rounded-md p-2 w-full mt-1 divide-y divide-border">
          <div className="flex flex-row gap-2 items-center justify-between pb-2">
            <div className="flex flex-row gap-1 items-center">
              <DiamondsFourIcon
                size={12}
                weight="fill"
                className="text-teal-9 group-hover:text-sage-12 transition-colors duration-300"
              />
              {user ? (
                <NumberFlow
                  value={user && profile?.credits ? profile?.credits : 100}
                  className="text-xs font-semibold text-sage-12 dark:text-sage-12"
                />
              ) : (
                <NumberFlow
                  value={0}
                  className="text-xs font-semibold text-sage-12 dark:text-sage-12"
                />
              )}
            </div>
            {user && <PlansDialog />}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs text-sage-10 dark:text-sage-10">
              nusoma is a open source project by{" "}
              <Link
                href="https://x.com/simonweniger"
                target="_blank"
                className="font-medium text-sage-11 hover:text-sage-12 transition-colors duration-300"
              >
                Simon Weniger
              </Link>
              .
            </p>
            <div className="flex flex-wrap w-full gap-2">
              <Link
                href="https://github.com/simonweniger/nusoma"
                target="_blank"
                className="flex flex-row items-center gap-1 group bg-sage-2 dark:bg-sage-4 hover:bg-sage-5 hover:border-sage-6 transition-colors duration-300 border border-sage-5 rounded-md p-1 px-2"
              >
                <GithubLogoIcon
                  size={12}
                  weight="bold"
                  className="text-sage-11 dark:text-sage-11 group-hover:text-sage-12 transition-colors duration-300"
                />
                <p className="text-xs text-sage-11 dark:text-sage-11 hover:text-sage-12 transition-colors duration-300">
                  Github
                </p>
              </Link>
              {/* <Link href="https://github.com/simonweniger/nusoma" target="_blank" className="flex flex-row items-center gap-1 group bg-sage-2 dark:bg-sage-4 hover:bg-sage-5 hover:border-sage-6 transition-colors duration-300 border border-sage-5 rounded-md p-1 px-2">
                <Book size={12} weight="bold" className="text-sage-11 dark:text-sage-11 group-hover:text-sage-12 transition-colors duration-300" />
                <p className="text-xs text-sage-11 dark:text-sage-11 hover:text-sage-12 transition-colors duration-300">Docs</p>
              </Link> */}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-row items-center justify-center mt-2 overflow-hidden md:hidden">
        <div className="flex flex-row items-center gap-2">
          <Logo
            style="small"
            className="my-2 ml-1"
            color={profile?.theme === "dark" ? "white" : "black"}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="md:w-full dark:bg-sage-2 mr-2 my-2 ml-2 md:ml-0 rounded-lg overflow-hidden border border-sage-4 dark:border-sage-5">
        {children}
      </div>

      {/* Folder Dialog */}
      <FolderDialog
        isOpen={isFolderDialogOpen}
        onClose={() => {
          setIsFolderDialogOpen(false);
          setEditingFolder(null);
        }}
        onSubmit={folderDialogMode === "create" ? createFolder : renameFolder}
        initialName={editingFolder?.name || ""}
        mode={folderDialogMode}
      />
    </div>
  );
}

// AllProjectsLink component
function AllProjectsLink() {
  const pathname = usePathname();
  const isActive = pathname === "/dashboard/all";

  return (
    <Link
      href="/dashboard/all"
      className={`flex items-center gap-1 px-2 py-1 rounded-md hover:bg-sage-2 dark:hover:bg-sage-3 transition-colors duration-200 ${isActive ? "bg-sage-3 dark:bg-sage-4" : ""}`}
    >
      <GridFourIcon size={14} weight="fill" className="text-sage-11" />
      <span
        className={`text-sm truncate flex-1 ${isActive ? "text-sage-12 dark:text-sage-12 font-medium" : "text-sage-11 dark:text-sage-11"}`}
      >
        All Projects
      </span>
    </Link>
  );
}

// DraftsFolder component (virtual folder for projects without a folder - now a link)
function DraftsFolder({
  projects,
  currentProjectId,
}: {
  projects: Project[];
  currentProjectId: string | null;
}) {
  const pathname = usePathname();
  const isActive = pathname === "/dashboard";

  return (
    <Link
      href="/dashboard"
      className={`flex items-center gap-1 px-2 py-1 rounded-md hover:bg-sage-2 dark:hover:bg-sage-3 transition-colors duration-200 ${isActive ? "bg-sage-3 dark:bg-sage-4" : ""}`}
    >
      <FolderIcon size={14} weight="fill" className="text-sage-11" />
      <span
        className={`text-sm truncate flex-1 ${isActive ? "text-sage-12 dark:text-sage-12 font-medium" : "text-sage-11 dark:text-sage-11"}`}
      >
        Drafts
      </span>
      <span className="text-xs text-sage-10 dark:text-sage-10">
        ({projects.length})
      </span>
    </Link>
  );
}

// FolderItem component with drag and drop
function FolderItem({
  folder,
  isActive,
  onDragEnd,
}: {
  folder: Folder;
  isActive: boolean;
  onDragEnd?: () => void;
}) {
  const dragControls = useDragControls();
  const folderProjects = folder.projects || [];

  return (
    <Reorder.Item
      value={folder}
      dragListener={false}
      dragControls={dragControls}
      className="relative"
      onDragEnd={onDragEnd}
    >
      <Link
        href={`/dashboard/folder/${folder.id}`}
        className={`flex items-center gap-1 px-2 py-1 rounded-md hover:bg-sage-2 dark:hover:bg-sage-3 transition-colors duration-200 group ${isActive ? "bg-sage-3 dark:bg-sage-4" : ""}`}
        onPointerDown={(e) => dragControls.start(e)}
      >
        <FolderIcon size={14} weight="fill" className="text-sage-11" />
        <span
          className={`text-sm truncate flex-1 ${isActive ? "text-sage-12 dark:text-sage-12 font-medium" : "text-sage-11 dark:text-sage-11"}`}
        >
          {folder.name}
        </span>
        <span className="text-xs text-sage-10 dark:text-sage-10">
          ({folderProjects.length})
        </span>
      </Link>
    </Reorder.Item>
  );
}
