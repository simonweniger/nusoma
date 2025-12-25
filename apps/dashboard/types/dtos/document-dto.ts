import {
  type DocumentRecord,
  type DocumentStage
} from '@workspace/database/schema';

import type { TagDto } from '~/types/dtos/tag-dto';

export type DocumentDto = {
  id: string;
  record: DocumentRecord;
  image?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  stage: DocumentStage;
  createdAt: Date;
  tags: TagDto[];
};
