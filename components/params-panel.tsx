"use client";

import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/components/user-provider";
import { HC_ACCENT_COLORS, applyAccentColor } from "@/lib/models";
import { toast } from "sonner";
import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PanelRightClose, PanelRightOpen, PenLine, ListFilter, Check, ChevronsUpDown, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLayoutState } from "@/components/layout-context";

export interface ChatParams {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  systemPrompt: string;
  stream: boolean;
}

export const defaultChatParams: ChatParams = {
  model: "google/gemini-2.5-flash",
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
  systemPrompt: "You are a helpful AI assistant.",
  stream: true,
};

const ParamsContext = createContext<{
  params: ChatParams;
  setParams: (p: Partial<ChatParams>) => void;
  activeModel: string;
}>({ params: defaultChatParams, setParams: () => {}, activeModel: defaultChatParams.model });

export function useParams() {
  return useContext(ParamsContext);
}

export function ParamsPanelProvider({ children }: { children: React.ReactNode }) {
  const [params, setParamsState] = useState<ChatParams>(defaultChatParams);
  const setParams = useCallback((p: Partial<ChatParams>) => {
    setParamsState((prev) => ({ ...prev, ...p }));
  }, []);
  return (
    <ParamsContext.Provider value={{ params, setParams, activeModel: params.model }}>
      {children}
    </ParamsContext.Provider>
  );
}

export function ParamsPanel() {
  const pathname = usePathname();
  const { uuid, userId, accentColor, apiKey, customModels } = useUser();
  const { isParamsOpen, setParamsOpen } = useLayoutState();
  const { params, setParams } = useParams();
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);

  const [models, setModels] = useState<{id: string, name: string}[]>([]);
  const textModels = models.length > 0 ? models : [{ id: params.model || "google/gemini-2.5-flash", name: "Loading models..." }];

  useEffect(() => {
    if (apiKey) {
      fetch("/api/models", { headers: { Authorization: `Bearer ${apiKey}` }})
        .then(r => r.json())
        .then(data => {
           if (data && data.data) {
             const mapped = data.data
               .filter((m: any) => !m.id.includes("embed") && !m.id.includes("tts") && !m.id.includes("whisper"))
               .map((m: any) => ({
                 id: m.id,
                 name: m.id
               }));
             // Prepend custom models
             const customMapped = (customModels || []).map(id => ({ id, name: `${id} (Custom)` }));
             setModels([...customMapped, ...mapped]);
           }
        })
        .catch(console.error);
    }
  }, [apiKey, customModels]);

  const saveCustomModel = async () => {
    if (!uuid || !params.model.trim()) return;
    const current = customModels || [];
    if (current.includes(params.model)) {
      toast.info("Model already saved");
      return;
    }
    
    const { error } = await supabase
      .from("users")
      .update({ custom_models: [params.model, ...current] })
      .eq("uuid", uuid);
    
    if (error) {
      toast.error("Failed to save custom model");
    } else {
      toast.success("Custom model saved!");
      setIsCustomModel(false);
    }
  };

  const handleAccentChange = async (hex: string) => {
    applyAccentColor(hex);
    if (uuid) {
      const { error } = await supabase
        .from("users")
        .update({ accent_color: hex })
        .eq("uuid", uuid);
      if (error) {
        toast.error("Failed to update accent color");
      } else {
        toast.success("Accent color updated");
      }
    }
  };

  const isChatMode = pathname.startsWith("/chat");
  const isImageMode = pathname.startsWith("/images");

  if (!isParamsOpen) {
    return (
      <aside className="absolute right-0 z-50 md:relative w-[50px] flex-shrink-0 flex flex-col items-center py-4 bg-sidebar border-l border-sidebar-border h-full transition-transform duration-300 translate-x-full md:translate-x-0">
        <button onClick={() => setParamsOpen(true)} className="p-2 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground transition-colors mb-4">
          <PanelRightOpen size={18} />
        </button>
      </aside>
    );
  }

  return (
    <>
      {isParamsOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/50" 
          onClick={() => setParamsOpen(false)} 
        />
      )}
      <aside className="absolute right-0 z-50 md:relative w-[240px] flex-shrink-0 flex flex-col bg-sidebar border-l border-sidebar-border h-full overflow-y-auto transition-transform duration-300 translate-x-0">
      <div className="px-3.5 py-3 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--hc-accent)" }} />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Parameters</span>
        </div>
        <button onClick={() => setParamsOpen(false)} className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground">
          <PanelRightClose size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-3.5 flex-1">
        {/* Model */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Model</Label>
            <button 
              onClick={() => setIsCustomModel(!isCustomModel)}
              className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-sidebar-foreground transition-colors"
              title="Toggle Custom Model ID input"
            >
              {isCustomModel ? <ListFilter size={12} /> : <PenLine size={12} />}
              {isCustomModel ? "Select" : "Custom"}
            </button>
          </div>
          
          {isCustomModel ? (
            <div className="flex gap-1.5">
              <Input 
                value={params.model}
                onChange={(e) => setParams({ model: e.target.value })}
                placeholder="e.g. your-model-id"
                className="h-8 text-xs bg-secondary border-border flex-1"
              />
              <Button onClick={saveCustomModel} size="icon" variant="outline" className="h-8 w-8 shrink-0 bg-secondary">
                <Save size={14} />
              </Button>
            </div>
          ) : (
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full h-8 text-xs bg-secondary border-border justify-between overflow-hidden"
                >
                  <span className="truncate">
                    {params.model
                      ? textModels.find((m) => m.id === params.model)?.name || params.model
                      : "Select model..."}
                  </span>
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
                          onSelect={() => {
                            setParams({ model: m.id === params.model ? "" : m.id });
                            setOpenCombobox(false);
                          }}
                          className="text-xs"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              params.model === m.id ? "opacity-100" : "opacity-0"
                            )}
                          />
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

        {/* Temperature */}
        <ParamSlider
          label="Temperature"
          value={params.temperature}
          min={0} max={2} step={0.01}
          onChange={(v) => setParams({ temperature: v })}
        />

        {/* Max Tokens */}
        <ParamSlider
          label="Max Tokens"
          value={params.maxTokens}
          min={64} max={128000} step={64}
          format={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
          onChange={(v) => setParams({ maxTokens: v })}
        />

        {/* Top P */}
        <ParamSlider
          label="Top P"
          value={params.topP}
          min={0} max={1} step={0.01}
          onChange={(v) => setParams({ topP: v })}
        />

        {/* Frequency Penalty */}
        <ParamSlider
          label="Freq. Penalty"
          value={params.frequencyPenalty}
          min={0} max={2} step={0.01}
          onChange={(v) => setParams({ frequencyPenalty: v })}
        />

        {/* Presence Penalty */}
        <ParamSlider
          label="Pres. Penalty"
          value={params.presencePenalty}
          min={0} max={2} step={0.01}
          onChange={(v) => setParams({ presencePenalty: v })}
        />

        {/* System Prompt (chat only) */}
        {isChatMode && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">System Prompt</Label>
            </div>
            <Textarea
              value={params.systemPrompt}
              onChange={(e) => setParams({ systemPrompt: e.target.value })}
              className="text-xs min-h-[80px] resize-none bg-secondary border-border text-foreground"
              placeholder="You are a helpful assistant..."
            />
          </div>
        )}

        {/* Streaming Toggle */}
        {isChatMode && (
          <div className="flex justify-between items-center">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Stream Response</Label>
            <Switch
              checked={params.stream}
              onCheckedChange={(v) => setParams({ stream: v })}
              className="data-[state=checked]:bg-[var(--hc-accent)] h-4 w-7 [&_span]:h-3 [&_span]:w-3 [&_span]:data-[state=checked]:translate-x-3"
            />
          </div>
        )}

        <div className="h-px bg-border" />

        {/* Accent Color */}
        <div className="flex flex-col gap-2">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Accent Color</Label>
          <div className="flex flex-wrap gap-1.5">
            {HC_ACCENT_COLORS.map(({ hex, name }) => (
              <button
                key={hex}
                title={name}
                onClick={() => handleAccentChange(hex)}
                className="w-5 h-5 rounded-full transition-all hover:scale-125 focus:outline-none"
                style={{
                  background: hex,
                  boxShadow: accentColor === hex ? `0 0 0 2px var(--background), 0 0 0 3px ${hex}` : "none",
                  transform: accentColor === hex ? "scale(1.2)" : undefined,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}

function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const display = format ? format(value) : Number.isInteger(value) ? String(value) : value.toFixed(2);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</Label>
        <span className="text-[10px] font-semibold" style={{ color: "var(--hc-accent)" }}>{display}</span>
      </div>
      <Slider
        min={min} max={max} step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="[&>span:first-child]:h-1 [&>span:first-child>span]:bg-[var(--hc-accent)] [&_[role=slider]]:bg-[var(--hc-accent)] [&_[role=slider]]:border-2 [&_[role=slider]]:border-background [&_[role=slider]]:w-3 [&_[role=slider]]:h-3"
      />
    </div>
  );
}
