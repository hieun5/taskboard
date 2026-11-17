"use client";

import { useEffect, useState } from "react";

const fmt = (d: Date, withTime: boolean) =>
  d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });

/** A date in the reader's own time zone. Renders a UTC fallback on the server. */
export function LocalDate({ iso, withTime = false }: { iso: string; withTime?: boolean }) {
  const [text, setText] = useState(() =>
    new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(fmt(new Date(iso), withTime));
  }, [iso, withTime]);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}
