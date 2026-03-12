import { PageShell } from "@/app/_components/PageShell";
import { getBaseUrl } from "@/app/_lib/baseUrl";
import { RunDetailClient } from "@/app/tasks/_components/RunDetailClient";

async function fetchRun(id: string) {
  const res = await fetch(`${getBaseUrl()}/api/runs/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as { run: any };
}

export default async function RunDetailPage({ params }: { params: { id: string } }) {
  const data = await fetchRun(params.id);

  return (
    <PageShell title="Run Detail" subtitle={params.id}>
      <RunDetailClient initialRunId={params.id} initialRun={data?.run ?? null} />
    </PageShell>
  );
}
