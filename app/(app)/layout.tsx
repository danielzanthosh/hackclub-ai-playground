"use client";

import { UserProvider } from "@/components/user-provider";
import { Sidebar } from "@/components/sidebar";
import { ParamsPanel, ParamsPanelProvider } from "@/components/params-panel";
import { LayoutStateProvider } from "@/components/layout-context";
import { MobileHeader } from "@/components/mobile-header";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      gsap.fromTo(mainRef.current, 
        { opacity: 0 }, 
        { opacity: 1, duration: 0.8, ease: "power2.out" }
      );
    }
  }, []);

  return (
    <UserProvider>
      <ParamsPanelProvider>
        <LayoutStateProvider>
          <div className="flex h-screen overflow-hidden bg-background relative font-sans">
            <Sidebar />
            <main ref={mainRef} className="flex-1 flex flex-col overflow-hidden min-w-0">
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
