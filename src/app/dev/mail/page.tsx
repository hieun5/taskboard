import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { devOutboxEnabled, readOutbox } from "@/lib/mail";

export const metadata: Metadata = { title: "Dev mailbox" };

function linkify(text: string) {
  return text.split(/(https?:\/\/\S+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} className="break-all font-semibold underline underline-offset-2">
        {part}
      </a>
    ) : (
      part
    ),
  );
}

async function Outbox() {
  await connection();
  if (!devOutboxEnabled()) notFound();
  const mails = await readOutbox();
  return (
    <ul className="mt-6 space-y-3">
      {mails.length === 0 && <li className="text-muted">No emails yet. Request a sign-in link on /login.</li>}
      {mails.map((m, i) => (
        <li key={i} className="rounded-2xl border border-line bg-card p-5">
          <p className="text-sm text-muted">
            To <strong className="text-ink">{m.to}</strong> · {new Date(m.sentAt).toLocaleString()}
          </p>
          <p className="mt-1 font-semibold">{m.subject}</p>
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">{linkify(m.text)}</p>
        </li>
      ))}
    </ul>
  );
}

/** Local-only mailbox for the console mail driver, so you can sign in without real email. */
export default function DevMailPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-10">
      <h1 className="font-serif text-4xl font-medium tracking-tight">Dev mailbox</h1>
      <p className="mt-2 text-muted">Emails the app would have sent. Only available with MAIL_DRIVER=console.</p>
      <Suspense fallback={<p className="mt-6 text-muted">Loading…</p>}>
        <Outbox />
      </Suspense>
    </main>
  );
}
