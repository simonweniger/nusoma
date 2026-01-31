import React from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Image reference node component for @ mentions
const ImageRefNodeView = ({ node, deleteNode }: any) => {
  const { label, src } = node.attrs;

  return (
    <NodeViewWrapper as="span" className="inline-flex align-middle mx-1">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-sm font-medium transition-all cursor-default",
          "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30",
        )}
        contentEditable={false}
      >
        <img
          src={src}
          alt={label}
          className="h-5 w-5 rounded object-cover shrink-0"
        />
        <span className="font-medium">@{label}</span>
        <button
          onClick={deleteNode}
          className="shrink-0 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    </NodeViewWrapper>
  );
};

// Define the ImageRef custom node for @ image references
export const ImageRefNode = Node.create({
  name: "imageRef",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      imageId: {
        default: "",
      },
      label: {
        default: "",
      },
      src: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-image-ref]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-image-ref": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageRefNodeView);
  },
});
