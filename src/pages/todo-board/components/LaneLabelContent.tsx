import { useState, useRef, useEffect, useCallback } from "react";
import { Remove, AddNew } from "./ActionButton";
import { type UniqueIdentifier } from "@dnd-kit/core";
import { useBoardStoreActions, useLane } from "../board-store";
import clsx from "clsx";

export interface LaneLabelContentProps {
  laneId: UniqueIdentifier;
  onAddCard?: (laneId: UniqueIdentifier) => void;
  onRemoveLane?: () => void;
}

export const LaneLabelContent = ({
  laneId,
  onAddCard,
  onRemoveLane,
}: LaneLabelContentProps) => {
  const lane = useLane(laneId);
  const { updateLane } = useBoardStoreActions();

  const [isEditing, setIsEditing] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditing]);

  const handleTitleClick = useCallback(() => {
    if (lane?.canEdit && !isEditing) {
      setIsEditing(true);
    }
  }, [lane?.canEdit, isEditing]);

  const handleTitleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!lane) return;

      const trimmedTitle = titleInputRef.current?.value.trim() ?? "";

      if (trimmedTitle === "" || trimmedTitle === lane.title) {
        setIsEditing(false);
        return;
      }

      updateLane(lane.id, { title: trimmedTitle });
      setIsEditing(false);
    },
    [lane, updateLane],
  );

  if (!lane) return null;

  return (
    <div className="flex w-full min-w-0 flex-row gap-2 pr-1">
      {isEditing ? (
        <form onSubmit={handleTitleSubmit} onBlur={handleTitleSubmit}>
          <input
            ref={titleInputRef}
            type="text"
            className={
              "w-full rounded border-neutral-500 bg-white px-2 text-lg font-bold tracking-tight outline-none"
            }
            defaultValue={lane.title ?? ""}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsEditing(false);
            }}
            placeholder="Default name"
            required
          />
        </form>
      ) : (
        <h3
          className={clsx(
            "truncate text-lg font-bold transition-colors",
            lane.canEdit && "cursor-pointer hover:text-blue-600",
          )}
          onClick={handleTitleClick}
        >
          {lane.title || "Click to edit"}
        </h3>
      )}

      <div className="flex-1"></div>

      <div className="flex flex-row items-center gap-1">
        {lane.canAddCard && onAddCard && (
          <AddNew
            className="border-2 border-neutral-300 hover:border-blue-500"
            onClick={() => onAddCard(laneId)}
          />
        )}
        {lane.canRemove && onRemoveLane && (
          <Remove
            className="border-2 border-neutral-300 hover:border-red-500"
            onClick={onRemoveLane}
          />
        )}
      </div>
    </div>
  );
};
