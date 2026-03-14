import { PageShell } from "@/app/_components/PageShell";
import { getBaseUrl } from "@/app/_lib/baseUrl";
import { RunDetailClient } from "@/app/tasks/_components/RunDetailClient";

async function fetchRun(id: string) {
  const res = await fetch(`${getBaseUrl()}/api/runs/${id}`, {
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    return { run: null, error: json?.error ?? { message: `HTTP ${res.status}` }, mode: json?.mode ?? null };
  }
  return json as { run: any; error?: any; mode?: string };
}

export default async function RunDetailPage({ params }: { params: { id: string } }) {
  const data = await fetchRun(params.id);

  return (
    <PageShell title="Run Detail" subtitle={params.id}>
      <RunDetailClient
        initialRunId={params.id}
        initialRun={data?.run ?? null}
        initialError={data?.error ?? null}
        initialMode={data?.mode ?? null}
      />
    </PageShell>
  );
}
