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
import { Paperclip, Send, Loader2, Bot, User, Mic, MicOff, StopCircle, Image as ImageIcon, Music as MusicIcon, Play } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sparkles, Headphones, Wand2 } from "lucide-react";

export default function ChatPage() {
  const { apiKey, baseUrl, userId, personalization } = useUser();
  const { params, activeModel } = useParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const router = useRouter();

  const endRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Tools
  const handleQuickImage = async () => {
    if (!input.trim()) { toast.error("Enter a prompt first"); return; }
    setIsLoading(true);
    setIsToolsOpen(false);
    try {
      const url = await generateImage(baseUrl, apiKey, input, "google/gemini-2.5-flash-image");
      setMessages(prev => [...prev, { role: "assistant", content: `![Generated Image](${url})` }]);
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

      const safeBaseUrl = baseUrl === "https://ai.hackclub.com/proxy/v1" ? "/proxy" : baseUrl;
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
