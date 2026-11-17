"use client";

import { useState, useTransition } from "react";
import type { TopicStatus } from "@/db/schema";
import { STATUS_META, STATUS_ORDER } from "./status";

export function StatusSelect({ status, action }: { status: TopicStatus; action: (formData: FormData) => Promise<void> }) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const change = (next: TopicStatus) => {
    setValue(next);
    setSaved(false);
    const fd = new FormData();
    fd.set("status", next);
    startTransition(async () => {
      await action(fd);
      setSaved(true);
    });
  };

  return (
    <div className="inline-flex items-center gap-2">
      <label htmlFor="topic-status" className="text-sm font-medium text-muted">
        Status
      </label>
      <select
        id="topic-status"
        name="status"
        value={value}
        disabled={pending}
        onChange={(e) => change(e.target.value as TopicStatus)}
        className="min-h-10 rounded-lg border border-field bg-card px-2.5 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].label}
          </option>
        ))}
      </select>
      <span className="text-[13px] text-muted" role="status">
        {pending ? "Saving…" : saved ? "Saved" : ""}
      </span>
    </div>
  );
}
