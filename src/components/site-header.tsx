import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/dal";
import { Avatar } from "./avatar";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

/** Minimal top bar: just the theme toggle and the account menu, aligned right. */
function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-[1040px] items-center justify-end gap-1 px-4 pt-3 sm:px-5">{children}</header>
  );
}

export function SiteHeaderFallback() {
  return (
    <Shell>
      <ThemeToggle />
      <span className="size-11" aria-hidden="true" />
    </Shell>
  );
}

const menuLink = "flex min-h-10 items-center rounded-lg px-3 text-sm hover:bg-subtle";

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <Shell>
      <ThemeToggle />
      {user && (
        <UserMenu
          label={`Account menu for ${user.displayName ?? user.email}`}
          trigger={<Avatar id={user.id} name={user.displayName ?? user.email} size="md" />}
        >
          <div className="border-b border-line px-3 pb-2.5 pt-2">
            <p className="truncate text-sm font-semibold">{user.displayName ?? "New member"}</p>
            <p className="truncate text-[13px] text-muted">{user.email}</p>
          </div>
          <nav aria-label="Main" className="mt-1">
            <Link href="/" className={menuLink}>
              Challenges
            </Link>
            <Link href="/members" className={menuLink}>
              Members
            </Link>
            <Link href="/settings" className={menuLink}>
              Settings
            </Link>
          </nav>
          <form action={signOutAction}>
            <button type="submit" className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-subtle">
              Sign out
            </button>
          </form>
        </UserMenu>
      )}
    </Shell>
  );
}
