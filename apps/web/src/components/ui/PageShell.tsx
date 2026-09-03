import Link from "next/link";
import { EmptyState, SectionSkeleton, Toast } from "@/components/ui/ui";
import RefreshButton from "@/components/ui/RefreshButton";

/**
 * Standard page header: title, optional description, actions row.
 * Keeps every management page visually consistent.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        {description ? <p className="mt-1 text-[var(--muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/**
 * Standard data-page shell: loading skeletons, error toast, empty state,
 * or the populated list. Every list page renders through this.
 */
export function ListShell<T>({
  items,
  error,
  onRetry,
  emptyTitle,
  emptyHint,
  emptyAction,
  skeletonCount = 3,
  children,
}: {
  items: T[] | null;
  error: string;
  onRetry: () => Promise<unknown>;
  emptyTitle: string;
  emptyHint: string;
  emptyAction: React.ReactNode;
  skeletonCount?: number;
  children: (items: T[]) => React.ReactNode;
}) {
  if (error) {
    return (
      <div className="max-w-xl space-y-3">
        <Toast kind="error" message={error} />
        <RefreshButton onRefresh={onRetry} label="Retry" />
      </div>
    );
  }
  if (!items) {
    return (
      <div className="grid gap-4 md:grid-cols-3" aria-busy="true" aria-label="Loading">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <SectionSkeleton key={index} />
        ))}
      </div>
    );
  }
  if (!items.length) {
    return <EmptyState title={emptyTitle} hint={emptyHint} action={emptyAction} />;
  }
  return <>{children(items)}</>;
}
