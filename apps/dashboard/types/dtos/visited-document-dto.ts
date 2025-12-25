import { type DocumentRecord } from '@workspace/database/schema';

export type VisitedDocumentDto = {
  id: string;
  name: string;
  image?: string;
  record: DocumentRecord;
  pageVisits: number;
};
