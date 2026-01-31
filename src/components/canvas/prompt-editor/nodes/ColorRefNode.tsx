import React from "react";
import { Node, mergeAttributes, InputRule } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Color Badge Node View
const ColorRefNodeView = ({ node, deleteNode }: any) => {
  const { color } = node.attrs;

  return (
    <NodeViewWrapper as="span" className="inline-flex align-middle mx-1">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-sm font-medium transition-all cursor-default",
          "bg-muted border border-border select-none",
        )}
        contentEditable={false}
      >
        <span
          className="h-3 w-3 rounded-full border border-black/10 dark:border-white/10 shadow-xs shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="font-mono text-xs">{color}</span>
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

// Color Reference Node
export const ColorRefNode = Node.create({
  name: "colorRef",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      color: {
        default: "#000000",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-color-ref]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-color-ref": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ColorRefNodeView);
  },

  addInputRules() {
    return [
      new InputRule({
        find: /(?:^|\s)(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}))\s$/,
        handler: ({ state, range, match }) => {
          const attributes = { color: match[1] };
          const { tr } = state;
          const start = range.from;
          const end = range.to;

          tr.replaceWith(start, end, this.type.create(attributes));
          tr.insertText(" "); // Add a space after the node
        },
      }),
    ];
  },
});
