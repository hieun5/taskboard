import type { Metadata } from "next";
import { revokeInviteAction } from "@/app/actions/members";
import { Avatar } from "@/components/avatar";
import { InviteForm } from "@/components/invite-form";
import { LocalDate } from "@/components/local-date";
import { SubmitButton } from "@/components/submit-button";
import { card, eyebrow } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { listMembers, listPendingInvites } from "@/lib/data/members";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage() {
  const user = await requireUser();
  const [members, invites] = await Promise.all([listMembers(), user.isAdmin ? listPendingInvites() : Promise.resolve([])]);

  return (
    <div className="mx-auto max-w-[760px] px-4 pb-20 pt-10 sm:px-5">
      <h1 className="font-serif text-[40px] font-medium leading-tight tracking-tight">Members</h1>
      <p className="mt-2 text-[17px] text-muted">
        {plural(members.length, "person", "people")} on this board.{" "}
        {user.isAdmin ? "Only people you invite can sign in." : "Ask an admin if you'd like to invite someone."}
      </p>

      {user.isAdmin && (
        <div className="mt-8">
          <InviteForm canEmail />
        </div>
      )}

      <section className="mt-10">
        <h2 className={`${eyebrow} mb-3`}>Members</h2>
        <ul className={`${card} divide-y divide-line`}>
          {members.map((m) => {
            const name = m.displayName ?? m.email.split("@")[0];
            return (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <Avatar id={m.id} name={name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {name}
                    {m.id === user.id && <span className="font-normal text-muted"> (you)</span>}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {user.isAdmin ? m.email : "Member"} · joined <LocalDate iso={m.createdAt.toISOString()} />
                  </p>
                </div>
                {m.isAdmin && (
                  <span className="rounded-full bg-subtle px-2.5 py-1 text-xs font-semibold text-muted ring-1 ring-inset ring-line">Admin</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {user.isAdmin && (
        <section className="mt-10">
          <h2 className={`${eyebrow} mb-3`}>Waiting to sign in</h2>
          {invites.length === 0 ? (
            <p className="text-muted">No pending invites.</p>
          ) : (
            <ul className={`${card} divide-y divide-line`}>
              {invites.map((i) => (
                <li key={i.email} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{i.email}</p>
                    <p className="text-sm text-muted">
                      Invited <LocalDate iso={i.createdAt.toISOString()} />
                      {i.isAdmin && " · will be an admin"}
                    </p>
                  </div>
                  <form action={revokeInviteAction.bind(null, i.email)}>
                    <SubmitButton variant="danger" size="sm" pendingText="Removing…" confirm={`Remove the invite for ${i.email}?`} confirmLabel="Remove">
                      Remove invite
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
