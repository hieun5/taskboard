import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Everything on the board is live data, so after any change we drop the router's cached
 * pages (the board, topics, members) and the current page re-renders with fresh data.
 */
export function revalidateAll() {
  revalidatePath("/", "layout");
}
