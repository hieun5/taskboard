import type { Metadata } from "next";
import Link from "next/link";
import { addProgressAction, deleteProgressAction } from "@/app/actions/progress";
import { deleteTopicAction, setStatusAction } from "@/app/actions/topics";
import { AttachmentList } from "@/components/attachments";
import { Avatar } from "@/components/avatar";
import { ArrowLeftIcon } from "@/components/icons";
import { LocalDate } from "@/components/local-date";
import { MarkRead } from "@/components/mark-read";
import { Markdown } from "@/components/markdown";
import { ProgressComposer } from "@/components/progress-composer";
import { NewBadge, StatusPill } from "@/components/status";
import { StatusSelect } from "@/components/status-select";
import { SubmitButton } from "@/components/submit-button";
import { button, eyebrow } from "@/components/ui";
import { env } from "@/env";
import { requireUser } from "@/lib/auth/dal";
import { listEntries } from "@/lib/data/progress";
import { lastReadAt } from "@/lib/data/reads";
import { getTopic } from "@/lib/data/topics";
import { plural } from "@/lib/format";
import { orNotFound, requireUuid } from "@/lib/route-params";

export const metadata: Metadata = { title: "Topic" };

export default async function TopicPage({ params }: PageProps<"/topics/[id]">) {
  const user = await requireUser();
  const id = requireUuid((await params).id);
  const topic = await orNotFound(() => getTopic(id));
  const [entries, readAt] = await Promise.all([listEntries(id), lastReadAt(user.id, id)]);
  const isAuthor = topic.authorId === user.id;
  const edited = topic.updatedAt.getTime() - topic.createdAt.getTime() > 60_000;
  const isNew = (createdAt: Date, authorId: string) => authorId !== user.id && (!readAt || createdAt > readAt);

  return (
    <div className="mx-auto max-w-[760px] px-4 pb-24 pt-6 sm:px-5">
      <MarkRead topicId={id} />
      <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-muted hover:text-ink">
        <ArrowLeftIcon size={16} />
        All topics
      </Link>

      <article className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {isAuthor ? <StatusSelect status={topic.status} action={setStatusAction.bind(null, id)} /> : <StatusPill status={topic.status} />}
          {isAuthor && (
            <div className="flex items-center gap-1">
              <Link href={`/topics/${id}/edit`} className={button("ghost", "sm")}>
                Edit
              </Link>
              <form action={deleteTopicAction.bind(null, id)}>
                <SubmitButton
                  variant="danger"
                  size="sm"
                  pendingText="Deleting…"
                  confirm="Delete this topic, all its progress updates and files? This can't be undone."
                >
                  Delete
                </SubmitButton>
              </form>
            </div>
          )}
        </div>

        <h1 className="mt-4 font-serif text-[38px] font-medium leading-[1.1] tracking-tight sm:text-5xl">{topic.title}</h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] text-muted">
          <Avatar id={topic.authorId} name={topic.authorName} />
          <span>
            <strong className="font-semibold text-ink">{topic.authorName}</strong> · Posted <LocalDate iso={topic.createdAt.toISOString()} />
            {edited && (
              <>
                {" "}
                · Edited <LocalDate iso={topic.updatedAt.toISOString()} />
              </>
            )}
          </span>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <section className="rounded-xl border border-line bg-card px-5 py-4">
            <h2 className={eyebrow}>Task</h2>
            <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed">{topic.task}</p>
          </section>
          <section className="rounded-xl border border-line bg-card px-5 py-4">
            <h2 className={eyebrow}>Goal</h2>
            <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed">{topic.goal}</p>
          </section>
        </div>

        {topic.bodyMd && (
          <section className="mt-9">
            <h2 className={`${eyebrow} mb-3`}>Notes</h2>
            <Markdown className="font-serif text-[19px] sm:text-xl">{topic.bodyMd}</Markdown>
          </section>
        )}

        {topic.attachments.length > 0 && (
          <section className="mt-9">
            <h2 className={`${eyebrow} mb-3`}>Attachments · {topic.attachments.length}</h2>
            <AttachmentList items={topic.attachments} />
          </section>
        )}
      </article>

      <hr className="my-12 border-line" />

      <section aria-labelledby="progress-heading">
        <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
          <h2 id="progress-heading" className="font-serif text-[32px] font-medium tracking-tight">
            Progress
          </h2>
          <span className="text-[15px] text-muted">{plural(entries.length, "update")}</span>
        </div>

        {entries.length === 0 ? (
          <p className="mt-4 text-muted">No updates yet. Be the first to log progress below.</p>
        ) : (
          <ol className="relative mt-6">
            {entries.map((e, i) => {
              const mine = e.authorId === user.id;
              return (
                <li key={e.id} id={`entry-${e.id}`} className="relative flex scroll-mt-24 gap-4 pb-8">
                  {/* Timeline segment from this avatar down to the next one, with a gap at both ends
                      so the line never runs through the (translucent) avatars. */}
                  {i < entries.length - 1 && (
                    <div aria-hidden="true" className="absolute bottom-1.5 left-[19px] top-[46px] w-0.5 rounded-full bg-line" />
                  )}
                  <Avatar id={e.authorId} name={e.authorName} className="shrink-0" />
                  <div className="min-w-0 flex-1 pt-2">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="font-semibold">{e.authorName}</span>
                      <span className="text-sm text-muted">
                        <LocalDate iso={e.createdAt.toISOString()} withTime />
                        {e.updatedAt.getTime() - e.createdAt.getTime() > 60_000 && " · edited"}
                      </span>
                      {isNew(e.createdAt, e.authorId) && <NewBadge />}
                      {mine && (
                        <span className="ml-auto flex items-center gap-1">
                          <Link href={`/topics/${id}/progress/${e.id}/edit`} className={button("ghost", "sm")}>
                            Edit
                          </Link>
                          <form action={deleteProgressAction.bind(null, e.id)}>
                            <SubmitButton variant="danger" size="sm" pendingText="Deleting…" confirm="This update and any files attached to it will be deleted. This can't be undone.">
                              Delete
                            </SubmitButton>
                          </form>
                        </span>
                      )}
                    </div>
                    {e.bodyMd && <Markdown className="mt-1.5 text-[17px] text-ink">{e.bodyMd}</Markdown>}
                    {e.attachments.length > 0 && <AttachmentList items={e.attachments} className="mt-3" />}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-6">
          <ProgressComposer action={addProgressAction.bind(null, id)} maxMb={env().MAX_UPLOAD_MB} />
        </div>
      </section>
    </div>
  );
}
