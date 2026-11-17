import { getCurrentUser } from "@/lib/auth/dal";
import { getDownloadable } from "@/lib/data/attachments";
import { AppError } from "@/lib/errors";
import { opensInline } from "@/lib/files";
import { storage } from "@/lib/storage";
import { uuidSchema } from "@/lib/validation";

/** Members-only file download. Checks the session, then streams (local) or redirects to a 5-minute SAS URL (Azure). */
export async function GET(_req: Request, ctx: RouteContext<"/files/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Not signed in", { status: 401 });
  const id = uuidSchema.safeParse((await ctx.params).id);
  if (!id.success) return new Response("Not found", { status: 404 });
  try {
    const file = await getDownloadable(user, id.data);
    return await storage().download(file.storageKey, {
      fileName: file.fileName,
      contentType: file.mimeType,
      inline: opensInline(file.mimeType),
    });
  } catch (err) {
    if (err instanceof AppError) return new Response("Not found", { status: 404 });
    console.error("[files] download failed", err);
    return new Response("Could not load the file", { status: 500 });
  }
}
