import { useReactFlow, type XYPosition } from '@xyflow/react';
import { nanoid } from 'nanoid';
import { useEffect, useRef } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { nodeButtons } from '@/lib/node-buttons';
import { NodeLayout } from './layout';

type DropNodeProps = {
  data: {
    isSource?: boolean;
    position: XYPosition;
  };
  id: string;
};

export const DropNode = ({ data, id }: DropNodeProps) => {
  const { addNodes, deleteElements, getNode, addEdges, getNodeConnections } =
    useReactFlow();
  const ref = useRef<HTMLDivElement>(null);

  const handleSelect = (type: string, options?: Record<string, unknown>) => {
    // Get the position of the current node
    const currentNode = getNode(id);
    const position = currentNode?.position || { x: 0, y: 0 };
    const sourceNodes = getNodeConnections({
      nodeId: id,
    });

    // Delete the drop node
    deleteElements({
      nodes: [{ id }],
    });

    const newNodeId = nanoid();
    const { data: nodeData, ...rest } = options ?? {};

    // Add the new node of the selected type
    addNodes({
      id: newNodeId,
      type,
      position,
      data: {
        ...(nodeData ? nodeData : {}),
      },
      origin: [0, 0.5],
      ...rest,
    });

    for (const sourceNode of sourceNodes) {
      addEdges({
        id: nanoid(),
        source: data.isSource ? newNodeId : sourceNode.source,
        target: data.isSource ? sourceNode.source : newNodeId,
        type: 'animated',
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Delete the drop node when Escape is pressed
        deleteElements({
          nodes: [{ id }],
        });
      }
    };

    const handleClick = (event: MouseEvent) => {
      // Get the DOM element for this node
      const nodeElement = ref.current;

      // Check if the click was outside the node
      if (nodeElement && !nodeElement.contains(event.target as Node)) {
        deleteElements({
          nodes: [{ id }],
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    setTimeout(() => {
      window.addEventListener('click', handleClick);
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
    };
  }, [deleteElements, id]);

  return (
    <div ref={ref}>
      <NodeLayout data={data} id={id} title="Add a new node" type="drop">
        <Command className="rounded-xl border-none bg-card shadow-[0_1px_1px_rgba(0,0,0,0.02),_0_2px_2px_rgba(0,0,0,0.02),_0_4px_4px_rgba(0,0,0,0.02),_0_8px_8px_rgba(0,0,0,0.02),_0_16px_16px_rgba(0,0,0,0.02),_0_32px_32px_rgba(0,0,0,0.02)]">
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Add node">
              {nodeButtons
                .filter(
                  (button) => button.id !== 'file' && button.id !== 'tweet'
                )
                .map((button) => (
                  <CommandItem
                    key={button.id}
                    onSelect={() => handleSelect(button.id, button.data)}
                  >
                    <button.icon size={16} />
                    {button.label}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </NodeLayout>
    </div>
  );
};
