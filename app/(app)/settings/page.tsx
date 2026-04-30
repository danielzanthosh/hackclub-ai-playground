"use client";

import { useState } from "react";
import { useUser } from "@/components/user-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { encryptApiKey } from "@/lib/crypto";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export default function SettingsPage() {
  const { uuid, name, apiKey, baseUrl, isReady } = useUser();
  const [inputKey, setInputKey] = useState("");
  const [inputUrl, setInputUrl] = useState(baseUrl || "https://ai.hackclub.com/proxy/v1");
  const [inputName, setInputName] = useState(name || "Hack Clubber");
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSave = async () => {
    if (!uuid) return;
    setIsSaving(true);
    try {
      const updates: any = { 
        name: inputName, 
        base_url: inputUrl,
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
    <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your profile and API configuration.</p>
      </div>

      <div className="space-y-6">
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">API Configuration</CardTitle>
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
              />
              <p className="text-xs text-muted-foreground">Your key is encrypted locally and stored securely in Supabase.</p>
            </div>
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input 
                value={inputUrl} 
                onChange={(e) => setInputUrl(e.target.value)} 
                placeholder="https://ai.hackclub.com/proxy/v1"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input 
                value={inputName} 
                onChange={(e) => setInputName(e.target.value)} 
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
