import { type UniqueIdentifier } from "@dnd-kit/core";
import {
  type AnimateLayoutChanges,
  useSortable,
  defaultAnimateLayoutChanges,
  verticalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useLane } from "../board-store";
import { OverlayCard, SortableCard } from "./board-cards";
import type { PropsWithChildren } from "react";

import React, { forwardRef } from "react";
import clsx from "clsx";

import { Handle, type ActionProps } from "./ActionButton";
import { LaneLabelContent } from "./LaneLabelContent";

interface ContainerProps {
  children?: React.ReactNode;
  label?: React.ReactNode;
  hover?: boolean;
  handle?: boolean;
  handleProps?: ActionProps;
  scrollable?: boolean;
  placeholder?: boolean;
  unstyled?: boolean;

  onClick?(): void;
  onRemove?(): void;

  style?: React.CSSProperties;
}

const Container = forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      children,
      label,
      hover,
      handleProps,
      placeholder,
      onClick,
      style,
      ...props
    }: ContainerProps,
    ref,
  ) => {
    return (
      <div
        {...props}
        ref={ref}
        className={clsx(
          "m-2.5 flex min-h-52 w-80 flex-col rounded-lg border-2 transition-all duration-200",
          "box-border appearance-none outline-none",

          // Standard Lane: Neutral 50 bg with thick border
          !placeholder && "border-neutral-500 bg-neutral-50",

          // Placeholder (Add Lane): Dashed and subtle
          placeholder && [
            "cursor-pointer items-center justify-center border-dashed border-neutral-400 bg-transparent",
            "text-neutral-500 hover:border-blue-500 hover:bg-white hover:text-blue-600",
          ],

          // Hover/Active State
          !placeholder && !onClick && "hover:bg-neutral-100",
          hover && "border-blue-500 bg-white ring-4 ring-blue-500",

          "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        )}
        onClick={onClick}
        tabIndex={onClick ? 0 : undefined}
        style={style}
      >
        {/* Header Section: Matches the "GO" button look from your example */}
        {!!label && (
          <div
            className={clsx(
              "flex w-full flex-row items-center justify-between p-3",
              "rounded-t-md border-b-2 border-neutral-500 bg-neutral-100",
            )}
          >
            <div className="px-1 text-lg font-black tracking-tight text-blue-500 uppercase">
              {label}
            </div>

            <Handle
              className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-200 hover:text-blue-500"
              {...handleProps}
            />
          </div>
        )}

        {/* Content Section */}
        {placeholder ? (
          <div className="flex flex-grow items-center justify-center p-6 text-center text-xl font-bold tracking-widest uppercase">
            {children}
          </div>
        ) : (
          <ul className="m-0 flex max-h-[70vh] list-none flex-col gap-2 overflow-y-auto p-3">
            {children}
          </ul>
        )}
      </div>
    );
  },
);
Container.displayName = "Container";

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

export function SortableLane({
  children,
  disabled,
  id,
  cards,
  onAddCard,
  onRemoveCard,
  onRemove: onRemoveLane,
  ...props
}: ContainerProps & {
  disabled?: boolean;
  id: UniqueIdentifier;
  cards: UniqueIdentifier[];
  onAddCard: (laneId: UniqueIdentifier) => void;
  onRemoveCard: (laneId: UniqueIdentifier, cardId: UniqueIdentifier) => void;
}) {
  const lane = useLane(id);
  const {
    active,
    attributes,
    isDragging,
    listeners,
    over,
    setNodeRef,
    transition,
    transform,
  } = useSortable({
    id,
    data: { type: "container", children: cards },
    animateLayoutChanges: animateLayoutChanges,
  });

  if (!lane) {
    return null;
  }

  const isOverContainer = over
    ? (id === over.id && active?.data.current?.type !== "container") ||
      cards.includes(over.id)
    : false;

  return (
    <Container
      ref={setNodeRef}
      label={
        <LaneLabelContent
          laneId={lane.id}
          onAddCard={onAddCard}
          onRemoveLane={onRemoveLane}
        />
      }
      style={{
        transition,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : undefined,
      }}
      hover={isOverContainer}
      handleProps={{ ...attributes, ...listeners }}
      {...props}
    >
      {children}
      <SortableContext items={cards} strategy={verticalListSortingStrategy}>
        {cards.map((cardId, index) => {
          return (
            <SortableCard
              disabled={disabled || isDragging}
              key={cardId}
              id={cardId}
              index={index}
              onRemove={onRemoveCard && (() => onRemoveCard(lane?.id, cardId))}
            />
          );
        })}
      </SortableContext>
    </Container>
  );
}

export function OverlayLane({
  id,
  cards,
  ...props
}: ContainerProps & {
  disabled?: boolean;
  id: UniqueIdentifier;
  cards: UniqueIdentifier[];
}) {
  const lane = useLane(id);

  return (
    <Container label={<LaneLabelContent laneId={lane?.id ?? ""} />} {...props}>
      {cards.map((itemId) => (
        <OverlayCard key={itemId} id={itemId} />
      ))}
    </Container>
  );
}

export const ColumnPlaceholder = ({
  onClick,
  children,
}: PropsWithChildren<{
  disabled?: boolean;
  onClick: () => void;
}>) => {
  return (
    <Container placeholder onClick={onClick}>
      {children}
    </Container>
  );
};
