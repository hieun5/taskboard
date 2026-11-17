import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WelcomeForm } from "@/components/welcome-form";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const user = await requireUser({ allowMissingName: true });
  if (user.displayName) redirect("/");
  return <WelcomeForm />;
}
