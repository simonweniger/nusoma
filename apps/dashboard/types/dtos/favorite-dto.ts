import { type DocumentRecord } from '@workspace/database/schema';

export type FavoriteDto = {
  id: string;
  order: number;
  documentId: string;
  name: string;
  record: DocumentRecord;
  image?: string;
};
