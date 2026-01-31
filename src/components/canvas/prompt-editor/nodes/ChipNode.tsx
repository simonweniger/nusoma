import React from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { Wand2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getCategoryIcon,
  type PromptActionCategory,
} from "@/lib/prompt-actions";

const renderCategoryIcon = (category: PromptActionCategory) => {
  const IconComponent = getCategoryIcon(category);
  return <IconComponent className="h-4 w-4" />;
};

// Custom chip node component
const ChipNodeView = ({ node, deleteNode }: any) => {
  const { chipType, title, icon } = node.attrs;

  return (
    <NodeViewWrapper as="span" className="inline-flex align-middle mx-1">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium transition-all cursor-default",
          chipType === "style"
            ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30"
            : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30",
        )}
        contentEditable={false}
      >
        <span className="shrink-0 opacity-70 inline-flex">
          {chipType === "style" ? (
            <Wand2 className="h-4 w-4" />
          ) : (
            renderCategoryIcon(icon as PromptActionCategory)
          )}
        </span>
        <span className="font-medium">{title}</span>
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

// Define the Chip custom node
export const ChipNode = Node.create({
  name: "chip",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      chipType: {
        default: "template",
      },
      title: {
        default: "",
      },
      value: {
        default: "",
      },
      styleId: {
        default: null,
      },
      loraUrl: {
        default: null,
      },
      icon: {
        default: "camera",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-chip]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-chip": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChipNodeView);
  },
});
