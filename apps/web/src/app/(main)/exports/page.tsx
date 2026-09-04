"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { PageHeader, ListShell } from "@/components/ui/PageShell";
import RefreshButton from "@/components/ui/RefreshButton";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type ExportItem = {
  id: string;
  format: string;
  secure_url: string | null;
  pages: number | null;
  created_at: string;
};

export default function ExportsPage() {
  const [exports, setExports] = useState<ExportItem[] | null>(null);
  const [error, setError] = useState("");

  const loadExports = useCallback(async () => {
    setError("");
    try {
      const response = await api<{ items: ExportItem[] }>("/api/exports");
      setExports(response.items);
    } catch {
      setError("Couldn't load exports.");
    }
  }, []);

  useEffect(() => {
    loadExports();
  }, [loadExports]);

  return (
    <div>
      <PageHeader
        title="Exports"
        description="Your download shelf — every PDF and DOCX lands here."
        actions={<RefreshButton onRefresh={loadExports} />}
      />
      <div className="mt-6">
        <ListShell
          items={exports}
          error={error}
          onRetry={loadExports}
          emptyTitle="Nothing exported yet"
          emptyHint="Finish a document in the studio, hit Export PDF, and it will land here."
          emptyAction={
            <span className="text-sm text-[var(--muted)]">Your download shelf is ready.</span>
          }
        >
          {(loadedExports) => (
            <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-surface">
              {loadedExports.map((exportItem) => (
                <li key={exportItem.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-semibold uppercase">{exportItem.format}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {exportItem.pages ? `${exportItem.pages} pages, ` : ""}
                      {new Date(exportItem.created_at).toLocaleString()}
                    </p>
                  </div>
                  <a
                    className="btn-ghost px-4 py-2 text-sm font-semibold"
                    href={exportItem.secure_url ?? `${API_BASE}/api/exports/${exportItem.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          )}
        </ListShell>
      </div>
    </div>
  );
}
