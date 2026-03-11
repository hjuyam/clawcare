import { PageShell } from "@/app/_components/PageShell";

export default function ConnectPage() {
  return (
    <PageShell
      title="Connect"
      subtitle="本机/远程/反代连接；连通性与能力探测。"
    >
      <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700">
        <p>占位：这里将配置 deployment profile，并探测 gateway capabilities。</p>
      </div>
    </PageShell>
  );
}
