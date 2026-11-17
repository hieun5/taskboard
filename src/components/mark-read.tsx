"use client";

import { useEffect } from "react";
import { markReadAction } from "@/app/actions/members";

/** Records that you've seen this topic once it's actually on screen (not on prefetch). */
export function MarkRead({ topicId }: { topicId: string }) {
  useEffect(() => {
    void markReadAction(topicId);
  }, [topicId]);
  return null;
}
