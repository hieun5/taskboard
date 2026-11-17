import type { Metadata } from "next";
import Link from "next/link";
import { verifyLinkAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { button, card } from "@/components/ui";

export const metadata: Metadata = { title: "Sign in" };

/**
 * The emailed link lands here. Signing in takes a button press (a POST) rather than
 * happening on page load, so email scanners that open links can't use up the token.
 */
export default async function VerifyPage({ searchParams }: PageProps<"/auth/verify">) {
  const { token, next } = await searchParams;
  if (typeof token !== "string" || !token) {
    return (
      <div className={`${card} px-6 py-8 sm:px-8`}>
        <h1 className="font-serif text-[32px] font-medium tracking-tight">Link not valid</h1>
        <p className="mt-2.5 text-muted">This sign-in link is incomplete. Ask for a new one.</p>
        <Link href="/login" className={button("primary", "md", "mt-6")}>
          Back to sign in
        </Link>
      </div>
    );
  }
  return (
    <form action={verifyLinkAction} className={`${card} px-6 py-8 sm:px-8`}>
      <h1 className="font-serif text-[32px] font-medium tracking-tight">Welcome back</h1>
      <p className="mt-2.5 text-muted">Press the button to finish signing in on this device.</p>
      <input type="hidden" name="token" value={token} />
      {typeof next === "string" && <input type="hidden" name="next" value={next} />}
      <SubmitButton pendingText="Signing in…" className="mt-6 min-h-12 w-full text-base">
        Sign in to Topic Board
      </SubmitButton>
    </form>
  );
}
