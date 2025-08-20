export const queryKeys = {
  projects: ['projects'],
  project: (projectId: string) => ['project', projectId],
  projectMediaItems: (projectId: string) => ['mediaItems', projectId],
  projectMedia: (projectId: string, jobId: string) => [
    'media',
    projectId,
    jobId,
  ],
  projectTracks: (projectId: string) => ['tracks', projectId],
  projectPreview: (projectId: string) => ['preview', projectId],
};
