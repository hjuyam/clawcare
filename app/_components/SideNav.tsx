import Link from "next/link";

const nav = [
  { href: "/", label: "Home" },
  { href: "/connect", label: "Connect" },
  { href: "/tasks", label: "Tasks & Runs" },
  { href: "/ops", label: "Ops" },
  { href: "/config", label: "Config" },
  { href: "/memory", label: "Memory" },
  { href: "/security", label: "Security & Audit" },
];

export function SideNav() {
  return (
    <aside className="w-64 border-r border-neutral-200/60 bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/40">
      <div className="p-4">
        <div className="text-sm font-semibold tracking-tight">ClawCare</div>
        <div className="text-xs text-neutral-500">龙虾管家 · dev</div>
      </div>
      <nav className="px-2 pb-4">
        <ul className="space-y-1">
          {nav.map((item) => (
            <li key={item.href}>
              <Link
                className="block rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                href={item.href}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
