import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline" | "lav" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({ variant = "outline", size = "md", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-lg cursor-pointer transition-all",
        {
          "bg-primary border-primary text-white hover:opacity-90": variant === "primary",
          "bg-transparent border-transparent text-dim hover:text-txt": variant === "ghost",
          "bg-card border border-border text-dim hover:border-border2 hover:text-txt": variant === "outline",
          "bg-lav/10 border border-lav/25 text-secondary": variant === "lav",
          "bg-red-500/10 border border-red-500/25 text-danger": variant === "danger",
          "text-xs px-2.5 py-1": size === "sm",
          "text-sm px-3.5 py-2": size === "md",
          "text-base px-5 py-2.5": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
