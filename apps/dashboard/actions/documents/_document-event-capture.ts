import {
  db,
  eq,
  getTableColumns,
  inArray,
  jsonAggBuildObject
} from '@workspace/database/client';
import {
  ActionType,
  ActorType,
  documentActivityTable,
  documentTable,
  documentTagTable,
  documentToDocumentTagTable
} from '@workspace/database/schema';

/*
   This is an advanced create/update that
    - handles many-to-many (document -> documentToDocumentTags <- documentTags) relationships.
    - detects and records changes in a separate table.

  Drizzle is not well equipped to handle many-to-many relationships, so we have to handle them manually.
  But they are working on improving the query API, so this might change in the future.

  Note: If you just want to see normal create/update, look into the createApiKey and updateApiKey actions.
*/

const fieldsToCheck = [
  'record',
  'image',
  'name',
  'email',
  'address',
  'phone',
  'stage',
  'tags'
] as const;

type FieldToCheck = (typeof fieldsToCheck)[number];

type Tag = {
  id?: string;
  text: string;
};

type ChangeEntry = {
  old: string | null;
  new: string | null;
};

type DocumentChanges = {
  [K in FieldToCheck]?: ChangeEntry;
};

type Document = typeof documentTable.$inferSelect;
type DocumentWithTags = Document & {
  tags: Tag[];
};

function safeStringify<T>(value: T): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function joinTags(tags: { text: string }[]): string {
  return [...new Set(tags.map((tag) => tag.text))].sort().join(',');
}

export function detectChanges(
  currentDocument: Partial<DocumentWithTags> | null,
  updatedDocument: DocumentWithTags,
  updateData?: Partial<Document>
): DocumentChanges {
  const changes: DocumentChanges = {};

  for (const field of fieldsToCheck) {
    if (field === 'tags') {
      const oldTags = currentDocument?.tags
        ? joinTags(currentDocument.tags)
        : null;
      const newTags = joinTags(updatedDocument.tags);
      if (oldTags !== newTags) {
        changes.tags = { old: oldTags, new: newTags };
      }
    } else {
      const oldValue = currentDocument
        ? safeStringify(currentDocument[field as keyof Document])
        : null;
      const newValue = safeStringify(updatedDocument[field as keyof Document]);
      if (oldValue !== newValue && (!updateData || field in updateData)) {
        changes[field] = { old: oldValue, new: newValue };
      }
    }
  }

  return changes;
}

export async function createDocumentAndCaptureEvent(
  documentData: Omit<
    Document,
    'id' | 'createdAt' | 'updatedAt' | 'organizationId'
  > & {
    createdAt?: Date;
    organizationId: string;
    tags?: Tag[];
  },
  actorId: string
): Promise<DocumentWithTags> {
  return await db.transaction(async (tx) => {
    const { tags, ...documentValues } = documentData;
    const createdAt = documentValues.createdAt ?? new Date();

    // Insert new document
    const newDocument = await tx
      .insert(documentTable)
      .values({
        ...documentValues,
        createdAt,
        updatedAt: createdAt
      })
      .returning()
      .then((rows) => ({
        ...rows[0],
        tags: [] as Required<Tag>[]
      }));

    // Handle tags
    if (tags && tags.length > 0) {
      // Find existing tags
      const existingTags = await tx
        .select({ id: documentTagTable.id, text: documentTagTable.text })
        .from(documentTagTable)
        .where(
          inArray(
            documentTagTable.text,
            tags.map((tag) => tag.text)
          )
        );
      const existingTagTexts = new Set(existingTags.map((tag) => tag.text));

      // Insert missing tags
      const newTags = tags.filter((tag) => !existingTagTexts.has(tag.text));
      let insertedTags: Required<Tag>[] = [];
      if (newTags.length > 0) {
        insertedTags = await tx
          .insert(documentTagTable)
          .values(newTags.map(({ text }) => ({ text })))
          .returning({ id: documentTagTable.id, text: documentTagTable.text });
      }

      newDocument.tags = [...existingTags, ...insertedTags];

      // Insert relationships
      if (newDocument.tags.length > 0) {
        await tx.insert(documentToDocumentTagTable).values(
          newDocument.tags.map(({ id }) => ({
            documentId: newDocument.id,
            documentTagId: id
          }))
        );
      }
    }

    // Detect changes (initial document creation)
    const changes = detectChanges(null, newDocument);

    // Record changes
    await tx.insert(documentActivityTable).values({
      documentId: newDocument.id,
      actionType: ActionType.CREATE,
      actorId,
      actorType: ActorType.MEMBER,
      metadata: changes,
      occurredAt: createdAt
    });

    return newDocument;
  });
}

export async function updateDocumentAndCaptureEvent(
  documentId: string,
  updateData: Partial<
    Omit<
      typeof documentTable.$inferInsert,
      'id' | 'createdAt' | 'updatedAt' | 'organizationId'
    > & {
      tags?: Tag[];
    }
  >,
  actorId: string
): Promise<DocumentChanges> {
  const { tags, ...documentValues } = updateData;
  return db.transaction(async (tx) => {
    // Get current state
    const [currentDocument] = await tx
      .select({
        ...getTableColumns(documentTable),
        tags: jsonAggBuildObject({
          id: documentTable.id,
          text: documentTagTable.text
        })
      })
      .from(documentTable)
      .leftJoin(
        documentToDocumentTagTable,
        eq(documentTable.id, documentToDocumentTagTable.documentId)
      )
      .leftJoin(
        documentTagTable,
        eq(documentToDocumentTagTable.documentTagId, documentTagTable.id)
      )
      .where(eq(documentTable.id, documentId))
      .groupBy(documentTable.id);

    if (!currentDocument) {
      throw new Error('Document not found');
    }

    // Update
    const updatedDocument =
      Object.keys(documentValues).length > 0
        ? await tx
          .update(documentTable)
          .set(documentValues)
          .where(eq(documentTable.id, documentId))
          .returning()
          .then((rows) => ({
            ...rows[0],
            tags: currentDocument.tags
          }))
        : Object.assign({}, currentDocument);

    if (tags && tags.length > 0) {
      // Remove existing tag relationships
      await tx
        .delete(documentToDocumentTagTable)
        .where(eq(documentToDocumentTagTable.documentId, documentId));

      // Add new tags and relationships
      updatedDocument.tags = [];
      for (const tag of tags) {
        // Find or create tag
        const [existingTag] = await tx
          .select({ id: documentTagTable.id })
          .from(documentTagTable)
          .where(
            tag.id
              ? eq(documentTagTable.id, tag.id)
              : eq(documentTagTable.text, tag.text)
          );

        let documentTagId = existingTag?.id;
        if (!documentTagId) {
          const [newTag] = await tx
            .insert(documentTagTable)
            .values({ id: tag.id, text: tag.text })
            .returning({ id: documentTable.id });
          documentTagId = newTag.id;
        }

        // Create relationship
        await tx.insert(documentToDocumentTagTable).values({
          documentId,
          documentTagId
        });

        // Store updated tag
        updatedDocument.tags.push({
          id: documentTagId,
          text: tag.text
        });
      }
    }

    // Record changes
    const changes = detectChanges(
      currentDocument,
      updatedDocument,
      documentValues
    );

    if (Object.keys(changes).length > 0) {
      await tx.insert(documentActivityTable).values({
        documentId,
        actionType: ActionType.UPDATE,
        actorId,
        actorType: ActorType.MEMBER,
        metadata: changes,
        occurredAt: new Date()
      });
    }

    return changes;
  });
}
