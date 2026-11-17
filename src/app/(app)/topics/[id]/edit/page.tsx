import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateTopicAction } from "@/app/actions/topics";
import { TopicForm } from "@/components/topic-form";
import { env } from "@/env";
import { requireUser } from "@/lib/auth/dal";
import { getTopic } from "@/lib/data/topics";
import { orNotFound, requireUuid } from "@/lib/route-params";

export const metadata: Metadata = { title: "Edit topic" };

export default async function EditTopicPage({ params }: PageProps<"/topics/[id]/edit">) {
  const user = await requireUser();
  const id = requireUuid((await params).id);
  const topic = await orNotFound(() => getTopic(id));
  if (topic.authorId !== user.id) notFound();
  return (
    <div className="mx-auto max-w-[760px] px-4 pb-20 pt-10 sm:px-5">
      <h1 className="font-serif text-[40px] font-medium leading-tight tracking-tight">Edit topic</h1>
      <div className="mt-8">
        <TopicForm
          action={updateTopicAction.bind(null, id)}
          defaults={{ title: topic.title, task: topic.task, goal: topic.goal, bodyMd: topic.bodyMd, status: topic.status }}
          existingAttachments={topic.attachments}
          maxMb={env().MAX_UPLOAD_MB}
          cancelHref={`/topics/${id}`}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
