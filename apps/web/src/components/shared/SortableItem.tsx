"use client";
import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type UseSortableReturn = ReturnType<typeof useSortable>;

export interface DragHandleProps {
  attributes: UseSortableReturn["attributes"];
  listeners: UseSortableReturn["listeners"];
}

interface SortableItemProps {
  id: string;
  className?: string;
  /** Render-prop instead of a fixed drag handle — every call site's row markup is different
   * (list row / Kanban chip / onboarding row), so each decides where the "⠿" handle goes rather
   * than this component imposing one layout. */
  children: (handle: DragHandleProps) => ReactNode;
}

// Thin wrapper around @dnd-kit/sortable's useSortable — already a project dependency (declared
// in package.json) that had never actually been used anywhere until this feature.
export function SortableItem({ id, className, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className={className}>
      {children({ attributes, listeners })}
    </div>
  );
}
