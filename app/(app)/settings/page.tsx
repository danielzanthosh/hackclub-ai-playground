"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@/components/user-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { encryptApiKey } from "@/lib/crypto";
import { toast } from "sonner";
import { Loader2, Save, Sparkles, User as UserIcon, Settings2, LogOut, LogIn } from "lucide-react";
import gsap from "gsap";

export default function SettingsPage() {
  const { uuid, sub, name, apiKey, baseUrl, isReady, defaultChatModel, defaultSystemPrompt, personalization, login, logout } = useUser();
  const [inputKey, setInputKey] = useState("");
  const [inputUrl, setInputUrl] = useState(baseUrl || "https://ai.hackclub.com/proxy/v1");
  const [inputName, setInputName] = useState(name || "Hack Clubber");
  const [inputModel, setInputModel] = useState(defaultChatModel || "google/gemini-2.5-flash");
  const [inputSystemPrompt, setInputSystemPrompt] = useState(defaultSystemPrompt || "You are a helpful AI assistant.");
  const [personal, setPersonal] = useState(personalization || {});
  const [isSaving, setIsSaving] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isReady && containerRef.current) {
      gsap.fromTo(
        containerRef.current.querySelectorAll(".settings-card"),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }
      );
    }
  }, [isReady]);

  const handleSave = async () => {
    if (!uuid) return;
    setIsSaving(true);
    try {
      const updates: any = { 
        name: inputName, 
        base_url: inputUrl,
        default_chat_model: inputModel,
        default_system_prompt: inputSystemPrompt,
        personalization: personal,
        updated_at: Date.now()
      };
      if (inputKey) {
        updates.api_key = await encryptApiKey(inputKey);
      }
      
      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("uuid", uuid);

      if (error) throw error;

      toast.success("Settings saved successfully!");
      if (inputKey) setInputKey(""); // clear after save
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isReady) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 md:p-8 max-w-2xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="text-[var(--hc-accent)]" />
          Settings
        </h1>
        <p className="text-muted-foreground text-sm">Manage your profile and AI preferences.</p>
      </div>

      <div className="space-y-6">
        {/* Account Card */}
        <Card className="settings-card bg-card/50 backdrop-blur-sm border-border overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <UserIcon size={120} />
          </div>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Hack Club Account
            </CardTitle>
            <CardDescription>
              {sub 
                ? "You are logged in with your Hack Club Identity." 
                : "Sign in to sync your chats and preferences across devices."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sub ? (
              <div className="flex items-center justify-between bg-background/40 p-4 rounded-2xl border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--hc-accent)] flex items-center justify-center text-white font-bold text-lg">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{name}</p>
                    <p className="text-[10px] text-muted-foreground">Connected via Identity</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive">
                  <LogOut size={16} className="mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <Button 
                onClick={login} 
                className="w-full h-12 rounded-2xl bg-[#ec3750] hover:bg-[#ec3750]/90 text-white font-bold shadow-lg shadow-[#ec3750]/20 flex items-center gap-2"
              >
                <LogIn size={18} />
                Login with Hack Club
              </Button>
            )}
          </CardContent>
        </Card>

        {/* API Card */}
        <Card className="settings-card bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              API Configuration
            </CardTitle>
            <CardDescription>Configure your Hack Club AI proxy connection.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input 
                type="password" 
                value={inputKey} 
                onChange={(e) => setInputKey(e.target.value)} 
                placeholder={apiKey ? "•••••••••••••••• (Key is set)" : "sk-..."}
                className="bg-background/50"
              />
              <p className="text-[10px] text-muted-foreground">Your key is encrypted locally and stored securely in Supabase.</p>
            </div>
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input 
                value={inputUrl} 
                onChange={(e) => setInputUrl(e.target.value)} 
                placeholder="https://ai.hackclub.com/proxy/v1"
                className="bg-background/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Defaults Card */}
        <Card className="settings-card bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              AI Preferences
            </CardTitle>
            <CardDescription>Set your default model and system prompt.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Chat Model</Label>
              <Input 
                value={inputModel} 
                onChange={(e) => setInputModel(e.target.value)} 
                placeholder="google/gemini-2.5-flash"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Default System Prompt</Label>
              <Textarea 
                value={inputSystemPrompt} 
                onChange={(e) => setInputSystemPrompt(e.target.value)} 
                placeholder="You are a helpful assistant..."
                className="bg-background/50 min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Personalization Card */}
        <Card className="settings-card bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles size={18} className="text-yellow-500" />
              Personalization
            </CardTitle>
            <CardDescription>Info the AI can use to better assist you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input 
                  value={inputName} 
                  onChange={(e) => setInputName(e.target.value)} 
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Age / Grade</Label>
                <Input 
                  value={personal.age || ""} 
                  onChange={(e) => setPersonal({...personal, age: e.target.value})} 
                  placeholder="e.g. 17 or 11th Grade"
                  className="bg-background/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Preferred Tone</Label>
              <Input 
                value={personal.tone || ""} 
                onChange={(e) => setPersonal({...personal, tone: e.target.value})} 
                placeholder="e.g. Friendly, concise, or like a pirate"
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label>About You (Bio)</Label>
              <Textarea 
                value={personal.bio || ""} 
                onChange={(e) => setPersonal({...personal, bio: e.target.value})} 
                placeholder="What should the AI know about you?"
                className="bg-background/50 min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4 pb-8">
          <Button onClick={handleSave} disabled={isSaving} className="px-8 shadow-lg shadow-[var(--hc-accent)]/20">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save All Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
