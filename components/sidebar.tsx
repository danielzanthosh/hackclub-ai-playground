"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/components/user-provider";
import { useLayoutState } from "@/components/layout-context";
import { Settings, MessageSquare, Image, Mic, Music, Hash, Wrench, PlusCircle, Trash2, PanelLeftClose, PanelLeftOpen, SplitSquareHorizontal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Inline HC icon-rounded SVG
function HCIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M128 256C230.4 256 256 230.4 256 128C256 25.6 230.4 0 128 0C25.6 0 0 25.6 0 128C0 230.4 25.6 256 128 256Z" fill="url(#hc-grad)"/>
      <path d="M115.103 47L80 52.9604V208.085H115.103V149.397C115.103 132.127 124.261 121.429 131.892 121.429C138.76 121.429 140.744 128.307 140.744 138.699V208.085H176V133.656C176 110.12 167.148 94.9892 144.102 94.9892C133.266 94.9892 122.735 98.0458 115.103 104.923V47Z" fill="white"/>
      <defs>
        <radialGradient id="hc-grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="rotate(58.515) scale(245.082)">
          <stop stopColor="#FF8C37"/>
          <stop offset="1" stopColor="#EC3750"/>
        </radialGradient>
      </defs>
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/chat",       label: "Chat",       icon: MessageSquare },
  { href: "/compare",    label: "Compare",    icon: SplitSquareHorizontal },
  { href: "/images",     label: "Images",     icon: Image         },
  { href: "/speech",     label: "Speech",     icon: Mic           },
  { href: "/music",      label: "Music",      icon: Music         },
  { href: "/embeddings", label: "Embeddings", icon: Hash          },
  { href: "/utilities",  label: "Utilities",  icon: Wrench        },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { userId, name, avatarColor, accentColor } = useUser();
  const { isSidebarOpen, setSidebarOpen } = useLayoutState();

  const { data: chats = [], mutate } = useSWR(
    userId ? `chats-${userId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) {
        console.error("Error fetching chats:", error);
        return [];
      }
      return data;
    }
  );

  const deleteChat = async (chatId: string) => {
    const { error } = await supabase.from("chats").delete().eq("id", chatId);
    if (error) {
      toast.error("Failed to delete chat");
    } else {
      mutate(chats.filter((c: any) => c.id !== chatId));
      toast.success("Chat deleted");
    }
  };

  if (!isSidebarOpen) {
    return (
      <aside className="absolute z-50 md:relative w-[50px] flex-shrink-0 flex flex-col items-center py-4 bg-sidebar border-r border-sidebar-border h-full transition-transform duration-300 -translate-x-full md:translate-x-0">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors mb-4">
          <HCIcon size={24} />
        </button>
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground transition-colors mt-auto">
          <PanelLeftOpen size={18} />
        </button>
      </aside>
    );
  }

  return (
    <>
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/50" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}
      <aside className="absolute z-50 md:relative w-[220px] flex-shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border h-full transition-transform duration-300 translate-x-0">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-3.5 border-b border-sidebar-border">
        <HCIcon size={28} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-sidebar-foreground truncate leading-tight">HC Create</p>
          <p className="text-[10px] text-muted-foreground">AI Playground</p>
        </div>
        <span className="text-[9px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded mr-1">BETA</span>
        <button onClick={() => setSidebarOpen(false)} className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground">
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="px-2 pt-3 pb-1">
        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">Modes</p>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm mb-0.5 transition-colors",
                active
                  ? "bg-[color-mix(in_srgb,var(--hc-accent)_12%,transparent)] text-[var(--hc-accent)] font-semibold"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon size={15} className={active ? "text-[var(--hc-accent)]" : ""} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* New Chat Button */}
      <div className="px-2 py-2 border-t border-sidebar-border">
        <Link
          href="/chat"
          onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
          className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <PlusCircle size={14} />
          New Chat
        </Link>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {chats.length > 0 && (
          <>
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1 pt-1">History</p>
            {chats.map((chat: any) => (
              <div key={chat.id} className="group flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-sidebar-accent cursor-pointer transition-colors">
                <Link href={`/chat/${chat.id}`} onClick={() => window.innerWidth < 768 && setSidebarOpen(false)} className="flex-1 truncate text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground">
                  {chat.title}
                </Link>
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    await deleteChat(chat.id);
                  }}
                  className="hidden group-hover:flex text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* User Chip */}
      <div className="border-t border-sidebar-border p-2">
        <Link
          href="/settings"
          onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors cursor-pointer"
        >
          {/* Avatar */}
          <div
            className="w-7 h-7 rounded-lg flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${avatarColor}, ${accentColor})` }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">{name}</p>
            <p className="text-[10px] text-muted-foreground">Settings & Profile</p>
          </div>
          <Settings size={13} className="text-muted-foreground flex-shrink-0" />
        </Link>
        <p className="text-[9px] text-muted-foreground text-center mt-2 leading-tight">
          Made by Grace Site &amp; Daniel Santhosh
        </p>
      </div>
    </aside>
    </>
  );
}
