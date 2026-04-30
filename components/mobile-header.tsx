"use client";

import { Menu, SlidersHorizontal } from "lucide-react";
import { useLayoutState } from "./layout-context";

export function MobileHeader() {
  const { setSidebarOpen, setParamsOpen } = useLayoutState();

  return (
    <div className="md:hidden flex items-center justify-between p-3 border-b border-border bg-background shrink-0">
      <button 
        onClick={() => setSidebarOpen(true)}
        className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <Menu size={20} />
      </button>
      <div className="font-semibold text-sm">HC Create AI</div>
      <button 
        onClick={() => setParamsOpen(true)}
        className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
      >
        <SlidersHorizontal size={20} />
      </button>
    </div>
  );
}
