"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@/components/user-provider";
import { useParams } from "@/components/params-panel";
import { Send, Bot, User, ListFilter, PenLine } from "lucide-react";
import { streamChat, ChatMessage } from "@/lib/hackclub-ai";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface ModelOption {
  id: string;
  name: string;
}

export default function ComparePage() {
  const { apiKey, baseUrl, customModels } = useUser();
  const { params } = useParams();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const [models, setModels] = useState<ModelOption[]>([]);
  
  // Model A State
  const [modelA, setModelA] = useState(params.model || "google/gemini-2.5-flash");
  const [isCustomA, setIsCustomA] = useState(false);
  const [chunkA, setChunkA] = useState("");
  
  // Model B State
  const [modelB, setModelB] = useState("openai/gpt-5-mini"); // Default diff model
  const [isCustomB, setIsCustomB] = useState(false);
  const [chunkB, setChunkB] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (apiKey) {
      fetch("/api/models", { headers: { Authorization: `Bearer ${apiKey}` }})
        .then(r => r.json())
        .then(data => {
           if (data && data.data) {
             const mapped = data.data
               .filter((m: any) => !m.id.includes("embed") && !m.id.includes("tts") && !m.id.includes("whisper"))
               .map((m: any) => ({ id: m.id, name: m.id }));
               
             const customMapped = (customModels || []).map((id: string) => ({ id, name: `${id} (Custom)` }));
             const fullList = [...customMapped, ...mapped];
             
             setModels(fullList);
             if (fullList.length > 0 && !fullList.find((m:any) => m.id === modelB)) {
               setModelB(fullList[0].id);
             }
           }
        })
        .catch(console.error);
    }
  }, [apiKey, customModels]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chunkA, chunkB]);

  const handleSubmit = async () => {
    if (!input.trim() || !apiKey) return;

    const userMessage: ChatMessage = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsGenerating(true);
    setError("");
    setChunkA("");
    setChunkB("");

    let finalA = "";
    let finalB = "";
    
    // Create params payload for each model
    const payloadA = { ...params, model: modelA };
    const payloadB = { ...params, model: modelB };

    const promiseA = streamChat(
      baseUrl,
      apiKey,
      newMessages,
      payloadA,
      (chunk) => setChunkA((prev) => prev + chunk),
      (full) => { finalA = full; },
      (err) => { finalA = `Error: ${err}`; setChunkA(finalA); }
    );

    const promiseB = streamChat(
      baseUrl,
      apiKey,
      newMessages,
      payloadB,
      (chunk) => setChunkB((prev) => prev + chunk),
      (full) => { finalB = full; },
      (err) => { finalB = `Error: ${err}`; setChunkB(finalB); }
    );

    await Promise.allSettled([promiseA, promiseB]);

    // Save assistants' responses to message history
    setMessages([
      ...newMessages,
      { role: "assistant", content: `**Model A:**\n${finalA}\n\n---\n\n**Model B:**\n${finalB}` }
    ]);
    
    setChunkA("");
    setChunkB("");
    setIsGenerating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const textModels = models.length > 0 ? models : [{ id: "loading", name: "Loading models..." }];

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Model Compare Arena</h1>
          <p className="text-xs text-muted-foreground mt-1">Test two models simultaneously side-by-side.</p>
        </div>
        
        {/* Model Selectors side-by-side in header */}
        <div className="flex items-center gap-4">
          {/* Model A */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Model A</span>
              <button onClick={() => setIsCustomA(!isCustomA)} className="text-[10px] text-muted-foreground hover:text-foreground">
                {isCustomA ? <ListFilter size={12}/> : <PenLine size={12}/>}
              </button>
            </div>
            {isCustomA ? (
              <Input value={modelA} onChange={(e) => setModelA(e.target.value)} className="h-8 text-xs bg-secondary" placeholder="Custom Model ID" />
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full h-8 text-xs bg-secondary justify-between overflow-hidden">
                    <span className="truncate">{textModels.find((m) => m.id === modelA)?.name || modelA}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[210px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search models..." className="h-8 text-xs" />
                    <CommandList>
                      <CommandEmpty>No model found.</CommandEmpty>
                      <CommandGroup>
                        {textModels.map((m) => (
                          <CommandItem
                            key={m.id}
                            value={m.id}
                            onSelect={(v) => { setModelA(v === modelA ? "" : v); }}
                            className="text-xs"
                          >
                            <Check className={cn("mr-2 h-4 w-4", modelA === m.id ? "opacity-100" : "opacity-0")} />
                            <span className="truncate">{m.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
          
          <div className="text-xs font-bold text-muted-foreground uppercase">VS</div>

          {/* Model B */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Model B</span>
              <button onClick={() => setIsCustomB(!isCustomB)} className="text-[10px] text-muted-foreground hover:text-foreground">
                {isCustomB ? <ListFilter size={12}/> : <PenLine size={12}/>}
              </button>
            </div>
            {isCustomB ? (
              <Input value={modelB} onChange={(e) => setModelB(e.target.value)} className="h-8 text-xs bg-secondary" placeholder="Custom Model ID" />
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full h-8 text-xs bg-secondary justify-between overflow-hidden">
                    <span className="truncate">{textModels.find((m) => m.id === modelB)?.name || modelB}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[210px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search models..." className="h-8 text-xs" />
                    <CommandList>
                      <CommandEmpty>No model found.</CommandEmpty>
                      <CommandGroup>
                        {textModels.map((m) => (
                          <CommandItem
                            key={m.id}
                            value={m.id}
                            onSelect={(v) => { setModelB(v === modelB ? "" : v); }}
                            className="text-xs"
                          >
                            <Check className={cn("mr-2 h-4 w-4", modelB === m.id ? "opacity-100" : "opacity-0")} />
                            <span className="truncate">{m.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>

      {/* Split Message Area */}
      <div className="flex-1 overflow-hidden flex relative">
        {/* Left column (Model A) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 border-r border-border custom-scrollbar">
          {messages.map((msg, i) => {
            if (msg.role === "user") {
              return (
                <div key={i} className="mb-6">
                  <div className="flex items-center gap-2 mb-2"><User size={14} className="text-muted-foreground"/> <span className="text-xs font-semibold">You</span></div>
                  <div className="text-sm bg-secondary/50 p-3 rounded-xl border border-border inline-block max-w-full">
                    {typeof msg.content === 'string' ? msg.content : '...'}
                  </div>
                </div>
              );
            } else {
              // Parse Model A's part out of the combined assistant message
              const contentStr = typeof msg.content === 'string' ? msg.content : '';
              const parts = contentStr.split("\n\n---\n\n**Model B:**\n");
              const aContent = parts[0].replace("**Model A:**\n", "");
              return (
                <div key={i} className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot size={14} style={{ color: "var(--hc-accent)" }} /> 
                    <span className="text-xs font-semibold" style={{ color: "var(--hc-accent)" }}>Model A Output</span>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-secondary prose-pre:border prose-pre:border-border text-foreground overflow-hidden">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{aContent}</ReactMarkdown>
                  </div>
                </div>
              );
            }
          })}
          
          {isGenerating && chunkA && (
             <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Bot size={14} style={{ color: "var(--hc-accent)" }} className="animate-pulse" /> 
                  <span className="text-xs font-semibold" style={{ color: "var(--hc-accent)" }}>Model A Output</span>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground overflow-hidden">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{chunkA}</ReactMarkdown>
                </div>
             </div>
          )}
          <div ref={chatEndRef} className="h-4" />
        </div>

        {/* Right column (Model B) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-secondary/10">
          {messages.map((msg, i) => {
            if (msg.role === "user") {
              return (
                <div key={i} className="mb-6">
                  <div className="flex items-center gap-2 mb-2"><User size={14} className="text-muted-foreground"/> <span className="text-xs font-semibold">You</span></div>
                  <div className="text-sm bg-secondary/50 p-3 rounded-xl border border-border inline-block max-w-full">
                    {typeof msg.content === 'string' ? msg.content : '...'}
                  </div>
                </div>
              );
            } else {
              // Parse Model B's part out of the combined assistant message
              const contentStr = typeof msg.content === 'string' ? msg.content : '';
              const parts = contentStr.split("\n\n---\n\n**Model B:**\n");
              const bContent = parts[1] || "";
              return (
                <div key={i} className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot size={14} className="text-blue-400" /> 
                    <span className="text-xs font-semibold text-blue-400">Model B Output</span>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-secondary prose-pre:border prose-pre:border-border text-foreground overflow-hidden">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{bContent}</ReactMarkdown>
                  </div>
                </div>
              );
            }
          })}
          
          {isGenerating && chunkB && (
             <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Bot size={14} className="text-blue-400 animate-pulse" /> 
                  <span className="text-xs font-semibold text-blue-400">Model B Output</span>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground overflow-hidden">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{chunkB}</ReactMarkdown>
                </div>
             </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-border bg-background/50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto relative group">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a prompt to both models simultaneously..."
            className="w-full min-h-[56px] max-h-[200px] bg-secondary/50 border-border rounded-2xl resize-none py-4 pl-4 pr-14 text-sm focus-visible:ring-1 focus-visible:ring-[var(--hc-accent)] custom-scrollbar"
            rows={1}
            disabled={isGenerating}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isGenerating || !apiKey}
            className="absolute right-2 bottom-2 p-2.5 rounded-xl bg-[var(--hc-accent)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send size={16} className={isGenerating ? "animate-pulse" : ""} />
          </button>
        </div>
        {!apiKey && (
          <p className="text-center text-xs text-destructive mt-2 font-medium">Please enter your API Key in Settings to generate.</p>
        )}
      </div>
    </div>
  );
}
