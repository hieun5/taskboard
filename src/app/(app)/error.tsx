"use client";

import Link from "next/link";
import { button } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[560px] px-4 py-20 text-center">
      <h1 className="font-serif text-4xl font-medium tracking-tight">Something went wrong</h1>
      <p className="mt-3 text-muted">
        That didn&apos;t work. Try again, and if it keeps happening, let Hieu know.
        {error.digest && <span className="mt-2 block text-[13px] text-faint">Reference: {error.digest}</span>}
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <button type="button" onClick={reset} className={button("primary")}>
          Try again
        </button>
        <Link href="/" className={button("secondary")}>
          Back to the board
        </Link>
      </div>
    </div>
  );
}
