import { ImageTableNode } from './table-node';

export type ImageNodeProps = {
  type: string;
  data: {
    content?: {
      url: string;
      type: string;
    };
    generated?: {
      url: string;
      type: string;
    };
    size?: string;
    width?: number;
    height?: number;
    updatedAt?: string;
    model?: string;
    falEndpoint?: string;
    description?: string;
    instructions?: string;
  };
  id: string;
};

export const ImageNode = (props: ImageNodeProps) => (
  <ImageTableNode {...props} title="Image" />
);
