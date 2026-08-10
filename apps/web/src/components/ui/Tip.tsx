"use client";
import { useState, type ReactNode } from "react";

interface TipProps {
  label: string;
  children: ReactNode;
  /** Short labels (button hints, single words) stay on one line by default. Metric explanations
   * are full sentences — wide switches to a wrapped, fixed-width bubble instead of an
   * off-screen-wide single line. */
  wide?: boolean;
}

export function Tip({ label, children, wide }: TipProps) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={`absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-card2 border border-border2 rounded-md px-2 py-1 text-[11px] text-txt z-50 pointer-events-none shadow-lg ${
            wide ? "w-[200px] whitespace-normal leading-relaxed" : "whitespace-nowrap"
          }`}
        >
          {label}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-border2" />
        </div>
      )}
    </div>
  );
}
