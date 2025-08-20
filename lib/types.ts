/** biome-ignore-all lint/suspicious/noExplicitAny: needed here */

export type MediaItem = {
  id: string;
  kind: 'generated' | 'uploaded';
  endpointId?: string;
  requestId?: string;
  projectId: string;
  mediaType: 'image' | 'video' | 'music' | 'voiceover';
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: number;
  input?: Record<string, any>;
  output?: Record<string, any>;
  url?: string;
  metadata?: Record<string, any>; // TODO: Define the metadata schema
} & (
  | {
      kind: 'generated';
      endpointId: string;
      requestId: string;
      input: Record<string, any>;
      output?: Record<string, any>;
    }
  | {
      kind: 'uploaded';
      url: string;
    }
);
