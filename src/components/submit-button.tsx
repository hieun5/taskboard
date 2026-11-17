"use client";

import { useFormStatus } from "react-dom";
import { button } from "./ui";

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  size = "md",
  className,
  disabled,
  confirm: confirmText,
  ...rest
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: Parameters<typeof button>[0];
  size?: Parameters<typeof button>[1];
  className?: string;
  disabled?: boolean;
  /** Ask before submitting (for deletes). */
  confirm?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children">) {
  const { pending } = useFormStatus();
  return (
    <button
      {...rest}
      type="submit"
      disabled={pending || disabled}
      aria-disabled={pending || disabled}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
      className={button(variant, size, className)}
    >
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
