import Link from "next/link";
import { button } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">404</p>
      <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight">Nothing here</h1>
      <p className="mt-3 text-muted">This page doesn&apos;t exist, or the topic was deleted.</p>
      <Link href="/" className={button("primary", "md", "mt-8")}>
        Back to the board
      </Link>
    </main>
  );
}
