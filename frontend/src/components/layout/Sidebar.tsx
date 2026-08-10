"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBuilding,
  IconChart,
  IconChat,
  IconShield,
  IconCheck,
  IconDoc,
  IconFolder,
  IconMic,
  IconReceipt,
  IconDashboard,
  IconLogo,
  IconPipeline,
  IconPulse,
  IconRobot,
  IconTarget,
  IconUsers,
} from "@/components/ui/icons";
import { cn } from "@/components/ui/primitives";

type NavItem = {
  href: string;
  label: string;
  icon: (p: { className?: string }) => React.ReactElement;
  /** Shown when the underlying backend endpoints are not live yet. */
  preview?: boolean;
};

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: IconDashboard },
      { href: "/system", label: "System status", icon: IconPulse },
    ],
  },
  {
    section: "Workforce",
    items: [
      { href: "/employees", label: "AI employees", icon: IconRobot, preview: true },
      { href: "/chat", label: "Assistant chat", icon: IconChat, preview: true },
    ],
  },
  {
    section: "CRM",
    items: [
      { href: "/crm/customers", label: "Customers", icon: IconUsers },
      { href: "/crm/leads", label: "Leads", icon: IconTarget },
      { href: "/crm/pipeline", label: "Sales pipeline", icon: IconPipeline },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/tasks", label: "Tasks", icon: IconCheck },
      { href: "/quotations", label: "Quotations", icon: IconDoc },
      { href: "/invoices", label: "Invoices", icon: IconReceipt },
      { href: "/documents", label: "Documents", icon: IconFolder },
      { href: "/meetings", label: "Meetings", icon: IconMic },
    ],
  },
  {
    section: "Insights",
    items: [
      { href: "/reports", label: "Reports", icon: IconChart },
      { href: "/whatsapp", label: "WhatsApp", icon: IconChat },
      { href: "/audit-logs", label: "Audit logs", icon: IconShield },
    ],
  },
  {
    section: "Organisation",
    items: [
      { href: "/team", label: "Team", icon: IconUsers, preview: true },
      { href: "/company", label: "Company & plan", icon: IconBuilding, preview: true },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="flex h-full w-full flex-col gap-6 border-r border-line bg-surface/50 px-3 py-5"
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 rounded-lg px-2 py-1 transition hover:opacity-90"
      >
        <IconLogo className="size-8" />
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-tight text-ink">
            AI Employee OS
          </span>
          <span className="block text-[10px] font-medium uppercase tracking-wider text-ink-faint">
            Operations console
          </span>
        </span>
      </Link>

      <div className="flex-1 space-y-6 overflow-y-auto">
        {NAV.map((group) => (
          <div key={group.section} className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              {group.section}
            </p>
            {group.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition",
                    active
                      ? "bg-accent/10 font-medium text-accent"
                      : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      active ? "text-accent" : "text-ink-faint group-hover:text-ink-muted",
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.preview ? (
                    <span
                      title="Backend endpoints pending — shows preview data"
                      className="size-1.5 shrink-0 rounded-full bg-warn/70"
                    />
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-surface-2/60 px-3 py-3">
        <p className="text-[11px] font-medium text-ink">Phase 2</p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
          Every backend endpoint has a screen. Amber dots mark the few views
          still waiting on routes that do not exist yet.
        </p>
      </div>
    </nav>
  );
}
