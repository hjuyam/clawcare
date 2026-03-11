import { SideNav } from "@/app/_components/SideNav";

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-neutral-50">
      <div className="flex min-h-dvh">
        <SideNav />
        <main className="flex-1">
          <header className="border-b border-neutral-200/60 bg-white">
            <div className="mx-auto max-w-5xl px-6 py-6">
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
              {subtitle ? (
                <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>
              ) : null}
            </div>
          </header>
          <section className="mx-auto max-w-5xl px-6 py-8">{children}</section>
        </main>
      </div>
    </div>
  );
}
