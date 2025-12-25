export type DocumentCommentDto = {
  id: string;
  text: string;
  edited: boolean;
  createdAt: Date;
  sender: {
    name: string;
    image?: string;
  };
};
