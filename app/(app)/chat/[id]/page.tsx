"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@/components/user-provider";
import { useParams as useChatParams } from "@/components/params-panel";
import { supabase } from "@/lib/supabase";
import { streamChat, ChatMessage, generateImage } from "@/lib/hackclub-ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import useSWR from "swr";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { Paperclip, Send, Loader2, Bot, User, Mic, MicOff, Image as ImageIcon, Music as MusicIcon, Play, Sparkles, Headphones, Wand2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function ChatIdPage() {
  const { id } = useParams();
  const { apiKey, baseUrl, userId, personalization } = useUser();
  const { params: currentParams, activeModel } = useChatParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  
  const endRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const { data: chat, mutate: mutateChat } = useSWR(id ? `chat-${id}` : null, async () => {
    const { data, error } = await supabase.from("chats").select("*, messages(*)").eq("id", id).single();
    if (error) throw error;
    return data;
  });

  useEffect(() => {
    if (chat?.messages) {
      const sortedMessages = chat.messages
        .sort((a: any, b: any) => a.timestamp - b.timestamp)
        .map((m: any) => ({ role: m.role, content: m.content }));
      setMessages(sortedMessages);
    }
  }, [chat]);
  
  // GSAP animation for new messages
  useEffect(() => {
    if (messagesContainerRef.current) {
      const lastMessage = messagesContainerRef.current.lastElementChild;
      if (lastMessage && !isLoading && messages.length > (chat?.messages?.length || 0)) {
        gsap.fromTo(lastMessage, 
          { opacity: 0, y: 10 }, 
          { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
        );
      }
    }
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, chat?.messages?.length]);

  // STT Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await handleSTT(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSTT = async (blob: Blob) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "audio.webm");
      formData.append("model", "openai/whisper-1");

      const safeBaseUrl = "/proxy";
      const res = await fetch(`${safeBaseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      });

      if (!res.ok) throw new Error("STT failed");
      const data = await res.json();
      setInput(data.text);
    } catch (err) {
      toast.error("Speech transcription failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Tools
  const handleQuickImage = async () => {
    if (!input.trim()) { toast.error("Enter a prompt first"); return; }
    setIsLoading(true);
    setIsToolsOpen(false);
    try {
      const url = await generateImage(baseUrl, apiKey, input, "google/gemini-2.5-flash-image");
      const content = `![Generated Image](${url})`;
      setMessages(prev => [...prev, { role: "assistant", content }]);
      // Save to Supabase
      await supabase.from("messages").insert([
        { chat_id: id, role: "assistant", content }
      ]);
    } catch (err) {
      toast.error("Image generation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickTTS = async () => {
    if (!input.trim()) { toast.error("Enter text first"); return; }
    setIsLoading(true);
    setIsToolsOpen(false);
    try {
      const safeBaseUrl = "/proxy";
      const res = await fetch(`${safeBaseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "openai/gpt-4o-audio-preview",
          messages: [{ role: "user", content: input }],
          modalities: ["text", "audio"],
          audio: { voice: "alloy", format: "mp3" }
        }),
      });
      const data = await res.json();
      const audioData = data.choices?.[0]?.message?.audio?.data;
      if (audioData) {
        setMessages(prev => [...prev, { role: "assistant", content: `Audio response generated.` }]);
        const audio = new Audio(`data:audio/mp3;base64,${audioData}`);
        audio.play();
      }
    } catch (err) {
      toast.error("TTS failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-titling logic
  useEffect(() => {
    if (messages.length >= 4 && messages.length <= 6 && chat && apiKey) {
      const isDefaultTitle = chat.title.length < 100 && !chat.title.includes(' ');
      
      if (isDefaultTitle) {
        const updateTitle = async () => {
          try {
            const titlePrompt = "Based on the conversation above, provide a very concise (3-5 words) title for this chat. Respond ONLY with the title text.";
            const apiMessages = [
              ...messages.slice(0, 5),
              { role: "user", content: titlePrompt } as ChatMessage
            ];

            await streamChat(
              baseUrl,
              apiKey,
              apiMessages,
              { ...currentParams, stream: false, max_tokens: 20 },
              () => {},
              async (fullText) => {
                const cleanTitle = fullText.replace(/["']/g, '').trim();
                if (cleanTitle && cleanTitle.length > 2) {
                  await supabase.from("chats").update({ title: cleanTitle }).eq("id", id);
                  mutateChat();
                }
              },
              () => {}
            );
          } catch (e) {
            console.error("Auto-titling failed", e);
          }
        };
        updateTitle();
      }
    }
  }, [messages.length, id, apiKey, chat, baseUrl, currentParams, mutateChat]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !apiKey || !userId || !id) return;

    const userMsg: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const personalInfo = Object.entries(personalization)
      .filter(([_, v]) => !!v)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    
    const enrichedSystemPrompt = personalInfo 
      ? `${currentParams.systemPrompt}\n\n[USER INFO]: ${personalInfo}`
      : currentParams.systemPrompt;

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
      currentParams,
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
        await supabase.from("messages").insert([
          { chat_id: id, role: "user", content: input },
          { chat_id: id, role: "assistant", content: fullText },
        ]);
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
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "shrink-0 rounded-xl h-10 w-10 transition-colors",
              isRecording ? "text-red-500 bg-red-500/10 hover:bg-red-500/20" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            {isRecording ? <MicOff className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
          </Button>

          <Popover open={isToolsOpen} onOpenChange={setIsToolsOpen}>
            <PopoverTrigger asChild>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="shrink-0 text-muted-foreground hover:text-foreground hover:bg-background/50 rounded-xl h-10 w-10"
              >
                <Wand2 className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 mb-2 bg-card/80 backdrop-blur-xl border-border/50 shadow-2xl rounded-2xl" side="top" align="center">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1.5 opacity-50">Multimodal Tools</p>
                <button 
                  onClick={handleQuickImage}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary rounded-xl transition-all active:scale-95"
                >
                  <Sparkles size={16} className="text-yellow-500" />
                  Generate Image
                </button>
                <button 
                  onClick={() => toast.info("Music generation coming to chat soon")}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary rounded-xl transition-all active:scale-95"
                >
                  <MusicIcon size={16} className="text-blue-500" />
                  Generate Music
                </button>
                <button 
                  onClick={handleQuickTTS}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary rounded-xl transition-all active:scale-95"
                >
                  <Headphones size={16} className="text-purple-500" />
                  Read Aloud (TTS)
                </button>
              </div>
            </PopoverContent>
          </Popover>

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
