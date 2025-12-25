import { DocumentTaskStatus } from '@workspace/database/schema';

export type DocumentTaskDto = {
  id: string;
  documentId?: string;
  title: string;
  description?: string;
  status: DocumentTaskStatus;
  dueDate?: Date;
  createdAt: Date;
};
