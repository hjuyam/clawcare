import { PageShell } from "@/app/_components/PageShell";
import { getBaseUrl } from "@/app/_lib/baseUrl";

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
      <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm">
        {!data ? (
          <div className="text-neutral-700">Run not found.</div>
        ) : (
          <pre className="overflow-auto rounded-lg bg-neutral-50 p-4">
            {JSON.stringify(data.run, null, 2)}
          </pre>
        )}
      </div>
    </PageShell>
  );
}
