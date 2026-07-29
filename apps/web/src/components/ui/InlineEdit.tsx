"use client";
import { useState, useRef, useEffect } from "react";

interface InlineEditProps {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  placeholder?: string;
}

export function InlineEdit({ value, onSave, className = "", placeholder = "—" }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
  useEffect(() => setVal(value), [value]);

  if (!editing) return (
    <span
      onClick={() => setEditing(true)}
      title="Clique para editar"
      className={`cursor-text border-b border-dashed border-white/20 pb-px ${className}`}
    >
      {val || placeholder}
    </span>
  );

  return (
    <input
      ref={ref}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => { setEditing(false); onSave(val); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { setEditing(false); onSave(val); }
        if (e.key === "Escape") { setEditing(false); setVal(value); }
      }}
      className="bg-transparent border-none border-b border-primary outline-none font-inherit text-txt w-full"
    />
  );
}
