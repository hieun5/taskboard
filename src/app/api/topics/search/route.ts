import { getCurrentUser } from "@/lib/auth/dal";
import { listTopics, type TopicSearchResult } from "@/lib/data/topics";

const MAX_RESULTS = 8;

/** Quick search for the board's search popup: matches title, goal and task. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (!q) return Response.json([]);

  const topics = await listTopics(user, { q, limit: MAX_RESULTS });
  const results: TopicSearchResult[] = topics.map(({ id, title, goal, status, unread }) => ({ id, title, goal, status, unread }));
  return Response.json(results, { headers: { "Cache-Control": "private, no-store" } });
}
