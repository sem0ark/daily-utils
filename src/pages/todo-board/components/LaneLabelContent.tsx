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
        <form
          onSubmit={handleTitleSubmit}
          onBlur={handleTitleSubmit}
          className="flex-grow"
        >
          <input
            ref={titleInputRef}
            type="text"
            className={clsx(
              "w-full rounded border-2 border-blue-500 bg-white px-2 py-1",
              "text-lg font-bold tracking-tight text-neutral-800 uppercase outline-none",
            )}
            defaultValue={lane.title ?? ""}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsEditing(false);
            }}
            placeholder="LANE NAME"
            required
          />
        </form>
      ) : (
        <h3
          className={clsx(
            "flex-grow truncate text-lg font-bold tracking-tight text-blue-500 uppercase transition-colors",
            lane.canEdit && "cursor-pointer hover:text-blue-600",
          )}
          onClick={handleTitleClick}
        >
          {lane.title || "UNTITLED LANE"}
        </h3>
      )}

      <div className="flex-1"></div>

      {/* Action Buttons: Only show when not editing and only if allowed */}
      <div className="flex items-center gap-1">
        {!isEditing && lane.canAddCard && onAddCard && (
          <AddNew
            className="border-2 border-neutral-300 hover:border-blue-500"
            onClick={() => onAddCard(laneId)}
          />
        )}
        {!isEditing && lane.canRemove && onRemoveLane && (
          <Remove
            className="border-2 border-neutral-300 hover:border-red-500"
            onClick={onRemoveLane}
          />
        )}
      </div>
    </div>
  );
};
