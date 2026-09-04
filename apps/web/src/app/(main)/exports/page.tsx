"use client";

import Link from "next/link";
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
            <Link href="/dashboard" className="btn-accent px-6 py-2.5 text-sm font-semibold">
              Back to dashboard
            </Link>
          }
        >
          {(loadedExports) => (
            <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {loadedExports.map((exportItem) => (
                <li key={exportItem.id} className="flex items-center gap-4 py-4">
                  <span className="nchip shrink-0 uppercase" aria-hidden>
                    {exportItem.format}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {exportItem.pages ? `${exportItem.pages} pages` : "Export"}
                      <span className="font-normal text-[var(--muted)]"> · 150 words a page</span>
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--muted)]">
                      {new Date(exportItem.created_at).toLocaleString()}
                    </p>
                  </div>
                  <a
                    className="btn-ghost shrink-0 px-4 py-2 text-sm font-semibold"
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
