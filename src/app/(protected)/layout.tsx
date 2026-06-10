import { RoutePermissionGuard } from "@/components/auth/route-permission-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <div className="pl-56">
        <Topbar />
        <main className="p-6">
          <RoutePermissionGuard>{children}</RoutePermissionGuard>
        </main>
      </div>
    </>
  );
}
