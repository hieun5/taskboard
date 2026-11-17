import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/dal";
import { Avatar } from "./avatar";
import { LogoIcon, PlusIcon } from "./icons";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { button } from "./ui";

export function Brand() {
  return (
    <Link href="/" className="mr-auto flex min-h-11 items-center gap-2.5 text-ink">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-on-primary">
        <LogoIcon size={16} />
      </span>
      <span className="font-serif text-[22px] font-semibold tracking-tight">Topic Board</span>
    </Link>
  );
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b border-line bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75 sticky top-0 z-20">
      <div className="mx-auto flex max-w-[1040px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-5">
        <Brand />
        {children}
      </div>
    </header>
  );
}

export function SiteHeaderFallback() {
  return (
    <Shell>
      <ThemeToggle />
    </Shell>
  );
}

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <Shell>
      {user && (
        <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
          <Link href="/" className="inline-flex min-h-11 items-center rounded-lg px-3 text-[15px] font-medium text-muted hover:bg-subtle hover:text-ink">
            Challenges
          </Link>
          <Link href="/members" className="inline-flex min-h-11 items-center rounded-lg px-3 text-[15px] font-medium text-muted hover:bg-subtle hover:text-ink">
            Members
          </Link>
        </nav>
      )}
      {user && (
        <Link href="/topics/new" className={button("primary", "md", "px-3 sm:px-4")} aria-label="New topic">
          <PlusIcon size={16} />
          <span className="hidden sm:inline">New topic</span>
        </Link>
      )}
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
            <Link href="/" className="mt-1 flex min-h-10 items-center rounded-lg px-3 text-sm hover:bg-subtle sm:hidden">
              Challenges
            </Link>
            <Link href="/members" className="flex min-h-10 items-center rounded-lg px-3 text-sm hover:bg-subtle sm:hidden">
              Members
            </Link>
            <Link href="/settings" className="mt-1 flex min-h-10 items-center rounded-lg px-3 text-sm hover:bg-subtle">
              Settings
            </Link>
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
