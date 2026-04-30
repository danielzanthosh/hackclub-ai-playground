"use client";

import { Menu, SlidersHorizontal, Plus } from "lucide-react";
import { useLayoutState } from "./layout-context";
import Link from "next/link";

export function MobileHeader() {
  const { setSidebarOpen, setParamsOpen } = useLayoutState();

  return (
    <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-border bg-background/80 backdrop-blur-md shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
        >
          <Menu size={20} />
        </button>
        <div className="font-bold text-sm tracking-tight">HC Create</div>
      </div>
      
      <div className="flex items-center gap-1">
        <Link 
          href="/chat"
          className="p-2 text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
          title="New Chat"
        >
          <Plus size={20} />
        </Link>
        <button 
          onClick={() => setParamsOpen(true)}
          className="p-2 -mr-2 text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
        >
          <SlidersHorizontal size={20} />
        </button>
      </div>
    </div>
  );
}
