export type DocumentNoteDto = {
  id: string;
  documentId: string;
  text?: string;
  edited: boolean;
  createdAt: Date;
  updatedAt: Date;
  sender: {
    id: string;
    name: string;
    image?: string;
  };
};
