import type { Metadata } from "next";
import { createTopicAction } from "@/app/actions/topics";
import { TopicForm } from "@/components/topic-form";
import { env } from "@/env";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "New topic" };

export default async function NewTopicPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-[760px] px-4 pb-20 pt-10 sm:px-5">
      <h1 className="font-serif text-[40px] font-medium leading-tight tracking-tight">New topic</h1>
      <p className="mt-2 text-[17px] text-muted">Say what needs doing and what done looks like. Others can add progress underneath.</p>
      <div className="mt-8">
        <TopicForm
          action={createTopicAction}
          defaults={{ title: "", task: "", goal: "", bodyMd: "", status: "open" }}
          maxMb={env().MAX_UPLOAD_MB}
          cancelHref="/"
          submitLabel="Post topic"
        />
      </div>
    </div>
  );
}
