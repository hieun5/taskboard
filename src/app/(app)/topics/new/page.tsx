import type { Metadata } from "next";
import { ViewTransition } from "react";
import { createTopicAction } from "@/app/actions/topics";
import { TopicForm } from "@/components/topic-form";
import { env } from "@/env";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "New topic" };

export default async function NewTopicPage() {
  await requireUser();
  return (
    // Floods in whenever it appears (the page often arrives after the loading skeleton, in a
    // transition with no type) and vanishes again on Cancel. The heading and each field then
    // fill in one after another.
    <ViewTransition enter="flood" exit={{ "close-form": "vanish", default: "none" }} default="none">
      <div className="mx-auto max-w-[760px] px-4 pb-20 pt-10 sm:px-5">
        <h1 className="animate-flood-in font-serif text-[40px] font-medium leading-tight tracking-tight motion-reduce:animate-none">
          New topic
        </h1>
        <div className="mt-8">
          <TopicForm
            action={createTopicAction}
            defaults={{ title: "", task: "", goal: "", bodyMd: "", status: "open" }}
            maxMb={env().MAX_UPLOAD_MB}
            cancelHref="/"
            submitLabel="Post topic"
            className="flood-fields"
          />
        </div>
      </div>
    </ViewTransition>
  );
}
