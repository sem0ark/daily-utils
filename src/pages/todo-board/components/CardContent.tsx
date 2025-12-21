import { useState, useRef, useEffect, useCallback } from "react";
import { Remove } from "./ActionButton";
import { useBoardStoreActions, useCard } from "../board-store";
import type { ID } from "./common-types";
import clsx from "clsx";

export type CardContentProps = {
  id: ID;
  onRemove?: () => void;
  dragging?: boolean;
};

export const CardContent = ({ id, onRemove, dragging }: CardContentProps) => {
  const card = useCard(id);
  const { updateCard } = useBoardStoreActions();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [text, setText] = useState(card?.title ?? "");

  useEffect(() => {
    if (card?.title === "" && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [card?.id, card?.title]);

  const handleBlur = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed === "") {
      onRemove?.();
    } else if (trimmed !== card?.title) {
      updateCard(id, { title: trimmed });
    }
  }, [text, card?.title, id, updateCard, onRemove]);

  if (!card) return null;

  return (
    <div className="group/content flex w-full flex-col gap-2">
      <div className="flex justify-between gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          rows={1}
          placeholder="New Task..."
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              textareaRef.current?.blur();
            }
          }}
          className={clsx(
            "w-full resize-none overflow-hidden bg-transparent p-1",
            "font-bold text-neutral-800 outline-none placeholder:text-neutral-400",
            dragging && "pointer-events-none",
          )}
        />

        {!dragging && onRemove && (
          <Remove
            className="opacity-0 transition-opacity group-hover/card:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          />
        )}
      </div>
    </div>
  );
};
