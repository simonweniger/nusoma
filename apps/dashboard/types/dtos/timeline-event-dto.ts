import { type ActionType } from '@workspace/database/schema';

export type ActivityTimelineEventDto = {
  id: string;
  documentId: string;
  type: 'activity';
  actionType: ActionType;
  metadata: unknown;
  occurredAt: Date;
  actor: {
    id: string;
    name: string;
    image?: string;
  };
};

export type CommentTimelineEventDto = {
  id: string;
  documentId: string;
  type: 'comment';
  text: string;
  edited: boolean;
  createdAt: Date;
  updatedAt: Date;
  sender: {
    id: string;
    name: string;
    image?: string;
  };
};

export type TimelineEventDto =
  | ActivityTimelineEventDto
  | CommentTimelineEventDto;
