"use client";

import { useId, useRef } from "react";
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
  confirmLabel = "Delete",
  ...rest
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: Parameters<typeof button>[0];
  size?: Parameters<typeof button>[1];
  className?: string;
  disabled?: boolean;
  /** Ask before submitting (for deletes): shown in a confirmation dialog. */
  confirm?: string;
  /** Label of the dialog's confirm button. */
  confirmLabel?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children">) {
  const { pending } = useFormStatus();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const confirmAndSubmit = () => {
    dialogRef.current?.close();
    // requestSubmit doesn't fire this button's click handler, so the dialog won't reopen.
    buttonRef.current?.form?.requestSubmit(buttonRef.current);
  };

  return (
    <>
      <button
        {...rest}
        ref={buttonRef}
        type="submit"
        disabled={pending || disabled}
        aria-disabled={pending || disabled}
        aria-haspopup={confirmText ? "dialog" : undefined}
        onClick={(e) => {
          if (!confirmText) return;
          e.preventDefault();
          dialogRef.current?.showModal();
        }}
        className={button(variant, size, className)}
      >
        {pending && pendingText ? pendingText : children}
      </button>
      {confirmText && (
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          // Clicking the dimmed backdrop (outside the panel) cancels.
          onClick={(e) => {
            if (e.target === e.currentTarget) dialogRef.current?.close();
          }}
          className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-line bg-card p-0 text-ink shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px] open:animate-result-in motion-reduce:open:animate-none"
        >
          <div className="p-5 sm:p-6">
            <h2 id={titleId} className="font-serif text-2xl font-medium tracking-tight">
              Are you sure?
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{confirmText}</p>
            <div className="mt-6 flex justify-end gap-2.5">
              {/* First in order, so the dialog opens with focus on Cancel (the safe choice). */}
              <button type="button" onClick={() => dialogRef.current?.close()} className={button("secondary", "md")}>
                Cancel
              </button>
              <button type="button" onClick={confirmAndSubmit} className={button("destructive", "md")}>
                {confirmLabel}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}
