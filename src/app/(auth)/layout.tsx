import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="absolute right-3 top-3">
        <ThemeToggle />
      </div>
      <main className="w-full max-w-[420px]">{children}</main>
    </div>
  );
}
