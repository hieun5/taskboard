import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { BoardFilters } from "@/components/board-filters";
import { ChatIcon, ClipIcon, PlusIcon } from "@/components/icons";
import { NewBadge, StatusPill } from "@/components/status";
import { button } from "@/components/ui";
import type { TopicStatus } from "@/db/schema";
import { requireUser } from "@/lib/auth/dal";
import { listTopics } from "@/lib/data/topics";
import { plural, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Challenges" };

const STATUSES = ["all", "open", "active", "wrapped_up"] as const;

export default async function BoardPage({ searchParams }: PageProps<"/">) {
  const user = await requireUser();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = one(sp.q).slice(0, 100);
  const status = (STATUSES as readonly string[]).includes(one(sp.status)) ? (one(sp.status) as (typeof STATUSES)[number]) : "all";
  const sort = one(sp.sort) === "active" ? "active" : "newest";
  const filtered = Boolean(q) || status !== "all";

  const topics = await listTopics(user, { q, status: status as TopicStatus | "all", sort });
  const now = new Date();

  return (
    <div className="mx-auto max-w-[880px] px-4 pb-20 pt-10 sm:px-5 sm:pt-12">
      <h1 className="font-serif text-[40px] font-medium leading-tight tracking-tight sm:text-[44px]">Challenges</h1>

      <div className="mt-7">
        <BoardFilters q={q} status={status} sort={sort} />
      </div>

      <p className="mb-3 mt-6 text-sm text-muted" aria-live="polite">
        {plural(topics.length, "topic")}
        {filtered && " found"}
      </p>

      {topics.length === 0 ? (
        filtered ? (
          <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center">
            <p className="font-serif text-2xl">No topics match</p>
            <p className="mt-2 text-[15px] text-muted">Try a different word, or show every status.</p>
            <Link href="/" className={button("secondary", "md", "mt-5")}>
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-14 text-center">
            <p className="font-serif text-2xl">Nothing on the board yet</p>
            <p className="mx-auto mt-2 max-w-sm text-[15px] text-muted">
              Post the first topic: say what needs doing and what done looks like, and others can add progress underneath.
            </p>
            <Link href="/topics/new" className={button("primary", "md", "mt-6")}>
              <PlusIcon size={16} />
              Post a topic
            </Link>
          </div>
        )
      ) : (
        <ul className="flex flex-col gap-3">
          {topics.map((t) => (
            <li key={t.id}>
              <Link
                href={`/topics/${t.id}`}
                className="group block rounded-2xl border border-line bg-card px-5 py-5 transition-colors hover:border-ink/40 sm:px-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <h2 className="min-w-0 flex-[1_1_280px] font-serif text-2xl font-medium leading-snug tracking-tight group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4 sm:text-[26px]">
                    {t.title}
                  </h2>
                  <div className="flex items-center gap-2">
                    {t.unread && <NewBadge>{t.updates > 0 ? "New activity" : "New"}</NewBadge>}
                    <StatusPill status={t.status} />
                  </div>
                </div>
                <p className="mt-2.5 text-base leading-relaxed text-muted">
                  <span className="font-semibold text-ink">Goal:</span> {t.goal}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
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
  );
}
