import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  invalid: "That sign-in link has expired or was already used. Enter your email for a new one.",
  not_invited: "That email isn't on the invite list. Ask Hieu to add you.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/");
  const { error, next } = await searchParams;
  const notice = typeof error === "string" ? NOTICES[error] : undefined;
  return <LoginForm notice={notice} next={typeof next === "string" ? next : undefined} />;
}
