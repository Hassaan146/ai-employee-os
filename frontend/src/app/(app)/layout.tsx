import { RequireAuth } from "@/components/layout/RequireAuth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

/** Shell for every authenticated console page: fixed sidebar + top bar. */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <RequireAuth>
      {/* WCAG 2.4.1 — lets keyboard users bypass the sidebar. */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="relative z-10 flex h-screen overflow-hidden">
        <aside className="hidden w-60 shrink-0 md:block">
          <Sidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-6xl space-y-6 px-5 py-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </RequireAuth>
  );
}
