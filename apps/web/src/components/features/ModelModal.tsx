"use client";

import { useEffect, useRef, useState } from "react";
import ModelManager from "@/components/features/ModelManager";

/**
 * Manage-models dialog: the model list opens as a modal from any picker,
 * never as a detour to the settings page. `onChanged` fires when the dialog
 * closes so the parent picker reloads toggles made inside.
 */
export default function ManageModelsModal({ onChanged }: { onChanged?: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open ]);

  function close() {
    setOpen(false);
    onChanged?.();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 text-xs font-semibold underline underline-offset-2"
      >
        Manage models
      </button>
      <dialog
        ref={dialogRef}
        data-lenis-prevent
        onClose={() => close()}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        className="paper-card max-h-[85dvh] w-[min(600px,calc(100vw-2.5rem))] overflow-y-auto"
        aria-label="Manage models"
      >
      <div className="p-6 sm:p-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">Manage models</h2>
          <button
            type="button"
            onClick={() => close()}
            className="btn-ghost px-5 py-2 text-sm"
            autoFocus
          >
            Done
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Toggle which of your key&apos;s models appear in the pickers.
        </p>
        <div className="mt-5">
          <ModelManager />
        </div>
      </div>
      </dialog>
    </>
  );
}
