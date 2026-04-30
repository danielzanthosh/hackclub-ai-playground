"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@/components/user-provider";
import { useParams } from "@/components/params-panel";
import { supabase } from "@/lib/supabase";
import { streamChat, ChatMessage } from "@/lib/hackclub-ai";
import { Paperclip, Send, Loader2, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import gsap from "gsap";

export default function ChatPage() {
  const { apiKey, baseUrl, userId, personalization } = useUser();
  const { params, activeModel } = useParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const endRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // GSAP animation for new messages
  useEffect(() => {
    if (messagesContainerRef.current) {
      const lastMessage = messagesContainerRef.current.lastElementChild;
      if (lastMessage && !isLoading) {
        gsap.fromTo(lastMessage, 
          { opacity: 0, y: 10 }, 
          { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
        );
      }
    }
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !apiKey || !userId) return;

    const userMsg: ChatMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    // Build the personalization string
    const personalInfo = Object.entries(personalization)
      .filter(([_, v]) => !!v)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    
    const enrichedSystemPrompt = personalInfo 
      ? `${params.systemPrompt}\n\n[USER INFO]: ${personalInfo}`
      : params.systemPrompt;

    const apiMessages = [
      { role: "system", content: enrichedSystemPrompt } as ChatMessage,
      ...messages,
      userMsg,
    ];

    let currentAiText = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    await streamChat(
      baseUrl,
      apiKey,
      apiMessages,
      params,
      (chunk) => {
        currentAiText = chunk;
        setMessages((prev) => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content: currentAiText };
          return newMsgs;
        });
      },
      async (fullText) => {
        setIsLoading(false);
        
        // Initial title from first user message
        const title = input.slice(0, 60) + (input.length > 60 ? "…" : "");
        
        // Save to Supabase
        const { data: chat, error: chatError } = await supabase
          .from("chats")
          .insert([
            {
              user_id: userId,
              title: title,
              model: activeModel,
              params: params,
            },
          ])
          .select()
          .single();

        if (chatError) {
          console.error("Error creating chat:", chatError);
          toast.error("Failed to save chat");
          return;
        }

        await supabase.from("messages").insert([
          { chat_id: chat.id, role: "user", content: input },
          { chat_id: chat.id, role: "assistant", content: fullText },
        ]);

        // Redirect to the new chat page
        router.push(`/chat/${chat.id}`);
      },
      (err) => {
        console.error(err);
        setIsLoading(false);
        toast.error("Stream error");
      }
    );
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50 px-4">
            <Bot size={48} className="text-[var(--hc-accent)] mb-2" />
            <h2 className="text-xl font-bold tracking-tight">How can I help you today?</h2>
            <p className="text-sm max-w-sm">Start a conversation with {activeModel.split('/').pop()}. Your settings and persona are already synced.</p>
          </div>
        )}
        {messages.map((m, i) => {
          const isLast = i === messages.length - 1;
          const isAssistant = m.role === 'assistant';
          const showCursor = isLast && isAssistant && isLoading;

          return (
            <div key={i} className={`flex gap-4 max-w-4xl mx-auto w-full ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
               <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${m.role === 'user' ? 'bg-primary border-primary' : 'bg-card border-border'}`}>
                  {m.role === 'user' ? <User size={14} className="text-primary-foreground" /> : <Bot size={14} style={{ color: "var(--hc-accent)" }} />}
               </div>
               <div className={cn(
                 "max-w-[85%] md:max-w-[75%] px-5 py-3.5 text-[15px] leading-relaxed",
                 m.role === 'user' 
                  ? "bg-primary text-primary-foreground rounded-3xl rounded-tr-sm shadow-md" 
                  : "bg-card border border-border/50 rounded-3xl rounded-tl-sm shadow-sm"
               )}>
                  {m.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{typeof m.content === 'string' ? m.content : 'Complex content'}</div>
                  ) : (
                    <div className={cn(
                      "prose prose-sm dark:prose-invert max-w-none text-foreground prose-p:leading-relaxed prose-pre:bg-secondary prose-pre:border prose-pre:border-border overflow-hidden",
                      showCursor && "streaming-cursor"
                    )}>
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {typeof m.content === 'string' ? m.content : 'Complex content'}
                      </ReactMarkdown>
                    </div>
                  )}
               </div>
            </div>
          );
        })}
        <div ref={endRef} className="h-4" />
      </div>
      
      <div className="p-4 md:p-6 bg-gradient-to-t from-background via-background/95 to-transparent">
        <form onSubmit={handleSubmit} className="relative flex items-center bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-[var(--hc-accent)]/20 focus-within:border-[var(--hc-accent)]/40 transition-all max-w-4xl mx-auto shadow-2xl">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={() => toast.info("File upload coming soon")}
          />
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 text-muted-foreground hover:text-foreground hover:bg-background/50 rounded-xl h-10 w-10"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Ask anything..."
            className="min-h-[44px] max-h-64 bg-transparent border-none resize-none focus-visible:ring-0 px-3 py-3 text-[15px]"
            rows={1}
          />
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading || !apiKey} 
            className="shrink-0 rounded-xl h-10 w-10 bg-primary shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          >
             {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <p className="text-[10px] text-center text-muted-foreground mt-3 opacity-50">
          HC AI can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
}
