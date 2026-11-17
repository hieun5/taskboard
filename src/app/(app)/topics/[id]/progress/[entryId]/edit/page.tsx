import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateProgressAction } from "@/app/actions/progress";
import { ExistingFiles } from "@/components/existing-files";
import { ArrowLeftIcon } from "@/components/icons";
import { ProgressComposer } from "@/components/progress-composer";
import { env } from "@/env";
import { requireUser } from "@/lib/auth/dal";
import { getOwnedEntry } from "@/lib/data/progress";
import { orNotFound, requireUuid } from "@/lib/route-params";
import { AppError } from "@/lib/errors";

export const metadata: Metadata = { title: "Edit update" };

export default async function EditEntryPage({ params }: PageProps<"/topics/[id]/progress/[entryId]/edit">) {
  const user = await requireUser();
  const p = await params;
  const topicId = requireUuid(p.id);
  const entryId = requireUuid(p.entryId);
  const entry = await orNotFound(async () => {
    try {
      return await getOwnedEntry(user, entryId);
    } catch (err) {
      if (err instanceof AppError && err.code === "forbidden") notFound();
      throw err;
    }
  });
  if (entry.topicId !== topicId) notFound();
  return (
    <div className="mx-auto max-w-[760px] px-4 pb-20 pt-6 sm:px-5">
      <Link href={`/topics/${topicId}#entry-${entryId}`} className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-muted hover:text-ink">
        <ArrowLeftIcon size={16} />
        Back to the topic
      </Link>
      <h1 className="mt-4 font-serif text-[36px] font-medium tracking-tight">Edit your update</h1>
      <div className="mt-6">
        <ProgressComposer
          action={updateProgressAction.bind(null, entryId)}
          maxMb={env().MAX_UPLOAD_MB}
          defaultValue={entry.bodyMd}
          submitLabel="Save changes"
          title="Update"
        >
          <ExistingFiles files={entry.attachments} />
        </ProgressComposer>
      </div>
    </div>
  );
}
