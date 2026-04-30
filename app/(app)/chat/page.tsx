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

export default function ChatPage() {
  const { apiKey, baseUrl, userId } = useUser();
  const { params, activeModel } = useParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const endRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !apiKey || !userId) return;

    const userMsg: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const apiMessages = [
      { role: "system", content: params.systemPrompt } as ChatMessage,
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
        
        // Auto-title from first user message
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

        const { error: msgError } = await supabase.from("messages").insert([
          { chat_id: chat.id, role: "user", content: input },
          { chat_id: chat.id, role: "assistant", content: fullText },
        ]);

        if (msgError) {
          console.error("Error saving messages:", msgError);
        }

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
    <div className="flex flex-col h-full bg-background relative">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 max-w-4xl mx-auto ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
             <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-sidebar-accent'}`}>
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} style={{ color: "var(--hc-accent)" }} />}
             </div>
             <div className={`max-w-[85%] px-5 py-4 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm' : 'bg-transparent'}`}>
                {m.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{typeof m.content === 'string' ? m.content : 'Complex content'}</div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground prose-p:leading-relaxed prose-pre:bg-secondary prose-pre:border prose-pre:border-border overflow-hidden">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {typeof m.content === 'string' ? m.content : 'Complex content'}
                    </ReactMarkdown>
                  </div>
                )}
             </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end bg-card border border-border rounded-xl p-2 focus-within:ring-1 focus-within:ring-primary">
          <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
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
            placeholder="Type a message..."
            className="min-h-[44px] max-h-48 bg-transparent border-none resize-none focus-visible:ring-0 px-0 py-3"
            rows={1}
          />
          <Button type="submit" disabled={!input.trim() || isLoading || !apiKey} size="icon" className="shrink-0 rounded-lg">
             {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
