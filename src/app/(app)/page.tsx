import type { Metadata } from "next";
import Link from "next/link";
import { ViewTransition } from "react";
import { Avatar } from "@/components/avatar";
import { BoardSearch } from "@/components/board-search";
import { ChatIcon, ClipIcon, PlusIcon } from "@/components/icons";
import { NewBadge, StatusPill } from "@/components/status";
import { button } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { listTopics } from "@/lib/data/topics";
import { plural, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Challenges" };

export default async function BoardPage({ searchParams }: PageProps<"/">) {
  const user = await requireUser();
  const { q: rawQ } = await searchParams;
  const q = ((Array.isArray(rawQ) ? rawQ[0] : rawQ) ?? "").trim().slice(0, 100);
  const topics = await listTopics(user, { q });
  const now = new Date();

  return (
    // The board vanishes when you open the new-topic form and floods back in when you cancel it.
    <ViewTransition enter={{ "close-form": "flood", default: "none" }} exit={{ "new-topic": "vanish", default: "none" }} default="none">
      <div className="mx-auto max-w-[880px] px-4 pb-20 pt-4 sm:px-5 sm:pt-6">
        <h1 className="font-serif text-[40px] font-medium leading-tight tracking-tight sm:text-[44px]">Challenges</h1>

        {/* Search on the left, New topic on the right, just above the list. */}
        <div className="mt-6 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <BoardSearch q={q} />
          </div>
          <Link
            href="/topics/new"
            transitionTypes={["new-topic"]}
            className={button("primary", "md", "shrink-0 px-3 sm:px-4")}
            aria-label="New topic"
          >
            <PlusIcon size={16} />
            <span className="hidden sm:inline">New topic</span>
          </Link>
        </div>

        <p className="mb-3 mt-6 text-sm text-muted" aria-live="polite">
          {plural(topics.length, "topic")}
          {q && " found"}
        </p>

        {topics.length === 0 && q ? (
          <div key={`empty-${q}`} className="animate-result-in rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center motion-reduce:animate-none">
            <p className="font-serif text-2xl">No topics match “{q}”</p>
            <p className="mt-2 text-[15px] text-muted">Try a different word.</p>
            <Link href="/" className={button("secondary", "md", "mt-5")}>
              Clear search
            </Link>
          </div>
        ) : topics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-14 text-center">
            <p className="font-serif text-2xl">Nothing on the board yet</p>
            <p className="mx-auto mt-2 max-w-sm text-[15px] text-muted">
              Post the first topic: say what needs doing and what done looks like, and others can add progress underneath.
            </p>
            <Link href="/topics/new" transitionTypes={["new-topic"]} className={button("primary", "md", "mt-6")}>
              <PlusIcon size={16} />
              Post a topic
            </Link>
          </div>
        ) : (
          // Re-keyed per search so the cards animate in, one after another, each time the results change.
          <ul key={q} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {topics.map((t, i) => (
              <li key={t.id} className="animate-result-in motion-reduce:animate-none" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                <Link
                  href={`/topics/${t.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-line bg-card px-5 py-5 transition-colors hover:border-ink/40 sm:px-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 flex-1 font-serif text-2xl font-medium leading-snug tracking-tight group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                      {t.title}
                    </h2>
                    {/* Pinned top-right on every card; "New activity" stacks above the status. */}
                    <div className="mt-1 flex shrink-0 flex-col items-end gap-1.5">
                      {t.unread && <NewBadge>{t.updates > 0 ? "New activity" : "New"}</NewBadge>}
                      <StatusPill status={t.status} />
                    </div>
                  </div>
                  <p className="mt-2.5 text-base leading-relaxed text-muted">
                    <span className="font-semibold text-ink">Goal:</span> {t.goal}
                  </p>
                  {/* mt-auto keeps the author/updates row at the bottom, so cards side by side line up. */}
                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-4 text-sm text-muted">
                    <span className="inline-flex items-center gap-2 font-medium text-ink">
                      <Avatar id={t.authorId} name={t.authorName} size="xs" />
                      {t.authorName}
                    </span>
                    <span>{timeAgo(t.createdAt, now)}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <ChatIcon size={15} />
                      {plural(t.updates, "update")}
                      {t.updates > 0 && ` · last active ${timeAgo(t.lastActivityAt, now)}`}
                    </span>
                    {t.files > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <ClipIcon size={15} />
                        {plural(t.files, "file")}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ViewTransition>
  );
}
