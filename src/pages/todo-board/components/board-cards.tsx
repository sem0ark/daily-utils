import type { UniqueIdentifier } from "@dnd-kit/core";

import { forwardRef, memo, useMemo } from "react";
import clsx from "clsx";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import { CSS, type Transform } from "@dnd-kit/utilities";

import { Handle, type ActionProps } from "./ActionButton";
import { useSortable } from "@dnd-kit/sortable";
import { CardContent, type CardContentProps } from "./CardContent";

interface ItemProps {
  dragOverlay?: boolean;
  disabled?: boolean;
  dragging?: boolean;
  handle?: boolean;
  handleProps?: Partial<ActionProps>;
  height?: number;
  index?: number;
  fadeIn?: boolean;
  transform?: Transform | null;
  listeners?: DraggableSyntheticListeners;
  style?: React.CSSProperties;
  transition?: string | null;

  value: React.ReactNode;
}

const Item = memo(
  forwardRef<HTMLLIElement, ItemProps>(
    (
      {
        dragOverlay,
        dragging,
        disabled,
        handle,
        handleProps,
        index,
        listeners,
        transition,
        transform,
        value,
        ...props
      },
      ref,
    ) => {
      const styles: React.CSSProperties = {
        transition,
        transform: CSS.Transform.toString(transform ?? null),
        "--index": index,
      } as React.CSSProperties;

      return (
        <li
          ref={ref}
          style={styles}
          className={clsx(
            "list-none py-1.5",
            dragOverlay && "z-[1000] scale-[1.05]",
          )}
          {...props}
        >
          <div
            className={clsx(
              "group/card relative flex items-stretch overflow-hidden rounded-lg border-2 transition-all duration-200",

              "border-neutral-500 bg-neutral-50 text-neutral-800",

              !dragOverlay && "hover:bg-white",
              dragOverlay && "border-blue-500 bg-white ring-4 ring-blue-500/10",

              !handle && "cursor-grab active:cursor-grabbing",
              dragging && !dragOverlay && "opacity-40 grayscale",
              disabled && "cursor-not-allowed bg-neutral-200 opacity-50",

              "focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20",
            )}
            {...(!handle ? listeners : undefined)}
            tabIndex={!handle ? 0 : undefined}
          >
            {/* The main content of the card */}
            <div className="flex-grow p-2">{value}</div>

            {handle && (
              <div
                className={clsx(
                  "flex items-center border-l-2 border-neutral-500 bg-neutral-100 px-1 transition-colors",
                  "group-hover/card:bg-neutral-200 group-hover/card:text-blue-600",
                )}
              >
                <Handle
                  {...handleProps}
                  {...listeners}
                  className="h-full py-2 text-neutral-400 hover:text-blue-500"
                />
              </div>
            )}
          </div>
        </li>
      );
    },
  ),
);

type CardProps = Omit<ItemProps, "value"> & CardContentProps;
const CardItem = forwardRef<HTMLLIElement, CardProps>(
  ({ id, onRemove, ...props }, ref) => {
    return (
      <Item
        ref={ref}
        {...props}
        value={<CardContent onRemove={onRemove} id={id} />}
      />
    );
  },
);
CardItem.displayName = "CardItem";

export function SortableCard({
  disabled,
  id,
  index,
  ...props
}: CardContentProps & {
  index: number;
  disabled?: boolean;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    isDragging,
    transform,
    transition,
  } = useSortable({ id });

  const handleProps = useMemo(
    () => ({ ref: setActivatorNodeRef, ...listeners }),
    [setActivatorNodeRef, listeners],
  );

  return (
    <CardItem
      ref={setNodeRef}
      id={id}
      index={index}
      dragging={isDragging}
      handle={true}
      handleProps={handleProps}
      transition={transition}
      transform={transform}
      disabled={disabled}
      {...props}
    />
  );
}

export function OverlayCard({ id }: { id: UniqueIdentifier }) {
  return <CardItem dragging={true} id={id} handle={true} dragOverlay />;
}
