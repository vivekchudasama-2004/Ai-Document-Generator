import Link from "next/link";
import { EmptyState, SectionSkeleton, Toast } from "@/components/ui/ui";
import RefreshButton from "@/components/ui/RefreshButton";

/**
 * Standard page header: kicker, display title, lede, actions row.
 * Keeps every management page visually consistent.
 */
export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {kicker ? <p className="kicker">{kicker}</p> : null}
        <h1 className={`font-display text-balance font-bold leading-[1.02] ${kicker ? "mt-2" : ""} text-4xl sm:text-5xl`}>
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-[56ch] text-pretty text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
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
      <div className="grid gap-4" aria-busy="true" aria-label="Loading">
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
