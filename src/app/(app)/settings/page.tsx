import type { Metadata } from "next";
import { SettingsForm } from "@/components/settings-form";
import { ThemePicker } from "@/components/theme-toggle";
import { card, eyebrow } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-[640px] px-4 pb-20 pt-10 sm:px-5">
      <h1 className="font-serif text-[40px] font-medium leading-tight tracking-tight">Settings</h1>
      <p className="mt-2 text-muted">Signed in as {user.email}</p>

      <section className="mt-8">
        <h2 className={`${eyebrow} mb-3`}>Profile and email</h2>
        <SettingsForm displayName={user.displayName ?? ""} emailNotifications={user.emailNotifications} />
      </section>

      <section className="mt-10">
        <h2 className={`${eyebrow} mb-3`}>Appearance</h2>
        <div className={`${card} p-5 sm:p-6`}>
          <p className="mb-3 font-semibold">Theme</p>
          <ThemePicker />
          <p className="mt-3 text-[13px] text-muted">Saved on this device.</p>
        </div>
      </section>
    </div>
  );
}
