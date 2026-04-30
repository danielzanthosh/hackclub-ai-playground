import { UserProvider } from "@/components/user-provider";
import { Sidebar } from "@/components/sidebar";
import { ParamsPanel, ParamsPanelProvider } from "@/components/params-panel";
import { LayoutStateProvider } from "@/components/layout-context";
import { MobileHeader } from "@/components/mobile-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <ParamsPanelProvider>
        <LayoutStateProvider>
          <div className="flex h-screen overflow-hidden bg-background relative">
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden min-w-0">
              <MobileHeader />
              {children}
            </main>
            <ParamsPanel />
          </div>
        </LayoutStateProvider>
      </ParamsPanelProvider>
    </UserProvider>
  );
}
