"use client";

/** Snapshot list with one-click restore, shown in the studio console. */
export default function VersionsCard({
  versions,
  busy,
  onRestore,
}: {
  versions: { version_no: number; created_at: string }[];
  busy: boolean;
  onRestore: (versionNo: number) => void;
}) {
  return (
    <div className="mt-4 border-t border-[var(--border)] pt-3">
      <h4 className="text-sm font-bold">Versions</h4>
      {!versions.length ? (
        <p className="mt-1 text-sm text-[var(--muted)]">No snapshots yet.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {versions.map((version) => (
            <li key={version.version_no} className="flex items-center justify-between text-sm">
              <span>
                v{version.version_no}
                <span className="ml-2 text-xs text-[var(--muted)]">
                  {new Date(version.created_at).toLocaleString()}
                </span>
              </span>
              <button
                className="btn-ghost px-3 py-1 text-xs font-semibold"
                disabled={busy}
                onClick={() => onRestore(version.version_no)}
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
