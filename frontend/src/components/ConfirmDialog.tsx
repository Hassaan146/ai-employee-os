"use client";

/**
 * Confirmation for destructive actions.
 *
 * Delete buttons previously fired immediately, which is the classic
 * "confirmation-dialogs" anti-pattern — an irreversible action one stray click
 * away. Focus moves to the dialog on open and Escape cancels, so it is usable
 * from the keyboard.
 */

import { useEffect, useRef } from "react";
import { Button, Card, CardBody, CardHeader } from "@/components/ui/primitives";

export function ConfirmDialog({
  title,
  body,
  confirmLabel = "Delete",
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-canvas/80 px-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-body"
    >
      <Card className="w-full max-w-sm animate-fade-up shadow-2xl">
        <CardHeader title={<span id="confirm-title">{title}</span>} />
        <CardBody>
          <p id="confirm-body" className="text-xs leading-relaxed text-ink-muted">
            {body}
          </p>
        </CardBody>
        <div className="flex justify-end gap-2 border-t border-line-soft px-5 py-3.5">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
