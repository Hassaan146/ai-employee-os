"use client";

/**
 * Mobile navigation.
 *
 * The sidebar is hidden below the md breakpoint, which left the console with
 * no navigation at all on a phone. This provides a drawer with the same links.
 *
 * Behaviour that matters for usability:
 *  - closes on route change, so a tap navigates and dismisses in one action
 *  - Escape closes it, and focus moves to the close button on open
 *  - body scroll is locked while open so the page behind does not move
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { IconLogo } from "@/components/ui/icons";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);

  // A tap on a link should navigate and dismiss, not leave the drawer covering
  // the page the user just asked for.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* Trigger bar — only below the breakpoint where the sidebar disappears. */}
      <div className="flex h-12 items-center gap-3 border-b border-line bg-surface/60 px-4 backdrop-blur-sm md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={open}
          aria-controls="mobile-nav-drawer"
          className="grid size-9 place-items-center rounded-lg border border-line bg-surface-2 text-ink-muted transition hover:text-ink"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <span className="flex items-center gap-2">
          <IconLogo className="size-6" />
          <span className="text-xs font-semibold tracking-tight text-ink">
            AI Employee OS
          </span>
        </span>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Scrim — tapping outside dismisses. */}
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-canvas/80 backdrop-blur-sm"
          />

          <div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-64 flex-col bg-canvas shadow-2xl"
          >
            <div className="flex justify-end border-b border-line-soft px-3 py-2">
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="grid size-8 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-2 hover:text-ink"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Sidebar />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
